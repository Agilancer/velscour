// The town storage chest: 300 slots shared by nothing but this hero. Right-click moves items between it and the bag.
import { G } from '../state.js';
import { el, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { changed, renderInventory } from './inventory.js';
import { addToBag } from '../game/player.js';

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

export const Stash = {
  active: false,
  open() {
    UI.closeAll();
    this.active = true;
    sfx('ui');
    UI.openPanel('stash', 'Storage Chest', (b) => this.render(b), { onClose: () => { this.active = false; UI.closePanel('inventory'); }, cls: 'stash-panel' });
    UI.openPanel('inventory', 'Your Inventory', renderInventory);
  },
  /** Bag slot -> chest. */
  store(idx) {
    const c = G.char, it = c.bag[idx];
    if (!it) return false;
    if (!addToStash(c, it)) { UI.log('The storage chest is full.', '#ff8080'); sfx('error'); return false; }
    c.bag[idx] = null;
    sfx('pickup'); UI.selected = null; changed();
    return true;
  },
  /** Chest slot -> bag. */
  take(idx) {
    const c = G.char, it = c.stash[idx];
    if (!it) return false;
    if (!addToBag(c, it)) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    c.stash[idx] = null;
    sfx('pickup'); changed();
    return true;
  },
  render(body) {
    const c = G.char;
    if (!c.stash) c.stash = Array(STASH_SIZE).fill(null);
    body.innerHTML = '';
    const used = c.stash.filter(Boolean).length;
    body.appendChild(el('div', 'row', `<span class="dim" style="font-size:12px">${fmtInt(used)} / ${STASH_SIZE} slots used · Right-click to move items between the chest and your bag</span>`));
    const grid = el('div', 'bag stash-grid');
    c.stash.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (it) d.appendChild(itemCell(it));
      draggable(d, { key: 'stash:' + i, data: () => (c.stash[i] ? { type: 'stash', idx: i } : null), icon: () => d.querySelector('img') && d.querySelector('img').src, onRight: () => this.take(i), onDouble: () => this.take(i) });
      droppable(d, (data) => (data.type === 'item' && data.where === 'bag' ? this.store(data.idx) : false), (data) => data.type === 'item' && data.where === 'bag');
      if (it) UI.tip(d, () => itemTooltip(c.stash[i], { hint: 'Right-click to take' }));
      grid.appendChild(d);
    });
    body.appendChild(grid);
  },
};
