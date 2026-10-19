import { resolveHelmetFit } from '../../src/core/helmetfit.js';

const $ = (id) => document.getElementById(id);
const base = '../../assets/sprites/gear/';
const draftKey = () => `velscour-helmet-fitter-v4-${activeSet}`;
const camera = { x: 24, y: 48, w: 80, h: 96 };
const canvas = $('editor'), ctx = canvas.getContext('2d');
let index, atlas, data, persisted, current, loaded, activeSet = 'helmet', sets = {}, zoom = 6, history = [], dragging = null, space = false;
let serial = 0, dirty = false, angleChanging = false;
const cache = new Map(), bounds = new Map();
const round = (n) => Math.round(n * 10000) / 10000;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const title = (s) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const status = (s) => { $('status').textContent = s; };
const image = (url) => new Promise((resolve, reject) => {
  const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error(`Cannot load ${url}`)); im.src = url;
});
async function json(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot load ${url} (${response.status})`);
  return response.json();
}
const design = () => Number($('design').value);
const fit = (id = design()) => resolveHelmetFit(index, data, current, id, loaded.meta.headTop);
function remember() {
  history.push(JSON.stringify(data));
  if (history.length > 150) history.shift();
  $('undo').disabled = false;
}
function changed() {
  if (sets[activeSet]) sets[activeSet].data = data;
  dirty = JSON.stringify(data) !== persisted;
  try { localStorage.setItem(draftKey(), JSON.stringify(data)); } catch { /* Export/save still work without browser storage. */ }
  $('save').textContent = dirty ? 'Save to game •' : 'Save to game';
  updateControls(); draw();
  status(dirty ? 'Unsaved changes. Save to game when ready; a browser draft is also kept.' : 'All placements match the saved file.');
}
function setFit(value, record = true) {
  if (!loaded) return;
  if (record) remember();
  const clean = {
    x: round(clamp(value.x, -512, 512)), y: round(clamp(value.y, -512, 512)),
    scaleX: round(clamp(value.scaleX, .01, 4)), scaleY: round(clamp(value.scaleY, .01, 4)),
    rotation: round(clamp(value.rotation ?? 0, -180, 180)),
  };
  (data.classes[current] ||= {})[design()] = clean;
  changed();
}
function solidBounds(id) {
  const key = current + ':' + id;
  if (bounds.has(key)) return bounds.get(key);
  const [w, h] = index.frame, col = index.classes.indexOf(current);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(atlas, col * w, (id - 1) * h, w, h, 0, 0, w, h);
  const pixels = x.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let a = 0; a < w; a++) {
    if (pixels[(y * w + a) * 4 + 3] < 32) continue;
    x0 = Math.min(x0, a); y0 = Math.min(y0, y); x1 = Math.max(x1, a + 1); y1 = Math.max(y1, y + 1);
  }
  const box = [x0, y0, x1, y1]; bounds.set(key, box); return box;
}
function resize(sx, sy, record = true) {
  const old = fit(), b = solidBounds(design()), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  sx = clamp(sx, .01, 4); sy = clamp(sy, .01, 4);
  setFit({ x: old.x + cx * (old.scaleX - sx), y: old.y + cy * (old.scaleY - sy), scaleX: sx, scaleY: sy }, record);
}
function updateControls() {
  if (!loaded) return;
  const f = fit();
  for (const [id, value] of Object.entries({ x: round(f.x), y: round(f.y), sx: round(f.scaleX * 100), sy: round(f.scaleY * 100), size: f.scaleX * 100, rotation: round(f.rotation || 0), angle: round(f.rotation || 0) })) $(id).value = value;
  const label = index.designs.find(d => d.id === design());
  $('caption').textContent = `${title(current)} · ${label.catalog} (${label.name})`;
  $('numbers').textContent = `x=${f.x.toFixed(3)}  y=${f.y.toFixed(3)}  width=${(f.scaleX * 100).toFixed(2)}%  height=${(f.scaleY * 100).toFixed(2)}%  rotation=${(f.rotation || 0).toFixed(1)}°  | armor ${$('armor').value}`;
  const count = Object.values(data.classes).reduce((n, obj) => n + Object.keys(obj).length, 0);
  $('progress').textContent = `${count} / ${index.classes.length * index.designs.length} placements set · ${Object.keys(data.classes[current] || {}).length} / ${index.designs.length} for this class`;
  $('thumbTitle').textContent = `This class · all ${index.designs.length} helmets`;
  document.querySelectorAll('#thumbnails button').forEach((button, i) => {
    button.classList.toggle('active', i + 1 === design());
    button.lastChild.textContent = `${index.designs[i].catalog}${data.classes[current]?.[i + 1] ? ' •' : ''}`;
  });
}
function backdrop(x, w, h) {
  const mode = $('background').value;
  x.fillStyle = mode === 'light' ? '#c9c7c2' : '#272930'; x.fillRect(0, 0, w, h);
  if (mode === 'checker') {
    x.fillStyle = '#3b3e48';
    for (let y = 0; y < h; y += 16) for (let a = 0; a < w; a += 16) if ((a / 16 + y / 16) % 2) x.fillRect(a, y, 16, 16);
  }
}
function body(x) {
  const [fw, fh] = loaded.meta.frame, id = clamp(Number($('armor').value) || 1, 1, loaded.meta.armor.n) - 1;
  x.drawImage(loaded.image, (id % loaded.meta.cols) * fw, Math.floor(id / loaded.meta.cols) * fh, fw, fh, 0, 0, fw, fh);
}
function helmet(x, id, opacity = 1) {
  const f = fit(id), [w, h] = index.frame, col = index.classes.indexOf(current), b = solidBounds(id);
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  x.save(); x.globalAlpha = opacity;
  x.translate(f.x + cx * f.scaleX, f.y + cy * f.scaleY); x.rotate((f.rotation || 0) * Math.PI / 180);
  x.scale(f.scaleX, f.scaleY); x.drawImage(atlas, col * w, (id - 1) * h, w, h, -cx, -cy, w, h); x.restore();
}
function composite(id, opacity = 1, visible = true) {
  // Rasterize at the game's native body-frame resolution before enlarging it.
  const frame = document.createElement('canvas');
  [frame.width, frame.height] = loaded.meta.frame;
  const x = frame.getContext('2d'); body(x); if (visible) helmet(x, id, opacity);
  return frame;
}
function draw() {
  if (!loaded) return;
  const frame = composite(design(), Number($('opacity').value) / 100, $('show').checked && !space);
  backdrop(ctx, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, camera.x, camera.y, camera.w, camera.h, 0, 0, canvas.width, canvas.height);
  const full = $('full'), fx = full.getContext('2d'); backdrop(fx, full.width, full.height);
  fx.imageSmoothingEnabled = false; fx.drawImage(frame, 0, 0, full.width, full.height);
  document.querySelectorAll('#thumbnails canvas').forEach((thumb, i) => {
    const tx = thumb.getContext('2d'); backdrop(tx, thumb.width, thumb.height);
    tx.imageSmoothingEnabled = false; tx.drawImage(composite(i + 1), 28, 8, 88, 104, 0, 0, thumb.width, thumb.height);
  });
}
function viewZoom() {
  zoom = Number($('zoom').value); canvas.width = camera.w * zoom; canvas.height = camera.h * zoom;
  ctx.imageSmoothingEnabled = false; draw();
}
async function selectClass() {
  const token = ++serial, cls = $('class').value;
  loaded = null; $('controls').disabled = true; status(`Loading ${title(cls)}…`);
  try {
    if (!cache.has(cls)) cache.set(cls, Promise.all([json(base + cls + '/gear.json'), image(base + cls + '/armor.webp')]).then(([meta, im]) => ({ meta, image: im })).catch(e => { cache.delete(cls); throw e; }));
    const result = await cache.get(cls);
    if (token !== serial) return;
    current = cls; loaded = result; $('controls').disabled = false; $('armor').max = loaded.meta.armor.n;
    updateControls(); viewZoom(); status('Drag the helmet, scroll to resize, then save your fit.');
  } catch (e) { status(e.message); }
}
function selectDesign(id) { $('design').value = id; updateControls(); draw(); }
function showDesigns() {
  $('design').replaceChildren(); $('thumbnails').replaceChildren();
  for (const d of index.designs) {
    $('design').add(new Option(`${d.catalog} · ${d.name}`, d.id));
    const button = document.createElement('button'), thumb = document.createElement('canvas'), label = document.createElement('span');
    thumb.width = 110; thumb.height = 130; button.append(thumb, label); button.onclick = () => selectDesign(d.id); $('thumbnails').append(button);
  }
}
async function selectSet(next) {
  if (!sets[next]) return;
  stopDrag(); activeSet = next;
  ({ index, atlas, data, persisted } = sets[next]);
  history = []; $('undo').disabled = true;
  dirty = JSON.stringify(data) !== persisted;
  $('save').textContent = dirty ? 'Save to game •' : 'Save to game';
  $('draft').hidden = true;
  showDesigns();
  let draft;
  try { const raw = localStorage.getItem(draftKey()); if (raw && raw !== persisted) draft = validate(JSON.parse(raw)); } catch { /* A stale draft cannot block loading. */ }
  if (draft) {
    $('draft').hidden = false;
    $('restore').onclick = () => { remember(); data = draft; sets[activeSet].data = data; $('draft').hidden = true; changed(); };
    $('dismiss').onclick = () => { localStorage.removeItem(draftKey()); $('draft').hidden = true; };
  }
  const max = index.designs.length;
  const chosen = Math.min(Number($('design').value) || 1, max);
  $('design').value = chosen;
  if (loaded) { updateControls(); draw(); }
  status(`${index.rarity[0].toUpperCase()}${index.rarity.slice(1)} placements loaded.`);
}
function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: camera.x + (event.clientX - rect.left) * canvas.width / rect.width / zoom, y: camera.y + (event.clientY - rect.top) * canvas.height / rect.height / zoom };
}
canvas.addEventListener('pointerdown', (event) => {
  if (!loaded || event.button !== 0) return;
  canvas.focus(); canvas.setPointerCapture(event.pointerId);
  dragging = { point: point(event), fit: fit(), recorded: false, pointer: event.pointerId };
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const p = point(event), dx = p.x - dragging.point.x, dy = p.y - dragging.point.y;
  if (!dragging.recorded && Math.abs(dx) + Math.abs(dy) < .01) return;
  if (!dragging.recorded) { remember(); dragging.recorded = true; }
  setFit({ ...dragging.fit, x: dragging.fit.x + dx, y: dragging.fit.y + dy }, false);
});
const stopDrag = () => { dragging = null; };
canvas.addEventListener('pointerup', stopDrag); canvas.addEventListener('pointercancel', stopDrag); canvas.addEventListener('lostpointercapture', stopDrag);
canvas.addEventListener('wheel', (event) => {
  if (!loaded) return; event.preventDefault();
  const f = fit(), factor = event.deltaY < 0 ? 1.025 : 1 / 1.025;
  resize(f.scaleX * factor, f.scaleY * factor);
}, { passive: false });
for (const id of ['x', 'y']) $(id).addEventListener('change', () => { const v = Number($(id).value); if (Number.isFinite(v)) setFit({ ...fit(), [id]: v }); });
for (const [id, key, other] of [['sx', 'scaleX', 'scaleY'], ['sy', 'scaleY', 'scaleX']]) $(id).addEventListener('change', () => {
  const v = Number($(id).value) / 100, f = fit(); if (!Number.isFinite(v) || v <= 0) return updateControls();
  const values = { ...f, [key]: v };
  if ($('lock').checked) values[other] = f[other] * v / f[key];
  resize(values.scaleX, values.scaleY);
});
$('size').addEventListener('input', () => {
  const f = fit(), sx = Number($('size').value) / 100;
  resize(sx, $('lock').checked ? f.scaleY * sx / f.scaleX : f.scaleY);
});
$('rotation').addEventListener('change', () => {
  const value = Number($('rotation').value);
  if (Number.isFinite(value)) setFit({ ...fit(), rotation: value }); else updateControls();
});
$('angle').addEventListener('input', () => {
  if (!angleChanging) { remember(); angleChanging = true; }
  setFit({ ...fit(), rotation: Number($('angle').value) }, false);
});
$('angle').addEventListener('change', () => { angleChanging = false; });
$('class').addEventListener('change', () => { stopDrag(); selectClass(); });
$('set').addEventListener('change', () => selectSet($('set').value));
$('design').addEventListener('change', () => selectDesign(design()));
for (const id of ['opacity', 'show', 'background', 'armor']) $(id).addEventListener('input', () => { updateControls(); draw(); });
$('zoom').addEventListener('input', viewZoom);
function navigate(delta) {
  const perClass = index.designs.length;
  const n = index.classes.indexOf(current) * perClass + design() - 1 + delta;
  const wrapped = (n + index.classes.length * perClass) % (index.classes.length * perClass);
  $('design').value = wrapped % perClass + 1;
  const cls = index.classes[Math.floor(wrapped / perClass)];
  if (cls !== current) { $('class').value = cls; selectClass(); } else selectDesign(design());
}
$('previous').onclick = () => navigate(-1); $('next').onclick = () => navigate(1);
$('reset').onclick = () => { remember(); if (data.classes[current]) delete data.classes[current][design()]; changed(); };
$('undo').onclick = () => {
  if (!history.length) return; data = JSON.parse(history.pop()); changed(); $('undo').disabled = !history.length;
};
$('copyClass').onclick = () => { remember(); const f = fit(); for (const d of index.designs) (data.classes[current] ||= {})[d.id] = { ...f }; changed(); };
function validate(value) {
  if (!value || value.version !== 1 || !value.classes || typeof value.classes !== 'object' || Array.isArray(value.classes)) throw new Error('Expected a version 1 helmet placements file.');
  for (const [cls, fits] of Object.entries(value.classes)) {
    if (!index.classes.includes(cls) || !fits || typeof fits !== 'object' || Array.isArray(fits)) throw new Error('Unknown character in file.');
    for (const [id, f] of Object.entries(fits)) {
      const keys = f && Object.keys(f).sort().join();
      if (!index.designs.some(d => String(d.id) === id) || !f || !['scaleX,scaleY,x,y', 'rotation,scaleX,scaleY,x,y'].includes(keys)) throw new Error('Invalid helmet placement.');
      for (const [key, n] of Object.entries(f)) {
        const valid = key.startsWith('scale') ? n >= .01 && n <= 4 : key === 'rotation' ? n >= -180 && n <= 180 : Math.abs(n) <= 512;
        if (typeof n !== 'number' || !Number.isFinite(n) || !valid) throw new Error('Invalid position, scale, or rotation in file.');
      }
    }
  }
  return structuredClone(value);
}
$('save').onclick = async () => {
  $('save').disabled = true;
  try {
    const text = JSON.stringify(validate(data));
    const response = await fetch(`/api/helmet-placements?set=${activeSet}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
    let result; try { result = await response.json(); } catch { throw new Error('Saving needs Fit Helmets.cmd. You can still export JSON.'); }
    if (!response.ok) throw new Error(result.error || 'Could not save.');
    persisted = text; sets[activeSet].persisted = persisted; dirty = JSON.stringify(data) !== persisted;
    if (!dirty) { localStorage.removeItem(draftKey()); $('save').textContent = 'Save to game'; }
    status(`Saved to ${result.path}. Reload the game to use these placements.`);
  } catch (e) { status(e.message); } finally { $('save').disabled = false; }
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'velscour-helmet-placements.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('JSON downloaded. You can send that file or a screenshot of this view.');
};
$('png').onclick = () => {
  if (!loaded) return;
  const output = document.createElement('canvas'); output.width = 800; output.height = 720;
  const x = output.getContext('2d'); x.fillStyle = '#272930'; x.fillRect(0, 0, 800, 720);
  x.fillStyle = '#ece7dd'; x.font = 'bold 20px sans-serif'; x.fillText($('caption').textContent, 16, 30);
  const f = fit(); x.font = '15px monospace';
  x.fillText(`x=${f.x.toFixed(4)}  y=${f.y.toFixed(4)}  scaleX=${f.scaleX.toFixed(4)}  scaleY=${f.scaleY.toFixed(4)}  rotation=${(f.rotation || 0).toFixed(2)}°`, 16, 60);
  x.fillText(`Body armor ${$('armor').value} | ${current} | design ${design()} | full opacity`, 16, 86);
  const frame = composite(design()); x.imageSmoothingEnabled = false;
  x.drawImage(frame, camera.x, camera.y, camera.w, camera.h, 16, 110, 480, 576);
  x.drawImage(frame, 520, 110, 256, 384);
  const a = document.createElement('a'); a.download = `velscour-fit-${current}-${design()}.png`; a.href = output.toDataURL('image/png'); a.click();
  status('PNG downloaded with the exact fit values. You can send me that image.');
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  try { const file = $('file').files[0]; if (!file) return; const next = validate(JSON.parse(await file.text())); remember(); data = next; changed(); status('Imported placements. Save to game to apply them.'); }
  catch (e) { status(e.message); } finally { $('file').value = ''; }
};
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); $('save').click(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !['INPUT', 'SELECT'].includes(event.target.tagName)) { event.preventDefault(); $('undo').click(); return; }
  if (!loaded || ['INPUT', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); space = true; draw(); return; }
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[event.key]) {
    event.preventDefault(); const [x, y] = moves[event.key], step = event.shiftKey ? 1 : .25, f = fit(); setFit({ ...f, x: f.x + x * step, y: f.y + y * step });
  } else if (['+', '=', '-', '_'].includes(event.key)) {
    event.preventDefault(); const f = fit(), factor = ['-', '_'].includes(event.key) ? 1 / 1.025 : 1.025; resize(f.scaleX * factor, f.scaleY * factor);
  }
});
window.addEventListener('keyup', event => { if (event.code === 'Space') { space = false; draw(); } });
window.addEventListener('blur', () => { space = false; stopDrag(); draw(); });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

async function init() {
  $('controls').disabled = true;
  for (const set of ['helmet']) {
    const dir = 'helmets/';
    const [setIndex, setAtlas, setData] = await Promise.all([json(base + dir + 'index.json'), image(base + dir + 'atlas.png'), json(base + dir + 'placements.json')]);
    index = setIndex; validate(setData);
    sets[set] = { index: setIndex, atlas: setAtlas, data: setData, persisted: JSON.stringify(setData) };
  }
  index = sets.helmet.index;
  for (const cls of index.classes) $('class').add(new Option(title(cls), cls));
  await selectSet('helmet');
  await selectClass();
}
init().catch(e => status('Could not start fitter: ' + e.message));
