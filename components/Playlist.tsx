import React, { useState } from 'react';
import { PlaylistTrack } from '../types';
import { Music, X, BarChart2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import Tooltip from './Tooltip';

interface PlaylistProps {
  tracks: PlaylistTrack[];
  currentIndex: number;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onMoveTrack?: (fromIndex: number, toIndex: number) => void;
  isPlaying: boolean;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, currentIndex, onPlay, onRemove, onReorder, onMoveTrack, isPlaying }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image if we wanted custom ghosts, but default is fine for now
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Optional: could clear dragOverIndex here, but it flickers if not careful. 
    // We rely on Drop or DragEnd to clear.
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && onMoveTrack) {
        onMoveTrack(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-surface-card/80 backdrop-blur-xl rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-lg h-auto">
      
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
         <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Music size={14} className="text-accent" />
            Play Queue
          </h3>
         <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-gray-500">{tracks.length} tracks</span>
      </div>

      <div className="overflow-y-auto p-3 space-y-1 custom-scrollbar max-h-[320px]">
        {tracks.length === 0 ? (
          <div className="h-[100px] flex flex-col items-center justify-center text-gray-600 gap-3 opacity-50">
            <Music size={40} strokeWidth={1} />
            <p className="text-sm font-medium">Your queue is empty</p>
            <p className="text-xs">Drag & drop or use "Import File"</p>
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isActive = idx === currentIndex;
            const isDragged = idx === draggedIndex;
            const isDragOver = idx === dragOverIndex;

            return (
              <div 
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border cursor-grab active:cursor-grabbing ${
                  isActive 
                  ? 'bg-white/5 border-accent/20' 
                  : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                } ${
                    isDragged ? 'opacity-40 scale-95' : 'opacity-100'
                } ${
                    isDragOver ? 'border-accent/50 bg-accent/5 translate-y-1 shadow-lg z-10' : ''
                }`}
              >
                {/* Drag Grip / Number */}
                <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-400 cursor-grab"
                >
                    <div className="hidden group-hover:block">
                        <GripVertical size={16} />
                    </div>
                    <div className={`group-hover:hidden ${isActive ? 'text-accent' : ''}`}>
                         {isActive && isPlaying ? (
                            <BarChart2 size={16} className="animate-pulse" />
                         ) : (
                            <span className="font-mono text-xs font-medium">{idx + 1}</span>
                         )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center" onClick={() => onPlay(idx)}>
                     <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {track.name}
                     </span>
                     {isActive && <span className="text-[9px] text-accent uppercase tracking-wider font-bold">Now Playing</span>}
                </div>

                {/* Actions (Slide in on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                        className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Playlist;