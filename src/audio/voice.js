// Plays the user's recordings when they exist, otherwise the built-in synth sounds and speech.
import { SFX, createLoopSound, audioContext } from './sfx.js';
import { GUEST_TYPES, TYPE_KEYS } from '../game/guestTypes.js';
import { GUEST_LINES, LINE_KINDS, LINE_LABELS, TONY_LINES } from '../game/lines.js';
import { listSounds } from '../storage/db.js';

export const SOUND_SLOTS = [
  { group: 'Tony', key: 'tony_start', label: 'Opening catchphrase (level start)', text: TONY_LINES.start },
  { group: 'Tony', key: 'tony_caught', label: 'Catching a runner', text: TONY_LINES.caught },
  { group: 'Tony', key: 'tony_win', label: 'Level won', text: TONY_LINES.win },
  { group: 'Tony', key: 'tony_fail', label: 'Level failed', text: TONY_LINES.fail },
  { group: 'Sound effects', key: 'sfx_pour', label: 'Pouring gravy (loops)', loop: 'pour' },
  { group: 'Sound effects', key: 'sfx_hoover', label: 'Hoover motor (loops)', loop: 'hoover' },
  { group: 'Sound effects', key: 'sfx_slurp', label: 'Hoover slurps up a puddle', sfx: 'slurp' },
  { group: 'Sound effects', key: 'sfx_splat', label: 'Gravy splat on the floor', sfx: 'splat' },
  { group: 'Sound effects', key: 'sfx_slip', label: 'Slipping on gravy', sfx: 'slip' },
  { group: 'Sound effects', key: 'sfx_ready', label: 'Fresh gravy ready', sfx: 'ready' },
  { group: 'Sound effects', key: 'sfx_till', label: 'Till ka-ching', sfx: 'till' },
  { group: 'Sound effects', key: 'sfx_whistle', label: 'Runner alarm', sfx: 'whistle' },
  { group: 'Sound effects', key: 'sfx_caught', label: 'Runner caught', sfx: 'caught' },
  { group: 'Sound effects', key: 'sfx_carve', label: 'Carving meat', sfx: 'carve' },
  { group: 'Sound effects', key: 'sfx_fanfare', label: 'Win jingle', sfx: 'fanfare' },
  { group: 'Sound effects', key: 'sfx_wahwah', label: 'Lose jingle', sfx: 'wahwah' },
  ...TYPE_KEYS.flatMap((type) => LINE_KINDS.map((kind) => ({
    group: `${GUEST_TYPES[type].name} guests`,
    key: `${type}_${kind}`,
    label: LINE_LABELS[kind],
    text: GUEST_LINES[type][kind][0].replace('{n}', 'two').replace('{meat}', 'beef'),
    type,
  }))),
];

const urls = new Map();
let voices = [];
let busyUntil = 0;

function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices();
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

function britishVoice() {
  return voices.find((v) => v.lang === 'en-GB' && /male|daniel|george|arthur/i.test(v.name))
    || voices.find((v) => v.lang === 'en-GB')
    || voices.find((v) => v.lang?.startsWith('en'));
}

export async function loadRecordings() {
  try {
    const rows = await listSounds();
    for (const r of rows) setRecording(r.slot, r.blob);
  } catch (err) {
    console.warn('Could not load recordings', err);
  }
}

export function setRecording(slot, blob) {
  if (urls.has(slot)) URL.revokeObjectURL(urls.get(slot));
  urls.delete(slot);
  if (blob) urls.set(slot, URL.createObjectURL(blob));
}

export const hasRecording = (slot) => urls.has(slot);

export function playUrl(url, { volume = 1, loop = false } = {}) {
  const a = new Audio(url);
  a.volume = volume;
  a.loop = loop;
  a.play().catch(() => {});
  a.addEventListener('loadedmetadata', () => {
    if (!loop && Number.isFinite(a.duration)) busyUntil = Math.max(busyUntil, performance.now() + a.duration * 1000);
  });
  return a;
}

export function speak(text, { pitch = 1, rate = 1, priority = false } = {}) {
  if (!('speechSynthesis' in window)) return;
  if (!priority && (speechSynthesis.speaking || performance.now() < busyUntil)) return;
  if (priority) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = britishVoice();
  if (v) u.voice = v;
  u.lang = 'en-GB';
  u.pitch = pitch;
  u.rate = rate;
  u.volume = 0.9;
  speechSynthesis.speak(u);
}

export function playSfx(name) {
  const slot = `sfx_${name}`;
  if (urls.has(slot)) playUrl(urls.get(slot));
  else SFX[name]?.();
}

// Loops: pouring gravy and the hoover motor
const loops = {};
const recLoops = {};
export function setLoop(kind, on, intensity = 1) {
  const slot = `sfx_${kind}`;
  if (urls.has(slot)) {
    if (on && !recLoops[kind]) recLoops[kind] = playUrl(urls.get(slot), { loop: true, volume: 0.8 });
    if (!on && recLoops[kind]) {
      recLoops[kind].pause();
      recLoops[kind] = null;
    }
    return;
  }
  loops[kind] ??= createLoopSound(kind);
  loops[kind].set(on, intensity);
}

export function stopAllLoops() {
  for (const k of ['pour', 'hoover']) setLoop(k, false);
}

// Play a guest line: a custom character's own recording, a recorded slot, or speech.
export function sayLine({ guestType, customId, line, text }, customsById) {
  const custom = customId ? customsById.get(customId) : null;
  const now = performance.now();
  const customUrl = custom?.lineUrls?.[line];
  const slotUrl = urls.get(`${guestType}_${line}`);
  const url = customUrl || slotUrl;
  if (url) {
    if (now < busyUntil && line !== 'run') return;
    busyUntil = now + 1500;
    playUrl(url);
    return;
  }
  const v = GUEST_TYPES[guestType]?.voice ?? { pitch: 1, rate: 1 };
  speak(text, { ...v, priority: line === 'run' });
}

export function sayTony(line) {
  const url = urls.get(`tony_${line}`);
  if (url) {
    busyUntil = performance.now() + 2000;
    playUrl(url);
    return;
  }
  speak(TONY_LINES[line], { pitch: 0.9, rate: 1.05, priority: true });
}

// Preview a slot in the studio (recording if there is one, else the default).
export function previewSlot(slot) {
  audioContext();
  if (urls.has(slot.key)) return playUrl(urls.get(slot.key));
  if (slot.sfx) return SFX[slot.sfx]?.();
  if (slot.loop) {
    setLoop(slot.loop, true);
    setTimeout(() => setLoop(slot.loop, false), 1200);
    return null;
  }
  const v = slot.type ? GUEST_TYPES[slot.type].voice : { pitch: 0.9, rate: 1.05 };
  speak(slot.text, { ...v, priority: true });
  return null;
}
