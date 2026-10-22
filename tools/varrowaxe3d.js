// Varrow's prison: the great axe on the rack beside Homunculus the Proud's forge (src/game/homunculus.js), built in
// three.js. tools/varrowaxe3d.html shows it and bakes it (tools/varrowaxe3d_bake.js) into the sprite sheet the game
// draws (src/gfx/varrowaxe.js); the game never runs three.js.
//
// World units are screen px at 1x (as in tools/castle3d.html): y is up, the ground is y = 0, the axe's turning axis is
// the y axis. The axe hangs by a chain from the rack's crossbar; its head is double-bitted (two crescent blades with
// honed edges and a beard), a death's-head boss on each face, a top spike, iron langets and bronze collars on an ebony
// haft wrapped in leather, broken chains dangling. The runes carved in both blades are their own meshes (`axe.runes`):
// dark grooves in the lit bake, white in the rune pass that the game tints by story chapter.
// Skin: chunks cut from the Death Knight Runeblade's painted skins (assets/fx/runeblade/, docs/RUNEBLADE_3D.md) and
// pasted on: Verdigris Weeper's blade (fuller to icy edge) across each crescent, Funeral Sash's wrapped grip round the
// haft, Reliquary Sliver's hilt on the socket. `axeSkin()` cuts them; without it the axe is flat-coloured.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const AXE = { head: 72, butt: 6, crossbar: 102, posts: 27 };
const COL = { steel: 0x24282b, edge: 0xb9c6cc, wood: 0x2b1d15, leather: [0x4a2a1a, 0x351d12], bronze: 0x8a6a32, iron: 0x3a3f42, bone: 0xd6ccb4, socket: 0x0c0d0e, rune: 0x15191b, rack: 0x4a2e18, rackDark: 0x3a2312 };

// [skin, x, y, w, h] in the skin PNG's pixels (front view; see the skin's .json for its columns and rows)
const CHUNKS = { blade: ['verdigris_weeper', 57, 175, 22, 40], grip: ['funeral_sash', 48, 50, 18, 50], socket: ['reliquary_sliver', 46, 100, 16, 37] };
/** Cut the axe's skin from the Runeblade skins: {blade, grip, socket} pixel-art textures. */
export async function axeSkin(base = '../assets/fx/runeblade/runeblade3d_') {
  const imgs = {};
  for (const [skin] of Object.values(CHUNKS)) if (!imgs[skin]) imgs[skin] = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = base + skin + '.png'; });
  const out = {};
  for (const [k, [skin, x, y, w, h]] of Object.entries(CHUNKS)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(imgs[skin], x, y, w, h, 0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = false;
    out[k] = t;
  }
  // the blade chunk spans the crescent: x 2.6..23.5 (fuller at the socket, the icy edge outward), y -17.5..16
  out.blade.repeat.set(1 / 20.9, 1 / 33.5); out.blade.offset.set(-2.6 / 20.9, 17.5 / 33.5);
  out.grip.repeat.set(2, 1);
  return out;
}

const phong = (color, o = {}) => new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 30, specular: 0x222222, ...o });

/** One crescent blade, edge out along +x from the socket: [geometry with vertex colours (edge bright, body dark)]. */
function bladeGeometry(skinned) {
  const C = 5, R = 18, a1 = 1.05, a0 = -1.25, s = new THREE.Shape();
  s.moveTo(2.6, 6.2);
  s.quadraticCurveTo(9, 7.5, C + R * Math.cos(a1), R * Math.sin(a1));
  for (let i = 1; i <= 24; i++) { const a = a1 + (a0 - a1) * (i / 24); s.lineTo(C + R * Math.cos(a), R * Math.sin(a)); }
  s.quadraticCurveTo(8, -8.5, 2.6, -6.2);
  s.lineTo(2.6, 6.2);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.9, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, -0.5);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const body = new THREE.Color(skinned ? 0x86938f : COL.steel), edge = new THREE.Color(skinned ? 0xffffff : COL.edge);
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i) - C, p.getY(i));
    c.copy(body).lerp(edge, THREE.MathUtils.smoothstep(r, R - 3.2, R - 1.2));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// rune glyphs: strokes in a 2 x 4 cell, [x0, y0, x1, y1]
const GLYPHS = [
  [[0, 0, 0, 4], [0, 4, 2, 2.6], [0, 2.6, 2, 1.2]],
  [[1, 0, 1, 4], [0, 3, 2, 1]],
  [[0, 0, 0, 4], [2, 0, 2, 4], [0, 4, 2, 0]],
  [[1, 0, 1, 4], [1, 3, 0, 4], [1, 3, 2, 4], [1, 1, 2, 0]],
  [[0, 4, 2, 0], [0, 0, 2, 4], [0, 2, 2, 2]],
  [[0, 0, 0, 4], [0, 4, 2, 3], [2, 3, 0, 2], [0, 2, 2, 0]],
];
function runeGeometry(k, x, y, z, rot) {
  const parts = [];
  for (const [x0, y0, x1, y1] of GLYPHS[k % GLYPHS.length]) {
    const len = Math.hypot(x1 - x0, y1 - y0) * 0.95, g = new THREE.BoxGeometry(len + 0.5, 0.55, 0.36);
    g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    g.translate(((x0 + x1) / 2 - 1) * 0.95, ((y0 + y1) / 2 - 2) * 0.95, 0);
    parts.push(g);
  }
  const g = mergeGeometries(parts);
  g.rotateZ(rot); g.translate(x, y, z);
  return g;
}

function chain(n, x, y, z, step = 1.55, r = 0.95) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(r, 0.3, 4, 8);
    g.rotateX(Math.PI / 2); if (i % 2) g.rotateY(Math.PI / 2);
    g.rotateZ(Math.PI / 2);
    g.translate(x, y + i * step, z);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

/** The axe: a Group turning about y (yaw 0 shows the blades broadside to the iso camera). `axe.runes` are its runes. */
export function buildVarrowAxe(skin = null) {
  const axe = new THREE.Group(), M = {
    blade: phong(0xffffff, { vertexColors: true, shininess: 70, specular: 0x667077, map: skin ? skin.blade : null }), wood: phong(COL.wood),
    grip: skin ? phong(0xffffff, { map: skin.grip, shininess: 8 }) : null, socketFace: skin ? phong(0xffffff, { map: skin.socket, shininess: 40 }) : null, bronze: phong(COL.bronze, { shininess: 60, specular: 0x6a5530 }),
    iron: phong(COL.iron, { shininess: 50, specular: 0x444a4e }), bone: phong(COL.bone, { shininess: 10 }), socket: phong(COL.socket), rune: phong(COL.rune, { shininess: 5 }),
    leather: COL.leather.map((c) => phong(c, { shininess: 4 })),
  };
  axe.materials = M;
  const add = (g, m, parent = axe) => { const mesh = new THREE.Mesh(g, m); parent.add(mesh); return mesh; };
  // the haft: ebony, leather-wrapped grip, bronze collars, iron butt spike
  add(new THREE.CylinderGeometry(1.35, 1.55, 70, 8).translate(0, AXE.butt + 35, 0), M.wood);
  if (M.grip) add(new THREE.CylinderGeometry(1.78, 1.78, 23, 10, 1, true).translate(0, 23.6, 0), M.grip);
  else for (let i = 0, y = 13; y < 35; y += 2.1, i++) add(new THREE.CylinderGeometry(1.78, 1.78, 1.5, 8).rotateY(i * 0.4).translate(0, y, 0), M.leather[i % 2]);
  for (const y of [11.5, 36, 57]) add(new THREE.CylinderGeometry(2.05, 2.05, 1.5, 8).translate(0, y, 0), M.bronze);
  add(new THREE.CylinderGeometry(1.85, 1.6, 2.2, 8).translate(0, AXE.butt + 0.6, 0), M.iron);
  add(new THREE.ConeGeometry(1.6, 6, 6).rotateX(Math.PI).translate(0, AXE.butt - 3, 0), M.iron);
  // iron langets up the haft into the head, riveted
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 1.55, z = Math.sin(a) * 1.55;
    add(new THREE.BoxGeometry(0.6, 16, 0.6).translate(x, 64, z), M.iron);
    for (const y of [59, 66]) add(new THREE.SphereGeometry(0.42, 5, 4).translate(x * 1.18, y, z * 1.18), M.bronze);
  }
  // the head
  const head = new THREE.Group();
  head.position.y = AXE.head;
  axe.add(head);
  const blade = bladeGeometry(!!skin);
  add(blade, M.blade, head);
  add(blade.clone().rotateY(Math.PI), M.blade, head);
  add(new THREE.BoxGeometry(5.6, 15, 4.4), M.socketFace ? [M.iron, M.iron, M.iron, M.iron, M.socketFace, M.socketFace] : M.iron, head);
  for (const y of [-7, 7]) add(new THREE.BoxGeometry(6.4, 1.3, 5).translate(0, y, 0), M.bronze, head);
  add(new THREE.ConeGeometry(1.9, 10, 6).translate(0, 12.5, 0), M.iron, head);
  add(new THREE.CylinderGeometry(1.2, 1.2, 1, 6).translate(0, 17.6, 0), M.bronze, head);
  // a death's head on each face of the socket
  for (const s of [1, -1]) {
    const sk = new THREE.Group();
    sk.position.set(0, 0.6, s * 2.3);
    if (s < 0) sk.rotation.y = Math.PI;
    head.add(sk);
    add(new THREE.SphereGeometry(2.5, 8, 6).scale(1, 1.15, 0.5).translate(0, 0.4, 0.4), M.bone, sk);
    add(new THREE.BoxGeometry(2.1, 1.2, 1.2).translate(0, -1.7, 0.55), M.bone, sk);
    for (const x of [-0.95, 0.95]) add(new THREE.SphereGeometry(0.72, 6, 4).scale(1, 1, 0.6).translate(x, 0.6, 1.45), M.socket, sk);
    add(new THREE.ConeGeometry(0.35, 0.8, 3).rotateX(Math.PI).translate(0, -0.4, 1.45), M.socket, sk);
    for (const x of [-0.6, 0, 0.6]) add(new THREE.BoxGeometry(0.16, 0.9, 0.3).translate(x, -1.75, 1.18), M.socket, sk);
  }
  // runes carved in both faces of both blades
  const runes = [];
  let k = 0;
  for (const side of [1, -1]) for (const face of [1, -1]) for (const a of [-0.7, -0.08, 0.52]) {
    const x = (5 + 11 * Math.cos(a)) * side, y = 11 * Math.sin(a);
    runes.push(runeGeometry(k++, x, y, face * 1.24, a * side));
  }
  axe.runes = add(mergeGeometries(runes), M.rune, head);
  // chains: one up to the rack's hook, two broken ones hanging from the top collar
  const top = AXE.head + 18.2;
  add(chain(Math.round((AXE.crossbar - 3 - top) / 1.55), 0, top, 0), M.iron);
  for (const [x, z, n] of [[2.1, 0.4, 4], [-1.9, -0.6, 3]]) add(chain(n, x, 57 - n * 1.55, z, 1.55, 0.8), M.iron);
  return axe;
}

/** The rack: two posts with feet, braces and a crossbar along the screen's horizontal, a hook in the middle. */
export function buildRack() {
  const rack = new THREE.Group(), wood = phong(COL.rack, { shininess: 4 }), dark = phong(COL.rackDark, { shininess: 4 }), iron = phong(COL.iron, { shininess: 40 });
  const add = (g, m) => { const mesh = new THREE.Mesh(g, m); rack.add(mesh); return mesh; };
  const H = AXE.crossbar, P = AXE.posts;
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(3.4, H + 2, 3.4).translate(s * P, (H + 2) / 2, 0), wood);
    add(new THREE.BoxGeometry(3, 2.2, 15).translate(s * P, 1.1, 0), dark);
    add(new THREE.BoxGeometry(2, 14, 2).rotateZ(s * 0.75).translate(s * (P - 4.6), H - 5, 0), dark);
    add(new THREE.BoxGeometry(3.8, 1.2, 3.8).translate(s * P, H - 9, 0), iron);
  }
  add(new THREE.BoxGeometry(2 * P + 8, 4, 3.8).translate(0, H + 1, 0), wood);
  add(new THREE.TorusGeometry(1.6, 0.45, 4, 10).translate(0, H - 1.6, 0), iron);
  rack.rotation.y = Math.PI / 4;   // posts left and right on screen
  return rack;
}
