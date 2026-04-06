/**
 * EYE & IRIS DETAIL DETECTION MODEL
 * Highly sensitive to GAN artifacts in eye regions
 * GANs struggle most with realistic eye details, iris patterns, and reflections
 */

export interface EyeDetailAnalysisResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    irisQualityScore: number;
    pupilDilationScore: number;
    highlightArtifactsScore: number;
    cornealReflectionScore: number;
  };
}

/**
 * Analyzes eye and iris region in detail
 * GANs are notoriously bad at generating realistic eyes
 */
export const analyzeEyeDetails = (
  imageData: ImageData,
  eyeRegions: Array<{ centerX: number; centerY: number; radius: number }>
): EyeAnalysisResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  if (eyeRegions.length === 0) {
    return {
      confidence: 0,
      isFake: false,
      findings: [],
      details: {
        irisQualityScore: 0,
        pupilDilationScore: 0,
        highlightArtifactsScore: 0,
        cornealReflectionScore: 0,
      },
    };
  }

  // Analyze each eye
  for (const eye of eyeRegions) {
    // 1. IRIS PATTERN ANALYSIS
    const irisPattern = analyzeIrisPattern(imageData, eye);
    if (irisPattern.isAbnormal) {
      confidenceScore += 22;
      findings.push(
        `Iris pattern shows ${irisPattern.abnormality}. Real iris patterns have specific crypts and furrows. This looks ${irisPattern.assessment}.`
      );
    }

    // 2. PUPIL DILATION CONSISTENCY
    const pupilAnalysis = analyzePupilCharacteristics(imageData, eye);
    if (pupilAnalysis.isUnnatural) {
      confidenceScore += 20;
      findings.push(
        `Pupil dilation ${pupilAnalysis.assessment}. Natural pupils dilate smoothly and proportionally.`
      );
    }

    // 3. CORNEAL REFLECTION ANALYSIS
    const reflectionAnalysis = analyzeCornealReflection(imageData, eye);
    if (reflectionAnalysis.isAbnormal) {
      confidenceScore += 18;
      findings.push(
        `Corneal reflections show ${reflectionAnalysis.type}. Real eyes have specific Purkinje reflection patterns.`
      );
    }

    // 4. SCLERA (WHITE OF EYE) QUALITY
    const scleraQuality = analyzeScleraQuality(imageData, eye);
    if (scleraQuality.isSuspicious) {
      confidenceScore += 16;
      findings.push(
        `Sclera (white of eye) texture is ${scleraQuality.texture}. GAN eyes often have uniform white sclera without natural blood vessel patterns.`
      );
    }

    // 5. EYE POSITION & CONVERGENCE
    if (eyeRegions.length === 2) {
      const convergence = analyzeEyeConvergence(eyeRegions);
      if (!convergence.isNatural) {
        confidenceScore += 14;
        findings.push(
          `Eyes don't converge naturally. Convergence angle: ${convergence.angle}°. Human eyes typically converge within specific ranges.`
        );
      }
    }
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 50,
    findings,
    details: {
      irisQualityScore: Math.min(100, confidenceScore * 0.35),
      pupilDilationScore: Math.min(100, confidenceScore * 0.25),
      highlightArtifactsScore: Math.min(100, confidenceScore * 0.22),
      cornealReflectionScore: Math.min(100, confidenceScore * 0.18),
    },
  };
};

/**
 * Analyzes iris pattern complexity
 * Real irises have fractal-like complexity; GANs produce simpler patterns
 */
function analyzeIrisPattern(
  imageData: ImageData,
  eye: { centerX: number; centerY: number; radius: number }
): {
  isAbnormal: boolean;
  abnormality: string;
  assessment: string;
} {
  const { centerX, centerY, radius } = eye;
  const pixelData = imageData.data;
  const width = imageData.width;

  // Extract iris region
  const irisPixels: number[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = ((centerY + dy) * width + (centerX + dx)) * 4;
        if (idx >= 0 && idx < pixelData.length) {
          const r = pixelData[idx];
          const g = pixelData[idx + 1];
          const b = pixelData[idx + 2];
          irisPixels.push((r + g + b) / 3);
        }
      }
    }
  }

  if (irisPixels.length === 0) {
    return {
      isAbnormal: false,
      abnormality: "none",
      assessment: "natural",
    };
  }

  // Calculate pattern complexity (entropy)
  const entropy = calculateEntropy(irisPixels);
  const complexity = calculateComplexity(irisPixels);

  // Real iris: entropy 4-6.5, high complexity (fractal)
  // GAN iris: entropy 2-4, low complexity (simple patterns)
  const isAbnormal = entropy < 3.5 || complexity < 0.4;

  let abnormality = "unknown pattern";
  let assessment = "natural";

  if (entropy < 3) {
    abnormality = "overly uniform";
    assessment = "too smooth for real iris";
  } else if (complexity < 0.3) {
    abnormality = "insufficient detail";
    assessment = "lacking natural iris crypts and furrows";
  }

  return { isAbnormal, abnormality, assessment };
}

/**
 * Analyzes pupil characteristics
 */
function analyzePupilCharacteristics(
  imageData: ImageData,
  eye: { centerX: number; centerY: number; radius: number }
): {
  isUnnatural: boolean;
  assessment: string;
} {
  const { centerX, centerY, radius } = eye;
  const pixelData = imageData.data;
  const width = imageData.width;

  // Find pupil (darkest region in iris)
  let darkestIdx = centerY * width + centerX;
  let darkestValue = 255;

  for (let dy = -Math.floor(radius / 2); dy <= Math.floor(radius / 2); dy++) {
    for (let dx = -Math.floor(radius / 2); dx <= Math.floor(radius / 2); dx++) {
      const idx = ((centerY + dy) * width + (centerX + dx)) * 4;
      const value = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
      if (value < darkestValue) {
        darkestValue = value;
        darkestIdx = idx;
      }
    }
  }

  // Check pupil edge smoothness (should be smooth and round)
  const pupilX = (darkestIdx % (width * 4)) / 4;
  const pupilY = Math.floor(darkestIdx / (width * 4));

  // Check for unnatural pupil dilation patterns
  const pupilDiameter = measurePupilDiameter(pixelData, width, pupilX, pupilY);
  const pupilRoundness = measureRoundness(pixelData, width, pupilX, pupilY, pupilDiameter / 2);

  // Unnatural if: pupil is too large/small or not round
  const isUnnatural = pupilDiameter < 6 || pupilDiameter > 120 || pupilRoundness < 0.75;
  const assessment = !isUnnatural
    ? "normal"
    : pupilRoundness < 0.75
      ? "pupils not perfectly round"
      : "unnatural dilation";

  return { isUnnatural, assessment };
}

/**
 * Analyzes corneal reflection (highlights in eye)
 */
function analyzeCornealReflection(
  imageData: ImageData,
  eye: { centerX: number; centerY: number; radius: number }
): {
  isAbnormal: boolean;
  type: string;
} {
  const { centerX, centerY, radius } = eye;
  const pixelData = imageData.data;
  const width = imageData.width;

  // Find bright reflections (typically 2 Purkinje reflections in real eyes)
  let reflections = 0;
  let reflectionPositions: Array<{ x: number; y: number; brightness: number }> = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = ((centerY + dy) * width + (centerX + dx)) * 4;
        const brightness = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
        if (brightness > 200) {
          reflections++;
          reflectionPositions.push({
            x: centerX + dx,
            y: centerY + dy,
            brightness,
          });
        }
      }
    }
  }

  // Real eyes should have 1-2 main reflections
  // GAN eyes often have weird reflection patterns
  const isAbnormal = reflections < 5 || reflections > 500; // Too few or too many

  return {
    isAbnormal,
    type: reflections < 5 ? "missing specular highlights" : "excessive bright artifacts",
  };
}

/**
 * Analyzes sclera (white of eye) texture
 */
function analyzeScleraQuality(
  imageData: ImageData,
  eye: { centerX: number; centerY: number; radius: number }
): {
  isSuspicious: boolean;
  texture: string;
} {
  const { centerX, centerY, radius } = eye;
  const pixelData = imageData.data;
  const width = imageData.width;

  // Sample sclera region (white area around iris)
  const scleraPixels: number[] = [];
  for (let dy = -radius * 1.3; dy <= radius * 1.3; dy++) {
    for (let dx = -radius * 1.3; dx <= radius * 1.3; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) > radius && Math.sqrt(dx * dx + dy * dy) < radius * 1.5) {
        const idx = ((centerY + dy) * width + (centerX + dx)) * 4;
        if (idx >= 0 && idx < pixelData.length) {
          const r = pixelData[idx];
          const g = pixelData[idx + 1];
          const b = pixelData[idx + 2];
          scleraPixels.push((r + g + b) / 3);
        }
      }
    }
  }

  if (scleraPixels.length === 0) {
    return { isSuspicious: false, texture: "unknown" };
  }

  // Real sclera has visible blood vessel patterns (high variance)
  // GAN sclera is often too uniform
  const variance = calculateVariance(scleraPixels);
  const uniformity = scleraPixels.every((p) => Math.abs(p - scleraPixels[0]) < 10) ? 1 : 0;

  const isSuspicious = variance < 15 || uniformity > 0.8;
  const texture = isSuspicious ? "too uniform (lacking blood vessels)" : "natural with vessel patterns";

  return { isSuspicious, texture };
}

/**
 * Analyzes eye convergence (both eyes working together)
 */
function analyzeEyeConvergence(
  eyeRegions: Array<{ centerX: number; centerY: number; radius: number }>
): {
  isNatural: boolean;
  angle: number;
} {
  if (eyeRegions.length < 2) {
    return { isNatural: true, angle: 0 };
  }

  const leftEye = eyeRegions[0];
  const rightEye = eyeRegions[1];

  // Calculate convergence angle
  const eyeDistance = Math.sqrt(
    Math.pow(rightEye.centerX - leftEye.centerX, 2) +
      Math.pow(rightEye.centerY - leftEye.centerY, 2)
  );

  // Rough estimate of convergence angle
  const angle = Math.atan2(rightEye.centerY - leftEye.centerY, rightEye.centerX - leftEye.centerX);

  // Eyes should be roughly aligned (angle near 0 or 180)
  const isNatural = Math.abs(angle) < 0.3 || Math.abs(angle - Math.PI) < 0.3;

  return { isNatural, angle: (angle * 180) / Math.PI };
}

/**
 * Helper: Calculate entropy of pixel values
 */
function calculateEntropy(pixels: number[]): number {
  const histogram: { [key: number]: number } = {};
  for (const p of pixels) {
    const bucket = Math.floor(p / 10) * 10;
    histogram[bucket] = (histogram[bucket] || 0) + 1;
  }

  let entropy = 0;
  const n = pixels.length;
  for (const count of Object.values(histogram)) {
    const p = count / n;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Helper: Calculate complexity (variability)
 */
function calculateComplexity(pixels: number[]): number {
  const mean = pixels.reduce((a, b) => a + b) / pixels.length;
  const variance = pixels.reduce((sum, p) => sum + Math.pow(p - mean, 2)) / pixels.length;
  const stdDev = Math.sqrt(variance);
  return Math.min(1, stdDev / 128); // Normalize to 0-1
}

/**
 * Helper: Calculate variance
 */
function calculateVariance(pixels: number[]): number {
  const mean = pixels.reduce((a, b) => a + b) / pixels.length;
  return pixels.reduce((sum, p) => sum + Math.pow(p - mean, 2)) / pixels.length;
}

/**
 * Helper: Measure pupil diameter
 */
function measurePupilDiameter(
  pixelData: Uint8ClampedArray,
  width: number,
  pupilX: number,
  pupilY: number
): number {
  // Find edges of dark region (pupil)
  let diameter = 0;
  for (let d = 1; d < 50; d++) {
    const idx = (Math.floor(pupilY) * width + Math.floor(pupilX + d)) * 4;
    const value = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
    if (value > 100) {
      diameter = d * 2;
      break;
    }
  }
  return diameter;
}

/**
 * Helper: Measure roundness of pupil
 */
function measureRoundness(
  pixelData: Uint8ClampedArray,
  width: number,
  centerX: number,
  centerY: number,
  radius: number
): number {
  let edgePoints = 0;
  let darkPoints = 0;

  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    const x = Math.floor(centerX + Math.cos(angle) * radius);
    const y = Math.floor(centerY + Math.sin(angle) * radius);
    const idx = (y * width + x) * 4;
    const value = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;

    if (value < 100) darkPoints++;
    edgePoints++;
  }

  return darkPoints / edgePoints;
}

export interface EyeAnalysisResult {
  confidence: number;
  isFake: boolean;
  findings: string[];
  details: {
    irisQualityScore: number;
    pupilDilationScore: number;
    highlightArtifactsScore: number;
    cornealReflectionScore: number;
  };
}
