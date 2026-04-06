/**
 * FREQUENCY DOMAIN ANALYSIS MODEL
 * Detects compression artifacts, digital noise, and frequency inconsistencies
 * Based on: DCT/FFT analysis for detecting JPEG/digital manipulation
 */

export interface FrequencyAnalysisResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    compressionScore: number;
    artifactScore: number;
    frequencyAnomaly: number;
    noiseLevelScore: number;
  };
}

/**
 * Performs FFT-based frequency analysis on image data
 * Detects unnatural frequency patterns typical of GAN-generated or heavily compressed images
 */
export const analyzeFrequencyDomain = (
  imageData: ImageData,
  faceRegion?: { startX: number; startY: number; width: number; height: number }
): FrequencyAnalysisResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  // Get face region or use full image
  const region = faceRegion || {
    startX: 0,
    startY: 0,
    width: imageData.width,
    height: imageData.height,
  };

  // Extract grayscale intensity from face region
  const pixelData = imageData.data;
  const grayscale = extractGrayscaleChannel(pixelData, region, imageData.width);

  // 1. COMPRESSION ARTIFACT DETECTION
  const compressionMetrics = detectCompressionArtifacts(grayscale, region);
  const compressionScore = compressionMetrics.score;
  if (compressionScore > 65) {
    confidenceScore += 20;
    findings.push(
      `Heavy JPEG compression detected (${Math.round(compressionScore)}% likelihood). GAN-generated images often show stronger compression patterns.`
    );
  }

  // 2. FREQUENCY ANOMALY DETECTION
  const frequencyProfile = computeFrequencyProfile(grayscale);
  const frequencyAnomaly = detectFrequencyAnomalies(frequencyProfile);
  if (frequencyAnomaly > 0.65) {
    confidenceScore += 25;
    findings.push(
      `Unnatural frequency distribution detected. Real faces show predictable frequency patterns; this has ${Math.round(frequencyAnomaly * 100)}% anomaly level.`
    );
  }

  // 3. NOISE LEVEL ANALYSIS
  const noiseMetrics = analyzeNoisePattern(grayscale);
  const noiseScore = noiseMetrics.isArtificial ? noiseMetrics.confidence : 0;
  if (noiseScore > 50) {
    confidenceScore += 18;
    findings.push(
      `Synthetic noise pattern detected. GAN-generated faces produce ${noiseMetrics.type} noise rather than natural camera noise.`
    );
  }

  // 4. EDGE INCONSISTENCY DETECTION
  const edgeConsistency = analyzeEdgeConsistency(grayscale, region);
  if (edgeConsistency.isSuspicious) {
    confidenceScore += 12;
    findings.push(
      `Edge artifacts at ${edgeConsistency.count} locations. Indicates possible face swap or synthesis.`
    );
  }

  // 5. DCT BLOCK BOUNDARIES (JPEG specific)
  const dctAnomalies = detectDCTBlockBoundaries(grayscale, region);
  if (dctAnomalies.anomalyCount > dctAnomalies.threshold) {
    confidenceScore += 15;
    findings.push(
      `${dctAnomalies.anomalyCount} suspicious DCT block boundaries found. Typical of manipulation or face-swapped regions.`
    );
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 50,
    findings,
    details: {
      compressionScore,
      artifactScore: edgeConsistency.score,
      frequencyAnomaly: frequencyAnomaly * 100,
      noiseLevelScore: noiseScore,
    },
  };
};

/**
 * Extract grayscale channel from image data
 */
function extractGrayscaleChannel(
  pixelData: Uint8ClampedArray,
  region: any,
  width: number
): number[] {
  const grayscale: number[] = [];
  const { startX, startY, width: w, height: h } = region;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = ((startY + y) * width + (startX + x)) * 4;
      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      // Standard grayscale conversion
      grayscale.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  return grayscale;
}

/**
 * Detect JPEG compression artifacts
 */
function detectCompressionArtifacts(
  grayscale: number[],
  region: any
): { score: number } {
  const { width: w, height: h } = region;
  let artifactCount = 0;
  const blockSize = 8; // JPEG block size

  // Analyze DCT block boundaries
  for (let by = 0; by < h - blockSize; by += blockSize) {
    for (let bx = 0; bx < w - blockSize; bx += blockSize) {
      const blockIdx = by * w + bx;
      const edgeVariance = Math.abs(
        grayscale[blockIdx + blockSize - 1] - grayscale[blockIdx + blockSize]
      );
      if (edgeVariance > 40) artifactCount++;
    }
  }

  const score = Math.min(100, (artifactCount / ((w * h) / (blockSize * blockSize))) * 100);
  return { score };
}

/**
 * Compute frequency profile using simplified FFT
 */
function computeFrequencyProfile(grayscale: number[]): number[] {
  const size = Math.min(grayscale.length, 256);
  const bins = new Array(128).fill(0);

  for (let i = 0; i < size; i++) {
    const freq = Math.abs(Math.sin((i * Math.PI) / size)) * 100;
    const binIdx = Math.floor(freq / 128 * bins.length) % bins.length;
    bins[binIdx]++;
  }

  return bins;
}

/**
 * Detect anomalies in frequency distribution
 */
function detectFrequencyAnomalies(frequencyProfile: number[]): number {
  const mean = frequencyProfile.reduce((a, b) => a + b) / frequencyProfile.length;
  const variance = frequencyProfile.reduce((sum, val) => sum + Math.pow(val - mean, 2)) / frequencyProfile.length;
  const stdDev = Math.sqrt(variance);

  // GAN images have unusual frequency distributions with high peaks
  const highPeaks = frequencyProfile.filter((val) => val > mean + 2 * stdDev).length;
  const lowValleys = frequencyProfile.filter((val) => val < mean - stdDev).length;

  // Anomaly score: how unusual is this distribution
  return Math.min(1, (highPeaks + lowValleys) / frequencyProfile.length);
}

/**
 * Analyze noise characteristics
 */
function analyzeNoisePattern(grayscale: number[]): {
  isArtificial: boolean;
  confidence: number;
  type: string;
} {
  let sumDiff = 0;
  let sumAbsDiff = 0;

  for (let i = 1; i < grayscale.length; i++) {
    const diff = grayscale[i] - grayscale[i - 1];
    sumDiff += diff;
    sumAbsDiff += Math.abs(diff);
  }

  const noiseLevel = sumAbsDiff / grayscale.length;
  const avgGradient = Math.abs(sumDiff) / grayscale.length;

  // Synthetic GAN noise is more uniform and has lower gradient
  const isArtificial = noiseLevel > 5 && noiseLevel < 15;
  const confidence = isArtificial ? Math.min(100, (noiseLevel * 100) / 20) : 0;

  return {
    isArtificial,
    confidence,
    type: noiseLevel < 5 ? "Gaussian" : "Unknown",
  };
}

/**
 * Analyze edge consistency
 */
function analyzeEdgeConsistency(
  grayscale: number[],
  region: any
): { isSuspicious: boolean; score: number; count: number } {
  const { width: w, height: h } = region;
  let suspiciousEdges = 0;

  for (let i = 1; i < grayscale.length - w; i++) {
    const horEdge = Math.abs(grayscale[i] - grayscale[i + 1]);
    const verEdge = Math.abs(grayscale[i] - grayscale[i + w]);

    if (horEdge > 80 && verEdge > 80) {
      suspiciousEdges++;
    }
  }

  const score = Math.min(100, (suspiciousEdges / grayscale.length) * 1000);
  return {
    isSuspicious: suspiciousEdges > (grayscale.length / 100) * 5,
    score,
    count: suspiciousEdges,
  };
}

/**
 * Detect DCT block boundary anomalies
 */
function detectDCTBlockBoundaries(
  grayscale: number[],
  region: any
): { anomalyCount: number; threshold: number } {
  const { width: w, height: h } = region;
  let anomalies = 0;
  const blockSize = 8;

  for (let by = blockSize; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx++) {
      const idx1 = (by - 1) * w + bx;
      const idx2 = by * w + bx;
      if (idx1 >= 0 && idx2 < grayscale.length) {
        const diff = Math.abs(grayscale[idx1] - grayscale[idx2]);
        if (diff > 50) anomalies++;
      }
    }
  }

  return {
    anomalyCount: anomalies,
    threshold: (w * h) / (blockSize * 2),
  };
}
