import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from './services/audioService';
import { AudioState, AudioPreset, PlaylistTrack, FREQUENCY_BANDS } from './types';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import EQPanel from './components/EQPanel';
import Playlist from './components/Playlist';
import { Waves, Settings2, Github } from 'lucide-react';

const MOCK_TRACKS: PlaylistTrack[] = [
  {
    id: 'demo-1',
    name: 'Ava Max - Million Dollar Baby',
    file: 'https://defhdpdtclecmlsnqcvz.supabase.co/storage/v1/object/public/default_avatar/music/Ava%20Max%20-%20Million%20Dollar%20Baby%20(Official%20Video).mp3'
  },
  {
    id: 'demo-2',
    name: 'Abraham Mateo, Ana Mena - Quiero Decirte',
    file: 'https://defhdpdtclecmlsnqcvz.supabase.co/storage/v1/object/public/default_avatar/music/Abraham%20Mateo,%20Ana%20Mena%20-%20Quiero%20Decirte%20(Official%20Video).mp3'
  },
  {
    id: 'demo-3',
    name: 'Britney Spears - Baby One More Time (Classical)',
    file: 'https://defhdpdtclecmlsnqcvz.supabase.co/storage/v1/object/public/default_avatar/music/Baby%20One%20more%20time-%20Britney%20Spears%20(Classical%20Version%20by%20this%20isnt%20real).mp3'
  }
];

function App() {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    currentPreset: AudioPreset.FLAT,
    playlist: MOCK_TRACKS,
    currentTrackIndex: -1,
    isLoading: false,
    loadingProgress: 0,
    bassBoost: false,
    spatialAudio: false
  });

  const [bandValues, setBandValues] = useState<number[]>(new Array(FREQUENCY_BANDS.length).fill(0));
  const progressInterval = useRef<number | null>(null);

  // --- Playback Logic ---

  const playTrack = async (index: number) => {
    const track = state.playlist[index];
    if (!track) return;

    // Resetting state for new track
    setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        loadingProgress: 0,
        currentTrackIndex: index, 
        isPlaying: false, 
        currentTime: 0 // Reset visual time immediately
    }));
    
    try {
      // Decode audio data with progress callback
      const duration = await audioService.loadFile(track.file, (percent) => {
          setState(prev => ({ ...prev, loadingProgress: percent }));
      });
      
      // CRITICAL FIX: Explicitly play from 0.0s to ensure we don't resume from previous track's timestamp
      audioService.play(0);

      // Re-apply Vibe Settings to the new audio context/nodes
      audioService.toggleBassBoost(state.bassBoost);
      audioService.toggleSpatial(state.spatialAudio);
      audioService.applyPreset(state.currentPreset);
      
      setState(prev => ({ 
        ...prev, 
        duration, 
        isLoading: false, 
        loadingProgress: 100,
        currentTime: 0,
        isPlaying: true // Set to true immediately after explicit play
      }));

    } catch (error) {
        console.error("Error loading track:", error);
        setState(prev => ({ ...prev, isLoading: false, loadingProgress: 0 }));
    }
  };

  const handleNext = () => {
    if (state.currentTrackIndex < state.playlist.length - 1) {
      playTrack(state.currentTrackIndex + 1);
    }
  };

  const handlePrev = () => {
    // If more than 3 seconds in, restart track. Otherwise go to prev.
    if (state.currentTime > 3) {
      handleSeek(0);
    } else if (state.currentTrackIndex > 0) {
      playTrack(state.currentTrackIndex - 1);
    }
  };

  const startProgressLoop = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = window.setInterval(() => {
      if (!state.isPlaying) return;
      
      const time = audioService.getCurrentOffset();
      
      // Check for end of track
      if (time >= state.duration && state.duration > 0) {
        // Auto-advance logic
        if (state.currentTrackIndex < state.playlist.length - 1) {
           handleNext();
        } else {
           // End of playlist
           audioService.pause();
           handleSeek(0);
           setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
        }
      } else {
        setState(prev => ({ ...prev, currentTime: Math.min(time, prev.duration) }));
      }
    }, 100);
  }, [state.isPlaying, state.duration, state.currentTrackIndex, state.playlist.length]);

  useEffect(() => {
    if (state.isPlaying) {
      startProgressLoop();
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  }, [state.isPlaying, startProgressLoop]);


  // --- Event Handlers ---

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Create set of existing file names to check for duplicates
    // Fix: check track.name directly as file could be string now
    const existingFileNames = new Set(state.playlist.map(track => track.name));
    
    const newTracks: PlaylistTrack[] = [];

    Array.from(files).forEach((file: File) => {
        // Skip duplicate files
        if (!existingFileNames.has(file.name)) {
            newTracks.push({
                id: Math.random().toString(36).substring(2, 9),
                file,
                name: file.name.replace(/\.[^/.]+$/, "") // Remove extension for cleaner look
            });
        }
    });

    // If all uploaded files were duplicates, reset input and return
    if (newTracks.length === 0) {
        e.target.value = '';
        return;
    }

    setState(prev => {
      const isFirstLoad = prev.playlist.length === 0;
      const updatedPlaylist = [...prev.playlist, ...newTracks];
      return { 
        ...prev, 
        playlist: updatedPlaylist,
        currentTrackIndex: isFirstLoad ? 0 : prev.currentTrackIndex
      };
    });
    
    // Auto-play first uploaded track if playlist was empty
    if (state.playlist.length === 0 && newTracks.length > 0) {
        const firstTrack = newTracks[0];
        try {
            setState(prev => ({ ...prev, isLoading: true, loadingProgress: 0 }));
            const duration = await audioService.loadFile(firstTrack.file, (percent) => {
                setState(prev => ({ ...prev, loadingProgress: percent }));
            });
            
            // Explicitly play from 0
            audioService.play(0);
            
            setState(prev => ({ 
                ...prev, 
                duration, 
                isLoading: false, 
                loadingProgress: 100,
                currentTime: 0,
                currentTrackIndex: 0,
                isPlaying: true
            }));
        } catch (e) {
            console.error(e);
            setState(prev => ({ ...prev, isLoading: false, loadingProgress: 0 }));
        }
    }

    // Reset input value so the same file can be selected again if needed (e.g. after removing it)
    e.target.value = '';
  };

  const handleRemoveTrack = (index: number) => {
    setState(prev => {
        const newPlaylist = [...prev.playlist];
        newPlaylist.splice(index, 1);
        
        // Adjust current index if needed
        let newIndex = prev.currentTrackIndex;
        if (index < prev.currentTrackIndex) {
            newIndex -= 1;
        } else if (index === prev.currentTrackIndex) {
            audioService.stop();
            return {
                ...prev,
                playlist: newPlaylist,
                currentTrackIndex: -1,
                isPlaying: false,
                currentTime: 0,
                duration: 0
            }
        }
        
        return {
            ...prev,
            playlist: newPlaylist,
            currentTrackIndex: newIndex
        };
    });
  };

  const handleReorder = (index: number, direction: 'up' | 'down') => {
      setState(prev => {
          const newPlaylist = [...prev.playlist];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          
          // Boundary checks
          if (targetIndex < 0 || targetIndex >= newPlaylist.length) return prev;
          
          // Swap tracks
          [newPlaylist[index], newPlaylist[targetIndex]] = [newPlaylist[targetIndex], newPlaylist[index]];
          
          // Smartly update currentTrackIndex so the playing song doesn't change
          let newCurrentIndex = prev.currentTrackIndex;
          if (prev.currentTrackIndex === index) {
              newCurrentIndex = targetIndex;
          } else if (prev.currentTrackIndex === targetIndex) {
              newCurrentIndex = index;
          }
          
          return {
              ...prev,
              playlist: newPlaylist,
              currentTrackIndex: newCurrentIndex
          };
      });
  };

  // Drag and Drop Handler
  const handleMoveTrack = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setState(prev => {
        const newPlaylist = [...prev.playlist];
        const [movedTrack] = newPlaylist.splice(fromIndex, 1);
        newPlaylist.splice(toIndex, 0, movedTrack);

        // Update currentTrackIndex to follow the moving song or stay put
        let newCurrentIndex = prev.currentTrackIndex;
        if (prev.currentTrackIndex === fromIndex) {
            // The playing song moved
            newCurrentIndex = toIndex;
        } else if (prev.currentTrackIndex > fromIndex && prev.currentTrackIndex <= toIndex) {
            // Song moved from above playing song to below it -> playing index shifts up
            newCurrentIndex -= 1;
        } else if (prev.currentTrackIndex < fromIndex && prev.currentTrackIndex >= toIndex) {
            // Song moved from below playing song to above it -> playing index shifts down
            newCurrentIndex += 1;
        }

        return {
            ...prev,
            playlist: newPlaylist,
            currentTrackIndex: newCurrentIndex
        };
    });
  };

  const handlePlayPause = (forcePlay: boolean = false) => {
    if (forcePlay || !state.isPlaying) {
      audioService.play(state.currentTime);
      setState(prev => ({ ...prev, isPlaying: true }));
    } else {
      audioService.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const handleSeek = (time: number) => {
    audioService.seek(time);
    setState(prev => ({ ...prev, currentTime: time }));
  };

  const handleVolume = (val: number) => {
    audioService.setVolume(val);
    setState(prev => ({ ...prev, volume: val }));
  };

  const handlePresetChange = (preset: AudioPreset) => {
    audioService.applyPreset(preset);
    setBandValues(audioService.getGainsForPreset(preset));
    setState(prev => ({ ...prev, currentPreset: preset }));
  };

  const handleManualEQ = (index: number, val: number) => {
    audioService.setBandGain(index, val);
    const newBands = [...bandValues];
    newBands[index] = val;
    setBandValues(newBands);
  };
  
  // Vibe Handlers
  const toggleBassBoost = () => {
      const newVal = !state.bassBoost;
      audioService.toggleBassBoost(newVal);
      setState(prev => ({ ...prev, bassBoost: newVal }));
  };

  const toggleSpatial = () => {
      const newVal = !state.spatialAudio;
      audioService.toggleSpatial(newVal);
      setState(prev => ({ ...prev, spatialAudio: newVal }));
  };

  const currentTrack = state.playlist[state.currentTrackIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-accent selection:text-black flex flex-col">
      {/* Background Mesh Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-white/10">
              <Waves className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-tech text-2xl font-bold tracking-wider text-white">
                SONIC<span className="text-accent">PULSE</span>
              </h1>
              <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase font-medium">Professional Audio Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* <button className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Settings2 className="text-gray-400 hover:text-white" size={20} /></button> */}
          </div>
        </header>

        {/* 1. Top Section: Visualizer & Controls */}
        <div className="flex flex-col gap-6">
            <Visualizer isPlaying={state.isPlaying} />
            
            <Controls 
                isPlaying={state.isPlaying}
                onPlayPause={() => handlePlayPause()}
                onUpload={handleUpload}
                currentTime={state.currentTime}
                duration={state.duration}
                onSeek={handleSeek}
                volume={state.volume}
                onVolumeChange={handleVolume}
                isLoading={state.isLoading}
                loadingProgress={state.loadingProgress}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={state.currentTrackIndex < state.playlist.length - 1}
                hasPrev={state.currentTrackIndex > 0}
                currentTrack={currentTrack}
                currentPreset={state.currentPreset}
                bassBoost={state.bassBoost}
                spatialAudio={state.spatialAudio}
                onToggleBass={toggleBassBoost}
                onToggleSpatial={toggleSpatial}
            />
        </div>

        {/* 2. Bottom Section: Split EQ and Playlist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
            
            {/* EQ Panel (Larger) */}
            <div className="lg:col-span-8 flex flex-col">
                <EQPanel 
                    currentPreset={state.currentPreset}
                    onPresetChange={handlePresetChange}
                    onBandChange={handleManualEQ}
                    bandValues={bandValues} 
                />
            </div>
            
            {/* Playlist (Smaller) */}
            <div className="lg:col-span-4 flex flex-col">
                <Playlist 
                    tracks={state.playlist}
                    currentIndex={state.currentTrackIndex}
                    onPlay={playTrack}
                    onRemove={handleRemoveTrack}
                    onReorder={handleReorder}
                    onMoveTrack={handleMoveTrack}
                    isPlaying={state.isPlaying}
                />
            </div>
        </div>
        
        <footer className="text-center py-6 text-gray-700 text-[10px] font-mono tracking-widest uppercase">
           SonicPulse Audio Engine v2.0 • High Fidelity Playback
        </footer>

      </div>
    </div>
  );
}

export default App;