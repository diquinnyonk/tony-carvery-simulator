import { updateGame, findFocus } from '../src/game/game.js';
import { rectCenter } from '../src/game/world.js';

export const DT = 1 / 60;
export const idle = { mx: 0, my: 0, actionPressed: false, actionHeld: false, dashPressed: false };

export function step(game, input = idle, frames = 1) {
  for (let i = 0; i < frames; i++) updateGame(game, input, DT);
}

export function wait(game, seconds) {
  step(game, idle, Math.ceil(seconds / DT));
}

// Teleport Tony next to a rectangle (from below / the side) and stop him.
export function standAt(game, rect) {
  const c = rectCenter(rect);
  const p = game.player;
  if (rect.y < 120) {
    p.x = c.x;
    p.y = rect.y + rect.h + p.r + 4;
  } else if (rect.x > 850) {
    p.x = rect.x - p.r - 4;
    p.y = c.y;
  } else {
    p.x = c.x;
    p.y = rect.y + rect.h + p.r + 4;
  }
  p.vx = 0;
  p.vy = 0;
}

export function standAtPoint(game, x, y) {
  const p = game.player;
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
}

export function press(game) {
  updateGame(game, { ...idle, actionPressed: true, actionHeld: true }, DT);
}

export function hold(game, seconds) {
  step(game, { ...idle, actionHeld: true }, Math.ceil(seconds / DT));
}

export function focusLabel(game) {
  return findFocus(game)?.label;
}
