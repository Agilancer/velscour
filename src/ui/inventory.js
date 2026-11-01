// Inventory + character sheet.
import { G } from '../state.js';
import { el, fmtInt, fmtDmg, escapeHtml } from '../core/util.js';
import { shownWeapon, heroDmgLevel } from '../data/depth.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { SLOTS, SLOT_NAMES, VANITY_SLOTS, shownEquip, itemName, itemColor, GEMS, gemName, itemValue, fitsSlot, slotFor, unsocketCost, makeGem } from '../data/items.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { xpToNext, CRIT_OVER } from '../game/player.js';
import { addToBag } from '../game/player.js';
import { GroundItem } from '../game/loot.js';
import { classSprite } from '../core/assets.js';
import { heroPortrait, heroLook } from '../core/gearart.js';
import { heldPortraitArgs } from '../gfx/heldart.js';
import { tabRow, sheetButtons, useSheet, unloadTab } from './sheets.js';
import { openSeal } from './sealed.js';
import { glyphOf } from '../data/relics.js';
import { noteFind } from '../game/reliquary.js';
import { marksTotal, marksFree, capXp } from '../game/marks.js';
import { heresyRankOf } from '../game/heresies.js';
import { endgameUnlocked } from '../game/endgame.js';
import { sparkle } from '../gfx/vfx.js';
import { bagRows, nextRowCost, buyBagRow, BAG_MAX_ROWS } from '../data/bag.js';

const DOLL = { head: [2, 1], weapon: [1, 2], body: [2, 2], offhand: [3, 2], hands: [1, 3], legs: [2, 3], feet: [2, 4], ring1: [4, 1], ring2: [4, 2], ring3: [4, 3], ring4: [4, 4] };

export function getItem(ref) {
  const c = G.char;
  if (!ref) return null;
  if (ref.where === 'bag') return c.bag[ref.idx];
  if (ref.where === 'equip') return c.equip[ref.slot];
  if (ref.where === 'vanity') return (c.vanity || {})[ref.slot];
  if (ref.where === 'tab') return (c.tabs || [])[ref.idx];
  return null;
}

export function changed() {
  G.player.recompute();
  UI.refresh();
  G.game && G.game.autosave();
}

export function equipFromBag(idx, slot) {
  const c = G.char, it = c.bag[idx];
  if (!it || it.type !== 'gear') return false;
  if (it.unid) { UI.log('Identify it first (buy it from the Gambler).', '#ff8080'); return false; }
  if (it.sealed) { UI.log('Break the seal first.', '#ffdf8a'); return false; }
  if ((it.req || 1) > c.level) { UI.log(`Requires level ${it.req}.`, '#ff8080'); sfx('error'); return false; }
  const to = slot && fitsSlot(it, slot, c.classId) ? slot : slotFor(c.equip, it, c.classId);
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
    if (fitsSlot(other, slot, c.classId) && (other.req || 1) <= c.level) { c.bag[toIdx] = it; c.equip[slot] = other; changed(); return true; }
    if (i < 0) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    i = c.bag.findIndex((b) => !b);
  }
  c.bag[i] = it;
  c.equip[slot] = null;
  UI.selected = { where: 'bag', idx: i };
  changed();
  return true;
}
/** Wear a head or body piece from the bag as a look only: the hero shows it over his real gear, which keeps the stats. */
export function wearLook(idx) {
  const c = G.char, it = c.bag[idx];
  if (!it || it.type !== 'gear' || !VANITY_SLOTS.includes(it.slot)) { sfx('error'); return false; }
  if (it.unid) { UI.log('Identify it first (buy it from the Gambler).', '#ff8080'); return false; }
  if (it.sealed) { UI.log('Break the seal first.', '#ffdf8a'); return false; }
  c.vanity = c.vanity || { head: null, body: null };
  const old = c.vanity[it.slot];
  c.vanity[it.slot] = it;
  c.bag[idx] = old || null;
  sfx('pickup');
  UI.log(`<b style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</b> is now your ${it.slot === 'head' ? 'helmet' : 'armor'}'s look. Your worn gear keeps the stats.`, '#d8c8ff');
  UI.selected = { where: 'vanity', slot: it.slot };
  changed();
  return true;
}
export function takeOffLook(slot, toIdx) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  if (!it) return false;
  const other = toIdx !== undefined ? c.bag[toIdx] : null;
  if (other) { // dropped on a bag item: swap when it is a look for this slot, else the first free cell
    if (other.type === 'gear' && other.slot === slot && !other.unid && !other.sealed) { c.bag[toIdx] = it; c.vanity[slot] = other; changed(); return true; }
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
export function socketGem(gemIdx, target) {
  const c = G.char, gem = c.bag[gemIdx], it = getItem(target);
  if (!gem || gem.type !== 'gem' || !it || it.type !== 'gear') return false;
  if (it.sealed) { UI.log('Break the seal first: nothing goes into a sealed treasure.', '#ffdf8a'); sfx('error'); return false; }
  if (it.gems.length >= it.sockets) { UI.log(it.sockets ? 'No free sockets. Visit the Jeweler to add more.' : 'This item has no sockets. The Jeweler can add some.', '#ff8080'); sfx('error'); return false; }
  const was = glyphOf(it);
  it.gems.push({ gem: gem.gem, tier: gem.tier });
  if ((gem.count || 1) > 1) gem.count--; else c.bag[gemIdx] = null;
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
export function dropFromBag(idx) {
  const c = G.char, it = c.bag[idx], p = G.player;
  if (!it || !G.world) return false;
  if (it.locked) { UI.log('That item is locked. Unlock it first (its panel in the inventory).', '#ffd860'); sfx('error'); return false; }
  if (it.type === 'gear' && it.sealed === undefined) it.sealed = false; // already opened: it doesn't seal again on the floor
  c.bag[idx] = null;
  const g = new GroundItem(p.x, p.y, it.type === 'potion' ? 'potion' : 'item', { item: it });
  g.t = -1.5; g.dropped = true; // not picked straight back up (auto-pickup leaves it alone: a click still takes it)
  G.world.addLoot(g);
  UI.selected = null;
  changed();
  return true;
}

function handleDropOnBag(idx, data) {
  const c = G.char;
  if (data.type === 'shop') return G.ui.vendor && G.ui.vendor.buy(data, idx);
  if (data.type === 'stash') return G.ui.stash && G.ui.stash.take(data.idx);
  if (data.type === 'vault') return G.ui.reliquary && G.ui.reliquary.take(data.idx, data.tab);
  if (data.type !== 'item') return false;
  if (data.where === 'bag') {
    if (data.idx === idx) return false;
    const a = c.bag[data.idx], b = c.bag[idx];
    if (a && a.type === 'gem' && b && b.type === 'gear') return socketGem(data.idx, { where: 'bag', idx });
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
function handleDropOnEquip(slot, data) {
  const c = G.char;
  if (data.type !== 'item' || data.where !== 'bag') return false;
  const it = c.bag[data.idx];
  if (!it) return false;
  if (it.type === 'gem') return c.equip[slot] ? socketGem(data.idx, { where: 'equip', slot }) : false;
  if (!fitsSlot(it, slot, c.classId)) { sfx('error'); return false; }
  return equipFromBag(data.idx, slot);
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
    onClick: () => { UI.selected = c.bag[idx] ? { where: 'bag', idx } : null; sfx('ui'); UI.refresh(); },
    onDouble: () => quickUse(idx),
    onRight: () => quickUse(idx),
    onDropWorld: (data) => (data.where === 'bag' ? dropFromBag(data.idx) : false),
  });
  droppable(d, (data) => handleDropOnBag(idx, data), (data) => data.type === 'item' || data.type === 'shop' || data.type === 'stash' || data.type === 'vault');
  if (it) UI.tip(d, () => itemTooltip(c.bag[idx], { compare: c.bag[idx] && c.bag[idx].slot ? c.equip[slotFor(c.equip, c.bag[idx])] : null, price: G.ui.vendor && G.ui.vendor.active ? Math.max(1, Math.floor(itemValue(c.bag[idx]) / 4)) : 0, priceLabel: 'Sells for', hint: G.ui.vendor && G.ui.vendor.active ? 'Right-click to sell' : G.ui.stash && G.ui.stash.active ? 'Right-click to store' : it.sealed ? 'Right-click / double-click to break the seal' : it.type === 'gear' ? 'Right-click / double-click to equip' : it.type === 'gem' ? 'Drag onto gear to socket' : it.type === 'sheet' ? (it.inked && c.classId === 'bard' ? 'Right-click to load it into a Tab' : it.inked ? 'Right-click to read it' : 'Right-click to write on it') : '' }));
  return d;
}

function quickUse(idx) {
  const c = G.char, it = c.bag[idx];
  if (!it) return;
  if (it.sealed && !(G.ui.stash && G.ui.stash.active)) { openSeal(idx); return; }
  if (G.ui.vendor && G.ui.vendor.active) { G.ui.vendor.sell({ where: 'bag', idx }); return; }
  if (G.ui.stash && G.ui.stash.active) { G.ui.stash.store(idx); return; }
  if (it.type === 'gear') equipFromBag(idx);
  else if (it.type === 'sheet') useSheet(idx);
  else if (it.type === 'gem') { UI.selected = { where: 'bag', idx }; UI.log('Drag the gem onto a socketed item to insert it.'); UI.refresh(); }
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
    onClick: () => { UI.selected = c.equip[slot] ? { where: 'equip', slot } : null; sfx('ui'); UI.refresh(); },
    onDouble: () => unequip(slot),
    onRight: () => (G.ui.vendor && G.ui.vendor.active ? (UI.selected = { where: 'equip', slot }, UI.refresh()) : unequip(slot)),
  });
  droppable(d, (data) => handleDropOnEquip(slot, data), (data) => data.type === 'item' && data.where === 'bag' && G.char.bag[data.idx] && (fitsSlot(G.char.bag[data.idx], slot) || G.char.bag[data.idx].type === 'gem'));
  if (it) UI.tip(d, () => itemTooltip(c.equip[slot], { hint: 'Right-click to unequip' }));
  return d;
}

const LOOK_NAMES = { head: 'Look: Head', body: 'Look: Body' };
function vanitySlot(slot) {
  const c = G.char, it = c.vanity && c.vanity[slot];
  const d = el('div', 'eslot vslot ' + rarityClass(it));
  const sel = UI.selected;
  if (sel && sel.where === 'vanity' && sel.slot === slot) d.classList.add('sel');
  if (it) d.appendChild(itemCell(it)); else d.appendChild(el('span', 'lbl', LOOK_NAMES[slot]));
  if (slot === 'head' && c.hideHelm) d.classList.add('hidden-look');
  draggable(d, {
    key: 'vanity:' + slot,
    data: () => (c.vanity && c.vanity[slot] ? { type: 'item', where: 'vanity', slot } : null),
    icon: () => d.querySelector('img') && d.querySelector('img').src,
    onClick: () => { UI.selected = c.vanity && c.vanity[slot] ? { where: 'vanity', slot } : null; sfx('ui'); UI.refresh(); },
    onDouble: () => takeOffLook(slot),
    onRight: () => takeOffLook(slot),
  });
  const fits = (b) => b && b.type === 'gear' && b.slot === slot;
  droppable(d, (data) => (data.type === 'item' && data.where === 'bag' && fits(c.bag[data.idx]) ? wearLook(data.idx) : (sfx('error'), false)), (data) => data.type === 'item' && data.where === 'bag' && fits(G.char.bag[data.idx]));
  const what = slot === 'head' ? 'helmet' : 'armor';
  UI.tip(d, () => (c.vanity && c.vanity[slot] ? itemTooltip(c.vanity[slot], { hint: 'A look only: no stats. Right-click to take it off' }) : `<b>${LOOK_NAMES[slot]}</b><div class="dim">Drop any ${slot === 'head' ? 'helmet' : 'body armor'} here to look like it. Your worn ${what} keeps giving the stats.</div>`));
  return d;
}
/** The Appearance row under the paper doll: the two look slots and the helmet toggle. */
function vanityRow() {
  const c = G.char, row = el('div', 'vanity-row');
  row.appendChild(el('div', 'vanity-title', 'Appearance<span class="dim">looks only, no stats</span>'));
  for (const s of VANITY_SLOTS) row.appendChild(vanitySlot(s));
  const hide = el('button', 'btn small', c.hideHelm ? 'Show helmet' : 'Hide helmet');
  hide.title = 'Show or hide the helmet on your hero (its stats still count)';
  hide.onclick = () => { c.hideHelm = !c.hideHelm; sfx('ui'); changed(); };
  row.appendChild(hide);
  return row;
}

function detailBox() {
  const box = el('div', 'item-detail');
  const sel = UI.selected;
  const it = getItem(sel);
  if (!it) { box.innerHTML = '<div class="dim">Tap or click an item to inspect it. Drag items to equip, move, socket gems or sell. Drag out of the window to drop.</div>'; return box; }
  box.innerHTML = (sel.where === 'vanity' ? '<div style="color:#d8c8ff;font-size:12px">Worn as a look: its stats don\'t count.</div>' : '') + itemTooltip(it, { compare: sel.where === 'bag' && it.slot ? G.char.equip[slotFor(G.char.equip, it)] : null });
  const row = el('div', 'row');
  row.style.marginTop = '8px';
  const btn = (label, fn, cls = 'small') => { const b = el('button', 'btn ' + cls, label); b.onclick = () => { sfx('ui'); fn(); }; row.appendChild(b); };
  if (sel.where === 'bag') {
    if (it.sealed) btn('Break the Seal', () => openSeal(sel.idx), 'small red');
    else if (it.type === 'gear') btn('Equip', () => equipFromBag(sel.idx));
    if (it.type === 'gear' && !it.sealed && VANITY_SLOTS.includes(it.slot)) btn('Wear as look', () => wearLook(sel.idx));
    if (it.type === 'gem') {
      const targets = [...SLOTS.map((s) => ({ where: 'equip', slot: s })), ...G.char.bag.map((b, i) => ({ where: 'bag', idx: i }))].filter((r) => { const x = getItem(r); return x && x.type === 'gear' && !x.sealed && x.gems.length < x.sockets; });
      if (targets.length) btn(`Socket (${targets.length} items)`, () => pickSocketTarget(sel.idx, targets));
    }
    if (it.type === 'sheet') sheetButtons(btn, sel, it);
    if (G.ui.vendor && G.ui.vendor.active && !it.sealed) btn(`Sell (${fmtInt(Math.max(1, Math.floor(itemValue(it) / 4)))}g)`, () => G.ui.vendor.sell(sel));
    btn('Drop', () => dropFromBag(sel.idx), 'small red');
  } else if (sel.where === 'tab') sheetButtons(btn, sel, it);
  else if (sel.where === 'vanity') btn('Take off look', () => takeOffLook(sel.slot));
  else {
    btn('Unequip', () => unequip(sel.slot));
  }
  // a lock: auto-play leaves the item alone (worn: never swapped out; in the bag or chest: never equipped, sold or moved)
  if (it.type === 'gear') btn(it.locked ? '🔓 Unlock' : '🔒 Lock', () => { if (it.locked) delete it.locked; else it.locked = true; UI.log(it.locked ? `<b>${escapeHtml(itemName(it))}</b> locked: auto-play won't touch it${sel.where === 'equip' ? ' or swap it out' : ''}.` : `<b>${escapeHtml(itemName(it))}</b> unlocked.`, '#ffd860'); changed(); });
  if (it.type === 'gear' && it.gems.length) {
    const cost = unsocketCost(it);
    const needed = new Set(it.gems.filter((g) => !G.char.bag.some((b) => b && b.type === 'gem' && b.gem === g.gem && b.tier === g.tier)).map((g) => `${g.gem}:${g.tier}`)).size;
    const free = G.char.bag.filter((b) => !b).length;
    const remove = el('button', 'btn small', `Remove gems (${fmtInt(cost)}g)`);
    remove.disabled = G.char.gold < cost || free < needed;
    remove.title = free < needed ? 'Make room in your inventory first.' : '';
    remove.onclick = () => {
      if (G.char.gold < cost || free < needed) return;
      G.char.gold -= cost;
      for (const gem of it.gems) addToBag(G.char, makeGem(gem.gem, gem.tier));
      it.gems = [];
      sfx('gold');
      changed();
    };
    row.appendChild(remove);
  }
  box.appendChild(row);
  return box;
}

function pickSocketTarget(gemIdx, targets) {
  const html = targets.map((r, i) => { const x = getItem(r); return `<button class="btn small" data-i="${i}" style="display:block;width:100%;margin:3px 0;color:${itemColor(x)}">${escapeHtml(itemName(x))} (${x.gems.length}/${x.sockets})</button>`; }).join('');
  const d = UI.dialog({ title: 'Socket into…', html: `<div style="max-height:50vh;overflow:auto">${html}</div>`, buttons: [{ label: 'Cancel' }] });
  d.box.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { d.close(); socketGem(gemIdx, targets[+b.dataset.i]); }; });
}

function statsBlock() {
  const p = G.player, c = G.char, st = p.st, C = CLASSES[c.classId];
  const box = el('div', 'col');
  box.style.minWidth = '210px';
  const need = xpToNext(c.level), mk = capXp(c);   // at the cap: XP towards the next Infernal Mark
  box.appendChild(el('div', '', `<b style="font-family:Cinzel;color:#ffe2a0;font-size:16px">${escapeHtml(c.name)}</b><div class="dim">Level ${c.level} ${C.name}</div><div class="dim" style="font-size:12px">${mk ? `Next Infernal Mark ${fmtInt(mk.xp)} / ${fmtInt(mk.need)} XP` : `XP ${fmtInt(c.xp)} / ${fmtInt(need)}`}</div>`));
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
  const g = el('div', 'stats-grid');
  const rows = [
    ['Life', `${fmtInt(p.hp)} / ${fmtInt(p.maxHp)}`], ['Mana', `${fmtInt(p.mana)} / ${fmtInt(p.maxMana)}`],
    ['Weapon Base', `${fmtDmg(shownWeapon(st.weapon[0], heroDmgLevel(c)))}–${fmtDmg(shownWeapon(st.weapon[1], heroDmgLevel(c)))}`, "The weapon's own damage before skills, attributes and bonuses, rated so a Common weapon of your depth's level averages 100: the Attack and DPS plaque shows what you deal"], ['Damage Bonus', `+${Math.round(st.dmgPct + st.primary)}%`],
    ['Armor', fmtInt(st.armor)], ['Crit', `${st.critChance.toFixed(1)}% / +${Math.round(st.critDmg)}%`],
    ['Attack Speed', `+${Math.round(st.atkSpeed)}%`], ['Cast Speed', `+${Math.round(st.castSpeed)}%`],
    ['Move Speed', `+${Math.round(st.moveSpeed)}%`], ['Fire Res', `${Math.min(75, st.res.fire)}%`],
    ['Cold Res', `${Math.min(75, st.res.cold)}%`], ['Lightning Res', `${Math.min(75, st.res.light)}%`],
    ['Poison Res', `${Math.min(75, st.res.poison)}%`], ['Life Steal', `${st.lifeSteal.toFixed(1)}%`],
    ['Block', `${Math.round(st.block)}%`], ['Life Regen', `${st.lifeRegen.toFixed(1)}/s`],
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
  for (const [k, v, tip] of rows) g.innerHTML += `<span class="dim"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${k}</span><span class="v"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${v}</span>`;
  box.appendChild(g);
  box.appendChild(el('div', 'dim', `Kills ${fmtInt(c.kills || 0)} · Deaths ${c.deaths || 0} · Deepest ${c.deepest || 0}`));
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
  while (c.statPoints > 0) {
    const r = Math.random();
    const k = r < 0.55 ? C.primary : r < 0.85 ? 'vit' : C.primary === 'int' ? 'dex' : 'int';
    c.attrs[k === 'vit' && C.primary === 'vit' ? 'str' : k]++;
    c.statPoints--;
  }
  changed();
}

export function renderInventory(body) {
  const c = G.char;
  body.innerHTML = '';
  const wrap = el('div', 'inv-wrap');
  const left = el('div', 'col');
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
  left.appendChild(detailBox());
  wrap.appendChild(left);
  const mid = el('div', 'col');
  const bag = el('div', 'bag');
  for (let i = 0; i < c.bag.length; i++) bag.appendChild(bagSlot(i));
  mid.appendChild(bag);
  if (nextRowCost(c)) mid.appendChild(bagRowButton());
  const info = el('div', 'row');
  info.innerHTML = `<span class="gold-text">◉ ${fmtInt(c.gold)} gold</span><span class="dim">· Potions: <span style="color:#ff6060">${c.potions.hp}</span> / <span style="color:#6a8aff">${c.potions.mp}</span> / <span style="color:#c060ff">${c.potions.rejuv}</span> / <span style="color:#ffa020">${c.potions.fury}</span></span>`;
  const sortBtn = el('button', 'btn small', 'Sort');
  sortBtn.onclick = () => { sortBag(); sfx('ui'); };
  info.appendChild(sortBtn);
  if (G.ui.vendor && G.ui.vendor.active) {
    const sellAll = el('button', 'btn small', 'Sell all');
    sellAll.title = 'Sell every piece of gear in your bag (gems and sealed treasures are kept). Asks once.';
    sellAll.disabled = !c.bag.some((b) => b && b.type === 'gear' && !b.sealed);
    sellAll.onclick = () => { sfx('ui'); G.ui.vendor.sellAll(); };
    info.appendChild(sellAll);
  }
  mid.appendChild(info);
  wrap.appendChild(mid);
  wrap.appendChild(statsBlock());
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

function sortBag() {
  const c = G.char;
  const items = c.bag.filter(Boolean);
  const rank = (it) => (it.type === 'gear' ? 0 : it.type === 'gem' ? 1 : 2);
  items.sort((a, b) => rank(a) - rank(b) || (b.rarity || 0) - (a.rarity || 0) || (a.slot || '').localeCompare(b.slot || '') || (b.ilvl || 0) - (a.ilvl || 0));
  c.bag = c.bag.map((_, i) => items[i] || null);
  UI.selected = null;
  changed();
}

export function toggleInventory() {
  if (UI.isOpen('inventory')) UI.closePanel('inventory');
  else UI.openPanel('inventory', 'Inventory & Character', renderInventory, { order: G.ui.vendor && G.ui.vendor.active ? 'last' : 'first' });
}

export { addToBag, GEMS };
