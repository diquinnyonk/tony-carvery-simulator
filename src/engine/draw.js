// Shared cartoon drawing helpers used by the game, the how-to-play pages and the studio preview.
export const FONT = '"Fredoka", "Trebuchet MS", system-ui, sans-serif';
export const DISPLAY_FONT = '"Luckiest Guy", "Fredoka", "Trebuchet MS", system-ui, sans-serif';
export const INK = '#2a1a10';
export const GRAVY = '#6b3a17';
export const GRAVY_LIGHT = '#8f5426';

export const MEAT_COLOURS = { beef: '#8e3b2b', turkey: '#e3c08a', gammon: '#ec9a96' };

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillStroke(ctx, fill, stroke = INK, lw = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const TONY_LOOK = {
  skin: '#f1c39b',
  hair: '#3a2516',
  body: '#fbfbf7',
  hat: 'chef',
  accessory: 'apron',
  size: 1.1,
  face: 'tony',
};

// Draws a chunky cartoon person. (x, y) is roughly the centre of the body.
export function drawPerson(ctx, x, y, look, opts = {}) {
  const t = opts.t ?? 0;
  const s = (opts.scale ?? 1) * (look.size ?? 1);
  const moving = opts.moving;
  const bob = moving ? Math.sin(t * 14 + (opts.phase ?? 0)) * 2 : Math.sin(t * 2 + (opts.phase ?? 0)) * 0.6;
  const mood = opts.mood ?? 'happy';
  ctx.save();
  ctx.translate(x, y + bob * 0.5);
  if (opts.lean) ctx.rotate(opts.lean);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 0, 15 * s, 15 * s, 5 * s);
  ctx.fill();

  // feet
  if (!opts.sitting) {
    const step = moving ? Math.sin(t * 14 + (opts.phase ?? 0)) * 4 : 0;
    ctx.fillStyle = '#2d2622';
    ellipse(ctx, -6 * s, 14 * s + step * 0.4, 4.5 * s, 3.5 * s);
    ctx.fill();
    ellipse(ctx, 6 * s, 14 * s - step * 0.4, 4.5 * s, 3.5 * s);
    ctx.fill();
  }

  // body
  const bw = 15 * s * (look.size > 1.25 ? 1.15 : 1);
  ellipse(ctx, 0, 3 * s, bw, 12 * s);
  fillStroke(ctx, look.body);
  if (look.accessory === 'apron') {
    roundRect(ctx, -8 * s, 0, 16 * s, 13 * s, 4 * s);
    fillStroke(ctx, '#b3262e', INK, 2);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${5 * s}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('TONY', 0, 8 * s);
  }
  if (look.body === '#f2f2f2' || look.accessory === 'scarf') {
    // football stripes
    ctx.save();
    ellipse(ctx, 0, 3 * s, bw, 12 * s);
    ctx.clip();
    ctx.fillStyle = 'rgba(200,30,30,0.55)';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 7 * s - 1.5 * s, -10 * s, 3 * s, 26 * s);
    ctx.restore();
  }
  if (look.accessory === 'napkin') {
    ctx.beginPath();
    ctx.moveTo(-8 * s, -6 * s);
    ctx.lineTo(8 * s, -6 * s);
    ctx.lineTo(0, 9 * s);
    ctx.closePath();
    fillStroke(ctx, '#ffffff', INK, 2);
  }
  if (look.accessory === 'chain') {
    ctx.beginPath();
    ctx.arc(0, -6 * s, 8 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = '#f4c430';
    ctx.stroke();
  }
  if (look.hat === 'tophat') {
    // posh bow tie
    ctx.fillStyle = '#8b1a1a';
    ctx.beginPath();
    ctx.moveTo(0, -6 * s);
    ctx.lineTo(-5 * s, -9 * s);
    ctx.lineTo(-5 * s, -3 * s);
    ctx.closePath();
    ctx.moveTo(0, -6 * s);
    ctx.lineTo(5 * s, -9 * s);
    ctx.lineTo(5 * s, -3 * s);
    ctx.closePath();
    ctx.fill();
  }

  // arms
  const armSwing = moving ? Math.sin(t * 14 + (opts.phase ?? 0)) * 3 : 0;
  circle(ctx, -bw + 1, 3 * s + armSwing, 4.5 * s);
  fillStroke(ctx, look.skin, INK, 2);
  circle(ctx, bw - 1, 3 * s - armSwing, 4.5 * s);
  fillStroke(ctx, look.skin, INK, 2);
  if (opts.armsUp) {
    circle(ctx, bw + 2, -14 * s, 4.5 * s);
    fillStroke(ctx, look.skin, INK, 2);
  }

  if (look.accessory === 'scarf') {
    roundRect(ctx, -10 * s, -10 * s, 20 * s, 6 * s, 3 * s);
    fillStroke(ctx, '#c62828', INK, 2);
    ctx.fillStyle = '#fff';
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 6 * s - 1.2 * s, -10 * s, 2.4 * s, 6 * s);
  }

  // head
  const hr = 11 * s;
  const hy = -16 * s;
  if (look.photo && look.photo.complete !== false) {
    ctx.save();
    circle(ctx, 0, hy, hr + 1.5 * s);
    ctx.clip();
    ctx.drawImage(look.photo, -hr - 1.5 * s, hy - hr - 1.5 * s, (hr + 1.5 * s) * 2, (hr + 1.5 * s) * 2);
    ctx.restore();
    circle(ctx, 0, hy, hr + 1.5 * s);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    circle(ctx, 0, hy, hr);
    fillStroke(ctx, mood === 'angry' ? blend(look.skin, '#e05a4a', 0.35) : look.skin);
    // hair
    if (look.hair !== 'bald' && look.hat !== 'chef' && look.hat !== 'tophat') {
      ctx.beginPath();
      ctx.arc(0, hy - 1 * s, hr, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(hr * 0.6, hy - hr * 0.35);
      ctx.closePath();
      fillStroke(ctx, look.hair, INK, 2);
    } else if (look.hair === 'bald') {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ellipse(ctx, -3 * s, hy - 6 * s, 3 * s, 1.8 * s);
      ctx.fill();
    }
    drawFace(ctx, hy, s, look, mood, t);
  }

  // hats
  if (look.hat === 'chef') {
    roundRect(ctx, -9 * s, hy - hr - 14 * s, 18 * s, 10 * s, 2 * s);
    fillStroke(ctx, '#ffffff');
    circle(ctx, -6 * s, hy - hr - 15 * s, 6 * s);
    fillStroke(ctx, '#ffffff');
    circle(ctx, 6 * s, hy - hr - 15 * s, 6 * s);
    fillStroke(ctx, '#ffffff');
    circle(ctx, 0, hy - hr - 19 * s, 7 * s);
    fillStroke(ctx, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8 * s, hy - hr - 12 * s, 16 * s, 6 * s);
  } else if (look.hat === 'tophat') {
    roundRect(ctx, -14 * s, hy - hr + 1 * s, 28 * s, 5 * s, 2 * s);
    fillStroke(ctx, '#1d1d1d');
    roundRect(ctx, -9 * s, hy - hr - 16 * s, 18 * s, 19 * s, 2 * s);
    fillStroke(ctx, '#1d1d1d');
    ctx.fillStyle = '#8b1a1a';
    ctx.fillRect(-9 * s, hy - hr - 2 * s, 18 * s, 3 * s);
  } else if (look.hat === 'cap') {
    ctx.beginPath();
    ctx.arc(0, hy - 2 * s, hr * 1.02, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, look.capColour || '#e8e8e8');
    roundRect(ctx, -2 * s, hy - 5 * s, 15 * s, 4 * s, 2 * s);
    fillStroke(ctx, look.capColour || '#e8e8e8', INK, 2);
  } else if (look.hat === 'beanie') {
    ctx.beginPath();
    ctx.arc(0, hy - 2 * s, hr * 1.04, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, '#d84343');
    circle(ctx, 0, hy - hr - 2 * s, 3.5 * s);
    fillStroke(ctx, '#ffffff', INK, 2);
  } else if (look.hat === 'crown') {
    ctx.beginPath();
    const cy = hy - hr + 2 * s;
    ctx.moveTo(-10 * s, cy);
    ctx.lineTo(-10 * s, cy - 12 * s);
    ctx.lineTo(-5 * s, cy - 6 * s);
    ctx.lineTo(0, cy - 14 * s);
    ctx.lineTo(5 * s, cy - 6 * s);
    ctx.lineTo(10 * s, cy - 12 * s);
    ctx.lineTo(10 * s, cy);
    ctx.closePath();
    fillStroke(ctx, '#f4c430');
  } else if (look.hat === 'party') {
    ctx.beginPath();
    ctx.moveTo(-8 * s, hy - hr + 4 * s);
    ctx.lineTo(0, hy - hr - 16 * s);
    ctx.lineTo(8 * s, hy - hr + 4 * s);
    ctx.closePath();
    fillStroke(ctx, '#7e57c2');
    circle(ctx, 0, hy - hr - 16 * s, 3 * s);
    fillStroke(ctx, '#ffeb3b', INK, 1.5);
  }

  if (look.accessory === 'monocle') {
    circle(ctx, 4.5 * s, hy - 1 * s, 4 * s);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#d4a017';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8 * s, hy + 1 * s);
    ctx.quadraticCurveTo(10 * s, hy + 8 * s, 6 * s, hy + 12 * s);
    ctx.stroke();
  } else if (look.accessory === 'glasses') {
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = INK;
    circle(ctx, -4.5 * s, hy - 1 * s, 3.6 * s);
    ctx.stroke();
    circle(ctx, 4.5 * s, hy - 1 * s, 3.6 * s);
    ctx.stroke();
  } else if (look.accessory === 'shades') {
    ctx.fillStyle = '#111';
    roundRect(ctx, -9 * s, hy - 4 * s, 8 * s, 5 * s, 2 * s);
    ctx.fill();
    roundRect(ctx, 1 * s, hy - 4 * s, 8 * s, 5 * s, 2 * s);
    ctx.fill();
  }

  ctx.restore();
}

function blend(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function drawFace(ctx, hy, s, look, mood, t) {
  const blink = Math.sin(t * 1.3 + hy) > 0.985;
  ctx.fillStyle = INK;
  if (blink) {
    ctx.fillRect(-6 * s, hy - 1 * s, 4 * s, 1.4 * s);
    ctx.fillRect(2 * s, hy - 1 * s, 4 * s, 1.4 * s);
  } else {
    circle(ctx, -4.5 * s, hy - 1 * s, 1.7 * s);
    ctx.fill();
    circle(ctx, 4.5 * s, hy - 1 * s, 1.7 * s);
    ctx.fill();
  }
  const scowl = look.face === 'scowl' || mood === 'angry';
  if (scowl) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(-8 * s, hy - 6 * s);
    ctx.lineTo(-2 * s, hy - 3.5 * s);
    ctx.moveTo(8 * s, hy - 6 * s);
    ctx.lineTo(2 * s, hy - 3.5 * s);
    ctx.stroke();
  }
  if (look.face === 'tony') {
    // magnificent moustache
    ctx.fillStyle = '#3a2516';
    ctx.beginPath();
    ctx.ellipse(-3.5 * s, hy + 3.5 * s, 4.5 * s, 2.2 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(3.5 * s, hy + 3.5 * s, 4.5 * s, 2.2 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  if (mood === 'angry' || look.face === 'scowl') {
    ctx.arc(0, hy + 8.5 * s, 3.5 * s, Math.PI * 1.15, Math.PI * 1.85);
  } else if (mood === 'shock') {
    circle(ctx, 0, hy + 6 * s, 2.4 * s);
    ctx.fillStyle = INK;
    ctx.fill();
  } else if (mood === 'neutral') {
    ctx.moveTo(-3 * s, hy + 5.5 * s);
    ctx.lineTo(3 * s, hy + 5.5 * s);
  } else {
    ctx.arc(0, hy + 3.5 * s, 4 * s, Math.PI * 0.15, Math.PI * 0.85);
  }
  ctx.stroke();
}

// ---------- Food and items ----------

export function drawPlate(ctx, x, y, plate, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, 11 * s);
  fillStroke(ctx, '#ffffff', INK, 1.8);
  circle(ctx, 0, 0, 8 * s);
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.stroke();
  // meat
  ctx.fillStyle = MEAT_COLOURS[plate.meat] ?? '#999';
  ctx.beginPath();
  ctx.ellipse(-2.5 * s, -2 * s, 5 * s, 3.4 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1 * s, -3.5 * s, 4.5 * s, 3 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // yorkshire pudding
  circle(ctx, 4.5 * s, 2.5 * s, 3.4 * s);
  ctx.fillStyle = '#e0a83c';
  ctx.fill();
  circle(ctx, 4.5 * s, 2.5 * s, 1.6 * s);
  ctx.fillStyle = '#b07322';
  ctx.fill();
  // peas, carrot, potato
  ctx.fillStyle = '#5bb13a';
  for (const [px, py] of [[-5, 4], [-3.5, 5.5], [-6, 2.2]]) {
    circle(ctx, px * s, py * s, 1.3 * s);
    ctx.fill();
  }
  ctx.fillStyle = '#ef8a2b';
  ctx.fillRect(-1 * s, 3 * s, 3 * s, 2 * s);
  // gravy
  if (plate.gravy > 0) {
    const g = Math.min(plate.gravy, 2);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = GRAVY;
    ctx.beginPath();
    const rr = (4 + g * 3.2) * s;
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const wob = rr * (1 + Math.sin(a * 3 + 1) * 0.08);
      const px = Math.cos(a) * wob;
      const py = Math.sin(a) * wob;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-2 * s, -2 * s, 2.4 * s, 1.2 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawTray(ctx, x, y, tray, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  const n = tray.plates.length;
  const w = (n > 2 ? 46 : n === 2 ? 46 : 26) * s;
  const h = (n > 2 ? 46 : 26) * s;
  roundRect(ctx, -w / 2, -h / 2, w, h, 5 * s);
  fillStroke(ctx, '#9aa3ab', INK, 2);
  tray.plates.forEach((pl, i) => {
    const cols = n === 1 ? 1 : 2;
    const px = cols === 1 ? 0 : (i % 2 === 0 ? -11 : 11) * s;
    const py = n > 2 ? (i < 2 ? -11 : 11) * s : 0;
    drawPlate(ctx, px, py, pl, 0.95 * s);
  });
  ctx.restore();
}

export function drawPot(ctx, x, y, pot, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  roundRect(ctx, 12 * s, -3 * s, 14 * s, 6 * s, 3 * s);
  fillStroke(ctx, '#3a3a3a', INK, 2);
  circle(ctx, 0, 0, 15 * s);
  fillStroke(ctx, '#7d8790');
  circle(ctx, 0, 0, 12 * s);
  ctx.fillStyle = '#2e3236';
  ctx.fill();
  const level = Math.max(0, Math.min(1, (pot.level ?? 0) / 100));
  if (level > 0) {
    circle(ctx, 0, 0, 3 + 9 * level * s);
    ctx.fillStyle = GRAVY;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-3 * s, -3 * s, 3 * s * level + 1, 1.5 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawHoover(ctx, x, y, s = 1, angle = 0, t = 0, active = false) {
  ctx.save();
  ctx.translate(x, y);
  // hose and nozzle point in the facing direction
  ctx.save();
  ctx.rotate(angle);
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14 * s, -10 * s, 22 * s, 0);
  ctx.stroke();
  roundRect(ctx, 20 * s, -7 * s, 6 * s, 14 * s, 2 * s);
  fillStroke(ctx, '#444', INK, 1.5);
  ctx.restore();
  const jig = active ? Math.sin(t * 50) * 0.8 : 0;
  ellipse(ctx, jig, 0, 13 * s, 11 * s);
  fillStroke(ctx, '#7b2cbf');
  ellipse(ctx, jig, -3 * s, 9 * s, 5 * s);
  fillStroke(ctx, '#ffd23f', INK, 1.5);
  ctx.fillStyle = INK;
  ctx.font = `bold ${5 * s}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('3000', jig, 6 * s);
  ctx.restore();
}

export function drawBill(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  roundRect(ctx, -8 * s, -11 * s, 16 * s, 22 * s, 2);
  fillStroke(ctx, '#fffdf2', INK, 1.8);
  ctx.fillStyle = '#9e9e9e';
  for (let i = 0; i < 4; i++) ctx.fillRect(-5 * s, (-7 + i * 4) * s, 10 * s, 1.2 * s);
  ctx.fillStyle = '#b3262e';
  ctx.font = `bold ${7 * s}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('£', 0, 10 * s);
  ctx.restore();
}

export function drawCash(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(-0.25 + i * 0.2);
    roundRect(ctx, -11 * s, -6 * s, 22 * s, 12 * s, 2);
    fillStroke(ctx, i === 2 ? '#7cb342' : '#9ccc65', INK, 1.5);
    ctx.restore();
  }
  ctx.fillStyle = '#1b5e20';
  ctx.font = `bold ${9 * s}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('£', 0, 3 * s);
  ctx.restore();
}

export function drawHeld(ctx, item, x, y, s = 1, opts = {}) {
  if (!item) return;
  if (item.kind === 'tray') drawTray(ctx, x, y, item, s);
  else if (item.kind === 'pot') drawPot(ctx, x, y, item, s);
  else if (item.kind === 'bill') drawBill(ctx, x, y, s);
  else if (item.kind === 'cash') drawCash(ctx, x, y, s);
  else if (item.kind === 'hoover') drawHoover(ctx, x, y, s, opts.angle ?? 0, opts.t ?? 0, opts.active);
}

export function drawPuddle(ctx, d, t = 0) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.fillStyle = GRAVY;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = d.r * (1 + Math.sin(a * 3 + d.seed) * 0.15 + Math.sin(a * 5 + d.seed * 2 + t * 1.5) * 0.05);
    const px = Math.cos(a) * wob;
    const py = Math.sin(a) * wob * 0.75;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fill();
  ctx.fillStyle = GRAVY_LIGHT;
  ctx.beginPath();
  ctx.ellipse(-d.r * 0.15, -d.r * 0.1, d.r * 0.55, d.r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-d.r * 0.35, -d.r * 0.3, d.r * 0.22, d.r * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawBubble(ctx, x, y, text, opts = {}) {
  ctx.save();
  ctx.font = `600 ${opts.size ?? 12}px ${FONT}`;
  const lines = wrapText(ctx, text, opts.maxWidth ?? 150);
  const lh = (opts.size ?? 12) + 3;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
  const h = lines.length * lh + 10;
  let bx = x - w / 2;
  bx = Math.max(4, Math.min(956 - w, bx));
  const by = y - h - 10;
  roundRect(ctx, bx, by, w, h, 8);
  ctx.fillStyle = opts.fill ?? '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, by + h - 1);
  ctx.lineTo(x, by + h + 9);
  ctx.lineTo(x + 6, by + h - 1);
  ctx.fill();
  roundRect(ctx, bx, by, w, h, 8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = opts.color ?? INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 6 + i * lh));
  ctx.restore();
}

export function drawRing(ctx, x, y, r, frac, color, width = 4) {
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  circle(ctx, x, y, r);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, frac)));
  ctx.stroke();
  ctx.restore();
}

export function patienceColour(frac) {
  if (frac > 0.6) return '#66bb6a';
  if (frac > 0.3) return '#ffca28';
  return '#ef5350';
}
