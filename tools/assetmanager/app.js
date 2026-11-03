// VELSCOUR Asset Manager: lists every sprite, texture and 3D model from manifest.json (built by build.mjs from the
// game's own catalogs), split into custom art and placeholders. Flags and notes are kept per browser in localStorage.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROOT = '../../';
const KEY = 'velscour_assetmgr_v1';
const FLAGS = [
  ['needs', 'Needs art', '#ff5d4d'], ['requested', 'Requested', '#ee9442'], ['progress', 'In progress', '#b694ff'],
  ['ready', 'Ready to import', '#4fcdb9'], ['approved', 'Approved', '#7fd36a'],
];
const FLAG = Object.fromEntries(FLAGS.map(([id, label, c]) => [id, { label, c }]));
const PAGE = 120;

// ------------------------------------------------------------------ saved prefs + tracking (never required)
let store = { items: {}, view: 'grid', filt: 'all' };
try { Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* private mode */ }
store.items ||= {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { toast('Could not save in this browser'); } };
const track = (it) => store.items[it.id] || {};

// ------------------------------------------------------------------ data
let M;
try { M = await (await fetch('manifest.json', { cache: 'no-cache' })).json(); }
catch (e) { $('#main').innerHTML = `<p class="empty">Could not load manifest.json (${esc(e.message)}). Serve the repo over http and rebuild it with <code>node tools/assetmanager/build.mjs</code>.</p>`; throw e; }
const REPO = M.repo || 'Agilancer/velscour', BR = M.branch || 'main';
const gh = (p) => `https://github.com/${REPO}/blob/${BR}/${p}`;
const ghTree = (p) => `https://github.com/${REPO}/tree/${BR}/${p}`;
const ghUpload = (p) => `https://github.com/${REPO}/upload/${BR}/${p}`;
const KINDS = M.kinds, isPh = (it) => KINDS[it.k].list === 'ph';
const SECS = M.sections.map((s, i) => ({ ...s, i, items: [] }));
const GROUPS = M.groups.map((g, i) => ({ ...g, i, items: [] }));
const ITEMS = M.items.map((it, i) => {
  const g = GROUPS[it.g];
  const o = { ...it, i, grp: g, sec: SECS[g.s] };
  o.files = (it.f || []).map((f) => M.files[f]);
  o._s = [it.n, it.id, g.name, o.sec.name, KINDS[it.k].label, ...(it.names || []), ...o.files].join(' ').toLowerCase();
  g.items.push(o); o.sec.items.push(o);
  return o;
});
const BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
// views across sections: every 3D model, every texture
const VIEWS = [
  { id: 'models', name: 'All 3D models', blurb: 'Every three.js model, wherever it lives: baked to sprites (held weapons, turrets, critters, castles, ships) or drawn live (the tower, caverns, the Pirate Seas, the phoenix and totem).', test: (it) => it.y === 'model' },
  { id: 'textures', name: 'All textures', blurb: 'Floors, walls, props and the material swatches the 3D models are painted with.', test: (it) => it.y === 'texture' },
].map((v) => ({ ...v, virtual: true, items: ITEMS.filter(v.test) }));
const secById = (id) => SECS.find((s) => s.id === id) || VIEWS.find((v) => v.id === id);
const count = (items) => {
  const c = { all: items.length, custom: 0, ph: 0 };
  for (const k in KINDS) c[k] = 0;
  for (const it of items) { c[it.k]++; c[KINDS[it.k].list === 'ph' ? 'ph' : 'custom']++; }
  return c;
};
const TOTAL = count(ITEMS);

// ------------------------------------------------------------------ thumbnails (lazy sheet backgrounds)
const io = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { paintThumb(e.target); io.unobserve(e.target); }
}, { rootMargin: '400px 0px' });
function paintThumb(el) {
  const [s, n] = el.dataset.t.split(',').map(Number), sh = M.sheets[s];
  const c = n % sh.c, r = Math.floor(n / sh.c);
  el.style.backgroundImage = `url(${sh.f})`;
  el.style.backgroundSize = `${sh.c * 100}% ${sh.r * 100}%`;
  el.style.backgroundPosition = `${sh.c > 1 ? (c / (sh.c - 1)) * 100 : 0}% ${sh.r > 1 ? (r / (sh.r - 1)) * 100 : 0}%`;
}
function thumb(it, small) {
  const kc = `--c:var(--k-${it.k})`;
  if (!it.t) return `<span class="th none" style="${kc}">${esc(KINDS[it.k].tag)}${small ? '' : `<em>no art file</em>`}</span>`;
  return `<span class="th${it.px ? ' px' : ''}" data-t="${it.t.join(',')}"></span>`;
}
const observe = (root) => root.querySelectorAll('.th[data-t]').forEach((el) => io.observe(el));

// ------------------------------------------------------------------ routing
const state = { sec: null, q: '', filt: store.filt || 'all', open: null, more: new Set() };
function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (p[0] === 'a' && BY_ID[p[1]]) {
    const it = BY_ID[p[1]], cur = state.sec && secById(state.sec);
    return { sec: state.q || (cur && cur.items.includes(it)) ? state.sec : it.sec.id, open: p[1] };
  }
  if (p[0] === 's' && secById(p[1])) return { sec: p[1], group: p[2] === 'g' ? +p[3] : null };
  return { sec: null };
}
let lastKey = '';
function route() {
  const r = parse();
  const key = `${r.sec}|${state.q}|${state.filt}|${store.view}`;
  if (key !== lastKey || r.group != null) {
    lastKey = key; state.sec = r.sec; renderNav(); renderBar(); renderMain();
    if (r.group != null) document.getElementById('g' + r.group)?.scrollIntoView({ block: 'start' });
    else if (!r.open) window.scrollTo(0, 0);
  }
  state.open = r.open || null;
  renderDetail();
}
addEventListener('hashchange', route);
const go = (h) => { if (location.hash !== h) location.hash = h; else route(); };

// ------------------------------------------------------------------ nav + filter bar
function meter(c) {
  return `<div class="meter">${Object.keys(KINDS).map((k) => c[k] ? `<i style="--c:var(--k-${k});width:${(c[k] / c.all) * 100}%"></i>` : '').join('')}</div>`;
}
function renderNav() {
  $('#nav').innerHTML = `<a href="#/"${state.sec ? '' : ' aria-current="page"'}><span class="lbl">Overview</span><span class="n">${TOTAL.all}</span>${meter(TOTAL)}</a>` +
    SECS.map((s) => { const c = count(s.items);
      return `<a href="#/s/${s.id}"${state.sec === s.id ? ' aria-current="page"' : ''}><span class="lbl">${esc(s.name)}</span><span class="n">${c.all}</span>${meter(c)}</a>`; }).join('') +
    `<span class="navsep">Across sections</span>` + VIEWS.map((v) => { const c = count(v.items);
      return `<a href="#/s/${v.id}" class="view"${state.sec === v.id ? ' aria-current="page"' : ''}><span class="lbl">${esc(v.name)}</span><span class="n">${c.all}</span>${meter(c)}</a>`; }).join('');
  $('#nav [aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function scope() {
  let items = state.sec ? secById(state.sec).items : ITEMS;
  if (state.q) { const words = state.q.toLowerCase().split(/\s+/).filter(Boolean); items = items.filter((it) => words.every((w) => it._s.includes(w))); }
  return items;
}
const FILTS = [['all', 'All'], ['custom', 'Custom art & 3D'], ['ph', 'Placeholder'], ['flag', 'Flagged']];
const pass = (it, f = state.filt) => f === 'all' || (f === 'flag' ? !!track(it).f : (KINDS[it.k].list === f));
function renderBar() {
  const items = scope();
  $('#filters').innerHTML = FILTS.map(([id, label]) => {
    const n = items.filter((it) => pass(it, id)).length;
    const dot = id === 'custom' ? '<span class="dot" style="--c:var(--k-art)"></span>' : id === 'ph' ? '<span class="dot" style="--c:var(--k-ascii)"></span>' : id === 'flag' ? '<span class="dot" style="--c:#ee9442"></span>' : '';
    return `<button class="chip" role="radio" data-f="${id}" aria-checked="${state.filt === id}">${dot}${label} <span class="n">${n}</span></button>`;
  }).join('');
  document.querySelectorAll('.viewtog button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === store.view));
  $('#bar').hidden = !state.sec && !state.q;
}
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  state.filt = store.filt = b.dataset.f; save(); route();
});
$('.viewtog').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  store.view = b.dataset.view; save(); route();
});
let qt;
$('#q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); route(); }, 140); });

// ------------------------------------------------------------------ main views
function renderMain() {
  const main = $('#main');
  if (!state.sec && !state.q) { main.innerHTML = overview(); observeStrips(main); return; }
  const items = scope().filter((it) => pass(it));
  const sec = state.sec && secById(state.sec), across = !sec || sec.virtual;
  const c = count(scope());
  let h = '';
  if (sec) {
    h += `<div class="sechead"><div><h1>${esc(sec.name)}</h1><p class="lede">${esc(sec.blurb)}</p></div>${tally(c)}</div>${meter(c)}${kinds(c)}`;
  } else h += `<div class="sechead"><div><h1>Search</h1><p class="lede">${items.length} of ${ITEMS.length} assets match “${esc(state.q)}”.</p></div></div>`;
  if (!items.length) h += `<p class="empty">Nothing here with this filter.</p>`;
  for (const [list, title, blurb] of [['custom', 'Custom art and textured 3D models', 'Painted or imported art, generated art packs, and 3D models with real textures.'],
    ['ph', 'Placeholder art', 'ASCII pixel art, shapes drawn in code, recoloured art borrowed from something else, and 3D models without textures.']]) {
    const part = items.filter((it) => KINDS[it.k].list === list);
    if (!part.length) continue;
    h += `<section class="block"><div class="blockhead"><span class="dot" style="--c:var(--k-${list === 'ph' ? 'ascii' : 'art'})"></span><h2>${title}</h2><span class="n">${part.length}</span></div>`;
    if (sec) h += `<p class="lede" style="font-size:14px">${blurb}</p>`;
    const byG = new Map();
    for (const it of part) { const k = it.grp.i; if (!byG.has(k)) byG.set(k, []); byG.get(k).push(it); }
    for (const [, list2] of byG) h += group(list2[0].grp, list2, across);
    h += `</section>`;
  }
  main.innerHTML = h;
  observe(main);
  markOpen();
}
function tally(c) {
  const st = (n, label, col) => `<div class="stat" style="--c:${col}"><b>${n}</b><span>${label}</span></div>`;
  return `<div class="tally">${st(c.all, 'assets', 'var(--text)')}${st(c.custom, 'custom art &amp; 3D', 'var(--k-art)')}${st(c.ph, 'placeholder', 'var(--k-ascii)')}</div>`;
}
const kinds = (c) => `<div class="kinds">${Object.entries(KINDS).filter(([k]) => c[k]).map(([k, v]) => `<span title="${esc(v.blurb)}"><span class="dot" style="--c:var(--k-${k})"></span>${esc(v.label)} <b>${c[k]}</b></span>`).join('')}</div>`;
function group(g, items, withSec) {
  const key = `${g.i}:${state.filt}:${KINDS[items[0].k].list}`;
  const all = state.more.has(key) || state.q;
  const shown = all ? items : items.slice(0, PAGE);
  const kinds = [...new Set(items.map((it) => it.k))];
  const body = store.view === 'list' ? `<div class="list">${shown.map(row).join('')}</div>` : `<div class="grid">${shown.map(card).join('')}</div>`;
  return `<details class="group" id="g${g.i}" open><summary><h3>${withSec ? esc(SECS[g.s].name) + ' › ' : ''}${esc(g.name)}</h3><span class="n">${items.length}</span>` +
    kinds.map((k) => `<span class="dot" title="${esc(KINDS[k].label)}" style="--c:var(--k-${k})"></span>`).join('') +
    (g.note ? `<span class="note">${esc(g.note)}</span>` : '') + `</summary>${body}` +
    (shown.length < items.length ? `<button class="more" data-more="${key}">Show all ${items.length}</button>` : '') + `</details>`;
}
function flagDot(it) { const f = track(it).f; return f ? `<span class="flag" style="--f:${FLAG[f].c}" title="${esc(FLAG[f].label)}"></span>` : ''; }
function card(it) {
  return `<button class="card" data-i="${it.i}"><span class="kb"><span class="dot" style="--c:var(--k-${it.k})"></span></span>${thumb(it)}` +
    (it.c > 1 ? `<span class="cnt">×${it.c}</span>` : '') + `<span class="nm">${esc(it.n)}</span>${flagDot(it)}</button>`;
}
function row(it) {
  return `<button class="row" data-i="${it.i}">${thumb(it, true)}<span style="min-width:0"><span class="nm" style="display:block">${esc(it.n)}${it.c > 1 ? ` <span class="dim">×${it.c}</span>` : ''}</span>` +
    `<span class="sub" style="display:block">${esc(it.files[0] || it.w || it.grp.w || '')}</span></span>` +
    `<span class="kind" style="--c:var(--k-${it.k})"><span class="dot"></span>${esc(KINDS[it.k].label)}</span>${flagDot(it)}</button>`;
}
$('#main').addEventListener('click', (e) => {
  const m = e.target.closest('[data-more]');
  if (m) { state.more.add(m.dataset.more); lastKey = ''; const y = scrollY; route(); scrollTo(0, y); return; }
  const c = e.target.closest('[data-i]');
  if (c) go(`#/a/${encodeURIComponent(ITEMS[+c.dataset.i].id)}`);
});

function overview() {
  const k = Object.entries(KINDS);
  let h = `<div class="sechead"><div><h1>All game art</h1><p class="lede">${TOTAL.all} sprites, textures and 3D models across ${SECS.length} sections: ` +
    `<b style="color:var(--k-art)">${TOTAL.custom}</b> with custom art or textured 3D models and <b style="color:var(--k-ascii)">${TOTAL.ph}</b> still on placeholder art. ` +
    `Tap anything to see its files, preview it and flag it for new art.</p></div>${tally(TOTAL)}</div>${meter(TOTAL)}`;
  h += `<details class="legendbox"${innerWidth >= 700 ? ' open' : ''}><summary>What the colours mean</summary><div class="legend">${k.map(([id, v]) => `<span><span class="dot" style="--c:var(--k-${id})"></span><b>${esc(v.label)} <span class="dim" style="font-weight:400">${TOTAL[id]}${v.list === 'ph' ? ' · placeholder' : ''}</span></b><small>${esc(v.blurb)}</small></span>`).join('')}</div></details>`;
  h += `<div class="ovgrid">` + SECS.map((s) => {
    const c = count(s.items);
    const pics = s.items.filter((it) => it.t && !isPh(it));
    const pick = Array.from({ length: Math.min(6, pics.length) }, (_, n) => pics[Math.floor((n + 0.5) * pics.length / Math.min(6, pics.length))]);
    return `<a class="ov" href="#/s/${s.id}"><div class="t"><h2>${esc(s.name)}</h2><span class="dim">${c.all}</span></div>` +
      `<div class="strip">${pick.map((it) => `<span data-t="${it.t.join(',')}"></span>`).join('')}</div>` +
      `<p>${esc(s.blurb)}</p>${meter(c)}<div class="nums"><span><b style="--c:var(--k-art)">${c.custom}</b> custom art &amp; 3D</span><span><b style="--c:var(--k-ascii)">${c.ph}</b> placeholder</span></div></a>`;
  }).join('') + `</div>`;
  const needs = GROUPS.map((g) => ({ g, n: g.items.filter(isPh).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  if (needs.length) {
    h += `<section class="needs"><div class="blockhead"><span class="dot" style="--c:var(--k-ascii)"></span><h2>Still on placeholder art</h2><span class="n">${needs.length} groups</span></div><ol>` +
      needs.map(({ g, n }) => { const k0 = g.items.find(isPh).k;
        return `<li><a href="#/s/${SECS[g.s].id}/g/${g.i}"><b style="--c:var(--k-${k0})">${n}</b><span>${esc(g.name)}<small>${esc(SECS[g.s].name)} · ${esc(KINDS[k0].label)}</small></span></a></li>`; }).join('') + `</ol></section>`;
  }
  return h;
}
function observeStrips(root) {
  root.querySelectorAll('.strip span[data-t]').forEach((el) => io.observe(el));
  root.querySelectorAll('.strip span').forEach((el) => { el.classList.add('th'); el.style.aspectRatio = 'auto'; });
}
function markOpen() {
  document.querySelectorAll('[data-i][aria-current]').forEach((el) => el.removeAttribute('aria-current'));
  if (state.open && BY_ID[state.open]) document.querySelector(`[data-i="${BY_ID[state.open].i}"]`)?.setAttribute('aria-current', 'true');
}

// ------------------------------------------------------------------ detail panel
const imgs = new Map();
function image(path) {
  if (!imgs.has(path)) imgs.set(path, new Promise((ok, no) => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.onerror = () => no(new Error('could not load ' + path)); im.src = ROOT + path; }));
  return imgs.get(path);
}
const view = { zoom: 'fit', bg: 'checker', smooth: false, frame: 0 };
function closeDetail() { go(state.sec ? `#/s/${state.sec}` : '#/'); }
function renderDetail() {
  const d = $('#detail'), it = state.open && BY_ID[state.open];
  markOpen();
  document.body.classList.toggle('docked', !!it);
  if (!it) { d.hidden = true; $('#scrim').hidden = true; return; }
  if (d.dataset.id !== it.id) view.frame = 0;
  d.dataset.id = it.id; d.hidden = false; $('#scrim').hidden = innerWidth >= 960;
  const g = it.grp, kd = KINDS[it.k], t = track(it);
  const frames = it.fr || (it.p ? [it.p] : []);
  const why = it.w || g.w || kd.blurb;
  const files = it.files.length ? it.files : (g.files || []);
  let h = `<div class="dhead"><div><h2>${esc(it.n)}</h2><div class="crumb">${esc(it.sec.name)} › ${esc(g.name)}</div></div>` +
    `<button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg></button></div><div class="dbody">`;
  h += `<div class="stage ${view.bg}" id="stage"><div class="msg">${frames.length ? 'Loading…' : esc(it.k === 'code' || it.k === 'ascii' ? 'No art file: the game draws this in code.' : 'No preview image.')}</div></div>`;
  if (frames.length) {
    h += `<div class="stagebar"><span class="seg">${['fit', 1, 2, 4].map((z) => `<button data-zoom="${z}" aria-pressed="${String(view.zoom) === String(z)}">${z === 'fit' ? 'Fit' : z + '×'}</button>`).join('')}</span>` +
      `<span class="seg">${['checker', 'dark', 'light', 'grass'].map((b) => `<button data-bg="${b}" aria-pressed="${view.bg === b}" title="${b} backdrop">${b[0].toUpperCase() + b.slice(1)}</button>`).join('')}</span>` +
      `<span class="seg"><button data-smooth aria-pressed="${!view.smooth}" title="Show pixels sharp">Sharp</button></span><span class="sp"></span><span id="dims"></span></div>`;
    if (frames.length > 1) h += `<div class="frames" id="frames">${frames.slice(0, 400).map((_, n) => `<button data-frame="${n}" aria-pressed="${n === view.frame}" aria-label="${esc(it.names && it.names.length === frames.length ? it.names[n] : 'Frame ' + (n + 1))}" title="${esc(it.names && it.names.length === frames.length ? it.names[n] : 'Frame ' + (n + 1))}"><canvas width="1" height="1"></canvas></button>`).join('')}</div>` +
      (frames.length > 400 ? `<p class="dim" style="font-size:13px">Showing the first 400 of ${frames.length}.</p>` : '');
  }
  h += `<div class="status" style="--c:var(--k-${it.k})"><span class="dot"></span><div><b>${esc(kd.label)}</b>${kd.list === 'ph' ? ' <span class="dim">(placeholder)</span>' : ''}<p>${esc(why)}</p></div></div>`;
  h += `<dl class="facts"><dt>ID</dt><dd><code>${esc(it.id)}</code></dd>` +
    (it.c > 1 ? `<dt>Variants</dt><dd>${it.c}</dd>` : '') +
    (it.d ? `<dt>About</dt><dd>${esc(it.d)}</dd>` : '') +
    (g.note && !it.d ? `<dt>Group</dt><dd>${esc(g.note)}</dd>` : '') +
    (g.code ? `<dt>Code</dt><dd>${g.code.split(' ').map((c) => `<a href="${gh(c)}" target="_blank" rel="noopener"><code>${esc(c)}</code></a>`).join(' ')}</dd>` : '') + `</dl>`;
  if (it.names?.length) h += `<div class="sect"><h3>Includes</h3><ul class="names">${it.names.slice(0, 120).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` +
    (it.names.length > 120 ? `<p class="dim" style="font-size:13px;margin:4px 0 0">…and ${it.names.length - 120} more</p>` : '') + `</div>`;
  if (files.length) h += `<div class="sect"><h3>Files</h3><ul class="files">${files.map((f) => `<li><code>${esc(f)}</code><a href="${ROOT + f}" target="_blank" rel="noopener">Open</a><a href="${gh(f)}" target="_blank" rel="noopener">GitHub</a></li>`).join('')}</ul></div>`;
  const acts = [];
  if (g.v) acts.push(`<a class="btn" href="${ROOT + g.v}" target="_blank" rel="noopener">Open the live 3D viewer</a>`);
  if (g.dir) acts.push(`<a class="btn" href="${ghUpload(g.dir)}" target="_blank" rel="noopener">Upload new art</a>`, `<a class="btn quiet" href="${ghTree(g.dir)}" target="_blank" rel="noopener">Source folder</a>`);
  if (g.doc) acts.push(`<a class="btn quiet" href="${gh(g.doc)}" target="_blank" rel="noopener">How it's made</a>`);
  acts.push(`<button class="btn quiet" data-copy>Copy link</button>`);
  h += `<div class="sect"><h3>Manage</h3>` + (g.cmd ? `<p class="dim" style="margin:0;font-size:14px">Rebuild after new art lands: <code>${esc(g.cmd)}</code></p>` : '') +
    (g.dir ? `<p class="dim" style="margin:6px 0 0;font-size:14px">New source art goes in <code>${esc(g.dir)}</code>.</p>` : '') + `<div class="btns">${acts.join('')}</div></div>`;
  h += `<div class="sect"><h3>Track</h3><div class="track">${FLAGS.map(([id, label, c]) => `<button data-flag="${id}" style="--f:${c}" aria-pressed="${t.f === id}"><i></i>${label}</button>`).join('')}</div>` +
    `<textarea id="note" placeholder="Notes: what the new art should look like, who is making it…">${esc(t.n || '')}</textarea>` +
    (t.at ? `<p class="dim" style="font-size:12px;margin:4px 0 0">Updated ${new Date(t.at).toLocaleString()}</p>` : '') + `</div></div>`;
  d.innerHTML = h;
  if (frames.length) { drawStage(it, frames); drawFrames(frames); }
}
async function drawStage(it, frames) {
  const st = $('#stage'), fr = frames[view.frame] || frames[0];
  try {
    const im = await image(M.files[fr[0]]);
    if (state.open !== it.id) return;
    const [, x = 0, y = 0, w = im.naturalWidth, h = im.naturalHeight] = fr;
    const box = Math.max(200, st.clientWidth - 24), boxH = Math.max(220, Math.min(innerHeight * 0.45, 460));
    let z = view.zoom === 'fit' ? Math.min(box / w, boxH / h) : +view.zoom;
    if (view.zoom === 'fit') z = Math.min(z, 4);
    if (view.zoom === 'fit' && z > 1 && !view.smooth) z = Math.max(1, Math.floor(z));
    const cv = document.createElement('canvas'), dpr = devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(w * z * dpr)); cv.height = Math.max(1, Math.round(h * z * dpr));
    cv.style.width = `${Math.round(w * z)}px`; cv.style.height = `${Math.round(h * z)}px`;
    const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = view.smooth || z * dpr < 1;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(im, x, y, w, h, 0, 0, cv.width, cv.height);
    st.textContent = ''; st.append(cv);
    const nm = it.names && it.names.length === frames.length ? it.names[view.frame] : '';
    $('#dims').textContent = `${nm ? nm + ' · ' : ''}${w}×${h} px${frames.length > 1 ? ` · ${view.frame + 1}/${frames.length}` : ''}`;
  } catch (e) { st.innerHTML = `<div class="msg">${esc(e.message)}</div>`; }
}
function drawFrames(frames) {
  const box = $('#frames'); if (!box) return;
  const fio = new IntersectionObserver(async (es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue; fio.unobserve(e.target);
      const fr = frames[+e.target.dataset.frame];
      const im = await image(M.files[fr[0]]).catch(() => null); if (!im) continue;
      const [, x = 0, y = 0, w = im.naturalWidth, h = im.naturalHeight] = fr, k = Math.min(1, 96 / Math.max(w, h));
      const cv = e.target.querySelector('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
      cv.getContext('2d').drawImage(im, x, y, w, h, 0, 0, cv.width, cv.height);
    }
  }, { root: box, rootMargin: '200px' });
  box.querySelectorAll('[data-frame]').forEach((b) => fio.observe(b));
}
$('#detail').addEventListener('click', (e) => {
  const it = BY_ID[state.open]; if (!it) return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-close')) return closeDetail();
  if (b.dataset.zoom) { view.zoom = b.dataset.zoom; return renderDetail(); }
  if (b.dataset.bg) { view.bg = b.dataset.bg; return renderDetail(); }
  if (b.hasAttribute('data-smooth')) { view.smooth = !view.smooth; return renderDetail(); }
  if (b.dataset.frame) { view.frame = +b.dataset.frame; document.querySelectorAll('#frames [aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return drawStage(it, it.fr); }
  if (b.dataset.flag) {
    const t = store.items[it.id] ||= {};
    t.f = t.f === b.dataset.flag ? undefined : b.dataset.flag; t.at = Date.now();
    if (!t.f && !t.n) delete store.items[it.id];
    save(); renderDetail(); refreshCard(it); renderBar(); return;
  }
  if (b.hasAttribute('data-copy')) {
    const url = location.href;
    (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('Link copied'), () => prompt('Copy this link', url));
  }
});
$('#detail').addEventListener('input', (e) => {
  if (e.target.id !== 'note') return;
  const it = BY_ID[state.open], t = store.items[it.id] ||= {};
  t.n = e.target.value; t.at = Date.now();
  if (!t.f && !t.n) delete store.items[it.id];
  save();
});
function refreshCard(it) {
  const el = document.querySelector(`[data-i="${it.i}"]`); if (!el) return;
  el.querySelector('.flag')?.remove();
  el.insertAdjacentHTML('beforeend', flagDot(it));
}
$('#scrim').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#menu').hidden) return toggleMenu(false); if (state.open) closeDetail(); }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#q').focus(); }
});
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (state.open) { $('#scrim').hidden = innerWidth >= 960; } }, 150); });

// ------------------------------------------------------------------ menu: export / import
function toggleMenu(on = $('#menu').hidden) { $('#menu').hidden = !on; }
$('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
document.addEventListener('click', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu')) toggleMenu(false); });
$('#about').innerHTML = `${TOTAL.all} assets, built ${esc(new Date(M.built).toLocaleString())} from <a href="https://github.com/${REPO}/commit/${esc(M.commit)}" target="_blank" rel="noopener">${esc(M.commit)}</a>. ` +
  `Rebuild with <code>node tools/assetmanager/build.mjs</code>.`;
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const csvCell = (v) => /[",\n]/.test(v = String(v ?? '')) ? `"${v.replace(/"/g, '""')}"` : v;
$('#menu').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act; if (!act) return;
  toggleMenu(false);
  const stamp = new Date().toISOString().slice(0, 10);
  if (act === 'md') {
    const todo = ITEMS.filter((it) => isPh(it) || (track(it).f && track(it).f !== 'approved'));
    let md = `# VELSCOUR art to-do (${stamp})\n\n${todo.length} assets: every placeholder plus anything flagged. Built from ${M.commit}.\n`;
    for (const s of SECS) {
      const list = todo.filter((it) => it.sec === s); if (!list.length) continue;
      md += `\n## ${s.name} (${list.length})\n`;
      for (const g of GROUPS.filter((g) => g.s === s.i)) {
        const l2 = list.filter((it) => it.grp === g); if (!l2.length) continue;
        md += `\n### ${g.name} (${l2.length})\n${g.note ? g.note + '\n' : ''}${g.dir ? `Source folder: \`${g.dir}\`${g.doc ? `, see \`${g.doc}\`` : ''}\n` : ''}\n`;
        for (const it of l2) { const t = track(it);
          md += `- **${it.n}** \`${it.id}\` — ${KINDS[it.k].label}${t.f ? ` · _${FLAG[t.f].label}_` : ''}${it.c > 1 ? ` · ${it.c} variants` : ''}${t.n ? `\n  - ${t.n.replace(/\n/g, '\n    ')}` : ''}\n`; }
      }
    }
    download(`velscour-art-todo-${stamp}.md`, md, 'text/markdown');
  } else if (act === 'csv') {
    const items = scope().filter((it) => pass(it));
    const rows = [['section', 'group', 'name', 'id', 'status', 'placeholder', 'variants', 'files', 'flag', 'notes']].concat(items.map((it) => {
      const t = track(it); return [it.sec.name, it.grp.name, it.n, it.id, KINDS[it.k].label, isPh(it) ? 'yes' : 'no', it.c || 1, it.files.join(' '), t.f ? FLAG[t.f].label : '', t.n || ''];
    }));
    download(`velscour-assets-${stamp}.csv`, rows.map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  } else if (act === 'backup') {
    download(`velscour-asset-notes-${stamp}.json`, JSON.stringify({ app: 'velscour-assetmgr', v: 1, items: store.items }, null, 1), 'application/json');
  } else if (act === 'clear') {
    if (!confirm('Clear every flag and note in this browser?')) return;
    store.items = {}; save(); lastKey = ''; route(); toast('Cleared');
  }
});
$('#menu input[type=file]').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!j || typeof j.items !== 'object') throw new Error('not a backup from this page');
    let n = 0;
    for (const [id, t] of Object.entries(j.items)) { const cur = store.items[id]; if (!cur || (t.at || 0) > (cur.at || 0)) { store.items[id] = t; n++; } }
    save(); lastKey = ''; route(); toast(`Restored ${n} flags/notes (newer ones kept)`);
  } catch (err) { toast('Could not restore: ' + err.message); }
  e.target.value = '';
});
let tt; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

route();
