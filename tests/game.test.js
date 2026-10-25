import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, spawnParty, addPuddle, setState } from '../src/game/game.js';
import { LEVELS } from '../src/game/levels.js';
import { step, wait, standAt, standAtPoint, press, hold } from './helpers.js';

const level = (overrides = {}) => ({
  ...LEVELS[1],
  types: { regular: 1 },
  runnerMult: 0,
  spillMult: 0,
  firstSpawn: 999,
  ...overrides,
});

function seatAndOrder(game, party) {
  wait(game, 3); // walk to the queue
  assert.equal(party.state, 'waiting');
  const g = party.guests[0];
  standAtPoint(game, g.x + 30, g.y);
  press(game);
  assert.equal(party.state, 'following');
  const table = game.world.tables[0];
  standAt(game, table);
  press(game);
  assert.equal(party.state, 'seated');
  wait(game, 2.5);
  assert.equal(party.state, 'ordering');
  press(game);
  assert.equal(party.state, 'waitingFood');
  return table;
}

function plateUp(game, meat, gravySeconds = 0.6) {
  standAt(game, game.world.byId[meat]);
  press(game);
  standAt(game, game.world.byId.gravy);
  hold(game, gravySeconds);
}

test('full service loop: seat, order, gravy, serve, bill, pay', () => {
  const game = createGame(level(), { seed: 1 });
  const party = spawnParty(game, { size: 1, meat: 'beef' });
  const table = seatAndOrder(game, party);

  plateUp(game, 'beef');
  assert.equal(game.player.held.kind, 'tray');
  assert.ok(game.player.held.plates[0].gravy >= 1);

  standAt(game, table);
  press(game);
  assert.equal(party.state, 'eating');
  assert.equal(game.player.held, null);

  wait(game, 6);
  assert.equal(party.state, 'wantsBill');

  standAt(game, game.world.byId.till);
  press(game);
  assert.equal(game.player.held.kind, 'bill');
  standAt(game, table);
  press(game);
  assert.equal(game.player.held.kind, 'cash');
  assert.equal(party.state, 'leaving');
  assert.equal(table.party, null);

  standAt(game, game.world.byId.till);
  press(game);
  assert.equal(game.served, 1);
  assert.ok(game.money > 10);
});

test('a dinner without gravy is refused', () => {
  const game = createGame(level(), { seed: 2 });
  const party = spawnParty(game, { size: 1, meat: 'turkey' });
  const table = seatAndOrder(game, party);
  standAt(game, game.world.byId.turkey);
  press(game);
  standAt(game, table);
  press(game);
  assert.equal(party.state, 'waitingFood');
  assert.match(party.bubble.text, /gravy/i);
});

test('big eaters need double gravy', () => {
  const game = createGame(level({ types: { bigEater: 1 } }), { seed: 3 });
  const party = spawnParty(game, { size: 1, type: 'bigEater', meat: 'gammon' });
  const table = seatAndOrder(game, party);
  plateUp(game, 'gammon', 0.5);
  standAt(game, table);
  press(game);
  assert.equal(party.state, 'waitingFood', 'single gravy is not enough');
  standAt(game, game.world.byId.gravy);
  hold(game, 0.6);
  standAt(game, table);
  press(game);
  assert.equal(party.state, 'eating');
});

test('wrong meat is not accepted', () => {
  const game = createGame(level(), { seed: 4 });
  const party = spawnParty(game, { size: 1, meat: 'beef' });
  const table = seatAndOrder(game, party);
  plateUp(game, 'gammon');
  standAt(game, table);
  press(game);
  assert.equal(party.state, 'waitingFood');
  assert.equal(game.player.held.plates.length, 1);
});

test('gravy pot drains and the stove brews a fresh pot', () => {
  const game = createGame(level(), { seed: 5 });
  const gravy = game.world.byId.gravy;
  const stove = game.world.byId.stove;
  gravy.item.level = 5;
  plateUp(game, 'beef', 1);
  assert.equal(gravy.item.level, 0);
  // drop the tray in the bin, then take the pot to the stove
  standAt(game, game.world.byId.bin);
  press(game);
  standAt(game, gravy);
  press(game);
  assert.equal(game.player.held.kind, 'pot');
  standAt(game, stove);
  press(game);
  assert.equal(stove.item.kind, 'pot');
  hold(game, 2.4);
  assert.equal(stove.item.level, 100);
  step(game);
  press(game);
  assert.equal(game.player.held.level, 100);
  standAt(game, gravy);
  press(game);
  assert.equal(gravy.item.level, 100);
});

test('over-pouring spills gravy on the floor', () => {
  const game = createGame(level(), { seed: 6 });
  plateUp(game, 'beef', 2);
  assert.ok(game.puddles.length >= 1);
});

test('the hoover cleans puddles', () => {
  const game = createGame(level(), { seed: 7 });
  addPuddle(game, 600, 330, 16);
  addPuddle(game, 650, 330, 16);
  standAt(game, game.world.byId.hoover);
  press(game);
  assert.equal(game.player.held.kind, 'hoover');
  standAtPoint(game, 600, 330);
  wait(game, 1);
  standAtPoint(game, 650, 330);
  wait(game, 1);
  assert.equal(game.puddles.length, 0);
  assert.equal(game.puddlesCleaned, 2);
});

test('puddles make Tony slide', () => {
  const game = createGame(level(), { seed: 8 });
  standAtPoint(game, 600, 330);
  addPuddle(game, 600, 330, 28);
  step(game, { mx: 1, my: 0 }, 6);
  const slippery = game.player.vx;
  const dry = createGame(level(), { seed: 8 });
  standAtPoint(dry, 600, 330);
  step(dry, { mx: 1, my: 0 }, 6);
  assert.ok(slippery < dry.player.vx * 0.6);
});

function runnerSetup(seed) {
  const game = createGame(level(), { seed });
  const party = spawnParty(game, { size: 1, type: 'chav' });
  seatAndOrder(game, party);
  setState(game, party, 'eating');
  party.guests[0].served = true;
  party.eatTime = 0;
  game.level = { ...game.level, runnerMult: 100 };
  step(game);
  assert.equal(party.state, 'running');
  return { game, party };
}

test('runners who reach the door cost money', () => {
  const { game, party } = runnerSetup(9);
  standAtPoint(game, 800, 550);
  wait(game, 6);
  assert.equal(game.runnersEscaped, 1);
  assert.ok(game.money < 0);
  assert.ok(!game.parties.includes(party));
});

test('touching a runner catches them', () => {
  const { game, party } = runnerSetup(10);
  const g = party.guests[0];
  standAtPoint(game, g.x - 30, g.y);
  step(game, undefined, 3);
  assert.equal(game.runnersCaught, 1);
  assert.equal(party.state, 'wantsBill');
  assert.ok(party.caught);
});

test('impatient guests storm off', () => {
  const game = createGame(level({ patience: 0.1 }), { seed: 11 });
  const party = spawnParty(game, { size: 2 });
  wait(game, 8);
  assert.ok(game.lost >= 2);
  assert.ok(party.angry);
});

test('level fails when the timer runs out', () => {
  const game = createGame(level({ time: 2 }), { seed: 12 });
  wait(game, 2.5);
  assert.ok(game.over);
  assert.equal(game.result.win, false);
  assert.equal(game.result.stars, 0);
});

test('spawner fills the queue during a timed level', () => {
  const game = createGame(LEVELS[4], { seed: 13 });
  wait(game, 20);
  assert.ok(game.parties.length >= 3);
  assert.ok(game.parties.every((p) => p.size >= 3));
});

test('custom characters join the spawn pool', () => {
  const custom = { id: 'c1', name: 'Dave', baseType: 'posh', enabled: true, body: '#123456' };
  const game = createGame(LEVELS[3], { seed: 14, customs: [custom] });
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) {
    const p = spawnParty(game);
    if (p) {
      seen = p.guests.some((g) => g.custom?.id === 'c1' && g.type === 'posh');
      game.parties = [];
    }
  }
  assert.ok(seen);
});
