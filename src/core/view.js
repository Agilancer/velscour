// Isometric projection + camera.
import { G } from '../state.js';
import { clamp, rand } from './util.js';

export const TW = 64; // tile width in world px
export const TH = 32; // tile height in world px
export const HW = TW / 2;
export const HH = TH / 2;

// A height-mapped level (world/mountain.js) lifts the ground plane: ELEV(x, y) is the world px the ground stands above
// the flat plane, so everything drawn at a tile position (creatures, spells, lights, labels) stands on the terrain.
// PICK(wx, wy) turns a world px point back into the tile position whose lifted ground shows there.
let ELEV = null, PICK = null;
export function setElevation(elev, pick) { ELEV = elev; PICK = pick; }
export const elevationAt = (x, y) => (ELEV ? ELEV(x, y) : 0);
// A warped level (world/tower.js) lays the tile grid onto a 3D surface: WARP(x, y, out) writes the world px of tile
// position (x, y) into out, WPICK(wx, wy) turns world px back into a tile position. isoX and isoY ask for the same
// point back to back, so the last answer is kept until warpMoved() (the warp turns with the camera every frame).
let WARP = null, WPICK = null, wkx = NaN, wky = NaN;
const wout = [0, 0];
export function setWarp(warp, pick) { WARP = warp; WPICK = pick; wkx = NaN; }
export function warpMoved() { wkx = NaN; }
export const currentWarp = () => WARP;
const warped = (x, y) => { if (x !== wkx || y !== wky) { wkx = x; wky = y; WARP(x, y, wout); } return wout; };
export const isoX = (x, y) => (WARP ? warped(x, y)[0] : (x - y) * HW);
export const isoY = (x, y) => (WARP ? warped(x, y)[1] : (x + y) * HH - (ELEV ? ELEV(x, y) : 0));

/** Convert a screen-space direction (world px) into a tile-space direction. */
export function screenDirToTile(dx, dy) {
  const tx = (dx / HW + dy / HH) / 2;
  const ty = (dy / HH - dx / HW) / 2;
  return [tx, ty];
}

export const camera = {
  x: 0, // world px (iso space) at screen centre
  y: 0,
  zoom: 1.5,
  shakeAmt: 0,
  shakeX: 0,
  shakeY: 0,
  leadX: 0, // world px the view is held off the hero (the tower frames the stair ahead)
  leadY: 0,
  zoomK: 1, // a level's own zoom factor (the tower's roof pulls back to show the airships)
  follow(tx, ty, dt, snap = false) {
    if (this.fixed) return; // first person (gfx/firstperson.js) holds the camera still: its warp does the placing
    const wx = isoX(tx, ty) + this.leadX, wy = isoY(tx, ty) - 24 + this.leadY;
    if (snap) { this.x = wx; this.y = wy; return; }
    const k = 1 - Math.pow(0.0005, dt);
    this.x += (wx - this.x) * k;
    this.y += (wy - this.y) * k;
  },
  shake(a) { if (G.settings.shake) this.shakeAmt = Math.min(18, Math.max(this.shakeAmt, a)); },
  update(dt) {
    if (this.shakeAmt > 0.05) {
      this.shakeX = rand(-1, 1) * this.shakeAmt;
      this.shakeY = rand(-1, 1) * this.shakeAmt;
      this.shakeAmt *= Math.pow(0.002, dt);
    } else { this.shakeX = this.shakeY = 0; this.shakeAmt = 0; }
  },
  computeZoom() {
    const base = Math.max(G.H / 700, G.W / 1400);
    const min = G.touch ? 0.95 : 0.9;
    this.zoom = clamp(base, min, 3) * (G.settings.zoom || 1) * this.zoomK;
  },
  /** Apply camera transform to ctx (world px -> device px). */
  apply(ctx) {
    const z = this.zoom * G.dpr;
    ctx.setTransform(z, 0, 0, z,
      Math.round(G.W * G.dpr / 2 - (this.x + this.shakeX) * z),
      Math.round(G.H * G.dpr / 2 - (this.y + this.shakeY) * z));
  },
  // world px -> css px
  toScreen(wx, wy) {
    return [(wx - this.x - this.shakeX) * this.zoom + G.W / 2, (wy - this.y - this.shakeY) * this.zoom + G.H / 2];
  },
  tileToScreen(tx, ty, z = 0) {
    return this.toScreen(isoX(tx, ty), isoY(tx, ty) - z);
  },
  // css px -> tile coords (on ground plane)
  screenToTile(sx, sy) {
    const wx = (sx - G.W / 2) / this.zoom + this.x;
    const wy = (sy - G.H / 2) / this.zoom + this.y;
    if (WPICK) return WPICK(wx, wy);
    if (PICK) return PICK(wx, wy);
    return [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2];
  },
  // visible world-px rect
  viewRect(margin = 0) {
    const hw = G.W / 2 / this.zoom + margin, hh = G.H / 2 / this.zoom + margin;
    return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
  },
};
