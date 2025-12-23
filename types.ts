export enum AudioPreset {
  FLAT = 'FLAT',
  BASS_BOOST = 'BASS_BOOST', // Mimic JBL
  CINEMA = 'CINEMA', // Mimic Wide/Dolby feel
  VOCAL = 'VOCAL',
  TREBLE = 'TREBLE',
  ROCK = 'ROCK',
  ELECTRONIC = 'ELECTRONIC',
  SPATIAL = 'SPATIAL'
}

export interface EqualizerBand {
  frequency: number;
  gain: number; // dB
  type: 'peaking' | 'lowshelf' | 'highshelf';
}

export interface PlaylistTrack {
  id: string;
  file: File | string;
  name: string;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentPreset: AudioPreset;
  playlist: PlaylistTrack[];
  currentTrackIndex: number;
  isLoading: boolean;
  loadingProgress: number; // 0 to 100
  // Vibe Features
  bassBoost: boolean;
  spatialAudio: boolean;
}

export const FREQUENCY_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];