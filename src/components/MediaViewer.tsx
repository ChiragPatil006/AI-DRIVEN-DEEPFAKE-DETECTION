import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface SuspiciousRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface FrameAnalysis {
  frameTime: number;
  faceRegions: Array<{ x: number; y: number; w: number; h: number; confidence: number }>;
  isFake: boolean;
}

interface MediaViewerProps {
  fileType: 'image' | 'video';
  fileUrl: string;
  suspiciousRegions?: SuspiciousRegion[];
  frameAnalysis?: FrameAnalysis[];
  isFake: boolean;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  fileType,
  fileUrl,
  suspiciousRegions = [],
  frameAnalysis = [],
  isFake,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canvasScale, setCanvasScale] = useState(1);

  // Draw bounding boxes for image
  useEffect(() => {
    if (fileType === 'image' && canvasRef.current && suspiciousRegions.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Draw bounding boxes
        suspiciousRegions.forEach((region) => {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
          ctx.fillRect(region.x, region.y, region.w, region.h);
          ctx.strokeRect(region.x, region.y, region.w, region.h);

          // Draw label
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(region.label, region.x + 5, region.y - 5);
        });
      };
      img.src = fileUrl;
    }
  }, [fileType, fileUrl, suspiciousRegions]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (fileType === 'image') {
    return (
      <div className="glass rounded-2xl p-6 overflow-hidden">
        <div className="relative w-full bg-black/30 rounded-xl overflow-hidden">
          {suspiciousRegions.length > 0 ? (
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-96 object-contain mx-auto"
            />
          ) : (
            <img
              src={fileUrl}
              alt="Analyzed media"
              className="w-full h-auto max-h-96 object-contain mx-auto"
            />
          )}

          {/* Fake indicator overlay */}
          {isFake && suspiciousRegions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 bg-destructive/90 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Manipulation detected
            </motion.div>
          )}
        </div>

        {/* Regions legend */}
        {suspiciousRegions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Detected Anomalies
            </p>
            {suspiciousRegions.map((region, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <div className="w-3 h-3 rounded border-2 border-destructive" />
                <span className="text-foreground font-medium">{region.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Video player
  return (
    <div className="glass rounded-2xl p-6 overflow-hidden">
      <div className="relative w-full bg-black rounded-xl overflow-hidden group" ref={containerRef}>
        <video
          ref={videoRef}
          src={fileUrl}
          className="w-full h-auto max-h-96 object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTime);
            
            // Draw frame analysis overlay
            if (canvasRef.current && frameAnalysis.length > 0 && videoRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              const video = videoRef.current;
              
              if (ctx && video.readyState >= 2) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Clear canvas completely
                ctx.fillStyle = 'transparent';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Find frame closest to current time
                let closestFrame = frameAnalysis[0];
                let minDiff = Math.abs(frameAnalysis[0].frameTime - e.currentTime);
                
                for (let i = 1; i < frameAnalysis.length; i++) {
                  const diff = Math.abs(frameAnalysis[i].frameTime - e.currentTime);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestFrame = frameAnalysis[i];
                  }
                }
                
                // Draw face regions with confidence
                if (closestFrame && closestFrame.faceRegions.length > 0) {
                  closestFrame.faceRegions.forEach((region) => {
                    // Ensure confidence is between 0-100
                    const confidencePercent = Math.min(Math.max(region.confidence * 100, 0), 100);
                    
                    // Box color based on confidence
                    const isHighConfidence = confidencePercent > 70;
                    ctx.strokeStyle = isHighConfidence ? '#ef4444' : '#eab308';
                    ctx.lineWidth = 3;
                    ctx.fillStyle = isHighConfidence ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)';
                    
                    // Draw bounding box
                    ctx.fillRect(region.x, region.y, region.w, region.h);
                    ctx.strokeRect(region.x, region.y, region.w, region.h);
                    
                    // Draw confidence label with bold text
                    ctx.fillStyle = isHighConfidence ? '#ef4444' : '#eab308';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.fillText(`${confidencePercent.toFixed(1)}%`, region.x + 8, region.y - 10);
                  });
                }
              }
            }
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            if (canvasRef.current && containerRef.current) {
              const video = e.currentTarget;
              const rect = containerRef.current.getBoundingClientRect();
              const scale = rect.width / video.videoWidth;
              setCanvasScale(scale);
            }
          }}
        />

        {/* Confidence Canvas Overlay */}
        {frameAnalysis.length > 0 && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-contain"
            style={{
              display: 'block',
            }}
          />
        )}

        {/* Play/Pause overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Button
            size="lg"
            variant="ghost"
            className="rounded-full w-16 h-16 bg-primary/80 hover:bg-primary text-primary-foreground"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
        </motion.div>

        {/* Fake indicator */}
        {isFake && (frameAnalysis.length > 0 || suspiciousRegions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-4 bg-destructive/90 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Manipulation detected
          </motion.div>
        )}
      </div>

      {/* Video controls */}
      <div className="mt-4 space-y-2">
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden cursor-pointer">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            onClick={(e) => {
              if (videoRef.current && duration) {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (rect) {
                  const percent = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = percent * duration;
                }
              }
            }}
          />
        </div>

        {/* Time and controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Regions legend */}
        {suspiciousRegions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Detected Anomalies
            </p>
            {suspiciousRegions.map((region, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <div className="w-3 h-3 rounded border-2 border-destructive" />
                <span className="text-foreground font-medium">{region.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
