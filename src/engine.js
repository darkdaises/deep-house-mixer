// A tiny deep house machine, made entirely with the Web Audio API.
// Every sound (kick, clap, hats, bass, chords) is synthesized live, so nothing here is a recording.
//
// Mood controls (all 0..1):
//   night   0 = sunset (warm airy pads, slower)      1 = 3am (dark stabs, rolling bass)
//   energy  0 = chill (118 BPM, sparse)               1 = dancing (124 BPM, full hats + percussion)
//   warmth  0 = "next room" (muffled)                 1 = "front row" (crisp)
//   groove  0 = straight                              1 = swung and bouncy

const lerp = (a, b, t) => a + (b - a) * t;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// A minor, four bars: Am9 · Fmaj9 · Dm9 · Em7(add11). Voicings stay close together, like a deep house keyboard player.
const PROGRESSION = [
  { root: 45, notes: [57, 60, 64, 67, 71] },   // Am9
  { root: 41, notes: [57, 60, 64, 65, 69] },   // Fmaj9 (over F)
  { root: 38, notes: [57, 60, 62, 65, 69] },   // Dm9
  { root: 40, notes: [55, 59, 62, 64, 69] }    // Em7 add11
];

// Bass patterns (steps 0..15). Sunset is sparse and off-beat; 3am rolls more.
const BASS_SUNSET = [2, 6, 10, 14];
const BASS_NIGHT = [0, 3, 6, 8, 10, 11, 14];

export class Engine {
  constructor() {
    this.ctx = null;
    this.mood = { night: 0.3, energy: 0.5, warmth: 0.7, groove: 0.35 };
    this.playing = false;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.kickTimes = [];      // for the visuals: when each kick lands
    this.dropping = false;
    this.listeners = new Set();
  }

  get bpm() { return Math.round(lerp(118, 124, this.mood.energy)); }

  async start() {
    if (!this.ctx) this.build();
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.step = 0; this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.72, this.ctx.currentTime, 0.4);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  setMood(partial) {
    Object.assign(this.mood, partial);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Warmth: a master low-pass from "next room" to "front row"
    if (!this.dropping) this.tone.frequency.setTargetAtTime(this.warmthCutoff(), t, 0.08);
    this.reverbSend.gain.setTargetAtTime(lerp(0.55, 0.32, this.mood.energy), t, 0.2);
  }

  warmthCutoff() { return lerp(700, 16000, Math.pow(this.mood.warmth, 1.6)); }

  // Hold to filter everything down; let go and it slams back in.
  drop(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.dropping = on;
    this.tone.frequency.cancelScheduledValues(t);
    this.tone.frequency.setValueAtTime(this.tone.frequency.value, t);
    if (on) {
      this.tone.frequency.exponentialRampToValueAtTime(260, t + 1.2);
      this.tone.Q.setTargetAtTime(6, t, 0.3);
      this.kickBus.gain.setTargetAtTime(0.25, t, 0.25);
    } else {
      this.tone.frequency.exponentialRampToValueAtTime(this.warmthCutoff(), t + 0.05);
      this.tone.Q.setTargetAtTime(0.7, t, 0.05);
      this.kickBus.gain.setTargetAtTime(1, t, 0.02);
    }
  }

  onStep(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  // ---------------- audio graph ----------------
  build() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.Q.value = 0.7; this.tone.frequency.value = this.warmthCutoff();

    // music bus -> tone filter -> compressor -> master -> out
    this.bus = ctx.createGain();
    this.bus.connect(this.tone); this.tone.connect(comp); comp.connect(this.master);
    this.master.connect(this.analyser); this.analyser.connect(ctx.destination);

    // kick has its own bus so the DROP can duck it
    this.kickBus = ctx.createGain(); this.kickBus.connect(this.bus);

    // reverb (generated impulse, a soft dark room)
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.8, 2.6);
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.45;
    this.reverbSend.connect(this.reverb); this.reverb.connect(this.bus);

    // dotted-eighth delay for chord stabs
    this.delay = ctx.createDelay(2); this.delayFb = ctx.createGain(); this.delayFilt = ctx.createBiquadFilter();
    this.delayFilt.type = 'lowpass'; this.delayFilt.frequency.value = 2400; this.delayFb.gain.value = 0.38;
    this.delaySend = ctx.createGain(); this.delaySend.gain.value = 0.28;
    this.delaySend.connect(this.delay); this.delay.connect(this.delayFilt); this.delayFilt.connect(this.delayFb);
    this.delayFb.connect(this.delay); this.delayFilt.connect(this.bus);

    // one second of white noise, reused by hats, claps and shakers
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.setMood({});
  }

  impulse(seconds, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ---------------- sequencer ----------------
  schedule() {
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      const sixteenth = 60 / this.bpm / 4;
      // swing: every off-16th is pushed late, the next one pulled back
      const swing = this.mood.groove * 0.32 * sixteenth;
      this.nextTime += this.step % 2 === 0 ? sixteenth + swing : sixteenth - swing;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
    // forget kicks the visuals no longer need
    const now = ctx.currentTime;
    this.kickTimes = this.kickTimes.filter((k) => k > now - 1);
  }

  playStep(s, t) {
    const { night, energy } = this.mood;
    const chord = PROGRESSION[this.bar];

    if (s % 4 === 0) { this.kick(t); this.kickTimes.push(t); }
    if ((s === 4 || s === 12) && energy > 0.12) this.clap(t, lerp(0.35, 0.6, energy));

    // hats: the open off-beat hat is the heart of it; closed 16ths and a shaker come in with energy
    if (s % 4 === 2) this.hat(t, 0.16, lerp(0.16, 0.24, energy), 7000);
    if (energy > 0.35 && s % 2 === 1) this.hat(t, 0.03, lerp(0.05, 0.11, energy) * (0.7 + Math.random() * 0.6), 9000);
    if (energy > 0.62) this.shaker(t, lerp(0.03, 0.07, energy) * (s % 2 ? 0.6 : 1));
    if (energy > 0.8 && (s === 7 || s === 15 || s === 10)) this.rim(t, 0.18);

    // bass
    const pattern = night > 0.5 ? BASS_NIGHT : BASS_SUNSET;
    if (pattern.includes(s)) {
      const octaveJump = night > 0.5 && (s === 3 || s === 11) ? 12 : 0;
      this.bass(t, chord.root + octaveJump, night > 0.5 ? 0.16 : 0.24);
    }

    // chords: sunset = long airy pads; 3am = short filtered stabs with delay
    if (s === 0) this.pad(t, chord.notes, (1 - night) * 0.11);
    if (night > 0.25 && (s === 3 || s === 10 || (energy > 0.5 && s === 14))) this.stab(t, chord.notes, night * 0.07);

    for (const fn of this.listeners) fn({ step: s, bar: this.bar, time: t });
  }

  // ---------------- instruments ----------------
  kick(t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    o.connect(g); g.connect(this.kickBus); o.start(t); o.stop(t + 0.5);
    // a tiny click on top so it reads on phone speakers
    this.noiseHit(t, 0.004, 0.18, 'highpass', 3000, this.kickBus);
  }

  clap(t, level) {
    // three quick bursts, like hands that aren't perfectly together
    [0, 0.011, 0.022].forEach((o, i) => this.noiseHit(t + o, i === 2 ? 0.16 : 0.012, level, 'bandpass', 1400, this.bus, true));
  }

  hat(t, decay, level, freq) { this.noiseHit(t, decay, level, 'highpass', freq, this.bus); }
  shaker(t, level) { this.noiseHit(t, 0.05, level, 'bandpass', 6500, this.bus); }
  rim(t, level) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 1750;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g); g.connect(this.bus); g.connect(this.delaySend); o.start(t); o.stop(t + 0.05);
  }

  noiseHit(t, decay, level, type, freq, out, verb = false) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; src.playbackRate.value = 0.9 + Math.random() * 0.2;
    f.type = type; f.frequency.value = freq; if (type === 'bandpass') f.Q.value = 1.2;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f); f.connect(g); g.connect(out); if (verb) g.connect(this.reverbSend);
    src.start(t, Math.random() * 0.5); src.stop(t + decay + 0.02);
  }

  bass(t, note, len) {
    const ctx = this.ctx, o = ctx.createOscillator(), sub = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; sub.type = 'sine';
    o.frequency.value = midi(note); sub.frequency.value = midi(note);
    f.type = 'lowpass'; f.Q.value = 4;
    const open = lerp(900, 420, this.mood.night);
    f.frequency.setValueAtTime(open, t); f.frequency.exponentialRampToValueAtTime(140, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.05);
    const so = ctx.createGain(); so.gain.value = 0.5;
    o.connect(f); sub.connect(so); so.connect(g); f.connect(g); g.connect(this.bus);
    o.start(t); sub.start(t); o.stop(t + len + 0.1); sub.stop(t + len + 0.1);
  }

  pad(t, notes, level) {
    if (level < 0.005) return;
    const ctx = this.ctx, barLen = (60 / this.bpm) * 4;
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(lerp(1400, 2600, this.mood.warmth), t + barLen * 0.6); f.frequency.linearRampToValueAtTime(900, t + barLen);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level, t + barLen * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + barLen * 1.05);
    f.connect(g); g.connect(this.bus); g.connect(this.reverbSend);
    notes.forEach((n) => [-7, 7].forEach((cents) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = cents;
      const og = ctx.createGain(); og.gain.value = 0.18;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + barLen * 1.1);
    }));
  }

  stab(t, notes, level) {
    const ctx = this.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(lerp(2600, 1600, this.mood.night), t); f.frequency.exponentialRampToValueAtTime(380, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    f.connect(g); g.connect(this.bus); g.connect(this.reverbSend); g.connect(this.delaySend);
    this.delay.delayTime.setValueAtTime((60 / this.bpm) * 0.75, t);
    notes.forEach((n) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = midi(n);
      const og = ctx.createGain(); og.gain.value = 0.22;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + 0.35);
    });
  }
}
