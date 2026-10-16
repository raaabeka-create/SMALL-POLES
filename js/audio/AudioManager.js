/**
 * Procedural audio via Web Audio API — no asset files required.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.45;
    this._crowdNode = null;
    this._unlocked = false;
  }

  async unlock() {
    if (this._unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this._unlocked = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  setEnabled(v) {
    this.enabled = !!v;
    if (!v) this.stopCrowd();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  _gain(mult = 1) {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    g.gain.value = this.volume * mult;
    g.connect(this.ctx.destination);
    return g;
  }

  kick(power = 0.6) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this._gain(0.35 * power);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 + power * 80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(this.volume * 0.4 * power, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.16);
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this._gain(0.25 * power);
    ng.gain.setValueAtTime(this.volume * 0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(ng);
    noise.start(t);
  }

  pass() { this.kick(0.35); }

  whistle() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this._gain(0.25);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.setValueAtTime(2200, t + 0.08);
    g.gain.setValueAtTime(this.volume * 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  goal() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this._gain(0.2);
      osc.type = 'square';
      osc.frequency.value = f;
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(this.volume * 0.18, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.36);
    });
    this._crowdCheer();
  }

  _crowdCheer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4 * Math.sin((i / len) * Math.PI);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    const g = this._gain(0.35);
    g.gain.setValueAtTime(this.volume * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
  }

  startCrowd() {
    if (!this.enabled || !this.ctx || this._crowdNode) return;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.value = this.volume * 0.08;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start();
    this._crowdNode = { src, g };
  }

  stopCrowd() {
    if (this._crowdNode) {
      try { this._crowdNode.src.stop(); } catch (_) {}
      this._crowdNode = null;
    }
  }

  uiClick() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this._gain(0.15);
    osc.frequency.value = 880;
    g.gain.setValueAtTime(this.volume * 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.07);
  }
}
