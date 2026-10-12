// Damage meter: real damage dealt by the hero and their minions over a rolling 30 s window of game time, in 0.1 s
// buckets (game.update ticks it only while the world runs, so menus and pauses don't drain it).
const STEP = 0.1, N = 300, WINDOW = N * STEP;

export const Meter = {
  buckets: new Float64Array(N),
  i: 0,
  acc: 0,
  sum: 0,
  char: null,
  add(n) { if (n > 0) this.buckets[this.i] += n; },
  tick(dt) {
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.i = (this.i + 1) % N;
      this.buckets[this.i] = 0;
    }
    let s = 0;
    for (let k = 0; k < N; k++) s += this.buckets[k];
    this.sum = s;
  },
  /** Average damage per second over the last 30 s. */
  avg() { return this.sum / WINDOW; },
  /** Damage per second for each of the last `n` seconds, oldest first. */
  perSecond(n = 30) {
    const out = new Array(n).fill(0), per = Math.round(1 / STEP);
    for (let k = 0; k < n * per; k++) out[n - 1 - Math.floor(k / per)] += this.buckets[(this.i - k + N * 2) % N];
    return out;
  },
  reset() { this.buckets.fill(0); this.sum = 0; this.acc = 0; },
};
