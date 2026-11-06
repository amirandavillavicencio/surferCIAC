/**
 * Saurabh's Sprint - Web Audio Synthesizer Engine
 * Generates dynamic sound effects and background music without external audio files
 * 100% Offline Compatible - Pure algorithmic sound synthesis (0 network requests)
 * Fully compliant with modern browser autoplay & AudioContext policies
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;

    this.enabled = Storage.isSoundEnabled();
    this.bgmEnabled = Storage.isBgmEnabled();
    this.sfxEnabled = Storage.isSfxEnabled();

    this.bgmPlaying = false;
    this.bgmInterval = null;
    this.coinPitchIndex = 0;
    this.lastCoinTime = 0;

    // Attach passive global user gesture listeners to unlock AudioContext immediately on touch/click
    this.setupAutoUnlock();
  }

  setupAutoUnlock() {
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };

    ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { passive: true, once: false });
    });
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);

          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1.0 : 0.0, this.ctx.currentTime);
          this.sfxGain.connect(this.masterGain);

          this.bgmGain = this.ctx.createGain();
          this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 1.0 : 0.0, this.ctx.currentTime);
          this.bgmGain.connect(this.masterGain);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext initialization note:', e);
    }
  }

  getSfxDestination() {
    if (this.sfxGain) return this.sfxGain;
    if (this.masterGain) return this.masterGain;
    if (this.ctx) return this.ctx.destination;
    return null;
  }

  getBgmDestination() {
    if (this.bgmGain) return this.bgmGain;
    if (this.masterGain) return this.masterGain;
    if (this.ctx) return this.ctx.destination;
    return null;
  }

  // Master Sound Toggle
  toggleSound() {
    this.enabled = !this.enabled;
    Storage.setSoundEnabled(this.enabled);
    
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }

    if (!this.enabled) {
      this.stopBGM();
    } else {
      if (this.bgmEnabled) this.startBGM();
    }
    return this.enabled;
  }

  setSoundEnabled(val) {
    this.enabled = Boolean(val);
    Storage.setSoundEnabled(this.enabled);
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (!this.enabled) {
      this.stopBGM();
    } else if (this.bgmEnabled) {
      this.startBGM();
    }
    return this.enabled;
  }

  // BGM Toggle
  toggleBGM() {
    this.bgmEnabled = !this.bgmEnabled;
    Storage.setBgmEnabled(this.bgmEnabled);
    this.init();
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (!this.bgmEnabled) {
      this.stopBGM();
    } else if (this.enabled) {
      this.startBGM();
    }
    return this.bgmEnabled;
  }

  // SFX Toggle
  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    Storage.setSfxEnabled(this.sfxEnabled);
    this.init();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
    return this.sfxEnabled;
  }

  playJump() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playSlide() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playCoin() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      if (now - this.lastCoinTime < 0.35) {
        this.coinPitchIndex = (this.coinPitchIndex + 1) % 5;
      } else {
        this.coinPitchIndex = 0;
      }
      this.lastCoinTime = now;

      const basePitches = [987.77, 1174.66, 1318.51, 1567.98, 1760.00]; // B5, D6, E6, G6, A6
      const freq = basePitches[this.coinPitchIndex];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.5, now + 0.05);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  playKey() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      // Majestic 4-note ascending sparkle chime (C5, G5, C6, E6)
      const notes = [523.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  }

  playPowerUp() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (e) {}
  }

  playHoverboard() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playCrash() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.35));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noise.connect(noiseGain);
      noiseGain.connect(dest);

      // Deep sub bass
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      subOsc.connect(subGain);
      subGain.connect(dest);

      noise.start(now);
      subOsc.start(now);
      subOsc.stop(now + 0.4);
    } catch (e) {}
  }

  playButtonClick() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playWhoosh() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playReward() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } catch (e) {}
  }

  playRevive() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.45);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  /* Procedural Synthwave BGM Loop (100% Offline Algorithmic Synthesis) */
  startBGM() {
    if (!this.enabled || !this.bgmEnabled || this.bgmPlaying) return;
    this.init();
    this.stopBGM(); // Ensure no stale intervals

    this.bgmPlaying = true;
    const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98]; // A2, C3, D3, E3, D3, C3, G2
    let step = 0;
    const tempoMs = 220; // Fast sprint bpm

    this.bgmInterval = setInterval(() => {
      if (!this.enabled || !this.bgmEnabled || !this.bgmPlaying || !this.ctx) return;

      try {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }

        const dest = this.getBgmDestination();
        const now = this.ctx.currentTime;
        const freq = bassNotes[step % bassNotes.length];

        // Bass synth
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        // Simple lowpass filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 0.18);

        // Hi-hat pulse every 2 steps
        if (step % 2 === 1) {
          const hhOsc = this.ctx.createOscillator();
          const hhGain = this.ctx.createGain();
          hhOsc.type = 'sine';
          hhOsc.frequency.setValueAtTime(2200, now);
          hhGain.gain.setValueAtTime(0.03, now);
          hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          hhOsc.connect(hhGain);
          hhGain.connect(dest);
          hhOsc.start(now);
          hhOsc.stop(now + 0.05);
        }

        step++;
      } catch (e) {}
    }, tempoMs);
  }

  playSpringJump() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playWhistle() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.setValueAtTime(2200, now + 0.08);
      osc.frequency.setValueAtTime(1900, now + 0.16);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playDogBark() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playWheelTick() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  playWheelWin() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } catch (e) {}
  }

  playChestOpen() {
    if (!this.enabled || !this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const dest = this.getSfxDestination();
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  playClaimReward() {
    this.playWheelWin();
  }
}

const Audio = new SoundEngine();

if (typeof window !== 'undefined') {
  window.Audio = Audio;
}
if (typeof global !== 'undefined') {
  global.Audio = Audio;
}
