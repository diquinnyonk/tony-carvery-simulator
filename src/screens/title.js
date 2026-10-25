// Animated title: Tony drowning a carvery dinner in gravy while the guests look on.
import { drawPerson, drawPlate, drawPuddle, TONY_LOOK, GRAVY, INK, roundRect } from '../engine/draw.js';
import { randomLook } from '../game/guestTypes.js';
import { createRng } from '../game/rng.js';

export function createTitleAnimation(canvas) {
  const ctx = canvas.getContext('2d');
  const rng = createRng(7);
  const guests = [
    { look: randomLook('posh', rng), x: 340, y: 150 },
    { look: randomLook('bigEater', rng), x: 450, y: 150 },
    { look: randomLook('chav', rng), x: 400, y: 215 },
  ];
  let raf = 0;
  let start = 0;

  const draw = (now) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // spotlight
    const g = ctx.createRadialGradient(260, 150, 20, 260, 150, 260);
    g.addColorStop(0, 'rgba(244,196,48,0.25)');
    g.addColorStop(1, 'rgba(244,196,48,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // floor puddle that grows and resets
    const cycle = t % 6;
    drawPuddle(ctx, { x: 285, y: 222, r: 10 + Math.min(cycle, 4) * 5, seed: 3 }, t);

    // table
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, 228, 158, 120, 56, 10);
    ctx.fill();
    roundRect(ctx, 222, 150, 120, 56, 10);
    ctx.fillStyle = '#a8703f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    const fill = Math.min(2, 0.4 + (cycle / 4) * 1.6);
    drawPlate(ctx, 282, 176, { meat: 'beef', gravy: fill }, 2.1);

    // gravy stream from the jug
    ctx.save();
    ctx.translate(232, 92);
    ctx.rotate(0.9 + Math.sin(t * 3) * 0.05);
    roundRect(ctx, -16, -12, 34, 24, 8);
    ctx.fillStyle = '#fafafa';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = GRAVY;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 + Math.sin(t * 9) * 1.5;
    ctx.beginPath();
    ctx.moveTo(248, 108);
    ctx.quadraticCurveTo(272 + Math.sin(t * 5) * 2, 120, 280, 170);
    ctx.stroke();
    // drips
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.5 + i / 3) % 1;
      ctx.fillStyle = GRAVY;
      ctx.beginPath();
      ctx.arc(330 + i * 6, 190 + p * 40, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPerson(ctx, 170, 142, TONY_LOOK, { t, scale: 2.1, mood: 'happy' });
    guests.forEach((gu, i) => {
      drawPerson(ctx, gu.x, gu.y, gu.look, { t: t + i, scale: 1.8, mood: i === 2 ? 'shock' : 'happy', armsUp: i === 1 && Math.sin(t * 4) > 0 });
    });
    raf = requestAnimationFrame(draw);
  };

  return {
    start() {
      cancelAnimationFrame(raf);
      start = performance.now();
      raf = requestAnimationFrame(draw);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
