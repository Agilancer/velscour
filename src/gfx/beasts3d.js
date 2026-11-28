// Live 3D creatures: skinned, animated GLB models made in Blender (tools/blender/, assets/models/beasts/<id>.glb),
// drawn into the 2D frame in the game's iso camera. One three.js renderer on one hidden canvas serves them all: every
// drawBeast asks for a cell (model, clip, time, facing, skin...), flushBeasts poses and renders all the asked cells in
// one pass (render.js calls it at the start of a frame), and the next drawBeast with the same key copies its cell
// into the frame. So a pose is one frame old, its place on the screen is not. The cells are handed to the 2D frame as one
// ImageBitmap a flush (an OffscreenCanvas's transferToImageBitmap: no read-back of the GPU canvas, however many beasts). A model is one instance, re-posed per cell (no clones): tint, skin texture, glow
// and bone tweaks are set per cell and reset after.
// Model space (glTF): y up, the creature faces +z, its feet (or its hover point) at the origin.
// drawBeast returns false until three.js, the model and the cell are ready: the caller draws its old art meanwhile.
import { HW } from '../core/view.js';

const BASE = new URL('../../assets/models/beasts/', import.meta.url).href;
const ATLAS = 2048, MAXCELL = 640, PAD = 2, HALF_RATE = 6;
/** World px along a tile edge on the ground (the 2:1 iso camera). */
export const BEAST_TILE = HW * Math.SQRT2;
let T = null, GL = null, boot = null, dead = false, frame = 0;
const models = new Map(), cells = new Map(), skins = new Map();

/** True when WebGL is drawn on the CPU (SwiftShader, llvmpipe: headless tests, a blocked GPU): multisampling there costs most of a frame. */
function softwareGL() {
  try {
    const g = document.createElement('canvas').getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info');
    const r = g ? String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : '';
    g && g.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(r);
  } catch { return false; }
}
function start() {
  return (boot ||= Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]).then(([t, g]) => {
    T = t;
    const off = typeof OffscreenCanvas !== 'undefined' && !!OffscreenCanvas.prototype.transferToImageBitmap;
    const canvas = off ? new OffscreenCanvas(ATLAS, ATLAS) : document.createElement('canvas'); canvas.width = canvas.height = ATLAS;
    const gl = new T.WebGLRenderer({ canvas, antialias: !softwareGL(), alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: !off, powerPreference: 'low-power' });
    gl.setPixelRatio(1); gl.outputColorSpace = T.SRGBColorSpace; gl.setClearColor(0, 0); gl.autoClear = false; gl.setScissorTest(true);
    const scene = new T.Scene();
    // lit like the game's painted art: a warm key from the upper left front, a cool fill from the right, sky/ground bounce
    const key = new T.DirectionalLight(0xfff2dc, 3.4), fill = new T.DirectionalLight(0x9db4ff, 1.3), rim = new T.DirectionalLight(0xffd0a0, 1.8);
    const hemi = new T.HemisphereLight(0xe6eaff, 0x54423a, 1.9);
    scene.add(key, fill, rim, hemi);
    // the iso camera: 30 degrees above the ground, looking down the tile diagonal (tile x -> right-down, tile y -> left-down)
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, -6000, 6000);
    const d = 1000, e = Math.PI / 6;
    cam.position.set(d * Math.cos(e) * Math.SQRT1_2, d * Math.sin(e), d * Math.cos(e) * Math.SQRT1_2); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    // lights fixed to the screen, not the world: the key from the upper left toward the viewer
    const place = (l, x, y, z) => { l.position.set(x, y, z).applyQuaternion(cam.quaternion); };
    place(key, -0.75, 0.9, 0.7); place(fill, 0.9, 0.15, 0.5); place(rim, 0.5, 0.7, -0.9);
    GL = { gl, canvas, off, img: off ? null : canvas, side: ATLAS, scene, cam, loader: new g.GLTFLoader(), tex: new T.TextureLoader(), key, fill, rim, hemi };
  }).catch((e) => { dead = true; console.warn('3D beasts unavailable:', e); }));
}

/** The model record for id (starts its load): { ready, clips: { name: seconds }, rad (model units), ... }. */
export function beast(id) {
  let m = models.get(id);
  if (m) return m;
  models.set(id, (m = { id, ready: false, failed: false, clips: {}, rad: 1 }));
  start().then(() => {
    if (dead) { m.failed = true; return; }
    GL.loader.load(BASE + id + '.glb', (g) => {
      const root = g.scene;
      m.root = root; m.mixer = new T.AnimationMixer(root); m.actions = {};
      for (const c of g.animations) { m.clips[c.name] = c.duration; const a = m.mixer.clipAction(c); a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; m.actions[c.name] = a; }
      m.mats = []; m.meshes = {}; m.nodes = {}; m.rest = [];
      root.traverse((o) => {
        m.nodes[o.name] = o;
        m.rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
        if (o.isMesh) {
          o.frustumCulled = false; m.meshes[o.name] = o;
          for (const mt of [].concat(o.material)) if (!m.mats.includes(mt)) { m.mats.push(mt); if (mt.metalness > 0.15 && !mt.userData.metal) mt.metalness = 0.15; // no room to reflect: scanned hides read as black metal
             mt.userData.base = { color: mt.color.clone(), emissive: mt.emissive ? mt.emissive.clone() : null, ei: mt.emissiveIntensity, map: mt.map, emap: mt.emissiveMap, opacity: mt.opacity }; }
        }
      });
      // a dark outline like the painted sprites': every solid mesh again, back faces only, pushed out along its normals
      m.lines = [];
      for (const n in m.meshes) {
        const o = m.meshes[n], mt = o.material;
        if (Array.isArray(mt) || mt.transparent || mt.alphaTest > 0 || mt.userData.noOutline || o.userData.noOutline || !o.geometry.attributes.normal) continue;
        const l = o.clone(); l.name = n + '~line'; l.material = outlineMat(); l.frustumCulled = false; o.parent.add(l); m.lines.push([l, o]);
        if (o.isSkinnedMesh) l.bind(o.skeleton, o.bindMatrix);
      }
      const box = new T.Box3().setFromObject(root), far = new T.Vector3(Math.max(-box.min.x, box.max.x), Math.max(-box.min.y, box.max.y), Math.max(-box.min.z, box.max.z));
      m.rad = (root.userData.rad || far.length()) * 1.02; m.box = box; m.info = root.userData || {};
      m.ready = true;
    }, undefined, (e) => { m.failed = true; console.warn('beast model unavailable:', id, e?.message || e); });
  });
  return m;
}
export const beastReady = (id) => beast(id).ready;
/** Start loading models (and skins: 'id:skin') ahead of their first draw. */
export function preloadBeasts(...ids) { for (const s of ids) { const [id, skin] = s.split(':'); beast(id); if (skin) start().then(() => !dead && skinTex(id, skin)); } }

function skinTex(id, skin) {
  const k = id + ':' + skin;
  let s = skins.get(k);
  if (!s) {
    skins.set(k, (s = { tex: null }));
    GL.tex.load(BASE + id + '_' + skin + '.webp', (t) => { t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; s.tex = t; }, undefined, () => { s.failed = true; });
  }
  return s.tex;
}

const want = [];
/**
 * Draw model id with its origin at (x, y) in ctx's space. o: {
 *   key: a stable name for this instance (required when several of one model are drawn),
 *   k: px per model unit, yaw: the way it faces, an angle in tile space (atan2(dy, dx)), pitch (+: nose up), roll,
 *   clip, t (seconds into it; loop: wraps), clip2 + mix (0..1) to blend toward a second clip at t2,
 *   skin: name of a texture assets/models/beasts/<id>_<skin>.webp replacing every base colour map,
 *   tint: [r, g, b] multiplied in, glow: [r, g, b] added as light from within, flash: 0..1 white,
 *   alpha, add: true draws it as light (additive), bones: { name: { rx, ry, rz, s, sx, sy, sz } } turned/scaled after the clip,
 *   hide: [mesh names], show: [mesh names] (only those), points: [node names] -> beastPoint(), rad: model units the cell covers,
 *   outline: px of dark outline round the solid meshes (default none; never when add; suits smooth models),
 *   flat: 0..1 squash of model height (the game draws height unforeshortened: 0), light: 0..n brightness }
 */
export function drawBeast(ctx, id, x, y, o = {}) {
  const m = beast(id);
  if (!m.ready) return false;
  const key = o.key || id, k = o.k || 1, R = (o.rad || m.rad) * k;
  const tf = ctx.getTransform(), res = Math.min(Math.max(0.25, Math.hypot(tf.a, tf.b)), MAXCELL / (2 * R));
  let c = cells.get(key);
  if (!c) cells.set(key, (c = { drawn: false, pts: {} }));
  c.m = m; c.o = o; c.R = R; c.res = res; c.asked = frame;
  if (!c.queued) { c.queued = true; want.push(c); }
  if (!c.drawn || c.id !== id || !GL.img) return false;
  const a = o.alpha ?? 1;
  if (a <= 0) return true;
  const ga = ctx.globalAlpha, gc = ctx.globalCompositeOperation;
  ctx.globalAlpha = ga * a; if (o.add) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(GL.img, c.x, c.y, c.s, c.s, x - c.dR, y - c.dR, c.dR * 2, c.dR * 2);
  ctx.globalAlpha = ga; ctx.globalCompositeOperation = gc;
  return true;
}
/** Where a node asked for with o.points was in the cell's last render: [dx, dy] px from the origin drawBeast was given, or null. */
export function beastPoint(key, name) { const c = cells.get(key); return (c && c.drawn && c.pts[name]) || null; }
/** The same node in the cell's 3D space: [along tile x, up, along tile y] in px (a tile edge is BEAST_TILE; height shows as up * cos 30), or null. */
export function beastPoint3(key, name) { const c = cells.get(key); return (c && c.drawn && c.p3 && c.p3[name]) || null; }

let lineMat = null;
const lineW = { value: 0 };
function outlineMat() {
  if (lineMat) return lineMat;
  lineMat = new T.MeshBasicMaterial({ color: 0x0d0a0e, side: T.BackSide });
  lineMat.onBeforeCompile = (sh) => { sh.uniforms.uLine = lineW; sh.vertexShader = 'uniform float uLine;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * uLine;'); };
  return lineMat;
}
const tmp = { v: null, q: null, e: null };
function pose(m, o) {
  for (const [n, p, q, s] of m.rest) { n.position.copy(p); n.quaternion.copy(q); n.scale.copy(s); }
  m.mixer.stopAllAction();
  const play = (name, t, w) => {
    const a = m.actions[name];
    if (!a) return;
    const d = m.clips[name] || 1;
    a.reset(); a.setEffectiveWeight(w); a.play(); a.time = o.loop === false ? Math.min(Math.max(0, t), d - 1e-4) : ((t % d) + d) % d;
  };
  const mix = o.clip2 ? Math.max(0, Math.min(1, o.mix || 0)) : 0;
  if (o.clip) play(o.clip, o.t || 0, 1 - mix);
  if (mix > 0) play(o.clip2, o.t2 ?? o.t ?? 0, mix);
  m.mixer.update(0);
  if (o.bones) for (const n in o.bones) {
    const b = m.nodes[n], w = o.bones[n];
    if (!b) continue;
    if (w.rx || w.ry || w.rz) { tmp.e.set(w.rx || 0, w.ry || 0, w.rz || 0); b.quaternion.multiply(tmp.q.setFromEuler(tmp.e)); }
    if (w.s != null || w.sx != null || w.sy != null || w.sz != null) b.scale.multiply(tmp.v.set(w.sx ?? w.s ?? 1, w.sy ?? w.s ?? 1, w.sz ?? w.s ?? 1));
  }
  const skin = o.skin ? skinTex(m.id, o.skin) : null, eskin = o.eskin ? skinTex(m.id, o.eskin) : null;
  for (const mt of m.mats) {
    const b = mt.userData.base;
    mt.color.copy(b.color); if (o.tint) mt.color.multiply(tmp.c.setRGB(o.tint[0], o.tint[1], o.tint[2]));
    if (mt.map !== (skin && b.map ? skin : b.map)) { mt.map = skin && b.map ? skin : b.map; }
    if (b.emissive) {
      if (b.emap && mt.emissiveMap !== (eskin || b.emap)) mt.emissiveMap = eskin || b.emap;
      mt.emissive.copy(b.emissive); mt.emissiveIntensity = b.ei * (o.ember ?? 1);
      if ((o.glow || o.flash) && !b.emap) { // light from within (a material with a glow map keeps to its map)
        const f = o.flash || 0, g = o.glow || [0, 0, 0];
        mt.emissive.setRGB(b.emissive.r * b.ei + g[0] + f, b.emissive.g * b.ei + g[1] + f, b.emissive.b * b.ei + g[2] + f); mt.emissiveIntensity = 1;
      }
    }
  }
  for (const n in m.meshes) m.meshes[n].visible = o.show ? o.show.includes(n) : !(o.hide && o.hide.includes(n));
  const line = o.add ? 0 : o.outline || 0;
  for (const [l, src] of m.lines) l.visible = line > 0 && src.visible;
  lineW.value = line / (o.k || 1);
}

/** Render every cell asked for since the last flush. Call once a frame, before the frame's drawBeast calls. */
export function flushBeasts() {
  frame++;
  if (!GL || !want.length) { sweep(); return; }
  // a crowd is re-posed every other frame (their places on screen still follow every frame)
  if (GL.img && want.length >= HALF_RATE && (frame & 1) && want.every((c) => c.drawn)) { for (const c of want) c.queued = false; want.length = 0; return; }
  if (!tmp.v) { tmp.v = new T.Vector3(); tmp.q = new T.Quaternion(); tmp.e = new T.Euler(0, 0, 0, 'YXZ'); tmp.c = new T.Color(); }
  const { gl, scene, cam, canvas } = GL;
  // shelf-pack the cells, biggest first
  for (const c of want) c.s = Math.max(8, Math.ceil(2 * c.R * c.res));
  want.sort((a, b) => b.s - a.s);
  let px = 0, py = 0, row = 0, shrink = 1;
  const area = want.reduce((s, c) => s + (c.s + PAD) * (c.s + PAD), 0);
  // the atlas is as small as this frame's cells allow (512, 1024 or 2048 a side): less to hand over
  let side = 512; while (side < ATLAS && (area > side * side * 0.62 || want[0].s > side)) side *= 2;
  if (side !== GL.side) { GL.side = side; gl.setSize(side, side, false); for (const c of cells.values()) c.drawn = false; }
  const A = side;
  if (area > A * A * 0.8) shrink = Math.sqrt(A * A * 0.8 / area);
  gl.setScissor(0, 0, A, A); gl.clear(true, true, false);
  for (const c of want) {
    c.queued = false;
    const s = Math.max(8, Math.floor(c.s * shrink));
    if (px + s > A) { px = 0; py += row + PAD; row = 0; }
    if (py + s > A) { c.drawn = false; continue; }
    const m = c.m, o = c.o, R = c.R;
    pose(m, o);
    const root = m.root, k = o.k || 1;
    root.rotation.set(0, 0, 0); root.scale.set(k, k * (1 - (o.flat || 0)), k); root.position.set(0, 0, 0);
    // facing: tile angle a -> the model's +z turned to (cos a, sin a) in (x, z); pitch about its own side axis, roll about its length
    tmp.e.set(-(o.pitch || 0), Math.PI / 2 - (o.yaw || 0), o.roll || 0, 'YXZ'); root.quaternion.setFromEuler(tmp.e);
    scene.add(root);
    const L = o.light ?? 1; GL.key.intensity = 3.4 * L; GL.fill.intensity = 1.3 * L; GL.rim.intensity = 1.8 * L; GL.hemi.intensity = 1.9 * L;
    cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.updateProjectionMatrix();
    gl.setViewport(px, A - py - s, s, s); gl.setScissor(px, A - py - s, s, s);
    gl.render(scene, cam);
    if (o.points) {
      root.updateMatrixWorld(true);
      for (const n of o.points) { const b = m.nodes[n]; if (b) { tmp.v.setFromMatrixPosition(b.matrixWorld); (c.p3 ||= {})[n] = [tmp.v.x, tmp.v.y, tmp.v.z]; tmp.v.project(cam); c.pts[n] = [tmp.v.x * R, -tmp.v.y * R]; } }
    }
    scene.remove(root);
    c.x = px; c.y = py; c.s = s; c.dR = R; c.drawn = true; c.id = m.id;
    px += s + PAD; row = Math.max(row, s);
  }
  want.length = 0;
  if (GL.off) { if (GL.img) GL.img.close(); GL.img = canvas.transferToImageBitmap(); }
  sweep();
}
function sweep() { if (frame % 120 === 0) for (const [k, c] of cells) if (frame - c.asked > 240) cells.delete(k); }
export const beastCanvas = () => GL && GL.img;
