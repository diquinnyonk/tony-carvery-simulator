// Boot: screen switching, the game loop and wiring audio to game events.
import { createGame, updateGame, drainEvents } from './game/game.js';
import { drawGame, PAUSE_BTN } from './game/render.js';
import { W, H, HUD_H } from './game/world.js';
import { LEVELS } from './game/levels.js';
import { GUEST_TYPES } from './game/guestTypes.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { audioContext } from './audio/sfx.js';
import {
  loadRecordings, playSfx, sayLine, sayTony, speak, setLoop, stopAllLoops,
} from './audio/voice.js';
import { listCharacters, loadProgress, saveProgress } from './storage/db.js';
import { createTitleAnimation } from './screens/title.js';
import { createHowToPlay } from './screens/howToPlay.js';
import { renderLevelSelect, renderIntro, renderResults } from './screens/levelSelect.js';
import { createStudio } from './screens/studio.js';

const $ = (id) => document.getElementById(id);
const VIEW_H = H + HUD_H;

const state = {
  screen: 'title',
  progress: loadProgress(),
  customs: [],
  customsById: new Map(),
  game: null,
  levelIndex: 0,
  paused: true,
  resultShown: false,
  overTimer: 0,
};

const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- Custom characters ----------
const objectUrls = [];
async function refreshCustoms() {
  objectUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  let chars = [];
  try {
    chars = await listCharacters();
  } catch (err) {
    console.warn('Could not load characters', err);
  }
  state.customs = await Promise.all(chars.map(async (c) => {
    const lineUrls = {};
    for (const [k, blob] of Object.entries(c.lines || {})) {
      if (blob) {
        const u = URL.createObjectURL(blob);
        objectUrls.push(u);
        lineUrls[k] = u;
      }
    }
    let photoImg = null;
    if (c.photo) {
      photoImg = new Image();
      photoImg.src = c.photo;
      await photoImg.decode().catch(() => {});
    }
    return { ...c, lineUrls, photoImg };
  }));
  state.customsById = new Map(state.customs.map((c) => [c.id, c]));
}

// ---------- Screens ----------
const title = createTitleAnimation($('title-canvas'));
const howto = createHowToPlay({
  pagesEl: $('howto-pages'),
  prevBtn: $('howto-prev'),
  nextBtn: $('howto-next'),
  dotsEl: $('howto-dots'),
  countEl: $('howto-count'),
  onFinish: () => startLevel(0),
});
const studio = createStudio({
  root: $('screen-studio'),
  soundsEl: $('tab-sounds'),
  charsEl: $('tab-characters'),
  msgEl: $('studio-msg'),
  onCharactersChanged: refreshCustoms,
});

function show(name) {
  if (state.screen === 'title') title.stop();
  if (state.screen === 'howto') howto.hide();
  if (state.screen === 'studio') studio.hide();
  if (state.screen === 'game' && name !== 'game') leaveGame();
  state.screen = name;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  if (name === 'title') title.start();
  if (name === 'howto') howto.show();
  if (name === 'studio') studio.show();
  if (name === 'levels') renderLevelSelect($('level-grid'), state.progress, startLevel);
}

document.querySelectorAll('[data-go]').forEach((b) => {
  b.addEventListener('click', () => {
    audioContext();
    show(b.dataset.go);
  });
});

// ---------- Game ----------
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
const input = createInput({
  stick: $('stick'),
  knob: $('stick-knob'),
  actionBtn: $('btn-action'),
  dashBtn: $('btn-dash'),
});
$('touch-controls').hidden = !isTouch;

function fitCanvas() {
  const pad = isTouch ? 0 : 12;
  const scale = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / VIEW_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.width = Math.floor(W * scale * dpr);
  canvas.height = Math.floor(VIEW_H * scale * dpr);
  state.renderScale = scale * dpr;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function handleEvents(game) {
  for (const ev of drainEvents(game)) {
    switch (ev.type) {
      case 'sfx':
        playSfx(ev.name);
        break;
      case 'say':
        sayLine(ev, state.customsById);
        break;
      case 'speak':
        speak(ev.text, GUEST_TYPES[ev.guestType]?.voice);
        break;
      case 'tony':
        sayTony(ev.line);
        break;
      default:
        break;
    }
  }
}

const loop = createLoop(
  (dt) => {
    const game = state.game;
    if (!game) return;
    const frame = input.poll();
    if (frame.pausePressed && !game.over) setPaused(!state.paused);
    if (state.paused) return;
    updateGame(game, frame, dt);
    handleEvents(game);
    const hoover = game.player.held?.kind === 'hoover';
    setLoop('pour', game.pouring && !game.over);
    setLoop('hoover', hoover && !game.over, game.hoovering ? 1 : 0.35);
    if (game.over && !state.resultShown) {
      state.overTimer += dt;
      if (state.overTimer > 1.3) finishLevel();
    }
  },
  (t) => {
    if (!state.game) return;
    ctx.setTransform(state.renderScale, 0, 0, state.renderScale, 0, 0);
    drawGame(ctx, state.game, t, { touch: isTouch });
  },
);

function setPaused(p) {
  state.paused = p;
  $('pause').hidden = !p || !state.game || state.game.over || !$('level-intro').hidden;
  input.setEnabled(!p);
  if (p) {
    stopAllLoops();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

function startLevel(index) {
  audioContext();
  state.levelIndex = index;
  state.game = createGame(LEVELS[index], { customs: state.customs });
  drainEvents(state.game); // the opening line plays when the shift actually starts
  state.resultShown = false;
  state.overTimer = 0;
  $('results').hidden = true;
  $('pause').hidden = true;
  if (state.screen !== 'game') show('game');
  fitCanvas();
  loop.start();
  renderIntro(
    $('level-intro'),
    index,
    () => {
      audioContext();
      $('level-intro').hidden = true;
      sayTony('start');
      setPaused(false);
    },
    () => {
      $('level-intro').hidden = true;
      show('levels');
    },
  );
  setPaused(true);
}

function finishLevel() {
  state.resultShown = true;
  stopAllLoops();
  input.setEnabled(false);
  const r = state.game.result;
  const i = state.levelIndex;
  if (r.win) {
    state.progress.unlocked = Math.max(state.progress.unlocked, i + 1);
    state.progress.stars[i] = Math.max(state.progress.stars[i] ?? 0, r.stars);
    saveProgress(state.progress);
  }
  renderResults($('results'), i, r, {
    onRetry: () => startLevel(i),
    onNext: () => startLevel(i + 1),
    onMenu: () => show('levels'),
  });
}

function leaveGame() {
  loop.stop();
  setPaused(true);
  state.game = null;
  $('results').hidden = true;
  $('level-intro').hidden = true;
  $('pause').hidden = true;
}

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  const y = ((e.clientY - r.top) / r.height) * VIEW_H;
  const hit = Math.hypot(x - PAUSE_BTN.x, y - PAUSE_BTN.y) < PAUSE_BTN.r + 10;
  if (hit && state.game && !state.game.over && $('level-intro').hidden) setPaused(true);
});
$('resume-btn').addEventListener('click', () => setPaused(false));
$('restart-btn').addEventListener('click', () => startLevel(state.levelIndex));
$('quit-btn').addEventListener('click', () => show('levels'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.game && !state.game.over && $('level-intro').hidden) setPaused(true);
});

// ---------- Boot ----------
show('title');
loadRecordings();
refreshCustoms();

// Handy for testing in the console / automated checks.
window.tony = { state, startLevel, show };
