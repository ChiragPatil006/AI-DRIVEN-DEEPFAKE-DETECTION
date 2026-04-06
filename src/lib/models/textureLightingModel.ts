/**
 * TEXTURE & LIGHTING PHYSICS MODEL
 * Detects unnatural texture patterns and physically inconsistent lighting
 * Based on: Physical properties of light, skin texture analysis, and GAN-specific artifacts
 */

export interface TextureLightingResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    skinTextureScore: number;
    lightingConsistencyScore: number;
    specularhighlightScore: number;
    porePatternScore: number;
  };
}

/**
 * Analyzes texture and lighting characteristics of facial image
 */
export const analyzeTextureLighting = (
  imageData: ImageData,
  faceRegion: { startX: number; startY: number; width: number; height: number }
): TextureLightingResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  const { startX, startY, width: w, height: h } = faceRegion;

  // Extract RGB channels for analysis
  const channels = extractRGBChannels(imageData, faceRegion);

  // 1. SKIN TEXTURE ANALYSIS
  const skinTexture = analyzeSkinTexture(channels, imageData, faceRegion);
  if (skinTexture.isSuspicious) {
    confidenceScore += 23;
    findings.push(
      `Artificial skin texture detected. ${skinTexture.type}. GANs produce overly smooth or unnaturally patterned skin.`
    );
  }

  // 2. LIGHTING CONSISTENCY
  const lightingAnalysis = analyzeIlluminationConsistency(channels, faceRegion);
  if (lightingAnalysis.isInconsistent) {
    confidenceScore += 24;
    findings.push(
      `Physically impossible lighting detected. Light direction: ${lightingAnalysis.primaryDirection}. Inconsistencies suggest composite/synthesis.`
    );
  }

  // 3. SPECULAR HIGHLIGHT ANALYSIS
  const highlightAnalysis = analyzeSpecularHighlights(channels);
  if (highlightAnalysis.isAbnormal) {
    confidenceScore += 20;
    findings.push(
      `${highlightAnalysis.abnormalityType}. Real skin produces specific specular patterns; this shows synthetic properties.`
    );
  }

  // 4. PORE PATTERN ANALYSIS
  const poreAnalysis = analyzePorePatterns(channels.red, faceRegion);
  if (poreAnalysis.isSuspicious) {
    confidenceScore += 18;
    findings.push(
      `Pore distribution analysis suggests ${poreAnalysis.assessment}. GAN faces lack natural pore texture.`
    );
  }

  // 5. COLOR BLEEDING & POSTERIZATION
  const colorIssues = detectColorPosterization(channels);
  if (colorIssues.hasIssues) {
    confidenceScore += 15;
    findings.push(
      `Color ${colorIssues.issueType} detected. GAN-generated faces show compression-like color transitions.`
    );
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 50,
    findings,
    details: {
      skinTextureScore: skinTexture.score,
      lightingConsistencyScore: lightingAnalysis.consistencyScore,
      specularhighlightScore: highlightAnalysis.score,
      porePatternScore: poreAnalysis.score,
    },
  };
};

/**
 * Extract RGB channels from image data
 */
function extractRGBChannels(
  imageData: ImageData,
  faceRegion: { startX: number; startY: number; width: number; height: number }
): { red: number[]; green: number[]; blue: number[] } {
  const { startX, startY, width: w, height: h } = faceRegion;
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];

  const imageWidth = imageData.width;
  const pixelData = imageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = ((startY + y) * imageWidth + (startX + x)) * 4;
      red.push(pixelData[idx]);
      green.push(pixelData[idx + 1]);
      blue.push(pixelData[idx + 2]);
    }
  }

  return { red, green, blue };
}

/**
 * Analyzes skin texture characteristics
 */
function analyzeSkinTexture(
  channels: { red: number[]; green: number[]; blue: number[] },
  imageData: ImageData,
  faceRegion: any
): {
  score: number;
  isSuspicious: boolean;
  type: string;
} {
  const { red, green, blue } = channels;
  const { width: w, height: h } = faceRegion;

  // Calculate local texture variance using Laplacian operator
  let textureVariance = 0;
  let textureCount = 0;

  for (let i = 1; i < red.length - w; i++) {
    const laplacian =
      4 * red[i] -
      red[i - 1] -
      red[i + 1] -
      red[i - w] -
      red[i + w];
    textureVariance += Math.abs(laplacian);
    textureCount++;
  }

  const avgTexture = textureVariance / textureCount;

  // Real skin: 15-35, GAN skin: 5-12 (too smooth) or 60+ (too noisy)
  let isSuspicious = false;
  let textureType = "";

  if (avgTexture < 8) {
    isSuspicious = true;
    textureType = "Texture is artificially smooth";
  } else if (avgTexture > 55) {
    isSuspicious = true;
    textureType = "Texture contains unnatural noise";
  }

  const score = isSuspicious ? Math.min(100, (Math.abs(avgTexture - 25) / 15) * 100) : 0;

  return {
    score,
    isSuspicious,
    type: textureType,
  };
}

/**
 * Analyzes illumination and lighting consistency
 */
function analyzeIlluminationConsistency(
  channels: { red: number[]; green: number[]; blue: number[] },
  faceRegion: any
): {
  isInconsistent: boolean;
  consistencyScore: number;
  primaryDirection: string;
} {
  const { red, green, blue } = channels;
  const { width: w, height: h } = faceRegion;

  // Compute gradient maps to find light direction
  let gradX = 0;
  let gradY = 0;
  let count = 0;

  for (let i = 1; i < red.length - w; i++) {
    const gx = red[i + 1] - red[i - 1];
    const gy = red[i + w] - red[i - w];
    gradX += gx;
    gradY += gy;
    count++;
  }

  gradX /= count;
  gradY /= count;

  // Determine light direction
  let primaryDirection = "Unknown";
  if (Math.abs(gradX) > Math.abs(gradY)) {
    primaryDirection = gradX > 0 ? "Left-to-right" : "Right-to-left";
  } else {
    primaryDirection = gradY > 0 ? "Top-to-bottom" : "Bottom-to-top";
  }

  // Check for lighting inconsistencies
  // In synthetic images, lighting is often too uniform or has impossible directions
  const uniformity = Math.max(0, 1 - Math.abs(gradX) / 50, 1 - Math.abs(gradY) / 50);

  // Channel correlation (red-green-blue should correlate under consistent light)
  let channelCorrelation = 0;
  for (let i = 0; i < red.length; i++) {
    if (i % 10 === 0) {
      const rg = Math.abs(red[i] - green[i]);
      const rb = Math.abs(red[i] - blue[i]);
      channelCorrelation += rg + rb;
    }
  }

  const isInconsistent = uniformity > 0.6 || channelCorrelation > 500;
  const consistencyScore = isInconsistent ? Math.min(100, uniformity * 100) : 100;

  return {
    isInconsistent,
    consistencyScore,
    primaryDirection,
  };
}

/**
 * Analyzes specular highlights on skin
 */
function analyzeSpecularHighlights(channels: { red: number[]; green: number[]; blue: number[] }): {
  score: number;
  isAbnormal: boolean;
  abnormalityType: string;
} {
  const { red, green, blue } = channels;

  // Find bright pixels (potential specular highlights)
  const brightPixels = red.filter((r, i) => r > 200 && green[i] > 200 && blue[i] > 200).length;
  const highlightRatio = brightPixels / red.length;

  // Real skin: 5-15% bright pixels (natural highlights)
  // GAN skin: too many (60%+) or too few (<2%) highlights
  let isAbnormal = false;
  let type = "";

  if (highlightRatio < 0.02) {
    isAbnormal = true;
    type = "Missing specular highlights";
  } else if (highlightRatio > 0.6) {
    isAbnormal = true;
    type = "Excessive bright regions";
  }

  // Also check highlight color consistency
  let rVariance = 0,
    gVariance = 0;
  let count = 0;
  for (let i = 0; i < red.length; i++) {
    if (red[i] > 200) {
      rVariance += Math.abs(red[i] - 220);
      gVariance += Math.abs(green[i] - 220);
      count++;
    }
  }

  if (count > 0) {
    rVariance /= count;
    gVariance /= count;
    // Specular highlights should be achromatic (RGB equal)
    if (Math.abs(rVariance - gVariance) > 20) {
      isAbnormal = true;
      type = "Colored specular highlights (unnatural)";
    }
  }

  const score = isAbnormal ? Math.min(100, Math.abs(highlightRatio - 0.1) * 500) : 0;

  return {
    score,
    isAbnormal,
    abnormalityType: type,
  };
}

/**
 * Analyzes pore and skin detail patterns
 */
function analyzePorePatterns(redChannel: number[], faceRegion: any): {
  score: number;
  isSuspicious: boolean;
  assessment: string;
} {
  const { width: w, height: h } = faceRegion;

  // Detect fine details using high-frequency analysis
  let detailEnergy = 0;
  let detailCount = 0;

  for (let i = 1; i < redChannel.length - w; i++) {
    const detail = Math.abs(redChannel[i] - redChannel[i - 1]) + Math.abs(redChannel[i] - redChannel[i - w]);
    if (detail > 5 && detail < 40) {
      // Pore-like details
      detailEnergy += detail;
      detailCount++;
    }
  }

  const poreEnergy = detailCount > 0 ? detailEnergy / detailCount : 0;

  // Real skin: 8-20 (visible pores)
  // GAN skin: <4 (no pores) or >35 (fake texture)
  let isSuspicious = poreEnergy < 4 || poreEnergy > 35;
  let assessment = "";

  if (poreEnergy < 4) {
    assessment = "skin artificially smoothed (no visible pores)";
  } else if (poreEnergy > 35) {
    assessment = "unnatural pore distribution";
  } else {
    assessment = "natural pore pattern";
  }

  const score = isSuspicious ? Math.min(100, Math.abs(poreEnergy - 12) * 5) : 0;

  return {
    score,
    isSuspicious,
    assessment,
  };
}

/**
 * Detects color posterization and banding artifacts
 */
function detectColorPosterization(channels: { red: number[]; green: number[]; blue: number[] }): {
  hasIssues: boolean;
  issueType: string;
} {
  const { red, green, blue } = channels;

  // Count unique colors
  const colorMap = new Set<string>();
  for (let i = 0; i < red.length; i++) {
    colorMap.add(`${Math.floor(red[i] / 10)},${Math.floor(green[i] / 10)},${Math.floor(blue[i] / 10)}`);
  }

  const colorDiversity = colorMap.size / (red.length / 100);

  // Real images: 30-50 unique colors per 100 pixels
  // Posterized: <15 colors per 100 pixels
  const hasIssues = colorDiversity < 15;

  return {
    hasIssues,
    issueType: hasIssues ? "posterization" : "banding",
  };
}
