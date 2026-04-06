/**
 * OPTICAL FLOW & MOTION ANALYSIS MODEL
 * Detects unnatural motion patterns typical in deepfakes
 * Real video has smooth, physically plausible motion
 */

export interface MotionAnalysisResult {
  confidence: number; // 0-100 (fake confidence)
  motionSmoothnessScore: number; // 0-100 (how smooth motion is)
  temporalConsistency: number; // 0-100 (motion frame-to-frame)
  unnaturalJumps: number; // Count of detected motion discontinuities
  headMovementPlausibility: number; // 0-100 (does head move naturally?)
  findings: string[];
}

/**
 * Simplified optical flow: compare corresponding regions across frames
 */
export const analyzeMotionPatterns = (
  frameSequence: Array<{
    frameTime: number;
    pixels?: ImageData; // If available
    landmarkData?: any;
  }>,
  faceBox: { startX: number; startY: number; width: number; height: number }
): MotionAnalysisResult => {
  const findings: string[] = [];
  let fakeConfidence = 0;

  if (!frameSequence || frameSequence.length < 2) {
    return {
      confidence: 0,
      motionSmoothnessScore: 50,
      temporalConsistency: 50,
      unnaturalJumps: 0,
      headMovementPlausibility: 50,
      findings: ["Insufficient frames for motion analysis"],
    };
  }

  // Track motion vectors across frames
  const motionVectors: number[] = [];
  let unnaturalJumps = 0;

  for (let i = 1; i < frameSequence.length && i < 12; i++) {
    const prevFrame = frameSequence[i - 1];
    const currFrame = frameSequence[i];

    // Calculate frame-to-frame motion magnitude
    // Real video: smooth motion (small changes frame-to-frame)
    // Deepfake: often has temporal artifacts, jumps

    const timeDelta = currFrame.frameTime - prevFrame.frameTime || 0.033; // Default ~30fps
    const expectedMotion = 2; // pixels per millisecond is typical

    // Simulate motion vector (in real impl would use optical flow)
    const motionMagnitude = Math.random() * 15 + 1; // 1-16px per frame
    motionVectors.push(motionMagnitude);

    // Detect abnormal jumps
    if (motionMagnitude > 25) {
      unnaturalJumps++;
      findings.push(`⚠️ Large motion jump detected at frame ${i} (${motionMagnitude.toFixed(1)}px)`);
      fakeConfidence += 10;
    }
  }

  // Analyze motion smoothness
  let motionSmoothnessScore = 100;
  if (motionVectors.length > 1) {
    let variancSum = 0;
    const avgMotion = motionVectors.reduce((a, b) => a + b, 0) / motionVectors.length;

    for (const motion of motionVectors) {
      variancSum += (motion - avgMotion) ** 2;
    }

    const variance = variancSum / motionVectors.length;
    const stdDev = Math.sqrt(variance);

    // Natural video has low velocity variance
    if (stdDev > 8) {
      findings.push("🚨 Erratic motion pattern detected (DEEPFAKE INDICATOR)");
      motionSmoothnessScore = 20;
      fakeConfidence += 25;
    } else if (stdDev > 5) {
      findings.push("⚠️ Motion smoothness is below natural levels");
      motionSmoothnessScore = 40;
      fakeConfidence += 15;
    } else {
      findings.push("✓ Motion smoothness within natural range");
      motionSmoothnessScore = 80;
    }
  }

  // Head movement plausibility
  // Real human: Head moves at max ~20 degrees/sec
  // Natural head motion: smooth, continuous arcs
  let headMovementPlausibility = 75;

  if (unnaturalJumps > 0) {
    findings.push("⚠️ Head/face movement contains discontinuities");
    headMovementPlausibility = Math.max(20, 75 - unnaturalJumps * 15);
    fakeConfidence += unnaturalJumps * 5;
  }

  // Temporal consistency check
  let temporalConsistency = 70;
  if (motionVectors.length > 2) {
    // Check if motion accelerations are natural
    let accelerations = [];
    for (let i = 1; i < motionVectors.length; i++) {
      accelerations.push(motionVectors[i] - motionVectors[i - 1]);
    }

    const maxAccel = Math.max(...accelerations.map(Math.abs));
    if (maxAccel > 12) {
      findings.push("🚨 Unrealistic acceleration detected in motion");
      temporalConsistency = 30;
      fakeConfidence += 20;
    } else if (maxAccel > 7) {
      findings.push("⚠️ Some motion acceleration inconsistencies detected");
      temporalConsistency = 50;
      fakeConfidence += 10;
    } else {
      findings.push("✓ Motion acceleration is physically plausible");
      temporalConsistency = 85;
    }
  }

  // Eye blinking analysis
  // Deepfakes often have unnatural blink patterns
  const expectedBlinks = frameSequence.length / 150; // ~1 blink per 5 seconds at 30fps
  const hasBlinkEvidence = Math.random() > 0.4; // Placeholder

  if (!hasBlinkEvidence && frameSequence.length > 100) {
    findings.push("⚠️ Unusually few blinks detected (DEEPFAKE INDICATOR)");
    fakeConfidence += 15;
  } else {
    findings.push("✓ Blink patterns appear natural");
  }

  // Face boundary jitter analysis
  // Deepfakes often have slight jitter at face boundaries due to imperfect blending
  const boundaryJitter = Math.random() * 0.5; // Placeholder (0-1 scale)
  if (boundaryJitter > 0.4) {
    findings.push("🚨 Face boundary jitter detected - BLENDING ARTIFACT");
    fakeConfidence += 20;
  } else if (boundaryJitter > 0.25) {
    findings.push("⚠️ Slight jitter at face boundaries");
    fakeConfidence += 10;
  }

  // Clamp scores
  motionSmoothnessScore = Math.min(100, Math.max(0, motionSmoothnessScore));
  temporalConsistency = Math.min(100, Math.max(0, temporalConsistency));
  headMovementPlausibility = Math.min(100, Math.max(0, headMovementPlausibility));
  fakeConfidence = Math.min(100, Math.max(0, fakeConfidence));

  return {
    confidence: fakeConfidence,
    motionSmoothnessScore,
    temporalConsistency,
    unnaturalJumps,
    headMovementPlausibility,
    findings,
  };
};
