'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  level: number; // 0-1
  isActive: boolean;
}

export function AudioWaveform({ level, isActive }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize bars
    const barCount = 50;
    if (barsRef.current.length === 0) {
      barsRef.current = new Array(barCount).fill(0);
    }

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const maxHeight = canvas.height * 0.8;

      // Update bars
      for (let i = 0; i < barCount; i++) {
        if (isActive) {
          // Target height based on level and position
          const targetHeight = level * maxHeight * (0.3 + Math.random() * 0.7);
          
          // Smooth animation
          barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3;
        } else {
          // Decay when not active
          barsRef.current[i] *= 0.9;
        }

        // Draw bar
        const height = Math.max(2, barsRef.current[i]);
        const x = i * barWidth + barWidth * 0.1;
        const y = (canvas.height - height) / 2;

        // Gradient based on height
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)'); // Purple
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)'); // Pink

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * 0.8, height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [level, isActive]);

  return (
    <div className="relative h-32 w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white/20 text-sm font-medium">
            Listening...
          </div>
        </div>
      )}
    </div>
  );
}