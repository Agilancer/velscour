// The town storage chest: 300 slots shared by nothing but this hero. Right-click moves items between it and the bag.
import { G } from '../state.js';
import { el, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { changed, renderInventory } from './inventory.js';
import { addToBag } from '../game/player.js';
import { itemName } from '../data/items.js';
import { stashRows, nextStashRowCost, canBuyStashRow, buyStashRow, STASH_MAX_ROWS } from '../data/bag.js';

export const STASH_SIZE = 300;

/** Put an item in the chest (gems stack). */
export function addToStash(c, item) {
  if (!c.stash) c.stash = Array(STASH_SIZE).fill(null);
  if (item.type === 'gem') {
    const same = c.stash.find((b) => b && b.type === 'gem' && b.gem === item.gem && b.tier === item.tier);
    if (same) { same.count = (same.count || 1) + (item.count || 1); return true; }
  }
  const i = c.stash.findIndex((b) => !b);
  if (i < 0) return false;
  c.stash[i] = item;
  return true;
}

const TYPE_ORDER = ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring'];
/** Chest order: by type (weapons, off-hands, armor head to feet, rings, then gems by kind), or by rarity first. */
export function sortStash(c, by = 'type') {
  const kind = (it) => (it.type === 'gear' ? TYPE_ORDER.indexOf(it.slot) + 1 || 9 : it.type === 'gem' ? 10 : 11);
  const items = c.stash.filter(Boolean).sort((a, b) => {
    const k = kind(a) - kind(b), r = (b.rarity || 0) - (a.rarity || 0);
    return (by === 'rarity' ? r || k : k || r) || (a.gem || '').localeCompare(b.gem || '') || (b.tier || 0) - (a.tier || 0) || (b.ilvl || 0) - (a.ilvl || 0);
  });
  c.stash = c.stash.map((_, i) => items[i] || null);
}

export const Stash = {
  active: false,
  filter: 'all',
  query: '',
  selected: null,
  lastScrollTop: 0,
  open() {
    UI.closeAll();
    this.active = true;
    this.lastScrollTop = 0;
    sfx('ui');
    UI.openPanel('stash', 'Storage Chest', (b) => this.render(b), { onClose: () => { this.active = false; UI.closePanel('inventory'); }, cls: 'stash-panel' });
    UI.openPanel('inventory', 'Your Inventory', renderInventory);
  },
  /** Bag/GemBag/JewelBox slot -> chest. */
  store(idx, where = 'bag') {
    const c = G.char;
    let container = c.bag;
    if (where === 'gemBag' && c.gemBag) container = c.gemBag;
    else if (where === 'jewelbox' && c.jewelBox) container = c.jewelBox;
    const it = container[idx];
    if (!it) return false;
    if (!addToStash(c, it)) { UI.log('The storage chest is full.', '#ff8080'); sfx('error'); return false; }
    delete it.autoStash; // the player stored it: auto-play leaves it be (game/autoplay.js unstash)
    container[idx] = null;
    sfx('pickup'); UI.selected = null; changed();
    return true;
  },
  /** Chest slot -> bag. */
  take(idx) {
    const c = G.char, it = c.stash[idx];
    if (!it) return false;
    if (!addToBag(c, it)) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    c.stash[idx] = null;
    if (this.selected === idx) this.selected = null;
    sfx('pickup'); changed();
    return true;
  },
  render(body) {
    const c = G.char;
    if (!c.stash) c.stash = Array(STASH_SIZE).fill(null);
    const prevGridScroll = body.querySelector('.stash-grid')?.scrollTop ?? this.lastScrollTop ?? 0;
    const prevBodyScroll = body.scrollTop;
    body.innerHTML = '';
    const used = c.stash.filter(Boolean).length;
    const rows = stashRows(c);
    const head = el('div', 'row storage-toolbar', `<strong>${fmtInt(used)} / ${c.stash.length}</strong><span class="dim">stored (${rows} rows)</span>`);
    for (const [by, label] of [['type', 'Sort by type'], ['rarity', 'Sort by rarity']]) {
      const b = el('button', 'btn small', label);
      b.onclick = () => { sortStash(c, by); this.selected = null; sfx('ui'); UI.selected = null; changed(); };
      head.appendChild(b);
    }
    if (rows < STASH_MAX_ROWS) {
      const cost = nextStashRowCost(c);
      const can = canBuyStashRow(c);
      const buyRowBtn = el('button', 'btn small' + (can ? '' : ' poor'), `+ Row (${cost} Marks)`);
      buyRowBtn.title = `Add 1 row (10 slots) to Storage Chest for ${cost} Infernal Marks`;
      buyRowBtn.onclick = () => {
        sfx('ui');
        if (!canBuyStashRow(c)) {
          UI.log(`You need ${cost} free Infernal Marks to expand the storage chest.`, '#ff8080');
          return;
        }
        UI.dialog({
          title: `Expand Storage Chest (${rows + 1} of ${STASH_MAX_ROWS})`,
          html: `<p>Add 10 storage slots (row ${rows + 1}) to your Storage Chest for <b style="color:#ffd860">${cost} Infernal Marks</b>?</p>`,
          buttons: [
            { label: 'Cancel' },
            { label: `Buy for ${cost} Marks`, cls: 'red', fn: () => {
              if (buyStashRow(c)) {
                changed();
                this.render(body);
              }
            }},
          ],
        });
      };
      head.appendChild(buyRowBtn);
    }
    body.appendChild(head);
    const tools = el('div', 'storage-filters');
    const kind = el('select', 'storage-select', '<option value="all">All items</option><option value="gear">Gear</option><option value="gem">Gems</option>');
    kind.value = this.filter;
    const search = el('input', 'storage-search');
    search.type = 'search'; search.placeholder = 'Search stored items'; search.value = this.query;
    tools.append(kind, search);
    body.appendChild(tools);
    const transfer = el('div', 'storage-dropzone', 'Drop a backpack item here to store it · Right-click a stored item to take it');
    droppable(
      transfer,
      (data) => {
        if (data.type === 'item') return this.store(data.idx, data.where);
        if (data.type === 'jewelbox') return this.store(data.idx, 'jewelbox');
        return false;
      },
      (data) => data.type === 'item' || data.type === 'jewelbox'
    );
    body.appendChild(transfer);
    const grid = el('div', 'bag stash-grid');
    grid.addEventListener('scroll', () => { this.lastScrollTop = grid.scrollTop; }, { passive: true });
    c.stash.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (this.selected === i) d.classList.add('sel');
      if (it) d.appendChild(itemCell(it));
      d.dataset.kind = it?.type || 'empty';
      d.dataset.name = it ? itemName(it).toLowerCase() : '';
      draggable(d, { key: 'stash:' + i, data: () => (c.stash[i] ? { type: 'stash', idx: i } : null), icon: () => d.querySelector('img') && d.querySelector('img').src, onClick: () => { if (c.stash[i]) { this.selected = i; this.render(body); } }, onRight: () => this.take(i), onDouble: () => this.take(i) });
      droppable(
        d,
        (data) => {
          if (data.type === 'item') return this.store(data.idx, data.where);
          if (data.type === 'jewelbox') return this.store(data.idx, 'jewelbox');
          return false;
        },
        (data) => data.type === 'item' || data.type === 'jewelbox'
      );
      if (it) UI.tip(d, () => itemTooltip(c.stash[i], { hint: 'Right-click to take' }));
      grid.appendChild(d);
    });
    body.appendChild(grid);
    const selected = c.stash[this.selected];
    let detail;
    if (selected) {
      detail = el('div', 'storage-detail', itemTooltip(selected));
      const take = el('button', 'btn small', 'Take to backpack');
      take.onclick = () => this.take(this.selected);
      detail.appendChild(take);
      body.appendChild(detail);
    }
    const applyFilter = () => {
      const filtered = this.filter !== 'all' || !!this.query;
      for (const cell of grid.children) {
        const match = cell.dataset.kind !== 'empty' && (this.filter === 'all' || cell.dataset.kind === this.filter) && cell.dataset.name.includes(this.query);
        cell.hidden = filtered && !match;
      }
      grid.classList.toggle('filtered', filtered);
      if (detail) detail.hidden = filtered && ((this.filter !== 'all' && selected.type !== this.filter) || !itemName(selected).toLowerCase().includes(this.query));
    };
    kind.onchange = () => { this.filter = kind.value; applyFilter(); };
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
};
