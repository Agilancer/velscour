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
  if (!c) return;
  if (!Array.isArray(c.stash)) c.stash = Array(STASH_SIZE).fill(null);
  const kind = (it) => (it.type === 'gear' ? TYPE_ORDER.indexOf(it.slot) + 1 || 9 : it.type === 'gem' ? 10 : 11);
  const items = (c.stash || []).filter(Boolean).sort((a, b) => {
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
    UI.openPanel('inventory', 'Backpack', renderInventory, { cls: 'inventory-panel' });
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
  /** Move all unlocked items from backpack (and optionally gemBag) into the storage chest. */
  stashAll(where = 'auto') {
    const c = G.char;
    if (!c) return;
    let moved = 0;
    let full = false;

    const moveFrom = (arr) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it || it.locked) continue;
        if (!addToStash(c, it)) {
          full = true;
          break;
        }
        delete it.autoStash;
        arr[i] = null;
        moved++;
      }
    };

    if (where === 'gemBag') {
      moveFrom(c.gemBag);
    } else if (where === 'bag') {
      moveFrom(c.bag);
    } else {
      // 'auto' or 'all': stash backpack items; if backpack had none, check gemBag too
      moveFrom(c.bag);
      if (!full && moved === 0 && Array.isArray(c.gemBag)) {
        moveFrom(c.gemBag);
      }
    }

    if (moved > 0) {
      sfx('pickup');
      this.selected = null;
      UI.selected = null;
      changed();
      if (full) {
        UI.log(`Stored ${moved} item${moved > 1 ? 's' : ''}. Storage chest is full.`, '#ff8080');
      } else {
        UI.log(`Stored ${moved} item${moved > 1 ? 's' : ''} in the storage chest.`, '#80ff80');
      }
    } else if (full) {
      UI.log('The storage chest is full.', '#ff8080');
      sfx('error');
    } else {
      const source = where === 'gemBag' ? c.gemBag : c.bag;
      const hasLocked = Array.isArray(source) && source.some((it) => it && it.locked);
      if (hasLocked) {
        UI.log('All items in inventory are locked.', '#ffd860');
      } else {
        UI.log('No items in inventory to store.');
      }
      sfx('ui');
    }
  },
  render(body) {
    const c = G.char;
    if (!c) return;
    if (!Array.isArray(c.stash)) c.stash = Array(STASH_SIZE).fill(null);
    const self = this || Stash;
    const prevGridScroll = body.querySelector('.stash-grid')?.scrollTop ?? self.lastScrollTop ?? 0;
    const prevBodyScroll = body.scrollTop;
    body.innerHTML = '';
    const used = (c.stash || []).filter(Boolean).length;
    const rows = stashRows(c);
    const head = el('div', 'row storage-toolbar', `<strong>${fmtInt(used)} / ${c.stash.length}</strong><span class="dim">stored (${rows} rows)</span>`);
    const stashAllBtn = el('button', 'btn small', 'Stash All');
    stashAllBtn.title = 'Stash all unlocked items from inventory into the storage chest';
    stashAllBtn.onclick = () => { sfx('ui'); self.stashAll(); };
    head.appendChild(stashAllBtn);
    for (const [by, label] of [['type', 'Sort by type'], ['rarity', 'Sort by rarity']]) {
      const b = el('button', 'btn small', label);
      b.onclick = () => { sortStash(c, by); self.selected = null; sfx('ui'); UI.selected = null; changed(); };
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
    kind.value = self.filter || 'all';
    const search = el('input', 'storage-search');
    search.type = 'search'; search.placeholder = 'Search stored items'; search.value = self.query || '';
    tools.append(kind, search);
    body.appendChild(tools);
    const transfer = el('div', 'storage-dropzone', 'Drop a backpack item here to store it · Right-click a stored item to take it');
    droppable(
      transfer,
      (data) => {
        if (data.type === 'item') return self.store(data.idx, data.where);
        if (data.type === 'jewelbox') return self.store(data.idx, 'jewelbox');
        return false;
      },
      (data) => data.type === 'item' || data.type === 'jewelbox'
    );
    body.appendChild(transfer);
    const grid = el('div', 'bag stash-grid');
    grid.addEventListener('scroll', () => { self.lastScrollTop = grid.scrollTop; }, { passive: true });
    c.stash.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (self.selected === i) d.classList.add('sel');
      if (it) d.appendChild(itemCell(it));
      d.dataset.kind = it?.type || 'empty';
      d.dataset.name = it ? itemName(it).toLowerCase() : '';
      draggable(d, { key: 'stash:' + i, data: () => (c.stash[i] ? { type: 'stash', idx: i } : null), icon: () => d.querySelector('img') && d.querySelector('img').src, onClick: () => { if (c.stash[i]) { self.selected = i; self.render(body); } }, onRight: () => self.take(i), onDouble: () => self.take(i) });
      droppable(
        d,
        (data) => {
          if (data.type === 'item') return self.store(data.idx, data.where);
          if (data.type === 'jewelbox') return self.store(data.idx, 'jewelbox');
          return false;
        },
        (data) => data.type === 'item' || data.type === 'jewelbox'
      );
      if (it) UI.tip(d, () => {
        const cur = c.stash[i];
        if (!cur) return '';
        const acts = [{ label: 'Take', fn: () => self.take(i) }];
        return { html: itemTooltip(cur, { hint: 'Right-click or double-tap to take', actions: acts }), actions: acts };
      });
      grid.appendChild(d);
    });
    body.appendChild(grid);
    const selected = c.stash[self.selected];
    let detail;
    if (selected) {
      detail = el('div', 'storage-detail', itemTooltip(selected));
      const take = el('button', 'btn small', 'Take to backpack');
      take.onclick = () => self.take(self.selected);
      detail.appendChild(take);
      body.appendChild(detail);
    }
    const applyFilter = () => {
      const filterMode = self.filter || 'all';
      const queryStr = self.query || '';
      const filtered = filterMode !== 'all' || !queryStr;
      for (const cell of grid.children) {
        const match = cell.dataset.kind !== 'empty' && (filterMode === 'all' || cell.dataset.kind === filterMode) && cell.dataset.name.includes(queryStr);
        cell.hidden = filtered && !match;
      }
      grid.classList.toggle('filtered', filtered);
      if (detail) detail.hidden = filtered && ((filterMode !== 'all' && selected.type !== filterMode) || !itemName(selected).toLowerCase().includes(queryStr));
    };
    kind.onchange = () => { self.filter = kind.value; applyFilter(); };
    search.oninput = () => { self.query = search.value.trim().toLowerCase(); applyFilter(); };
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
