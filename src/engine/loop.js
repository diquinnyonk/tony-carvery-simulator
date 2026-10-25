// Fixed-step update loop with a variable-rate render.
export function createLoop(update, render, step = 1 / 60) {
  let running = false;
  let last = 0;
  let acc = 0;
  let raf = 0;

  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render(now / 1000);
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}
