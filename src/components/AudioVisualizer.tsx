import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
}

export default function AudioVisualizer({ isActive, isSpeaking }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const draw = () => {
      // Clear with micro opacity for motion trails
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      if (isActive || isSpeaking) {
        // Draw multiple overlapping sine waves with different offsets and amplitudes
        const wavesCount = isSpeaking ? 4 : 3;
        
        for (let w = 0; w < wavesCount; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w === 0 
            ? "rgba(79, 70, 229, 0.8)" // Indigo accent
            : w === 1
            ? "rgba(34, 211, 238, 0.5)"  // Cyan Accent
            : "rgba(16, 185, 129, 0.45)"; // Emerald accent

          ctx.lineWidth = w === 0 ? 3 : 1.5;

          const wavelengthMod = 0.015 - w * 0.002;
          const amplitudeMod = isSpeaking 
            ? (22 - w * 4) + Math.sin(phase * 2) * 5
            : (14 - w * 3) + Math.sin(phase * 1.5) * 3;

          const speedMod = 0.12 + w * 0.03;

          for (let x = 0; x < width; x++) {
            const y = centerY + Math.sin(x * wavelengthMod + phase * speedMod) * amplitudeMod * Math.sin(x / width * Math.PI);
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        phase += 0.8;
      } else {
        // Draw a flat glowing idle line
        ctx.beginPath();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw soft pulse dots
        ctx.beginPath();
        ctx.arc(width / 2, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isSpeaking]);

  return (
    <div className="relative w-full h-16 flex items-center justify-center overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={360} 
        height={64} 
        className="max-w-full h-full rounded"
      />
    </div>
  );
}
