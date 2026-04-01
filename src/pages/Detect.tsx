import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeMedia, saveScan, ScanResult } from '@/lib/detection';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, FileVideo, FileAudio, X, Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

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
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const analyze = async () => {
    if (!file || !user) return;
    setAnalyzing(true);
    setProgress(5); // Start progress immediately

    // UI Progress simulation for neural network warming up
    const interval = setInterval(() => {
      setProgress(p => {
        if (p < 30) return p + 2; // Loading models
        if (p < 70) return p + 1; // Extracting facial landmarks
        if (p < 90) return p + 0.5; // Final biometric check
        return p;
      });
    }, 200);

    try {
      // Step 1: Execute the Forensic Logic from detection.ts
      // This now includes BlazeFace + MobileNet texture analysis
      const res = await analyzeMedia(file);
      
      // Step 2: Attach User ID and Persist to Local Storage
      res.userId = user.id;
      saveScan(res);
      
      // Step 3: Cleanup and Finalize UI
      clearInterval(interval);
      setProgress(100);
      
      // Small delay so user sees 100% progress before result switch
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Detect Deepfake</h1>
          <p className="text-muted-foreground mt-1">Upload media to analyze for manipulation</p>
        </div>

        {/* Upload zone */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`glass rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer text-center ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => !file && !analyzing && document.getElementById('file-input')?.click()}
              >
                <input id="file-input" type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                {file ? (
                  <div className="space-y-4">
                    {preview && (
                      <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-cover" />
                    )}
                    <div className="flex items-center justify-center gap-3">
                      <FileIcon className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">{file.name}</span>
                      {!analyzing && (
                        <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-heading font-bold text-foreground">Drop your file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse • Images, videos, audio up to 50MB</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              {analyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground font-medium">
                      {progress < 40 ? 'Loading Neural Models...' : 'Scanning Facial Landmarks...'}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 rounded-full" />
                </motion.div>
              )}

              {file && !analyzing && (
                <Button onClick={analyze} className="w-full mt-4 rounded-xl gradient-primary text-primary-foreground font-semibold h-11">
                  <Shield className="w-4 h-4 mr-2" /> Analyze Media
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
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

              {/* Suspicious regions */}
              {result.suspiciousRegions && result.suspiciousRegions.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-heading font-bold text-foreground mb-3">Detected Anomalies</h3>
                  <div className="space-y-2">
                    {result.suspiciousRegions.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-foreground font-medium">{r.label}</span>
                        <span className="text-muted-foreground ml-auto">Biometric Scan Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={reset} variant="outline" className="w-full rounded-xl h-11">
                Scan Another File
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
};

export default Detect;