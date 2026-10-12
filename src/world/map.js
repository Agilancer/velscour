// Tile map: floor grid, wall segments, collision, line of sight and path finding.
export class TileMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.t = new Uint8Array(w * h); // 0 void, 1 floor
    this.v = new Uint8Array(w * h); // floor visual variant index
    this.block = new Uint8Array(w * h); // static obstacle on floor
    this.seen = new Uint8Array(w * h);
    this.segments = []; // wall segments
    this.segGrid = null;
    this.pillars = [];
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

  /** A* path on tiles (8-dir), returns array of [x,y] tile centres or null. */
  findPath(sx, sy, gx, gy, maxNodes = 3000) {
    const W = this.w;
    const s = Math.floor(sy) * W + Math.floor(sx);
    let gtx = Math.floor(gx), gty = Math.floor(gy);
    if (!this.walkableTile(gtx, gty)) {
      // snap goal to nearest walkable tile
      let found = false;
      for (let r = 1; r < 4 && !found; r++) {
        for (let oy = -r; oy <= r && !found; oy++) {
          for (let ox = -r; ox <= r && !found; ox++) {
            if (this.walkableTile(gtx + ox, gty + oy)) { gtx += ox; gty += oy; found = true; }
          }
        }
      }
      if (!found) return null;
    }
    const g = gty * W + gtx;
    if (s === g) return [[gx, gy]];
    const open = [s];
    const came = new Map();
    const gs = new Map([[s, 0]]);
    const fs = new Map([[s, 0]]);
    const h = (i) => { const x = i % W, y = (i / W) | 0; return Math.hypot(x - gtx, y - gty); };
    let n = 0;
    while (open.length && n++ < maxNodes) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (fs.get(open[i]) < fs.get(open[bi])) bi = i;
      const cur = open[bi];
      open.splice(bi, 1);
      if (cur === g) {
        const path = [];
        let c = cur;
        while (c !== s) { path.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]); c = came.get(c); }
        path.reverse();
        if (path.length) path[path.length - 1] = [gx, gy];
        return this.smooth(sx, sy, path);
      }
      const cx = cur % W, cy = (cur / W) | 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = cx + ox, ny = cy + oy;
          if (!this.walkableTile(nx, ny)) continue;
          if (ox && oy && (!this.walkableTile(cx + ox, cy) || !this.walkableTile(cx, cy + oy))) continue;
          const ni = ny * W + nx;
          const ng = gs.get(cur) + (ox && oy ? 1.414 : 1);
          if (ng < (gs.has(ni) ? gs.get(ni) : Infinity)) {
            came.set(ni, cur); gs.set(ni, ng); fs.set(ni, ng + h(ni));
            if (!open.includes(ni)) open.push(ni);
          }
        }
      }
    }
    return null;
  }
  smooth(sx, sy, path) {
    // drop intermediate nodes with clear line of sight
    const out = [];
    let ax = sx, ay = sy, i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !this.losWide(ax, ay, path[j][0], path[j][1])) j--;
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
   * Place a thin wall segment on every floor/void edge (Diablo II style walls).
   * dir 'f' = "/" edge (between x and x+1), 'b' = "\" edge (between y and y+1).
   */
  buildWalls(tileset, rng = Math.random) {
    const segs = [];
    const vert = new Map(); // vertex key -> {f, b}
    const mark = (vx, vy, d) => {
      const k = vy * (this.w + 1) + vx;
      const v = vert.get(k) || { f: 0, b: 0, x: vx, y: vy };
      v[d]++; vert.set(k, v);
    };
    const pickSeg = (dir) => {
      // seamless wall sections ("/" art, mirrored for "\" edges)
      if (tileset.walls && tileset.walls.length) return { spr: tileset.walls[Math.floor(rng() * tileset.walls.length)], flip: dir === 'b', strip: true };
      // fallback: whole wall pieces; native sprites for this direction are preferred, mirrored ones add variety
      const fwd = tileset.segFwd, back = tileset.segBack;
      if (dir === 'f') {
        if (rng() < 0.8 || !back.length) return { spr: fwd[Math.floor(rng() * fwd.length)], flip: false };
        return { spr: back[Math.floor(rng() * back.length)], flip: true };
      }
      if (rng() < 0.4 && back.length) return { spr: back[Math.floor(rng() * back.length)], flip: false };
      return { spr: fwd[Math.floor(rng() * fwd.length)], flip: true };
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.t[y * this.w + x] !== 1) continue;
        // west edge (x) and east edge (x+1): "/" edges
        if (!this.tile(x - 1, y)) { segs.push({ dir: 'f', ex: x, ey0: y, ey1: y + 1, front: false, ...pickSeg('f') }); mark(x, y, 'f'); mark(x, y + 1, 'f'); }
        if (!this.tile(x + 1, y)) { segs.push({ dir: 'f', ex: x + 1, ey0: y, ey1: y + 1, front: true, ...pickSeg('f') }); mark(x + 1, y, 'f'); mark(x + 1, y + 1, 'f'); }
        // north edge (y) and south edge (y+1): "\" edges
        if (!this.tile(x, y - 1)) { segs.push({ dir: 'b', ey: y, ex0: x, ex1: x + 1, front: false, ...pickSeg('b') }); mark(x, y, 'b'); mark(x + 1, y, 'b'); }
        if (!this.tile(x, y + 1)) { segs.push({ dir: 'b', ey: y + 1, ex0: x, ex1: x + 1, front: true, ...pickSeg('b') }); mark(x, y + 1, 'b'); mark(x + 1, y + 1, 'b'); }
      }
    }
    for (const s of segs) {
      if (s.dir === 'f') { s.mx = s.ex; s.my = (s.ey0 + s.ey1) / 2; s.lx = s.ex; s.ly = s.ey1; }
      else { s.mx = (s.ex0 + s.ex1) / 2; s.my = s.ey; s.lx = s.ex0; s.ly = s.ey; }
      s.depth = s.mx + s.my;
    }
    this.segments = segs;
    // pillars at corners where both orientations meet
    this.pillars = [];
    if (tileset.pillars.length) {
      for (const v of vert.values()) {
        if (v.f && v.b) this.pillars.push({ x: v.x, y: v.y, spr: tileset.pillars[0], depth: v.x + v.y + 0.02, strip: tileset.walls && tileset.walls.length ? tileset.walls[0].w : 0 });
      }
    }
    // spatial buckets (by 8x8 tile cells) for fast culling
    const B = 8, bw = Math.ceil((this.w + 1) / B), bh = Math.ceil((this.h + 1) / B);
    this.segGrid = { B, bw, bh, cells: Array.from({ length: bw * bh }, () => []) };
    const add = (o, x, y) => {
      const cx = Math.min(bw - 1, Math.floor(x / B)), cy = Math.min(bh - 1, Math.floor(y / B));
      this.segGrid.cells[cy * bw + cx].push(o);
    };
    for (const s of segs) add(s, s.mx, s.my);
    for (const p of this.pillars) add(p, p.x, p.y);
  }

  /** Wall pieces (segments + pillars) whose midpoint lies in the tile rect. */
  wallsIn(x0, y0, x1, y1, out) {
    const g = this.segGrid;
    if (!g) return out;
    const cx0 = Math.max(0, Math.floor(x0 / g.B)), cx1 = Math.min(g.bw - 1, Math.floor(x1 / g.B));
    const cy0 = Math.max(0, Math.floor(y0 / g.B)), cy1 = Math.min(g.bh - 1, Math.floor(y1 / g.B));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) for (const o of g.cells[cy * g.bw + cx]) out.push(o);
    return out;
  }
}
