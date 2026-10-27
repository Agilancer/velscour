// The Abyssal Rift gate's dialogs (docs/ENDGAME.md): the tier to enter, the results of a closed rift, and the honour
// board (game/leaderboard.js).
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI } from './ui.js';
import { CLASSES } from '../data/classes.js';
import { RARITY } from '../data/items.js';
import { riftDepth, riftLevel, fmtTime } from '../data/rifts.js';
import { riftOpen, riftTime } from '../game/rifts.js';
import { endgame } from '../game/endgame.js';
import { Board } from '../game/leaderboard.js';
import { Cloud } from '../game/cloud.js';

export const Rifts = {
  /** The gate: pick a tier (1 .. the tier the hero's wins opened) and step in. */
  open(tier) {
    const c = G.char, top = riftOpen(c), pick = Math.min(top, Math.max(1, tier || top));
    const opt = (n) => {
      const L = riftLevel(n), best = c.rifts.bestTime[n];
      return `<option value="${n}"${n === pick ? ' selected' : ''}>Tier ${n} — as deadly as Depth ${riftDepth(n)} (monster level ${L})${best ? ` · best ${fmtTime(best)}` : n === top ? ' · new' : ''}</option>`;
    };
    const tiers = [];
    for (let n = top; n >= 1; n--) tiers.push(opt(n));
    const d = UI.dialog({
      title: 'ABYSSAL RIFT', cls: 'rift-dialog',
      html: `<p>The gate opens on <b style="color:#20e0ff">a rift torn in the abyss</b>: a short dungeon and its arena, against the clock.</p>
        <p class="dim">Slay 70% of the rift's monsters to wake the Guardian, then slay it before <b>${fmtTime(riftTime())}</b> runs out. Finish in half the time and the win opens three tiers; in 80%, two; else one. Tier N is as deadly as Depth 500 + 10 N. Falling here costs no Defiance and leaves your descent where it is.</p>
        <label class="velscour-message-label" for="rift-tier">Tier</label><select id="rift-tier" class="velscour-biome-select">${tiers.join('')}</select>
        <p class="breach-warn" id="rift-warn"></p>`,
      buttons: [{ label: 'Not yet' }, { label: 'Honour Board', keepOpen: true, fn: () => this.board() }, { label: 'Enter the Rift', cls: 'red', fn: () => G.game.enterRift(+d.box.querySelector('#rift-tier').value) }],
    });
    const sel = d.box.querySelector('#rift-tier'), warn = d.box.querySelector('#rift-warn');
    const upd = () => { const L = riftLevel(+sel.value); warn.innerHTML = L > c.level + 4 ? `<b style="color:#ff6050">Monsters there are level ${L}; you are level ${c.level}. Expect to die.</b>` : ''; };
    sel.addEventListener('change', upd); upd();
    return d;
  },
  /** A closed rift: what it paid, and on to the next tier or home. */
  results(R, o) {
    const r = R.result || {};
    UI.dialog({
      title: `Rift Tier ${R.tier} Closed`, cls: 'rift-dialog',
      html: `<p><b style="color:#20e0ff">${fmtTime(r.time || R.t)}</b> of ${fmtTime(R.limit)} · +${r.jump || 1} tier${(r.jump || 1) > 1 ? 's' : ''} opened (Tier ${o.next} next) · +${r.marks || 0} Infernal Mark${(r.marks || 0) === 1 ? '' : 's'}${r.rarity !== undefined ? ` · a <b style="color:${RARITY[r.rarity].color}">${RARITY[r.rarity].name}</b> prize` : ''}${r.best ? ' · <b>a new best</b>' : ''}</p>`,
      buttons: [{ label: 'Return to Town', fn: o.onTown }, { label: `On to Tier ${o.next}`, cls: 'red', fn: o.onNext }],
    });
  },
  /** The honour board: the best rift per class, from Firestore (signed in) and this browser's own bests. */
  async board(cls = G.char ? G.char.classId : 'paladin') {
    const d = UI.dialog({ title: 'HONOUR BOARD', cls: 'rift-board', html: `<div class="rb-head"><select class="velscour-biome-select" id="rb-cls">${Object.values(CLASSES).map((C) => `<option value="${C.id}"${C.id === cls ? ' selected' : ''}>${escapeHtml(C.name)}</option>`).join('')}</select></div><div class="rb-list dim">Loading…</div>`, buttons: [{ label: 'Close' }] });
    const list = d.box.querySelector('.rb-list'), sel = d.box.querySelector('#rb-cls');
    const fill = async () => {
      const id = sel.value, mine = endgame().bests[id];
      list.innerHTML = 'Loading…';
      let rows = [];
      try { rows = await Board.top(id); } catch (e) { console.warn(e); }
      let h = `<div class="rb-row rb-mine"><span>Yours</span><b>${mine ? `Tier ${mine.tier} · ${fmtTime(mine.time)}` : 'no rift closed yet'}</b></div>`;
      if (!Cloud.signedIn) h += '<div class="dim">Sign in with Google in Settings to be listed.</div>';
      h += rows.length ? rows.map((e, i) => `<div class="rb-row${Cloud.uid === e.uid ? ' rb-mine' : ''}"><span>${i + 1}. ${escapeHtml(e.name || 'Hero')}</span><b>Tier ${e.tier} · ${fmtTime(e.time)}</b><i class="dim">lvl ${e.level | 0}</i></div>`).join('') : '<div class="dim">Nobody listed yet.</div>';
      list.innerHTML = h;
    };
    sel.addEventListener('change', fill);
    await fill();
    return d;
  },
};
