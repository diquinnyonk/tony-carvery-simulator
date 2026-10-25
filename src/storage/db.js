// IndexedDB storage for recorded sounds and custom characters (stays on this device).
const DB_NAME = 'tony-carvery';
const VERSION = 1;
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sounds')) db.createObjectStore('sounds', { keyPath: 'slot' });
      if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const listSounds = () => tx('sounds', 'readonly', (s) => s.getAll());
export const putSound = (slot, blob) => tx('sounds', 'readwrite', (s) => s.put({ slot, blob, updated: Date.now() }));
export const deleteSound = (slot) => tx('sounds', 'readwrite', (s) => s.delete(slot));

export const listCharacters = () => tx('characters', 'readonly', (s) => s.getAll());
export const putCharacter = (c) => tx('characters', 'readwrite', (s) => s.put(c));
export const deleteCharacter = (id) => tx('characters', 'readwrite', (s) => s.delete(id));

// Level progress lives in localStorage (small and simple).
const PROGRESS_KEY = 'tony-carvery-progress';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { unlocked: 1, stars: {}, ...JSON.parse(raw) };
  } catch {
    // storage unavailable: play without saving
  }
  return { unlocked: 1, stars: {} };
}

export function saveProgress(p) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
