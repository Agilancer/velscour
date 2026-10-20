// Item cells and tooltip HTML.
import { G } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { itemName, itemBaseLine, itemColor, itemStats, itemDmg, itemArmor, statLabel, RARITY, GEMS, gemStats, gemName, LEGENDARY, legendaryDesc, powerLevel, SLOT_NAMES, POTION_INFO, MAX_GEM_TIER, augTarget } from '../data/items.js';
import { AUGMENTS } from '../data/rings.js';
import { elem } from '../gfx/vfx.js';
import { CLASSES } from '../data/classes.js';
import { itemIconURL } from './icons.js';
import { finishOf, gearFxOf } from '../core/gearart.js';

export function itemCell(item) {
  const d = el('div', 'itemicon');
  if (!item) return d;
  const img = new Image();
  img.src = itemIconURL(item);
  img.draggable = false;
  img.style.width = '100%'; img.style.height = '100%'; img.style.imageRendering = 'pixelated';
  d.appendChild(img);
  if (item.type === 'gem' && (item.count || 1) > 1) d.appendChild(el('span', 'stack', 'x' + item.count));
  if (item.upg) d.appendChild(el('span', 'upg', '+' + item.upg));
  if (item.type === 'gear' && item.sockets) {
    const s = el('div', 'socks');
    for (let i = 0; i < item.sockets; i++) s.appendChild(el('i', item.gems[i] ? 'f' : ''));
    d.appendChild(s);
  }
  if (item.unid) d.appendChild(el('span', 'upg', '?'));
  return d;
}

export function rarityClass(item) {
  if (!item) return '';
  if (item.type === 'gem') return GEMS[item.gem].special ? 'r4' : 'r2';
  if (item.type !== 'gear') return 'r0';
  return 'r' + item.rarity;
}

export function itemTooltip(item, opts = {}) {
  if (!item) return '';
  const p = G.player;
  const trees = p ? CLASSES[p.classId].trees : null;
  const col = itemColor(item);
  let h = `<div class="tt-name" style="color:${col}">${escapeHtml(item.unid ? 'Unidentified ' + SLOT_NAMES[item.slot] : itemName(item))}</div>`;
  if (item.type === 'gem') {
    const g = GEMS[item.gem];
    h += `<div class="tt-base">${g.special ? 'Rare Pattern Gem' : 'Gem'} · Grade ${item.tier + 1}/${MAX_GEM_TIER + 1}${item.count > 1 ? ` · Stack of ${item.count}` : ''}</div>`;
    for (const [s, v] of gemStats(item.gem, item.tier)) h += `<div class="tt-gem">${escapeHtml(statLabel(s, v, trees))}</div>`;
    h += `<div class="tt-sep"></div><div class="dim">Drag onto gear with a free socket to insert.${item.tier < MAX_GEM_TIER ? ' Fuse 3 (or refine 1) at the Gem Forge (Gem Merchant) for the next grade.' : ''}</div>`;
  } else if (item.type === 'potion') {
    h += `<div class="dim">${POTION_INFO[item.kind]}</div>`;
  } else {
    if (item.unid) {
      h += `<div class="tt-base">${SLOT_NAMES[item.slot]} · Item Level ${item.ilvl}</div><div class="dim">Its true nature is revealed once purchased.</div>`;
    } else {
      h += `<div class="tt-base">${escapeHtml(itemBaseLine(item))} · ${RARITY[item.rarity].name} ${SLOT_NAMES[item.slot]} · iLvl ${item.ilvl} · <span title="Item level + the rarity's worth in levels: what the item's numbers are rolled at">Power ${powerLevel(item.ilvl, item.rarity)}</span></div>`;
      const fin = finishOf(item), gfx = gearFxOf(item);
      if (fin || gfx) h += `<div class="dim" style="font-style:italic">${fin ? escapeHtml(fin.name) + ' finish' : ''}${fin && gfx ? ' · ' : ''}${gfx ? 'Aura: ' + escapeHtml(gfx.name) : ''}</div>`;
      if (item.dmg) { const [a, b] = itemDmg(item); h += `<div>Damage: <b>${a}–${b}</b>${cmp(opts.compare, item, 'dmg')}</div>`; }
      if (item.armor) h += `<div>Armor: <b>${itemArmor(item)}</b>${cmp(opts.compare, item, 'armor')}</div>`;
      if (item.upg) h += `<div style="color:#ffd34a">Upgraded +${item.upg}</div>`;
      const req = item.req || 1;
      h += `<div style="color:${p && p.char.level < req ? '#ff5050' : '#a8977c'}">Requires Level ${req}</div>`;
      h += '<div class="tt-sep"></div>';
      for (const a of item.affixes) h += `<div class="tt-line" style="color:${a.implicit ? '#d8d0c0' : a.perk ? '#d8c078' : '#8fb4ff'}">${escapeHtml(statLabel(a.s, a.v, trees))}</div>`;
      if (item.aug) for (const a of item.aug) {
        const A = AUGMENTS[a.id], col = elem(A.el).glow, has = !a.sk || (p && p.char.skills[a.sk]);
        h += `<div class="tt-aug" style="border-left:3px solid ${col};padding-left:6px;margin:4px 0"><b style="color:${col}">${A.name}</b> <span class="dim">· ${escapeHtml(augTarget(a))}${has ? '' : ' (not learned)'}</span><div style="color:#e8d8b8;font-size:12px">${escapeHtml(A.desc(a.pow))}</div></div>`;
      }
      if (item.legendary) {
        const L = LEGENDARY[item.legendary];
        h += `<div class="tt-leg"><b>${L.name}:</b> ${escapeHtml(legendaryDesc(item))}</div>`;
      }
      if (item.maxSockets) {
        h += `<div class="tt-sep"></div><div class="dim">Sockets: ${item.sockets}/${item.maxSockets}</div>`;
        for (let i = 0; i < item.sockets; i++) {
          const g = item.gems[i];
          if (g) h += `<div class="tt-gem">◆ ${escapeHtml(gemName(g.gem, g.tier))}: ${gemStats(g.gem, g.tier).map(([s, v]) => escapeHtml(statLabel(s, v, trees))).join(', ')}</div>`;
          else h += '<div class="dim">◇ Empty socket</div>';
        }
      }
    }
  }
  if (opts.price) h += `<div class="tt-price">${opts.priceLabel || 'Price'}: ${fmtInt(opts.price)} gold</div>`;
  if (opts.hint) h += `<div class="dim" style="margin-top:4px;font-size:12px">${opts.hint}</div>`;
  return h;
}

function cmp(other, item, kind) {
  if (!other || other === item) return '';
  if (kind === 'dmg' && other.dmg) {
    const a = itemDmg(item), b = itemDmg(other);
    const d = Math.round((a[0] + a[1]) / 2 - (b[0] + b[1]) / 2);
    return d ? ` <span class="${d > 0 ? 'cmp-up' : 'cmp-down'}">(${d > 0 ? '+' : ''}${d})</span>` : '';
  }
  if (kind === 'armor' && other.armor !== undefined) {
    const d = itemArmor(item) - itemArmor(other);
    return d ? ` <span class="${d > 0 ? 'cmp-up' : 'cmp-down'}">(${d > 0 ? '+' : ''}${d})</span>` : '';
  }
  return '';
}

export { itemStats };
