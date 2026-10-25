// Default sound effects, synthesised with Web Audio so the game needs no audio files.
let ctx = null;
let master = null;

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function masterGain() {
  audioContext();
  return master;
}

function tone({ type = 'sine', freq = 440, to = null, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005 }) {
  const c = audioContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let noiseBuf = null;
function noise({ dur = 0.2, vol = 0.3, filter = 'lowpass', freq = 800, to = null, delay = 0, q = 1 }) {
  const c = audioContext();
  if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export const SFX = {
  pickup: () => tone({ type: 'triangle', freq: 500, to: 800, dur: 0.08, vol: 0.2 }),
  putdown: () => tone({ type: 'triangle', freq: 600, to: 350, dur: 0.08, vol: 0.2 }),
  carve: () => { noise({ dur: 0.12, vol: 0.25, filter: 'bandpass', freq: 3000, q: 2 }); tone({ type: 'triangle', freq: 900, to: 1200, dur: 0.06, vol: 0.12, delay: 0.08 }); },
  plate: () => { tone({ type: 'sine', freq: 1800, dur: 0.12, vol: 0.15 }); tone({ type: 'sine', freq: 2400, dur: 0.1, vol: 0.1, delay: 0.04 }); },
  seat: () => tone({ type: 'triangle', freq: 400, to: 600, dur: 0.12, vol: 0.2 }),
  scribble: () => { for (let i = 0; i < 4; i++) noise({ dur: 0.05, vol: 0.18, filter: 'highpass', freq: 3000, delay: i * 0.07 }); },
  ding: () => { tone({ type: 'sine', freq: 1320, dur: 0.35, vol: 0.2 }); tone({ type: 'sine', freq: 1760, dur: 0.3, vol: 0.12, delay: 0.02 }); },
  ready: () => { [660, 880, 1100].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.18, vol: 0.2, delay: i * 0.09 })); },
  empty: () => tone({ type: 'square', freq: 220, to: 110, dur: 0.3, vol: 0.12 }),
  nope: () => { tone({ type: 'square', freq: 180, dur: 0.1, vol: 0.12 }); tone({ type: 'square', freq: 140, dur: 0.14, vol: 0.12, delay: 0.1 }); },
  bin: () => noise({ dur: 0.25, vol: 0.3, filter: 'lowpass', freq: 600, to: 200 }),
  paper: () => noise({ dur: 0.12, vol: 0.18, filter: 'highpass', freq: 2500 }),
  cash: () => { tone({ type: 'triangle', freq: 1200, dur: 0.08, vol: 0.18 }); noise({ dur: 0.1, vol: 0.15, filter: 'highpass', freq: 4000, delay: 0.05 }); },
  till: () => { tone({ type: 'sine', freq: 2093, dur: 0.25, vol: 0.2 }); tone({ type: 'sine', freq: 2637, dur: 0.4, vol: 0.2, delay: 0.1 }); noise({ dur: 0.15, vol: 0.2, filter: 'bandpass', freq: 5000, delay: 0.05 }); },
  splat: () => { noise({ dur: 0.18, vol: 0.35, filter: 'lowpass', freq: 900, to: 150 }); tone({ type: 'sine', freq: 180, to: 60, dur: 0.15, vol: 0.25 }); },
  slip: () => tone({ type: 'sine', freq: 1400, to: 200, dur: 0.45, vol: 0.25 }),
  slurp: () => { noise({ dur: 0.25, vol: 0.3, filter: 'bandpass', freq: 400, to: 2500, q: 4 }); },
  dash: () => noise({ dur: 0.15, vol: 0.2, filter: 'bandpass', freq: 1500, to: 400, q: 1.5 }),
  whistle: () => { tone({ type: 'square', freq: 2200, dur: 0.18, vol: 0.12 }); tone({ type: 'square', freq: 2200, dur: 0.4, vol: 0.12, delay: 0.22 }); },
  caught: () => { tone({ type: 'sawtooth', freq: 300, to: 600, dur: 0.12, vol: 0.15 }); tone({ type: 'triangle', freq: 800, dur: 0.2, vol: 0.2, delay: 0.12 }); },
  angry: () => tone({ type: 'sawtooth', freq: 140, to: 90, dur: 0.4, vol: 0.15 }),
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: i === 3 ? 0.6 : 0.16, vol: 0.25, delay: i * 0.14 })); },
  wahwah: () => { [392, 370, 349, 330].forEach((f, i) => tone({ type: 'sawtooth', freq: f, to: f * 0.97, dur: i === 3 ? 0.8 : 0.3, vol: 0.12, delay: i * 0.32 })); },
};

// Continuous loops (pouring gravy, hoover motor) that start and stop with game state.
export function createLoopSound(kind) {
  let nodes = null;
  return {
    set(on, intensity = 1) {
      const c = audioContext();
      if (!c) return;
      if (on && !nodes) {
        const g = c.createGain();
        g.gain.value = 0;
        g.connect(master);
        if (kind === 'hoover') {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = 120;
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 900;
          o.connect(f).connect(g);
          o.start();
          nodes = { g, o, f };
        } else {
          // glug glug: low filtered noise wobbled by an LFO
          const src = c.createBufferSource();
          const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          src.buffer = buf;
          src.loop = true;
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 350;
          f.Q.value = 8;
          const lfo = c.createOscillator();
          lfo.frequency.value = 7;
          const lg = c.createGain();
          lg.gain.value = 180;
          lfo.connect(lg).connect(f.frequency);
          src.connect(f).connect(g);
          src.start();
          lfo.start();
          nodes = { g, o: src, lfo, f };
        }
      }
      if (nodes) {
        const target = on ? 0.18 * intensity : 0;
        nodes.g.gain.setTargetAtTime(target, c.currentTime, 0.05);
        if (kind === 'hoover') nodes.o.frequency.setTargetAtTime(on ? 110 + 60 * intensity : 80, c.currentTime, 0.1);
        if (!on) {
          const n = nodes;
          nodes = null;
          setTimeout(() => {
            try {
              n.o.stop();
              n.lfo?.stop();
            } catch {
              // already stopped
            }
          }, 300);
        }
      }
    },
  };
}
