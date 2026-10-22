// The Castle's baked 3D masonry (docs/CASTLE_3D.md): per-tile pieces cut from tools/castle3d.html's render, drawn as
// the terrain columns of the Castle's height map (gfx/terrain.js), plus each building's roof cut into 32 px columns.
// assets/tiles/castle3d/index.json: S (atlas px per world px), pages, pieces [page, sx, sy, w, h, ox, oy] (ox/oy in
// world px from the tile's ground corner, screen (x - y) * 32, (x + y) * 16), tiles [tile, layer, piece, ...] (layer 0
// the masonry, 1 what stands over a walkway: tunnel vaults, lintels, roofed drums), roofs [{ bld, strips: [[piece, col]] }].
// The Sky Battle's ironclad (docs/SKY_BATTLE.md, assets/tiles/skyship/) is baked the same way and loads through here
// too, with its sprites (the galleon, the boats, the engine props: { S, f: [[page, sx, sy, w, h, ox, oy], ...] }) and
// anchors. One set is loaded at a time.
const DIR = 'assets/tiles/castle3d/';
let state = null, loading = null, loadingDir = null;

/** Load a baked set once (a level loads its set before generating, like its pack). */
export function loadBaked(dir) {
  if (state && state.dir === dir) return Promise.resolve(state);
  if (loading && loadingDir === dir) return loading;
  state = null; loadingDir = dir;
  loading = fetch(dir + 'index.json').then((r) => r.json()).then((idx) => Promise.all(idx.pages.map((p) => new Promise((ok, no) => {
    const img = new Image(); img.onload = () => ok(img); img.onerror = () => no(new Error('baked page ' + dir + p)); img.src = dir + p;
  }))).then((imgs) => {
    const base = new Map(), over = new Map();
    for (let k = 0; k < idx.tiles.length; k += 3) (idx.tiles[k + 1] ? over : base).set(idx.tiles[k], idx.tiles[k + 2]);
    if (loadingDir !== dir) return state;   // another set was asked for meanwhile
    state = { dir, S: idx.S, imgs, pieces: idx.pieces, base, over, roofs: idx.roofs, moving: idx.moving, sprites: idx.sprites, anchors: idx.anchors, idx };
    return state;
  })).catch((e) => { loading = null; throw e; });
  return loading;
}
/** The Castle's masonry. */
export const loadCastle3D = () => loadBaked(DIR);
export const castle3dState = () => state;
/** Release the decoded pages when the level is left. */
export function releaseCastle3D() { state = null; loading = null; loadingDir = null; }

/** Draw piece `id` for tile (tx, ty), whose ground corner is at world (px, py) (no elevation: pieces are absolute). */
export function drawPiece(ctx, id, px, py) {
  const [pg, sx, sy, w, h, ox, oy] = state.pieces[id], k = 1 / state.S;
  ctx.drawImage(state.imgs[pg], sx, sy, w, h, px + ox, py + oy, w * k, h * k);
}
/** A piece's world rect [x, y, w, h] at a tile's ground corner. */
export function pieceRect(id, px, py) {
  const [, , , w, h, ox, oy] = state.pieces[id], k = 1 / state.S;
  return [px + ox, py + oy, w * k, h * k];
}
/** A sprite record for a roof strip, drawn like a scatter prop (k = 1 / S, pivot at the world origin's screen point). */
export function roofStrip(id) {
  const [pg, sx, sy, w, h, ox, oy] = state.pieces[id];
  return { img: state.imgs[pg], sx, sy, w, h, ox: ox * state.S, oy: oy * state.S, roof: true };
}
