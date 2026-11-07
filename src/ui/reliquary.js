// The Reliquary panel (town, beside the storage chest): six vault tabs shared by every hero, and the Codex of every
// Heirloom, Covenant piece, Glyphword and Sigil ever found (game/reliquary.js holds the data).
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { changed, renderInventory } from './inventory.js';
import { addToBag } from '../game/player.js';
import { reliquary, saveReliquary, openTabs, codexProgress, codexEntries, MILESTONES, VAULT_TABS, codexTitle, noteFind } from '../game/reliquary.js';
import { RELIC_COLORS, SIGILS, SLOT_NAMES, makeGem, itemName } from '../data/items.js';
import { COVENANT_BY_ID, makeHeirloom, makeCovenant, GLYPHWORDS } from '../data/relics.js';
import { itemIconURL } from './icons.js';
import { reliquaryTabRows, nextReliquaryRowCost, canBuyReliquaryRow, buyReliquaryRow, RELIQUARY_MAX_ROWS } from '../data/bag.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const KIND = { h: ['Heirlooms', RELIC_COLORS.heir], c: ['Covenant pieces', RELIC_COLORS.cov], g: ['Glyphwords', RELIC_COLORS.glyph], s: ['Sigil Stones', '#ffd88a'] };
const UNLOCK = ['', '', 'Opens at 25% of the Codex', 'Opens when a Town Commission line is finished', 'Opens when three Town Commission lines are finished', 'Opens at 80% of the Codex'];
// Codex pictures: one sample item per entry (built once; the real finds are wherever the heroes keep them)
const icons = new Map();
function entryIcon(e) {
  let u = icons.get(e.key);
  if (u) return u;
  const it = e.kind === 'h' ? makeHeirloom(100, { id: e.key.slice(2) }) : e.kind === 'c' ? makeCovenant(100, { pieceId: e.key.slice(2) }) : e.kind === 's' ? makeGem('sig', e.rank) : null;
  u = it ? itemIconURL(it) : null;
  icons.set(e.key, u);
  return u;
}

export const Reliquary = {
  active: false,
  tab: 0,
  selected: null,
  query: '',
  lastScrollTop: 0,
  open() {
    UI.closeAll();
    this.active = true;
    this.lastScrollTop = 0;
    sfx('ui');
    UI.openPanel('reliquary', 'The Reliquary', (b) => this.render(b), { onClose: () => { this.active = false; UI.closePanel('inventory'); }, cls: 'reliquary-panel' });
    UI.openPanel('inventory', 'Your Inventory', renderInventory);
  },
  refresh() {
    if (!this.active) return;
    const p = UI.panels?.get('reliquary');
    if (p) this.render(p.body);
  },
  /** Bag/GemBag slot -> the open vault tab. */
  store(idx, where = 'bag') {
    const c = G.char, container = where === 'gemBag' && c.gemBag ? c.gemBag : c.bag;
    const it = container[idx], r = reliquary();
    if (!it || this.tab >= openTabs()) return false;
    if (it.locked) { UI.log('Unlock it first (its panel in the inventory).', '#ffd860'); sfx('error'); return false; }
    const t = r.tabs[this.tab];
    if (it.type === 'gem') {
      const same = t.find((b) => b && b.type === 'gem' && b.gem === it.gem && b.tier === it.tier);
      if (same) {
        same.count = (same.count || 1) + (it.count || 1);
        container[idx] = null;
        saveReliquary(); sfx('pickup'); UI.selected = null; changed(); this.refresh(); return true;
      }
    }
    const i = t.findIndex((b) => !b);
    if (i < 0) { UI.log(`Vault ${ROMAN[this.tab]} is full.`, '#ff8080'); sfx('error'); return false; }
    delete it.autoStash;
    t[i] = it; container[idx] = null;
    saveReliquary(); sfx('pickup'); UI.selected = null; changed(); this.refresh();
    return true;
  },
  /** Vault slot -> bag. */
  take(idx, tab = this.tab) {
    const c = G.char, r = reliquary(), it = r.tabs[tab][idx];
    if (!it) return false;
    if (!addToBag(c, it)) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    r.tabs[tab][idx] = null;
    if (this.tab === tab && this.selected === idx) this.selected = null;
    saveReliquary(); sfx('pickup'); changed(); this.refresh();
    return true;
  },
  render(body) {
    const r = reliquary(), n = openTabs(), prog = codexProgress();
    const prevGridScroll = body.querySelector('.rel-grid')?.scrollTop ?? this.lastScrollTop ?? 0;
    const prevBodyScroll = body.scrollTop;
    body.innerHTML = '';
    const tabs = el('div', 'rel-tabs');
    for (let i = 0; i <= VAULT_TABS; i++) {
      const codex = i === VAULT_TABS, locked = !codex && i >= n;
      const b = el('button', 'tab' + (this.tab === i ? ' active' : '') + (locked ? ' locked' : ''), codex ? 'Codex' : `${locked ? '🔒 ' : ''}Vault ${ROMAN[i]}`);
      b.title = locked ? UNLOCK[i] : '';
      b.onclick = () => { this.tab = i; this.selected = null; this.query = ''; this.lastScrollTop = 0; sfx('ui'); UI.selected = null; this.render(body); };
      tabs.appendChild(b);
    }
    body.appendChild(tabs);
    if (this.tab === VAULT_TABS) {
      this.renderCodex(body, prog);
      if (prevBodyScroll > 0) {
        body.scrollTop = prevBodyScroll;
        requestAnimationFrame(() => { if (body && prevBodyScroll > 0) body.scrollTop = prevBodyScroll; });
      }
      return;
    }
    if (this.tab >= n) { body.appendChild(el('div', 'dim rel-locked', `Vault ${ROMAN[this.tab]} is sealed. ${UNLOCK[this.tab]}.`)); return; }
    const t = r.tabs[this.tab];
    const rows = reliquaryTabRows(this.tab);
    const noteRow = el('div', 'row rel-header-row', `<span class="dim rel-note">Shared by all your heroes · Vault ${ROMAN[this.tab]}: <strong>${t.filter(Boolean).length} / ${t.length}</strong> (${rows} rows)</span>`);
    if (rows < RELIQUARY_MAX_ROWS) {
      const cost = nextReliquaryRowCost(this.tab);
      const can = canBuyReliquaryRow(this.tab);
      const buyRowBtn = el('button', 'btn small' + (can ? '' : ' poor'), `+ Row (${cost} Marks)`);
      buyRowBtn.title = `Add 1 row (12 slots) to Vault ${ROMAN[this.tab]} for ${cost} Infernal Marks`;
      buyRowBtn.onclick = () => {
        sfx('ui');
        if (!canBuyReliquaryRow(this.tab)) {
          UI.log(`You need ${cost} free Infernal Marks to expand this vault tab.`, '#ff8080');
          return;
        }
        UI.dialog({
          title: `Expand Vault ${ROMAN[this.tab]} (${rows + 1} of ${RELIQUARY_MAX_ROWS})`,
          html: `<p>Add 12 vault slots (row ${rows + 1}) to Vault Tab ${ROMAN[this.tab]} for <b style="color:#ffd860">${cost} Infernal Marks</b>?</p>`,
          buttons: [
            { label: 'Cancel' },
            { label: `Buy for ${cost} Marks`, cls: 'red', fn: () => {
              if (buyReliquaryRow(this.tab)) {
                this.render(body);
              }
            }},
          ],
        });
      };
      noteRow.appendChild(buyRowBtn);
    }
    body.appendChild(noteRow);
    const search = el('input', 'storage-search rel-search');
    search.type = 'search'; search.placeholder = 'Search this vault'; search.value = this.query;
    body.appendChild(search);
    const transfer = el('div', 'storage-dropzone', 'Drop a backpack item here to store it · Tap a stored item to inspect it');
    droppable(transfer, (data) => data.type === 'item' && (data.where === 'bag' || data.where === 'gemBag') ? this.store(data.idx, data.where) : false, (data) => data.type === 'item' && (data.where === 'bag' || data.where === 'gemBag'));
    body.appendChild(transfer);
    const grid = el('div', 'bag rel-grid');
    grid.addEventListener('scroll', () => { this.lastScrollTop = grid.scrollTop; }, { passive: true });
    t.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (this.selected === i) d.classList.add('sel');
      d.dataset.name = it ? itemName(it).toLowerCase() : '';
      if (it) d.appendChild(itemCell(it));
      draggable(d, { key: 'vault:' + i, data: () => (t[i] ? { type: 'vault', idx: i, tab: this.tab } : null), icon: () => d.querySelector('img') && d.querySelector('img').src, onClick: () => { if (t[i]) { this.selected = i; this.render(body); } }, onRight: () => this.take(i), onDouble: () => this.take(i) });
      droppable(d, (data) => (data.type === 'item' && (data.where === 'bag' || data.where === 'gemBag') ? this.store(data.idx, data.where) : false), (data) => data.type === 'item' && (data.where === 'bag' || data.where === 'gemBag'));
      if (it) UI.tip(d, () => itemTooltip(t[i], { hint: 'Right-click to take' }));
      grid.appendChild(d);
    });
    body.appendChild(grid);
    const selected = t[this.selected];
    let detail;
    if (selected) {
      detail = el('div', 'storage-detail', itemTooltip(selected));
      const take = el('button', 'btn small', 'Take to backpack');
      take.onclick = () => this.take(this.selected);
      detail.appendChild(take);
      body.appendChild(detail);
    }
    const applyFilter = () => {
      for (const cell of grid.children) cell.hidden = !!this.query && !cell.dataset.name.includes(this.query);
      grid.classList.toggle('filtered', !!this.query);
      if (detail) detail.hidden = !!this.query && !itemName(selected).toLowerCase().includes(this.query);
    };
    search.oninput = () => { this.query = search.value.trim().toLowerCase(); applyFilter(); };
    applyFilter();
    if (prevGridScroll > 0) {
      grid.scrollTop = prevGridScroll;
      requestAnimationFrame(() => { if (grid && prevGridScroll > 0) grid.scrollTop = prevGridScroll; });
    }
    if (prevBodyScroll > 0) {
      body.scrollTop = prevBodyScroll;
      requestAnimationFrame(() => { if (body && prevBodyScroll > 0) body.scrollTop = prevBodyScroll; });
    }
  },
  renderCodex(body, prog) {
    const r = reliquary();
    const title = codexTitle();
    body.appendChild(el('div', 'rel-note', `<b style="color:#ffe2a0">Codex ${prog.pct}%</b> <span class="dim">· ${prog.have} of ${prog.total} found by your heroes${title ? ` · <b style="color:#ffd700">${title}</b>` : ''}</span>`));
    const all = codexEntries();
    for (const k of ['h', 'c', 'g', 's']) {
      const [name, col] = KIND[k], list = all.filter((e) => e.kind === k);
      body.appendChild(el('div', 'rel-sec', `<b style="color:${col}">${name}</b> <span class="dim">${prog.by[k]} / ${list.length} discovered</span>`));
      const grid = el('div', 'rel-codex');
      for (const e of list) {
        const got = !!r.codex[e.key];
        const d = el('div', 'bslot codex-cell' + (got ? ' got' : ''));
        d.style.setProperty('--kc', col);
        const src = e.kind === 'g' ? null : entryIcon(e);
        if (src) { const img = new Image(); img.src = src; img.draggable = false; d.appendChild(img); }
        else d.appendChild(el('span', 'codex-glyph', escapeHtml(e.name.split(' ').map((w) => w[0]).join('').slice(0, 2))));
        UI.tip(d, () => codexTip(e, got));
        grid.appendChild(d);
      }
      body.appendChild(grid);
    }
    let m = '<div class="tt-sep"></div><div style="color:#ffe2a0;font-family:var(--font-head)">Collector\'s rewards (all heroes)</div><div class="dim rel-miles">';
    m += MILESTONES.map((x) => `${prog.pct >= x.pct ? '✔' : '✗'} ${x.pct}%: ${escapeHtml(x.text)}`).join(' · ');
    body.appendChild(el('div', '', m + '</div>'));
  },
};

function codexTip(e, got) {
  const col = KIND[e.kind][1];
  let h = `<div class="tt-name" style="color:${got ? col : '#8a8070'}">${got ? escapeHtml(e.name) : 'Undiscovered'}</div>`;
  if (e.kind === 'h') h += `<div class="tt-base">Heirloom · ${SLOT_NAMES[e.slot]}</div>`;
  if (e.kind === 'c') h += `<div class="tt-base">Covenant · ${SLOT_NAMES[e.slot]} · ${escapeHtml(COVENANT_BY_ID[e.set].name)}</div>`;
  if (e.kind === 's') h += `<div class="tt-base">Sigil Stone · Rank ${e.rank + 1} · from Depth ${e.rank * 24 || 1}</div>`;
  if (e.kind === 'g') {
    h += `<div class="tt-base">Glyphword · ${e.slots.map((s) => SLOT_NAMES[s]).join(' or ')} · ${e.sig.length} sockets</div>`;
    h += `<div style="color:${col}">'${e.sig.map((r) => SIGILS[r].name).join(' · ')}'</div>`;
    if (!got) h += '<div class="dim">Not yet written by any of your heroes. Set these Sigils, in this order, in a plain (white) item with exactly that many sockets.</div>';
  }
  if (!got && e.kind !== 'g') h += '<div class="dim">Not yet found by any of your heroes.</div>';
  return h;
}

/** Inventory drop of a vault item onto the bag. */
export function takeFromVault(data) { return Reliquary.take(data.idx, data.tab); }
export { GLYPHWORDS, noteFind };
