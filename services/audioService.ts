import { AudioPreset, EqualizerBand, FREQUENCY_BANDS } from '../types';

class AudioService {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  
  // Audio Graph Nodes
  private gainNode: GainNode | null = null; // Master Volume
  private analyserNode: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  
  // Advanced Vibe Engine Nodes
  private subsonicFilter: BiquadFilterNode | null = null; // Protects speakers
  private compressorNode: DynamicsCompressorNode | null = null;
  
  // Bass Engine
  private bassBoostNode: BiquadFilterNode | null = null; // Shelf
  private kickFilter: BiquadFilterNode | null = null; // Punch (Peaking)
  
  // Spatial Engine
  private spatialConvolver: ConvolverNode | null = null;
  private spatialGain: GainNode | null = null; 
  
  // Harmonic Exciter (High Definition)
  private exciterFilter: BiquadFilterNode | null = null;
  private exciterShaper: WaveShaperNode | null = null;
  private exciterGain: GainNode | null = null;

  private audioBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  // Interactive EQ State
  private hoveredBandIndex: number = -1;
  private hoveredBandOriginalGain: number = 0;

  constructor() {
    // We delay init until user interaction due to browser policies
  }

  public init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.createNodes();
    }
  }

  // Soft Clipping Curve for Tube Saturation feel
  private makeDistortionCurve(amount: number) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Sigmoid function for musical soft clipping
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createNodes() {
    if (!this.audioContext) return;

    // 1. Create Core Nodes
    this.gainNode = this.audioContext.createGain(); 
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.85; // Smoother visuals

    // 2. Subsonic Filter (Speaker Protection)
    // Removes inaudible low frequencies that cause distortion in small speakers
    this.subsonicFilter = this.audioContext.createBiquadFilter();
    this.subsonicFilter.type = 'highpass';
    this.subsonicFilter.frequency.value = 30; 
    this.subsonicFilter.Q.value = 0.7;

    // 3. Vibe Engine - Dynamics (The "Glue")
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    // Tuned for "Punchy" modern sound (JBL style)
    this.compressorNode.threshold.value = -20;
    this.compressorNode.knee.value = 12;
    this.compressorNode.ratio.value = 4; // 4:1 is musical and punchy
    this.compressorNode.attack.value = 0.01; // Fast enough to catch peaks
    this.compressorNode.release.value = 0.15; // Fast release for loudness

    // 4. Bass Engine
    this.bassBoostNode = this.audioContext.createBiquadFilter();
    this.bassBoostNode.type = 'lowshelf';
    // Lowered from 80Hz to 60Hz to target deep sub-bass and avoid muddy 200Hz region
    this.bassBoostNode.frequency.value = 60; 
    this.bassBoostNode.gain.value = 0;

    this.kickFilter = this.audioContext.createBiquadFilter();
    this.kickFilter.type = 'peaking';
    // Tuned to 90Hz (up from 55Hz) to target the "chest punch" / attack of the kick
    this.kickFilter.frequency.value = 90; 
    this.kickFilter.Q.value = 1.4; // Tighter Q to avoid muddying the lower mids
    this.kickFilter.gain.value = 0;

    // 5. Spatial Audio
    this.spatialConvolver = this.audioContext.createConvolver();
    this.spatialGain = this.audioContext.createGain();
    this.spatialGain.gain.value = 0; 
    this.generateSpatialImpulse();

    // 6. Harmonic Exciter (Crystalizer)
    // Adds upper harmonics to make audio sound "expensive"
    this.exciterFilter = this.audioContext.createBiquadFilter();
    this.exciterFilter.type = 'highpass';
    this.exciterFilter.frequency.value = 2500; // Focus on presence/air
    
    this.exciterShaper = this.audioContext.createWaveShaper();
    this.exciterShaper.curve = this.makeDistortionCurve(50); // Moderate saturation
    
    this.exciterGain = this.audioContext.createGain();
    this.exciterGain.gain.value = 0.15; // Subtle blend by default

    // 7. EQ Bands
    this.eqFilters = FREQUENCY_BANDS.map((freq, index) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.frequency.value = freq;
      
      if (index === 0) filter.type = 'lowshelf';
      else if (index === FREQUENCY_BANDS.length - 1) filter.type = 'highshelf';
      else filter.type = 'peaking';
      
      filter.Q.value = 1.2; // Slightly tighter Q for cleaner EQ
      return filter;
    });

    // 8. Connect the Graph
    this.connectFilterChain();
  }

  // Generates a "Widener" impulse response
  // Simulates early reflections spread across stereo field
  private generateSpatialImpulse() {
    if (!this.audioContext || !this.spatialConvolver) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 0.15; // 150ms tail - tight, not muddy
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // Exponential decay
        const decay = Math.pow(1 - i / length, 3);
        
        // Decorrelated noise for width
        if (i < 200) {
            // Early reflections (stronger)
            left[i] = (Math.random() * 2 - 1) * decay * 0.8;
            right[i] = (Math.random() * 2 - 1) * decay * 0.8;
        } else {
            // Tail
            left[i] = (Math.random() * 2 - 1) * decay * 0.4;
            right[i] = (Math.random() * 2 - 1) * decay * 0.4;
        }
    }
    this.spatialConvolver.buffer = impulse;
  }

  private connectFilterChain() {
    if (!this.audioContext || !this.gainNode || !this.analyserNode) return;

    // --- Signal Flow ---
    // Source -> Subsonic -> EQ Chain -> Bass Engine -> Compressor -> Master
    //                                |-> Exciter ->| (Parallel Mix)
    //                                |-> Spatial ->| (Parallel Mix)

    // 1. Link EQ in Series
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }
    const firstEq = this.eqFilters[0];
    const lastEq = this.eqFilters[this.eqFilters.length - 1];

    // 2. Main Chain Construction
    if (this.subsonicFilter) {
        this.subsonicFilter.connect(firstEq);
    }
    
    // EQ Output splits to: BassEngine, Exciter, Spatial
    if (this.bassBoostNode && this.kickFilter) {
        lastEq.connect(this.bassBoostNode);
        this.bassBoostNode.connect(this.kickFilter);
        
        // Connect Main Path to Compressor
        if (this.compressorNode) {
            this.kickFilter.connect(this.compressorNode);
        }
    }

    // 3. Exciter Path (Parallel)
    // Taps from EQ output (pre-bass boost to keep highs clean)
    if (this.exciterFilter && this.exciterShaper && this.exciterGain && this.compressorNode) {
        lastEq.connect(this.exciterFilter);
        this.exciterFilter.connect(this.exciterShaper);
        this.exciterShaper.connect(this.exciterGain);
        this.exciterGain.connect(this.compressorNode); // Mix back before compressor
    }

    // 4. Spatial Path (Parallel)
    // Taps from Compressor output (Post-dynamics for consistent ambience)
    if (this.compressorNode && this.spatialConvolver && this.spatialGain && this.gainNode) {
        this.compressorNode.connect(this.spatialConvolver);
        this.spatialConvolver.connect(this.spatialGain);
        this.spatialGain.connect(this.gainNode);
        
        // Dry Path
        this.compressorNode.connect(this.gainNode);
    }

    // 5. Final Output
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  public toggleBassBoost(isEnabled: boolean) {
    if (this.bassBoostNode && this.kickFilter && this.audioContext) {
        const time = this.audioContext.currentTime;
        // Shelf Boost (Deep Body)
        const shelfTarget = isEnabled ? 6 : 0; 
        this.bassBoostNode.gain.setTargetAtTime(shelfTarget, time, 0.2);
        
        // Kick Punch (Attack/Impact)
        // Increased from 4 to 5 for more distinct punch
        const kickTarget = isEnabled ? 5 : 0;
        this.kickFilter.gain.setTargetAtTime(kickTarget, time, 0.2);
    }
  }

  public toggleSpatial(isEnabled: boolean) {
      if (this.spatialGain && this.audioContext) {
          // Mix in the widener
          // 0.5 is fairly wet for a widener, but good for "Dolby" demo feel
          const target = isEnabled ? 0.5 : 0; 
          this.spatialGain.gain.setTargetAtTime(target, this.audioContext.currentTime, 0.3);
      }
  }

  public async loadFile(file: File | string, onProgress?: (percent: number) => void): Promise<number> {
    this.init();
    if (!this.audioContext) throw new Error("Audio Context init failed");
    
    this.stop();
    this.pauseTime = 0;

    // Handle URL String
    if (typeof file === 'string') {
        if (onProgress) onProgress(10);
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            // Simple progress simulation since Content-Length is often missing in CORS
            if (onProgress) onProgress(40);
            
            const arrayBuffer = await response.arrayBuffer();
            if (onProgress) onProgress(70);
            
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            if (onProgress) onProgress(100);
            return this.audioBuffer.duration;
        } catch (e) {
            console.error("Fetch error", e);
            throw e;
        }
    }

    // Handle File Object
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 80);
                onProgress(percent);
            }
        };

        reader.onload = async () => {
            if (onProgress) onProgress(85); 

            try {
                const arrayBuffer = reader.result as ArrayBuffer;
                this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
                if (onProgress) onProgress(100);
                resolve(this.audioBuffer.duration);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("Error reading file"));
        };

        reader.readAsArrayBuffer(file);
    });
  }

  public play(offset: number = 0) {
    if (!this.audioContext || !this.audioBuffer) return;

    if (this.sourceNode) {
        try { this.sourceNode.disconnect(); } catch(e) {}
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    // Connect to Subsonic Filter (Start of chain)
    if (this.subsonicFilter) {
      this.sourceNode.connect(this.subsonicFilter);
    } else {
      // Fallback
      this.sourceNode.connect(this.gainNode!);
    }

    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;
  }

  public pause() {
    if (this.sourceNode && this.isPlaying) {
      try {
        this.sourceNode.stop();
      } catch(e) {}
      if(this.audioContext) {
          this.pauseTime = this.audioContext.currentTime - this.startTime;
      }
      this.isPlaying = false;
    }
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
      }
      this.sourceNode = null;
    }
    this.pauseTime = 0;
    this.isPlaying = false;
  }

  public setVolume(val: number) {
    if (this.gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setTargetAtTime(val, currentTime, 0.1);
      
      if (val === 0) {
          this.gainNode.gain.setTargetAtTime(0, currentTime, 0.05);
      }
    }
  }

  public seek(time: number) {
    if (this.isPlaying) {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch(e) {}
        }
        this.play(time);
    } else {
        this.pauseTime = time;
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public applyPreset(preset: AudioPreset) {
    this.hoveredBandIndex = -1;
    const gains = this.getGainsForPreset(preset);
    
    // Apply EQ Gains
    this.eqFilters.forEach((filter, index) => {
      const currentTime = this.audioContext?.currentTime || 0;
      filter.gain.cancelScheduledValues(currentTime);
      filter.gain.setTargetAtTime(gains[index] || 0, currentTime, 0.1);
    });

    // Dynamic Exciter Adjustment based on Preset
    // Some genres benefit from more saturation (Rock/Electronic)
    if (this.exciterGain && this.audioContext) {
        const time = this.audioContext.currentTime;
        let exciterLevel = 0.15; // Default

        switch(preset) {
            case AudioPreset.ROCK:
            case AudioPreset.ELECTRONIC:
                exciterLevel = 0.25; // More drive
                break;
            case AudioPreset.VOCAL:
                exciterLevel = 0.10; // Cleaner
                break;
            case AudioPreset.CINEMA:
                exciterLevel = 0.20; // High definition
                break;
        }
        this.exciterGain.gain.setTargetAtTime(exciterLevel, time, 0.2);
    }
  }

  public setBandGain(index: number, value: number) {
      if (this.eqFilters[index]) {
          const currentTime = this.audioContext?.currentTime || 0;
          if (this.hoveredBandIndex === index) {
              this.hoveredBandOriginalGain = value;
              this.eqFilters[index].gain.setTargetAtTime(value + 4, currentTime, 0.1);
          } else {
              this.eqFilters[index].gain.setTargetAtTime(value, currentTime, 0.1);
          }
      }
  }

  public setHoverBoost(index: number) {
    if (this.hoveredBandIndex === index) return; 

    const currentTime = this.audioContext?.currentTime || 0;

    if (this.hoveredBandIndex !== -1 && this.eqFilters[this.hoveredBandIndex]) {
        this.eqFilters[this.hoveredBandIndex].gain.cancelScheduledValues(currentTime);
        this.eqFilters[this.hoveredBandIndex].gain.setTargetAtTime(
            this.hoveredBandOriginalGain, 
            currentTime, 
            0.1
        );
    }

    if (index >= 0 && index < this.eqFilters.length) {
        this.hoveredBandIndex = index;
        this.hoveredBandOriginalGain = this.eqFilters[index].gain.value;
        this.eqFilters[index].gain.cancelScheduledValues(currentTime);
        this.eqFilters[index].gain.setTargetAtTime(
            this.hoveredBandOriginalGain + 5,
            currentTime, 
            0.1
        );
    } else {
        this.hoveredBandIndex = -1;
    }
  }

  public getGainsForPreset(preset: AudioPreset): number[] {
    switch (preset) {
      case AudioPreset.BASS_BOOST: 
        return [8, 6, 3, 0, 0, 0, 0, 0, 2, 2];
      case AudioPreset.CINEMA:
        return [5, 4, -2, -2, -1, 0, 2, 4, 5, 6];
      case AudioPreset.SPATIAL: 
         return [6, 3, -3, -4, 0, 3, 6, 8, 9, 9];
      case AudioPreset.VOCAL:
        return [-4, -3, -1, 2, 5, 5, 2, 0, -1, -2];
      case AudioPreset.ELECTRONIC:
        return [6, 4, 0, -2, 0, 2, 4, 5, 4, 3];
      case AudioPreset.TREBLE:
        return [-2, -2, 0, 0, 2, 4, 6, 8, 8, 8];
      case AudioPreset.FLAT:
      default:
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }
  
  public getContextTime() {
      return this.audioContext?.currentTime || 0;
  }
  
  public getSampleRate() {
      return this.audioContext?.sampleRate || 44100;
  }

  public getCurrentOffset(): number {
      if(!this.isPlaying) return this.pauseTime;
      return (this.audioContext?.currentTime || 0) - this.startTime;
  }
}

export const audioService = new AudioService();