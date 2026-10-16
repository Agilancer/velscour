// Full-screen menus: title, class select, hero save slots, death, victory, settings, help.
import { G, saveSettings } from '../state.js';
import { camera } from '../core/view.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { sfx, applyVolumes, initAudio } from '../core/audio.js';
import { CLASS_IDS, A } from '../core/assets.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { UI, $ } from './ui.js';
import { listSaves, heroesByClass, deleteClassSaves } from '../game/save.js';
import { heroCanvas, excitable, preloadPortraits } from './heroanim.js';
import { savedGearPreview } from '../core/gearart.js';
import { attachTitleFx } from './titlefx.js';

let current = null;

/** On phones, hide the browser chrome and prefer landscape (where supported). */
function goFullscreen() {
  if (!G.touch || document.fullscreenElement) return;
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(de, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
  } catch (e) { /* not allowed - fine */ }
}
function show(node) {
  hide();
  current = node;
  UI.screensEl.appendChild(node);
}
export function hide() { if (current) { current.remove(); current = null; } }

export function titleScreen() {
  G.mode = 'title';
  const last = listSaves()[0];
  const used = Object.keys(heroesByClass()).length;
  const s = el('div', 'screen');
  s.classList.add('title-screen');
  s.innerHTML = `<div class="title-credits" aria-hidden="true"><img src="assets/ui/intro-blastorama.png" alt=""><img src="assets/ui/intro-curator.png" alt=""></div><img class="title-logo intro" src="assets/ui/logo.webp" alt="VELSCOUR"><div class="title-tag">A world built upon something that should have stayed dead.</div>`;
  const menu = el('div', 'title-menu');
  const add = (label, fn, cls = 'btn big') => { const b = el('button', cls, label); b.onclick = () => { if (!s.classList.contains('title-ready')) return; initAudio(); sfx('ui'); goFullscreen(); fn(); }; menu.appendChild(b); return b; };
  if (last) add(`Continue<br><span style="font-size:13px;color:#a8977c">${escapeHtml(last.name)} · Lv ${last.level} ${CLASSES[last.classId].name} · Depth ${last.depth}</span>`, () => G.game.loadChar(last));
  add(`Heroes <span style="font-size:13px;color:#a8977c">· ${used}/${CLASS_IDS.length}</span>`, () => classSelect(last ? last.classId : 'paladin'));
  add('Settings', settingsDialog, 'btn');
  add('How to Play', helpDialog, 'btn');
  s.appendChild(menu);
  s.appendChild(el('div', 'title-foot', 'Rough draft · placeholder art · progress saves in this browser'));
  const gate = el('div', 'title-gate', G.touch ? 'Tap to awaken' : 'Click to awaken');
  s.appendChild(gate);
  show(s);
  attachTitleFx(s, s.querySelector('.title-logo'), { tag: s.querySelector('.title-tag'), menu, gate, credits: s.querySelector('.title-credits') });
}

const plaque = (name) => `<div class="plaque"><span>${escapeHtml(name)}</span></div>`;

/** Hero select: one hero per class. A class with a hero plays it; an empty class names and starts a new one.
 * Delete arms delete mode: the next class picked with a hero is deleted (after a confirm), freeing that class. */
export function classSelect(sel = 'paladin', back = titleScreen) {
  const heroes = heroesByClass();
  let delMode = false;
  preloadPortraits(CLASS_IDS);
  const s = el('div', 'screen class-screen');
  s.appendChild(el('h2', 'screen-title', `CHOOSE YOUR HERO <small>${Object.keys(heroes).length} of ${CLASS_IDS.length} heroes</small>`));
  const grid = el('div', 'class-grid');
  const info = el('div', 'class-info');
  const bigBox = el('div', 'class-big');
  const big = heroCanvas(sel, 'hero-cv');
  bigBox.appendChild(big.canvas);
  excitable(bigBox, big);
  const text = el('div', 'class-text');
  info.append(bigBox, text);
  const cards = {};
  const showSavedGear = (id, anim) => {
    const h = heroes[id];
    if (!h || !h.equip) return;
    savedGearPreview(id, h.equip.body, h.equip.head).then(art => {
      if (!art || !s.isConnected || anim.id !== id) return;
      anim.setArt(art);
      anim.canvas.dataset.gearPreview = 'ready';
    });
  };
  const row = el('div', 'row');
  const name = el('input', 'name-input');
  const go = el('button', 'btn big', 'Begin');
  const delBtn = el('button', 'btn red', 'Delete');
  const renderInfo = () => {
    const C = CLASSES[sel], h = heroes[sel];
    big.setId(sel);
    showSavedGear(sel, big);
    const slots = { weapon: 'Weapon', offhand: 'Offhand', body: 'Armor', head: 'Helm', hands: 'Gloves', legs: 'Legs', feet: 'Boots', ring1: 'Ring I', ring2: 'Ring II', ring3: 'Ring III', ring4: 'Ring IV' };
    const gear = h && h.equip ? Object.entries(slots).filter(([slot]) => h.equip[slot])
      .map(([slot, label]) => '<span><b>' + label + ':</b> ' + escapeHtml(h.equip[slot].name || h.equip[slot].base || 'Equipped') + '</span>').join('') : '';
    text.innerHTML = (h ? `<h2>${escapeHtml(h.name)}</h2><p><b style="color:#ffd34a">Level ${h.level} ${C.name}</b> · Depth ${h.depth} · Deepest ${h.deepest || 0} · ${fmtInt(h.gold)} gold</p>` : `<h2>${C.name}</h2>`) +
      `<p>${escapeHtml(C.desc)}</p><p class="dim">Skill trees: <b style="color:#e9dcc4">${C.trees.join(' · ')}</b><br>Primary attribute: <b style="color:#ffd34a">${ATTRS[C.primary].name}</b> · Life ${C.life} · Mana ${C.mana}</p>` +
      (gear ? '<div class="class-gear-summary" aria-label="Saved equipped gear">' + gear + '</div>' : '');
    for (const id in cards) cards[id].classList.toggle('sel', id === sel);
    name.style.display = h ? 'none' : '';
    go.innerHTML = h ? 'Play' : 'Begin';
    s.classList.toggle('del-mode', delMode);
    delBtn.innerHTML = delMode ? 'Cancel' : 'Delete';
  };
  const delHero = (id) => {
    delMode = false;
    renderInfo();
    UI.confirm('Delete hero?', `Permanently delete ${escapeHtml(heroes[id].name)}, the ${CLASSES[id].name}? You can then start a new ${CLASSES[id].name}.`, () => { deleteClassSaves(id); classSelect(id, back); }, 'Delete');
  };
  for (const id of CLASS_IDS) {
    const card = el('div', 'class-card' + (heroes[id] ? ' has-hero' : ''));
    const anim = heroCanvas(id);
    card.appendChild(anim.canvas);
    showSavedGear(id, anim);
    const h = heroes[id];
    if (h) card.insertAdjacentHTML('beforeend', `<div class="card-lv">Lv ${h.level}</div>`);
    card.insertAdjacentHTML('beforeend', plaque(h ? h.name : CLASSES[id].name));
    card.dataset.id = id;
    excitable(card, anim);
    card.onclick = () => {
      if (delMode && heroes[id]) { sfx('ui'); delHero(id); return; }
      if (sel !== id) { sel = id; sfx('ui'); renderInfo(); } anim.burst(1.2); big.burst(1.4);
    };
    card.ondblclick = () => { if (!delMode) start(); };
    grid.appendChild(card);
    cards[id] = card;
  }
  s.appendChild(grid);
  s.appendChild(info);
  row.style.justifyContent = 'center';
  row.style.margin = '6px 0 14px';
  name.placeholder = 'Hero name';
  name.maxLength = 18;
  const backBtn = el('button', 'btn', 'Back');
  backBtn.onclick = () => { sfx('ui'); back(); };
  delBtn.onclick = () => {
    sfx('ui');
    if (!Object.keys(heroes).length) return;
    if (!delMode && heroes[sel]) { delHero(sel); return; }
    delMode = !delMode;
    renderInfo();
  };
  const start = () => {
    sfx('ui');
    if (heroes[sel]) G.game.loadChar(heroes[sel]);
    else G.game.newChar(sel, name.value.trim() || CLASSES[sel].name);
  };
  go.onclick = start;
  name.onkeydown = (e) => { if (e.key === 'Enter') start(); };
  row.append(backBtn, delBtn, name, go);
  s.appendChild(row);
  renderInfo();
  show(s);
}

export function deathScreen(depth, killer, onReturn) {
  const s = el('div', 'screen');
  s.innerHTML = `<div class="death-title">YOU HAVE DIED</div><p style="font-size:18px">Slain on Depth ${depth}${killer ? ` by <b style="color:#ff8060">${escapeHtml(killer)}</b>` : ''}.</p><p class="dim" style="max-width:520px;text-align:center;padding:0 12px">Your gear, levels and skills endure — but you must fight back down from Depth ${Math.max(1, Math.floor((depth - 1) / 5) * 5 - 4)}.</p>`;
  const b = el('button', 'btn big red', 'Return to Town');
  b.onclick = () => { sfx('ui'); hide(); onReturn(); };
  s.appendChild(b);
  show(s);
}

export function victoryScreen(onContinue) {
  const c = G.char;
  const s = el('div', 'screen');
  s.innerHTML = `<img class="title-logo" src="assets/ui/logo.webp" style="max-height:28vh"><div class="death-title" style="color:#ffb030;text-shadow:0 0 30px #f80">VELSCOUR HAS FALLEN</div>
  <p style="font-size:18px;text-align:center;max-width:620px;padding:0 12px">${escapeHtml(c.name)} the ${CLASSES[c.classId].name} has slain the Demon Lord at the bottom of the world.</p>
  <p class="dim">Level ${c.level} · ${fmtInt(c.kills || 0)} kills · ${c.deaths || 0} deaths</p>
  <p class="dim" style="text-align:center;max-width:560px">The abyss stirs still. Endless Torment depths beyond 500 now await the truly mad.</p>`;
  const b = el('button', 'btn big', 'Continue');
  b.onclick = () => { sfx('ui'); hide(); onContinue(); };
  s.appendChild(b);
  show(s);
}

export function settingsDialog() {
  const st = G.settings;
  const html = `<div class="settings-grid">
    <label>Sound effects</label><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-k="sfx">
    <label>Music</label><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-k="music">
    <label>Ambience</label><input type="range" min="0" max="1" step="0.05" value="${st.amb ?? 0.5}" data-k="amb">
    <label>Camera zoom</label><input type="range" min="0.7" max="1.6" step="0.05" value="${st.zoom}" data-k="zoom">
    <label>Gore</label><select data-k="gore"><option value="0">Off</option><option value="1">Bloody</option><option value="2">Extreme</option></select>
    <label>Damage numbers</label><input type="checkbox" data-k="dmgNumbers" ${st.dmgNumbers ? 'checked' : ''}>
    <label>Screen shake</label><input type="checkbox" data-k="shake" ${st.shake ? 'checked' : ''}>
    <label>Auto-pickup items</label><input type="checkbox" data-k="autoLoot" ${st.autoLoot ? 'checked' : ''}>
    <label>Pause while menus open</label><input type="checkbox" data-k="pauseMenus" ${st.pauseMenus !== false ? 'checked' : ''}>
    <label>Show gold labels</label><input type="checkbox" data-k="showGoldLabels" ${st.showGoldLabels ? 'checked' : ''}>
  </div>`;
  const d = UI.dialog({ title: 'Settings', html, buttons: [{ label: 'Done', fn: () => { camera.computeZoom(); saveSettings(); } }] });
  d.box.querySelector('select').value = String(st.gore);
  d.box.querySelectorAll('[data-k]').forEach((inp) => {
    inp.oninput = inp.onchange = () => {
      const k = inp.dataset.k;
      st[k] = inp.type === 'checkbox' ? inp.checked : inp.tagName === 'SELECT' ? Number(inp.value) : Number(inp.value);
      applyVolumes();
      saveSettings();
    };
  });
}

export function helpDialog() {
  const html = `<div class="help-keys">
    <div><b style="color:#ffe2a0">PC</b></div>
    <div><kbd>Left click</kbd> move / attack / pick up / talk</div>
    <div><kbd>Shift</kbd>+click attack in place</div>
    <div><kbd>W A S D</kbd> move directly</div>
    <div><kbd>Right click</kbd> right-click skill</div>
    <div><kbd>&#96;</kbd> <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> cast skills at the cursor (13 keys + both mouse buttons)</div>
    <div><kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> <kbd>V</kbd> potions</div>
    <div><kbd>I</kbd> inventory · <kbd>K</kbd> skill tree · <kbd>B</kbd> skill book · <kbd>Q</kbd> quest log</div>
    <div><kbd>Tab</kbd>/<kbd>M</kbd> map · <kbd>Esc</kbd> menu · wheel zoom</div>
    <div><kbd>P</kbd> or the <b>Auto</b> button: auto-play (the hero fights, loots, shops and delves on autopilot)</div>
    <div><b style="color:#ffe2a0">Mobile</b></div>
    <div>Left thumb: virtual joystick</div>
    <div>Tap the world: move / attack / talk</div>
    <div>Right cluster: skills (hold to repeat, long-press to change; the &#8644; button flips to the second page of skills)</div>
    <div>Tap potions on the bar to drink</div>
    <div><b style="color:#ffe2a0">Goal</b></div>
    <div>Enter the portal in town. Find the exit of each depth — it is sealed until its guardian falls.</div>
    <div>Die and you restart a few depths back (the start of the previous five), keeping everything else.</div>
    <div>Reach Depth 500 and slay Demon Lord Velscour.</div>
    <div><b style="color:#ffe2a0">Growing stronger</b></div>
    <div><b>Rings</b> (four slots): each carries augments that change a skill, a kind of skill or every skill — burning or venomous hits, chain lightning, a storm tether to your orbiting weapons, meteors, extra projectiles and more. The Jeweler sells them; guardians drop them.</div>
    <div><b>Skill mastery</b>: every skill levels from 1 to 1000 as you use it and kill with it, growing stronger and its effects bigger.</div>
    <div><b>Gem Forge</b> (Gem Merchant): fuse three gems into the next grade, or refine one, up to Eternal.</div>
  </div>`;
  UI.dialog({ title: 'How to Play', html, buttons: [{ label: 'Got it' }] });
}

export function pauseMenu() {
  const d = UI.dialog({
    title: 'Paused',
    html: `<p class="dim">${escapeHtml(G.char.name)} · Level ${G.char.level} · Depth ${G.char.depth}</p>`,
    buttons: [
      { label: 'Resume' },
      { label: 'Settings', fn: settingsDialog },
      { label: 'Help', fn: helpDialog },
      { label: 'Save & Quit', cls: 'red', fn: () => G.game.quitToTitle() },
    ],
  });
  return d;
}

export { $, A };
