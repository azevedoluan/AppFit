// Web Audio API beep generator and vibration utility

class SoundService {
  private audioCtx: AudioContext | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Quick crisp click / check beep when completing a set
  playCheckSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.12);

      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch {
      // Audio not permitted or supported
    }
  }

  // Timer complete alert sound (crisp multi-beep chime + phone vibration)
  playTimerCompleteSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Três bips enérgicos tipo cronômetro esportivo
      const beeps = [
        { freq: 880, start: 0.0, duration: 0.15 },
        { freq: 880, start: 0.22, duration: 0.15 },
        { freq: 1174.66, start: 0.44, duration: 0.35 }
      ];

      beeps.forEach(({ freq, start, duration }) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.3, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    } catch {
      // Ignore
    }
  }

  // Tick sound for last 3 seconds
  playTickSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);

      if ('vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundService();
