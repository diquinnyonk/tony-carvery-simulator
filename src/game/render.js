// Draws the restaurant, everyone in it and the HUD.
import { W, H, HUD_H, DOOR, QUEUE_SPOTS, COUNTER_FRONT, MEAT_NAMES } from './world.js';
import {
  FONT, DISPLAY_FONT, INK, GRAVY, MEAT_COLOURS, TONY_LOOK, roundRect, drawPerson, drawPlate,
  drawPot, drawHoover, drawHeld, drawPuddle, drawBubble, drawRing, drawBill, patienceColour,
  wrapText, shade,
} from '../engine/draw.js';
import { tutorialPrompt } from './tutorial.js';
import { money } from './game.js';

let floorPattern = null;

// Pause button lives in the HUD so it scales with the canvas.
export const PAUSE_BTN = { x: W - 160, y: 30, r: 19 };

function getFloorPattern(ctx) {
  if (floorPattern) return floorPattern;
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#7a2633';
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = '#8a2f3d';
  g.fillRect(0, 0, 24, 24);
  g.fillRect(24, 24, 24, 24);
  g.strokeStyle = 'rgba(232,184,90,0.55)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(24, 6);
  g.lineTo(42, 24);
  g.lineTo(24, 42);
  g.lineTo(6, 24);
  g.closePath();
  g.stroke();
  g.fillStyle = 'rgba(232,184,90,0.7)';
  g.beginPath();
  g.arc(24, 24, 2.5, 0, Math.PI * 2);
  g.fill();
  floorPattern = ctx.createPattern(c, 'repeat');
  return floorPattern;
}

export function drawGame(ctx, game, t, opts = {}) {
  ctx.save();
  ctx.clearRect(0, 0, W, H + HUD_H);
  drawHud(ctx, game, t);
  ctx.translate(0, HUD_H);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  drawFloor(ctx);
  drawKitchen(ctx, game, t);
  drawDoorArea(ctx, game, t);
  drawTables(ctx, game, t);
  for (const d of game.puddles) drawPuddle(ctx, d, t);
  drawFocus(ctx, game, t, opts);
  drawEntities(ctx, game, t);
  drawOverheads(ctx, game, t);
  for (const f of game.floats) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t * 1.5);
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
  drawTutorial(ctx, game, t);
  drawActionLabel(ctx, game, opts);
  ctx.restore();
}

function drawFloor(ctx) {
  ctx.fillStyle = getFloorPattern(ctx);
  ctx.fillRect(0, COUNTER_FRONT, W, H - COUNTER_FRONT);
  // skirting walls
  ctx.fillStyle = '#4a2a1a';
  ctx.fillRect(0, COUNTER_FRONT, 20, DOOR.y - COUNTER_FRONT);
  ctx.fillRect(0, DOOR.y + DOOR.h, 20, H - DOOR.y - DOOR.h);
  ctx.fillRect(W - 20, COUNTER_FRONT, 20, H - COUNTER_FRONT);
  ctx.fillRect(0, H - 10, W, 10);
}

function drawKitchen(ctx, game, t) {
  // back wall tiles
  ctx.fillStyle = '#f4ead6';
  ctx.fillRect(0, 0, W, 60);
  ctx.strokeStyle = 'rgba(120,100,70,0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 60);
    ctx.stroke();
  }
  for (let y = 0; y < 60; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // sign
  roundRect(ctx, 14, 8, 120, 40, 8);
  ctx.fillStyle = '#b3262e';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f4c430';
  ctx.stroke();
  ctx.fillStyle = '#fff3d6';
  ctx.font = `20px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText("TONY'S", 74, 30);
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillText('CARVERY', 74, 43);

  // counter top
  ctx.fillStyle = '#b8c0c8';
  ctx.fillRect(0, 60, W, 50);
  ctx.fillStyle = '#8c959e';
  ctx.fillRect(0, 104, W, 6);

  for (const s of game.world.stations) {
    if (s.kind === 'hoover') drawHooverDock(ctx, s, t);
    else drawStation(ctx, s, game, t);
  }
}

function label(ctx, text, x, y, color = INK, size = 10) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawStation(ctx, s, game, t) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  ctx.save();
  switch (s.kind) {
    case 'counter':
      roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 12, 6);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#6e7780';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.item) drawHeld(ctx, s.item, cx, cy - 3, 0.9);
      break;
    case 'carvery': {
      // heat lamp glow
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 36);
      glow.addColorStop(0, `rgba(255,170,60,${0.45 + Math.sin(t * 3) * 0.08})`);
      glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(s.x, s.y - 10, s.w, s.h + 10);
      roundRect(ctx, s.x + 6, s.y + 6, s.w - 12, s.h - 16, 8);
      ctx.fillStyle = '#6d4c2f';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4, 18, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = MEAT_COLOURS[s.meat];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = shade(MEAT_COLOURS[s.meat], -0.15);
      for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * 7 - 1, cy - 12, 2, 16);
      label(ctx, MEAT_NAMES[s.meat].toUpperCase(), cx, s.y + s.h - 2, '#fff8e1');
      break;
    }
    case 'gravy': {
      ctx.fillStyle = '#5d6670';
      roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 10, 8);
      ctx.fill();
      if (s.item) drawPot(ctx, cx - 6, cy - 3, s.item, 1.05);
      // level meter
      const lvl = s.item ? s.item.level / 100 : 0;
      roundRect(ctx, s.x + s.w - 14, s.y + 6, 8, s.h - 14, 3);
      ctx.fillStyle = '#222';
      ctx.fill();
      ctx.fillStyle = lvl > 0.3 ? '#c27a2c' : '#ef5350';
      const mh = (s.h - 16) * lvl;
      ctx.fillRect(s.x + s.w - 13, s.y + 7 + (s.h - 16) - mh, 6, mh);
      label(ctx, 'GRAVY', cx, s.y + s.h - 1, '#fff8e1');
      if (s.item && s.item.level <= 0 && Math.sin(t * 8) > 0) label(ctx, 'EMPTY!', cx, s.y - 4, '#ff5252', 12);
      if (!s.item && Math.sin(t * 6) > 0) label(ctx, 'NO POT', cx, s.y - 4, '#ff5252', 12);
      break;
    }
    case 'stove': {
      roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 10, 6);
      ctx.fillStyle = '#2f3337';
      ctx.fill();
      const lit = !!s.item;
      for (const ox of [-18, 18]) {
        ctx.beginPath();
        ctx.arc(cx + ox, cy - 3, 12, 0, Math.PI * 2);
        ctx.strokeStyle = lit ? `rgba(255,${90 + Math.sin(t * 10) * 30},40,0.9)` : '#555';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (s.item) {
        drawPot(ctx, cx, cy - 3, s.item, 1);
        if (s.item.level < 100) {
          drawRing(ctx, cx, cy - 3, 20, s.item.stir || 0, '#ffd54f', 4);
          if (game.stirring) {
            ctx.strokeStyle = '#d7b98e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const a = t * 12;
            ctx.moveTo(cx, cy - 3);
            ctx.lineTo(cx + Math.cos(a) * 9, cy - 3 + Math.sin(a) * 9);
            ctx.stroke();
          }
        } else {
          // steam
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            const ph = t * 3 + i;
            ctx.moveTo(cx + i * 6, cy - 12);
            ctx.quadraticCurveTo(cx + i * 6 + Math.sin(ph) * 5, cy - 22, cx + i * 6, cy - 30);
            ctx.stroke();
          }
        }
      }
      label(ctx, 'STOVE', cx, s.y + s.h - 1, '#fff8e1');
      break;
    }
    case 'bin':
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#4e5a65';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#2d343a';
      ctx.fill();
      label(ctx, 'BIN', cx, s.y + s.h - 1, '#fff8e1');
      break;
    case 'till': {
      roundRect(ctx, s.x + 10, s.y + 2, s.w - 20, s.h - 10, 6);
      ctx.fillStyle = '#37474f';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      roundRect(ctx, s.x + 18, s.y + 7, 36, 14, 3);
      ctx.fillStyle = '#9ccc65';
      ctx.fill();
      ctx.fillStyle = '#1b5e20';
      ctx.font = `bold 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(money(game.money), s.x + 36, s.y + 18);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = '#cfd8dc';
          ctx.fillRect(s.x + 18 + i * 12, s.y + 25 + j * 7, 9, 5);
        }
      }
      drawBill(ctx, s.x + s.w - 24, cy - 4, 0.9);
      label(ctx, 'TILL', cx, s.y + s.h - 1, '#fff8e1');
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawHooverDock(ctx, s, t) {
  ctx.save();
  roundRect(ctx, s.x, s.y, s.w + 10, s.h, 6);
  ctx.fillStyle = '#5d4037';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.save();
  ctx.translate(s.x + 9, s.y + s.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `bold 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('GRAVY HOOVER 3000', 0, 3);
  ctx.restore();
  if (s.item) drawHoover(ctx, s.x + 36, s.y + s.h / 2 + 18, 0.85, -Math.PI / 2, t);
  ctx.restore();
}

function drawDoorArea(ctx, game, t) {
  // door mat + door
  ctx.fillStyle = '#3e2c1c';
  ctx.fillRect(0, DOOR.y, 20, DOOR.h);
  ctx.fillStyle = '#c9a26b';
  ctx.fillRect(0, DOOR.y + 4, 8, DOOR.h - 8);
  roundRect(ctx, 22, DOOR.y + 8, 44, DOOR.h - 16, 6);
  ctx.fillStyle = '#a1887f';
  ctx.fill();
  ctx.fillStyle = '#efebe9';
  ctx.font = `bold 9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(44, DOOR.y + DOOR.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('WELCOME', 0, 3);
  ctx.restore();
  // queue rope
  ctx.strokeStyle = 'rgba(244,196,48,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(140, 150);
  ctx.lineTo(140, 470);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,243,214,0.75)';
  ctx.font = `bold 11px ${FONT}`;
  ctx.save();
  ctx.translate(152, 310);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('PLEASE WAIT TO BE SEATED', 0, 0);
  ctx.restore();
  void QUEUE_SPOTS;
  void t;
}

function drawTables(ctx, game, t) {
  for (const tb of game.world.tables) {
    // chairs
    for (const sp of tb.seatPos) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y + 4, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#5d3a1a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, tb.x + 4, tb.y + 6, tb.w, tb.h, 10);
    ctx.fill();
    roundRect(ctx, tb.x, tb.y, tb.w, tb.h, 10);
    ctx.fillStyle = '#a8703f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(tb.x + 6, tb.y + (tb.h * i) / 4);
      ctx.lineTo(tb.x + tb.w - 6, tb.y + (tb.h * i) / 4);
      ctx.stroke();
    }
    // table number
    ctx.beginPath();
    ctx.arc(tb.x + tb.w / 2, tb.y + tb.h / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3d6';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tb.number), tb.x + tb.w / 2, tb.y + tb.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    // plates of seated diners
    const p = tb.party;
    if (p && (p.state === 'eating' || p.state === 'wantsBill' || p.state === 'running')) {
      p.guests.forEach((g, i) => {
        const sp = tb.seatPos[i];
        if (!g.served) return;
        const px = sp.side < 0 ? tb.x + 16 : tb.x + tb.w - 16;
        const left = p.state === 'eating' ? Math.max(0.1, 1 - p.timer / p.eatTime) : 0.1;
        drawPlate(ctx, px, sp.y, { meat: g.meat, gravy: g.plateGravy * left }, 0.95);
      });
    }
  }
}

function moodFor(p) {
  if (p.state === 'running') return 'shock';
  if (p.angry) return 'angry';
  if (p.patienceMax > 0) {
    const f = p.patience / p.patienceMax;
    if (f < 0.3) return 'angry';
    if (f < 0.6) return 'neutral';
  }
  return 'happy';
}

function drawEntities(ctx, game, t) {
  const list = [];
  for (const p of game.parties) {
    const m = moodFor(p);
    for (const g of p.guests) list.push({ y: g.y, kind: 'guest', g, p, mood: m });
  }
  list.push({ y: game.player.y, kind: 'player' });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if (e.kind === 'player') drawTony(ctx, game, t);
    else {
      const sitting = ['seated', 'ordering', 'waitingFood', 'eating', 'wantsBill'].includes(e.p.state);
      const armsUp = (e.p.state === 'ordering' || e.p.state === 'wantsBill') && e.g === e.p.guests[0];
      drawPerson(ctx, e.g.x, e.g.y - (sitting ? 4 : 0), e.g.look, {
        t,
        moving: e.g.moving,
        phase: e.g.phase,
        mood: e.mood,
        sitting,
        armsUp: armsUp && Math.sin(t * 6) > -0.3,
        lean: e.p.state === 'running' ? -0.25 : 0,
      });
      if (e.g.look.name && game.level.id !== 0) {
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff3d6';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.strokeText(e.g.look.name, e.g.x, e.g.y + 26);
        ctx.fillText(e.g.look.name, e.g.x, e.g.y + 26);
      }
    }
  }
}

function drawTony(ctx, game, t) {
  const p = game.player;
  const moving = Math.hypot(p.vx, p.vy) > 20;
  const lean = p.slipping ? Math.sin(t * 20) * 0.25 : p.dashT > 0 ? p.fx * 0.2 : 0;
  const held = p.held;
  const behind = held && p.fy < -0.3;
  const hx = p.x + p.fx * 18;
  const hy = p.y + p.fy * 10 - 4;
  const angle = Math.atan2(p.fy, p.fx);
  if (behind) drawHeld(ctx, held, hx, hy, 0.9, { angle, t, active: game.hoovering });
  if (p.dashT > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x - p.fx * 20 + i * 6 * p.fy, p.y - p.fy * 20 + i * 6 * p.fx);
      ctx.lineTo(p.x - p.fx * 40 + i * 6 * p.fy, p.y - p.fy * 40 + i * 6 * p.fx);
      ctx.stroke();
    }
  }
  drawPerson(ctx, p.x, p.y, TONY_LOOK, { t, moving, phase: 0, mood: p.slipping ? 'shock' : 'happy', lean });
  if (!behind) drawHeld(ctx, held, hx, hy, 0.9, { angle, t, active: game.hoovering });
}

function partyIcon(ctx, x, y, p, t) {
  const frac = p.patienceMax ? p.patience / p.patienceMax : 1;
  const col = patienceColour(frac);
  const bob = Math.sin(t * 5) * 2;
  const iy = y + bob;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, iy, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf2';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (p.patienceMax) drawRing(ctx, x, iy, 17, frac, col, 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  switch (p.state) {
    case 'waiting':
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(String(p.size), x, iy + 1);
      break;
    case 'ordering':
      // notepad
      ctx.fillStyle = '#fff59d';
      ctx.fillRect(x - 6, iy - 8, 12, 15);
      ctx.strokeRect(x - 6, iy - 8, 12, 15);
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 4, iy - 4 + i * 4, 8, 1.2);
      break;
    case 'waitingFood':
      drawPlate(ctx, x, iy, { meat: p.guests[0].meat, gravy: 1 }, 0.85);
      break;
    case 'wantsBill':
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = '#2e7d32';
      ctx.fillText('£', x, iy + 1);
      break;
    case 'running':
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = '#d32f2f';
      ctx.fillText('!!', x, iy + 1);
      break;
    default:
      break;
  }
  ctx.restore();
}

function drawOverheads(ctx, game, t) {
  for (const p of game.parties) {
    const lead = p.guests[0];
    const showIcon = ['waiting', 'ordering', 'waitingFood', 'wantsBill', 'running'].includes(p.state);
    let topY = Math.min(...p.guests.map((g) => g.y - 30 * g.look.size)) - 18;
    if (p.table && p.state !== 'running') {
      const cx = p.table.x + p.table.w / 2;
      const cy = p.table.y - 18;
      if (showIcon) partyIcon(ctx, cx, cy, p, t);
      if (p.state === 'eating') {
        drawRing(ctx, cx, cy, 10, p.holdEating ? 0.5 : p.timer / p.eatTime, '#a5d6a7', 4);
      }
      topY = cy - 20;
      if (p.bubble) drawBubble(ctx, cx, topY, p.bubble.text);
    } else {
      if (showIcon) partyIcon(ctx, lead.x, topY, p, t);
      if (p.bubble) drawBubble(ctx, lead.x, topY - 18, p.bubble.text);
    }
  }
}

function focusRect(game) {
  const f = game.focus;
  if (!f) return null;
  if (f.kind === 'station' || f.kind === 'table') return f.ref;
  if (f.kind === 'party') {
    const xs = f.ref.guests.map((g) => g.x);
    const ys = f.ref.guests.map((g) => g.y);
    return { x: Math.min(...xs) - 18, y: Math.min(...ys) - 34, w: Math.max(...xs) - Math.min(...xs) + 36, h: Math.max(...ys) - Math.min(...ys) + 54 };
  }
  return null;
}

function drawFocus(ctx, game, t) {
  const r = focusRect(game);
  if (!r) return;
  ctx.save();
  roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10);
  ctx.lineWidth = 3 + Math.sin(t * 8);
  ctx.strokeStyle = game.focus.ok ? 'rgba(255,235,59,0.95)' : 'rgba(255,138,128,0.7)';
  ctx.stroke();
  ctx.restore();
}

function drawActionLabel(ctx, game, opts) {
  const f = game.focus;
  if (!f) return;
  const key = opts.touch ? 'ACTION' : 'SPACE';
  const text = f.ok ? `${key}: ${f.label}` : f.label;
  ctx.save();
  ctx.font = `bold 14px ${FONT}`;
  const w = ctx.measureText(text).width + 24;
  const p = game.player;
  let x = p.x - w / 2;
  x = Math.max(6, Math.min(W - w - 6, x));
  let y = p.y + 30;
  if (y > H - 34) y = p.y - 78;
  roundRect(ctx, x, y, w, 24, 12);
  ctx.fillStyle = f.ok ? 'rgba(33,25,16,0.88)' : 'rgba(80,30,30,0.85)';
  ctx.fill();
  ctx.fillStyle = f.ok ? '#ffe082' : '#ffcdd2';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 12, y + 12.5);
  ctx.restore();
}

function drawTutorial(ctx, game, t) {
  const info = tutorialPrompt(game);
  if (!info || game.over) return;
  if (info.target) {
    const { x, y } = info.target;
    const bob = Math.sin(t * 6) * 6;
    ctx.save();
    ctx.translate(x, y - 46 + bob);
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.lineTo(12, -16);
    ctx.lineTo(12, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.font = `600 16px ${FONT}`;
  const lines = wrapText(ctx, info.text, 560);
  const h = lines.length * 21 + 34;
  const w = 600;
  const x = (W - w) / 2;
  const y = H - h - 14;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = 'rgba(30,20,12,0.9)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f4c430';
  ctx.stroke();
  ctx.fillStyle = '#f4c430';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`STEP ${info.index + 1} OF ${info.total}`, x + 20, y + 20);
  ctx.fillStyle = '#fff8e1';
  ctx.font = `600 16px ${FONT}`;
  lines.forEach((l, i) => ctx.fillText(l, x + 20, y + 42 + i * 21));
  ctx.restore();
}

// ---------- HUD ----------

function drawHud(ctx, game, t) {
  const g = ctx.createLinearGradient(0, 0, 0, HUD_H);
  g.addColorStop(0, '#4a2c17');
  g.addColorStop(1, '#2f1b0e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#f4c430';
  ctx.fillRect(0, HUD_H - 3, W, 3);

  // timer
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const tl = game.timeLeft;
  let timeText = 'TUTORIAL';
  if (tl != null) {
    const s = Math.ceil(tl);
    timeText = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  const urgent = tl != null && tl < 10;
  roundRect(ctx, 10, 9, 112, 42, 10);
  ctx.fillStyle = urgent && Math.sin(t * 10) > 0 ? '#c62828' : '#1c120a';
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.font = `${tl == null ? 18 : 26}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(timeText, 66, 32);

  // served
  roundRect(ctx, 130, 9, 120, 42, 10);
  ctx.fillStyle = '#1c120a';
  ctx.fill();
  ctx.fillStyle = '#c5e1a5';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('SERVED', 190, 20);
  ctx.fillStyle = '#fff3d6';
  ctx.font = `22px ${DISPLAY_FONT}`;
  ctx.fillText(`${game.served} / ${game.level.target}`, 190, 39);

  // money
  roundRect(ctx, W - 130, 9, 120, 42, 10);
  ctx.fillStyle = '#1c120a';
  ctx.fill();
  ctx.fillStyle = '#c5e1a5';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('TAKINGS', W - 70, 20);
  ctx.fillStyle = game.money < 0 ? '#ff8a80' : '#fff3d6';
  ctx.font = `20px ${DISPLAY_FONT}`;
  ctx.fillText(money(game.money), W - 70, 39);

  // pause button
  ctx.beginPath();
  ctx.arc(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3d6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f4c430';
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(PAUSE_BTN.x - 6, PAUSE_BTN.y - 8, 4, 16);
  ctx.fillRect(PAUSE_BTN.x + 2, PAUSE_BTN.y - 8, 4, 16);

  // order tickets
  const tickets = game.parties.filter((p) => p.state === 'waitingFood').sort((a, b) => a.patience - b.patience).slice(0, 7);
  let x = 262;
  for (const p of tickets) {
    const unserved = p.guests.filter((g) => !g.served);
    const w = 22 + unserved.length * 22;
    if (x + w > W - 190) break;
    ctx.save();
    ctx.translate(x, 6);
    roundRect(ctx, 0, 0, w, 48, 5);
    ctx.fillStyle = '#fffdf2';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#b3262e';
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`T${p.table?.number ?? '?'}`, 4, 9);
    unserved.forEach((g, i) => {
      const px = 22 + i * 22;
      drawPlate(ctx, px, 25, { meat: g.meat, gravy: 0 }, 0.8);
      if (g.gravyNeed > 1) {
        ctx.fillStyle = GRAVY;
        ctx.font = `bold 9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('x2', px + 8, 11);
      }
      ctx.fillStyle = INK;
      ctx.font = `bold 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(MEAT_NAMES[g.meat].slice(0, 4).toUpperCase(), px, 42);
    });
    const frac = p.patience / p.patienceMax;
    ctx.fillStyle = patienceColour(frac);
    ctx.fillRect(2, 45, (w - 4) * frac, 3);
    ctx.restore();
    x += w + 6;
  }
  ctx.textBaseline = 'alphabetic';
}
