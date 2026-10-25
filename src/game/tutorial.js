// Guided Starter level. Each step shows a prompt and an arrow until its goal is met.
import { spawnParty, addPuddle, startRunner } from './game.js';
import { rectCenter } from './world.js';

const party = (game) => game.tutParty;
const leader = (game) => party(game)?.guests[0];
const at = (r) => rectCenter(r);
const held = (game) => game.player.held;

const STEPS = [
  {
    text: 'Welcome to Tony\'s Carvery! You are Tony. Walk around with WASD, the arrow keys or the joystick.',
    done: (g) => g.moved > 120,
  },
  {
    text: 'A hungry guest has arrived! Walk up to them by the door and press SPACE (or ACTION) to seat them.',
    enter: (g) => {
      const p = spawnParty(g, { size: 1, type: 'regular', meat: 'beef' });
      p.holdEating = true;
      g.tutParty = p;
    },
    target: (g) => leader(g),
    done: (g) => party(g)?.state === 'following',
  },
  {
    text: 'They\'ll follow you. Walk to a table and press SPACE to sit them down.',
    target: (g) => at(g.world.tables[0]),
    done: (g) => ['seated', 'ordering'].includes(party(g)?.state),
  },
  {
    text: 'They\'re reading the menu. When the order pad pops up, press SPACE at their table to take the order.',
    target: (g) => (party(g)?.table ? at(party(g).table) : null),
    done: (g) => party(g)?.state === 'waitingFood',
  },
  {
    text: 'Their order ticket is at the top of the screen: BEEF. Go to the beef carvery and press SPACE to carve a plate.',
    target: (g) => at(g.world.byId.beef),
    done: (g) => held(g)?.kind === 'tray' && held(g).plates.some((p) => p.meat === 'beef'),
  },
  {
    text: 'No gravy, no Tony\'s! HOLD SPACE at the gravy pot to drown that dinner in gravy.',
    target: (g) => at(g.world.byId.gravy),
    done: (g) => held(g)?.kind === 'tray' && held(g).plates.some((p) => p.meat === 'beef' && p.gravy >= 1),
  },
  {
    text: 'Lovely jubbly. Take it to the table and press SPACE to serve it.',
    target: (g) => (party(g)?.table ? at(party(g).table) : null),
    done: (g) => party(g)?.state === 'eating',
  },
  {
    text: 'Uh oh, the gravy pot is EMPTY! Press SPACE to pick up the pot and carry it to the stove.',
    enter: (g) => {
      const pot = g.world.byId.gravy.item;
      if (pot) pot.level = 0;
    },
    target: (g) => (held(g)?.kind === 'pot' ? at(g.world.byId.stove) : at(g.world.byId.gravy)),
    done: (g) => g.world.byId.stove.item?.kind === 'pot',
  },
  {
    text: 'HOLD SPACE at the stove to stir up a fresh batch of gravy.',
    target: (g) => at(g.world.byId.stove),
    done: (g) => (g.world.byId.stove.item?.level ?? 0) >= 100 || held(g)?.kind === 'pot',
  },
  {
    text: 'Fresh gravy! Pick it up and put it back on the gravy station.',
    target: (g) => (held(g)?.kind === 'pot' ? at(g.world.byId.gravy) : at(g.world.byId.stove)),
    done: (g) => (g.world.byId.gravy.item?.level ?? 0) >= 100,
  },
  {
    text: 'Your guest has slopped gravy all over the floor! Grab the Gravy Hoover 3000 from its cupboard (bottom right).',
    enter: (g) => {
      const t = party(g).table;
      addPuddle(g, t.x - 50, t.y + 10, 16);
      addPuddle(g, t.x + t.w / 2, t.y + t.h + 40, 18);
      addPuddle(g, t.x + t.w + 60, t.y + t.h + 10, 14);
    },
    target: (g) => at(g.world.byId.hoover),
    done: (g) => held(g)?.kind === 'hoover',
  },
  {
    text: 'Drive over the puddles to suck them up. Careful: without the hoover, gravy is SLIPPERY!',
    target: (g) => g.puddles[0] ?? null,
    done: (g) => g.puddles.length === 0,
  },
  {
    text: 'Spotless. Put the hoover back in its cupboard.',
    target: (g) => at(g.world.byId.hoover),
    done: (g) => !!g.world.byId.hoover.item,
  },
  {
    text: 'OI! They\'re doing a RUNNER! Chase them down before they reach the door. SHIFT (or DASH) gives you a burst of speed.',
    enter: (g) => {
      party(g).holdEating = false;
      startRunner(g, party(g));
    },
    target: (g) => leader(g),
    done: (g) => party(g)?.caught,
  },
  {
    text: 'Caught red-handed! Now they\'ll pay. Grab a bill from the till and give it to them.',
    target: (g) => (held(g)?.kind === 'bill' ? (party(g)?.table ? at(party(g).table) : null) : at(g.world.byId.till)),
    done: (g) => held(g)?.kind === 'cash',
  },
  {
    text: 'Cash in hand! Take it to the till and press SPACE to bank it.',
    target: (g) => at(g.world.byId.till),
    done: (g) => g.served >= 1,
  },
];

export function createTutorial() {
  return { index: 0, entered: false, steps: STEPS };
}

export function updateTutorial(game) {
  const tut = game.tutorial;
  const step = tut.steps[tut.index];
  if (!step) return;
  if (!tut.entered) {
    tut.entered = true;
    step.enter?.(game);
  }
  if (step.done(game)) {
    tut.index += 1;
    tut.entered = false;
    game.events.push({ type: 'sfx', name: 'ding' });
  }
}

export function tutorialPrompt(game) {
  const tut = game.tutorial;
  if (!tut) return null;
  const step = tut.steps[tut.index];
  if (!step) return null;
  return { text: step.text, target: step.target?.(game) ?? null, index: tut.index, total: tut.steps.length };
}
