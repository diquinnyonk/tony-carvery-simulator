// Keyboard + touch input. poll() returns one frame of input and clears the "pressed" edges.
const ACTION_KEYS = new Set(['Space', 'KeyE', 'Enter', 'NumpadEnter']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyQ']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput({ stick, knob, actionBtn, dashBtn }) {
  const keys = new Set();
  let actionPressed = false;
  let dashPressed = false;
  let pausePressed = false;
  let touchAction = false;
  const touchMove = { x: 0, y: 0 };
  let enabled = false;

  window.addEventListener('keydown', (e) => {
    if (!enabled) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (ACTION_KEYS.has(e.code)) actionPressed = true;
    if (DASH_KEYS.has(e.code)) dashPressed = true;
    if (PAUSE_KEYS.has(e.code)) pausePressed = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // Virtual joystick
  let stickId = null;
  let origin = null;
  const RADIUS = 46;
  const setKnob = (dx, dy) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  stick.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect();
    origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    moveStick(e);
  });
  const moveStick = (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob(dx, dy);
    if (d < 6) {
      touchMove.x = 0;
      touchMove.y = 0;
      return;
    }
    // Past half way the stick counts as full speed.
    const k = Math.min(1, (d / RADIUS) * 2);
    touchMove.x = (dx / Math.hypot(dx, dy)) * k;
    touchMove.y = (dy / Math.hypot(dx, dy)) * k;
  };
  stick.addEventListener('pointermove', moveStick);
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    touchMove.x = 0;
    touchMove.y = 0;
    setKnob(0, 0);
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  const bindButton = (el, onDown, onUp) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('down');
      onDown();
    });
    const up = () => {
      el.classList.remove('down');
      onUp?.();
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  bindButton(actionBtn, () => { actionPressed = true; touchAction = true; }, () => { touchAction = false; });
  bindButton(dashBtn, () => { dashPressed = true; });

  const has = (...codes) => codes.some((c) => keys.has(c));

  return {
    setEnabled(v) {
      enabled = v;
      if (!v) {
        keys.clear();
        actionPressed = dashPressed = pausePressed = touchAction = false;
      }
    },
    poll() {
      let mx = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
      let my = (has('KeyS', 'ArrowDown') ? 1 : 0) - (has('KeyW', 'ArrowUp') ? 1 : 0);
      if (!mx && !my) {
        mx = touchMove.x;
        my = touchMove.y;
      }
      const frame = {
        mx,
        my,
        actionPressed,
        actionHeld: touchAction || [...ACTION_KEYS].some((k) => keys.has(k)),
        dashPressed,
        pausePressed,
      };
      actionPressed = false;
      dashPressed = false;
      pausePressed = false;
      return frame;
    },
  };
}
