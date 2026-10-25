// How to Play: illustrated pages explaining the aim, controls and every mechanic.
import {
  drawPerson, drawPlate, drawPuddle, drawPot, drawHoover, drawBill, drawCash, drawRing, drawTray,
  TONY_LOOK, INK, FONT, roundRect,
} from '../engine/draw.js';
import { GUEST_TYPES, TYPE_KEYS, randomLook } from '../game/guestTypes.js';
import { createRng } from '../game/rng.js';

const rng = createRng(11);
const looks = Object.fromEntries(TYPE_KEYS.map((k) => [k, randomLook(k, rng)]));

function table(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#a8703f';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function arrow(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = '#ffe082';
  ctx.fillStyle = '#ffe082';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.5) * 12, y2 - Math.sin(a - 0.5) * 12);
  ctx.lineTo(x2 - Math.cos(a + 0.5) * 12, y2 - Math.sin(a + 0.5) * 12);
  ctx.closePath();
  ctx.fill();
}

function caption(ctx, text, x, y, size = 14) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff3d6';
  ctx.fillText(text, x, y);
}

const PAGES = [
  {
    title: 'The Aim',
    html: `<p>Welcome to <b>Tony's Carvery</b>. You are Tony, and the hungry public are queueing out the door.</p>
      <p><b>Serve enough guests before the clock runs out.</b> A guest only counts as served once they've had their carvery, drowned in gravy, <i>and</i> their cash is banked in the till.</p>
      <ol><li><b>Starter</b>: the tutorial, no clock.</li><li>Serve <b>2</b> guests in 1 minute.</li><li>Serve <b>4</b> guests in 1 minute.</li><li>Serve <b>10</b> guests in 2 minutes.</li><li>Serve <b>20</b> guests in 2 minutes.</li></ol>
      <p>Win to unlock the next shift. Earn stars for finishing fast, catching every runner and keeping the floor clean.</p>`,
    draw(ctx, t) {
      table(ctx, 140, 110, 120, 70);
      drawPlate(ctx, 165, 145, { meat: 'beef', gravy: 1.5 }, 1.5);
      drawPlate(ctx, 235, 145, { meat: 'turkey', gravy: 2 }, 1.5);
      drawPerson(ctx, 110, 140, looks.regular, { t, scale: 1.5, sitting: true });
      drawPerson(ctx, 290, 140, looks.bigEater, { t: t + 1, scale: 1.4, sitting: true });
      drawPerson(ctx, 200, 230, TONY_LOOK, { t, scale: 1.6 });
      const b = (t % 2) / 2;
      ctx.globalAlpha = 1 - b;
      caption(ctx, '+£12.40', 200, 90 - b * 30, 20);
      ctx.globalAlpha = 1;
      caption(ctx, 'Serve them. Gravy them. Get paid.', 200, 30, 16);
    },
  },
  {
    title: 'Controls',
    html: `<div class="keys">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move Tony (or the arrow keys)</span>
        <span><kbd>Space</kbd> / <kbd>E</kbd></span><span>Do the thing: pick up, put down, seat, serve</span>
        <span><kbd>Hold Space</kbd></span><span>Pour gravy and stir the gravy pot</span>
        <span><kbd>Shift</kbd> / <kbd>Q</kbd></span><span>Dash! Perfect for catching runners</span>
        <span><kbd>Esc</kbd></span><span>Pause</span>
      </div>
      <p>On a phone or tablet use the <b>joystick</b> on the left and the <b>ACTION</b> and <b>DASH</b> buttons on the right.</p>
      <p>Walk up to anything and a yellow outline shows what you can use. The label under Tony tells you what will happen.</p>`,
    draw(ctx, t) {
      const x = 200 + Math.sin(t * 1.5) * 60;
      drawPerson(ctx, x, 140, TONY_LOOK, { t, scale: 1.7, moving: true });
      arrow(ctx, x - 70, 140, x - 110, 140);
      arrow(ctx, x + 70, 140, x + 110, 140);
      roundRect(ctx, 110, 205, 180, 30, 15);
      ctx.fillStyle = 'rgba(33,25,16,0.9)';
      ctx.fill();
      ctx.fillStyle = '#ffe082';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SPACE: Carve Beef', 200, 225);
    },
  },
  {
    title: 'The Carvery Loop',
    html: `<ol>
        <li><b>Seat them.</b> Walk up to guests at the door and press Space. They follow you. Press Space at a free table big enough for them.</li>
        <li><b>Take the order.</b> When the order pad pops up, press Space at their table. Tickets appear at the top of the screen.</li>
        <li><b>Carve.</b> Press Space at the Beef, Turkey or Gammon carvery. Each press adds a plate to your tray (up to 4).</li>
        <li><b>GRAVY.</b> Hold Space at the gravy pot. No gravy, no dinner. <b>x2</b> on a ticket means double gravy.</li>
        <li><b>Serve.</b> Press Space at the table. Wrong meat or dry plates get sent back.</li>
        <li><b>Bill.</b> When they wave the <b>£</b>, grab a bill from the till and hand it over. Then bank the cash at the till.</li>
      </ol>`,
    draw(ctx, t) {
      const steps = [
        (x, y) => drawPerson(ctx, x, y + 6, looks.regular, { t, scale: 1.1 }),
        (x, y) => { ctx.fillStyle = '#fff59d'; ctx.fillRect(x - 12, y - 16, 24, 30); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 16, 24, 30); },
        (x, y) => drawTray(ctx, x, y, { plates: [{ meat: 'beef', gravy: 0 }, { meat: 'gammon', gravy: 0 }] }, 1.1),
        (x, y) => drawPlate(ctx, x, y, { meat: 'turkey', gravy: 1 + (Math.sin(t * 2) + 1) / 2 }, 1.8),
        (x, y) => drawBill(ctx, x, y, 1.4),
        (x, y) => drawCash(ctx, x, y, 1.4),
      ];
      const names = ['Seat', 'Order', 'Carve', 'Gravy', 'Bill', 'Bank'];
      steps.forEach((fn, i) => {
        const x = 70 + (i % 3) * 130;
        const y = i < 3 ? 85 : 195;
        const on = Math.floor(t * 1.2) % 6 === i;
        ctx.beginPath();
        ctx.arc(x, y, 38, 0, Math.PI * 2);
        ctx.fillStyle = on ? '#ffe082' : '#fff3d6';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
        fn(x, y);
        caption(ctx, `${i + 1}. ${names[i]}`, x, y + 56, 14);
        if (i % 3 !== 2) arrow(ctx, x + 42, y, x + 86, y);
      });
    },
  },
  {
    title: 'Gravy, Spills and the Hoover',
    html: `<p>Every plate drains the <b>gravy pot</b>. Watch the meter. When it runs dry:</p>
      <ol><li>Pick up the pot and carry it to the <b>stove</b>.</li><li><b>Hold Space</b> to stir until the ring is full.</li><li>Carry the fresh pot back to the gravy station.</li></ol>
      <p>Everyone puts <i>far</i> too much gravy on, so guests slop it all over the floor. Pour too long and you'll spill it yourself. Gravy puddles are <b>slippery</b>: Tony slides about like a newborn deer.</p>
      <p>Grab the <b>Gravy Hoover 3000</b> from its cupboard and drive over puddles to suck them up. You can't carry plates while hoovering, so pick your moment.</p>`,
    draw(ctx, t) {
      drawPot(ctx, 80, 80, { level: 30 + Math.sin(t) * 20 }, 2);
      arrow(ctx, 130, 80, 175, 80);
      roundRect(ctx, 185, 45, 90, 70, 10);
      ctx.fillStyle = '#2f3337';
      ctx.fill();
      drawPot(ctx, 230, 80, { level: 50 }, 1.7);
      drawRing(ctx, 230, 80, 34, (t % 2.2) / 2.2, '#ffd54f', 6);
      caption(ctx, 'Stir!', 330, 85, 18);
      const puddles = [{ x: 120, y: 205, r: 26, seed: 1 }, { x: 210, y: 220, r: 18, seed: 2 }];
      const shrink = (t % 4) / 4;
      puddles.forEach((p) => drawPuddle(ctx, { ...p, r: p.r * (1 - shrink * 0.8) }, t));
      const hx = 80 + shrink * 180;
      drawPerson(ctx, hx, 190, TONY_LOOK, { t, scale: 1.3, moving: true });
      drawHoover(ctx, hx + 30, 205, 1.3, 0, t, true);
    },
  },
  {
    title: 'Runners and Rascals',
    html: `<p>Some guests try to <b>do a runner</b>! When you hear the whistle and see <b style="color:#d32f2f">!!</b>, chase them down and bump into them before they reach the door. <b>Dash</b> to close the gap. Escaped runners cost you money.</p>
      <p>Guests who wait too long storm off. Keep an eye on the coloured rings: green is happy, red is about to kick off.</p>
      <div class="types-grid" id="types-grid"></div>`,
    draw(ctx, t) {
      const p = (t % 3) / 3;
      const rx = 300 - p * 200;
      const tx = rx + 120 - p * 55;
      ctx.fillStyle = '#3e2c1c';
      ctx.fillRect(0, 100, 26, 110);
      ctx.fillStyle = '#c9a26b';
      ctx.fillRect(0, 106, 10, 98);
      caption(ctx, 'DOOR', 34, 92, 12);
      drawPerson(ctx, rx, 160, looks.chav, { t, scale: 1.5, moving: true, mood: 'shock', lean: -0.25 });
      caption(ctx, 'Leg it!', rx, 105, 16);
      drawPerson(ctx, tx, 160, TONY_LOOK, { t, scale: 1.6, moving: true });
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(tx + 34, 160 + i * 10);
        ctx.lineTo(tx + 64, 160 + i * 10);
        ctx.stroke();
      }
      caption(ctx, 'DASH!', tx, 230, 18);
    },
  },
];

export function createHowToPlay({ pagesEl, prevBtn, nextBtn, dotsEl, countEl, onFinish }) {
  let index = 0;
  let raf = 0;
  const canvases = [];
  pagesEl.innerHTML = '';
  PAGES.forEach((p) => {
    const page = document.createElement('div');
    page.className = 'howto-page';
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 520;
    page.appendChild(c);
    const text = document.createElement('div');
    text.innerHTML = `<h3>${p.title}</h3>${p.html}`;
    page.appendChild(text);
    pagesEl.appendChild(page);
    canvases.push(c);
  });
  dotsEl.innerHTML = PAGES.map(() => '<i></i>').join('');

  const grid = pagesEl.querySelector('#types-grid');
  for (const key of TYPE_KEYS) {
    const def = GUEST_TYPES[key];
    const card = document.createElement('div');
    card.className = 'type-card';
    const c = document.createElement('canvas');
    c.width = 140;
    c.height = 140;
    const g = c.getContext('2d');
    g.scale(2, 2);
    drawPerson(g, 35, 44, looks[key], { t: 0, scale: 1.25 / Math.max(1, looks[key].size * 0.85) });
    card.appendChild(c);
    card.insertAdjacentHTML('beforeend', `<b>${def.name}</b><span>${def.blurb}</span>`);
    grid.appendChild(card);
  }

  const update = () => {
    [...pagesEl.children].forEach((el, i) => el.classList.toggle('active', i === index));
    [...dotsEl.children].forEach((el, i) => el.classList.toggle('on', i === index));
    countEl.textContent = `${index + 1} / ${PAGES.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === PAGES.length - 1 ? 'Play the Starter' : 'Next';
  };
  prevBtn.onclick = () => {
    index = Math.max(0, index - 1);
    update();
  };
  nextBtn.onclick = () => {
    if (index === PAGES.length - 1) onFinish();
    else {
      index += 1;
      update();
    }
  };

  const frame = (now) => {
    const c = canvases[index];
    const ctx = c.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 400, 260);
    PAGES[index].draw(ctx, now / 1000);
    raf = requestAnimationFrame(frame);
  };

  return {
    show() {
      index = 0;
      update();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    hide() {
      cancelAnimationFrame(raf);
    },
  };
}
