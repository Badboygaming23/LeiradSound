import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Plus, Disc3, Zap, Globe, Sparkles, Music2 } from 'lucide-react';
import { PlaylistTrack, AudioPreset } from '../types';
import Tooltip from './Tooltip';

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  isLoading: boolean;
  loadingProgress?: number;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  currentTrack?: PlaylistTrack;
  currentPreset: AudioPreset;
  bassBoost: boolean;
  spatialAudio: boolean;
  onToggleBass: () => void;
  onToggleSpatial: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onPlayPause,
  onUpload,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isLoading,
  loadingProgress = 0,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  currentTrack,
  currentPreset,
  bassBoost,
  spatialAudio,
  onToggleBass,
  onToggleSpatial
}) => {
  return (
    <div className="bg-surface-card/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
        
      {/* Background Ambience */}
      <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-50 transition-all duration-1000 ${isPlaying ? 'opacity-100 shadow-[0_0_20px_#00f0ff]' : ''}`}></div>

      {/* Top Row: Track & Tools */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-4 w-full md:w-1/3 min-w-[200px]">
            <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition-all duration-500 overflow-hidden ${isPlaying ? 'bg-black border border-accent shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'bg-surface-800 border border-white/5'}`}>
                {currentTrack ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-50 z-0"></div>
                ) : null}
                
                <div className="relative z-10">
                    {isPlaying ? (
                            <div className="flex gap-1 items-end h-5">
                            <span className="w-1 bg-accent animate-[bounce_1s_infinite] h-3 shadow-[0_0_5px_#00f0ff]"></span>
                            <span className="w-1 bg-accent animate-[bounce_1.2s_infinite] h-5 shadow-[0_0_5px_#00f0ff]"></span>
                            <span className="w-1 bg-accent animate-[bounce_0.8s_infinite] h-4 shadow-[0_0_5px_#00f0ff]"></span>
                            </div>
                    ) : (
                            <Music2 size={20} className="text-gray-600" />
                    )}
                </div>
            </div>
            
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="w-full overflow-hidden mask-linear-fade">
                    {currentTrack ? (
                    <div className="flex w-max animate-marquee">
                        <h3 className="text-white font-bold text-lg tracking-tight whitespace-nowrap px-4">{currentTrack.name}</h3>
                        <h3 className="text-white font-bold text-lg tracking-tight whitespace-nowrap px-4">{currentTrack.name}</h3>
                        <h3 className="text-white font-bold text-lg tracking-tight whitespace-nowrap px-4">{currentTrack.name}</h3>
                        <h3 className="text-white font-bold text-lg tracking-tight whitespace-nowrap px-4">{currentTrack.name}</h3>
                    </div>
                    ) : (
                    <h3 className="text-gray-500 font-medium text-lg whitespace-nowrap">
                        Select a track to start
                    </h3>
                    )}
                </div>
                {currentTrack && (
                    <div className="flex items-center gap-2 mt-0.5">
                         <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 font-mono border border-white/5">
                            MP3
                         </span>
                         <span className="text-xs text-accent font-medium tracking-wide">
                            {currentPreset === AudioPreset.FLAT ? 'Reference Audio' : `${currentPreset.replace('_', ' ')} Mode`}
                         </span>
                    </div>
                )}
            </div>
        </div>

        {/* 2. Enhancers (Center/Right on Desktop) - User Friendly Large Buttons */}
        <div className="flex items-center gap-3">
             <button 
                onClick={onToggleBass}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm border ${
                    bassBoost 
                    ? 'bg-accent text-black border-accent shadow-[0_0_20px_rgba(0,240,255,0.3)]' 
                    : 'bg-surface-800 border-white/5 text-gray-400 hover:bg-surface-700 hover:text-white'
                }`}
            >
                <Zap size={16} className={bassBoost ? "fill-black" : "fill-none"} />
                <span>Bass Boost</span>
                {bassBoost && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span></span>}
            </button>

            <button 
                onClick={onToggleSpatial}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm border ${
                    spatialAudio 
                    ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]' 
                    : 'bg-surface-800 border-white/5 text-gray-400 hover:bg-surface-700 hover:text-white'
                }`}
            >
                <Globe size={16} />
                <span>Spatial 3D</span>
            </button>
            
             <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block"></div>
             
             {/* Volume */}
             <div className="flex items-center gap-2 group/volume bg-surface-800 p-2 rounded-lg border border-white/5">
                <button onClick={() => onVolumeChange(volume === 0 ? 0.5 : 0)} className="text-gray-400 hover:text-white">
                    {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className="relative w-20 h-1 bg-gray-700 rounded-full cursor-pointer">
                    <div className="absolute h-full bg-gray-400 group-hover/volume:bg-accent rounded-full transition-all" style={{ width: `${volume * 100}%` }}></div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => onVolumeChange(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
             </div>
        </div>
      </div>

      {/* Middle: Scrubber - Big and Easy */}
      <div className="w-full flex items-center gap-4 group/scrubber">
            <span className="text-xs font-mono text-gray-500 w-10 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 h-2 bg-surface-800 rounded-full cursor-pointer">
                {/* Background Track */}
                <div className="absolute inset-0 rounded-full bg-surface-800 overflow-hidden">
                     {/* Buffered/Loading hint could go here */}
                </div>
                
                {/* Progress */}
                <div 
                    className="absolute h-full bg-gradient-to-r from-accent to-white rounded-full pointer-events-none transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(0,240,255,0.4)]" 
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
                
                {/* Handle (Visible on hover) */}
                <div 
                    className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/scrubber:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
                ></div>

                {/* Input */}
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer py-2 -my-2" // Larger hit area
                    disabled={!duration}
                />
            </div>
            <span className="text-xs font-mono text-gray-500 w-10">{formatTime(duration)}</span>
      </div>

      {/* Bottom: Main Transport Controls */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <Tooltip content="Upload Music">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Plus size={16} />
                    <span>Import File</span>
                    <input type="file" accept="audio/*" multiple onChange={onUpload} className="hidden" />
                </label>
            </Tooltip>

            <div className="flex items-center gap-6 absolute left-1/2 top-4 pt-4 transform -translate-x-1/2">
                <button onClick={onPrev} disabled={!hasPrev} className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors p-2">
                    <SkipBack size={24} />
                </button>
                
                <button
                    onClick={onPlayPause}
                    disabled={isLoading || !duration}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isLoading || !duration 
                        ? 'bg-surface-800 text-gray-600' 
                        : 'bg-white text-black hover:scale-105 hover:bg-accent shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(0,240,255,0.6)]'
                    }`}
                >
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                    ) : isPlaying ? (
                        <Pause size={24} fill="currentColor" />
                    ) : (
                        <Play size={24} fill="currentColor" className="ml-1" />
                    )}
                </button>

                <button onClick={onNext} disabled={!hasNext} className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors p-2">
                    <SkipForward size={24} />
                </button>
            </div>

            <div className="w-[100px]"></div> {/* Spacer for balance */}
      </div>

    </div>
  );
};

export default Controls;