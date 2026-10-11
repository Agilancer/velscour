// Town vendors and their services.
import { G } from '../state.js';
import { el, fmtInt, escapeHtml, randi, pick, chance } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI, draggable, droppable } from './ui.js';
import { itemCell, itemTooltip, rarityClass } from './itemui.js';
import { getItem, changed, renderInventory } from './inventory.js';
import { addToBag } from '../game/player.js';
import {
  rollItem, rollGem, makeGem, itemValue, itemName, itemColor, upgradeCost, socketCost, enchantCost, unsocketCost,
  rerollAffixes, addAffix, RARITY, POTION_PRICE, POTION_INFO, GEMS, gemName, SLOT_NAMES, WEAPONS,
} from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { potionIcon } from '../core/assets.js';
import { VENDORS } from '../world/town.js';

const VBY = Object.fromEntries(VENDORS.map((v) => [v.id, v]));

export const Vendor = {
  active: null,
  stock: {},
  shopSel: null,

  restock() {
    const c = G.char;
    const lvl = Math.max(1, Math.max(c.level, c.depth || 1));
    const cls = CLASSES[c.classId];
    const shopRarity = () => (chance(0.03) ? 3 : chance(0.15) ? 2 : chance(0.45) ? 1 : 0);
    const weapons = [];
    for (let i = 0; i < 16; i++) {
      const slot = i < 12 ? 'weapon' : 'offhand';
      const base = slot === 'weapon' && i < 4 ? cls.weapon : slot === 'offhand' && i === 12 && cls.offhand ? cls.offhand : undefined;
      weapons.push(rollItem(lvl + randi(-2, 1), { slot, rarity: shopRarity(), base: base && (slot === 'weapon' ? WEAPONS[base] && base : base) }));
    }
    const armor = [];
    for (let i = 0; i < 18; i++) armor.push(rollItem(lvl + randi(-2, 1), { slot: ['head', 'body', 'hands', 'legs', 'feet', 'offhand'][i % 6], rarity: shopRarity(), base: i % 6 === 5 ? 'shield' : undefined }));
    const gems = [];
    for (let i = 0; i < 14; i++) gems.push(rollGem(Math.max(1, lvl - 5)));
    this.stock = { weapons, armor, gems };
  },

  open(vid) {
    UI.closeAll();
    this.active = vid;
    this.shopSel = null;
    const v = VBY[vid];
    sfx('ui');
    UI.openPanel('vendor', `${v.name} — ${v.title}`, (b) => this.render(b), { onClose: () => { this.active = null; UI.closePanel('inventory'); }, cls: 'vendor-panel' });
    UI.openPanel('inventory', 'Your Inventory', renderInventory);
  },

  render(body) {
    const v = VBY[this.active];
    const c = G.char;
    body.innerHTML = '';
    body.appendChild(el('div', 'vendor-greet', `“${escapeHtml(v.greet)}”`));
    body.appendChild(el('div', 'row', `<span class="gold-text">◉ ${fmtInt(c.gold)} gold</span><span class="dim" style="font-size:12px">· Sell: right-click an item in your bag or drag it here</span>`));
    droppable(body, (data) => (data.type === 'item' ? this.sell(data) : false), (data) => data.type === 'item');
    switch (this.active) {
      case 'weapons': this.shopGrid(body, this.stock.weapons); break;
      case 'armor': this.shopGrid(body, this.stock.armor); break;
      case 'gems': this.shopGrid(body, this.stock.gems); this.combineBox(body); break;
      case 'alchemist': this.potionBox(body); break;
      case 'upgrade': this.serviceBox(body, 'upgrade'); break;
      case 'enchant': this.serviceBox(body, 'enchant'); break;
      case 'socket': this.serviceBox(body, 'socket'); break;
      case 'gamble': this.gambleBox(body); break;
    }
  },

  shopGrid(body, list) {
    const grid = el('div', 'shop-grid');
    list.forEach((it, i) => {
      const d = el('div', 'bslot ' + rarityClass(it));
      if (this.shopSel === i) d.classList.add('sel');
      if (it) d.appendChild(itemCell(it));
      if (it) {
        draggable(d, {
          key: 'shop:' + i,
          data: () => (list[i] ? { type: 'shop', list, i } : null),
          icon: () => d.querySelector('img') && d.querySelector('img').src,
          onClick: () => { this.shopSel = i; sfx('ui'); UI.refresh(); },
          onDouble: () => this.buy({ type: 'shop', list, i }),
          onRight: () => this.buy({ type: 'shop', list, i }),
        });
        UI.tip(d, () => itemTooltip(list[i], { price: itemValue(list[i]), compare: list[i].slot ? G.char.equip[list[i].slot] : null, hint: 'Right-click or double-click to buy' }));
      }
      grid.appendChild(d);
    });
    body.appendChild(grid);
    const sel = this.shopSel !== null ? list[this.shopSel] : null;
    if (sel) {
      const box = el('div', 'item-detail');
      box.style.width = 'auto';
      box.style.marginTop = '8px';
      box.innerHTML = itemTooltip(sel, { price: itemValue(sel), compare: sel.slot ? G.char.equip[sel.slot] : null });
      const b = el('button', 'btn small', `Buy for ${fmtInt(itemValue(sel))}g`);
      b.disabled = G.char.gold < itemValue(sel);
      b.onclick = () => this.buy({ type: 'shop', list, i: this.shopSel });
      box.appendChild(b);
      body.appendChild(box);
    }
  },

  buy(data, toIdx) {
    const c = G.char;
    const it = data.list[data.i];
    if (!it) return false;
    const price = itemValue(it);
    if (c.gold < price) { UI.log('Not enough gold.', '#ff8080'); sfx('error'); return false; }
    let ok;
    if (toIdx !== undefined && !c.bag[toIdx] && it.type !== 'gem') { c.bag[toIdx] = it; ok = true; } else ok = addToBag(c, { ...it });
    if (!ok) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return false; }
    c.gold -= price;
    data.list[data.i] = it.type === 'gem' ? rollGem(Math.max(1, c.level - 4)) : null;
    if (this.shopSel === data.i) this.shopSel = null;
    sfx('gold');
    UI.log(`Bought <span style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</span> for ${fmtInt(price)} gold.`);
    changed();
    return true;
  },

  sell(ref) {
    const c = G.char;
    const it = getItem(ref);
    if (!it) return false;
    if (ref.where === 'equip') { UI.log('Unequip it first.', '#ff8080'); return false; }
    const n = it.type === 'gem' ? 1 : 1;
    const price = Math.max(1, Math.floor(itemValue(it) / 4)) * n;
    const sellIt = () => {
      if (it.type === 'gem' && (it.count || 1) > 1) it.count--; else c.bag[ref.idx] = null;
      c.gold += price;
      sfx('gold');
      UI.log(`Sold ${escapeHtml(itemName(it))} for ${fmtInt(price)} gold.`, '#ffd34a');
      if (UI.selected && UI.selected.where === 'bag' && UI.selected.idx === ref.idx && !c.bag[ref.idx]) UI.selected = null;
      changed();
    };
    if (it.type === 'gear' && it.rarity >= 3) UI.confirm('Sell item?', `Sell <span style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</span> for ${fmtInt(price)} gold?`, sellIt, 'Sell');
    else sellIt();
    return true;
  },

  potionBox(body) {
    const c = G.char;
    for (const k of ['hp', 'mp', 'rejuv', 'fury']) {
      const row = el('div', 'service-box row');
      const ic = potionIcon({ hp: 'red', mp: 'blue', rejuv: 'purple', fury: 'orange' }[k], 40);
      row.appendChild(ic);
      row.appendChild(el('div', '', `<b>${{ hp: 'Healing Potion', mp: 'Mana Potion', rejuv: 'Rejuvenation Potion', fury: 'Elixir of Fury' }[k]}</b> <span class="dim">(you have ${c.potions[k]})</span><div class="dim" style="font-size:12px">${POTION_INFO[k]}</div>`));
      const price = Math.round(POTION_PRICE[k] * (1 + c.level * 0.08));
      for (const n of [1, 5]) {
        const b = el('button', 'btn small', `Buy ${n} (${fmtInt(price * n)}g)`);
        b.disabled = c.gold < price * n || c.potions[k] + n > 30;
        b.onclick = () => { c.gold -= price * n; c.potions[k] += n; sfx('potion'); changed(); };
        row.appendChild(b);
      }
      body.appendChild(row);
    }
  },

  combineBox(body) {
    const c = G.char;
    const box = el('div', 'service-box');
    box.innerHTML = '<b>Gem Combining</b><div class="dim" style="font-size:12px">Fuse three identical gems into one of the next tier.</div>';
    const stacks = c.bag.map((b, i) => ({ b, i })).filter(({ b }) => b && b.type === 'gem' && (b.count || 1) >= 3 && b.tier < 5);
    if (!stacks.length) box.appendChild(el('div', 'dim', 'You have no stack of 3 matching gems.'));
    for (const { b, i } of stacks) {
      const cost = Math.round(80 * Math.pow(2.2, b.tier));
      const btn = el('button', 'btn small', `${escapeHtml(gemName(b.gem, b.tier))} x3 → ${escapeHtml(gemName(b.gem, b.tier + 1))} (${fmtInt(cost)}g)`);
      btn.style.display = 'block'; btn.style.margin = '4px 0';
      btn.disabled = c.gold < cost;
      btn.onclick = () => {
        c.gold -= cost;
        b.count -= 3;
        if (b.count <= 0) c.bag[i] = null;
        addToBag(c, makeGem(b.gem, b.tier + 1));
        sfx('levelup');
        UI.log(`Created <span style="color:#c8f0ff">${escapeHtml(gemName(b.gem, b.tier + 1))}</span>!`);
        changed();
      };
      box.appendChild(btn);
    }
    body.appendChild(box);
  },

  serviceBox(body, kind) {
    const c = G.char;
    const box = el('div', 'service-box');
    const it = getItem(UI.selected);
    const slot = el('div', 'bslot ' + rarityClass(it));
    slot.style.width = '56px'; slot.style.height = '56px'; slot.style.display = 'inline-block'; slot.style.verticalAlign = 'middle';
    if (it) slot.appendChild(itemCell(it));
    droppable(slot, (data) => { if (data.type !== 'item') return false; UI.selected = data.where === 'bag' ? { where: 'bag', idx: data.idx } : { where: 'equip', slot: data.slot }; UI.refresh(); return true; }, (data) => data.type === 'item');
    const head = el('div', 'row');
    head.appendChild(slot);
    head.appendChild(el('div', '', it && it.type === 'gear' ? `<b style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</b><div class="dim">${RARITY[it.rarity].name} · iLvl ${it.ilvl}${it.upg ? ` · +${it.upg}` : ''} · Sockets ${it.sockets}/${it.maxSockets}</div>` : '<span class="dim">Select or drag an item (bag or equipped) here.</span>'));
    box.appendChild(head);
    const btn = (label, cost, can, fn) => {
      const b = el('button', 'btn', `${label} — ${fmtInt(cost)}g`);
      b.style.margin = '6px 6px 0 0';
      b.disabled = !can || c.gold < cost;
      b.onclick = () => { c.gold -= cost; fn(); changed(); };
      box.appendChild(b);
    };
    if (it && it.type === 'gear') {
      if (kind === 'upgrade') {
        if ((it.upg || 0) >= 10) box.appendChild(el('div', 'dim', 'This item is fully upgraded (+10).'));
        else btn(`Upgrade to +${(it.upg || 0) + 1}`, upgradeCost(it), true, () => { it.upg = (it.upg || 0) + 1; sfx('thud'); UI.log(`${escapeHtml(itemName(it))} upgraded!`, '#ffd34a'); });
        box.appendChild(el('div', 'dim', 'Each upgrade: +10% base damage/armor and +4% to affix values.'));
      } else if (kind === 'enchant') {
        btn('Reroll all affixes', enchantCost(it, false), it.affixes.some((a) => !a.implicit), () => { rerollAffixes(it); sfx('arcane'); });
        const n = it.affixes.filter((a) => !a.implicit).length;
        btn('Add an affix', enchantCost(it, true), n < RARITY[it.rarity].affixes[1] + 1, () => { if (addAffix(it)) sfx('arcane'); });
        box.appendChild(el('div', 'dim', `Max affixes for ${RARITY[it.rarity].name}: ${RARITY[it.rarity].affixes[1] + 1}.`));
      } else if (kind === 'socket') {
        btn(`Add socket (${it.sockets}/${it.maxSockets})`, socketCost(it), it.sockets < it.maxSockets, () => { it.sockets++; sfx('thud'); });
        btn('Remove all gems', unsocketCost(it), it.gems.length > 0, () => {
          for (const g of it.gems) addToBag(c, makeGem(g.gem, g.tier));
          it.gems = [];
          sfx('gold');
        });
        box.appendChild(el('div', 'dim', 'Common gear holds up to 1 socket, Uncommon 2, Rare 3, Epic 4 and Legendary 6.'));
      }
    }
    body.appendChild(box);
  },

  gambleBox(body) {
    const c = G.char;
    const lvl = Math.max(c.level, c.depth || 1);
    const price = Math.round(180 * Math.pow(1.065, lvl));
    body.appendChild(el('div', 'dim', 'Buy an unidentified item. Gambled items are far more likely to be Rare, Epic or Legendary.'));
    const grid = el('div', 'row');
    grid.style.marginTop = '8px';
    for (const slot of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'gem']) {
      const b = el('button', 'btn small', `${slot === 'gem' ? 'Mystery Gem' : SLOT_NAMES[slot]}<br><span class="gold-text">${fmtInt(slot === 'gem' ? Math.round(price * 0.6) : price)}g</span>`);
      const cost = slot === 'gem' ? Math.round(price * 0.6) : price;
      b.disabled = c.gold < cost;
      b.onclick = () => {
        const it = slot === 'gem' ? rollGem(lvl + 8) : rollItem(lvl + 2, { slot, mf: G.player.st.magicFind + 120, bonus: 0.5 });
        if (!addToBag(c, it)) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return; }
        c.gold -= cost;
        sfx(it.rarity >= 3 ? 'levelup' : 'gold');
        UI.log(`The gamble reveals: <span style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</span>!`);
        changed();
      };
      grid.appendChild(b);
    }
    body.appendChild(grid);
  },
};

export { pick, GEMS };
