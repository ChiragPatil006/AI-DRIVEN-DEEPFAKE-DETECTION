/**
 * FACIAL BIOMETRICS & LANDMARK STABILITY MODEL
 * Detects inconsistencies in facial structure, landmarks, and biological constraints
 * Based on: Face swap/synthesis detection through geometric inconsistencies
 */

export interface BiometricsAnalysisResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    symmetryScore: number;
    proportionScore: number;
    landmarkStabilityScore: number;
    biologicalConsistencyScore: number;
  };
}

export interface FaceLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  nose: [number, number];
  leftMouth: [number, number];
  rightMouth: [number, number];
  [key: string]: [number, number];
}

/**
 * Analyzes facial landmarks for synthetic/swapped characteristics
 */
export const analyzeFacialBiometrics = (
  landmarks: FaceLandmarks,
  faceBox: { width: number; height: number }
): BiometricsAnalysisResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  // 1. FACIAL SYMMETRY ANALYSIS
  const symmetryMetrics = analyzeFacialSymmetry(landmarks);
  if (symmetryMetrics.asymmetryLevel > 0.18) {
    confidenceScore += 22;
    findings.push(
      `Unusual facial asymmetry detected (${Math.round(symmetryMetrics.asymmetryLevel * 100)}% deviation). Face-swapped faces often show misalignment in synthetic blending.`
    );
  }

  // 2. FACIAL PROPORTIONS ANALYSIS
  const proportions = analyzeFacialProportions(landmarks, faceBox);
  let proportionAnomalies = 0;
  if (proportions.eyeRatio < 0.28 || proportions.eyeRatio > 0.36) {
    proportionAnomalies++;
    findings.push(
      `Eye-to-face ratio is abnormal (${Math.round(proportions.eyeRatio * 100)}%). Normal humans: 28-36%.`
    );
  }
  if (proportions.mouthWidth > proportions.eyeDistance * 0.55) {
    proportionAnomalies++;
    findings.push(`Mouth-to-eye ratio violates human biometrics. This is a red flag for synthetic faces.`);
  }
  if (proportions.nosePosition < 0.42 || proportions.nosePosition > 0.58) {
    proportionAnomalies++;
    findings.push(`Nose position ${Math.round(proportions.nosePosition * 100)}% - outside typical human range (42-58%).`);
  }

  if (proportionAnomalies > 0) {
    confidenceScore += 25;
  }

  // 3. LANDMARK STABILITY (for multiple frames if available)
  const landmarkStability = calculateLandmarkAnchoring(landmarks);
  if (landmarkStability.hasInconsistencies) {
    confidenceScore += 18;
    findings.push(
      `Landmarks show ${landmarkStability.inconsistencyCount} instabilities. GANs struggle with consistent anatomical markers.`
    );
  }

  // 4. BIOLOGICAL CONSTRAINTS
  const biologicalCheck = validateBiologicalConstraints(landmarks);
  if (biologicalCheck.violations > 0) {
    confidenceScore += 20;
    findings.push(
      `${biologicalCheck.violations} biological constraint violations detected. Real human faces follow strict anatomical rules.`
    );
  }

  // 5. MICRO-EXPRESSION ARTIFACTS
  const microExpressions = detectMicroExpressionArtifacts(landmarks);
  if (microExpressions.hasSuspiciousPatterns) {
    confidenceScore += 15;
    findings.push(
      `Unnatural micro-expression patterns detected. Synthesized expressions lack human-like variability.`
    );
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 50,
    findings,
    details: {
      symmetryScore: symmetryMetrics.symmetryScore,
      proportionScore: proportions.overallScore,
      landmarkStabilityScore: landmarkStability.stabilityScore,
      biologicalConsistencyScore: biologicalCheck.consistencyScore,
    },
  };
};

/**
 * Analyzes facial symmetry along the vertical axis
 */
function analyzeFacialSymmetry(landmarks: FaceLandmarks): {
  symmetryScore: number;
  asymmetryLevel: number;
} {
  const leftEye = landmarks.leftEye;
  const rightEye = landmarks.rightEye;
  const nose = landmarks.nose;
  const leftMouth = landmarks.leftMouth;
  const rightMouth = landmarks.rightMouth;

  // Expected vertical center line (x-coordinate of nose)
  const centerX = nose[0];

  // Calculate distances from center for paired features
  const eyeSymmetryError =
    Math.abs(Math.abs(leftEye[0] - centerX) - Math.abs(rightEye[0] - centerX)) /
    Math.max(Math.abs(leftEye[0] - centerX), Math.abs(rightEye[0] - centerX));

  const mouthSymmetryError =
    Math.abs(Math.abs(leftMouth[0] - centerX) - Math.abs(rightMouth[0] - centerX)) /
    Math.max(Math.abs(leftMouth[0] - centerX), Math.abs(rightMouth[0] - centerX));

  const eyeHeightSymmetry = Math.abs(leftEye[1] - rightEye[1]) / Math.max(leftEye[1], rightEye[1]);

  const avgAsymmetry = (eyeSymmetryError + mouthSymmetryError + eyeHeightSymmetry) / 3;

  return {
    symmetryScore: 100 - Math.min(100, avgAsymmetry * 100),
    asymmetryLevel: avgAsymmetry,
  };
}

/**
 * Validates facial proportions against human biometric norms
 */
function analyzeFacialProportions(
  landmarks: FaceLandmarks,
  faceBox: { width: number; height: number }
): {
  eyeRatio: number;
  mouthWidth: number;
  eyeDistance: number;
  nosePosition: number;
  overallScore: number;
} {
  const leftEye = landmarks.leftEye;
  const rightEye = landmarks.rightEye;
  const nose = landmarks.nose;
  const leftMouth = landmarks.leftMouth;
  const rightMouth = landmarks.rightMouth;

  // Eye width as proportion of face
  const eyeDistance = Math.sqrt(Math.pow(rightEye[0] - leftEye[0], 2) + Math.pow(rightEye[1] - leftEye[1], 2));
  const eyeRatio = eyeDistance / faceBox.width;

  // Mouth width
  const mouthWidth = Math.sqrt(Math.pow(rightMouth[0] - leftMouth[0], 2) + Math.pow(rightMouth[1] - leftMouth[1], 2));

  // Nose vertical position (0 = top, 1 = bottom)
  const noseCenterY = nose[1];
  const faceTop = Math.min(leftEye[1], rightEye[1]);
  const faceBottom = Math.max(leftMouth[1], rightMouth[1]);
  const nosePosition = (noseCenterY - faceTop) / (faceBottom - faceTop);

  // Validate proportions
  let scoreAdjustment = 0;
  if (eyeRatio >= 0.28 && eyeRatio <= 0.36) scoreAdjustment += 25;
  if (nosePosition >= 0.42 && nosePosition <= 0.58) scoreAdjustment += 25;
  if (mouthWidth < eyeDistance * 0.55) scoreAdjustment += 25;

  return {
    eyeRatio,
    mouthWidth,
    eyeDistance,
    nosePosition,
    overallScore: scoreAdjustment,
  };
}

/**
 * Checks landmark stability and consistency
 */
function calculateLandmarkAnchoring(landmarks: FaceLandmarks): {
  stabilityScore: number;
  hasInconsistencies: boolean;
  inconsistencyCount: number;
} {
  const eyes = [landmarks.leftEye, landmarks.rightEye];
  const mouth = [landmarks.leftMouth, landmarks.rightMouth];

  let inconsistencies = 0;

  // Check if eyes are at similar y-coordinates (should be aligned)
  if (Math.abs(eyes[0][1] - eyes[1][1]) > eyes[0][0] * 0.15) {
    inconsistencies++;
  }

  // Check if mouth corners are at reasonable positions relative to eyes
  const eyeCenterY = (eyes[0][1] + eyes[1][1]) / 2;
  const mouthCenterY = (mouth[0][1] + mouth[1][1]) / 2;
  if (mouthCenterY < eyeCenterY) {
    inconsistencies += 2; // Mouth below eyes is natural
  }

  return {
    stabilityScore: 100 - inconsistencies * 15,
    hasInconsistencies: inconsistencies > 0,
    inconsistencyCount: inconsistencies,
  };
}

/**
 * Validates biological/anatomical constraints
 */
function validateBiologicalConstraints(landmarks: FaceLandmarks): {
  violations: number;
  consistencyScore: number;
} {
  let violations = 0;
  const leftEye = landmarks.leftEye;
  const rightEye = landmarks.rightEye;
  const nose = landmarks.nose;

  // Eyes should be roughly horizontal
  if (Math.abs(leftEye[1] - rightEye[1]) > Math.abs(leftEye[0] - rightEye[0]) * 0.3) {
    violations++;
  }

  // Nose should be between eyes horizontally
  if (nose[0] < leftEye[0] || nose[0] > rightEye[0]) {
    violations++;
  }

  // Eyes should be in upper face
  if (leftEye[1] < 0 || rightEye[1] < 0) {
    violations++;
  }

  // Nose should be below eyes
  if (nose[1] < Math.max(leftEye[1], rightEye[1])) {
    violations++;
  }

  return {
    violations,
    consistencyScore: 100 - violations * 20,
  };
}

/**
 * Detects suspicious micro-expression patterns
 */
function detectMicroExpressionArtifacts(landmarks: FaceLandmarks): {
  hasSuspiciousPatterns: boolean;
} {
  // GAN-generated faces often have unnaturally perfect or frozen expressions
  const leftMouth = landmarks.leftMouth;
  const rightMouth = landmarks.rightMouth;

  // Check for perfect symmetry (unnatural)
  const mouthSymmetry = Math.abs(
    Math.abs(leftMouth[0] - landmarks.nose[0]) - Math.abs(rightMouth[0] - landmarks.nose[0])
  );

  // Also check vertical mouth corners symmetry
  const verticalSymmetry = Math.abs(leftMouth[1] - rightMouth[1]);

  return {
    hasSuspiciousPatterns: mouthSymmetry < 0.5 && verticalSymmetry < 1,
  };
}
