// Default speech lines. {n} = party size, {meat} = meat name.
export const LINE_KINDS = ['greet', 'order', 'complain', 'pay', 'run'];
export const LINE_LABELS = {
  greet: 'Greeting',
  order: 'Ordering',
  complain: 'Complaining',
  pay: 'Paying',
  run: 'Doing a runner',
};

export const GUEST_LINES = {
  regular: {
    greet: ['Table for {n}, please!', 'Alright? Here for the carvery!'],
    order: ['I\'ll have the {meat}, please.', 'Ooh, the {meat} looks lovely.'],
    complain: ['Where\'s me gravy?', 'Been waiting ages, mate!'],
    pay: ['Lovely, cheers Tony!', 'Best carvery in town!'],
    run: ['Oops, forgot me wallet!'],
  },
  posh: {
    greet: ['Good afternoon. A table for {n}, if you please.', 'One does hope the gravy is artisanal.'],
    order: ['The {meat}, and do be generous.', 'I shall have the {meat}. With jus. Oh fine, gravy.'],
    complain: ['This gravy is frightfully lumpy!', 'I have waited an eternity!'],
    pay: ['Keep the change, Anthony.', 'Simply marvellous.'],
    run: ['I say, is that the time?'],
  },
  rude: {
    greet: ['Oi! Table. Now.', 'Took your time, didn\'t ya?'],
    order: ['{meat}. And hurry up.', 'Just give me the {meat}, numpty.'],
    complain: ['This is a joke!', 'Worst carvery in Britain!', 'I\'m leaving a one star review!'],
    pay: ['There. Don\'t spend it all at once.'],
    run: ['I\'m not paying for that!'],
  },
  bigEater: {
    greet: ['Is it all you can eat? Please say yes.', 'Smells unbelievable in here!'],
    order: ['The {meat}. Double gravy. Actually, triple.', 'Pile it high! {meat} please!'],
    complain: ['I\'m wasting away here!', 'Where\'s me EXTRA gravy?!'],
    pay: ['Same again next week!'],
    run: ['Can\'t catch me, I\'m full of gravy!'],
  },
  hooligan: {
    greet: ['Here we go, here we go, here we go!', 'Oi oi! Carvery time, lads!'],
    order: ['{meat}! Get in!', '{meat} for the lads!'],
    complain: ['What a load of rubbish!', 'Referee! Where\'s our food?!'],
    pay: ['Here\'s yer money, now give us a song!'],
    run: ['RUN, LADS!'],
  },
  chav: {
    greet: ['Alright bruv, table for {n}?', 'Is it two for one, yeah?'],
    order: ['Yeah, gimme the {meat} innit.', '{meat}, and loads of gravy, yeah?'],
    complain: ['This is long, bruv!', 'Mate, I\'m actually starving!'],
    pay: ['Do us a discount, yeah? Go on.'],
    run: ['Leg it!'],
  },
};

export const CAUGHT_LINES = ['Alright, alright! I\'ll pay!', 'Fair cop, Tony.', 'It was a joke, honest!'];
export const NO_GRAVY_LINES = ['Where\'s the GRAVY?!', 'No gravy? Is this a joke?', 'Gravy, Tony. GRAVY!'];
export const MORE_GRAVY_LINES = ['MORE gravy than that!', 'That\'s not double gravy!'];

export const TONY_LINES = {
  start: 'Welcome to Tony\'s Carvery! Gravy\'s on!',
  win: 'Smashed it! Gravy for everyone!',
  fail: 'Oh gravy. Doors are shut, we\'ve failed.',
  caught: 'Oi! Not so fast!',
};

export function fillLine(text, vars = {}) {
  return text.replace('{n}', vars.n ?? 2).replace('{meat}', vars.meat ?? 'beef');
}
