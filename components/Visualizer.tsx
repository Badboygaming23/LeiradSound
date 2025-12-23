import React, { useRef, useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { FREQUENCY_BANDS } from '../types';

interface VisualizerProps {
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Map mouse position to closest frequency band (Mirrored Logic)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const center = width / 2;
    
    setHoverX(x);

    // Calculate approximate frequency at this X position using mirrored layout
    // Distance from center determines frequency (0 at center, Nyquist at edges)
    const distanceFromCenter = Math.abs(x - center);
    const normalizedPos = distanceFromCenter / center; // 0 to 1
    
    const sampleRate = audioService.getSampleRate();
    const nyquist = sampleRate / 2;
    // Map linearly or logarithmically? Visualizer is linear bins usually.
    const freqAtCursor = normalizedPos * nyquist;

    // Find closest band
    let closestBandIndex = -1;
    let minDiff = Infinity;

    FREQUENCY_BANDS.forEach((bandFreq, index) => {
        const diff = Math.abs(bandFreq - freqAtCursor);
        if (diff < minDiff) {
            minDiff = diff;
            closestBandIndex = index;
        }
    });

    if (closestBandIndex !== -1) {
        audioService.setHoverBoost(closestBandIndex);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    audioService.setHoverBoost(-1); // Reset
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioService.getAnalyser();
    
    // Configuration for the "Chunky" Look
    const BAR_COUNT = 64; // Fewer bars = thicker, punchier look

    const render = () => {
      // Setup canvas size
      // Ensure canvas internal resolution matches display size for sharpness
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
      }
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;

      ctx.clearRect(0, 0, width, height);

      if (!analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // --- 1. Beat Detection & Pulse Logic ---
      // Sum the first few bins (Sub-bass ~20-80Hz)
      let bassSum = 0;
      const bassBins = 10; 
      for (let i = 0; i < bassBins; i++) {
          bassSum += dataArray[i];
      }
      const bassAvg = bassSum / bassBins;
      const bassNormalized = bassAvg / 255; // 0.0 to 1.0

      // Apply physical pulse to container CSS
      if (containerRef.current) {
         // Scale slightly on beat (1.0 to 1.015) - subtle but felt
         const scale = 1 + (bassNormalized * 0.015);
         // Glow opacity pumps with bass
         const glowOpacity = 0.1 + (bassNormalized * 0.4);
         const borderColorAlpha = 0.2 + (bassNormalized * 0.4);
         
         containerRef.current.style.transform = `scale(${scale})`;
         containerRef.current.style.boxShadow = `0 0 ${20 + bassNormalized * 60}px rgba(0, 240, 255, ${glowOpacity})`;
         containerRef.current.style.borderColor = `rgba(0, 240, 255, ${borderColorAlpha})`;
      }

      // --- 2. Draw Background Pulse ---
      // Radial gradient that expands from center
      const pulseRadius = (height * 0.8) * (0.5 + (bassNormalized * 0.5));
      const bgGradient = ctx.createRadialGradient(centerX, height/2, 0, centerX, height/2, pulseRadius);
      bgGradient.addColorStop(0, `rgba(0, 240, 255, ${bassNormalized * 0.15})`);
      bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // --- 3. Render Mirrored Bars ---
      // We aggregate the 1024 bins into BAR_COUNT bars for the "blocky" look
      const binSize = Math.floor(bufferLength / BAR_COUNT); 
      const barWidth = (width / 2) / BAR_COUNT; // Width for one side

      for (let i = 0; i < BAR_COUNT; i++) {
        // Calculate average amplitude for this chunk
        let sum = 0;
        for (let j = 0; j < binSize; j++) {
            sum += dataArray[(i * binSize) + j];
        }
        const avg = sum / binSize;
        
        // Non-linear boost for visuals (makes highs visible even if low volume)
        // and bass punchier
        const boostedAvg = avg * (1 + (bassNormalized * 0.2)); 
        const percent = Math.min(boostedAvg / 255, 1);
        
        // Bar height with minimum
        const barHeight = Math.max(percent * height * 0.8, 4);
        
        // Color: Dynamic based on height/intensity
        // Lows = Blue/Cyan, Mids = Purple, Highs = Pink/Red
        const hue = 180 + (percent * 120); // 180(Cyan) -> 300(Pink)
        const lightness = 50 + (bassNormalized * 20); // Flash brighter on beat
        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        
        // Add Glow effect to bars
        ctx.shadowBlur = percent * 20;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;

        // Draw Left Side (Mirrored)
        // x moves from center to left
        const xLeft = centerX - ((i + 1) * barWidth) + 1;
        // Rounded caps top and bottom
        ctx.beginPath();
        ctx.roundRect(xLeft, (height - barHeight) / 2, barWidth - 2, barHeight, 4);
        ctx.fill();

        // Draw Right Side
        // x moves from center to right
        const xRight = centerX + (i * barWidth) + 1;
        ctx.beginPath();
        ctx.roundRect(xRight, (height - barHeight) / 2, barWidth - 2, barHeight, 4);
        ctx.fill();
        
        // Reset Shadow for next iteration (performance)
        ctx.shadowBlur = 0;
      }

      // --- 4. Interactive Hover UI ---
      if (hoverX !== null) {
          ctx.beginPath();
          ctx.moveTo(hoverX, 0);
          ctx.lineTo(hoverX, height);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Frequency Label
          const dist = Math.abs(hoverX - centerX);
          const norm = dist / centerX;
          const freq = Math.round(norm * (audioService.getSampleRate() / 2));
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px monospace';
          const label = `${freq >= 1000 ? (freq/1000).toFixed(1) + 'k' : freq}Hz`;
          ctx.fillText(label, hoverX + 8, height - 20);
          
          // Mirror cursor guide on other side for symmetry visual
          const mirrorX = centerX - (hoverX - centerX);
          ctx.beginPath();
          ctx.moveTo(mirrorX, 0);
          ctx.lineTo(mirrorX, height);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.stroke();
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, hoverX]);

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-72 bg-surface-900 rounded-2xl overflow-hidden border border-gray-800 relative cursor-crosshair group transition-transform duration-75 ease-out will-change-transform"
        style={{
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.1)' // Default glow
        }}
    >
       {/* Tech Grid Overlay */}
       <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
            style={{ 
                backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}>
       </div>
      
      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />
      
      {!isPlaying && (
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <div className="text-accent font-tech tracking-[0.2em] text-xl animate-pulse">SYSTEM READY</div>
            <div className="text-gray-600 font-mono text-xs mt-2">WAITING FOR AUDIO SIGNAL...</div>
         </div>
      )}
      
      {/* Tooltip hint */}
      <div className="absolute top-4 right-4 z-30 text-[10px] bg-black/80 border border-gray-700 text-gray-400 px-3 py-1.5 rounded-full font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-md">
        <span className="text-accent">●</span> INTERACTIVE FREQUENCY CONTROL
      </div>
    </div>
  );
};

export default Visualizer;