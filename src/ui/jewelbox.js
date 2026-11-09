// The Jewel Box: 300-slot dedicated vault in town strictly for gems and runes (Sigil stones).
import { G } from '../state.js';
import { el, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { changed, renderInventory } from './inventory.js';
import { addToBag } from '../game/player.js';
import { itemName, GEM_TIERS } from '../data/items.js';
import { jewelBoxRows, nextJewelBoxRowCost, canBuyJewelBoxRow, buyJewelBoxRow, JEWEL_BOX_MAX_ROWS } from '../data/bag.js';

export const JEWEL_BOX_SIZE = 300;

/** Put a gem or sigil into the Jewel Box (identical gems stack). Returns false if not a gem or if full. */
export function addToJewelBox(c, item) {
  if (!item || item.type !== 'gem') return false;
  if (!c.jewelBox) c.jewelBox = Array(JEWEL_BOX_SIZE).fill(null);
  const same = c.jewelBox.find((b) => b && b.type === 'gem' && b.gem === item.gem && b.tier === item.tier);
  if (same) {
    same.count = (same.count || 1) + (item.count || 1);
    return true;
  }
  const i = c.jewelBox.findIndex((b) => !b);
  if (i < 0) return false;
  c.jewelBox[i] = item;
  return true;
}

/** Sort the Jewel Box: by kind (Sigils -> Prisms -> Gems -> Tier -> Count) or by grade (Tier -> Kind). */
export function sortJewelBox(c, by = 'kind') {
  if (!c) return;
  if (!Array.isArray(c.jewelBox)) c.jewelBox = Array(JEWEL_BOX_SIZE).fill(null);
  const gemTypeOrder = (it) => {
    if (!it) return 99;
    if (it.gem === 'sig') return 1;
    if (it.gem === 'prism') return 2;
    return 3;
  };

  const items = (c.jewelBox || []).filter(Boolean).sort((a, b) => {
    if (by === 'grade') {
      const td = (b.tier || 0) - (a.tier || 0);
      if (td !== 0) return td;
      const kd = gemTypeOrder(a) - gemTypeOrder(b);
      if (kd !== 0) return kd;
      return (a.gem || '').localeCompare(b.gem || '') || (b.count || 1) - (a.count || 1);
    }
    // Default: by kind
    const kd = gemTypeOrder(a) - gemTypeOrder(b);
    if (kd !== 0) return kd;
    const kindCmp = (a.gem || '').localeCompare(b.gem || '');
    if (kindCmp !== 0) return kindCmp;
    return (b.tier || 0) - (a.tier || 0) || (b.count || 1) - (a.count || 1);
  });

  c.jewelBox = c.jewelBox.map((_, i) => items[i] || null);
}

export const JewelBox = {
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
    UI.openPanel('jewelbox', 'Jewel Box', (b) => this.render(b), {
      onClose: () => {
        this.active = false;
        UI.closePanel('inventory');
      },
      cls: 'stash-panel jewelbox-panel',
    });
    UI.openPanel('inventory', 'Your Inventory', renderInventory);
  },

  /** Store an item from gemBag, bag, or stash into Jewel Box. */
  store(idx, where = 'gemBag') {
    const c = G.char;
    let container = c.gemBag;
    if (where === 'bag') container = c.bag;
    else if (where === 'stash') container = c.stash;
    else if (where === 'gemBag') container = c.gemBag;

    if (!container) return false;
    const it = container[idx];
    if (!it) return false;

    if (it.type !== 'gem') {
      UI.log('Only gems and runes can be stored in the Jewel Box.', '#ff8080');
      sfx('error');
      return false;
    }

    if (!addToJewelBox(c, it)) {
      UI.log('The Jewel Box is full.', '#ff8080');
      sfx('error');
      return false;
    }

    delete it.autoStash;
    container[idx] = null;
    sfx('pickup');
    UI.selected = null;
    changed();
    return true;
  },

  /** Take an item from Jewel Box -> player Gem Bag. */
  take(idx) {
    const c = G.char, it = c.jewelBox ? c.jewelBox[idx] : null;
    if (!it) return false;
    if (!addToBag(c, it)) {
      UI.log('Gem Bag full.', '#ff8080');
      sfx('error');
      return false;
    }
    c.jewelBox[idx] = null;
    if (this.selected === idx) this.selected = null;
    sfx('pickup');
    changed();
    return true;
  },

  render(body) {
    const c = G.char;
    if (!c) return;
    if (!Array.isArray(c.jewelBox)) c.jewelBox = Array(JEWEL_BOX_SIZE).fill(null);
    const self = this || JewelBox;

    const prevGridScroll = body.querySelector('.stash-grid')?.scrollTop ?? self.lastScrollTop ?? 0;
    const prevBodyScroll = body.scrollTop;
    body.innerHTML = '';

    const used = (c.jewelBox || []).filter(Boolean).length;
    const rows = jewelBoxRows(c);
    const head = el('div', 'row storage-toolbar jewelbox-toolbar', `<strong>${fmtInt(used)} / ${c.jewelBox.length}</strong><span class="dim">gems stored (${rows} rows)</span>`);

    for (const [by, label] of [['kind', 'Sort by kind'], ['grade', 'Sort by grade']]) {
      const b = el('button', 'btn small', label);
      b.onclick = () => {
        sortJewelBox(c, by);
        self.selected = null;
        sfx('ui');
        UI.selected = null;
        changed();
      };
      head.appendChild(b);
    }
    if (rows < JEWEL_BOX_MAX_ROWS) {
      const cost = nextJewelBoxRowCost(c);
      const can = canBuyJewelBoxRow(c);
      const buyRowBtn = el('button', 'btn small' + (can ? '' : ' poor'), `+ Row (${cost} Marks)`);
      buyRowBtn.title = `Add 1 row (10 slots) to Jewel Box for ${cost} Infernal Marks`;
      buyRowBtn.onclick = () => {
        sfx('ui');
        if (!canBuyJewelBoxRow(c)) {
          UI.log(`You need ${cost} free Infernal Marks to expand the Jewel Box.`, '#ff8080');
          return;
        }
        UI.dialog({
          title: `Expand Jewel Box (${rows + 1} of ${JEWEL_BOX_MAX_ROWS})`,
          html: `<p>Add 10 gem slots (row ${rows + 1}) to your Jewel Box for <b style="color:#ffd860">${cost} Infernal Marks</b>?</p>`,
          buttons: [
            { label: 'Cancel' },
            { label: `Buy for ${cost} Marks`, cls: 'red', fn: () => {
              if (buyJewelBoxRow(c)) {
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
    const kind = el('select', 'storage-select', '<option value="all">All gems & runes</option><option value="sigil">Sigil Stones</option><option value="prism">Prisms</option><option value="standard">Standard Gems</option>');
    kind.value = self.filter || 'all';
    const search = el('input', 'storage-search');
    search.type = 'search';
    search.placeholder = 'Search stored gems & runes';
    search.value = self.query || '';
    tools.append(kind, search);
    body.appendChild(tools);

    const transfer = el('div', 'storage-dropzone jewelbox-dropzone', 'Drop a gem or rune here to store it · Right-click a stored gem to take it');
    droppable(
      transfer,
      (data) => {
        if (data.type === 'item') return self.store(data.idx, data.where);
        if (data.type === 'stash') return self.store(data.idx, 'stash');
        return false;
      },
      (data) => data.type === 'item' || data.type === 'stash'
    );
    body.appendChild(transfer);

    const grid = el('div', 'bag stash-grid jewelbox-grid');
    grid.addEventListener('scroll', () => { self.lastScrollTop = grid.scrollTop; }, { passive: true });

    c.jewelBox.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (self.selected === i) d.classList.add('sel');
      if (it) d.appendChild(itemCell(it));
      d.dataset.kind = it?.gem === 'sig' ? 'sigil' : it?.gem === 'prism' ? 'prism' : it ? 'standard' : 'empty';
      d.dataset.name = it ? itemName(it).toLowerCase() : '';

      draggable(d, {
        key: 'jewelbox:' + i,
        data: () => (c.jewelBox[i] ? { type: 'jewelbox', idx: i } : null),
        icon: () => d.querySelector('img') && d.querySelector('img').src,
        onClick: () => {
          if (c.jewelBox[i]) {
            self.selected = i;
            self.render(body);
          }
        },
        onRight: () => self.take(i),
        onDouble: () => self.take(i),
      });

      droppable(
        d,
        (data) => {
          if (data.type === 'item') return self.store(data.idx, data.where);
          if (data.type === 'stash') return self.store(data.idx, 'stash');
          return false;
        },
        (data) => data.type === 'item' || data.type === 'stash'
      );

      if (it) UI.tip(d, () => itemTooltip(c.jewelBox[i], { hint: 'Right-click to take' }));
      grid.appendChild(d);
    });
    body.appendChild(grid);

    const selected = c.jewelBox[self.selected];
    let detail;
    if (selected) {
      detail = el('div', 'storage-detail', itemTooltip(selected));
      const take = el('button', 'btn small', 'Take to Gem Bag');
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
      if (detail && selected) {
        detail.hidden = filtered && (
          (filterMode !== 'all' && (
            (filterMode === 'sigil' && selected.gem !== 'sig') ||
            (filterMode === 'prism' && selected.gem !== 'prism') ||
            (filterMode === 'standard' && (selected.gem === 'sig' || selected.gem === 'prism'))
          )) ||
          !itemName(selected).toLowerCase().includes(queryStr)
        );
      }
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

