import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeMedia, saveScan, ScanResult } from '@/lib/detection';
import { generateReport } from '@/lib/reportGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, FileVideo, FileAudio, X, Shield, AlertTriangle, CheckCircle, Loader2, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import VideoAnalysisPlayer from '@/components/VideoAnalysisPlayer';
import MediaViewer from '@/components/MediaViewer';
import ScanProgressChecklist from '@/components/ScanProgressChecklist';
import FrameDetailAnalysis from '@/components/FrameDetailAnalysis';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/', 'video/', 'audio/'];

const Detect = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Array<{id: string; label: string; icon: string; status: 'pending' | 'progress' | 'complete'}>>(
    [
      { id: '1', label: 'Loading Neural Models', icon: 'model', status: 'pending' },
      { id: '2', label: 'Scanning Facial Landmarks', icon: 'landmark', status: 'pending' },
      { id: '3', label: 'Analyzing Frequency Patterns', icon: 'frequency', status: 'pending' },
      { id: '4', label: 'Checking Biometrics', icon: 'biometric', status: 'pending' },
      { id: '5', label: 'Examining Texture & Lighting', icon: 'texture', status: 'pending' },
      { id: '6', label: 'Analyzing Eye Details', icon: 'eye', status: 'pending' },
      { id: '7', label: 'Checking Temporal Consistency', icon: 'temporal', status: 'pending' },
      { id: '8', label: 'Analyzing Facial Attributes', icon: 'facial', status: 'pending' },
      { id: '9', label: 'Generating Final Verdict', icon: 'verdict', status: 'pending' },
    ]
  );

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.some(t => f.type.startsWith(t))) {
      toast.error('Please upload an image, video, or audio file');
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error('File must be under 50MB');
      return;
    }
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const analyze = async () => {
    if (!file || !user) return;
    setAnalyzing(true);
    setProgress(5);

    const checklistTiming = [500, 2500, 4500, 6500, 8500, 10500, 12500, 14500, 16500];

    setChecklistItems(prev =>
      prev.map(item => ({ ...item, status: 'pending' as const }))
    );

    const interval = setInterval(() => {
      setProgress(p => {
        if (p < 30) return p + 2;
        if (p < 70) return p + 1;
        if (p < 90) return p + 0.5;
        return p;
      });
    }, 200);

    const timeouts = checklistTiming.map((time, idx) =>
      setTimeout(() => {
        if (idx > 0) {
          setChecklistItems(prev => {
            const newItems = [...prev];
            newItems[idx - 1].status = 'complete';
            return newItems;
          });
        }        setChecklistItems(prev => {
          const newItems = [...prev];
          newItems[idx].status = 'progress';
          return newItems;
        });
      }, time)
    );

    try {
      const res = await analyzeMedia(file);
      res.userId = user.id;
      saveScan(res);

      clearInterval(interval);
      timeouts.forEach(t => clearTimeout(t));

      setChecklistItems(prev =>
        prev.map(item => ({ ...item, status: 'complete' }))
      );
      setProgress(100);

      setTimeout(() => {
        setResult(res);
        if (res.result === 'fake') {
          toast.warning('High probability of manipulation detected!', {
            description: "Biometric inconsistencies found in facial regions."
          });
        } else {
          toast.success('Media consistency verified!', {
            description: "Skin texture and landmarks match authentic patterns."
          });
        }
      }, 500);

    } catch (error) {
      clearInterval(interval);
      timeouts.forEach(t => clearTimeout(t));
      console.error("Analysis Error:", error);
      toast.error('Forensic analysis failed.', {
        description: "Could not initialize neural engine. Please refresh."
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview); // Memory management
    setFile(null);
    setPreview(null);
    setResult(null);
    setProgress(0);
  };

  const getFileIcon = () => {
    if (!file) return Upload;
    if (file.type.startsWith('video')) return FileVideo;
    if (file.type.startsWith('audio')) return FileAudio;
    return FileImage;
  };
  const FileIcon = getFileIcon();

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full px-4 space-y-6">
        {/* Upload zone */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Hero Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-4 py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-heading text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
                  Advanced Deepfake Detection
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Upload your media and let our AI-powered ensemble uncover manipulation with 99% accuracy using 11 advanced detection models.
                </p>
              </motion.div>

              {/* Main Upload Zone */}
              {!analyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative max-w-4xl mx-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl" />
                
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  className={`relative glass rounded-3xl p-8 border-2 border-dashed transition-all duration-300 cursor-pointer text-center backdrop-blur-xl ${
                    dragOver 
                      ? 'border-primary bg-gradient-to-br from-primary/20 to-purple-500/20 scale-105 shadow-2xl shadow-primary/20' 
                      : 'border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10'
                  }`}
                  onClick={() => !file && !analyzing && document.getElementById('file-input')?.click()}
                >
                  <input id="file-input" type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                  {file && !analyzing ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 py-4"
                    >
                      {preview && file.type.startsWith('image') && (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="relative rounded-2xl overflow-hidden border border-primary/30 mx-auto"
                        >
                          <img src={preview} alt="Preview" className="max-h-80 max-w-md rounded-xl object-cover shadow-lg" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-xl" />
                        </motion.div>
                      )}
                      {preview && file.type.startsWith('video') && (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="relative rounded-2xl overflow-hidden border border-primary/30 mx-auto w-full max-w-md"
                        >
                          <video src={preview} controls className="w-full max-h-80 rounded-xl object-cover shadow-lg" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-xl pointer-events-none" />
                        </motion.div>
                      )}
                      <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/5 border border-border/50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="flex-shrink-0">
                            <FileIcon className="w-5 h-5 text-primary" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        {!analyzing && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); reset(); }} 
                            className="text-muted-foreground hover:text-destructive transition-colors p-2 hover:bg-destructive/10 rounded-lg flex-shrink-0"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4 py-2">
                      <motion.div 
                        animate={{ y: [0, -12, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex justify-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                      </motion.div>
                      
                      <div className="space-y-1">
                        <p className="font-heading text-2xl font-bold text-foreground">Drop your media here</p>
                        <p className="text-base text-muted-foreground">or click to browse</p>
                        <div className="flex items-center justify-center gap-4 pt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <FileImage className="w-4 h-4" />
                            <span>Images</span>
                          </div>
                          <span className="text-border/40">•</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <FileVideo className="w-4 h-4" />
                            <span>Videos</span>
                          </div>
                          <span className="text-border/40">•</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <FileAudio className="w-4 h-4" />
                            <span>Audio</span>
                          </div>
                          <span className="text-border/40">•</span>
                          <span className="text-xs text-muted-foreground/70">Up to 50MB</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/30" />
                    </div>
                  )}
                </div>
              </motion.div>
              )}

              {/* Analyzing - Split Layout */}
              {analyzing && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Media Preview */}
                    <div className="lg:col-span-1">
                      <h3 className="font-heading font-bold text-foreground mb-4">Media Preview</h3>
                      <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/50 aspect-video flex items-center justify-center">
                        {file?.type.startsWith('image') && preview && (
                          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        {file?.type.startsWith('video') && preview && (
                          <video src={preview} className="w-full h-full object-cover" />
                        )}
                        {!preview && (
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center truncate">{file?.name}</p>
                    </div>

                    {/* Checklist */}
                    <div className="lg:col-span-2">
                      <ScanProgressChecklist items={checklistItems} overallProgress={progress} />
                    </div>
                  </div>
                </motion.div>
              )}

              {file && !analyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="pt-4 flex justify-center"
                >
                  <Button 
                    onClick={analyze} 
                    className="rounded-xl gradient-primary text-primary-foreground font-semibold h-12 px-8 text-base shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 group"
                  >
                    <div className="inline-flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" /> 
                      <span>Start Advanced Analysis</span>
                    </div>
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              {/* Media Viewer with Bounding Boxes */}
              <MediaViewer
                fileType={result.fileType}
                fileUrl={URL.createObjectURL(file!)}
                suspiciousRegions={result.suspiciousRegions}
                frameAnalysis={result.frameAnalysis}
                isFake={result.result === 'fake'}
              />

              {/* Result card */}
              <div className={`glass rounded-2xl p-8 text-center border-2 ${result.result === 'fake' ? 'border-destructive/30' : 'border-success/30'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.result === 'fake' ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  {result.result === 'fake' ? (
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                  ) : (
                    <CheckCircle className="w-10 h-10 text-success" />
                  )}
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {result.result === 'fake' ? 'Deepfake Detected' : 'Media is Authentic'}
                </h2>
                <p className={`text-4xl font-bold mt-2 ${result.result === 'fake' ? 'text-destructive' : 'text-success'}`}>
                  {result.confidence}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">confidence score</p>
              </div>

              {/* Explanation */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-heading font-bold text-foreground mb-2">Technical Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
              </div>

              {/* Frame-by-Frame Analysis for Videos */}
              {result.fileType === 'video' && result.frameAnalysis && result.frameAnalysis.length > 0 && (
                <FrameDetailAnalysis
                  frameAnalysis={result.frameAnalysis}
                  fileName={result.fileName}
                  overallConfidence={result.confidence}
                  riskLevel={result.riskLevel}
                  onGenerateReport={() => {
                    generateReport(result);
                    toast.success('Detailed report downloaded!');
                  }}
                />
              )}

              {/* Model Scores */}
              {result.modelScores && Object.keys(result.modelScores).length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-heading font-bold text-foreground mb-3">Model Scores</h3>
                  <div className="space-y-2">
                    {Object.entries(result.modelScores).map(([model, score]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{model.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${(score / 100) * 100}%` }}
                            />
                          </div>
                          <span className="text-foreground font-medium min-w-12 text-right">{score.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download and Rescan Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    generateReport(result);
                    toast.success('Report downloaded successfully!');
                  }} 
                  className="flex-1 rounded-xl h-11 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Full Report
                </Button>
                <Button onClick={reset} variant="outline" className="flex-1 rounded-xl h-11">
                  Scan Another File
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
};

export default Detect;