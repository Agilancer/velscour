// Sealed treasures: an Epic, Legendary or Mythic that drops arrives sealed (loot.js seals it as it hits the floor,
// at most one every SEAL_GAP of dungeon time). Nobody knows what's inside until the player breaks the seal: a slot-machine reel spins through the
// rarities and lands on the real item. Auto-play picks them up but never opens, sells, stashes or equips one, and
// when they leave no room in the bag it waits in town for the player (autoplay.js bagWait).
// The reveal is a card over the game, not a modal dialog: the hero keeps fighting behind it.
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { RARITY, itemName, itemColor } from '../data/items.js';
import { UI } from './ui.js';
import { itemTooltip } from './itemui.js';
import { itemIcon } from '../game/loot.js';
import { equipFromBag, changed } from './inventory.js';

export const isSealed = (it) => !!(it && it.sealed);
export const sealedCount = (c = G.char) => (c ? c.bag.reduce((a, b) => a + (b && b.sealed ? 1 : 0), 0) : 0);

const SPIN = 2.8; // seconds of spin
const REEL = [3, 3, 3, 3, 3, 4, 4, 5]; // what flashes past: mostly Epic, some Legendary, a little Mythic
let open = null; // the card on screen

/** Break the seal on the first sealed item in the bag (the HUD chip). */
export function openNextSeal() {
  const c = G.char;
  if (!c) return false;
  const i = c.bag.findIndex((b) => b && b.sealed);
  return i >= 0 && openSeal(i);
}

/** Break the seal on bag slot idx and spin the reel. */
export function openSeal(idx) {
  const c = G.char, it = c && c.bag[idx];
  if (!isSealed(it)) return false;
  if (open && open.spinning) return false;
  close();
  it.sealed = false; // the item is the player's from here on, even if the card is closed mid-spin
  c.unsealed = (c.unsealed || 0) + 1;
  changed();
  const wrap = el('div', 'reveal');
  const box = el('div', 'rv-box', `<div class="rv-title">Breaking the seal…</div><div class="rv-window"><div class="rv-reel"></div><div class="rv-marker"></div></div><div class="row rv-btns"></div><div class="rv-result"></div>`);
  wrap.appendChild(box);
  document.getElementById('app').appendChild(wrap);
  const reel = box.querySelector('.rv-reel'), win = box.querySelector('.rv-window');
  const TILE = G.touch ? 64 : 92; // reel tile width (px), as the CSS has it
  const n = 34 + Math.floor(Math.random() * 5), last = n + 3;
  for (let i = 0; i <= last; i++) {
    const r = i === n ? it.rarity : REEL[Math.floor(Math.random() * REEL.length)];
    const t = el('div', 'rv-tile', `<b>${RARITY[r].name}</b>`);
    t.style.setProperty('--rc', RARITY[r].color);
    if (i === n) { const ic = itemIcon(it, 48); const img = new Image(); img.src = ic.toDataURL(); img.draggable = false; t.prepend(img); }
    else t.prepend(el('i', 'rv-gem'));
    reel.appendChild(t);
  }
  const card = open = { wrap, box, it, spinning: true, t0: performance.now(), raf: 0 };
  const end = n * TILE + TILE / 2 + (Math.random() - 0.5) * TILE * 0.6;
  let lastTile = -1;
  const step = (now) => {
    if (open !== card) return;
    const k = Math.min(1, (now - card.t0) / 1000 / SPIN), e = 1 - Math.pow(1 - k, 4);
    const x = end * e, mid = win.clientWidth / 2;
    reel.style.transform = `translateX(${Math.round(mid - x)}px)`;
    const tile = Math.floor(x / TILE);
    if (tile !== lastTile) { lastTile = tile; sfx('critping', 0.18, 0.8 + k * 0.6); }
    if (k < 1) { card.raf = requestAnimationFrame(step); return; }
    reel.style.transform = `translateX(${Math.round(mid - (n * TILE + TILE / 2))}px)`;
    land(card, reel.children[n]);
  };
  card.raf = requestAnimationFrame(step);
  return true;
}

function land(card, tile) {
  const { box, it } = card, c = G.char, col = itemColor(it);
  card.spinning = false;
  tile.classList.add('won');
  box.style.setProperty('--rc', col);
  box.classList.add('landed', 'rv-r' + it.rarity);
  box.querySelector('.rv-title').innerHTML = `<span style="color:${col}">${RARITY[it.rarity].name.toUpperCase()}!</span>`;
  box.querySelector('.rv-result').innerHTML = itemTooltip(it);
  if (it.rarity >= 5) { sfx('boss', 0.5); sfx('levelup', 0.8); G.flash = Math.max(G.flash || 0, 0.4); }
  else if (it.rarity >= 4) { sfx('levelup', 0.7); sfx('gold', 0.8); }
  else { sfx('chest', 0.7); sfx('gold', 0.6); }
  UI.log(`The seal breaks: <span style="color:${col}">${escapeHtml(itemName(it))}</span>!`, col);
  const row = box.querySelector('.rv-btns');
  const btn = (label, fn, cls = '') => { const b = el('button', 'btn small ' + cls, label); b.onclick = (e) => { e.stopPropagation(); sfx('ui'); fn(); }; row.appendChild(b); };
  const idx = c.bag.indexOf(it);
  if (idx >= 0 && it.type === 'gear' && (it.req || 1) <= c.level) btn('Equip', () => { const i = c.bag.indexOf(it); if (i >= 0) equipFromBag(i); close(); });
  btn('Keep', close);
  const more = sealedCount(c);
  if (more) btn(`Next seal (${more})`, () => { close(); openNextSeal(); }, 'red');
  changed();
}

/** Close the card (a spin in progress just stops: the item is already unsealed). */
export function close() {
  if (!open) return;
  cancelAnimationFrame(open.raf);
  open.wrap.remove();
  open = null;
}

/** Test hook / auto-play's "open them all" (no reel). */
export function unsealAll(c = G.char) {
  let n = 0;
  for (const b of c.bag) if (b && b.sealed) { b.sealed = false; n++; }
  if (n) changed();
  return n;
}
