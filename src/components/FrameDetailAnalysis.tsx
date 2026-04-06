import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface FrameData {
  frameTime: number;
  faceRegions: Array<{ x: number; y: number; w: number; h: number; confidence: number }>;
  isFake: boolean;
  frameConfidence?: number;
  frameExplanation?: string;
  riskLevel?: 'REAL' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'DEFINITELY_FAKE';
  frameImageData?: string;
}

interface FrameDetailAnalysisProps {
  frameAnalysis?: FrameData[];
  fileName: string;
  overallConfidence: number;
  riskLevel: 'REAL' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'DEFINITELY_FAKE';
  onGenerateReport?: () => void;
}

export const FrameDetailAnalysis = ({
  frameAnalysis = [],
  fileName,
  overallConfidence,
  riskLevel,
  onGenerateReport,
}: FrameDetailAnalysisProps) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!frameAnalysis || frameAnalysis.length === 0) {
    return null;
  }

  const currentFrame = frameAnalysis[currentFrameIndex];
  const progress = ((currentFrameIndex + 1) / frameAnalysis.length) * 100;

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'DEFINITELY_FAKE':
        return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'LIKELY_FAKE':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      case 'SUSPICIOUS':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
      case 'REAL':
        return 'bg-green-500/10 border-green-500/30 text-green-600';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
    }
  };

  const getRiskIcon = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'DEFINITELY_FAKE':
      case 'LIKELY_FAKE':
        return <AlertTriangle className="w-4 h-4" />;
      case 'SUSPICIOUS':
        return <AlertCircle className="w-4 h-4" />;
      case 'REAL':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return '#6366f1';
    if (confidence > 60) return '#ef4444'; // Red for high fake confidence
    if (confidence > 40) return '#f59e0b'; // Orange for medium
    return '#10b981'; // Green for low (real)
  };

  const nextFrame = () => {
    setCurrentFrameIndex((prev) => (prev + 1) % frameAnalysis.length);
    setShowFullExplanation(false);
  };

  const prevFrame = () => {
    setCurrentFrameIndex((prev) => (prev - 1 + frameAnalysis.length) % frameAnalysis.length);
    setShowFullExplanation(false);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-3 space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-bold text-foreground text-sm">Frame Analysis</h3>
        </div>
        {onGenerateReport && (
          <Button
            onClick={onGenerateReport}
            className="rounded-xl gap-2"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        )}
      </div>

      {/* Frame Display */}
      <div className="relative bg-black/40 rounded-lg overflow-hidden border border-border/30 w-full max-w-2xl max-h-80 mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFrameIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative aspect-video flex items-center justify-center w-full h-full"
          >
            {currentFrame.frameImageData ? (
              <img
                src={currentFrame.frameImageData}
                alt={`Frame ${currentFrameIndex + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Frame image not available</div>
            )}

            {/* Confidence Overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-2 right-2 bg-black/80 rounded px-2 py-1 backdrop-blur-sm"
            >
              <div className="text-right">
                <p className="text-xs font-semibold text-white">
                  {currentFrame.frameConfidence?.toFixed(1)}%
                </p>
              </div>
            </motion.div>

            {/* Frame Number */}
            <div className="absolute bottom-2 left-2 bg-black/80 rounded px-2 py-0.5 backdrop-blur-sm text-xs text-white font-semibold">
              Frame {currentFrameIndex + 1}/{frameAnalysis.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confidence Score Visualization */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Confidence</span>
          <span className="text-xs font-bold" style={{ color: getConfidenceColor(currentFrame.frameConfidence) }}>
            {currentFrame.frameConfidence?.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currentFrame.frameConfidence || 0}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full transition-colors"
            style={{ backgroundColor: getConfidenceColor(currentFrame.frameConfidence) }}
          />
        </div>
      </div>

      {/* Risk Level Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${getRiskColor(currentFrame.riskLevel)}`}
      >
        <span className="w-3 h-3">{getRiskIcon(currentFrame.riskLevel)}</span>
        <span className="font-semibold capitalize">{currentFrame.riskLevel}</span>
      </motion.div>

      {/* Explanation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFrameIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-secondary/30 rounded p-2 border border-border/30 max-h-24 overflow-y-auto"
        >
          <p className="text-xs leading-relaxed text-foreground">
            {currentFrame.frameExplanation || 'No explanation available.'}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prevFrame}
          className="rounded h-8 w-8 p-0"
          disabled={frameAnalysis.length <= 1}
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>

        {/* Progress Bar with Timestamps */}
        <div className="flex-1 space-y-1">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentFrame.frameTime.toFixed(2)}s</span>
            <span>{currentFrameIndex + 1}/{frameAnalysis.length}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={nextFrame}
          className="rounded h-8 w-8 p-0"
          disabled={frameAnalysis.length <= 1}
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Avg Confidence</p>
          <p className="text-sm font-bold text-foreground mt-1">
            {(frameAnalysis.reduce((sum, f) => sum + (f.frameConfidence || 0), 0) / frameAnalysis.length).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Suspicious Frames</p>
          <p className="text-sm font-bold text-orange-600 mt-1">
            {frameAnalysis.filter(f => (f.frameConfidence || 0) > 40 && (f.frameConfidence || 0) <= 60).length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">High Risk Frames</p>
          <p className="text-sm font-bold text-red-600 mt-1">
            {frameAnalysis.filter(f => (f.frameConfidence || 0) > 60).length}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default FrameDetailAnalysis;
