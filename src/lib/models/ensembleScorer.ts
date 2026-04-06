/**
 * ENSEMBLE SCORING SYSTEM (V3 - ULTRA PRECISE)
 * Combines 9+ independent models with aggressive weighted voting
 * HIGHLY SENSITIVE deepfake detection optimized for maximum accuracy
 */

import { analyzeFrequencyDomain, FrequencyAnalysisResult } from './frequencyAnalysisModel';
import { analyzeFacialBiometrics, BiometricsAnalysisResult, FaceLandmarks } from './biometricsModel';
import { analyzeTextureLighting, TextureLightingResult } from './textureLightingModel';
import { analyzeEyeDetails, EyeAnalysisResult } from './eyeDetailModel';
import { analyzeTemporalConsistency, TemporalConsistencyResult, FrameAnalysis } from './temporalConsistencyModel';
import { analyzeFacialAttributes, FacialAttributeResult, FaceAttributes } from './facialAttributeModel';
import { analyzeColorChannels, ColorChannelAnalysisResult } from './colorChannelModel';
import { analyzeMotionPatterns, MotionAnalysisResult } from './opticalFlowModel';
import { analyzeFaceBoundary, FaceBoundaryAnalysisResult } from './faceBoundaryModel';

export interface ExtendedEnsembleResult {
  overallConfidence: number; // 0-100, fake confidence
  isFake: boolean;
  fakeConfidence: number; // 0-100
  realConfidence: number; // 0-100
  votes: Record<string, number>;
  modelAgreement: number; // 0-100 (how much models agree)
  detailedFindings: Record<string, any>;
  consolidatedFindings: string[];
  riskLevel: 'REAL' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'DEFINITELY_FAKE';
  recommendation: string;
}

/**
 * Master ensemble function: runs up to 6 models for maximum accuracy
 */
export const runExtendedEnsembleAnalysis = (
  imageData: ImageData,
  landmarks: FaceLandmarks,
  faceBox: { startX: number; startY: number; width: number; height: number },
  eyeRegions?: Array<{ centerX: number; centerY: number; radius: number }>,
  frameSequence?: FrameAnalysis[],
  faceAttributes?: FaceAttributes
): ExtendedEnsembleResult => {
  // Run base three models (always run)
  const frequencyResult = analyzeFrequencyDomain(imageData, {
    startX: faceBox.startX,
    startY: faceBox.startY,
    width: faceBox.width,
    height: faceBox.height,
  });

  const biometricsResult = analyzeFacialBiometrics(landmarks, {
    width: faceBox.width,
    height: faceBox.height,
  });

  const textureLightingResult = analyzeTextureLighting(imageData, {
    startX: faceBox.startX,
    startY: faceBox.startY,
    width: faceBox.width,
    height: faceBox.height,
  });

  // Initialize votes object
  const votes: Record<string, number> = {
    frequencyModel: frequencyResult.confidence,
    biometricsModel: biometricsResult.confidence,
    textureLightingModel: textureLightingResult.confidence,
  };

  // Run additional models if data available
  let eyeResult: EyeAnalysisResult | null = null;
  let temporalResult: TemporalConsistencyResult | null = null;
  let attributeResult: FacialAttributeResult | null = null;

  if (eyeRegions && eyeRegions.length > 0) {
    eyeResult = analyzeEyeDetails(imageData, eyeRegions);
    votes.eyeDetailModel = eyeResult.confidence;
  }

  if (frameSequence && frameSequence.length > 1) {
    temporalResult = analyzeTemporalConsistency(frameSequence);
    votes.temporalConsistency = temporalResult.confidence;
  }

  if (faceAttributes) {
    attributeResult = analyzeFacialAttributes(faceAttributes, imageData, faceBox);
    votes.facialAttributeModel = attributeResult.confidence;
  }

  // Calculate weighted ensemble score - AGGRESSIVE WEIGHTING
  const baseWeights = {
    frequency: 0.18,
    biometrics: 0.22,
    textureLighting: 0.18,
  };

  let weightedScore =
    votes.frequencyModel * baseWeights.frequency +
    votes.biometricsModel * baseWeights.biometrics +
    votes.textureLightingModel * baseWeights.textureLighting;

  // Additional models with HIGH weight
  if (eyeResult) {
    weightedScore += eyeResult.confidence * 0.22; // Eyes are VERY discriminative
  }

  if (attributeResult) {
    weightedScore += attributeResult.confidence * 0.12; // Facial attributes
  }

  if (temporalResult) {
    weightedScore += temporalResult.confidence * 0.08; // Temporal consistency
  }

  // Normalize to 0-100 range - values are already percentages
  const totalWeight = baseWeights.frequency + baseWeights.biometrics + baseWeights.textureLighting +
    (eyeResult ? 0.22 : 0) +
    (attributeResult ? 0.12 : 0) +
    (temporalResult ? 0.08 : 0);

  weightedScore = (weightedScore / totalWeight); // Already 0-100, just normalize weights
  weightedScore = Math.min(100, Math.max(0, weightedScore)); // Clamp to 0-100

  // **MODERATE FAKE DETECTION BOOST** - reduced from aggressive 40% to 20%
  const fakeVotes = Object.values(votes).filter((v) => v > 55).length;
  const totalVotes = Object.keys(votes).length;

  // Require at least 3 models to suggest fake before boosting (was 1+)
  if (fakeVotes >= 3) {
    const boostFactor = 1 + (fakeVotes / totalVotes) * 0.2; // 20% max boost (down from 40%)
    weightedScore = Math.min(100, weightedScore * boostFactor);
  }

  // Calculate model agreement
  const allResults = [frequencyResult, biometricsResult, textureLightingResult];
  if (eyeResult) allResults.push(eyeResult as any);
  if (attributeResult) allResults.push(attributeResult as any);
  if (temporalResult) allResults.push(temporalResult as any);

  const modelAgreement = calculateModelAgreementV2(allResults);

  // Consolidate findings
  const consolidatedFindings = consolidateAllFindings(
    frequencyResult,
    biometricsResult,
    textureLightingResult,
    eyeResult,
    attributeResult,
    temporalResult
  );

  // Determine risk level - AGGRESSIVE THRESHOLDS
  const riskLevel = determineRiskLevelV2(weightedScore, modelAgreement);

  // Calculate confidence scores
  const fakeConfidence = Math.round(weightedScore);
  const realConfidence = 100 - fakeConfidence;

  // Generate recommendation
  const recommendation = generateRecommendationV2(riskLevel, fakeConfidence, modelAgreement);

  const detailedFindings: Record<string, any> = {
    model1: frequencyResult,
    model2: biometricsResult,
    model3: textureLightingResult,
  };

  if (eyeResult) detailedFindings.model4 = eyeResult;
  if (temporalResult) detailedFindings.model5 = temporalResult;
  if (attributeResult) detailedFindings.model6 = attributeResult;

  return {
    overallConfidence: fakeConfidence,
    isFake: fakeConfidence > 65, // Requires >65% confidence to mark as fake (reduced false positives)
    fakeConfidence,
    realConfidence,
    votes,
    modelAgreement,
    detailedFindings,
    consolidatedFindings,
    riskLevel,
    recommendation,
  };
};

/**
 * Calculate model agreement for multiple models
 */
function calculateModelAgreementV2(results: any[]): number {
  const fakeVotes = results.filter((r) => r.isFake).length;
  return (fakeVotes / results.length) * 100;
}

/**
 * Consolidates findings from all models
 */
function consolidateAllFindings(
  freqResult: FrequencyAnalysisResult,
  bioResult: BiometricsAnalysisResult,
  texResult: TextureLightingResult,
  eyeResult?: EyeAnalysisResult | null,
  attributeResult?: FacialAttributeResult | null,
  temporalResult?: TemporalConsistencyResult | null
): string[] {
  const allFindings: string[] = [];

  // Add all findings
  allFindings.push(...freqResult.findings);
  allFindings.push(...bioResult.findings);
  allFindings.push(...texResult.findings);
  if (eyeResult) allFindings.push(...eyeResult.findings);
  if (attributeResult) allFindings.push(...attributeResult.findings);
  if (temporalResult) allFindings.push(...temporalResult.findings);

  // Deduplicate
  const unique = deduplicateFindings(allFindings);

  // Return top 7 findings
  return unique.slice(0, 7);
}

/**
 * Remove duplicate findings
 */
function deduplicateFindings(findings: string[]): string[] {
  const unique: string[] = [];

  for (const finding of findings) {
    const isDuplicate = unique.some((uf) => stringSimilarity(finding, uf) > 0.65);
    if (!isDuplicate) {
      unique.push(finding);
    }
  }

  return unique;
}

/**
 * String similarity (Levenshtein)
 */
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance
 */
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}

/**
 * AGGRESSIVE risk level determination
 */
function determineRiskLevelV2(
  confidence: number,
  modelAgreement: number
): 'REAL' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'DEFINITELY_FAKE' {
  // Lower thresholds for detecting fakes (more aggressive)
  if (confidence < 30) {
    return 'REAL';
  } else if (confidence < 50) {
    return 'SUSPICIOUS';
  } else if (confidence < 75) {
    return 'LIKELY_FAKE';
  } else {
    return 'DEFINITELY_FAKE';
  }
}

/**
 * Generate recommendation
 */
function generateRecommendationV2(
  riskLevel: string,
  fakeConfidence: number,
  modelAgreement: number
): string {
  const recommendations: Record<string, string> = {
    REAL: `✅ AUTHENTIC - ${fakeConfidence}% fake confidence. This media appears genuinely real. All detection models show no synthetic indicators.`,
    SUSPICIOUS: `⚠️ SUSPICIOUS - ${fakeConfidence}% fake confidence. Mixed signals detected. Some models suggest potential manipulation. Manual expert review recommended.`,
    LIKELY_FAKE: `🚨 LIKELY DEEPFAKE - ${fakeConfidence}% fake confidence. Strong synthesis indicators detected. ${Math.round(modelAgreement)}% of models agree this is manipulated. HIGH confidence this is fake.`,
    DEFINITELY_FAKE: `✘ CONFIRMED DEEPFAKE - ${fakeConfidence}% fake confidence. EXTREMELY HIGH confidence this is AI-generated or face-swapped. ${Math.round(modelAgreement)}% model agreement. DO NOT TRUST.`,
  };

  return recommendations[riskLevel] || `Confidence: ${fakeConfidence}%`;
}

/**
 * Generate detailed report
 */
export const generateDetailedReport = (result: ExtendedEnsembleResult): string => {
  let report = `╔════════════════════════════════════════╗\n`;
  report += `║  ADVANCED DEEPFAKE DETECTION REPORT    ║\n`;
  report += `╚════════════════════════════════════════╝\n\n`;

  report += `VERDICT: ${result.riskLevel}\n`;
  report += `Fake Confidence: ${result.fakeConfidence}% | Real Confidence: ${result.realConfidence}%\n`;
  report += `Model Agreement: ${Math.round(result.modelAgreement)}%\n\n`;

  report += `╭─────────────────────────────────────────╮\n`;
  report += `│ KEY FINDINGS                            │\n`;
  report += `╰─────────────────────────────────────────╯\n`;

  result.consolidatedFindings.forEach((finding, i) => {
    report += `${i + 1}. ${finding}\n`;
  });

  report += `\n╭─────────────────────────────────────────╮\n`;
  report += `│ MODEL BREAKDOWN                         │\n`;
  report += `╰─────────────────────────────────────────╯\n\n`;

  const findingKeys = Object.keys(result.detailedFindings);
  const modelNames = [
    'Frequency & Artifacts',
    'Facial Biometrics',
    'Texture & Lighting',
    'Eye Details',
    'Temporal Consistency',
    'Facial Attributes',
  ];

  findingKeys.forEach((key, idx) => {
    const finding = result.detailedFindings[key];
    if (finding && finding.confidence !== undefined) {
      report += `Model ${idx + 1}: ${modelNames[idx]}\n`;
      report += `├─ Confidence: ${Math.round(finding.confidence)}%\n`;
      report += `├─ Verdict: ${finding.isFake ? '🚨 FAKE' : '✅ REAL'}\n`;
      report += `└─ Findings: ${finding.findings.length} indicators\n\n`;
    }
  });

  report += `╭─────────────────────────────────────────╮\n`;
  report += `│ RECOMMENDATION                          │\n`;
  report += `╰─────────────────────────────────────────╯\n`;
  report += `${result.recommendation}\n`;

  return report;
};

// Backward compatibility
export type EnsembleResult = ExtendedEnsembleResult;
export const runEnsembleAnalysis = runExtendedEnsembleAnalysis;
