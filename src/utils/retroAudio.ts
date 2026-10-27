// Web Audio API Retro Sound Effects & Mini BGM Synthesizer for Cyworld nostalgic experience

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isBgmPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private bgmTimeoutId: any = null;
  private volume: number = 0.3;

  private tracks = [
    {
      title: '프리스타일 - Y (Please Tell Me Why)',
      notes: [
        { f: 392.0, d: 0.3 }, // G4
        { f: 440.0, d: 0.3 }, // A4
        { f: 493.88, d: 0.4 }, // B4
        { f: 587.33, d: 0.6 }, // D5
        { f: 493.88, d: 0.3 }, // B4
        { f: 440.0, d: 0.5 }, // A4
        { f: 392.0, d: 0.8 }, // G4
        { f: 0, d: 0.2 },
        { f: 329.63, d: 0.3 }, // E4
        { f: 392.0, d: 0.3 }, // G4
        { f: 440.0, d: 0.4 }, // A4
        { f: 523.25, d: 0.6 }, // C5
        { f: 440.0, d: 0.3 }, // A4
        { f: 392.0, d: 0.8 }, // G4
      ],
    },
    {
      title: '에픽하이 - Fly',
      notes: [
        { f: 523.25, d: 0.25 }, // C5
        { f: 587.33, d: 0.25 }, // D5
        { f: 659.25, d: 0.4 }, // E5
        { f: 523.25, d: 0.25 },
        { f: 659.25, d: 0.25 },
        { f: 783.99, d: 0.5 }, // G5
        { f: 659.25, d: 0.3 },
        { f: 587.33, d: 0.6 },
        { f: 0, d: 0.2 },
        { f: 440.0, d: 0.25 },
        { f: 523.25, d: 0.4 },
        { f: 587.33, d: 0.4 },
        { f: 523.25, d: 0.6 },
      ],
    },
    {
      title: '윤도현 - 사랑했나봐',
      notes: [
        { f: 440.0, d: 0.4 },
        { f: 493.88, d: 0.4 },
        { f: 523.25, d: 0.6 },
        { f: 587.33, d: 0.4 },
        { f: 523.25, d: 0.4 },
        { f: 493.88, d: 0.5 },
        { f: 440.0, d: 0.8 },
      ],
    },
    {
      title: '클래지콰이 - She is (내 이름은 김삼순 OST)',
      notes: [
        { f: 659.25, d: 0.3 },
        { f: 587.33, d: 0.2 },
        { f: 659.25, d: 0.3 },
        { f: 783.99, d: 0.5 },
        { f: 659.25, d: 0.3 },
        { f: 587.33, d: 0.4 },
        { f: 523.25, d: 0.6 },
      ],
    },
  ];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay restrictions
    }
  }

  public playChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.15 * this.volume, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.32);
      });
    } catch {}
  }

  public playSecretLock() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.setValueAtTime(450, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {}
  }

  public toggleBgm(onTrackChange?: (title: string, isPlaying: boolean) => void) {
    if (this.isBgmPlaying) {
      this.stopBgm();
      onTrackChange?.(this.tracks[this.currentTrackIndex].title, false);
      return false;
    } else {
      this.startBgm(onTrackChange);
      return true;
    }
  }

  public nextTrack(onTrackChange?: (title: string, isPlaying: boolean) => void) {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    if (this.isBgmPlaying) {
      this.stopBgm();
      this.startBgm(onTrackChange);
    } else {
      onTrackChange?.(this.tracks[this.currentTrackIndex].title, false);
    }
    return this.tracks[this.currentTrackIndex].title;
  }

  public getCurrentTrackTitle() {
    return this.tracks[this.currentTrackIndex].title;
  }

  public getIsPlaying() {
    return this.isBgmPlaying;
  }

  private startBgm(onTrackChange?: (title: string, isPlaying: boolean) => void) {
    this.initCtx();
    this.isBgmPlaying = true;
    onTrackChange?.(this.tracks[this.currentTrackIndex].title, true);
    this.playMelodyLoop();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimeoutId) {
      clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
  }

  private playMelodyLoop() {
    if (!this.isBgmPlaying || !this.ctx) return;
    const track = this.tracks[this.currentTrackIndex];
    let offset = 0;

    track.notes.forEach((note) => {
      if (!this.isBgmPlaying || !this.ctx) return;
      if (note.f > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, this.ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.08 * this.volume, this.ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + offset + note.d * 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + offset);
        osc.stop(this.ctx.currentTime + offset + note.d);
      }
      offset += note.d;
    });

    this.bgmTimeoutId = setTimeout(() => {
      if (this.isBgmPlaying) {
        this.playMelodyLoop();
      }
    }, (offset + 1.2) * 1000);
  }
}

export const retroAudio = new RetroAudioEngine();
