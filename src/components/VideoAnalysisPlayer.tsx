import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface FakeRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

interface FrameData {
  frameTime: number;
  faceRegions: FakeRegion[];
  isFake: boolean;
}

interface VideoAnalysisPlayerProps {
  videoUrl: string;
  frameAnalysis?: FrameData[];
  width?: number;
  height?: number;
}

export const VideoAnalysisPlayer = ({
  videoUrl,
  frameAnalysis,
  width = 640,
  height = 480,
}: VideoAnalysisPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Draw overlays on the canvas based on current video time
  const drawOverlays = () => {
    if (!videoRef.current || !canvasRef.current || !frameAnalysis) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find the closest frame analysis for current video time
    const currentTime = video.currentTime;
    let closestFrame: FrameData | null = null;
    let minTimeDiff = Infinity;

    for (const frame of frameAnalysis) {
      const timeDiff = Math.abs(frame.frameTime - currentTime);
      if (timeDiff < minTimeDiff && timeDiff < 0.5) { // Within 500ms
        minTimeDiff = timeDiff;
        closestFrame = frame;
      }
    }

    // Draw detected regions
    if (closestFrame && closestFrame.faceRegions.length > 0) {
      closestFrame.faceRegions.forEach((region) => {
        const { x, y, w, h, confidence } = region;

        // Determine color based on confidence
        const color = confidence > 60 ? '#ef4444' : confidence > 40 ? '#f59e0b' : '#10b981';
        const lineWidth = confidence > 60 ? 4 : 2;

        // Draw rectangle
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(x, y, w, h);

        // Draw corner markers
        const cornerSize = 15;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        // Top-left
        ctx.fillRect(x, y, cornerSize, 2);
        ctx.fillRect(x, y, 2, cornerSize);
        // Top-right
        ctx.fillRect(x + w - cornerSize, y, cornerSize, 2);
        ctx.fillRect(x + w - 2, y, 2, cornerSize);
        // Bottom-left
        ctx.fillRect(x, y + h - 2, cornerSize, 2);
        ctx.fillRect(x, y + h - cornerSize, 2, cornerSize);
        // Bottom-right
        ctx.fillRect(x + w - cornerSize, y + h - 2, cornerSize, 2);
        ctx.fillRect(x + w - 2, y + h - cornerSize, 2, cornerSize);

        // Draw confidence badge - DYNAMIC per frame
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`${Math.round(confidence)}%`, x + 8, y + 28);

        // Draw status label
        const label = confidence > 60 ? 'FAKE' : confidence > 40 ? 'SUSPICIOUS' : 'REAL';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(label, x + 8, y + 48);

        // Draw a small timestamp indicator
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`${closestFrame.frameTime.toFixed(2)}s`, x + 8, y - 5);
      });
    }

    // Draw global frame confidence in corner if frame found
    if (closestFrame) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(canvas.width - 150, 10, 140, 50);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Current Frame Confidence', canvas.width - 140, 27);
      
      const confidence = closestFrame.faceRegions[0]?.confidence || 0;
      const color = confidence > 60 ? '#ef4444' : confidence > 40 ? '#f59e0b' : '#10b981';
      ctx.fillStyle = color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${Math.round(confidence)}%`, canvas.width - 130, 50);
    }

    ctx.globalAlpha = 1;
  };

  // Animation loop for continuous overlay updates
  const animate = () => {
    drawOverlays();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      drawOverlays(); // Draw one more time when paused
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [frameAnalysis]);

  // Initial draw
  useEffect(() => {
    drawOverlays();
  }, [frameAnalysis]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-black" style={{ width, height }}>
      {/* Canvas overlay for detection boxes */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={width}
        height={height}
      />

      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onLoadedMetadata={() => {
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current?.videoWidth || width;
            canvasRef.current.height = videoRef.current?.videoHeight || height;
            drawOverlays();
          }
        }}
      />

      {/* Controls overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
        <button
          onClick={handlePlayPause}
          className="p-4 rounded-full bg-primary/80 hover:bg-primary text-white transition-all"
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </button>
      </div>

      {/* Time and stats info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs">
        <div className="flex justify-between items-center">
          <span>Deepfake Detection: {frameAnalysis ? frameAnalysis.length : 0} frames analyzed</span>
          {videoRef.current && (
            <span>
              {Math.floor(videoRef.current.currentTime)}s / {Math.floor(videoRef.current.duration || 0)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysisPlayer;
