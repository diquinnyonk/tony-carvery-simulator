// Core game simulation. No DOM access here so it can run under node tests.
import { createRng } from './rng.js';
import {
  createWorld, collideCircle, distToRect, QUEUE_SPOTS, ENTRY_POINT, DOOR_POINT,
  MEATS, MEAT_NAMES, MEAT_PRICES, W, H, COUNTER_FRONT,
} from './world.js';
import { GUEST_TYPES, randomLook } from './guestTypes.js';
import { BASE_PATIENCE } from './levels.js';
import { GUEST_LINES, CAUGHT_LINES, NO_GRAVY_LINES, MORE_GRAVY_LINES, fillLine } from './lines.js';
import { createTutorial, updateTutorial } from './tutorial.js';

export const PLAYER_SPEED = 210;
export const HOOVER_SPEED = 185;
export const DASH_SPEED = 560;
export const INTERACT_RANGE = 30;
export const GRAVY_PER_UNIT = 10; // pot level used per unit of gravy on a plate
export const POUR_RATE = 2.6; // gravy units per second
export const STIR_TIME = 2.2; // seconds of stirring for a fresh pot
export const MAX_TRAY = 4;
export const MAX_PUDDLES = 30;
export const HOOVER_RATE = 34; // puddle radius sucked per second
export const MENU_TIME = 2.2;
export const RUNNER_PENALTY = 5; // pounds lost per guest who escapes

export function createGame(level, opts = {}) {
  const rng = createRng(opts.seed ?? Date.now());
  const world = createWorld(level.tables);
  if (level.potStart != null) world.byId.gravy.item.level = level.potStart;
  const game = {
    level,
    rng,
    world,
    player: {
      x: 560, y: 330, vx: 0, vy: 0, r: 16, fx: 0, fy: 1,
      held: null, dashT: 0, dashCd: 0, onPuddle: false, walk: 0, slipCd: 0,
    },
    parties: [],
    puddles: [],
    floats: [],
    events: [],
    timeLeft: level.time,
    elapsed: 0,
    served: 0,
    money: 0,
    tips: 0,
    lost: 0,
    runnersCaught: 0,
    runnersEscaped: 0,
    puddlesCleaned: 0,
    spawnTimer: level.firstSpawn ?? 1,
    nextId: 1,
    customs: (opts.customs || []).filter((c) => c.enabled !== false),
    focus: null,
    pouring: false,
    stirring: false,
    hoovering: false,
    overflowT: 0,
    moved: 0,
    over: false,
    result: null,
    tutorial: null,
  };
  if (level.tutorial) game.tutorial = createTutorial(game);
  emit(game, { type: 'tony', line: 'start' });
  return game;
}

function emit(game, ev) {
  game.events.push(ev);
}
function sfx(game, name) {
  emit(game, { type: 'sfx', name });
}
function float(game, text, x, y, color = '#fff') {
  game.floats.push({ text, x, y, t: 1.4, color });
}
const round2 = (n) => Math.round(n * 100) / 100;
export const money = (n) => `£${n.toFixed(2)}`;

// ---------- Parties ----------

function freeQueueSlot(game) {
  const used = new Set(
    game.parties.filter((p) => p.state === 'arriving' || p.state === 'waiting').map((p) => p.queueSlot),
  );
  for (let i = 0; i < QUEUE_SPOTS.length; i++) if (!used.has(i)) return i;
  return -1;
}

function customLook(c) {
  return {
    skin: c.skin || '#eab894',
    hair: c.hair || '#2b1d12',
    body: c.body || '#3f6fb5',
    hat: c.hat || 'none',
    accessory: c.accessory || 'none',
    size: c.size || 1,
    face: 'normal',
    photo: c.photoImg || null,
    name: c.name,
  };
}

export function spawnParty(game, opts = {}) {
  const { rng, level } = game;
  const slot = freeQueueSlot(game);
  if (slot < 0) return null;
  const size = Math.min(4, opts.size ?? rng.pick(level.sizes ?? [1]));
  const leadType = opts.type ?? rng.weighted(level.types);
  const guests = [];
  for (let i = 0; i < size; i++) {
    let type = i === 0 || rng.chance(0.65) ? leadType : rng.weighted(level.types);
    let custom = null;
    if (!level.tutorial && !opts.type && game.customs.length && rng.chance(0.3)) {
      custom = rng.pick(game.customs);
      type = GUEST_TYPES[custom.baseType] ? custom.baseType : 'regular';
    }
    const def = GUEST_TYPES[type];
    const look = custom ? customLook(custom) : randomLook(type, rng);
    guests.push({
      type,
      custom,
      look,
      r: 13 * look.size,
      x: ENTRY_POINT.x - 40 - i * 18,
      y: ENTRY_POINT.y + (i % 2) * 12,
      meat: opts.meat ?? rng.pick(MEATS),
      gravyNeed: def.gravyNeed,
      served: false,
      plateGravy: 0,
      moving: false,
      phase: rng.next() * 6,
      seat: i,
    });
  }
  const party = {
    id: game.nextId++,
    guests,
    size,
    state: 'arriving',
    queueSlot: slot,
    table: null,
    timer: 0,
    patience: 0,
    patienceMax: 0,
    moodSum: 0,
    moodN: 0,
    caught: false,
    complained: false,
    bubble: null,
    holdEating: false,
    eatTime: (level.eatTime ?? 5) * (guests.some((g) => g.type === 'bigEater') ? 1.3 : 1),
    gone: false,
  };
  game.parties.push(party);
  return party;
}

function patienceMult(game, p) {
  const typeMult = Math.min(...p.guests.map((g) => GUEST_TYPES[g.type].patience));
  return typeMult * (game.level.patience ?? 1);
}

export function setState(game, p, state) {
  if (BASE_PATIENCE[p.state] && p.patienceMax > 0) {
    p.moodSum += Math.max(0, p.patience / p.patienceMax);
    p.moodN += 1;
  }
  p.state = state;
  p.timer = 0;
  p.complained = false;
  if (BASE_PATIENCE[state]) {
    p.patienceMax = BASE_PATIENCE[state] * patienceMult(game, p);
    p.patience = p.patienceMax;
  } else {
    p.patienceMax = 0;
  }
}

function mood(p) {
  return p.moodN ? p.moodSum / p.moodN : 1;
}

export function say(game, party, kind, vars = {}, guest = party.guests[0]) {
  const lines = GUEST_LINES[guest.type]?.[kind] ?? GUEST_LINES.regular[kind];
  const text = fillLine(game.rng.pick(lines), {
    n: party.size,
    meat: MEAT_NAMES[vars.meat ?? guest.meat].toLowerCase(),
  });
  party.bubble = { text, t: 3.2 };
  emit(game, { type: 'say', guestType: guest.type, customId: guest.custom?.id ?? null, line: kind, text });
}

function bubble(game, party, text) {
  party.bubble = { text, t: 2.6 };
  emit(game, { type: 'speak', text, guestType: party.guests[0].type });
}

function moveTo(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.5) {
    g.x = tx;
    g.y = ty;
    g.moving = false;
    return true;
  }
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  g.moving = true;
  return step >= d;
}

const GROUP_OFFSETS = [
  [[0, 0]],
  [[-12, 0], [12, 0]],
  [[-14, -10], [14, -10], [0, 14]],
  [[-13, -13], [13, -13], [-13, 13], [13, 13]],
];

function moveGroup(p, spot, speed, dt) {
  const offs = GROUP_OFFSETS[p.size - 1];
  let all = true;
  p.guests.forEach((g, i) => {
    if (!moveTo(g, spot.x + offs[i][0] * 1.7, spot.y + offs[i][1] * 1.2, speed, dt)) all = false;
  });
  return all;
}

function moveToSeats(p, dt) {
  p.guests.forEach((g, i) => {
    const s = p.table.seatPos[i];
    moveTo(g, s.x, s.y, 200, dt);
  });
}

function followPlayer(game, p, dt) {
  const pl = game.player;
  let leadX = pl.x - pl.fx * 34;
  let leadY = pl.y - pl.fy * 34;
  p.guests.forEach((g) => {
    const dx = leadX - g.x;
    const dy = leadY - g.y;
    const d = Math.hypot(dx, dy);
    const gap = 6;
    if (d > gap) {
      const step = Math.min(d - gap, 260 * dt);
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
      g.moving = step > 0.3;
    } else g.moving = false;
    leadX = g.x;
    leadY = g.y;
    // keep the next guest a body-length behind this one
    const ox = g.x - pl.x;
    const oy = g.y - pl.y;
    const od = Math.hypot(ox, oy) || 1;
    leadX = g.x + (ox / od) * 24;
    leadY = g.y + (oy / od) * 24;
  });
}

function walkOut(g, speed, dt, stopAtEntry) {
  if (g.x > ENTRY_POINT.x + 12 || stopAtEntry) {
    moveTo(g, ENTRY_POINT.x + 10, ENTRY_POINT.y, speed, dt);
    return false;
  }
  moveTo(g, DOOR_POINT.x, DOOR_POINT.y, speed, dt);
  return g.x <= DOOR_POINT.x + 2;
}

function freeTable(p) {
  if (p.table) {
    p.table.party = null;
    p.table = null;
  }
}

function leaveAngry(game, p) {
  game.lost += p.size;
  say(game, p, 'complain');
  float(game, `${p.size} guest${p.size > 1 ? 's' : ''} stormed off!`, p.guests[0].x, p.guests[0].y - 30, '#ff8a80');
  sfx(game, 'angry');
  freeTable(p);
  p.queueSlot = -1;
  setState(game, p, 'leaving');
  p.angry = true;
}

export function startRunner(game, p) {
  setState(game, p, 'running');
  say(game, p, 'run');
  sfx(game, 'whistle');
  float(game, 'RUNNER!', p.guests[0].x, p.guests[0].y - 34, '#ff5252');
}

function catchRunner(game, p) {
  game.runnersCaught += 1;
  p.caught = true;
  setState(game, p, 'wantsBill');
  bubble(game, p, game.rng.pick(CAUGHT_LINES));
  emit(game, { type: 'tony', line: 'caught' });
  sfx(game, 'caught');
  float(game, 'Caught!', game.player.x, game.player.y - 34, '#ffe082');
}

function runnerEscaped(game, p) {
  game.runnersEscaped += 1;
  game.lost += p.size;
  const loss = RUNNER_PENALTY * p.size;
  game.money = round2(game.money - loss);
  float(game, `Runner! -${money(loss)}`, 60, 470, '#ff5252');
  sfx(game, 'angry');
  freeTable(p);
  p.gone = true;
}

function finishEating(game, p) {
  const chance = Math.max(...p.guests.map((g) => GUEST_TYPES[g.type].runner)) * (game.level.runnerMult ?? 1);
  if (!game.tutorial && !p.caught && game.rng.chance(chance)) {
    startRunner(game, p);
  } else {
    setState(game, p, 'wantsBill');
    bubble(game, p, 'Bill please!');
    sfx(game, 'ding');
  }
}

function updateParty(game, p, dt) {
  const frozen = !!game.tutorial;
  p.timer += dt;
  if (p.bubble) {
    p.bubble.t -= dt;
    if (p.bubble.t <= 0) p.bubble = null;
  }
  if (BASE_PATIENCE[p.state] && !frozen) {
    p.patience -= dt;
    if (!p.complained && p.patience < p.patienceMax * 0.35) {
      p.complained = true;
      say(game, p, 'complain');
    }
    if (p.patience <= 0) {
      if (p.state === 'wantsBill') startRunner(game, p);
      else leaveAngry(game, p);
      return;
    }
  }
  switch (p.state) {
    case 'arriving':
      if (moveGroup(p, QUEUE_SPOTS[p.queueSlot], 150, dt)) {
        setState(game, p, 'waiting');
        say(game, p, 'greet');
      }
      break;
    case 'waiting':
      moveGroup(p, QUEUE_SPOTS[p.queueSlot], 150, dt);
      break;
    case 'following':
      followPlayer(game, p, dt);
      break;
    case 'seated':
      moveToSeats(p, dt);
      if (p.timer > MENU_TIME) {
        setState(game, p, 'ordering');
        sfx(game, 'ding');
      }
      break;
    case 'ordering':
    case 'waitingFood':
    case 'wantsBill':
      moveToSeats(p, dt);
      break;
    case 'eating':
      moveToSeats(p, dt);
      if (!frozen) {
        p.guests.forEach((g, i) => {
          const rate = GUEST_TYPES[g.type].spill * (game.level.spillMult ?? 1) * (g.plateGravy > 1.5 ? 1.5 : 1);
          if (game.rng.chance(rate * dt)) {
            const side = p.table.seatPos[i].side;
            addPuddle(game, g.x + side * 26 + game.rng.range(-8, 8), g.y + game.rng.range(-16, 16), game.rng.range(10, 16));
            sfx(game, 'splat');
          }
        });
      }
      if (!p.holdEating && p.timer >= p.eatTime) finishEating(game, p);
      break;
    case 'running': {
      const pl = game.player;
      let out = true;
      for (const g of p.guests) {
        const speed = frozen ? 70 : GUEST_TYPES[g.type].runSpeed;
        if (!walkOut(g, speed, dt, frozen)) out = false;
        if (Math.hypot(g.x - pl.x, g.y - pl.y) < pl.r + g.r + 6) {
          catchRunner(game, p);
          return;
        }
      }
      if (out) runnerEscaped(game, p);
      break;
    }
    case 'leaving': {
      let out = true;
      for (const g of p.guests) if (!walkOut(g, 150, dt, false)) out = false;
      if (out) p.gone = true;
      break;
    }
    default:
      break;
  }
}

// ---------- Puddles ----------

export function addPuddle(game, x, y, r = 14) {
  x = Math.max(30, Math.min(W - 40, x));
  y = Math.max(COUNTER_FRONT + 16, Math.min(H - 20, y));
  for (const t of game.world.tables) {
    if (x > t.x - 4 && x < t.x + t.w + 4 && y > t.y - 4 && y < t.y + t.h + 4) {
      x = x < t.x + t.w / 2 ? t.x - r - 4 : t.x + t.w + r + 4;
    }
  }
  const near = game.puddles.find((d) => Math.hypot(d.x - x, d.y - y) < d.r);
  if (near) {
    near.r = Math.min(30, near.r + r * 0.4);
    return near;
  }
  if (game.puddles.length >= MAX_PUDDLES) return null;
  const puddle = { x, y, r, seed: game.rng.next() * 100 };
  game.puddles.push(puddle);
  return puddle;
}

// ---------- Player ----------

function updatePlayer(game, input, dt) {
  const p = game.player;
  let mx = input.mx || 0;
  let my = input.my || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  if (len > 0.15) {
    p.fx = mx / Math.max(len, 1e-6);
    p.fy = my / Math.max(len, 1e-6);
    const fl = Math.hypot(p.fx, p.fy);
    p.fx /= fl;
    p.fy /= fl;
  }
  const hoover = p.held?.kind === 'hoover';
  p.onPuddle = game.puddles.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < d.r + 2);
  const slipping = p.onPuddle && !hoover;
  p.dashCd -= dt;
  p.dashT -= dt;
  p.slipCd -= dt;
  if (input.dashPressed && p.dashCd <= 0) {
    p.vx = p.fx * DASH_SPEED;
    p.vy = p.fy * DASH_SPEED;
    p.dashT = 0.16;
    p.dashCd = 0.6;
    sfx(game, 'dash');
  }
  if (p.dashT <= 0) {
    const speed = hoover ? HOOVER_SPEED : PLAYER_SPEED;
    const k = Math.min(1, (slipping ? 2.2 : 16) * dt);
    p.vx += (mx * speed - p.vx) * k;
    p.vy += (my * speed - p.vy) * k;
  }
  const spd = Math.hypot(p.vx, p.vy);
  if (slipping && spd > 90 && p.slipCd <= 0) {
    p.slipCd = 1.2;
    sfx(game, 'slip');
    float(game, 'Whoa!', p.x, p.y - 30, '#ffcc80');
  }
  const ox = p.x;
  const oy = p.y;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  collideCircle(p, game.world.solids);
  const moved = Math.hypot(p.x - ox, p.y - oy);
  game.moved += moved;
  p.walk += moved;
  p.slipping = slipping && spd > 40;
}

// ---------- Actions ----------

const act = (label, run) => ({ label, ok: true, run });
const hint = (label) => ({ label, ok: false });

function newPlate(meat) {
  return { meat, gravy: 0 };
}

function stationAction(game, s) {
  const p = game.player;
  const held = p.held;
  switch (s.kind) {
    case 'counter':
      if (!held && s.item) return act('Pick up', () => { p.held = s.item; s.item = null; sfx(game, 'pickup'); });
      if (held && !s.item) return act('Put down', () => { s.item = held; p.held = null; sfx(game, 'putdown'); });
      return null;
    case 'carvery': {
      const name = MEAT_NAMES[s.meat];
      if (!held) return act(`Carve ${name}`, () => { p.held = { kind: 'tray', plates: [newPlate(s.meat)] }; sfx(game, 'carve'); });
      if (held.kind === 'tray') {
        if (held.plates.length >= MAX_TRAY) return hint('Tray full (4 plates max)');
        return act(`Add ${name}`, () => { held.plates.push(newPlate(s.meat)); sfx(game, 'carve'); });
      }
      return hint('Hands full!');
    }
    case 'gravy': {
      const pot = s.item;
      if (held?.kind === 'tray') {
        if (!pot) return hint('No pot! It\'s on the stove');
        if (pot.level <= 0) return hint('Pot empty! Brew more on the stove');
        return { label: 'Hold: pour gravy', ok: true, hold: (dt) => pourGravy(game, s, held, dt) };
      }
      if (!held && pot) {
        return act(pot.level < 35 ? 'Take pot to the stove' : 'Pick up pot', () => { p.held = pot; s.item = null; sfx(game, 'pickup'); });
      }
      if (held?.kind === 'pot' && !pot) return act('Put gravy pot here', () => { s.item = held; p.held = null; sfx(game, 'putdown'); });
      return null;
    }
    case 'stove': {
      const pot = s.item;
      if (held?.kind === 'pot' && !pot) return act('Put pot on stove', () => { s.item = held; held.stir = 0; p.held = null; sfx(game, 'putdown'); });
      if (pot && pot.level < 100) return { label: 'Hold: stir gravy', ok: true, hold: (dt) => stir(game, s, dt) };
      if (pot && !held) return act('Pick up fresh gravy', () => { p.held = pot; s.item = null; sfx(game, 'pickup'); });
      return null;
    }
    case 'bin':
      if (held?.kind === 'tray') return act('Bin the plates', () => { p.held = null; sfx(game, 'bin'); });
      if (held?.kind === 'bill') return act('Bin the bill', () => { p.held = null; sfx(game, 'bin'); });
      return null;
    case 'till':
      if (held?.kind === 'cash') return act(`Bank ${money(held.amount + held.tip)}`, () => bank(game));
      if (!held) return act('Grab a bill', () => { p.held = { kind: 'bill' }; sfx(game, 'paper'); });
      if (held.kind === 'bill') return act('Put bill back', () => { p.held = null; sfx(game, 'paper'); });
      return null;
    case 'hoover':
      if (!held && s.item) return act('Grab the Gravy Hoover 3000', () => { p.held = s.item; s.item = null; sfx(game, 'pickup'); });
      if (held?.kind === 'hoover' && !s.item) return act('Put hoover away', () => { s.item = held; p.held = null; sfx(game, 'putdown'); });
      return null;
    default:
      return null;
  }
}

function pourGravy(game, s, tray, dt) {
  const pot = s.item;
  if (!pot || pot.level <= 0) return;
  game.pouring = true;
  const amount = POUR_RATE * dt;
  const plate = tray.plates.find((pl) => pl.gravy < 1) ?? tray.plates.find((pl) => pl.gravy < 2);
  if (plate) {
    const cap = plate.gravy < 1 ? 1 : 2;
    const add = Math.min(amount, cap - plate.gravy);
    plate.gravy += add;
    if (cap - plate.gravy < 1e-6) plate.gravy = cap;
    pot.level = Math.max(0, pot.level - add * GRAVY_PER_UNIT);
  } else {
    // Every plate is swimming. Keep pouring and it goes on the floor.
    game.overflowT += dt;
    pot.level = Math.max(0, pot.level - amount * GRAVY_PER_UNIT * 0.5);
    if (game.overflowT > 0.6) {
      game.overflowT = 0;
      const pl = game.player;
      addPuddle(game, pl.x + pl.fx * 22, pl.y + 22, 14);
      float(game, 'Too much gravy!', pl.x, pl.y - 40, '#ffcc80');
      sfx(game, 'splat');
    }
  }
  if (pot.level <= 0) {
    float(game, 'Gravy pot empty!', s.x + s.w / 2, s.y + 70, '#ff8a80');
    sfx(game, 'empty');
  }
}

function stir(game, s, dt) {
  const pot = s.item;
  game.stirring = true;
  pot.stir = (pot.stir || 0) + dt / STIR_TIME;
  if (pot.stir >= 1) {
    pot.stir = 0;
    pot.level = 100;
    float(game, 'Fresh gravy!', s.x + s.w / 2, s.y + 70, '#ffe082');
    sfx(game, 'ready');
  }
}

function seatParty(game, party, table) {
  party.table = table;
  table.party = party;
  setState(game, party, 'seated');
  sfx(game, 'seat');
}

function takeOrder(game, party) {
  setState(game, party, 'waitingFood');
  say(game, party, 'order');
  sfx(game, 'scribble');
}

function deliver(game, party, tray) {
  let served = 0;
  let missingGravy = null;
  for (const g of party.guests) {
    if (g.served) continue;
    const idx = tray.plates.findIndex((pl) => pl.meat === g.meat && pl.gravy >= g.gravyNeed);
    if (idx >= 0) {
      const [plate] = tray.plates.splice(idx, 1);
      g.served = true;
      g.plateGravy = plate.gravy;
      served++;
    } else {
      const dry = tray.plates.find((pl) => pl.meat === g.meat);
      if (dry) missingGravy = dry.gravy < 1 ? 'none' : 'more';
    }
  }
  if (!tray.plates.length) game.player.held = null;
  if (served) sfx(game, 'plate');
  if (party.guests.every((g) => g.served)) {
    setState(game, party, 'eating');
    float(game, 'Tuck in!', party.guests[0].x, party.guests[0].y - 30, '#c5e1a5');
  } else if (missingGravy) {
    bubble(game, party, game.rng.pick(missingGravy === 'none' ? NO_GRAVY_LINES : MORE_GRAVY_LINES));
    sfx(game, 'nope');
  } else if (!served) {
    bubble(game, party, 'That\'s not what we ordered!');
    sfx(game, 'nope');
  }
}

function giveBill(game, party) {
  const amount = round2(party.guests.reduce((sum, g) => sum + MEAT_PRICES[g.meat] * GUEST_TYPES[g.type].payMult, 0));
  const finalMood = party.patienceMax ? (party.moodSum + party.patience / party.patienceMax) / (party.moodN + 1) : mood(party);
  const tip = party.caught ? 0 : round2(party.guests.reduce((sum, g) => sum + 2 * GUEST_TYPES[g.type].tip, 0) * finalMood);
  game.player.held = { kind: 'cash', amount, tip, size: party.size };
  say(game, party, 'pay');
  sfx(game, 'cash');
  freeTable(party);
  setState(game, party, 'leaving');
}

function bank(game) {
  const cash = game.player.held;
  game.player.held = null;
  const total = round2(cash.amount + cash.tip);
  game.money = round2(game.money + total);
  game.tips = round2(game.tips + cash.tip);
  game.served += cash.size;
  float(game, `+${money(total)}`, game.world.byId.till.x + 50, 150, '#b9f6ca');
  sfx(game, 'till');
  if (game.served >= game.level.target) endGame(game, true);
}

function tableAction(game, t) {
  const held = game.player.held;
  const party = t.party;
  if (!party) {
    const following = game.parties.find((q) => q.state === 'following');
    if (!following) return null;
    if (following.size > t.seats) return hint(`This table only seats ${t.seats}`);
    return act('Seat guests here', () => seatParty(game, following, t));
  }
  switch (party.state) {
    case 'seated':
      return hint('Reading the menu...');
    case 'ordering':
      return act('Take their order', () => takeOrder(game, party));
    case 'waitingFood':
      if (held?.kind === 'tray') return act('Serve dinners', () => deliver(game, party, held));
      return hint('Waiting for their dinners');
    case 'eating':
      return hint('Tucking in...');
    case 'wantsBill':
      if (held?.kind === 'bill') return act('Give them the bill', () => giveBill(game, party));
      return hint('Wants the bill (grab one from the till)');
    default:
      return null;
  }
}

function partyAction(game, party) {
  if (party.state !== 'waiting') return null;
  if (game.parties.some((q) => q.state === 'following')) return hint('Seat the other guests first');
  return act(`Seat ${party.size === 1 ? 'guest' : `party of ${party.size}`}`, () => {
    setState(game, party, 'following');
    party.queueSlot = -1;
    sfx(game, 'seat');
  });
}

export function findFocus(game) {
  const p = game.player;
  let best = null;
  const consider = (target, dist) => {
    if (dist > INTERACT_RANGE) return;
    const info = target.kind === 'station'
      ? stationAction(game, target.ref)
      : target.kind === 'table'
        ? tableAction(game, target.ref)
        : partyAction(game, target.ref);
    if (!info) return;
    const score = dist + (info.ok ? 0 : 1000);
    if (!best || score < best.score) best = { ...target, ...info, score };
  };
  for (const s of game.world.stations) consider({ kind: 'station', ref: s }, distToRect(p.x, p.y, s) - p.r);
  for (const t of game.world.tables) consider({ kind: 'table', ref: t }, distToRect(p.x, p.y, t) - p.r);
  for (const q of game.parties) {
    if (q.state !== 'waiting') continue;
    const d = Math.min(...q.guests.map((g) => Math.hypot(g.x - p.x, g.y - p.y) - g.r - p.r));
    consider({ kind: 'party', ref: q }, d);
  }
  return best;
}

// ---------- Main update ----------

function endGame(game, win) {
  if (game.over) return;
  game.over = true;
  const lvl = game.level;
  let stars = 0;
  if (win) {
    stars = 1;
    if (lvl.tutorial) stars = 3;
    else {
      if (game.timeLeft / lvl.time >= 0.25) stars++;
      if (game.runnersEscaped === 0 && game.puddles.length <= 2) stars++;
    }
  }
  game.result = {
    win,
    stars,
    served: game.served,
    target: lvl.target,
    money: game.money,
    tips: game.tips,
    lost: game.lost,
    runnersCaught: game.runnersCaught,
    runnersEscaped: game.runnersEscaped,
    puddlesCleaned: game.puddlesCleaned,
    puddlesLeft: game.puddles.length,
    timeLeft: game.timeLeft,
  };
  emit(game, { type: 'tony', line: win ? 'win' : 'fail' });
  sfx(game, win ? 'fanfare' : 'wahwah');
}

export function updateGame(game, input, dt) {
  if (game.over) return;
  game.elapsed += dt;
  if (game.timeLeft != null) {
    game.timeLeft -= dt;
    if (game.timeLeft <= 0) {
      game.timeLeft = 0;
      endGame(game, game.served >= game.level.target);
      return;
    }
  }

  updatePlayer(game, input, dt);

  game.pouring = false;
  game.stirring = false;
  game.focus = findFocus(game);
  if (input.actionPressed && game.focus) {
    if (game.focus.ok && game.focus.run) game.focus.run();
    else if (!game.focus.ok) {
      float(game, game.focus.label, game.player.x, game.player.y - 36, '#ffcc80');
      sfx(game, 'nope');
    }
  }
  if (input.actionHeld && game.focus?.ok && game.focus.hold) game.focus.hold(dt);
  if (!game.pouring) game.overflowT = 0;

  // Hoovering
  const pl = game.player;
  game.hoovering = false;
  if (pl.held?.kind === 'hoover') {
    const nx = pl.x + pl.fx * 10;
    const ny = pl.y + pl.fy * 10;
    for (const d of game.puddles) {
      if (Math.hypot(d.x - nx, d.y - ny) < d.r + pl.r) {
        d.r -= HOOVER_RATE * dt;
        game.hoovering = true;
        if (d.r < 5) {
          d.gone = true;
          game.puddlesCleaned += 1;
          sfx(game, 'slurp');
        }
      }
    }
    game.puddles = game.puddles.filter((d) => !d.gone);
  }

  for (const party of game.parties) updateParty(game, party, dt);
  game.parties = game.parties.filter((q) => !q.gone);

  if (!game.tutorial && !game.over) {
    game.spawnTimer -= dt;
    if (!game.parties.length) game.spawnTimer = Math.min(game.spawnTimer, 1);
    if (game.spawnTimer <= 0) {
      const party = spawnParty(game);
      game.spawnTimer = party ? game.rng.range(...(game.level.spawnEvery ?? [8, 12])) : 1;
    }
  }

  if (game.tutorial) updateTutorial(game, dt);

  for (const f of game.floats) {
    f.t -= dt;
    f.y -= 28 * dt;
  }
  game.floats = game.floats.filter((f) => f.t > 0);
}

export function drainEvents(game) {
  const ev = game.events;
  game.events = [];
  return ev;
}
