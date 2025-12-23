import React, { useMemo } from 'react';
import { AudioPreset, FREQUENCY_BANDS } from '../types';
import { Sliders, Zap, Speaker, Activity, Headphones, Info, Globe, RotateCcw } from 'lucide-react';
import Tooltip from './Tooltip';

interface EQPanelProps {
  currentPreset: AudioPreset;
  onPresetChange: (preset: AudioPreset) => void;
  onBandChange: (index: number, val: number) => void;
  bandValues: number[]; 
}

const PRESETS = [
  { 
    id: AudioPreset.BASS_BOOST, 
    label: 'JBL Punch', 
    icon: Speaker, 
    desc: 'Deep Bass',
    color: 'text-yellow-400'
  },
  { 
    id: AudioPreset.SPATIAL, 
    label: 'Spatial 3D', 
    icon: Globe, 
    desc: 'Immersive',
    color: 'text-purple-400'
  },
  { 
    id: AudioPreset.CINEMA, 
    label: 'Cinema', 
    icon: Zap, 
    desc: 'Movie Feel',
    color: 'text-red-400'
  },
  { 
    id: AudioPreset.ELECTRONIC, 
    label: 'EDM', 
    icon: Headphones, 
    desc: 'Club Mix',
    color: 'text-blue-400'
  },
  { 
    id: AudioPreset.VOCAL, 
    label: 'Vocal', 
    icon: Activity, 
    desc: 'Clear Voice',
    color: 'text-green-400'
  },
  { 
    id: AudioPreset.FLAT, 
    label: 'Flat', 
    icon: Sliders, 
    desc: 'Original',
    color: 'text-gray-400'
  },
];

// Simple spline interpolation for smooth curve
const getPathData = (values: number[]) => {
    if (values.length === 0) return "";
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = ((12 - v) / 24) * 100;
        return { x, y };
    });
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
};

const getAreaPath = (values: number[]) => {
    const linePath = getPathData(values);
    return `${linePath} L 100,100 L 0,100 Z`;
};

const EQPanel: React.FC<EQPanelProps> = ({ currentPreset, onPresetChange, onBandChange, bandValues }) => {
  
  const curvePath = useMemo(() => getPathData(bandValues), [bandValues]);
  const areaPath = useMemo(() => getAreaPath(bandValues), [bandValues]);

  return (
    <div className="flex flex-col gap-6 h-full">
      
      {/* 1. Quick Presets Section */}
      <div className="bg-surface-card/80 rounded-3xl border border-white/5 p-6 shadow-lg">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            Quick Modes
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PRESETS.map((p) => {
                  const Icon = p.icon;
                  const isActive = currentPreset === p.id;
                  return (
                      <button
                          key={p.id}
                          onClick={() => onPresetChange(p.id)}
                          className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 group overflow-hidden ${
                              isActive 
                              ? 'bg-white/10 border-accent/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]' 
                              : 'bg-surface-800 border-transparent hover:bg-surface-700 hover:border-white/10'
                          }`}
                      >
                          <div className={`mb-2 p-2 rounded-full bg-black/20 ${isActive ? 'text-accent' : p.color} transition-transform group-hover:scale-110`}>
                              <Icon size={20} />
                          </div>
                          <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{p.label}</span>
                          <span className="text-[10px] text-gray-500 font-medium">{p.desc}</span>
                          
                          {isActive && <div className="absolute inset-0 border-2 border-accent/20 rounded-2xl pointer-events-none"></div>}
                      </button>
                  )
              })}
          </div>
      </div>

      {/* 2. Manual EQ Section */}
      <div className="flex-1 bg-surface-card/80 rounded-3xl border border-white/5 p-6 shadow-lg flex flex-col">
        <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3">
                 <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Sliders size={14} className="text-accent" />
                    Pro Equalizer
                </h3>
             </div>
             
             <button 
                onClick={() => onPresetChange(AudioPreset.FLAT)}
                className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md"
             >
                 <RotateCcw size={10} /> RESET
             </button>
        </div>
        
        {/* Visualizer Background Container */}
        <div className="relative flex-1 min-h-[160px] w-full">
            
            {/* Background Graph */}
            <div className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <defs>
                         <linearGradient id="eqGradient" x1="0" x2="0" y1="0" y2="1">
                             <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4"/>
                             <stop offset="100%" stopColor="#00f0ff" stopOpacity="0"/>
                         </linearGradient>
                     </defs>
                     <path d={areaPath} fill="url(#eqGradient)" />
                     <path d={curvePath} fill="none" stroke="#00f0ff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                 </svg>
            </div>
            
            {/* 0dB Line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 border-t border-dashed border-gray-600 pointer-events-none"></div>

            {/* Sliders Layer */}
            <div className="absolute inset-0 flex justify-between items-end px-2 pb-2 z-10">
                {FREQUENCY_BANDS.map((freq, idx) => {
                    const val = bandValues[idx] || 0;
                    const percent = ((val + 12) / 24) * 100;
                    
                    return (
                    <div key={freq} className="flex flex-col items-center h-full w-full group relative pt-4">
                        
                        {/* Interactive Range Container */}
                        <div className="relative flex-1 w-full flex justify-center group-hover:scale-x-110 transition-transform">
                             {/* Rail */}
                             <div className="w-1 h-full bg-surface-900 rounded-full overflow-hidden relative">
                                  {/* Active Fill */}
                                  <div 
                                    className="absolute w-full bg-gray-600 group-hover:bg-accent transition-colors duration-150"
                                    style={{ 
                                        height: `${Math.abs(val / 24) * 100}%`,
                                        bottom: val >= 0 ? '50%' : 'auto',
                                        top: val < 0 ? '50%' : 'auto'
                                    }}
                                  ></div>
                             </div>
                             
                             {/* Thumb (Visual Only) */}
                             <div 
                                className="absolute w-4 h-4 bg-surface-card border-2 border-white/20 rounded-full shadow-lg pointer-events-none group-hover:border-accent transition-colors"
                                style={{ bottom: `calc(${percent}% - 8px)` }}
                             ></div>

                             {/* Actual Input */}
                             <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={val} 
                                onChange={(e) => onBandChange(idx, Number(e.target.value))}
                                className="absolute h-full w-8 -rotate-90 opacity-0 cursor-ns-resize z-20"
                            />
                        </div>
                        
                        {/* Label */}
                        <div className="mt-2 text-center">
                             <div className={`text-[9px] font-mono mb-0.5 ${val !== 0 ? 'text-accent' : 'text-transparent group-hover:text-gray-400'}`}>
                                 {val > 0 ? '+' : ''}{val}
                             </div>
                             <span className="text-[9px] text-gray-500 font-bold">
                                {freq >= 1000 ? `${freq/1000}k` : freq}
                             </span>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>
    </div>
  );
};

export default EQPanel;