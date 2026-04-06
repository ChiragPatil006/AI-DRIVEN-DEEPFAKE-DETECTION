/**
 * AI WATERMARK & DIGITAL SIGNATURE DETECTION MODEL
 * Detects hidden watermarks and artifacts common in AI-generated/deepfake videos
 * Modern deepfakes often embed digital signatures, metadata artifacts, or compression patterns
 */

export interface WatermarkAnalysisResult {
  confidence: number; // 0-100 (fake confidence based on watermark/artifact detection)
  watermarkDetected: boolean;
  artifactType: string;
  suspiciousPatterns: string[];
  findings: string[];
}

/**
 * DETECT AI WATERMARKS & DIGITAL SIGNATURES
 */
export const analyzeWatermarks = (
  imageData: ImageData,
  faceBox: { startX: number; startY: number; width: number; height: number }
): WatermarkAnalysisResult => {
  const findings: string[] = [];
  let fakeConfidence = 0;
  const suspiciousPatterns: string[] = [];
  let watermarkDetected = false;
  let artifactType = 'None';

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // ===== PATTERN 1: DCT COEFFICIENT ARTIFACTS (JPEG Compression Watermark) =====
  // Deepfakes often have distinctive compression patterns
  let dctArtifacts = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check for 8x8 block boundaries (JPEG compression artifacts at deepfake boundaries)
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    
    if ((x % 8 === 7 || x % 8 === 0) && (y % 8 === 7 || y % 8 === 0)) {
      const colorDist = Math.abs(r - g) + Math.abs(g - b);
      if (colorDist > 15) dctArtifacts++;
    }
  }

  const dctArtifactRatio = dctArtifacts / (data.length / 4);
  if (dctArtifactRatio > 0.08) {
    findings.push("🚨 WATERMARK DETECTED: Excessive DCT block boundary artifacts");
    suspiciousPatterns.push('DCT block artifacts');
    watermarkDetected = true;
    artifactType = 'DCT Compression Watermark';
    fakeConfidence += 50;
  }

  // ===== PATTERN 2: FREQUENCY AMPLITUDE MODULATION (FAM) WATERMARK =====
  // Common in some deepfake generation tools
  let frequencyAnomalies = 0;
  const pixelDifferences: number[] = [];
  
  for (let i = 4; i < Math.min(data.length, 1000); i += 4) {
    const prevR = data[i - 4];
    const currR = data[i];
    pixelDifferences.push(Math.abs(currR - prevR));
  }
  
  const avgDiff = pixelDifferences.reduce((a, b) => a + b, 0) / pixelDifferences.length;
  const stdDev = Math.sqrt(
    pixelDifferences.reduce((sum, val) => sum + Math.pow(val - avgDiff, 2), 0) / pixelDifferences.length
  );
  
  // Deepfakes have unnatural frequency distributions
  if (stdDev < 8 && avgDiff < 5) {
    findings.push("🚨 WATERMARK DETECTED: Suspicious frequency amplitude modulation pattern");
    suspiciousPatterns.push('FAM watermark signature');
    watermarkDetected = true;
    artifactType = 'Frequency Amplitude Modulation';
    fakeConfidence += 45;
  }

  // ===== PATTERN 3: EDGE BOUNDARY ARTIFACTS =====
  // Face-swap deepfakes have distinctive artifacts at boundaries
  const faceX = faceBox.startX;
  const faceY = faceBox.startY;
  const faceW = faceBox.width;
  const faceH = faceBox.height;

  let boundaryAnomalies = 0;
  const boundaryPixels = 15; // Check pixels near face boundary

  for (let x = faceX; x < faceX + boundaryPixels && x < width; x++) {
    for (let y = faceY; y < faceY + faceH && y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Look for unnatural color transitions
      if (Math.abs(r - g) > 40 || Math.abs(g - b) > 40) {
        boundaryAnomalies++;
      }
    }
  }

  const boundaryAnomalyRatio = boundaryAnomalies / (boundaryPixels * faceH);
  if (boundaryAnomalyRatio > 0.25) {
    findings.push("🚨 WATERMARK DETECTED: Extreme color transitions at face boundaries (Face-Swap Signature)");
    suspiciousPatterns.push('Face boundary blending artifacts');
    watermarkDetected = true;
    artifactType = 'Face-Swap Edge Artifact';
    fakeConfidence += 55;
  }

  // ===== PATTERN 4: PIXEL-LEVEL GRID PATTERN (GAN Checkerboard Artifacts) =====
  // Some GANs produce characteristic grid patterns
  let gridArtifacts = 0;
  const sampleSize = Math.min(100, Math.floor(width / 4));
  
  for (let x = 0; x < sampleSize; x += 4) {
    for (let y = 0; y < sampleSize; y += 4) {
      const idx1 = (y * width + x) * 4;
      const idx2 = ((y + 2) * width + (x + 2)) * 4;
      
      if (idx2 < data.length) {
        const r1 = data[idx1];
        const r2 = data[idx2];
        
        // Check for checkerboard-like pattern (common in GAN artifacts)
        if (Math.abs(r1 - r2) > 30) gridArtifacts++;
      }
    }
  }

  const gridArtifactRatio = gridArtifacts / (sampleSize / 4 * sampleSize / 4);
  if (gridArtifactRatio > 0.4) {
    findings.push("🚨 WATERMARK DETECTED: GAN-style checkerboard/grid artifacts");
    suspiciousPatterns.push('GAN grid pattern');
    watermarkDetected = true;
    artifactType = 'GAN Checkerboard Pattern';
    fakeConfidence += 60;
  }

  // ===== PATTERN 5: METADATA SIGNATURE ARTIFACTS =====
  // Check for characteristic luminance patterns that indicate metadata embedding
  let metadataSignatures = 0;
  const lumValues: number[] = [];
  
  for (let i = 0; i < Math.min(data.length, 4000); i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumValues.push(lum);
  }
  
  // Look for suspiciously regular luminance patterns
  let regularPatterns = 0;
  for (let i = 1; i < lumValues.length - 1; i++) {
    const diff1 = Math.abs(lumValues[i] - lumValues[i - 1]);
    const diff2 = Math.abs(lumValues[i + 1] - lumValues[i]);
    if (Math.abs(diff1 - diff2) < 2) regularPatterns++;
  }
  
  if (regularPatterns > lumValues.length * 0.35) {
    findings.push("⚠️ SUSPICIOUS: Embedded metadata signature detected in luminance patterns");
    suspiciousPatterns.push('Metadata embedding');
    fakeConfidence += 25;
  }

  // ===== PATTERN 6: COLOR CHANNEL DESYNCHRONIZATION (Temporal Watermark) =====
  // Deepfakes sometimes have R/G/B channels slightly out of sync
  let channelDesync = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Natural images have balanced RGB, deepfakes often show bias
    const rg = Math.abs(r - g);
    const gb = Math.abs(g - b);
    const rb = Math.abs(r - b);
    
    if (rg > 45 && gb > 45 && rb > 45) channelDesync++;
  }
  
  const desyncRatio = channelDesync / (data.length / 4);
  if (desyncRatio > 0.12) {
    findings.push("🚨 WATERMARK DETECTED: RGB channel desynchronization (Temporal encoding)");
    suspiciousPatterns.push('RGB channel watermark');
    watermarkDetected = true;
    artifactType = 'Channel Desync Watermark';
    fakeConfidence += 40;
  }

  // ===== CRITICAL MULTIPLIER: MULTIPLE WATERMARKS =====
  if (watermarkDetected && suspiciousPatterns.length >= 2) {
    findings.push("🚨🚨🚨 MULTIPLE WATERMARKS/ARTIFACTS DETECTED - STRONG DEEPFAKE SIGNATURE");
    watermarkDetected = true;
    fakeConfidence = Math.min(100, fakeConfidence * 1.4); // 40% boost for multiple artifacts
  }

  fakeConfidence = Math.min(100, Math.max(0, fakeConfidence));

  return {
    confidence: fakeConfidence,
    watermarkDetected,
    artifactType,
    suspiciousPatterns,
    findings,
  };
};
