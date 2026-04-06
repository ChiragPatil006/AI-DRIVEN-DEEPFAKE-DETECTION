/**
 * COLOR CHANNEL ANALYSIS MODEL
 * Detects unnatural color channel distributions typical in deepfakes
 * GANs struggle to generate natural color distributions across RGB channels
 */

export interface ColorChannelAnalysisResult {
  confidence: number; // 0-100 (fake confidence)
  colorChannelConsistency: number; // 0-100 (how balanced RGB is)
  redGreenRatio: number; // R/G ratio (natural ~1.0)
  greenBlueRatio: number; // G/B ratio (natural ~1.0)
  redBlueRatio: number; // R/B ratio (natural ~1.0)
  channelEntropy: number; // 0-100 (randomness in each channel)
  findings: string[];
}

/**
 * Analyze color channel statistics
 */
export const analyzeColorChannels = (
  imageData: ImageData,
  faceBox: { startX: number; startY: number; width: number; height: number }
): ColorChannelAnalysisResult => {
  const data = imageData.data;
  const findings: string[] = [];
  let fakeConfidence = 0;

  // Extract color channels from face region
  const width = imageData.width;
  const faceStartIdx = (faceBox.startY * width + faceBox.startX) * 4;

  let rSum = 0, gSum = 0, bSum = 0;
  let rSq = 0, gSq = 0, bSq = 0; // For standard deviation
  let pixelCount = 0;

  // Sample pixels in face region
  for (let y = faceBox.startY; y < faceBox.startY + faceBox.height && y < imageData.height; y++) {
    for (let x = faceBox.startX; x < faceBox.startX + faceBox.width && x < imageData.width; x++) {
      const idx = (y * width + x) * 4;

      const r = data[idx] || 0;
      const g = data[idx + 1] || 0;
      const b = data[idx + 2] || 0;

      rSum += r;
      gSum += g;
      bSum += b;
      rSq += r * r;
      gSq += g * g;
      bSq += b * b;
      pixelCount++;
    }
  }

  if (pixelCount === 0) {
    return {
      confidence: 0,
      colorChannelConsistency: 50,
      redGreenRatio: 1.0,
      greenBlueRatio: 1.0,
      redBlueRatio: 1.0,
      channelEntropy: 50,
      findings: ["Unable to analyze color channels"],
    };
  }

  // Calculate averages
  const rAvg = rSum / pixelCount;
  const gAvg = gSum / pixelCount;
  const bAvg = bSum / pixelCount;

  // Calculate standard deviations
  const rStd = Math.sqrt(rSq / pixelCount - rAvg * rAvg);
  const gStd = Math.sqrt(gSq / pixelCount - gAvg * gAvg);
  const bStd = Math.sqrt(bSq / pixelCount - bAvg * bAvg);

  // Calculate ratios
  const redGreenRatio = gAvg > 1 ? rAvg / gAvg : 1;
  const greenBlueRatio = bAvg > 1 ? gAvg / bAvg : 1;
  const redBlueRatio = bAvg > 1 ? rAvg / bAvg : 1;

  findings.push(`Color channel analysis: R=${rAvg.toFixed(0)} G=${gAvg.toFixed(0)} B=${bAvg.toFixed(0)}`);

  // Natural skin tone has R > G > B with specific ratios
  // Typical natural face: R/G ≈ 1.0-1.15, G/B ≈ 0.95-1.1, R/B ≈ 1.0-1.3

  // Check for unnatural channel imbalance
  let channelConsistency = 100;

  // Red-Green imbalance
  if (Math.abs(redGreenRatio - 1.08) > 0.25) {
    findings.push("⚠️ Unusual Red-Green ratio detected (DEEPFAKE INDICATOR)");
    fakeConfidence += 15;
    channelConsistency -= 20;
  }

  // Green-Blue imbalance
  if (Math.abs(greenBlueRatio - 1.02) > 0.25) {
    findings.push("⚠️ Unusual Green-Blue ratio detected (DEEPFAKE INDICATOR)");
    fakeConfidence += 15;
    channelConsistency -= 20;
  }

  // Red-Blue imbalance
  if (Math.abs(redBlueRatio - 1.1) > 0.35) {
    findings.push("🚨 Severe Red-Blue channel imbalance (LIKELY DEEPFAKE)");
    fakeConfidence += 25;
    channelConsistency -= 30;
  }

  // Channel entropy analysis (GANs produce lower entropy)
  const maxStd = Math.max(rStd, gStd, bStd);
  const minStd = Math.min(rStd, gStd, bStd);
  const entropyBalance = minStd > 0 ? (maxStd / minStd) : 1;

  let channelEntropy = 50;
  if (entropyBalance > 2.0) {
    findings.push("⚠️ Unnatural entropy distribution across channels");
    fakeConfidence += 12;
    channelEntropy = 30;
  } else if (entropyBalance < 1.2) {
    findings.push("Note: Channels have balanced entropy (natural)");
    channelEntropy = 75;
  } else {
    channelEntropy = 55;
  }

  // Lack of color variation (typical in synthetic images)
  const colorVariation = Math.sqrt((rStd + gStd + bStd) / 3);
  if (colorVariation < 15) {
    findings.push("🚨 Severely limited color variation - SYNTHETIC IMAGE DETECTED");
    fakeConfidence += 30;
    channelConsistency -= 25;
  } else if (colorVariation < 30) {
    findings.push("⚠️ Low color variation in face region");
    fakeConfidence += 12;
  } else {
    findings.push("✓ Natural color variation range detected");
  }

  // GAN artifacts: check for color banding
  const colorBanding = detectColorBanding(data, width, faceBox);
  if (colorBanding > 0.25) {
    findings.push("🚨 Color banding detected - SYNTHETIC GENERATION SIGNATURE");
    fakeConfidence += 20;
  }

  channelConsistency = Math.min(100, Math.max(0, channelConsistency));
  fakeConfidence = Math.min(100, Math.max(0, fakeConfidence));

  return {
    confidence: fakeConfidence,
    colorChannelConsistency: channelConsistency,
    redGreenRatio,
    greenBlueRatio,
    redBlueRatio,
    channelEntropy,
    findings,
  };
};

/**
 * Detect color banding (posterization typical in synthetic images)
 */
const detectColorBanding = (
  data: Uint8ClampedArray,
  width: number,
  faceBox: { startX: number; startY: number; width: number; height: number }
): number => {
  let bandingScore = 0;
  const bandingThreshold = 2; // Adjacent pixels with very similar colors
  let bandedPixels = 0;
  let totalPixels = 0;

  for (let y = faceBox.startY; y < faceBox.startY + faceBox.height - 1; y++) {
    for (let x = faceBox.startX; x < faceBox.startX + faceBox.width - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxRight = (y * width + (x + 1)) * 4;

      const r1 = data[idx];
      const g1 = data[idx + 1];
      const b1 = data[idx + 2];

      const r2 = data[idxRight];
      const g2 = data[idxRight + 1];
      const b2 = data[idxRight + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (diff <= bandingThreshold) {
        bandedPixels++;
      }
      totalPixels++;
    }
  }

  if (totalPixels > 0) {
    bandingScore = bandedPixels / totalPixels;
  }

  return bandingScore;
};
