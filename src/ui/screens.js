// Full-screen menus: title, class select, load, death, victory, settings, help.
import { G, saveSettings } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { sfx, applyVolumes, initAudio, playMusic } from '../core/audio.js';
import { CLASS_IDS, A } from '../core/assets.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { UI, $ } from './ui.js';
import { listSaves, deleteSave } from '../game/save.js';

let current = null;
function show(node) {
  hide();
  current = node;
  UI.screensEl.appendChild(node);
}
export function hide() { if (current) { current.remove(); current = null; } }

export function titleScreen() {
  G.mode = 'title';
  const saves = listSaves();
  const last = saves[0];
  const s = el('div', 'screen');
  s.innerHTML = `<img class="title-logo" src="assets/ui/logo.webp" alt="VELSCOUR"><div class="title-tag">A world built upon something that should have stayed dead.</div>`;
  const menu = el('div', 'title-menu');
  const add = (label, fn, cls = 'btn big') => { const b = el('button', cls, label); b.onclick = () => { initAudio(); playMusic('town'); sfx('ui'); fn(); }; menu.appendChild(b); return b; };
  if (last) add(`Continue<br><span style="font-size:13px;color:#a8977c">${escapeHtml(last.name)} · Lv ${last.level} ${CLASSES[last.classId].name} · Depth ${last.depth}</span>`, () => G.game.loadChar(last));
  add('New Hero', classSelect);
  if (saves.length) add('Load Hero', loadScreen, 'btn');
  add('Settings', settingsDialog, 'btn');
  add('How to Play', helpDialog, 'btn');
  s.appendChild(menu);
  s.appendChild(el('div', 'title-foot', 'Rough draft · placeholder art & procedural sound · progress saves in this browser'));
  show(s);
}

export function classSelect() {
  let sel = 'paladin';
  const s = el('div', 'screen');
  s.style.justifyContent = 'flex-start';
  s.style.paddingTop = '10px';
  s.appendChild(el('h2', '', '<span style="font-family:Cinzel;color:#ffe2a0;letter-spacing:3px">CHOOSE YOUR HERO</span>'));
  const grid = el('div', 'class-grid');
  const info = el('div', 'class-info');
  const renderInfo = () => {
    const C = CLASSES[sel];
    info.innerHTML = `<img class="big" src="assets/sprites/classes/${sel}.webp"><div><h2>${C.name}</h2><p>${escapeHtml(C.desc)}</p><p class="dim">Skill trees: <b style="color:#e9dcc4">${C.trees.join(' · ')}</b><br>Primary attribute: <b style="color:#ffd34a">${ATTRS[C.primary].name}</b> · Life ${C.life} · Mana ${C.mana}</p></div>`;
    grid.querySelectorAll('.class-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === sel));
  };
  for (const id of CLASS_IDS) {
    const card = el('div', 'class-card', `<img src="assets/sprites/classes/${id}.webp" alt=""><span>${CLASSES[id].name}</span>`);
    card.dataset.id = id;
    card.onclick = () => { sel = id; sfx('ui'); renderInfo(); };
    card.ondblclick = () => start();
    grid.appendChild(card);
  }
  s.appendChild(grid);
  s.appendChild(info);
  const row = el('div', 'row');
  row.style.justifyContent = 'center';
  row.style.margin = '6px 0 14px';
  const name = el('input', 'name-input');
  name.placeholder = 'Hero name';
  name.maxLength = 18;
  const back = el('button', 'btn', 'Back');
  back.onclick = () => { sfx('ui'); titleScreen(); };
  const go = el('button', 'btn big', 'Begin');
  const start = () => { sfx('ui'); G.game.newChar(sel, name.value.trim() || CLASSES[sel].name); };
  go.onclick = start;
  name.onkeydown = (e) => { if (e.key === 'Enter') start(); };
  row.append(back, name, go);
  s.appendChild(row);
  renderInfo();
  show(s);
}

export function loadScreen() {
  const s = el('div', 'screen');
  s.appendChild(el('h2', '', '<span style="font-family:Cinzel;color:#ffe2a0;letter-spacing:3px">LOAD HERO</span>'));
  const list = el('div', 'save-list');
  for (const c of listSaves()) {
    const row = el('div', 'save-row', `<img src="assets/sprites/classes/${c.classId}.webp"><div class="info"><b>${escapeHtml(c.name)}</b><div class="dim">Level ${c.level} ${CLASSES[c.classId].name} · Depth ${c.depth} · Deepest ${c.deepest || 0} · ${fmtInt(c.gold)} gold</div></div>`);
    const del = el('button', 'btn small red', 'Delete');
    del.onclick = (e) => { e.stopPropagation(); UI.confirm('Delete hero?', `Permanently delete ${escapeHtml(c.name)}?`, () => { deleteSave(c.id); loadScreen(); }, 'Delete'); };
    row.appendChild(del);
    row.onclick = () => { sfx('ui'); G.game.loadChar(c); };
    list.appendChild(row);
  }
  s.appendChild(list);
  const back = el('button', 'btn', 'Back');
  back.style.marginTop = '12px';
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
  <p class="dim" style="text-align:center;max-width:560px">The abyss stirs still. Endless Torment depths beyond 100 now await the truly mad.</p>`;
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
    <div><kbd>1</kbd>–<kbd>8</kbd> cast skills at the cursor</div>
    <div><kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> <kbd>V</kbd> potions</div>
    <div><kbd>I</kbd> inventory · <kbd>K</kbd> skill tree · <kbd>B</kbd> skill book</div>
    <div><kbd>Tab</kbd>/<kbd>M</kbd> map · <kbd>Esc</kbd> menu · wheel zoom</div>
    <div><b style="color:#ffe2a0">Mobile</b></div>
    <div>Left thumb: virtual joystick</div>
    <div>Tap the world: move / attack / talk</div>
    <div>Right cluster: skills (hold to repeat, long-press to change)</div>
    <div>Tap potions on the bar to drink</div>
    <div><b style="color:#ffe2a0">Goal</b></div>
    <div>Enter the portal in town. Find the exit of each depth — it is sealed until its guardian falls.</div>
    <div>Die and you restart at Depth 1, keeping everything else.</div>
    <div>Reach Depth 100 and slay Demon Lord Velscour.</div>
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
