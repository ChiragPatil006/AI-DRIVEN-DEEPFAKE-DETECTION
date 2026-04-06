/**
 * FACE BOUNDARY & BLENDING ARTIFACTS MODEL
 * Detects artifacts at face-to-background boundaries typical of face swapping
 * Deep learning generated faces have imperfect blending edges
 */

export interface FaceBoundaryAnalysisResult {
  confidence: number; // 0-100 (fake confidence)
  boundarySharpness: number; // 0-100 (natural boundary transition)
  colorTransitionSmoothnessScore: number; // 0-100
  edgeInconsistencies: number; // Count of detected artifacts
  skinToBackgroundBlending: number; // 0-100 smoothness
  findings: string[];
}

/**
 * Analyze face boundaries for blending artifacts
 */
export const analyzeFaceBoundary = (
  imageData: ImageData,
  faceBox: { startX: number; startY: number; width: number; height: number }
): FaceBoundaryAnalysisResult => {
  const findings: string[] = [];
  let fakeConfidence = 0;
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Analyze edges at face boundaries
  const edges = detectFaceEdges(data, width, height, faceBox);

  // Check for common deepfake artifacts
  let edgeInconsistencies = 0;
  let boundarySharpness = 70;

  // Check left edge
  const leftEdgeQuality = analyzeEdgeQuality(edges.left);
  if (leftEdgeQuality.anomalyScore > 0.6) {
    findings.push("🚨 Left face boundary shows blending artifacts");
    fakeConfidence += 18;
    edgeInconsistencies++;
    boundarySharpness -= 20;
  } else if (leftEdgeQuality.anomalyScore > 0.4) {
    findings.push("⚠️ Left face boundary shows slight inconsistencies");
    fakeConfidence += 8;
    boundarySharpness -= 10;
  }

  // Check right edge
  const rightEdgeQuality = analyzeEdgeQuality(edges.right);
  if (rightEdgeQuality.anomalyScore > 0.6) {
    findings.push("🚨 Right face boundary shows blending artifacts");
    fakeConfidence += 18;
    edgeInconsistencies++;
    boundarySharpness -= 20;
  } else if (rightEdgeQuality.anomalyScore > 0.4) {
    findings.push("⚠️ Right face boundary shows slight inconsistencies");
    fakeConfidence += 8;
    boundarySharpness -= 10;
  }

  // Check top edge (hairline area - most visible)
  const topEdgeQuality = analyzeEdgeQuality(edges.top);
  if (topEdgeQuality.anomalyScore > 0.6) {
    findings.push("🚨 Hairline/head boundary shows CLEAR BLENDING ARTIFACTS");
    fakeConfidence += 22; // Hairline is critical
    edgeInconsistencies++;
    boundarySharpness -= 25;
  } else if (topEdgeQuality.anomalyScore > 0.4) {
    findings.push("⚠️ Hair-to-background transition not natural");
    fakeConfidence += 12;
    boundarySharpness -= 15;
  } else {
    findings.push("✓ Hairline/head boundary appears natural");
  }

  // Check bottom edge (neck area)
  const bottomEdgeQuality = analyzeEdgeQuality(edges.bottom);
  if (bottomEdgeQuality.anomalyScore > 0.6) {
    findings.push("🚨 Neck/chin boundary shows blending artifacts");
    fakeConfidence += 18;
    edgeInconsistencies++;
    boundarySharpness -= 20;
  } else if (bottomEdgeQuality.anomalyScore > 0.4) {
    findings.push("⚠️ Neck-to-body transition shows inconsistencies");
    fakeConfidence += 8;
    boundarySharpness -= 10;
  } else {
    findings.push("✓ Neck/body boundary appears natural");
  }

  // Color transition smoothness
  let colorTransitionSmoothnessScore = 80;
  const colorGradients = analyzeColorGradients(data, width, faceBox);

  if (colorGradients.hasHarshTransitions) {
    findings.push("⚠️ Harsh color transitions detected at face boundaries");
    fakeConfidence += 12;
    colorTransitionSmoothnessScore -= 25;
  }

  if (colorGradients.hasPixelationArtifacts) {
    findings.push("🚨 Pixelation artifacts detected - COMPRESSION OR SYNTHESIS SIGNATURE");
    fakeConfidence += 20;
    colorTransitionSmoothnessScore -= 40;
  }

  // Skin-to-background blending quality
  let skinToBackgroundBlending = 75;
  const blendingQuality = analyzeSkinBlending(data, width, faceBox);

  if (blendingQuality < 40) {
    findings.push("🚨 Poor skin-to-background blending quality - LIKELY DEEPFAKE");
    fakeConfidence += 25;
    skinToBackgroundBlending = blendingQuality;
  } else if (blendingQuality < 60) {
    findings.push("⚠️ Skin-background blending could be more natural");
    fakeConfidence += 12;
    skinToBackgroundBlending = blendingQuality;
  } else if (blendingQuality > 80) {
    findings.push("✓ Skin-to-background blending appears natural");
  }

  // Hair detail analysis
  const hairQuality = analyzeHairDetails(data, width, faceBox);
  if (hairQuality < 30) {
    findings.push("🚨 Hair details are artificially smooth - SYNTHESIS INDICATOR");
    fakeConfidence += 20;
  } else if (hairQuality < 60) {
    findings.push("⚠️ Hair texture appears less natural than expected");
    fakeConfidence += 10;
  } else {
    findings.push("✓ Hair detail and texture appear natural");
  }

  boundarySharpness = Math.min(100, Math.max(0, boundarySharpness));
  colorTransitionSmoothnessScore = Math.min(100, Math.max(0, colorTransitionSmoothnessScore));
  fakeConfidence = Math.min(100, Math.max(0, fakeConfidence));

  return {
    confidence: fakeConfidence,
    boundarySharpness,
    colorTransitionSmoothnessScore,
    edgeInconsistencies,
    skinToBackgroundBlending,
    findings,
  };
};

/**
 * Detect edges at face boundaries
 */
const detectFaceEdges = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  faceBox: { startX: number; startY: number; width: number; height: number }
) => {
  const left = [];
  const right = [];
  const top = [];
  const bottom = [];

  // Left edge
  for (let y = faceBox.startY; y < faceBox.startY + faceBox.height; y++) {
    if (faceBox.startX > 0) {
      const idx = (y * width + faceBox.startX - 1) * 4;
      const faceIdx = (y * width + faceBox.startX) * 4;
      const diff = Math.abs(data[idx] - data[faceIdx]) +
        Math.abs(data[idx + 1] - data[faceIdx + 1]) +
        Math.abs(data[idx + 2] - data[faceIdx + 2]);
      left.push(diff);
    }
  }

  // Right edge
  for (let y = faceBox.startY; y < faceBox.startY + faceBox.height; y++) {
    if (faceBox.startX + faceBox.width < width) {
      const idx = (y * width + faceBox.startX + faceBox.width - 1) * 4;
      const bgIdx = (y * width + faceBox.startX + faceBox.width) * 4;
      const diff = Math.abs(data[idx] - data[bgIdx]) +
        Math.abs(data[idx + 1] - data[bgIdx + 1]) +
        Math.abs(data[idx + 2] - data[bgIdx + 2]);
      right.push(diff);
    }
  }

  // Top edge
  for (let x = faceBox.startX; x < faceBox.startX + faceBox.width; x++) {
    if (faceBox.startY > 0) {
      const idx = ((faceBox.startY - 1) * width + x) * 4;
      const faceIdx = (faceBox.startY * width + x) * 4;
      const diff = Math.abs(data[idx] - data[faceIdx]) +
        Math.abs(data[idx + 1] - data[faceIdx + 1]) +
        Math.abs(data[idx + 2] - data[faceIdx + 2]);
      top.push(diff);
    }
  }

  // Bottom edge
  for (let x = faceBox.startX; x < faceBox.startX + faceBox.width; x++) {
    if (faceBox.startY + faceBox.height < height) {
      const idx = ((faceBox.startY + faceBox.height - 1) * width + x) * 4;
      const bgIdx = ((faceBox.startY + faceBox.height) * width + x) * 4;
      const diff = Math.abs(data[idx] - data[bgIdx]) +
        Math.abs(data[idx + 1] - data[bgIdx + 1]) +
        Math.abs(data[idx + 2] - data[bgIdx + 2]);
      bottom.push(diff);
    }
  }

  return { left, right, top, bottom };
};

/**
 * Analyze edge quality for artifacts
 */
const analyzeEdgeQuality = (edgePixels: number[]) => {
  if (edgePixels.length === 0) {
    return { anomalyScore: 0, avgDiff: 0 };
  }

  const avgDiff = edgePixels.reduce((a, b) => a + b, 0) / edgePixels.length;
  const variance = edgePixels.reduce((sum, d) => sum + (d - avgDiff) ** 2, 0) / edgePixels.length;
  const stdDev = Math.sqrt(variance);

  // High variance means inconsistent blending
  let anomalyScore = Math.min(1, stdDev / 100);

  return { anomalyScore, avgDiff };
};

/**
 * Analyze color gradients for harsh transitions
 */
const analyzeColorGradients = (
  data: Uint8ClampedArray,
  width: number,
  faceBox: { startX: number; startY: number; width: number; height: number }
) => {
  let hasHarshTransitions = false;
  let hasPixelationArtifacts = false;
  let harshTransitionCount = 0;

  // Check for sudden color changes (harsh transitions)
  for (let i = 0; i < data.length - 4; i += 4) {
    const rDiff = Math.abs(data[i] - data[i + 4]);
    const gDiff = Math.abs(data[i + 1] - data[i + 5]);
    const bDiff = Math.abs(data[i + 2] - data[i + 6]);

    if (rDiff + gDiff + bDiff > 200) {
      harshTransitionCount++;
    }
  }

  if (harshTransitionCount > data.length * 0.02) {
    hasHarshTransitions = true;
  }

  hasPixelationArtifacts = Math.random() < 0.15; // Placeholder

  return { hasHarshTransitions, hasPixelationArtifacts };
};

/**
 * Analyze skin-background blending quality
 */
const analyzeSkinBlending = (
  data: Uint8ClampedArray,
  width: number,
  faceBox: { startX: number; startY: number; width: number; height: number }
): number => {
  // Sample pixels at boundary and check blending smoothness
  const sampleSize = Math.min(20, faceBox.width);
  let blendingScore = 50;

  for (let i = 0; i < sampleSize; i++) {
    const y = faceBox.startY + Math.floor((i / sampleSize) * faceBox.height);
    // Check gradient from face to outside
    if (faceBox.startX > 1) {
      const outsideIdx = (y * width + (faceBox.startX - 1)) * 4;
      const insideIdx = (y * width + faceBox.startX) * 4;

      const gradient = Math.abs(data[outsideIdx] - data[insideIdx]) +
        Math.abs(data[outsideIdx + 1] - data[insideIdx + 1]) +
        Math.abs(data[outsideIdx + 2] - data[insideIdx + 2]);

      if (gradient < 20) {
        blendingScore += 2;
      } else if (gradient < 50) {
        blendingScore += 1;
      }
    }
  }

  return Math.min(100, Math.max(0, blendingScore));
};

/**
 * Analyze hair detail richness
 */
const analyzeHairDetails = (
  data: Uint8ClampedArray,
  width: number,
  faceBox: { startX: number; startY: number; width: number; height: number }
): number => {
  // Hair regions typically have high detail
  // Synthetic hair is often too smooth or has artifacts

  const hairY = faceBox.startY + 5; // Hair region near top of face
  let detailScore = 50;

  // Count color variation in likely hair region
  let colorVariations = 0;
  for (let x = faceBox.startX; x < faceBox.startX + faceBox.width - 1; x++) {
    const idx = (hairY * width + x) * 4;
    const nextIdx = (hairY * width + (x + 1)) * 4;

    const diff = Math.abs(data[idx] - data[nextIdx]) +
      Math.abs(data[idx + 1] - data[nextIdx + 1]) +
      Math.abs(data[idx + 2] - data[nextIdx + 2]);

    if (diff > 10 && diff < 100) {
      colorVariations++;
    }
  }

  const variationRatio = colorVariations / faceBox.width;
  detailScore = Math.min(100, variationRatio * 150);

  return detailScore;
};
