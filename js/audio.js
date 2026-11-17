// Note frequencies (A minor, with harmonic minor tension for boss battles)
const _ = 0;
const F2 = 87.31;
const A2 = 110, C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196;
const A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392;
const A4 = 440, C5 = 523.25, D5 = 587.33, E5 = 659.26, G5 = 784;
const A5 = 880;
const B4 = 493.88, F4 = 349.23, GS4 = 415.30;

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
        [A4, _, _, E4, A4, _, B4, C5, B4, _, A4, _, E4, _, _, _],
        [F4, _, _, E4, F4, _, A4, _, C5, _, B4, A4, F4, _, E4, _],
        [D5, _, _, A4, D5, _, C5, B4, A4, _, F4, _, E4, _, D4, _],
        [E4, _, GS4, _, B4, _, E5, _, D5, C5, B4, GS4, A4, _, _, _],
      ]},
      { wave: 'triangle', vol: 0.18, sustain: 0.4, patterns: [
        [A2, A2, _, A2, _, _, A2, _, A2, A2, _, A2, _, _, E3, _],
        [F2, F2, _, F2, _, _, F2, _, F2, F2, _, F2, _, _, C3, _],
        [D3, D3, _, D3, _, _, D3, _, D3, D3, _, D3, _, _, A2, _],
        [E3, E3, _, E3, _, _, E3, _, E3, E3, _, E3, E3, _, E3, _],
      ]},
      { wave: 'sawtooth', vol: 0.025, sustain: 0.4, patterns: [
        [A3, _, E4, _, A4, _, E4, _, A3, _, E4, _, A4, _, E4, _],
        [C4, _, F4, _, A4, _, F4, _, C4, _, F4, _, A4, _, F4, _],
        [D4, _, F4, _, A4, _, F4, _, D4, _, F4, _, A4, _, F4, _],
        [E4, _, GS4, _, B4, _, GS4, _, E4, _, GS4, _, B4, GS4, E4, _],
      ]},
      { type: 'kick', vol: 0.25, patterns: [
        [1, _, _, 1, _, _, 1, _, 1, _, _, 1, _, _, 1, _],
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
    this.speed = 1;
    /** @type {Set<AudioScheduledSourceNode>} */
    this.musicSources = new Set();
    /** @type {Set<AudioScheduledSourceNode>} */
    this.sfxSources = new Set();
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
    this.masterGain.gain.value = this.muted ? 0 : 0.4;
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
    if (!this.muted) this._resume();
    return this.muted;
  }

  _resume() {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      this.ctx.resume().catch(() => {});
    }
  }

  get playbackSpeed() {
    // Keep x1 relaxed, x2 moderate, and x3 at the original tempo.
    return 0.6 + (this.speed - 1) * 0.2;
  }

  setSpeed(speed) {
    if (this.speed === speed) return;
    this.speed = speed;
    if (this.ctx && this.currentTrack) {
      this._stopSources(this.musicSources);
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }
  }

  playTrack(name) {
    if (!this.ctx) return;
    this._resume();
    if (this.currentTrack === name) return;

    this.stopMusic();
    this.currentTrack = name;
    this.stepIndex = 0;
    this.barIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this._startScheduler();
  }

  stopMusic() {
    if (this.timerID !== null) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.currentTrack = null;
    this._stopSources(this.musicSources);
  }

  stopSfx() {
    this._stopSources(this.sfxSources);
  }

  /** @param {Set<AudioScheduledSourceNode>} sources */
  _stopSources(sources) {
    for (const source of sources) source.stop(this.ctx.currentTime);
    sources.clear();
  }

  /**
   * @param {AudioScheduledSourceNode} source
   * @param {AudioNode[]} nodes
   * @param {Set<AudioScheduledSourceNode>} sources
   */
  _trackSource(source, nodes, sources) {
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  }

  _startScheduler() {
    this.timerID = setInterval(() => {
      if (!this.currentTrack || this.ctx.state !== 'running') return;
      const track = TRACKS[this.currentTrack];
      if (!track) return;
      const stepDur = 60 / track.bpm / 4 / this.playbackSpeed;
      const now = this.ctx.currentTime;
      // A stalled tab must skip missed beats, never play a backlog at once.
      if (this.nextStepTime < now) {
        const skipped = Math.ceil((now - this.nextStepTime) / stepDur);
        const step = this.stepIndex + skipped;
        this.barIndex += Math.floor(step / 16);
        this.stepIndex = step % 16;
        this.nextStepTime += skipped * stepDur;
      }

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
    this._trackSource(osc, [gain], this.musicSources);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _playKick(time, vol) {
    const duration = 1 / this.playbackSpeed;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08 * duration);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 * duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    this._trackSource(osc, [gain], this.musicSources);
    osc.start(time);
    osc.stop(time + 0.2 * duration);
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
    this._trackSource(src, [filter, gain], this.musicSources);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  // --- SFX ---

  playSfx(name) {
    if (!this.ctx || this.muted) return;
    this._resume();
    const t = this.ctx.currentTime;
    /** @param {OscillatorType} [wave] */
    const tone = (freq, offset, dur, wave = 'square') =>
      this._sfxTone(freq, t + offset / this.playbackSpeed, dur / this.playbackSpeed, wave);
    switch (name) {
      case 'place':  tone(440, 0, 0.05); tone(660, 0.05, 0.05); tone(880, 0.1, 0.08); break;
      case 'upgrade': [660, 880, 1320].forEach((f, i) => tone(f, i * 0.06, 0.12, 'triangle')); break;
      case 'sell':   tone(880, 0, 0.05); tone(660, 0.05, 0.05); tone(440, 0.1, 0.08); break;
      case 'death':  tone(300, 0, 0.06); tone(450, 0.03, 0.06); break;
      case 'wave':   [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.1)); break;
      case 'damage': tone(120, 0, 0.12, 'sawtooth'); tone(80, 0.04, 0.15, 'sawtooth'); break;
      case 'gameover': [440, 392, 329, 261].forEach((f, i) => tone(f, i * 0.2, 0.3, 'triangle')); break;
    }
  }

  /** @param {OscillatorType} [wave] */
  _sfxTone(freq, time, dur, wave = 'square') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this._trackSource(osc, [gain], this.sfxSources);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
}
