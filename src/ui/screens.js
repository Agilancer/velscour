// Full-screen menus: title, class select, hero save slots, death, victory, settings, help.
import { G, saveSettings } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { sfx, applyVolumes, initAudio } from '../core/audio.js';
import { CLASS_IDS, A } from '../core/assets.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { UI, $ } from './ui.js';
import { listSaves, deleteSave, slotSaves, firstFreeSlot, moveToSlot, SLOTS } from '../game/save.js';
import { heroCanvas, excitable, preloadPortraits } from './heroanim.js';
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
  const { slots } = slotSaves();
  const last = listSaves().find((c) => c.slot !== null);
  const used = slots.filter(Boolean).length;
  const s = el('div', 'screen');
  s.classList.add('title-screen');
  s.innerHTML = `<img class="title-logo intro" src="assets/ui/logo.webp" alt="VELSCOUR"><div class="title-tag">A world built upon something that should have stayed dead.</div>`;
  const menu = el('div', 'title-menu');
  const add = (label, fn, cls = 'btn big') => { const b = el('button', cls, label); b.onclick = () => { if (!s.classList.contains('title-ready')) return; initAudio(); sfx('ui'); goFullscreen(); fn(); }; menu.appendChild(b); return b; };
  if (last) add(`Continue<br><span style="font-size:13px;color:#a8977c">${escapeHtml(last.name)} · Lv ${last.level} ${CLASSES[last.classId].name} · Depth ${last.depth}</span>`, () => G.game.loadChar(last));
  add('New Hero', () => newHero(titleScreen));
  add(`Heroes <span style="font-size:13px;color:#a8977c">· ${used}/${SLOTS} slots</span>`, heroesScreen, 'btn');
  add('Settings', settingsDialog, 'btn');
  add('How to Play', helpDialog, 'btn');
  s.appendChild(menu);
  s.appendChild(el('div', 'title-foot', 'Rough draft · placeholder art · progress saves in this browser'));
  const gate = el('div', 'title-gate', G.touch ? 'Tap to awaken' : 'Click to awaken');
  s.appendChild(gate);
  show(s);
  attachTitleFx(s, s.querySelector('.title-logo'), { tag: s.querySelector('.title-tag'), menu, gate });
}

/** Start a hero in the first free save slot, or show the slots if all are taken. */
function newHero(back) {
  const slot = firstFreeSlot();
  if (slot < 0) heroesScreen(`All ${SLOTS} slots are taken. Delete a hero to make room for a new one.`);
  else classSelect(slot, back);
}

const plaque = (name) => `<div class="plaque"><span>${escapeHtml(name)}</span></div>`;

export function classSelect(slot = Math.max(0, firstFreeSlot()), back = titleScreen) {
  let sel = 'paladin';
  preloadPortraits(CLASS_IDS);
  const s = el('div', 'screen class-screen');
  s.appendChild(el('h2', 'screen-title', `CHOOSE YOUR HERO <small>Slot ${slot + 1} of ${SLOTS}</small>`));
  const grid = el('div', 'class-grid');
  const info = el('div', 'class-info');
  const bigBox = el('div', 'class-big');
  const big = heroCanvas(sel, 'hero-cv');
  bigBox.appendChild(big.canvas);
  excitable(bigBox, big);
  const text = el('div', 'class-text');
  info.append(bigBox, text);
  const cards = {};
  const renderInfo = () => {
    const C = CLASSES[sel];
    big.setId(sel);
    text.innerHTML = `<h2>${C.name}</h2><p>${escapeHtml(C.desc)}</p><p class="dim">Skill trees: <b style="color:#e9dcc4">${C.trees.join(' · ')}</b><br>Primary attribute: <b style="color:#ffd34a">${ATTRS[C.primary].name}</b> · Life ${C.life} · Mana ${C.mana}</p>`;
    for (const id in cards) cards[id].classList.toggle('sel', id === sel);
  };
  for (const id of CLASS_IDS) {
    const card = el('div', 'class-card');
    const anim = heroCanvas(id);
    card.appendChild(anim.canvas);
    card.insertAdjacentHTML('beforeend', plaque(CLASSES[id].name));
    card.dataset.id = id;
    excitable(card, anim);
    card.onclick = () => { if (sel !== id) { sel = id; sfx('ui'); renderInfo(); } anim.burst(1.2); big.burst(1.4); };
    card.ondblclick = () => start();
    grid.appendChild(card);
    cards[id] = card;
  }
  s.appendChild(grid);
  s.appendChild(info);
  const row = el('div', 'row');
  row.style.justifyContent = 'center';
  row.style.margin = '6px 0 14px';
  const name = el('input', 'name-input');
  name.placeholder = 'Hero name';
  name.maxLength = 18;
  const backBtn = el('button', 'btn', 'Back');
  backBtn.onclick = () => { sfx('ui'); back(); };
  const go = el('button', 'btn big', 'Begin');
  const start = () => { sfx('ui'); G.game.newChar(sel, name.value.trim() || CLASSES[sel].name, slot); };
  go.onclick = start;
  name.onkeydown = (e) => { if (e.key === 'Enter') start(); };
  row.append(backBtn, name, go);
  s.appendChild(row);
  renderInfo();
  show(s);
}

/** The six save slots: play, delete, or start a new hero in an empty one. */
export function heroesScreen(note = '') {
  const { slots, parked } = slotSaves();
  preloadPortraits(slots.filter(Boolean).map((c) => c.classId));
  const s = el('div', 'screen slot-screen');
  s.appendChild(el('h2', 'screen-title', `HEROES <small>${slots.filter(Boolean).length} of ${SLOTS} slots</small>`));
  if (note) s.appendChild(el('p', 'slot-note', escapeHtml(note)));
  const grid = el('div', 'slot-grid');
  const reload = () => heroesScreen();
  const del = (c) => UI.confirm('Delete hero?', `Permanently delete ${escapeHtml(c.name)}?`, () => { deleteSave(c.id); reload(); }, 'Delete');
  slots.forEach((c, i) => {
    const card = el('div', 'slot-card' + (c ? '' : ' empty'));
    card.dataset.slot = i;
    card.appendChild(el('div', 'slot-num', `Slot ${i + 1}`));
    if (c) {
      const box = el('div', 'slot-hero');
      const anim = heroCanvas(c.classId);
      box.appendChild(anim.canvas);
      box.insertAdjacentHTML('beforeend', plaque(c.name));
      card.appendChild(box);
      card.insertAdjacentHTML('beforeend', `<div class="slot-info"><b>Lv ${c.level} ${CLASSES[c.classId].name}</b><div class="dim">Depth ${c.depth} · Deepest ${c.deepest || 0}</div><div class="dim">${fmtInt(c.gold)} gold</div></div>`);
      excitable(card, anim);
      const btns = el('div', 'slot-btns');
      const play = el('button', 'btn small', 'Play');
      const rm = el('button', 'btn small red', 'Delete');
      rm.onclick = (e) => { e.stopPropagation(); sfx('ui'); del(c); };
      btns.append(play, rm);
      card.appendChild(btns);
      card.onclick = () => { sfx('ui'); G.game.loadChar(c); };
    } else {
      card.insertAdjacentHTML('beforeend', `<div class="slot-hero"><div class="slot-plus">+</div>${plaque('Empty')}</div><div class="slot-info"><b>Create Hero</b><div class="dim">An empty slot</div></div>`);
      card.onclick = () => { sfx('ui'); classSelect(i, reload); };
    }
    grid.appendChild(card);
  });
  s.appendChild(grid);
  if (parked.length) {
    // heroes saved before slots existed, beyond the first six: kept, and movable into a slot once one is free
    s.appendChild(el('p', 'slot-note', `Heroes without a slot: free a slot to play them again.`));
    const list = el('div', 'save-list');
    const free = slots.indexOf(null);
    for (const c of parked) {
      const row = el('div', 'save-row', `<div class="info"><b>${escapeHtml(c.name)}</b><div class="dim">Level ${c.level} ${CLASSES[c.classId].name} · Depth ${c.depth} · ${fmtInt(c.gold)} gold</div></div>`);
      if (free >= 0) {
        const mv = el('button', 'btn small', `Move to Slot ${free + 1}`);
        mv.onclick = () => { sfx('ui'); moveToSlot(c.id, free); reload(); };
        row.appendChild(mv);
      }
      const rm = el('button', 'btn small red', 'Delete');
      rm.onclick = () => { sfx('ui'); del(c); };
      row.appendChild(rm);
      list.appendChild(row);
    }
    s.appendChild(list);
  }
  const back = el('button', 'btn', 'Back');
  back.style.margin = '12px 0';
  back.onclick = () => { sfx('ui'); titleScreen(); };
  s.appendChild(back);
  show(s);
}

export function deathScreen(depth, killer, onReturn) {
  const s = el('div', 'screen');
  s.innerHTML = `<div class="death-title">YOU HAVE DIED</div><p style="font-size:18px">Slain on Depth ${depth}${killer ? ` by <b style="color:#ff8060">${escapeHtml(killer)}</b>` : ''}.</p><p class="dim" style="max-width:520px;text-align:center;padding:0 12px">Your gear, levels and skills endure — but the descent begins again from Depth 1.</p>`;
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
  const d = UI.dialog({ title: 'Settings', html, buttons: [{ label: 'Done', fn: () => saveSettings() }] });
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
    <div>Die and you restart at Depth 1, keeping everything else.</div>
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
