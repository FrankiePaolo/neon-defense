// Note frequencies (A minor pentatonic scale)
const _ = 0;
const A2 = 110, C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196;
const A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392;
const A4 = 440, C5 = 523.25, D5 = 587.33, E5 = 659.26, G5 = 784;
const A5 = 880;

const TRACKS = {
  menu: {
    bpm: 85,
    channels: [
      { wave: 'sine', vol: 0.07, sustain: 3.0, patterns: [
        [A3, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [E3, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [D3, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [E3, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      ]},
      { wave: 'square', vol: 0.03, sustain: 0.5, patterns: [
        [A3, _, E4, _, A4, _, E4, _, C4, _, G4, _, C5, _, G4, _],
        [E4, _, A4, _, E5, _, A4, _, D4, _, A4, _, D5, _, A4, _],
      ]},
    ]
  },

  gameplay: {
    bpm: 140,
    channels: [
      { wave: 'square', vol: 0.08, sustain: 0.7, patterns: [
        [A4, _, C5, _, D5, D5, C5, _, A4, _, G4, _, E4, _, G4, A4],
        [A4, _, C5, _, E5, _, D5, C5, A4, _, _, G4, A4, _, _, _],
        [E5, _, D5, _, C5, C5, A4, _, G4, _, A4, _, C5, _, D5, _],
        [E5, _, G5, _, E5, _, D5, C5, A4, _, _, _, A4, G4, A4, _],
      ]},
      { wave: 'triangle', vol: 0.15, sustain: 0.5, patterns: [
        [A2, _, _, A2, _, _, A2, _, D3, _, _, D3, _, _, D3, _],
        [E3, _, _, E3, _, _, E3, _, A2, _, _, A2, _, A2, _, _],
      ]},
      { wave: 'square', vol: 0.03, sustain: 0.3, patterns: [
        [A4, E4, A4, C5, E4, A4, C5, E5, A4, C5, E5, A5, E5, C5, A4, E4],
      ]},
      { type: 'kick', vol: 0.22, patterns: [
        [1, _, _, _, 1, _, _, _, 1, _, _, _, 1, _, _, _],
      ]},
      { type: 'noise', freq: 8000, vol: 0.05, sustain: 0.12, patterns: [
        [1, _, 1, _, 1, _, 1, _, 1, _, 1, _, 1, _, 1, _],
      ]},
      { type: 'noise', freq: 2500, vol: 0.08, sustain: 0.18, patterns: [
        [_, _, _, _, 1, _, _, _, _, _, _, _, 1, _, _, 1],
      ]},
    ]
  },

  boss: {
    bpm: 160,
    channels: [
      { wave: 'square', vol: 0.10, sustain: 0.6, patterns: [
        [E5, E5, _, D5, C5, _, A4, _, G4, A4, _, C5, D5, _, E5, _],
        [G5, _, E5, _, D5, D5, C5, _, A4, _, C5, _, A4, G4, A4, _],
      ]},
      { wave: 'triangle', vol: 0.18, sustain: 0.4, patterns: [
        [A2, _, A2, _, A2, _, A2, _, E3, _, E3, _, E3, _, E3, _],
        [D3, _, D3, _, D3, _, D3, _, A2, _, A2, _, E3, _, E3, _],
      ]},
      { wave: 'sawtooth', vol: 0.025, sustain: 0.2, patterns: [
        [E5, A4, E5, A5, E5, A4, E5, A5, D5, A4, D5, A5, D5, A4, D5, A5],
      ]},
      { type: 'kick', vol: 0.25, patterns: [
        [1, _, 1, _, 1, _, 1, _, 1, _, 1, _, 1, _, 1, _],
      ]},
      { type: 'noise', freq: 8000, vol: 0.06, sustain: 0.08, patterns: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ]},
      { type: 'noise', freq: 2500, vol: 0.10, sustain: 0.15, patterns: [
        [_, _, _, _, 1, _, _, 1, _, _, _, _, 1, _, _, 1],
      ]},
    ]
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.currentTrack = null;
    this.stepIndex = 0;
    this.barIndex = 0;
    this.nextStepTime = 0;
    this.timerID = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    // Pre-generate noise buffer for drums
    const bufLen = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.4;
    }
    return this.muted;
  }

  playTrack(name) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.currentTrack === name) return;

    this.stopMusic();
    this.currentTrack = name;
    this.stepIndex = 0;
    this.barIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this._startScheduler();
  }

  stopMusic() {
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.currentTrack = null;
  }

  _startScheduler() {
    this.timerID = setInterval(() => {
      if (!this.currentTrack) return;
      const track = TRACKS[this.currentTrack];
      if (!track) return;
      const stepDur = 60 / track.bpm / 4;

      while (this.nextStepTime < this.ctx.currentTime + 0.1) {
        this._playStep(track, this.stepIndex, this.barIndex, this.nextStepTime, stepDur);
        this.stepIndex++;
        if (this.stepIndex >= 16) {
          this.stepIndex = 0;
          this.barIndex++;
        }
        this.nextStepTime += stepDur;
      }
    }, 25);
  }

  _playStep(track, step, bar, time, stepDur) {
    for (const ch of track.channels) {
      const pattern = ch.patterns[bar % ch.patterns.length];
      const note = pattern[step];
      if (!note) continue;

      if (ch.type === 'kick') {
        this._playKick(time, ch.vol);
      } else if (ch.type === 'noise') {
        this._playNoiseDrum(time, stepDur * (ch.sustain || 0.3), ch.freq, ch.vol);
      } else {
        this._playTone(note, time, stepDur * (ch.sustain || 0.8), ch.wave, ch.vol);
      }
    }
  }

  _playTone(freq, time, dur, wave, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _playKick(time, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  _playNoiseDrum(time, dur, filterFreq, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterFreq > 5000 ? 'highpass' : 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  // --- SFX ---

  playSfx(name) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    switch (name) {
      case 'place':  this._sfxTone(440, t, 0.05); this._sfxTone(660, t + 0.05, 0.05); this._sfxTone(880, t + 0.1, 0.08); break;
      case 'sell':   this._sfxTone(880, t, 0.05); this._sfxTone(660, t + 0.05, 0.05); this._sfxTone(440, t + 0.1, 0.08); break;
      case 'death':  this._sfxTone(300, t, 0.06); this._sfxTone(450, t + 0.03, 0.06); break;
      case 'wave':   [523, 659, 784, 1047].forEach((f, i) => this._sfxTone(f, t + i * 0.07, 0.1)); break;
      case 'damage': this._sfxTone(120, t, 0.12, 'sawtooth'); this._sfxTone(80, t + 0.04, 0.15, 'sawtooth'); break;
      case 'gameover': [440, 392, 329, 261].forEach((f, i) => this._sfxTone(f, t + i * 0.2, 0.3, 'triangle')); break;
    }
  }

  _sfxTone(freq, time, dur, wave = 'square') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
}
