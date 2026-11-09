// Split Inventory (Backpack) + Character & Stats sheet.
import { G } from '../state.js';
import { el, fmtInt, fmtDmg, escapeHtml } from '../core/util.js';
import { shownWeapon, heroDmgLevel, MAX_LEVEL } from '../data/depth.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import {
  SLOTS, SLOT_NAMES, VANITY_SLOTS, shownEquip, itemName, itemColor, GEMS, gemName,
  itemValue, fitsSlot, slotFor, unsocketCost, makeGem, canWearVanity, itemBaseDisplayName,
  itemReqStat, charEffectiveStat, canEquipItem, BASE_REQ_STAT, STAT_NAMES,
} from '../data/items.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { xpToNext, CRIT_OVER, addToBag } from '../game/player.js';
import { GroundItem } from '../game/loot.js';
import { classSprite } from '../core/assets.js';
import { heroPortrait, heroLook } from '../core/gearart.js';
import { heldPortraitArgs } from '../gfx/heldart.js';
import { tabRow, sheetButtons, useSheet, unloadTab } from './sheets.js';
import { openBannerCustomizer } from './bannercustomizer.js';
import { openSeal } from './sealed.js';
import { glyphOf } from '../data/relics.js';
import { noteFind, openTabs } from '../game/reliquary.js';
import { marksTotal, marksFree, capXp } from '../game/marks.js';
import { heresyRankOf } from '../game/heresies.js';
import { endgameUnlocked } from '../game/endgame.js';
import { sparkle } from '../gfx/vfx.js';
import { bagRows, nextRowCost, buyBagRow, BAG_MAX_ROWS, gemBagRows, nextGemBagRowCost, canBuyGemBagRow, buyGemBagRow, GEM_BAG_MAX_ROWS } from '../data/bag.js';
import { Stash } from './stash.js';
import { Reliquary } from './reliquary.js';

export const DOLL = { head: [2, 1], weapon: [1, 2], body: [2, 2], offhand: [3, 2], hands: [1, 3], legs: [2, 3], feet: [2, 4], ring1: [4, 1], ring2: [4, 2], ring3: [4, 3], ring4: [4, 4] };

export function getItem(ref) {
  const c = G.char;
  if (!ref || !c) return null;
  if (ref.where === 'bag') return c.bag[ref.idx];
  if (ref.where === 'gemBag') return c.gemBag ? c.gemBag[ref.idx] : null;
  if (ref.where === 'equip') return c.equip[ref.slot];
  if (ref.where === 'vanity') return (c.vanity || {})[ref.slot];
  if (ref.where === 'tab') return (c.tabs || [])[ref.idx];
  return null;
}

export function changed() {
  if (G.player) G.player.recompute();
  UI.refresh();
  if (G.game) G.game.autosave();
}

export function equipFromBag(idx, slot) {
  const c = G.char, it = c.bag[idx];
  if (!it || it.type !== 'gear') return false;
  if (it.unid) { UI.log('Identify it first (buy it from the Gambler).', '#ff8080'); return false; }
  if (it.sealed) { UI.log('Break the seal first.', '#ffdf8a'); return false; }
  if ((it.req || 1) > c.level) { UI.log(`Requires level ${it.req}.`, '#ff8080'); sfx('error'); return false; }
  const to = slot && fitsSlot(it, slot, c.classId) ? slot : slotFor(c.equip, it, c.classId);
  const reqStat = itemReqStat(it);
  if (reqStat) {
    const cur = charEffectiveStat(c, reqStat.stat, to);
    if (cur < reqStat.val) {
      UI.log(`Requires ${reqStat.val} ${STAT_NAMES[reqStat.stat]} (you have ${cur}).`, '#ff8080');
      sfx('error');
      return false;
    }
  }
  const old = c.equip[to];
  c.equip[to] = it;
  c.bag[idx] = old || null;
  sfx('pickup');
  UI.selected = { where: 'equip', slot: to };
  changed();
  return true;
}

export function unequip(slot, toIdx) {
  const c = G.char, it = c.equip[slot];
  if (!it) return false;
  let i = toIdx ?? c.bag.findIndex((b) => !b);
  if (i < 0 || (toIdx !== undefined && c.bag[toIdx])) {
    const other = toIdx !== undefined ? c.bag[toIdx] : null;
    if (fitsSlot(other, slot, c.classId) && canEquipItem(c, other, slot)) { c.bag[toIdx] = it; c.equip[slot] = other; changed(); return true; }
    if (i < 0) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    i = c.bag.findIndex((b) => !b);
  }
  c.bag[i] = it;
  c.equip[slot] = null;
  UI.selected = { where: 'bag', idx: i };
  changed();
  return true;
}

/** Wear a head, body, weapon, or off-hand piece from the bag as a look only: the hero shows it over his real gear, which keeps the stats. */
export function wearLook(idx, targetSlot = null) {
  const c = G.char, it = c.bag[idx];
  if (!it || it.type !== 'gear') { sfx('error'); return false; }
  let slot = targetSlot;
  if (!slot) {
    if (it.slot === 'head') slot = 'head';
    else if (it.slot === 'body') slot = 'body';
    else if (it.slot === 'weapon') {
      const mainCheck = canWearVanity(c, it, 'weapon');
      const offCheck = canWearVanity(c, it, 'offhand');
      if (mainCheck.ok) slot = 'weapon';
      else if (offCheck.ok) slot = 'offhand';
      else slot = 'weapon';
    } else if (it.slot === 'offhand') {
      slot = 'offhand';
    }
  }
  if (!slot || !VANITY_SLOTS.includes(slot)) { sfx('error'); return false; }
  const check = canWearVanity(c, it, slot);
  if (!check.ok) {
    UI.log(check.reason, '#ff8080');
    sfx('error');
    return false;
  }
  c.vanity = c.vanity || { head: null, body: null, weapon: null, offhand: null };
  const old = c.vanity[slot];
  c.vanity[slot] = it;
  c.bag[idx] = old || null;
  sfx('pickup');
  const slotName = slot === 'head' ? 'helmet' : slot === 'body' ? 'armor' : slot === 'weapon' ? 'weapon' : 'off-hand';
  UI.log(`<b style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</b> is now your ${slotName}'s look. Your worn gear keeps the stats.`, '#d8c8ff');
  UI.selected = { where: 'vanity', slot };
  changed();
  return true;
}

export function takeOffLook(slot, toIdx) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  if (!it) return false;
  const other = toIdx !== undefined ? c.bag[toIdx] : null;
  if (other) { // dropped on a bag item: swap when it is a valid look for this slot, else the first free cell
    if (other.type === 'gear' && canWearVanity(c, other, slot).ok) {
      c.bag[toIdx] = it;
      c.vanity[slot] = other;
      changed();
      return true;
    }
    toIdx = undefined;
  }
  const i = toIdx ?? c.bag.findIndex((b) => !b);
  if (i < 0) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
  c.bag[i] = it;
  c.vanity[slot] = null;
  UI.selected = { where: 'bag', idx: i };
  changed();
  return true;
}
export function socketGem(gemIdx, target, fromWhere = null) {
  const c = G.char;
  const container = fromWhere === 'gemBag' ? c.gemBag : fromWhere === 'bag' ? c.bag : (c.gemBag && c.gemBag[gemIdx] ? c.gemBag : c.bag);
  const gem = container ? container[gemIdx] : null;
  const it = getItem(target);
  if (!gem || gem.type !== 'gem' || !it || it.type !== 'gear') return false;
  if (it.sealed) { UI.log('Break the seal first: nothing goes into a sealed treasure.', '#ffdf8a'); sfx('error'); return false; }
  if (it.gems.length >= it.sockets) { UI.log(it.sockets ? 'No free sockets. Visit the Jeweler to add more.' : 'This item has no sockets. The Jeweler can add some.', '#ff8080'); sfx('error'); return false; }
  const was = glyphOf(it);
  it.gems.push({ gem: gem.gem, tier: gem.tier });
  if ((gem.count || 1) > 1) gem.count--; else container[gemIdx] = null;
  UI.log(`Socketed <span style="color:${itemColor(gem)}">${gemName(gem.gem, gem.tier)}</span> into ${escapeHtml(itemName(it))}.`);
  const gw = glyphOf(it);
  if (gw && !was) {
    UI.log(`The Sigils flare: <b style="color:${itemColor(it)}">${escapeHtml(gw.name)}</b> is written!`, '#f2e2b0');
    if (G.player) { sparkle(G.player.x, G.player.y, 40, '#f2e2b0', 18, 0.6); G.player.recompute(); }
    noteFind(it);
    sfx('levelup');
  } else sfx('gold');
  changed();
  return true;
}
export function dropFromBag(idx, where = 'bag') {
  const c = G.char, container = where === 'gemBag' && c.gemBag ? c.gemBag : c.bag;
  const it = container[idx], p = G.player;
  if (!it || !G.world) return false;
  if (it.locked) { UI.log('That item is locked. Unlock it first (its panel in the inventory).', '#ffd860'); sfx('error'); return false; }
  if (it.type === 'gear' && it.sealed === undefined) it.sealed = false; // already opened: it doesn't seal again on the floor
  container[idx] = null;
  const g = new GroundItem(p.x, p.y, it.type === 'potion' ? 'potion' : 'item', { item: it });
  g.t = -1.5; g.dropped = true; // not picked straight back up (auto-pickup leaves it alone: a click still takes it)
  G.world.addLoot(g);
  UI.selected = null;
  changed();
  return true;
}

export function isGemItem(it) {
  return !!(it && it.type === 'gem');
}

function handleDropOnBag(idx, data) {
  const c = G.char;
  if (data.type === 'shop') return G.ui.vendor && G.ui.vendor.buy(data, idx);
  if (data.type === 'stash') return G.ui.stash && G.ui.stash.take(data.idx);
  if (data.type === 'jewelbox') return G.ui.jewelBox && G.ui.jewelBox.take(data.idx);
  if (data.type === 'vault') return G.ui.reliquary && G.ui.reliquary.take(data.idx, data.tab);
  if (data.type !== 'item') return false;
  if (data.where === 'gemBag') {
    const a = c.gemBag ? c.gemBag[data.idx] : null;
    const b = c.bag[idx];
    if (a && a.type === 'gem' && b && b.type === 'gear') {
      return socketGem(data.idx, { where: 'bag', idx }, 'gemBag');
    }
    UI.log('Gems and runes belong in the Gem Bag.', '#ff8080');
    sfx('error');
    return false;
  }
  if (data.where === 'bag') {
    if (data.idx === idx) return false;
    const a = c.bag[data.idx], b = c.bag[idx];
    if (a && a.type === 'gem' && b && b.type === 'gear') return socketGem(data.idx, { where: 'bag', idx }, 'bag');
    if (a && b && a.type === 'gem' && b.type === 'gem' && a.gem === b.gem && a.tier === b.tier) { b.count = (b.count || 1) + (a.count || 1); c.bag[data.idx] = null; changed(); return true; }
    c.bag[data.idx] = b; c.bag[idx] = a;
    UI.selected = { where: 'bag', idx };
    changed();
    return true;
  }
  if (data.where === 'equip') return unequip(data.slot, idx);
  if (data.where === 'vanity') return takeOffLook(data.slot, idx);
  if (data.where === 'tab') return unloadTab(data.idx, idx);
  return false;
}

function handleDropOnGemBag(idx, data) {
  const c = G.char;
  if (!Array.isArray(c.gemBag)) c.gemBag = Array(30).fill(null);
  if (data.type === 'shop') return G.ui.vendor && G.ui.vendor.buy(data);
  if (data.type === 'stash') return G.ui.stash && G.ui.stash.take(data.idx);
  if (data.type === 'jewelbox') return G.ui.jewelBox && G.ui.jewelBox.take(data.idx);
  if (data.type === 'vault') return G.ui.reliquary && G.ui.reliquary.take(data.idx, data.tab);
  if (data.type !== 'item') return false;
  if (data.where === 'bag') {
    const a = c.bag[data.idx];
    if (!isGemItem(a)) {
      UI.log('Only gems and runes can be placed in the Gem Bag.', '#ff8080');
      sfx('error');
      return false;
    }
    const b = c.gemBag[idx];
    if (b && b.gem === a.gem && b.tier === a.tier) {
      b.count = (b.count || 1) + (a.count || 1);
      c.bag[data.idx] = null;
    } else {
      c.gemBag[idx] = a;
      c.bag[data.idx] = b;
    }
    UI.selected = { where: 'gemBag', idx };
    changed();
    return true;
  }
  if (data.where === 'gemBag') {
    if (data.idx === idx) return false;
    const a = c.gemBag[data.idx], b = c.gemBag[idx];
    if (a && b && a.type === 'gem' && b.type === 'gem' && a.gem === b.gem && a.tier === b.tier) {
      b.count = (b.count || 1) + (a.count || 1);
      c.gemBag[data.idx] = null;
    } else {
      c.gemBag[data.idx] = b;
      c.gemBag[idx] = a;
    }
    UI.selected = { where: 'gemBag', idx };
    changed();
    return true;
  }
  return false;
}

function handleDropOnEquip(slot, data) {
  const c = G.char;
  if (data.type !== 'item') return false;
  if (data.where === 'gemBag') {
    const it = c.gemBag ? c.gemBag[data.idx] : null;
    if (it && it.type === 'gem') return c.equip[slot] ? socketGem(data.idx, { where: 'equip', slot }, 'gemBag') : false;
    return false;
  }
  if (data.where !== 'bag') return false;
  const it = c.bag[data.idx];
  if (!it) return false;
  if (it.type === 'gem') return c.equip[slot] ? socketGem(data.idx, { where: 'equip', slot }, 'bag') : false;
  if (!fitsSlot(it, slot, c.classId)) { sfx('error'); return false; }
  return equipFromBag(data.idx, slot);
}

function selectSlotEl(d, ref) {
  UI.selected = ref;
  sfx('ui');
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.bag .bslot.sel, .paperdoll .eslot.sel, .vanity-grid .vslot.sel').forEach((s) => s.classList.remove('sel'));
  }
  if (ref && d) d.classList.add('sel');
  if (G.ui.vendor && G.ui.vendor.active && ['upgrade', 'enchant', 'socket'].includes(G.ui.vendor.active)) {
    UI.refresh();
  }
}

function bagSlot(idx) {
  const c = G.char, it = c.bag[idx];
  const d = el('div', 'bslot ' + rarityClass(it));
  const sel = UI.selected;
  if (sel && sel.where === 'bag' && sel.idx === idx) d.classList.add('sel');
  if (it) d.appendChild(itemCell(it));
  draggable(d, {
    key: 'bag:' + idx,
    data: () => (c.bag[idx] ? { type: 'item', where: 'bag', idx } : null),
    icon: () => d.querySelector('img') && d.querySelector('img').src,
    onClick: () => selectSlotEl(d, c.bag[idx] ? { where: 'bag', idx } : null),
    onDouble: () => quickUse(idx, 'bag'),
    onRight: () => quickUse(idx, 'bag'),
    onDropWorld: (data) => (data.where === 'bag' ? dropFromBag(data.idx, 'bag') : false),
  });
  droppable(d, (data) => handleDropOnBag(idx, data), (data) => data.type === 'item' || data.type === 'shop' || data.type === 'stash' || data.type === 'vault' || data.type === 'jewelbox');
  if (it) UI.tip(d, () => bagTip(idx), { key: 'bag:' + idx });
  return d;
}

function bagTip(idx) {
  const c = G.char, it = c.bag[idx];
  if (!it) return '';
  const acts = getBagActions(idx);
  return {
    html: itemTooltip(it, {
      compare: it.slot ? c.equip[slotFor(c.equip, it, c.classId)] : null,
      price: G.ui.vendor && G.ui.vendor.active ? Math.max(1, Math.floor(itemValue(it) / 4)) : 0,
      priceLabel: 'Sells for',
      hint: G.ui.vendor && G.ui.vendor.active
        ? 'Right-click or double-tap to sell'
        : G.ui.jewelBox && G.ui.jewelBox.active
          ? (it.type === 'gem' ? 'Right-click or double-tap to store in Jewel Box' : '')
          : G.ui.stash && G.ui.stash.active
            ? 'Right-click or double-tap to store'
            : G.ui.reliquary && G.ui.reliquary.active
              ? 'Right-click or double-tap to store in Reliquary'
              : it.sealed
                ? 'Right-click or double-tap to break the seal'
                : it.type === 'gear'
                  ? 'Right-click or double-tap to equip'
                  : it.type === 'gem'
                    ? 'Drag onto gear to socket'
                    : it.type === 'banner_kit'
                      ? 'Right-click or double-tap to customize banner'
                      : it.type === 'sheet'
                        ? (it.inked && c.classId === 'bard' ? 'Right-click to load into a Tab' : it.inked ? 'Right-click to read' : 'Right-click to write on it')
                        : '',
      actions: acts,
    }),
    actions: acts,
  };
}

function gemBagSlot(idx) {
  const c = G.char, it = c.gemBag ? c.gemBag[idx] : null;
  const d = el('div', 'bslot gem-slot ' + rarityClass(it));
  const sel = UI.selected;
  if (sel && sel.where === 'gemBag' && sel.idx === idx) d.classList.add('sel');
  if (it) d.appendChild(itemCell(it));
  draggable(d, {
    key: 'gemBag:' + idx,
    data: () => (c.gemBag && c.gemBag[idx] ? { type: 'item', where: 'gemBag', idx } : null),
    icon: () => d.querySelector('img') && d.querySelector('img').src,
    onClick: () => selectSlotEl(d, c.gemBag && c.gemBag[idx] ? { where: 'gemBag', idx } : null),
    onDouble: () => quickUse(idx, 'gemBag'),
    onRight: () => quickUse(idx, 'gemBag'),
    onDropWorld: (data) => (data.where === 'gemBag' ? dropFromBag(data.idx, 'gemBag') : false),
  });
  droppable(d, (data) => handleDropOnGemBag(idx, data), (data) => data.type === 'item' || data.type === 'shop' || data.type === 'stash' || data.type === 'vault' || data.type === 'jewelbox');
  if (it) UI.tip(d, () => gemBagTip(idx), { key: 'gemBag:' + idx });
  return d;
}

function gemBagTip(idx) {
  const c = G.char, it = c.gemBag && c.gemBag[idx];
  if (!it) return '';
  const acts = getGemBagActions(idx);
  return {
    html: itemTooltip(it, {
      price: G.ui.vendor && G.ui.vendor.active ? Math.max(1, Math.floor(itemValue(it) / 4)) : 0,
      priceLabel: 'Sells for',
      hint: G.ui.vendor && G.ui.vendor.active ? 'Right-click or double-tap to sell' : G.ui.jewelBox && G.ui.jewelBox.active ? 'Right-click or double-tap to store in Jewel Box' : G.ui.stash && G.ui.stash.active ? 'Right-click or double-tap to store' : 'Drag onto gear to socket',
      actions: acts,
    }),
    actions: acts,
  };
}

function equipTip(slot) {
  const c = G.char, it = c.equip[slot];
  if (!it) return '';
  const acts = getEquipActions(slot);
  return {
    html: itemTooltip(it, {
      hint: 'Right-click or double-tap to unequip',
      actions: acts,
    }),
    actions: acts,
  };
}

const LOOK_NAMES = {
  head: 'Helmet Look',
  body: 'Armor Look',
  weapon: 'Weapon Look',
  offhand: 'Off-hand Look',
};
const LOOK_LABELS = {
  head: 'Helm',
  body: 'Armor',
  weapon: 'Weapon',
  offhand: 'Off-hand',
};

function vanityTip(slot) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  if (!it) {
    let what = 'piece of gear';
    if (slot === 'head') what = 'helmet';
    else if (slot === 'body') what = 'body armor';
    else if (slot === 'weapon') {
      const eqW = c.equip?.weapon;
      what = eqW ? `${itemBaseDisplayName(eqW)} (${eqW.baseName || eqW.base})` : 'weapon (matches equipped weapon type)';
    } else if (slot === 'offhand') {
      const eqO = c.equip?.offhand;
      what = eqO ? `${itemBaseDisplayName(eqO)} (${eqO.baseName || eqO.base})` : 'off-hand item (matches equipped off-hand type)';
    }
    return `<b>${LOOK_NAMES[slot]}</b><div class="dim">Drop a ${what} here to look like it. Your worn gear keeps giving its stats.</div>`;
  }
  const acts = getVanityActions(slot);
  const check = canWearVanity(c, it, slot);
  let hint = 'A look only: no stats. Right-click or double-tap to take off';
  if (!check.ok) {
    hint = `<span style="color:#ff8080">⚠️ Inactive: ${escapeHtml(check.reason)}</span><br>Right-click or double-tap to take off`;
  }
  return {
    html: itemTooltip(it, {
      hint,
      actions: acts,
    }),
    actions: acts,
  };
}

function quickUse(idx, where = 'bag') {
  const c = G.char, container = where === 'gemBag' && c.gemBag ? c.gemBag : c.bag;
  const it = container[idx];
  if (!it) return;
  if (it.sealed && where === 'bag' && !(G.ui.stash && G.ui.stash.active) && !(G.ui.reliquary && G.ui.reliquary.active)) { openSeal(idx); return; }
  if (G.ui.vendor && G.ui.vendor.active) { G.ui.vendor.sell({ where, idx }); return; }
  if (G.ui.jewelBox && G.ui.jewelBox.active) {
    if (it.type === 'gem') { G.ui.jewelBox.store(idx, where); return; }
    UI.log('Only gems and runes can be stored in the Jewel Box.', '#ff8080');
    sfx('error');
    return;
  }
  if (G.ui.stash && G.ui.stash.active) { G.ui.stash.store(idx, where); return; }
  if (G.ui.reliquary && G.ui.reliquary.active) { G.ui.reliquary.store(idx, where); return; }
  if (it.type === 'gear') equipFromBag(idx);
  else if (it.type === 'sheet') useSheet(idx);
  else if (it.type === 'banner_kit') openBannerCustomizer({ bagIdx: idx });
  else if (it.type === 'gem') { UI.selected = { where, idx }; UI.log('Drag the gem onto a socketed item to insert it.'); UI.refresh(); }
}

function equipSlot(slot) {
  const c = G.char, it = c.equip[slot];
  const d = el('div', 'eslot ' + rarityClass(it));
  const [cx, cy] = DOLL[slot];
  d.style.gridColumn = cx; d.style.gridRow = cy;
  const sel = UI.selected;
  if (sel && sel.where === 'equip' && sel.slot === slot) d.classList.add('sel');
  if (it) d.appendChild(itemCell(it)); else d.appendChild(el('span', 'lbl', SLOT_NAMES[slot]));
  draggable(d, {
    key: 'equip:' + slot,
    data: () => (c.equip[slot] ? { type: 'item', where: 'equip', slot } : null),
    icon: () => d.querySelector('img') && d.querySelector('img').src,
    onClick: () => selectSlotEl(d, c.equip[slot] ? { where: 'equip', slot } : null),
    onDouble: () => unequip(slot),
    onRight: () => (G.ui.vendor && G.ui.vendor.active ? selectSlotEl(d, { where: 'equip', slot }) : unequip(slot)),
  });
  droppable(
    d,
    (data) => handleDropOnEquip(slot, data),
    (data) => data.type === 'item' && (
      (data.where === 'gemBag' && G.char.gemBag && G.char.gemBag[data.idx] && G.char.gemBag[data.idx].type === 'gem') ||
      (data.where === 'bag' && G.char.bag[data.idx] && (fitsSlot(G.char.bag[data.idx], slot, c.classId) || G.char.bag[data.idx].type === 'gem'))
    )
  );
  if (it) UI.tip(d, () => equipTip(slot), { key: 'equip:' + slot });
  return d;
}

function vanitySlot(slot) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  const d = el('div', 'eslot vslot ' + rarityClass(it));
  const sel = UI.selected;
  if (sel && sel.where === 'vanity' && sel.slot === slot) d.classList.add('sel');
  if (it) {
    d.appendChild(itemCell(it));
    const check = canWearVanity(c, it, slot);
    if (!check.ok) d.classList.add('inactive-look');
  } else {
    d.appendChild(el('span', 'lbl', LOOK_LABELS[slot]));
  }
  if (slot === 'head' && c.hideHelm) d.classList.add('hidden-look');
  draggable(d, {
    key: 'vanity:' + slot,
    data: () => (c.vanity && c.vanity[slot] ? { type: 'item', where: 'vanity', slot } : null),
    icon: () => d.querySelector('img') && d.querySelector('img').src,
    onClick: () => selectSlotEl(d, c.vanity && c.vanity[slot] ? { where: 'vanity', slot } : null),
    onDouble: () => takeOffLook(slot),
    onRight: () => takeOffLook(slot),
  });
  droppable(d, (data) => {
    if (data.type !== 'item' || data.where !== 'bag') return false;
    return wearLook(data.idx, slot);
  }, (data) => {
    if (data.type !== 'item' || data.where !== 'bag') return false;
    const item = G.char.bag[data.idx];
    return canWearVanity(G.char, item, slot).ok;
  });
  UI.tip(d, () => vanityTip(slot), { key: 'vanity:' + slot });
  return d;
}

/** The Appearance section under the paper doll: 2x2 grid of vanity slots + helmet toggle & info. */
function vanityRow() {
  const c = G.char, row = el('div', 'vanity-row');

  const grid = el('div', 'vanity-grid');
  for (const s of VANITY_SLOTS) {
    grid.appendChild(vanitySlot(s));
  }
  row.appendChild(grid);

  const side = el('div', 'vanity-side');
  const title = el('div', 'vanity-title', '<span>Appearance</span><span class="dim">Vanity Looks</span>');
  side.appendChild(title);

  const hide = el('button', 'btn small vanity-helm-btn', c.hideHelm ? 'Show helmet' : 'Hide helmet');
  hide.title = 'Show or hide the helmet on your hero (its stats still count)';
  hide.onclick = () => { c.hideHelm = !c.hideHelm; sfx('ui'); changed(); };
  side.appendChild(hide);

  const note = el('div', 'vanity-note', 'Cosmetic skins worn over gear');
  side.appendChild(note);

  row.appendChild(side);
  return row;
}

function removeGemsAction(c, it) {
  if (!it || it.type !== 'gear' || !it.gems || !it.gems.length) return null;
  const cost = unsocketCost(it);
  const gemList = c.gemBag || c.bag || [];
  const needed = new Set((it.gems || []).filter((g) => !gemList.some((b) => b && b.type === 'gem' && b.gem === g.gem && b.tier === g.tier)).map((g) => `${g.gem}:${g.tier}`)).size;
  const free = gemList.filter((b) => !b).length;
  if (c.gold < cost || free < needed) return null;
  return {
    label: `Remove gems (${fmtInt(cost)}g)`,
    fn: () => {
      if (c.gold < cost) return;
      c.gold -= cost;
      for (const gem of it.gems) addToBag(c, makeGem(gem.gem, gem.tier));
      it.gems = [];
      sfx('gold');
      changed();
    },
  };
}

function getBagActions(idx, where = 'bag') {
  const c = G.char, container = where === 'gemBag' && c.gemBag ? c.gemBag : c.bag;
  const it = container[idx];
  if (!it) return [];
  const acts = [];
  if (it.sealed) {
    acts.push({ label: 'Break Seal', fn: () => openSeal(idx), cls: 'small red' });
  } else if (it.type === 'gear') {
    acts.push({ label: 'Equip', fn: () => equipFromBag(idx) });
    if (VANITY_SLOTS.includes(it.slot)) acts.push({ label: 'Wear as look', fn: () => wearLook(idx) });
  } else if (it.type === 'gem') {
    const targets = [...SLOTS.map((s) => ({ where: 'equip', slot: s })), ...c.bag.map((b, i) => ({ where: 'bag', idx: i }))].filter((r) => { const x = getItem(r); return x && x.type === 'gear' && !x.sealed && x.gems.length < x.sockets; });
    if (targets.length) acts.push({ label: `Socket (${targets.length})`, fn: () => pickSocketTarget(idx, targets, 'bag') });
    if (G.ui.jewelBox && G.ui.jewelBox.active) acts.push({ label: 'Store in Jewel Box', fn: () => G.ui.jewelBox.store(idx, 'bag') });
  } else if (it.type === 'banner_kit') {
    acts.push({ label: 'Customize Banner', fn: () => openBannerCustomizer({ bagIdx: idx }) });
  }
  if (it.type === 'sheet') {
    sheetButtons((lbl, fn, cls) => acts.push({ label: lbl, fn, cls }), { where: 'bag', idx }, it);
  }
  if (G.ui.vendor && G.ui.vendor.active && !it.sealed) {
    acts.push({ label: `Sell (${fmtInt(Math.max(1, Math.floor(itemValue(it) / 4)))}g)`, fn: () => G.ui.vendor.sell({ where: 'bag', idx }) });
  }
  if (G.ui.stash && G.ui.stash.active) {
    acts.push({ label: 'Store', fn: () => G.ui.stash.store(idx) });
  }
  if (G.ui.reliquary && G.ui.reliquary.active) {
    acts.push({ label: 'Store in Vault', fn: () => G.ui.reliquary.store(idx) });
  }
  if (it.type === 'gear') {
    acts.push({
      label: it.locked ? '🔓 Unlock' : '🔒 Lock',
      keepOpen: true,
      fn: () => {
        if (it.locked) delete it.locked; else it.locked = true;
        UI.log(it.locked ? `<b>${escapeHtml(itemName(it))}</b> locked: auto-play won't touch it.` : `<b>${escapeHtml(itemName(it))}</b> unlocked.`, '#ffd860');
        changed();
      },
    });
    const rg = removeGemsAction(c, it);
    if (rg) acts.push(rg);
  }
  acts.push({ label: 'Drop', fn: () => dropFromBag(idx), cls: 'small red' });
  return acts;
}

function getGemBagActions(idx) {
  const c = G.char, it = c.gemBag && c.gemBag[idx];
  if (!it) return [];
  const acts = [];
  const targets = [...SLOTS.map((s) => ({ where: 'equip', slot: s })), ...c.bag.map((b, i) => ({ where: 'bag', idx: i }))].filter((r) => { const x = getItem(r); return x && x.type === 'gear' && !x.sealed && x.gems.length < x.sockets; });
  if (targets.length) acts.push({ label: `Socket (${targets.length})`, fn: () => pickSocketTarget(idx, targets, 'gemBag') });
  if (G.ui.jewelBox && G.ui.jewelBox.active) acts.push({ label: 'Store in Jewel Box', fn: () => G.ui.jewelBox.store(idx, 'gemBag') });
  if (G.ui.vendor && G.ui.vendor.active) acts.push({ label: `Sell (${fmtInt(Math.max(1, Math.floor(itemValue(it) / 4)))}g)`, fn: () => G.ui.vendor.sell({ where: 'gemBag', idx }) });
  if (G.ui.stash && G.ui.stash.active) acts.push({ label: 'Store', fn: () => G.ui.stash.store(idx, 'gemBag') });
  acts.push({
    label: it.locked ? '🔓 Unlock' : '🔒 Lock',
    keepOpen: true,
    fn: () => {
      if (it.locked) delete it.locked; else it.locked = true;
      changed();
    },
  });
  acts.push({ label: 'Drop', fn: () => dropFromBag(idx, 'gemBag'), cls: 'small red' });
  return acts;
}

function getEquipActions(slot) {
  const c = G.char, it = c.equip[slot];
  if (!it) return [];
  const acts = [{ label: 'Unequip', fn: () => unequip(slot) }];
  if (G.ui.vendor && G.ui.vendor.active) {
    acts.push({ label: 'Sell', fn: () => unequip(slot) });
  }
  acts.push({
    label: it.locked ? '🔓 Unlock' : '🔒 Lock',
    keepOpen: true,
    fn: () => {
      if (it.locked) delete it.locked; else it.locked = true;
      UI.log(it.locked ? `<b>${escapeHtml(itemName(it))}</b> locked: auto-play won't touch it or swap it out.` : `<b>${escapeHtml(itemName(it))}</b> unlocked.`, '#ffd860');
      changed();
    },
  });
  const rg = removeGemsAction(c, it);
  if (rg) acts.push(rg);
  return acts;
}

function getVanityActions(slot) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  if (!it) return [];
  return [{ label: 'Take off look', fn: () => takeOffLook(slot) }];
}

function pickSocketTarget(gemIdx, targets, fromWhere = 'bag') {
  const html = targets.map((r, i) => { const x = getItem(r); return `<button class="btn small" data-i="${i}" style="display:block;width:100%;margin:3px 0;color:${itemColor(x)}">${escapeHtml(itemName(x))} (${x.gems.length}/${x.sockets})</button>`; }).join('');
  const d = UI.dialog({ title: 'Socket into…', html: `<div style="max-height:50vh;overflow:auto">${html}</div>`, buttons: [{ label: 'Cancel' }] });
  d.box.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { d.close(); socketGem(gemIdx, targets[+b.dataset.i], fromWhere); }; });
}

function statsBlock() {
  const p = G.player, c = G.char, st = p.st, C = CLASSES[c.classId];
  const box = el('div', 'col character-card');
  const need = xpToNext(c.level), mk = capXp(c);   // at the cap: XP towards the next Infernal Mark
  box.appendChild(el('div', 'character-identity', `<span class="inv-eyebrow">Character</span><b>${escapeHtml(c.name)}</b><span>Level ${c.level} ${C.name}</span><small>${mk ? `Next Infernal Mark ${fmtInt(mk.xp)} / ${fmtInt(mk.need)} XP` : `XP ${fmtInt(c.xp)} / ${fmtInt(need)}`}</small>`));
  box.appendChild(el('div', 'inv-section-title', 'Attributes'));
  const attrs = el('div', '');
  for (const k of ['str', 'dex', 'vit', 'int']) {
    const row = el('div', 'attr-row');
    row.innerHTML = `<span title="${ATTRS[k].desc}">${ATTRS[k].name}${C.primary === k ? ' <span style="color:#ffd34a" title="Primary: +1% damage per point">★</span>' : ''}</span><b>${Math.round(st[k])}</b>`;
    if (c.statPoints > 0) {
      const plus = el('button', 'plus', '+');
      plus.title = 'Shift-click: +5 · Ctrl-click: every point';
      plus.onclick = (e) => { const n = Math.min(c.statPoints, e.ctrlKey || e.metaKey || e.altKey ? Infinity : e.shiftKey ? 5 : 1); c.attrs[k] += n; c.statPoints -= n; sfx('ui'); changed(); };
      row.appendChild(plus);
    }
    attrs.appendChild(row);
  }
  box.appendChild(attrs);
  if (c.statPoints > 0) {
    const r = el('div', 'row');
    r.appendChild(el('span', 'gold-text', `${c.statPoints} points`));
    const auto = el('button', 'btn small', 'Auto');
    auto.onclick = () => { autoAllocate(); sfx('ui'); };
    r.appendChild(auto);
    box.appendChild(r);
  }
  const spent = attrsSpent();
  if (spent > 0) {
    const rb = el('button', 'btn small', `Respec attributes (${fmtInt(attrRespecCost(c.level))} gold)`);
    rb.title = 'Refund every attribute point you (or auto-play) spent: 25 gold x level squared';
    if (c.gold < attrRespecCost(c.level)) rb.style.opacity = '.45';
    rb.onclick = () => { sfx('ui'); attrRespecDialog(); };
    box.appendChild(rb);
  }
  const g = el('div', 'stats-grid stats-primary');
  const rows = [
    ['Life', `${fmtInt(p.hp)} / ${fmtInt(p.maxHp)}`], ['Mana', `${fmtInt(p.mana)} / ${fmtInt(p.maxMana)}`],
    ['Weapon Base', `${fmtDmg(shownWeapon(st.weapon[0], heroDmgLevel(c)))}–${fmtDmg(shownWeapon(st.weapon[1], heroDmgLevel(c)))}`, "The weapon's base damage before skills, attributes and bonuses: the Attack and DPS plaque shows what you deal"], ['Damage Bonus', `+${Math.round(st.dmgPct + st.primary)}%`],
    ['Armor', fmtInt(st.armor)], ['Crit', `${st.critChance.toFixed(1)}% / +${Math.round(st.critDmg)}%`],
    ['Attack Speed', `+${Math.round(st.atkSpeed)}%`], ['Cast Speed', `+${Math.round(st.castSpeed)}%`],
    ['Move Speed', `+${Math.round(st.moveSpeed)}%`], ['Fire Res', `${Math.min(75, st.res.fire)}%`],
    ['Cold Res', `${Math.min(75, st.res.cold)}%`], ['Lightning Res', `${Math.min(75, st.res.light)}%`],
    ['Poison Res', `${Math.min(75, st.res.poison)}%`], ['Life Steal', `${st.lifeSteal.toFixed(1)}%`],
    ['Block', `${Math.round(st.block)}%`], ['Life Regen', `${st.lifeRegen.toFixed(1)}/s`],
    ['Mana Regen', `${(st.manaRegen || 0).toFixed(1)}/s`],
    ['Magic Find', `+${Math.round(st.magicFind)}%`], ['Gold Find', `+${Math.round(st.goldFind)}%`],
  ];
  if (st.critOver) rows.push(['Crit past 75%', `+${st.critOver.toFixed(1)}% → +${Math.round(st.critOver * CRIT_OVER)}% crit dmg`]);
  if (st.thorns > 0) rows.push(['Thorns', fmtInt(st.thorns), 'Attackers take this much damage per blow (gear and buffs, times Fortitude)']);
  if (st.reduce) rows.push(['Damage Reduction', `${Math.round(st.reduce)}%`]);
  if (st.fortitude > 1) rows.push(['Fortitude', `+${Math.round((st.fortitude - 1) * 100)}% Life`]);
  if (p.marks && p.marks.life) rows.push(['Vitality (Marks)', `+${p.marks.life}% more Life`]);
  if (st.drops) rows.push(['More Drops (Marks)', `+${st.drops}%`]);
  if (st.extraProj) rows.push(['Extra Projectiles', '+' + Math.floor(st.extraProj)]);
  if (st.skillsAll) rows.push(['All Skills', '+' + Math.floor(st.skillsAll)]);
  if (marksTotal()) rows.push(['Infernal Marks', `${marksTotal()} (${marksFree()} free)`]);
  if (heresyRankOf(c)) rows.push(['Heresy rank', String(heresyRankOf(c))]);
  if (c.keys) rows.push(['Abyssal Keys', `${c.keys}`]);
  const primary = new Set(['Life', 'Mana', 'Weapon Base', 'Damage Bonus', 'Armor', 'Crit', 'Attack Speed', 'Cast Speed', 'Move Speed']);
  box.appendChild(el('div', 'inv-section-title', 'Combat'));
  for (const [k, v, tip] of rows.filter(([k]) => primary.has(k))) g.innerHTML += `<span class="dim"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${k}</span><span class="v"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${v}</span>`;
  box.appendChild(g);
  const more = el('details', 'character-more');
  more.innerHTML = '<summary>All character stats</summary>';
  const extra = el('div', 'stats-grid');
  for (const [k, v, tip] of rows.filter(([k]) => !primary.has(k))) extra.innerHTML += `<span class="dim"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${k}</span><span class="v"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${v}</span>`;
  more.appendChild(extra);
  box.appendChild(more);
  box.appendChild(el('div', 'character-history', `Kills ${fmtInt(c.kills || 0)} · Deaths ${c.deaths || 0} · Deepest ${c.deepest || 0}`));
  if (endgameUnlocked(c)) { const mb = el('button', 'btn small', 'Infernal Marks'); mb.onclick = () => { sfx('ui'); G.ui.marks.open(); }; box.appendChild(mb); }
  return box;
}

/** Attribute points spent so far (everything over the class's starting attributes). */
const attrsSpent = () => { const c = G.char, B = CLASSES[c.classId].base; return ['str', 'dex', 'vit', 'int'].reduce((a, k) => a + Math.max(0, c.attrs[k] - B[k]), 0); };
export const attrRespecCost = (lv) => 25 * lv * lv;
/** Refund every spent attribute point (back to the class's starting attributes) for 25 gold x level squared. */
export function attrRespec() {
  const c = G.char, cost = attrRespecCost(c.level), n = attrsSpent();
  if (!n || c.gold < cost) return false;
  c.attrs = { ...c.attrs, ...CLASSES[c.classId].base };
  c.statPoints += n; c.gold -= cost;
  for (const slot of ['weapon', 'offhand']) {
    const it = c.equip[slot];
    if (it && !canEquipItem(c, it, slot)) unequip(slot);
  }
  sfx('buff');
  UI.log(`Attributes reset: <b>${n}</b> attribute points refunded for ${fmtInt(cost)} gold.`, '#ffd860');
  changed();
  return true;
}
function attrRespecDialog() {
  const c = G.char, cost = attrRespecCost(c.level), n = attrsSpent();
  if (c.gold < cost) { UI.log(`Respeccing attributes costs ${fmtInt(cost)} gold.`, '#ff8080'); sfx('error'); return; }
  const auto = G.settings.autoStatPoints !== false;
  UI.confirm('Respec Attributes', `Refund all <b>${n}</b> spent attribute points for <b class="gold-text">${fmtInt(cost)} gold</b> (25 x level&sup2;)?${auto ? '<br><span class="dim">Auto-play spends attribute points on its own: turn off "Auto attribute point assignment" in Settings to place them yourself.</span>' : ''}`, attrRespec, 'Respec');
}

export function autoAllocate() {
  const c = G.char, C = CLASSES[c.classId];
  const reqStats = [...new Set([BASE_REQ_STAT[C.weapon], C.offhand && BASE_REQ_STAT[C.offhand]].filter(Boolean))];
  const targetReq = c.level > 1 ? 20 + (Math.min(c.level, MAX_LEVEL) - 1) * 2 : 0;
  while (c.statPoints > 0) {
    const needStat = targetReq > 0 ? reqStats.find((stKey) => charEffectiveStat(c, stKey) < targetReq) : null;
    if (needStat) {
      c.attrs[needStat]++;
      c.statPoints--;
      continue;
    }
    const r = Math.random();
    const k = r < 0.55 ? C.primary : r < 0.85 ? 'vit' : C.primary === 'int' ? 'dex' : 'int';
    c.attrs[k === 'vit' && C.primary === 'vit' ? 'str' : k]++;
    c.statPoints--;
  }
  changed();
}

function equipmentColumn(c) {
  const left = el('div', 'col inv-equipment');
  const titleRow = el('div', 'inv-section-title');
  titleRow.appendChild(el('div', 'inv-title-label', 'Equipment'));
  const actions = el('div', 'inv-title-actions');
  const bagBtn = el('button', 'btn small', 'Bag');
  bagBtn.title = 'Open Backpack (I) to view your items';
  bagBtn.onclick = () => {
    sfx('ui');
    if (!UI.isOpen('inventory')) toggleInventory();
    else UI.focusPanel('inventory');
  };
  actions.appendChild(bagBtn);
  titleRow.appendChild(actions);
  left.appendChild(titleRow);

  const doll = el('div', 'paperdoll');
  const portrait = el('div', 'portrait');
  const img = new Image();
  const eq = shownEquip(c); // the vanity looks over the real gear
  const held = heldPortraitArgs(heroLook(c.classId, eq.body, eq.head), c.classId, eq); // with his weapon and off-hand
  img.src = (heroPortrait(c.classId, eq.body, eq.head, 130, 260, ...held) || classSprite(c.classId, 260)).toDataURL();
  portrait.appendChild(img);
  portrait.style.gridColumn = 3; portrait.style.gridRow = '3 / span 2';
  doll.appendChild(portrait);
  for (const s of SLOTS) doll.appendChild(equipSlot(s));
  left.appendChild(doll);
  left.appendChild(vanityRow());
  if (c.classId === 'bard') left.appendChild(tabRow());
  return left;
}

export function renderCharacter(body, panel) {
  const c = G.char;
  if (panel && panel.root) panel.root.classList.add('character-panel');
  body.innerHTML = '';
  const wrap = el('div', 'inv-wrap character-view');
  wrap.appendChild(equipmentColumn(c));
  wrap.appendChild(statsBlock());
  body.appendChild(wrap);
}

export function toggleCharacter() {
  if (UI.isOpen('character')) UI.closePanel('character');
  else UI.openPanel('character', 'Character & Stats', renderCharacter, { cls: 'character-panel', order: 'first' });
}

export function renderInventory(body, panel) {
  const c = G.char;
  if (!Array.isArray(c.gemBag)) c.gemBag = Array(30).fill(null);
  if (panel && panel.root) panel.root.classList.add('inventory-panel');
  body.innerHTML = '';
  const wrap = el('div', 'inv-wrap bag-view');
  const mid = el('div', 'col inv-bag');

  const titleRow = el('div', 'inv-section-title');
  const label = el('div', 'inv-title-label');
  const bagUsed = c.bag.filter(Boolean).length;
  label.innerHTML = `Backpack <span>${bagUsed} / ${c.bag.length}</span>`;
  titleRow.appendChild(label);
  const actions = el('div', 'inv-title-actions');

  const sortBtn = el('button', 'btn small', 'Sort');
  sortBtn.title = 'Sort inventory items by type and rarity';
  sortBtn.onclick = () => { sortBag(); sfx('ui'); };
  actions.appendChild(sortBtn);

  if (Stash.active) {
    const stashAllBtn = el('button', 'btn small', 'Stash All');
    stashAllBtn.title = 'Move all unlocked items from backpack into storage chest';
    stashAllBtn.onclick = () => { sfx('ui'); Stash.stashAll('bag'); };
    actions.appendChild(stashAllBtn);
  }

  if (Reliquary.active && Reliquary.tab < openTabs()) {
    const vaultName = ['I', 'II', 'III', 'IV', 'V', 'VI'][Reliquary.tab] || (Reliquary.tab + 1);
    const stashAllBtn = el('button', 'btn small', 'Stash All');
    stashAllBtn.title = `Move all unlocked items from backpack into Vault ${vaultName}`;
    stashAllBtn.onclick = () => { sfx('ui'); Reliquary.stashAll('bag'); };
    actions.appendChild(stashAllBtn);
  }

  if (G.ui.vendor && G.ui.vendor.active) {
    const sellAllBtn = el('button', 'btn small', 'Sell all');
    sellAllBtn.title = 'Sell every piece of gear in your bag (gems and sealed treasures are kept). Asks once.';
    sellAllBtn.disabled = !c.bag.some((b) => b && b.type === 'gear' && !b.sealed && !b.locked);
    sellAllBtn.onclick = () => { sfx('ui'); G.ui.vendor.sellAll(); };
    actions.appendChild(sellAllBtn);
  }

  const statsBtn = el('button', 'btn small', `Stats${c.statPoints > 0 ? ` [${c.statPoints}]` : ''}`);
  statsBtn.title = 'Open Character & Stats (C) to view equipment and attributes';
  statsBtn.onclick = () => {
    sfx('ui');
    if (!UI.isOpen('character')) toggleCharacter();
    else UI.focusPanel('character');
  };
  actions.appendChild(statsBtn);

  titleRow.appendChild(actions);
  mid.appendChild(titleRow);

  const bag = el('div', 'bag');
  for (let i = 0; i < c.bag.length; i++) bag.appendChild(bagSlot(i));
  mid.appendChild(bag);
  if (nextRowCost(c)) mid.appendChild(bagRowButton());

  const gemTitleRow = el('div', 'inv-section-title');
  gemTitleRow.style.marginTop = '8px';
  const gemUsed = c.gemBag.filter(Boolean).length;
  gemTitleRow.innerHTML = `<div class="inv-title-label">Gem Bag <span>${gemUsed} / ${c.gemBag.length}</span></div>`;
  const gemActions = el('div', 'inv-title-actions');
  const sortGemsBtn = el('button', 'btn small', 'Sort');
  sortGemsBtn.title = 'Sort gems and runes by tier and grade';
  sortGemsBtn.onclick = () => { sortGemBag(); sfx('ui'); };
  gemActions.appendChild(sortGemsBtn);

  if (Stash.active) {
    const stashGemsBtn = el('button', 'btn small', 'Stash Gems');
    stashGemsBtn.title = 'Move all unlocked gems from Gem Bag into storage chest';
    stashGemsBtn.onclick = () => { sfx('ui'); Stash.stashAll('gemBag'); };
    gemActions.appendChild(stashGemsBtn);
  }

  if (Reliquary.active && Reliquary.tab < openTabs()) {
    const vaultName = ['I', 'II', 'III', 'IV', 'V', 'VI'][Reliquary.tab] || (Reliquary.tab + 1);
    const stashGemsBtn = el('button', 'btn small', 'Stash Gems');
    stashGemsBtn.title = `Move all unlocked gems from Gem Bag into Vault ${vaultName}`;
    stashGemsBtn.onclick = () => { sfx('ui'); Reliquary.stashAll('gemBag'); };
    gemActions.appendChild(stashGemsBtn);
  }

  if (G.ui.vendor && G.ui.vendor.active) {
    const sellGemsBtn = el('button', 'btn small', 'Sell gems');
    sellGemsBtn.title = 'Sell all unlocked gems in your Gem Bag. Asks once.';
    sellGemsBtn.disabled = !c.gemBag || !c.gemBag.some((b) => b && b.type === 'gem' && !b.locked);
    sellGemsBtn.onclick = () => { sfx('ui'); G.ui.vendor.sellAllGems(); };
    gemActions.appendChild(sellGemsBtn);
  }

  gemTitleRow.appendChild(gemActions);
  mid.appendChild(gemTitleRow);

  const gemBagEl = el('div', 'bag gem-bag');
  for (let i = 0; i < c.gemBag.length; i++) gemBagEl.appendChild(gemBagSlot(i));
  mid.appendChild(gemBagEl);
  const gemBagBuyBtn = gemBagRowButton(c);
  if (gemBagBuyBtn) mid.appendChild(gemBagBuyBtn);

  const info = el('div', 'row inv-bag-actions');
  info.innerHTML = `<span class="gold-text">◉ ${fmtInt(c.gold)} gold</span><span class="dim">· Potions: <span style="color:#ff6060">${c.potions.hp}</span> / <span style="color:#6a8aff">${c.potions.mp}</span> / <span style="color:#c060ff">${c.potions.rejuv}</span> / <span style="color:#ffa020">${c.potions.fury}</span></span>`;
  mid.appendChild(info);
  wrap.appendChild(mid);
  body.appendChild(wrap);
}

/** Buy the next bag row: 10 more slots, each row twice the gold of the last (data/bag.js). */
function bagRowButton() {
  const c = G.char, cost = nextRowCost(c), row = bagRows(c) + 1;
  const b = el('button', 'btn small bag-buy' + (c.gold < cost ? ' poor' : ''), `+ Bag row ${row} of ${BAG_MAX_ROWS} · <span class="gold-text">${fmtInt(cost)} gold</span>`);
  b.title = '10 more bag slots. Each row costs twice the last.';
  b.onclick = () => {
    if (G.char.gold < cost) { UI.log(`Bag row ${row} costs ${fmtInt(cost)} gold.`, '#ff8080'); sfx('error'); return; }
    sfx('ui');
    UI.confirm('Buy a Bag Row', `Add bag row <b>${row}</b> (10 slots) for <b class="gold-text">${fmtInt(cost)} gold</b>?`, () => {
      if (!buyBagRow(G.char)) { sfx('error'); return; }
      sfx('gold');
      UI.log(`Your bag grows: row <b>${row}</b> added for ${fmtInt(cost)} gold.`, '#ffd860');
      changed();
    }, 'Buy');
  };
  return b;
}

function gemBagRowButton(c) {
  const rows = gemBagRows(c);
  if (rows >= GEM_BAG_MAX_ROWS) return null;
  const next = rows + 1;
  const cost = nextGemBagRowCost(c);
  const can = canBuyGemBagRow(c);
  const b = el('button', 'btn small bag-buy gem-bag-buy' + (can ? '' : ' poor'), `+ Gem Bag row ${next} of ${GEM_BAG_MAX_ROWS} (${cost} Marks)`);
  b.title = can ? `Buy another row of 10 gem slots for ${cost} Infernal Marks` : `Requires ${cost} unspent Infernal Marks (you have ${marksFree()})`;
  b.onclick = () => {
    sfx('ui');
    if (!canBuyGemBagRow(c)) {
      UI.log(`You need ${cost} free Infernal Marks to buy row ${next}.`, '#ff8080');
      return;
    }
    UI.dialog({
      title: `Gem Bag row ${next} of ${GEM_BAG_MAX_ROWS}`,
      html: `<p>Expand your Gem Bag by 1 row (10 slots) for <b style="color:#ffd860">${cost} Infernal Marks</b>?</p>`,
      buttons: [
        { label: 'Cancel' },
        { label: `Buy for ${cost} Marks`, cls: 'red', fn: () => {
          if (buyGemBagRow(c)) {
            changed();
            const panel = UI.panels?.get('inventory');
            if (panel) renderInventory(panel.body);
          }
        }},
      ],
    });
  };
  return b;
}

export function sortBag() {
  const c = G.char;
  if (!c) return;
  if (!Array.isArray(c.bag)) c.bag = Array(60).fill(null);
  const items = (c.bag || []).filter(Boolean);
  const rank = (it) => (it.type === 'gear' ? 0 : it.type === 'gem' ? 1 : 2);
  items.sort((a, b) => rank(a) - rank(b) || (b.rarity || 0) - (a.rarity || 0) || (a.slot || '').localeCompare(b.slot || '') || (b.ilvl || 0) - (a.ilvl || 0));
  const bagLen = Math.max(60, c.bag.length);
  c.bag = Array(bagLen).fill(null).map((_, i) => items[i] || null);
  UI.selected = null;
  changed();
}

export function sortGemBag() {
  const c = G.char;
  if (!Array.isArray(c.gemBag)) c.gemBag = Array(30).fill(null);
  const items = c.gemBag.filter(Boolean);
  const gemRank = (it) => {
    if (!it || it.type !== 'gem') return 99;
    const g = GEMS[it.gem];
    if (g && g.sigil) return 0;
    if (g && g.special) return 1;
    return 2;
  };
  items.sort((a, b) =>
    gemRank(a) - gemRank(b) ||
    (b.tier || 0) - (a.tier || 0) ||
    (a.gem || '').localeCompare(b.gem || '') ||
    (b.count || 1) - (a.count || 1)
  );
  const gemLen = Math.max(30, c.gemBag.length);
  c.gemBag = Array(gemLen).fill(null).map((_, i) => items[i] || null);
  UI.selected = null;
  changed();
}

export function toggleInventory() {
  if (UI.isOpen('inventory')) UI.closePanel('inventory');
  else UI.openPanel('inventory', 'Backpack', renderInventory, { cls: 'inventory-panel', order: 'last' });
}

export { addToBag, GEMS };
