// Guest personalities. Behaviour modifiers are multipliers on the level's base values.
export const GUEST_TYPES = {
  regular: {
    name: 'Regular',
    blurb: 'Just wants a nice dinner. Bless them.',
    patience: 1,
    tip: 1,
    runner: 0.03,
    spill: 0.12,
    gravyNeed: 1,
    payMult: 1,
    size: 1,
    runSpeed: 120,
    voice: { pitch: 1, rate: 1 },
  },
  posh: {
    name: 'Posh',
    blurb: 'Impatient and fussy about gravy texture, but tips big.',
    patience: 0.75,
    tip: 2.4,
    runner: 0,
    spill: 0.05,
    gravyNeed: 1,
    payMult: 1,
    size: 1,
    runSpeed: 100,
    voice: { pitch: 1.2, rate: 0.9 },
  },
  rude: {
    name: 'Rude',
    blurb: 'Hurls insults, loses patience fast, tips pennies.',
    patience: 0.6,
    tip: 0.2,
    runner: 0.12,
    spill: 0.15,
    gravyNeed: 1,
    payMult: 1,
    size: 1,
    runSpeed: 125,
    voice: { pitch: 0.85, rate: 1.1 },
  },
  bigEater: {
    name: 'Big Eater',
    blurb: 'Wants DOUBLE gravy and spills the most.',
    patience: 1,
    tip: 1.2,
    runner: 0.04,
    spill: 0.45,
    gravyNeed: 2,
    payMult: 1.3,
    size: 1.4,
    runSpeed: 90,
    voice: { pitch: 0.7, rate: 0.95 },
  },
  hooligan: {
    name: 'Hooligan',
    blurb: 'Loud, messy, and fond of a runner in a group.',
    patience: 0.9,
    tip: 0.5,
    runner: 0.3,
    spill: 0.35,
    gravyNeed: 1,
    payMult: 1,
    size: 1.1,
    runSpeed: 140,
    voice: { pitch: 0.8, rate: 1.25 },
  },
  chav: {
    name: 'Chav',
    blurb: 'Most likely to leg it. Haggles at the bill.',
    patience: 0.9,
    tip: 0,
    runner: 0.45,
    spill: 0.2,
    gravyNeed: 1,
    payMult: 0.85,
    size: 1,
    runSpeed: 150,
    voice: { pitch: 1.1, rate: 1.35 },
  },
};

export const TYPE_KEYS = Object.keys(GUEST_TYPES);

const SKINS = ['#f6d2b8', '#eab894', '#d39a6a', '#b07246', '#8a5530', '#5e3a20'];
const HAIR = ['#2b1d12', '#5a3a1c', '#a8742c', '#e0c068', '#8c8c8c', '#c2452d'];
const JUMPERS = ['#3f6fb5', '#2f8a5a', '#c0563b', '#7a4fa3', '#d39b2a', '#4a8fa8'];

// Random appearance for a guest of a given type.
export function randomLook(type, rng) {
  const look = {
    skin: rng.pick(SKINS),
    hair: rng.pick(HAIR),
    body: rng.pick(JUMPERS),
    hat: 'none',
    accessory: 'none',
    size: GUEST_TYPES[type].size,
    face: 'normal',
  };
  switch (type) {
    case 'posh':
      look.body = rng.pick(['#7b6142', '#4b5d3a', '#5b4a6e']);
      look.hat = 'tophat';
      look.accessory = 'monocle';
      break;
    case 'rude':
      look.body = rng.pick(['#555a60', '#3d3d3d', '#6b4b3b']);
      look.face = 'scowl';
      break;
    case 'bigEater':
      look.body = rng.pick(['#e07b39', '#b8483f', '#4d7cc0']);
      look.accessory = 'napkin';
      break;
    case 'hooligan':
      look.body = rng.pick(['#d22b2b', '#1d4ea3', '#f2f2f2']);
      look.accessory = 'scarf';
      look.hair = rng.chance(0.5) ? 'bald' : look.hair;
      break;
    case 'chav':
      look.body = rng.pick(['#9a9ca0', '#1e2a4a', '#2c2c2c']);
      look.hat = 'cap';
      look.accessory = 'chain';
      break;
    default:
      break;
  }
  return look;
}
