// Level select cards, the pre-level briefing and the results card.
import { LEVELS } from '../game/levels.js';
import { GUEST_TYPES, randomLook } from '../game/guestTypes.js';
import { drawPerson } from '../engine/draw.js';
import { createRng } from '../game/rng.js';
import { money } from '../game/game.js';

const starRow = (n) => [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');

export function renderLevelSelect(gridEl, progress, onPick) {
  gridEl.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const locked = i > progress.unlocked;
    const btn = document.createElement('button');
    btn.className = `level-card${lvl.tutorial ? ' tutorial' : ''}`;
    btn.disabled = locked;
    btn.innerHTML = `
      ${locked ? '<span class="lock">LOCKED</span>' : ''}
      <span class="num">${lvl.tutorial ? 'S' : i}</span>
      <span class="name">${lvl.name}</span>
      <span class="sub">${lvl.subtitle}</span>
      <span class="stars">${starRow(progress.stars[i] ?? 0)}</span>`;
    btn.onclick = () => onPick(i);
    gridEl.appendChild(btn);
  });
}

function newTypes(index) {
  const lvl = LEVELS[index];
  const prev = new Set(index > 0 ? Object.keys(LEVELS[index - 1].types ?? {}) : []);
  return Object.keys(lvl.types ?? {}).filter((k) => !prev.has(k));
}

export function renderIntro(el, index, onStart, onBack) {
  const lvl = LEVELS[index];
  const goal = lvl.time
    ? `Serve ${lvl.target} guests in ${lvl.time >= 120 ? `${lvl.time / 60} minutes` : `${lvl.time / 60} minute`}`
    : 'Tutorial: no clock, just learn';
  const types = newTypes(index);
  el.innerHTML = `
    <div class="modal">
      <h2>${lvl.tutorial ? 'Starter' : `Level ${index}`}: ${lvl.name}</h2>
      <p class="goal">${goal}</p>
      <p>${lvl.intro}</p>
      ${types.length ? `<p><b>${index === 1 ? 'On tonight' : 'New guests'}:</b></p><div class="newbies"></div>` : ''}
      <div class="modal-actions">
        <button class="btn big" data-act="start">Start shift</button>
        <button class="btn ghost" data-act="back">Back</button>
      </div>
    </div>`;
  const box = el.querySelector('.newbies');
  if (box) {
    const rng = createRng(index * 31);
    for (const k of types) {
      const wrap = document.createElement('div');
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const g = c.getContext('2d');
      g.scale(2, 2);
      const look = randomLook(k, rng);
      drawPerson(g, 32, 40, look, { scale: 1.1 / Math.max(1, look.size * 0.85) });
      wrap.appendChild(c);
      wrap.append(GUEST_TYPES[k].name);
      box.appendChild(wrap);
    }
  }
  el.querySelector('[data-act="start"]').onclick = onStart;
  el.querySelector('[data-act="back"]').onclick = onBack;
  el.hidden = false;
}

const WIN_TITLES = ['Gravy Legend!', 'Shift Smashed!', 'Lovely Jubbly!'];
const FAIL_TITLES = ['Gravy Disaster!', 'Doors Shut!', 'Not Enough Gravy!'];

export function renderResults(el, index, result, { onRetry, onNext, onMenu }) {
  const lvl = LEVELS[index];
  const hasNext = result.win && index + 1 < LEVELS.length;
  const title = result.win ? WIN_TITLES[result.stars - 1] ?? WIN_TITLES[0] : FAIL_TITLES[index % FAIL_TITLES.length];
  el.innerHTML = `
    <div class="modal">
      <h2>${title}</h2>
      <div class="result-stars">${starRow(result.stars)}</div>
      <p class="goal">${result.served} / ${result.target} served</p>
      <div class="stats">
        <span>Takings</span><b>${money(result.money)}</b>
        <span>Tips</span><b>${money(result.tips)}</b>
        <span>Runners caught</span><b>${result.runnersCaught}</b>
        <span>Runners escaped</span><b>${result.runnersEscaped}</b>
        <span>Puddles hoovered</span><b>${result.puddlesCleaned}</b>
        <span>Puddles left</span><b>${result.puddlesLeft}</b>
        <span>Guests who stormed off</span><b>${result.lost}</b>
        ${lvl.time ? `<span>Time left</span><b>${Math.ceil(result.timeLeft)}s</b>` : ''}
      </div>
      ${result.win && !lvl.tutorial ? '<p class="hint">Stars: 1 for winning, 1 for 25% of the clock left, 1 for no escaped runners and a clean floor.</p>' : ''}
      ${!result.win ? '<p>Tip: carry up to 4 plates on a tray, and keep that gravy pot topped up.</p>' : ''}
      <div class="modal-actions">
        ${hasNext ? '<button class="btn big" data-act="next">Next level</button>' : ''}
        <button class="btn ${hasNext ? 'ghost' : ''}" data-act="retry">${result.win ? 'Play again' : 'Try again'}</button>
        <button class="btn ghost" data-act="menu">Level select</button>
      </div>
    </div>`;
  el.querySelector('[data-act="retry"]').onclick = onRetry;
  el.querySelector('[data-act="menu"]').onclick = onMenu;
  el.querySelector('[data-act="next"]')?.addEventListener('click', onNext);
  el.hidden = false;
}
