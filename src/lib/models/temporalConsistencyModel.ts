/**
 * TEMPORAL CONSISTENCY MODEL
 * For videos: detects frame-to-frame consistency anomalies
 * Deepfakes often have jitter, flickering, or unnatural transitions between frames
 */

export interface TemporalConsistencyResult {
  confidence: number; // 0-100
  isFake: boolean;
  findings: string[];
  details: {
    frameConsistencyScore: number;
    landmarkStabilityScore: number;
    motionFlowScore: number;
    lightingFlickerScore: number;
  };
}

export interface FrameAnalysis {
  frameIndex: number;
  landmarks: Array<{ x: number; y: number }>;
  lightingProfile: number[];
  textureSignature: number[];
  timestamp: number;
}

/**
 * Analyzes temporal consistency across video frames
 */
export const analyzeTemporalConsistency = (
  frameSequence: FrameAnalysis[]
): TemporalConsistencyResult => {
  const findings: string[] = [];
  let confidenceScore = 0;

  if (frameSequence.length < 2) {
    return {
      confidence: 0,
      isFake: false,
      findings: [],
      details: {
        frameConsistencyScore: 0,
        landmarkStabilityScore: 0,
        motionFlowScore: 0,
        lightingFlickerScore: 0,
      },
    };
  }

  // 1. LANDMARK STABILITY ACROSS FRAMES
  const landmarkStability = analyzeMarkerStability(frameSequence);
  if (landmarkStability.hasAnomalies) {
    confidenceScore += 25;
    findings.push(
      `Facial landmark jitter detected. ${landmarkStability.anomalyCount} frame-to-frame jumps exceed natural limits. Deepfakes often show jerky landmark motion.`
    );
  }

  // 2. MOTION FLOW ANALYSIS
  const motionAnalysis = analyzeOpticalFlow(frameSequence);
  if (motionAnalysis.isUnnatural) {
    confidenceScore += 24;
    findings.push(
      `Motion pattern shows ${motionAnalysis.type}. Real faces have smooth, natural head and eye motion. This movement is ${motionAnalysis.assessment}.`
    );
  }

  // 3. LIGHTING CONSISTENCY ACROSS FRAMES
  const lightingConsistency = analyzeLightingFlicker(frameSequence);
  if (lightingConsistency.isInconsistent) {
    confidenceScore += 22;
    findings.push(
      `Lighting flickers unnaturally across ${lightingConsistency.flickerCount} frames. Real videos maintain consistent illumination. This suggests frame-by-frame synthesis.`
    );
  }

  // 4. TEXTURE CONTINUITY
  const textureFlow = analyzeTextureFlow(frameSequence);
  if (textureFlow.hasBreaks) {
    confidenceScore += 20;
    findings.push(
      `Skin texture shows ${textureFlow.breakCount} discontinuities between frames. Real skin maintains continuous texture; deepfakes often regenerate textures per frame.`
    );
  }

  // 5. BIOLOGICAL MOTION CONSTRAINTS
  const biologicalMotion = validateBiologicalMotion(frameSequence);
  if (biologicalMotion.violatesConstraints) {
    confidenceScore += 20;
    findings.push(
      `${biologicalMotion.violations} biological motion violations detected. Human faces follow physics constraints; synthesized motion often violates these.`
    );
  }

  // 6. BLINKING PATTERN ANALYSIS
  const blinkAnalysis = analyzeBlinkPattern(frameSequence);
  if (blinkAnalysis.isUnnatural) {
    confidenceScore += 15;
    findings.push(
      `Blink pattern is ${blinkAnalysis.assessment}. Real blinks last 100-400ms and occur naturally every 3-8 seconds. This pattern seems artificial.`
    );
  }

  return {
    confidence: Math.min(100, confidenceScore),
    isFake: confidenceScore > 55,
    findings,
    details: {
      frameConsistencyScore: landmarkStability.stabilityScore,
      landmarkStabilityScore: landmarkStability.stabilityScore,
      motionFlowScore: motionAnalysis.flowScore,
      lightingFlickerScore: lightingConsistency.consistencyScore,
    },
  };
};

/**
 * Analyzes landmark stability frame-to-frame
 */
function analyzeMarkerStability(frameSequence: FrameAnalysis[]): {
  hasAnomalies: boolean;
  anomalyCount: number;
  stabilityScore: number;
} {
  let totalDisplacement = 0;
  let anomalies = 0;

  for (let i = 1; i < frameSequence.length; i++) {
    const prevFrame = frameSequence[i - 1];
    const currFrame = frameSequence[i];

    // Compare landmarks
    for (let j = 0; j < Math.min(prevFrame.landmarks.length, currFrame.landmarks.length); j++) {
      const prev = prevFrame.landmarks[j];
      const curr = currFrame.landmarks[j];

      const displacement = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      totalDisplacement += displacement;

      // Real face: smooth motion, max ~10px per frame (30fps)
      // Deepfake: often jittery or large jumps
      if (displacement > 25) {
        anomalies++;
      }
    }
  }

  const avgDisplacement = totalDisplacement / (frameSequence.length - 1);
  const hasAnomalies = anomalies > frameSequence.length * 0.2; // >20% frames with jumps

  return {
    hasAnomalies,
    anomalyCount: anomalies,
    stabilityScore: Math.max(0, 100 - anomalies * 5),
  };
}

/**
 * Analyzes optical flow (motion vectors)
 */
function analyzeOpticalFlow(frameSequence: FrameAnalysis[]): {
  isUnnatural: boolean;
  flowScore: number;
  type: string;
  assessment: string;
} {
  if (frameSequence.length < 3) {
    return {
      isUnnatural: false,
      flowScore: 100,
      type: "insufficient frames",
      assessment: "natural",
    };
  }

  let flowConsistency = 0;
  const motionVectors: Array<{ dx: number; dy: number }> = [];

  // Calculate motion vectors between consecutive frames
  for (let i = 1; i < frameSequence.length; i++) {
    const prev = frameSequence[i - 1];
    const curr = frameSequence[i];

    // Average landmark displacement
    let sumDx = 0,
      sumDy = 0,
      count = 0;

    for (let j = 0; j < Math.min(prev.landmarks.length, curr.landmarks.length); j++) {
      sumDx += curr.landmarks[j].x - prev.landmarks[j].x;
      sumDy += curr.landmarks[j].y - prev.landmarks[j].y;
      count++;
    }

    if (count > 0) {
      motionVectors.push({ dx: sumDx / count, dy: sumDy / count });
    }
  }

  // Analyze motion vector smoothness
  for (let i = 1; i < motionVectors.length; i++) {
    const acceleration = Math.sqrt(
      Math.pow(motionVectors[i].dx - motionVectors[i - 1].dx, 2) +
        Math.pow(motionVectors[i].dy - motionVectors[i - 1].dy, 2)
    );

    // Real motion: smooth acceleration, <10px/frame^2
    // Deepfake: jittery, high acceleration
    if (acceleration < 5) flowConsistency++;
  }

  const smoothness = motionVectors.length > 0 ? flowConsistency / motionVectors.length : 1;
  const isUnnatural = smoothness < 0.6; // <60% smooth transitions

  return {
    isUnnatural,
    flowScore: smoothness * 100,
    type: isUnnatural ? "jerky motion" : "natural motion",
    assessment: isUnnatural ? "inconsistent with real human motion" : "natural",
  };
}

/**
 * Detects lighting flicker across frames
 */
function analyzeLightingFlicker(frameSequence: FrameAnalysis[]): {
  isInconsistent: boolean;
  consistencyScore: number;
  flickerCount: number;
} {
  let flickerCount = 0;
  let lightingVariance = 0;

  // Compare lighting profiles frame-to-frame
  for (let i = 1; i < frameSequence.length; i++) {
    const prevLighting = frameSequence[i - 1].lightingProfile;
    const currLighting = frameSequence[i].lightingProfile;

    if (prevLighting.length === 0 || currLighting.length === 0) continue;

    // Calculate difference in lighting
    let totalDiff = 0;
    for (let j = 0; j < Math.min(prevLighting.length, currLighting.length); j++) {
      totalDiff += Math.abs(currLighting[j] - prevLighting[j]);
    }

    const avgDiff = totalDiff / Math.min(prevLighting.length, currLighting.length);

    // Real videos: smooth lighting, <5 units difference per frame
    // Deepfakes: flickering, >15 units difference
    if (avgDiff > 15) {
      flickerCount++;
    }
    lightingVariance += avgDiff;
  }

  const avgVariance = lightingVariance / (frameSequence.length - 1);
  const isInconsistent = flickerCount > frameSequence.length * 0.15; // >15% frames with flicker

  return {
    isInconsistent,
    consistencyScore: Math.max(0, 100 - flickerCount * 10),
    flickerCount,
  };
}

/**
 * Analyzes texture flow continuity
 */
function analyzeTextureFlow(frameSequence: FrameAnalysis[]): {
  hasBreaks: boolean;
  breakCount: number;
  continuityScore: number;
} {
  let breaks = 0;

  // Compare texture signatures frame-to-frame
  for (let i = 1; i < frameSequence.length; i++) {
    const prevTexture = frameSequence[i - 1].textureSignature;
    const currTexture = frameSequence[i].textureSignature;

    if (prevTexture.length === 0 || currTexture.length === 0) continue;

    // Calculate texture similarity
    let similarity = 0;
    for (let j = 0; j < Math.min(prevTexture.length, currTexture.length); j++) {
      if (Math.abs(currTexture[j] - prevTexture[j]) < 10) {
        similarity++;
      }
    }

    const similarityRatio = similarity / Math.min(prevTexture.length, currTexture.length);

    // Real skin: high similarity (>80%), continuous texture
    // Deepfake: lower similarity, jumps in texture
    if (similarityRatio < 0.7) {
      breaks++;
    }
  }

  const hasBreaks = breaks > frameSequence.length * 0.2; // >20% frames with breaks

  return {
    hasBreaks,
    breakCount: breaks,
    continuityScore: Math.max(0, 100 - breaks * 8),
  };
}

/**
 * Validates biological motion constraints
 */
function validateBiologicalMotion(frameSequence: FrameAnalysis[]): {
  violatesConstraints: boolean;
  violations: number;
} {
  let violations = 0;

  // Check if motion follows biological constraints
  for (let i = 1; i < frameSequence.length; i++) {
    const prev = frameSequence[i - 1];
    const curr = frameSequence[i];

    // Example: Head rotation shouldn't exceed ~45° per frame
    const maxRotation = 5; // pixels of rotation

    // Average landmark movement
    let totalMovement = 0;
    for (let j = 0; j < Math.min(prev.landmarks.length, curr.landmarks.length); j++) {
      totalMovement += Math.sqrt(
        Math.pow(curr.landmarks[j].x - prev.landmarks[j].x, 2) +
          Math.pow(curr.landmarks[j].y - prev.landmarks[j].y, 2)
      );
    }

    const avgMovement = totalMovement / Math.max(1, Math.min(prev.landmarks.length, curr.landmarks.length));

    // Unnatural if movement is too large or too small
    if (avgMovement > 50 || (avgMovement > 1 && i > 1 && frameSequence[i - 2])) {
      violations++;
    }
  }

  return {
    violatesConstraints: violations > 0,
    violations,
  };
}

/**
 * Analyzes blinking patterns
 */
function analyzeBlinkPattern(frameSequence: FrameAnalysis[]): {
  isUnnatural: boolean;
  assessment: string;
} {
  // In a real video at 30fps, eyes are open for ~600ms = ~18 frames
  // Blinks occur every ~3-8 seconds naturally

  // Detect "closed eye" frames (low eye area brightness)
  const closedFrames: number[] = [];

  for (let i = 0; i < frameSequence.length; i++) {
    const frame = frameSequence[i];
    const avgBrightness = frame.lightingProfile.reduce((a, b) => a + b, 0) / frame.lightingProfile.length;

    // If eye area is very dark, likely closed
    if (avgBrightness < 60) {
      closedFrames.push(i);
    }
  }

  // Analyze blink patterns
  let isUnnatural = false;
  let assessment = "natural";

  if (closedFrames.length === 0) {
    // No blinks detected - suspicious in longer videos
    if (frameSequence.length > 150) {
      // > 5 seconds at 30fps
      isUnnatural = true;
      assessment = "no blinks detected in extended period";
    }
  } else {
    // Check blink duration and frequency
    const blinkIntervals: number[] = [];
    for (let i = 1; i < closedFrames.length; i++) {
      if (closedFrames[i] - closedFrames[i - 1] > 5) {
        // Gap between blinks
        blinkIntervals.push(closedFrames[i] - closedFrames[i - 1]);
      }
    }

    // Real blinks: 3-8 second intervals (90-240 frames at 30fps)
    const unnaturalIntervals = blinkIntervals.filter((i) => i < 90 || i > 240).length;
    if (unnaturalIntervals > blinkIntervals.length * 0.3) {
      isUnnatural = true;
      assessment = "unnatural blink frequency";
    }
  }

  return { isUnnatural, assessment };
}
