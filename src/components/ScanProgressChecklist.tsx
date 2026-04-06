import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Braces, Fingerprint, Sparkles, Eye, Activity, Smile, ShieldCheck, Database, Radar, Layers, Cpu } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'progress' | 'complete';
}

interface ScanProgressChecklistProps {
  items: ChecklistItem[];
  overallProgress: number;
}

const ScanProgressChecklist: React.FC<ScanProgressChecklistProps> = ({ items, overallProgress }) => {
  const completeCount = items.filter(i => i.status === 'complete').length;
  const inProgressIndex = items.findIndex(i => i.status === 'progress');

  const getIcon = (icon: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      model: <Cpu className="w-4 h-4" />,
      landmark: <Radar className="w-4 h-4" />,
      frequency: <Layers className="w-4 h-4" />,
      biometric: <Fingerprint className="w-4 h-4" />,
      texture: <Sparkles className="w-4 h-4" />,
      eye: <Eye className="w-4 h-4" />,
      temporal: <Activity className="w-4 h-4" />,
      facial: <Smile className="w-4 h-4" />,
      verdict: <ShieldCheck className="w-4 h-4" />,
    };
    return iconMap[icon] || <Database className="w-4 h-4" />;
  };

  return (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-foreground">Analysis Progress</h3>
          <span className="text-sm font-semibold text-primary">{overallProgress}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completeCount} complete</span>
          {items.some(i => i.status === 'progress') && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary animate-pulse" /> Currently scanning
            </span>
          )}
        </div>
      </div>

      {/* Animated Pills Container - Fixed Height with Scroll */}
      <div className="relative h-48 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-border/50 overflow-hidden flex flex-col justify-end p-4">
        {/* Pills stacked vertically with hidden scrollbar */}
        <div className="relative w-full flex flex-col gap-3 justify-end overflow-y-auto max-h-full hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const isActive = item.status === 'progress';
              const isComplete = item.status === 'complete';

              if (!isComplete && !isActive) return null; // Only show active and complete

              return (
                <motion.div
                  key={item.id}
                  initial={{ y: 60, opacity: 0, scale: 0.8 }}
                  animate={{
                    y: 0,
                    opacity: isActive ? 1 : 0.4,
                    scale: 1,
                  }}
                  exit={{
                    y: -120,
                    opacity: 0,
                    scale: 0.8,
                    transition: { duration: 0.8 },
                  }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`flex items-center gap-2 px-2 py-2.5 rounded-full text-xs font-medium w-60 mx-auto transition-all justify-center flex-shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-success/20 text-success'
                  }`}
                >
                  {isActive ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>
                        {getIcon(item.icon)}
                      </motion.div>
                      <span>{item.label}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{item.label}</span>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Fade overlay at top - prevents pills from showing above */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background via-background/70 to-transparent pointer-events-none" />
      </div>
      </div>
    </>
  );
};

export default ScanProgressChecklist;

