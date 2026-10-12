// Tile map: floor grid, wall segments, collision, line of sight and path finding.
export class TileMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.t = new Uint8Array(w * h); // 0 void, 1 floor
    this.v = new Uint8Array(w * h); // floor visual variant index
    this.block = new Uint8Array(w * h); // static obstacle on floor
    this.seen = new Uint8Array(w * h);
    this.segments = []; // floor/void edges
    this.walls = []; // wall draw items (buildWalls)
    this.doors = [];
    this.segGrid = null;
    this.flow = new Int16Array(w * h);
    this.flowFrom = [-999, -999];
    this.flowTime = 0;
  }
  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inb(x, y) ? this.t[y * this.w + x] : 0; }
  isFloor(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.t[ty * this.w + tx] === 1;
  }
  walkableTile(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.t[ty * this.w + tx] === 1 && !this.block[ty * this.w + tx];
  }
  walkable(x, y) { return this.walkableTile(Math.floor(x), Math.floor(y)); }

  /** Is a circle at (x,y) radius r free of walls? */
  circleFree(x, y, r) {
    return this.walkable(x - r, y - r) && this.walkable(x + r, y - r) && this.walkable(x - r, y + r) && this.walkable(x + r, y + r);
  }

  /** Move a circle with wall sliding. Returns true if moved at all. */
  move(e, dx, dy, ghost = false) {
    if (ghost) {
      const nx = e.x + dx, ny = e.y + dy;
      if (this.isFloor(nx, ny)) { e.x = nx; e.y = ny; return true; }
      return false;
    }
    const r = e.r * 0.8;
    let moved = false;
    if (dx !== 0) {
      const nx = e.x + dx;
      if (this.circleFree(nx, e.y, r)) { e.x = nx; moved = true; }
    }
    if (dy !== 0) {
      const ny = e.y + dy;
      if (this.circleFree(e.x, ny, r)) { e.y = ny; moved = true; }
    }
    return moved;
  }

  /** Grid ray-march line of sight. */
  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    const steps = Math.ceil(d * 3);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.isFloor(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  /** Cast a ray, return the distance until a wall (max len). */
  rayLength(x0, y0, ang, len) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let d = 0.2; d <= len; d += 0.2) {
      if (!this.isFloor(x0 + c * d, y0 + s * d)) return Math.max(0, d - 0.2);
    }
    return len;
  }

  /** BFS distance field toward (tx,ty) used by every monster for pathing. */
  buildFlow(px, py, maxD = 48) {
    const tx = Math.floor(px), ty = Math.floor(py);
    if (tx === this.flowFrom[0] && ty === this.flowFrom[1]) return;
    this.flowFrom = [tx, ty];
    const f = this.flow;
    f.fill(-1);
    if (!this.walkableTile(tx, ty)) return;
    const W = this.w;
    const q = new Int32Array(this.w * this.h);
    let qh = 0, qt = 0;
    q[qt++] = ty * W + tx; f[ty * W + tx] = 0;
    while (qh < qt) {
      const i = q[qh++];
      const d = f[i];
      if (d >= maxD) continue;
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (!this.walkableTile(nx, ny)) continue;
        const ni = ny * W + nx;
        if (f[ni] !== -1) continue;
        f[ni] = d + 1;
        q[qt++] = ni;
      }
    }
  }
  flowAt(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!this.inb(tx, ty)) return -1;
    return this.flow[ty * this.w + tx];
  }
  /** Direction (tile centre) of the best next step along the flow field. */
  flowStep(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    const here = this.flowAt(x, y);
    if (here <= 0) return null;
    let best = here, bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = tx + ox, ny = ty + oy;
        if (!this.walkableTile(nx, ny)) continue;
        if (ox && oy && (!this.walkableTile(tx + ox, ty) || !this.walkableTile(tx, ty + oy))) continue;
        const v = this.flow[ny * this.w + nx];
        if (v >= 0 && v < best) { best = v; bx = ox; by = oy; }
      }
    }
    if (!bx && !by) return null;
    return [tx + bx + 0.5, ty + by + 0.5];
  }

  /**
   * A* path on tiles (8-dir), returns smoothed waypoints (start excluded) or null. The goal snaps to the nearest
   * walkable tile within 3; the last waypoint is the raw goal only when it was walkable. r: the mover's collision
   * half-size for smoothing (move() uses e.r * 0.8). Binary heap + typed arrays reused between calls, so the
   * minions can afford to path every few frames.
   */
  findPath(sx, sy, gx, gy, maxNodes = 3000, r = 0.28) {
    const W = this.w, N = W * this.h;
    const stx = Math.floor(sx), sty = Math.floor(sy);
    if (!this.inb(stx, sty)) return null;
    const s = sty * W + stx;
    let gtx = Math.floor(gx), gty = Math.floor(gy), snapped = false;
    if (!this.walkableTile(gtx, gty)) {
      // snap goal to nearest walkable tile
      let best = Infinity, bx = 0, by = 0;
      for (let oy = -3; oy <= 3; oy++) {
        for (let ox = -3; ox <= 3; ox++) {
          const d = ox * ox + oy * oy;
          if (d < best && this.walkableTile(gtx + ox, gty + oy)) { best = d; bx = ox; by = oy; }
        }
      }
      if (best === Infinity) return null;
      gtx += bx; gty += by; snapped = true;
    }
    const g = gty * W + gtx;
    const end = snapped ? [gtx + 0.5, gty + 0.5] : [gx, gy];
    if (s === g) return [end];
    if (!this._as || this._as.g.length !== N) this._as = { g: new Float32Array(N), came: new Int32Array(N), stamp: new Uint32Array(N), closed: new Uint32Array(N), gen: 0, heap: [], hf: [] };
    const A = this._as, gs = A.g, came = A.came, stamp = A.stamp, closed = A.closed;
    const gen = ++A.gen;
    const heap = A.heap, hf = A.hf;
    heap.length = 0; hf.length = 0;
    const h = (x, y) => { const dx = Math.abs(x - gtx), dy = Math.abs(y - gty); return dx + dy - 0.586 * Math.min(dx, dy); };
    const push = (i, f) => {
      let k = heap.length;
      heap.push(i); hf.push(f);
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (hf[p] <= f) break;
        heap[k] = heap[p]; hf[k] = hf[p]; k = p;
      }
      heap[k] = i; hf[k] = f;
    };
    const pop = () => {
      const top = heap[0], li = heap.pop(), lf = hf.pop(), n = heap.length;
      if (n) {
        let k = 0;
        for (;;) {
          let c = 2 * k + 1;
          if (c >= n) break;
          if (c + 1 < n && hf[c + 1] < hf[c]) c++;
          if (hf[c] >= lf) break;
          heap[k] = heap[c]; hf[k] = hf[c]; k = c;
        }
        heap[k] = li; hf[k] = lf;
      }
      return top;
    };
    stamp[s] = gen; gs[s] = 0; came[s] = -1;
    push(s, h(stx, sty));
    let n = 0;
    while (heap.length && n < maxNodes) {
      const cur = pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen; n++;
      if (cur === g) {
        const path = [];
        for (let c = came[cur]; c !== s && c >= 0; c = came[c]) path.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]);
        path.reverse();
        path.push(end);
        return this.smooth(sx, sy, path, r);
      }
      const cx = cur % W, cy = (cur / W) | 0, cg = gs[cur];
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = cx + ox, ny = cy + oy;
          if (!this.walkableTile(nx, ny)) continue;
          if (ox && oy && (!this.walkableTile(cx + ox, cy) || !this.walkableTile(cx, cy + oy))) continue;
          const ni = ny * W + nx;
          if (closed[ni] === gen) continue;
          const ng = cg + (ox && oy ? 1.414 : 1);
          if (stamp[ni] === gen && ng >= gs[ni]) continue;
          stamp[ni] = gen; gs[ni] = ng; came[ni] = cur;
          push(ni, ng + h(nx, ny));
        }
      }
    }
    return null;
  }
  smooth(sx, sy, path, r = 0.28) {
    // drop intermediate nodes with clear line of sight
    const out = [];
    let ax = sx, ay = sy, i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !this.losWide(ax, ay, path[j][0], path[j][1], r)) j--;
      out.push(path[j]);
      ax = path[j][0]; ay = path[j][1];
      i = j + 1;
    }
    return out;
  }
  /** Can a walker go straight from (x0,y0) to (x1,y1)? r must cover the mover's collision box (move() uses r * 0.8 = 0.24). */
  losWide(x0, y0, x1, y1, r = 0.28) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    const steps = Math.ceil(d * 4);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.circleFree(x0 + dx * t, y0 + dy * t, r)) return false;
    }
    return true;
  }

  /** Random walkable tile centre near (x,y) within r. */
  randomNear(x, y, r, rng = Math.random) {
    for (let i = 0; i < 40; i++) {
      const nx = x + (rng() * 2 - 1) * r, ny = y + (rng() * 2 - 1) * r;
      if (this.walkable(nx, ny) && this.circleFree(nx, ny, 0.3)) return [nx, ny];
    }
    return [x, y];
  }

  reveal(x, y, r) {
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(this.w - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(this.h - 1, Math.ceil(y + r));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if ((tx - x) ** 2 + (ty - y) ** 2 <= r2) this.seen[ty * this.w + tx] = 1;
      }
    }
  }

  /**
   * Walls from the biome pack (Diablo II style thin walls on every floor/void edge). Each tile vertex on a wall gets
   * the node piece for its connections (NE=1 -y, SE=2 +x, SW=4 +y, NW=8 -x), drawn as separate half-tile arms so
   * each sorts on its own: arms facing the floor ("back" walls) sort just behind the creatures beside them, arms
   * with the floor behind them ("front" walls) just in front. Every straight run of edges gets one wall family and
   * texture variant (`families`: [[name, weight], ...]).
   * `openings` (dungeon.js findOpenings) put an arch or a pair of doors across a gap in a room's wall:
   * {axis: 'x'|'y', line, a0, a1 (vertex range along the line), kind: 'arch'|'door', design, flip}.
   * Fills this.segments (edges, for torches), this.walls (draw items) and this.doors.
   */
  buildWalls(tileset, rng = Math.random, openings = [], families = null) {
    const segs = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.t[y * this.w + x] !== 1) continue;
        // west edge (x) and east edge (x+1): "/" edges; north edge (y) and south edge (y+1): "\" edges
        if (!this.tile(x - 1, y)) segs.push({ dir: 'f', ex: x, ey0: y, ey1: y + 1, front: false });
        if (!this.tile(x + 1, y)) segs.push({ dir: 'f', ex: x + 1, ey0: y, ey1: y + 1, front: true });
        if (!this.tile(x, y - 1)) segs.push({ dir: 'b', ey: y, ex0: x, ex1: x + 1, front: false });
        if (!this.tile(x, y + 1)) segs.push({ dir: 'b', ey: y + 1, ex0: x, ex1: x + 1, front: true });
      }
    }
    for (const s of segs) {
      if (s.dir === 'f') { s.mx = s.ex; s.my = (s.ey0 + s.ey1) / 2; } else { s.mx = (s.ex0 + s.ex1) / 2; s.my = s.ey; }
      s.depth = s.mx + s.my;
    }
    this.segments = segs;
    this.walls = [];
    this.doors = [];
    if (!tileset.walls) return this.indexWalls();
    // vertex -> arms: dir -> { front, run }
    const W1 = this.w + 1, verts = new Map();
    const arm = (x, y, d, front) => {
      const k = y * W1 + x;
      let v = verts.get(k);
      if (!v) verts.set(k, (v = { x, y, arms: {} }));
      v.arms[d] = { front };
    };
    for (const s of segs) {
      if (s.dir === 'b') { arm(s.ex0, s.ey, 'SE', s.front); arm(s.ex1, s.ey, 'NW', s.front); }
      else { arm(s.ex, s.ey0, 'SW', s.front); arm(s.ex, s.ey1, 'NE', s.front); }
    }
    // a 2-wide gap's arch reaches half a tile over the wall on each side: those arms give way to it
    for (const o of openings) {
      if (o.kind !== 'arch' || o.a1 - o.a0 !== 2) continue;
      const at = (a) => verts.get((o.axis === 'x' ? o.line : a) * W1 + (o.axis === 'x' ? a : o.line));
      const v0 = at(o.a0), v1 = at(o.a1);
      if (v0) delete v0.arms[o.axis === 'x' ? 'NW' : 'NE'];
      if (v1) delete v1.arms[o.axis === 'x' ? 'SE' : 'SW'];
    }
    // runs: straight chains of edges along one line share a family and a texture variant
    const fams = families || tileset.families.map((f) => [f, 1]);
    const total = fams.reduce((t, f) => t + f[1], 0);
    const pickFam = () => { let r = rng() * total; for (const [f, w] of fams) if ((r -= w) < 0) return f; return fams[0][0]; };
    const STEP = { SE: [1, 0, 'NW'], SW: [0, 1, 'NE'] };
    for (const v of verts.values()) {
      for (const d of ['SE', 'SW']) {
        if (!v.arms[d] || v.arms[d].run) continue;
        const back = d === 'SE' ? 'NW' : 'NE';
        if (v.arms[back] && !v.arms[back].run) continue; // start runs at their first vertex
        const run = { fam: pickFam(), vari: Math.floor(rng() * 3) };
        let c = v;
        while (c && c.arms[d]) {
          c.arms[d].run = run;
          const [dx, dy, opp] = STEP[d];
          c = verts.get((c.y + dy) * W1 + c.x + dx);
          if (c && c.arms[opp]) c.arms[opp].run = run;
        }
      }
    }
    const OFF = { NE: [0, -0.25], SE: [0.25, 0], SW: [0, 0.25], NW: [-0.25, 0] };
    for (const v of verts.values()) {
      let mask = 0;
      for (const d in v.arms) mask |= { NE: 1, SE: 2, SW: 4, NW: 8 }[d];
      if (!mask) continue;
      for (const d in v.arms) {
        const a = v.arms[d], run = a.run || { fam: fams[0][0], vari: 0 };
        const vars = (tileset.walls[run.fam] || tileset.walls[tileset.families[0]])[mask];
        const piece = vars[run.vari % vars.length];
        const sl = piece.find((p) => p.arm === d);
        if (!sl) continue;
        const [ox, oy] = OFF[d];
        // centre of the arm, plus a bias toward the side the floor is on (see above)
        this.walls.push({ kind: 'wall', x: v.x, y: v.y, r: sl, front: a.front, depth: v.x + v.y + ox + oy + (a.front ? 0.45 : -0.45) });
      }
    }
    for (const o of openings) {
      const ax = o.axis === 'x' ? [1, 0] : [0, 1];
      const pos = (a) => (o.axis === 'x' ? [a, o.line] : [o.line, a]);
      if (o.kind === 'arch') {
        const dir = o.axis === 'x' ? (o.flip ? 'NW' : 'SE') : (o.flip ? 'NE' : 'SW');
        const [cx, cy] = pos((o.a0 + o.a1) / 2);
        for (const sl of tileset.arches[o.design][dir]) {
          // slice offsets are along the piece's own direction; NW/NE run the other way
          const a = dir === 'NW' || dir === 'NE' ? -sl.a : sl.a;
          this.walls.push({ kind: 'arch', x: cx, y: cy, axis: o.axis, r: sl, depth: cx + cy + a * (ax[0] + ax[1]) });
        }
      } else {
        // a pair of doors, hinged at the outer jambs
        for (let a = o.a0; a < o.a1; a++) {
          const first = a === o.a0;
          const dir = o.axis === 'x' ? (first ? 'SE' : 'NW') : (first ? 'SW' : 'NE');
          const [cx, cy] = pos(a + 0.5);
          const door = { kind: 'door', x: cx, y: cy, axis: o.axis, open: false, art: tileset.doors[o.design][dir] };
          this.doors.push(door);
          for (const part of ['L', 'R', 'leaf']) {
            const sl = door.art[part === 'leaf' ? 'open' : 'closed'].find((p) => p.part === part);
            if (sl) this.walls.push({ kind: 'door', door, part, x: cx, y: cy, depth: cx + cy + sl.du + sl.dv });
          }
        }
      }
    }
    this.indexWalls();
  }

  indexWalls() {
    // spatial buckets (by 8x8 tile cells) for fast culling
    const B = 8, bw = Math.ceil((this.w + 1) / B), bh = Math.ceil((this.h + 1) / B);
    this.segGrid = { B, bw, bh, cells: Array.from({ length: bw * bh }, () => []) };
    for (const o of this.walls) {
      const cx = Math.min(bw - 1, Math.max(0, Math.floor(o.x / B))), cy = Math.min(bh - 1, Math.max(0, Math.floor(o.y / B)));
      this.segGrid.cells[cy * bw + cx].push(o);
    }
  }

  /** Wall draw items (arms, arch slices, door parts) anchored in the tile rect. */
  wallsIn(x0, y0, x1, y1, out) {
    const g = this.segGrid;
    if (!g) return out;
    const cx0 = Math.max(0, Math.floor(x0 / g.B)), cx1 = Math.min(g.bw - 1, Math.floor(x1 / g.B));
    const cy0 = Math.max(0, Math.floor(y0 / g.B)), cy1 = Math.min(g.bh - 1, Math.floor(y1 / g.B));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) for (const o of g.cells[cy * g.bw + cx]) out.push(o);
    return out;
  }
}
