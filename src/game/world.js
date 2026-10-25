// Restaurant layout. All coordinates are in world pixels (960 x 600 play area).
export const W = 960;
export const H = 600;
export const HUD_H = 60;

export const MEATS = ['beef', 'turkey', 'gammon'];
export const MEAT_NAMES = { beef: 'Beef', turkey: 'Turkey', gammon: 'Gammon' };
export const MEAT_PRICES = { beef: 10.99, turkey: 9.49, gammon: 9.99 };

export const COUNTER_FRONT = 110;
export const DOOR = { x: 0, y: 470, w: 20, h: 90 };
export const DOOR_POINT = { x: -30, y: 515 };
export const ENTRY_POINT = { x: 30, y: 515 };
export const QUEUE_SPOTS = [
  { x: 80, y: 500 },
  { x: 80, y: 395 },
  { x: 80, y: 290 },
  { x: 80, y: 185 },
];

const TABLE_LAYOUT = [
  { x: 220, y: 190, w: 100, h: 70, seats: 4 },
  { x: 450, y: 190, w: 70, h: 70, seats: 2 },
  { x: 660, y: 190, w: 100, h: 70, seats: 4 },
  { x: 230, y: 400, w: 70, h: 70, seats: 2 },
  { x: 440, y: 400, w: 100, h: 70, seats: 4 },
  { x: 670, y: 400, w: 70, h: 70, seats: 2 },
];

const STATION_LAYOUT = [
  { id: 'counterA', kind: 'counter', x: 150, w: 60, label: 'Counter' },
  { id: 'beef', kind: 'carvery', meat: 'beef', x: 220, w: 70, label: 'Beef' },
  { id: 'turkey', kind: 'carvery', meat: 'turkey', x: 290, w: 70, label: 'Turkey' },
  { id: 'gammon', kind: 'carvery', meat: 'gammon', x: 360, w: 70, label: 'Gammon' },
  { id: 'gravy', kind: 'gravy', x: 450, w: 80, label: 'Gravy' },
  { id: 'stove', kind: 'stove', x: 550, w: 80, label: 'Stove' },
  { id: 'counterB', kind: 'counter', x: 650, w: 60, label: 'Counter' },
  { id: 'bin', kind: 'bin', x: 730, w: 50, label: 'Bin' },
  { id: 'till', kind: 'till', x: 800, w: 100, label: 'Till' },
];

export function seatPositions(t) {
  const left = t.x - 24;
  const right = t.x + t.w + 24;
  if (t.seats === 2) {
    const cy = t.y + t.h / 2;
    return [{ x: left, y: cy, side: -1 }, { x: right, y: cy, side: 1 }];
  }
  const y1 = t.y + t.h * 0.27;
  const y2 = t.y + t.h * 0.73;
  return [
    { x: left, y: y1, side: -1 },
    { x: right, y: y1, side: 1 },
    { x: left, y: y2, side: -1 },
    { x: right, y: y2, side: 1 },
  ];
}

export function createWorld(numTables = 6) {
  const tables = TABLE_LAYOUT.slice(0, numTables).map((t, i) => ({
    ...t,
    id: i,
    number: i + 1,
    party: null,
    seatPos: seatPositions(t),
  }));
  const stations = STATION_LAYOUT.map((s) => ({
    ...s,
    y: 60,
    h: 50,
    item: null,
  }));
  const byId = Object.fromEntries(stations.map((s) => [s.id, s]));
  byId.gravy.item = { kind: 'pot', level: 100 };
  const hooverDock = { id: 'hoover', kind: 'hoover', x: 890, y: 480, w: 50, h: 110, label: 'Hoover', item: { kind: 'hoover' } };
  stations.push(hooverDock);
  byId.hoover = hooverDock;

  const solids = [
    { x: -60, y: 0, w: W + 120, h: COUNTER_FRONT },
    { x: -60, y: 0, w: 80, h: DOOR.y },
    { x: -60, y: DOOR.y + DOOR.h, w: 80, h: 200 },
    { x: -60, y: DOOR.y, w: 60, h: DOOR.h },
    { x: W - 20, y: 0, w: 80, h: H + 60 },
    { x: -60, y: H - 10, w: W + 120, h: 80 },
    hooverDock,
    ...tables,
  ];
  return { tables, stations, byId, solids };
}

export function distToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function rectCenter(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// Push a circle out of a list of rectangles.
export function collideCircle(obj, solids) {
  for (const r of solids) {
    const cx = Math.max(r.x, Math.min(obj.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(obj.y, r.y + r.h));
    let dx = obj.x - cx;
    let dy = obj.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < obj.r) {
      if (d === 0) {
        // Centre inside the rectangle: push out along the shallowest axis.
        const left = obj.x - r.x;
        const right = r.x + r.w - obj.x;
        const top = obj.y - r.y;
        const bottom = r.y + r.h - obj.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) obj.x = r.x - obj.r;
        else if (m === right) obj.x = r.x + r.w + obj.r;
        else if (m === top) obj.y = r.y - obj.r;
        else obj.y = r.y + r.h + obj.r;
      } else {
        const push = obj.r - d;
        dx /= d;
        dy /= d;
        obj.x += dx * push;
        obj.y += dy * push;
        const vn = obj.vx * dx + obj.vy * dy;
        if (vn < 0) {
          obj.vx -= vn * dx;
          obj.vy -= vn * dy;
        }
      }
    }
  }
}
