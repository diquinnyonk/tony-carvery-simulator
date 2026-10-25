import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/game.js';
import { LEVELS } from '../src/game/levels.js';
import { tutorialPrompt } from '../src/game/tutorial.js';
import { step, wait, standAt, standAtPoint, press, hold } from './helpers.js';

test('the Starter tutorial can be completed step by step', () => {
  const game = createGame(LEVELS[0], { seed: 42 });
  const w = game.world;
  const idx = () => game.tutorial.index;

  step(game, { mx: 1, my: 0 }, 60);
  step(game);
  assert.equal(idx(), 1, 'moving completes step 0');
  wait(game, 3);
  const party = game.tutParty;
  const g = party.guests[0];
  standAtPoint(game, g.x + 30, g.y);
  press(game);
  step(game);
  assert.equal(idx(), 2);

  standAt(game, w.tables[0]);
  press(game);
  step(game);
  assert.equal(idx(), 3);
  wait(game, 2.5);
  press(game);
  step(game);
  assert.equal(idx(), 4);

  standAt(game, w.byId.beef);
  press(game);
  step(game);
  assert.equal(idx(), 5);
  standAt(game, w.byId.gravy);
  hold(game, 0.5);
  step(game);
  assert.equal(idx(), 6);
  standAt(game, w.tables[0]);
  press(game);
  step(game);
  assert.equal(idx(), 7);

  assert.equal(w.byId.gravy.item.level, 0, 'pot is emptied for the lesson');
  standAt(game, w.byId.gravy);
  press(game);
  standAt(game, w.byId.stove);
  press(game);
  step(game);
  assert.equal(idx(), 8);
  hold(game, 2.4);
  step(game);
  assert.equal(idx(), 9);
  step(game);
  press(game);
  standAt(game, w.byId.gravy);
  press(game);
  step(game);
  assert.equal(idx(), 10);
  step(game);
  assert.equal(game.puddles.length, 3);

  standAt(game, w.byId.hoover);
  press(game);
  step(game);
  assert.equal(idx(), 11);
  for (const d of [...game.puddles]) {
    standAtPoint(game, d.x, d.y);
    wait(game, 1);
  }
  assert.equal(game.puddles.length, 0);
  step(game);
  assert.equal(idx(), 12);
  standAt(game, w.byId.hoover);
  press(game);
  step(game);
  assert.equal(idx(), 13);

  step(game);
  assert.equal(party.state, 'running');
  wait(game, 10);
  assert.equal(game.runnersEscaped, 0, 'tutorial runner never escapes');
  standAtPoint(game, g.x + 25, g.y);
  step(game, undefined, 2);
  assert.ok(party.caught);
  step(game);
  assert.equal(idx(), 14);

  standAt(game, w.byId.till);
  press(game);
  wait(game, 1);
  standAt(game, w.tables[0]);
  press(game);
  step(game);
  assert.equal(idx(), 15);
  assert.ok(tutorialPrompt(game).text.includes('bank'));
  standAt(game, w.byId.till);
  press(game);
  assert.ok(game.over);
  assert.equal(game.result.win, true);
  assert.equal(game.result.stars, 3);
});
