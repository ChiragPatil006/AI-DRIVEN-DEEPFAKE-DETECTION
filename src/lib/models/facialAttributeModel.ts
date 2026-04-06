/**
 * FACIAL ATTRIBUTE STABILITY MODEL
 * Detects anomalies in facial attributes like age, expression, skin tone
 * GANs often generate faces that appear to subtly change attributes
 */

export interface FacialAttributeResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    ageConsistencyScore: number;
    expressionNaturalsScore: number;
    skinToneUniformityScore: number;
    featurePropulsionScore: number;
  };
}

export interface FaceAttributes {
  estimatedAge: number;
  skinTone: number; // 0-255
  expressionIntensity: number; // 0-100
  mouthOpenness: number; // 0-100
  eyeOpenness: number; // 0-100
  headPosePitch: number; // degrees
  headPoseYaw: number; // degrees
  headPoseRoll: number; // degrees
}

/**
 * Analyzes facial attributes for consistency and naturalness
 */
export const analyzeFacialAttributes = (
  attributes: FaceAttributes,
  imageData: ImageData,
  faceBox: { startX: number; startY: number; width: number; height: number }
): FacialAttributeResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  // 1. AGE CONSISTENCY (from texture estimation)
  const ageAnalysis = analyzeAgeConsistency(attributes, imageData, faceBox);
  if (ageAnalysis.isInconsistent) {
    confidenceScore += 20;
    findings.push(
      `Age inconsistency detected. Face appears ~${ageAnalysis.textureAge} years old from skin texture, but ~${ageAnalysis.featureAge} from facial features. GANs often have mismatched age cues.`
    );
  }

  // 2. SKIN TONE UNIFORMITY
  const skinAnalysis = analyzeSkinToneUniformity(imageData, faceBox);
  if (skinAnalysis.isUnnatural) {
    confidenceScore += 22;
    findings.push(
      `Skin tone is ${skinAnalysis.uniformityType}. ${skinAnalysis.assessment}. Real skin has natural color variation.`
    );
  }

  // 3. EXPRESSION NATURALNESS
  const expressionAnalysis = analyzeExpressionNaturalness(attributes);
  if (expressionAnalysis.isUnnatural) {
    confidenceScore += 18;
    findings.push(
      `Facial expression appears ${expressionAnalysis.type}. ${expressionAnalysis.assessment}. Synthesized expressions often lack natural Duchenne markers.`
    );
  }

  // 4. HEAD POSE VALIDITY
  const poseAnalysis = analyzeHeadPoseValidity(attributes);
  if (poseAnalysis.isAbnormal) {
    confidenceScore += 16;
    findings.push(
      `Head pose angles ${poseAnalysis.assessment}. Pitch: ${Math.round(attributes.headPosePitch)}°, Yaw: ${Math.round(attributes.headPoseYaw)}°, Roll: ${Math.round(attributes.headPoseRoll)}°. These values seem physically impossible or unnatural.`
    );
  }

  // 5. FEATURE PROPORTION CONSISTENCY
  const proportionAnalysis = analyzeFeatureProportions(attributes);
  if (proportionAnalysis.hasAnomalies) {
    confidenceScore += 17;
    findings.push(
      `Feature proportions show ${proportionAnalysis.anomalyCount} anomalies. GAN faces often have inconsistent mouth openness, eye openness, etc.`
    );
  }

  // 6. MICRO-EXPRESSION DETECTION
  const microExpression = detectMicroExpressions(attributes);
  if (microExpression.isSuspicious) {
    confidenceScore += 15;
    findings.push(
      `Micro-expression patterns suggest ${microExpression.assessment}. Real faces naturally leak true emotions; GANs often produce "frozen" or "plastered" expressions.`
    );
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 50,
    findings,
    details: {
      ageConsistencyScore: ageAnalysis.consistencyScore,
      expressionNaturalsScore: expressionAnalysis.naturalnessScore,
      skinToneUniformityScore: skinAnalysis.uniformityScore,
      featurePropulsionScore: proportionAnalysis.proportionScore,
    },
  };
};

/**
 * Analyzes age consistency between texture and features
 */
function analyzeAgeConsistency(
  attributes: FaceAttributes,
  imageData: ImageData,
  faceBox: any
): {
  isInconsistent: boolean;
  textureAge: number;
  featureAge: number;
  consistencyScore: number;
} {
  // Estimate age from skin texture
  const textureAge = estimateAgeFromTexture(imageData, faceBox);

  // Age from features (given)
  const featureAge = attributes.estimatedAge;

  // Real people: texture age and feature age match (±3 years)
  const ageDifference = Math.abs(textureAge - featureAge);
  const isInconsistent = ageDifference > 5;

  return {
    isInconsistent,
    textureAge: Math.round(textureAge),
    featureAge,
    consistencyScore: Math.max(0, 100 - ageDifference * 10),
  };
}

/**
 * Estimates age from skin texture analysis
 */
function estimateAgeFromTexture(imageData: ImageData, faceBox: any): number {
  const { startX, startY, width: w, height: h } = faceBox;
  const pixelData = imageData.data;
  const imgWidth = imageData.width;

  // Sample forehead and cheek areas for texture
  let textureScore = 0;
  let samples = 0;

  // Check forehead (typically shows age first)
  for (let y = startY + h * 0.1; y < startY + h * 0.25; y += 5) {
    for (let x = startX + w * 0.2; x < startX + w * 0.8; x += 5) {
      const idx = (y * imgWidth + x) * 4;
      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      
      // Wrinkle detection: high local variance = wrinkles = older
      const localVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
      textureScore += localVariance;
      samples++;
    }
  }

  const avgTextureScore = textureScore / samples;

  // Rough age estimation
  // Low texture variance (smooth): young, High variance (wrinkly): old
  if (avgTextureScore < 20) return 18; // Very smooth, young
  if (avgTextureScore < 40) return 25;
  if (avgTextureScore < 60) return 35;
  if (avgTextureScore < 80) return 45;
  if (avgTextureScore < 100) return 55;
  return 65; // High wrinkles, older
}

/**
 * Analyzes skin tone uniformity
 */
function analyzeSkinToneUniformity(
  imageData: ImageData,
  faceBox: any
): {
  isUnnatural: boolean;
  uniformityType: string;
  uniformityScore: number;
  assessment: string;
} {
  const { startX, startY, width: w, height: h } = faceBox;
  const pixelData = imageData.data;
  const imgWidth = imageData.width;

  // Sample skin tone from cheeks
  const skinPixels: Array<{ r: number; g: number; b: number }> = [];

  for (let y = startY + h * 0.3; y < startY + h * 0.7; y += 3) {
    for (let x = startX + w * 0.2; x < startX + w * 0.8; x += 3) {
      const idx = (y * imgWidth + x) * 4;
      skinPixels.push({
        r: pixelData[idx],
        g: pixelData[idx + 1],
        b: pixelData[idx + 2],
      });
    }
  }

  // Analyze skin tone distribution
  const rVariance = calculateVariance(skinPixels.map((p) => p.r));
  const gVariance = calculateVariance(skinPixels.map((p) => p.g));
  const bVariance = calculateVariance(skinPixels.map((p) => p.b));

  const avgVariance = (rVariance + gVariance + bVariance) / 3;

  // Real skin: moderate variance (15-30)
  // Smooth GAN skin: low variance (<10)
  // Spotty fake skin: high variance (>40)
  let isUnnatural = avgVariance < 8 || avgVariance > 45;
  let uniformityType = "unknown";
  let assessment = "natural";

  if (avgVariance < 8) {
    isUnnatural = true;
    uniformityType = "overly uniform";
    assessment = "GANs often produce unnaturally smooth, uniform skin tones";
  } else if (avgVariance > 45) {
    isUnnatural = true;
    uniformityType = "spotty/blotchy";
    assessment = "Unusual color variation pattern suggests artificial processing";
  }

  return {
    isUnnatural,
    uniformityType,
    uniformityScore: Math.max(0, 100 - Math.abs(avgVariance - 20) * 3),
    assessment,
  };
}

/**
 * Analyzes expression naturalness
 */
function analyzeExpressionNaturalness(attributes: FaceAttributes): {
  isUnnatural: boolean;
  naturalnessScore: number;
  type: string;
  assessment: string;
} {
  const { expressionIntensity, mouthOpenness, eyeOpenness } = attributes;

  // Real expressions: varied intensity
  // Fake expressions: often frozen or unnaturally intense

  let isUnnatural = false;
  let type = "natural";
  let assessment = "expression appears genuine";

  // Suspicious if: expression is too mild despite open mouth
  if (mouthOpenness > 40 && expressionIntensity < 20) {
    isUnnatural = true;
    type = "emotionally disconnected";
    assessment = "Mouth open but face shows no emotional response";
  }

  // Suspicious if: overly intense expression
  if (expressionIntensity > 90) {
    isUnnatural = true;
    type = "overly exaggerated";
    assessment = "Expression intensity is unnaturally high";
  }

  // Suspicious if: eyes and mouth don't coordinate
  const coordinationMismatch = Math.abs(eyeOpenness - (mouthOpenness / 100) * 100) > 60;
  if (coordinationMismatch) {
    isUnnatural = isUnnatural || true;
    type = "uncoordinated";
    assessment = "Eyes and mouth don't coordinate naturally";
  }

  const naturalnessScore = isUnnatural ? Math.max(0, 100 - expressionIntensity * 0.5) : 100;

  return {
    isUnnatural,
    naturalnessScore,
    type,
    assessment,
  };
}

/**
 * Analyzes head pose validity
 */
function analyzeHeadPoseValidity(attributes: FaceAttributes): {
  isAbnormal: boolean;
  assessment: string;
} {
  const { headPosePitch, headPoseYaw, headPoseRoll } = attributes;

  // Valid human head pose ranges
  // Pitch: -45 to 45 degrees (looking up/down)
  // Yaw: -90 to 90 degrees (looking left/right)
  // Roll: -30 to 30 degrees (head tilt)

  let isAbnormal = false;
  let assessment = "";

  if (headPosePitch < -45 || headPosePitch > 45) {
    isAbnormal = true;
    assessment = "Head pitch exceeds human limits";
  }

  if (headPoseYaw < -90 || headPoseYaw > 90) {
    isAbnormal = true;
    assessment = "Head yaw exceeds human limits";
  }

  if (headPoseRoll < -30 || headPoseRoll > 30) {
    isAbnormal = true;
    assessment = "Head roll exceeds natural tilt";
  }

  if (!isAbnormal) {
    assessment = "natural and within human limits";
  }

  return { isAbnormal, assessment };
}

/**
 * Analyzes feature proportions for consistency
 */
function analyzeFeatureProportions(attributes: FaceAttributes): {
  hasAnomalies: boolean;
  anomalyCount: number;
  proportionScore: number;
} {
  let anomalies = 0;
  const { eyeOpenness, mouthOpenness } = attributes;

  // Range checks
  if (eyeOpenness < 10) {
    anomalies++; // Eyes unusually closed
  } else if (eyeOpenness > 95) {
    anomalies++; // Eyes unusually wide (shocked/unnatural)
  }

  if (mouthOpenness > 70 && eyeOpenness < 20) {
    anomalies++; // Mouth open but eyes nearly closed (unnatural combo)
  }

  // GANs often show inconsistent proportions in parts of face
  const hasAnomalies = anomalies > 0;

  return {
    hasAnomalies,
    anomalyCount: anomalies,
    proportionScore: Math.max(0, 100 - anomalies * 25),
  };
}

/**
 * Detects micro-expression artifacts
 */
function detectMicroExpressions(attributes: FaceAttributes): {
  isSuspicious: boolean;
  assessment: string;
} {
  // Real micro-expressions: fleeting (< 0.5 seconds), subtle
  // GAN expressions: often "plastered" on or unnaturally stable

  // If expression intensity is moderate but lips slightly upturned (fake smile)
  const { expressionIntensity, mouthOpenness } = attributes;

  // Suspicious if: slight mouth upturning (fake smile) with neutral eyes
  const fakeSmikeIndicator = mouthOpenness > 10 && mouthOpenness < 30 && expressionIntensity < 40;

  let isSuspicious = fakeSmikeIndicator;
  let assessment = "expression seems genuine";

  if (fakeSmikeIndicator) {
    isSuspicious = true;
    assessment = "plastered smile with neutral eyes (fake expression marker)";
  }

  // If expression is completely frozen
  if (expressionIntensity < 5) {
    isSuspicious = true;
    assessment = "expression is completely frozen (unusual)";
  }

  return { isSuspicious, assessment };
}

/**
 * Helper: Calculate variance
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2)) / values.length;
  return Math.sqrt(variance);
}
