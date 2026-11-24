// TESSARIEL'S KEEP's panel (docs/TESSARIELS_KEEP.md): the Castellan's Sagas, the daily Bounties, the Deeds, the Ember
// trade, the weekly Vault of the Flame, Furnish (banners, windows, rugs, trophies), the Chronicle of Deeds (every hero's
// records) and the War Table (your other heroes' expeditions). One panel, tabs across its top; a row per thing.
import { G } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, sparkle, floatText } from '../gfx/vfx.js';
import { UI } from './ui.js';
import { itemCell, itemTooltip } from './itemui.js';
import { changed } from './inventory.js';
import { addToBag } from '../game/player.js';
import { CLASSES } from '../data/classes.js';
import { RARITY, SLOT_NAMES } from '../data/items.js';
import {
  SAGAS, CHALLENGES, CHALLENGE_GROUPS, TROPHIES, TROPHY_BY_ID, DECOR, TRADE, TRADE_SLOTS, VAULT_STEPS, EXPEDITIONS, KINDLE,
  RENOWN_MAX, RENOWN_TITLES, renownNeed, renownRank, renownBonus, EMBER_COLOR, decorSources, trophySources, questCount,
} from '../data/keep.js';
import {
  keepState, sagaList, takeSaga, progressOf, bountyBoard, bountyText, challengeName, challengeText, metricValue, claimAll, hasDecor,
  setDecor, tradeLevel, tradeOpen, buyArmor, vaultState, vaultOffer, claimVault, sendExpedition, expeditionDone, collectExpedition, kindled,
  kindleReadyIn, today,
} from '../game/keep.js';
import { companionsOf } from '../game/keepfolk.js';
import { keepArt, trophySprite } from '../gfx/keepart.js';
import { keepProps } from '../world/keepworld.js';

const TABS = [['sagas', 'Sagas'], ['bounties', 'Bounties'], ['deeds', 'Deeds'], ['trade', 'Ember Trade'], ['vault', 'Vault'], ['furnish', 'Furnish'], ['chronicle', 'Chronicle'], ['war', 'War Table']];
const bar = (have, need, col = EMBER_COLOR) => `<div class="kp-bar"><div style="width:${Math.min(100, (100 * have) / Math.max(1, need))}%;background:${col}"></div><span>${fmtInt(have)} / ${fmtInt(need)}</span></div>`;
const fmtT = (s) => (s == null ? '—' : s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${(Math.round(s * 10) / 10).toFixed(1)}s`);
const ember = (n) => `<b class="kp-ember">${fmtInt(n)}</b>`;

/** A thumbnail canvas of a decoration (atlas rect) or trophy (baked sprite), fitted to w x h. */
function thumb(kind, id, w = 52, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'kp-thumb';
  const x = c.getContext('2d'), A = keepArt();
  const fit = (img, sx, sy, sw, sh) => { const k = Math.min(w / sw, h / sh) * 0.92; x.drawImage(img, sx, sy, sw, sh, (w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k); };
  if (kind === 'pedestal' || kind === 'trophy') {
    const T = TROPHY_BY_ID[id], r = T && trophySprite(T.art);
    if (r) fit(r.spr.img, r.spr.sx, r.spr.sy, r.spr.w, r.spr.h);
    return c;
  }
  if (!A) return c;
  const list = kind === 'banner' ? A.meta.banners : kind === 'glass' ? A.meta.glass : A.meta.rugs, m = list.find((d) => d.id === id);
  const img = kind === 'banner' ? A.banners : kind === 'glass' ? A.glass : A.rugs;
  if (m) fit(img, ...m.r);
  return c;
}

export const KeepUI = {
  tab: 'sagas', sel: null, group: null,
  open(tab = this.tab, opts = {}) {
    UI.closeAll();
    this.tab = tab;
    if (opts.pedestal != null) this.sel = { kind: 'pedestal', slot: opts.pedestal };
    sfx('ui');
    UI.openPanel('keep', "Tessariel's Keep", (b) => this.render(b), { cls: 'keep-panel', width: 'min(760px, 96vw)', onClose: () => {} });
  },
  close() { UI.closePanel('keep'); },
  render(body) {
    const c = G.char, k = keepState(c);
    if (!c || !k) return;
    const scroll = body.scrollTop;
    body.innerHTML = '';
    // the head: Embers, Renown and its bar, the Flame, rewards waiting
    const rank = renownRank(k.renown), nextNeed = rank < RENOWN_MAX ? renownNeed(rank + 1) : null, b = renownBonus(rank);
    const head = el('div', 'kp-head');
    head.innerHTML = `<div class="kp-embers"><span>Sacred Embers</span>${ember(k.embers)}</div>
      <div class="kp-renown"><span>Renown <b>${rank}</b> · ${escapeHtml(RENOWN_TITLES[rank])}</span>${nextNeed ? bar(k.renown - renownNeed(rank), nextNeed - renownNeed(rank), '#e8c870') : '<i>The highest rank.</i>'}
      <small>Always on: +${b.gf}% gold · +${b.mf} magic find · +${b.xp}% XP${kindled(c) ? ` · <b style="color:${EMBER_COLOR}">Kindled</b>` : ''}</small></div>`;
    if (k.owed.length) {
      const claim = el('button', 'btn red kp-claim', `Claim ${k.owed.length} reward${k.owed.length > 1 ? 's' : ''}`);
      claim.onclick = () => this.claim();
      head.appendChild(claim);
    }
    body.appendChild(head);
    const tabs = el('div', 'kp-tabs');
    for (const [id, label] of TABS) {
      const t = el('button', 'kp-tab' + (this.tab === id ? ' on' : ''), label);
      t.onclick = () => { this.tab = id; this.sel = id === 'furnish' ? this.sel : null; sfx('ui'); this.render(body); };
      tabs.appendChild(t);
    }
    body.appendChild(tabs);
    const page = el('div', 'kp-page');
    ({ sagas: () => this.sagas(page, c, k), bounties: () => this.bounties(page, c, k), deeds: () => this.deeds(page, c, k), trade: () => this.trade(page, c, k),
      vault: () => this.vault(page, c, k), furnish: () => this.furnish(page, c, k), chronicle: () => this.chronicle(page, c, k), war: () => this.war(page, c, k) })[this.tab]?.();
    body.appendChild(page);
    body.scrollTop = scroll;
  },
  refresh() { UI.refresh(); },

  claim() {
    const got = claimAll(G.char);
    if (!got.length) return;
    const g = got[0];
    sfx('levelup', 0.6);
    UI.log(`The Castellan pays for ${g.n} deed${g.n > 1 ? 's' : ''}: <b style="color:${EMBER_COLOR}">+${g.embers} Embers</b>, +${g.renown} Renown${g.gold ? `, <b style="color:#ffd34a">+${fmtInt(g.gold)} gold</b>` : ''}.`, '#e0f0c0');
    if (g.rankUp) UI.centerMsg('RENOWN ' + g.rankUp, RENOWN_TITLES[g.rankUp], 3);
    for (const r of got.slice(1)) {
      if (r.trophy) UI.log(`A new trophy for the hall: <b style="color:#ffe0a0">${escapeHtml(TROPHY_BY_ID[r.trophy].name)}</b>.`, '#ffe0a0');
      if (r.decor) { const d = DECOR[r.decor[0]].find((q) => q.id === r.decor[1]); UI.log(`A new ${r.decor[0] === 'glass' ? 'window' : r.decor[0]} to hang: <b style="color:#d8e8ff">${escapeHtml(d ? d.name : r.decor[1])}</b> (Furnish).`, '#d8e8ff'); }
    }
    rebuildDecor();
    claimCeremony(got);
    G.game?.autosave?.(); this.refresh(); UI.refresh();
  },

  // ---------------------------------------------------------------- tabs
  sagas(page, c, k) {
    const n = questCount();
    page.appendChild(el('div', 'kp-note', `The Castellan's Sagas: ${SAGAS.length} lines, ${n.sagas} chapters. A chapter counts from the moment it is taken; finish it anywhere and its reward waits here.`));
    for (const s of sagaList(c)) {
      const S = s.saga, row = el('div', 'kp-row' + (s.open ? '' : ' locked') + (s.done ? ' done' : ''));
      row.style.setProperty('--kc', S.color);
      let h = `<div class="kp-title"><b>${escapeHtml(S.name)}</b><span class="dim"> · ${escapeHtml(S.giver)} · ${s.done ? 'complete' : s.taken ? `chapter ${s.ch + 1} of ${S.ch.length}` : s.open ? `${S.ch.length} chapters` : `opens at Depth ${S.min}`}</span></div>`;
      if (!s.taken) h += `<div class="kp-text">${escapeHtml(S.pitch)}</div>`;
      else if (!s.done) {
        const st = k.sagas[S.id], q = S.ch[st.ch], [have, need] = progressOf(c, q, st.base);
        h += `<div class="kp-text">${escapeHtml(q.text)}${q.trophy ? ` <span class="kp-prize">Trophy: ${escapeHtml(TROPHY_BY_ID[q.trophy].name)}</span>` : ''}</div>${bar(have, need, S.color)}`;
      } else h += '<div class="kp-text dim">Every chapter told. Its trophies stand in the hall.</div>';
      row.innerHTML = h;
      if (s.open && !s.taken) { const t = el('button', 'btn small', 'Take it up'); t.onclick = () => { takeSaga(S.id, c); sfx('ui'); G.game?.autosave?.(); this.refresh(); }; row.appendChild(t); }
      page.appendChild(row);
    }
  },
  bounties(page, c, k) {
    const list = bountyBoard(c), left = 86400000 - (Date.now() % 86400000);
    page.appendChild(el('div', 'kp-note', `Today's board: three bounties, new ones in ${fmtT(left / 1000)}. Each pays ${ember(8)} Embers and Renown.`));
    for (const b of list) {
      const have = Math.min(b.n, metricValue(c, b.m) - b.base), row = el('div', 'kp-row' + (b.done ? ' done' : ''));
      row.innerHTML = `<div class="kp-title"><b>${b.done ? '✓ ' : ''}${escapeHtml(bountyText(b))}</b></div>${bar(b.done ? b.n : have, b.n, '#c8a050')}`;
      page.appendChild(row);
    }
    void k;
  },
  deeds(page, c, k) {
    const groups = CHALLENGE_GROUPS, g = this.group || groups[0], done = CHALLENGES.filter((q) => k.done[q.id]).length;
    page.appendChild(el('div', 'kp-note', `Deeds count on their own, from the day the keep opened its doors (kills, depths and levels from the hero's whole life). <b>${done} / ${CHALLENGES.length}</b> done.`));
    const chips = el('div', 'kp-chips');
    for (const gr of groups) { const n = CHALLENGES.filter((q) => q.group === gr), d = n.filter((q) => k.done[q.id]).length; const t = el('button', 'kp-chip' + (gr === g ? ' on' : ''), `${gr} <i>${d}/${n.length}</i>`); t.onclick = () => { this.group = gr; this.refresh(); }; chips.appendChild(t); }
    page.appendChild(chips);
    for (const q of CHALLENGES.filter((q) => q.group === g)) {
      const v = metricValue(c, q.m), isDone = !!k.done[q.id], row = el('div', 'kp-row slim' + (isDone ? ' done' : ''));
      const prize = q.trophy ? ` <span class="kp-prize">Trophy: ${escapeHtml(TROPHY_BY_ID[q.trophy].name)}</span>` : q.decor ? ` <span class="kp-prize">${q.decor[0] === 'glass' ? 'Window' : q.decor[0][0].toUpperCase() + q.decor[0].slice(1)}: ${escapeHtml(DECOR[q.decor[0]].find((d) => d.id === q.decor[1]).name)}</span>` : '';
      row.innerHTML = `<div class="kp-title"><b>${isDone ? '✓ ' : ''}${escapeHtml(challengeName(q))}</b> <span class="dim">${escapeHtml(challengeText(q))}</span> <span class="kp-pay">${ember(q.embers)}</span>${prize}</div>${isDone ? '' : bar(Math.min(v, q.n), q.n, '#8ab0e0')}`;
      page.appendChild(row);
    }
  },
  trade(page, c, k) {
    const il = tradeLevel(c);
    page.appendChild(el('div', 'kp-note', `The keep's smiths forge armour of your own level (item level <b>${il}</b>) for Embers. A Legendary may come out of the fire <b style="color:${RARITY[5].color}">Mythic</b> (1 in 10, from item level ${RARITY[5].minIlvl}). Rarities unlock by item level as they do in the deep.`));
    const grid = el('div', 'kp-trade');
    for (let i = 0; i < TRADE.length; i++) {
      const T = TRADE[i], R = RARITY[T.rarity], row = el('div', 'kp-trow');
      const open = tradeOpen(i, c);
      row.innerHTML = `<div class="kp-tname" style="color:${R.color}">${R.name}</div><div class="kp-tcost">${ember(T.cost)}</div>${open ? '' : `<span class="dim">opens at item level ${R.minIlvl} (yours: ${il})</span>`}`;
      for (const slot of open ? TRADE_SLOTS : []) {
        const bt = el('button', 'btn small', SLOT_NAMES[slot]);
        bt.disabled = k.embers < T.cost;
        bt.onclick = () => {
          const it = buyArmor(i, slot, c, addToBag);
          if (!it) { UI.log(k.embers < T.cost ? 'Not enough Embers.' : 'Inventory full.', '#ff8080'); sfx('error'); return; }
          sfx('gold'); changed();
          UI.log(`The smiths hand you <b style="color:${RARITY[it.rarity].color}">${escapeHtml(it.title || it.uname || it.baseName || SLOT_NAMES[slot])}</b> (${RARITY[it.rarity].name}, item level ${it.ilvl}).${it.rarity === 5 ? ' It came out of the fire <b>Mythic</b>!' : ''}`, RARITY[it.rarity].color);
          G.game?.autosave?.(); this.refresh();
        };
        row.appendChild(bt);
      }
      grid.appendChild(row);
    }
    page.appendChild(grid);
    page.appendChild(el('div', 'kp-note dim', 'Embers come from Sagas, Bounties and Deeds, and from the War Table.'));
  },
  vault(page, c, k) {
    const v = vaultState(c);
    page.appendChild(el('div', 'kp-note', `The Vault of the Flame opens once a week. Every reward you claim this week is a mark on its door: ${VAULT_STEPS.map((s, i) => `<b>${s}</b> marks for ${i + 1} choice${i ? 's' : ''}`).join(', ')}. Take one Legendary piece of your level (sometimes Mythic).`));
    page.appendChild(el('div', 'kp-row', `<div class="kp-title"><b>${v.marks} mark${v.marks === 1 ? '' : 's'}</b> this week${v.claimed ? ' · <span class="dim">claimed: it opens again next week</span>' : v.next ? ` · <span class="dim">${v.next - v.marks} more for the next choice</span>` : ''}</div>${bar(Math.min(v.marks, VAULT_STEPS[2]), VAULT_STEPS[2], '#e8c870')}`));
    if (!v.claimed && v.picks) {
      const grid = el('div', 'kp-vault');
      vaultOffer(c).forEach((it, i) => {
        const cell = el('div', 'kp-vcell'), ic = itemCell(it);
        UI.tip(ic, () => itemTooltip(it));
        cell.appendChild(ic);
        const take = el('button', 'btn small red', 'Take this');
        take.onclick = () => { const got = claimVault(i, c, addToBag); if (!got) { UI.log('Inventory full.', '#ff8080'); sfx('error'); return; } sfx('levelup', 0.5); changed(); G.game?.autosave?.(); this.refresh(); };
        cell.appendChild(take); grid.appendChild(cell);
      });
      page.appendChild(grid);
    }
    void k;
  },
  furnish(page, c, k) {
    const kinds = [['banner', 'Banners', 14], ['glass', 'Windows', 10], ['rug', 'Rugs', 3], ['pedestal', 'Trophies', 16]];
    const sel = this.sel || (this.sel = { kind: 'banner', slot: 0 });
    page.appendChild(el('div', 'kp-note', 'Choose a place, then what hangs or stands there. New designs come from Sagas and Deeds; the trophies you win stand on the pedestals (the four Elder Dragons have plinths of their own round the Flame).'));
    const chips = el('div', 'kp-chips');
    for (const [kind, label] of kinds) { const t = el('button', 'kp-chip' + (sel.kind === kind ? ' on' : ''), label); t.onclick = () => { this.sel = { kind, slot: 0 }; this.refresh(); }; chips.appendChild(t); }
    page.appendChild(chips);
    const [, , n] = kinds.find((q) => q[0] === sel.kind);
    const slots = el('div', 'kp-slots');
    for (let i = 0; i < n; i++) {
      const id = k.decor[sel.kind][i], b = el('button', 'kp-slot' + (sel.slot === i ? ' on' : ''));
      b.appendChild(id ? thumb(sel.kind, id, 34, 44) : el('span', 'kp-empty', '—'));
      b.title = `${sel.kind === 'pedestal' ? 'Pedestal' : sel.kind === 'glass' ? 'Window' : sel.kind[0].toUpperCase() + sel.kind.slice(1)} ${i + 1}`;
      b.onclick = () => { sel.slot = i; this.refresh(); };
      slots.appendChild(b);
    }
    page.appendChild(slots);
    const choices = el('div', 'kp-choices'), src = sel.kind === 'pedestal' ? trophySources() : decorSources();
    const list = sel.kind === 'pedestal' ? TROPHIES.filter((t) => !t.plinth) : DECOR[sel.kind];
    if (sel.kind === 'pedestal') { const none = el('button', 'kp-choice', '<span class="kp-empty">Empty</span><b>Leave it bare</b>'); none.onclick = () => { setDecor('pedestal', sel.slot, null, c); rebuildDecor(); this.refresh(); }; choices.appendChild(none); }
    for (const d of list) {
      const owned = sel.kind === 'pedestal' ? k.have.trophy.includes(d.id) : hasDecor(c, sel.kind, d.id), on = k.decor[sel.kind][sel.slot] === d.id;
      const b = el('button', 'kp-choice' + (owned ? '' : ' locked') + (on ? ' on' : ''));
      b.appendChild(thumb(sel.kind, d.id, 46, 58));
      b.appendChild(el('b', '', escapeHtml(d.name)));
      if (!owned) b.appendChild(el('small', '', 'Earned by: ' + escapeHtml((src[sel.kind === 'pedestal' ? d.id : sel.kind + ':' + d.id] || ['?'])[0])));
      b.disabled = !owned;
      b.onclick = () => { if (setDecor(sel.kind, sel.slot, d.id, c)) { sfx('ui'); rebuildDecor(); G.game?.autosave?.(); this.refresh(); } };
      choices.appendChild(b);
    }
    page.appendChild(choices);
  },
  chronicle(page, c) {
    page.appendChild(el('div', 'kp-note', 'The Chronicle of Deeds, in Mother Agatha\'s hand: every hero of this keep, their depths and their best times. Times count from stepping into a level to opening its way on.'));
    const heroes = [{ save: c, me: true }, ...companionsOf(c).map((h) => ({ save: h.save }))];
    const rows = heroes.map(({ save: h, me }) => {
      const R = (h.keep && h.keep.rec) || {}, tr = (h.keep && h.keep.have && h.keep.have.trophy.length) || 0;
      return `<tr class="${me ? 'me' : ''}"><td><b>${escapeHtml(h.name)}</b><br><span class="dim">${escapeHtml(CLASSES[h.classId]?.name || h.classId)}</span></td><td>${h.level || 1}</td><td>${h.deepest || 0}</td><td>${fmtInt(h.kills || 0)}</td>
        <td>${h.breach?.best || 0}</td><td>${h.rifts?.best || 0}</td><td>${fmtT(R.clear?.t)}</td><td>${fmtT(R.raid?.t)}</td><td>${tr}</td></tr>`;
    });
    page.appendChild(el('div', 'kp-chron', `<table><thead><tr><th>Hero</th><th>Level</th><th>Depth</th><th>Slain</th><th>Breach</th><th>Rift</th><th>Fastest depth</th><th>Fastest BOSS ROOM</th><th>Trophies</th></tr></thead><tbody>${rows.join('')}</tbody></table>`));
    // the hall's records, the best of all heroes
    const best = (f, low = true) => { let b = null; for (const { save: h } of heroes) { const v = f(h); if (v == null) continue; if (!b || (low ? v < b.v : v > b.v)) b = { v, h }; } return b; };
    const rec = [
      ['Fastest depth cleared', best((h) => h.keep?.rec?.clear?.t), fmtT], ['Fastest BOSS ROOM', best((h) => h.keep?.rec?.raid?.t), fmtT], ['Fastest overworld trial', best((h) => h.keep?.rec?.region?.t), fmtT],
      ['Deepest descent', best((h) => h.deepest || 0, false), (v) => 'Depth ' + v], ['Highest Breach floor', best((h) => h.breach?.best || 0, false), (v) => 'Floor ' + v],
      ['Highest Rift tier', best((h) => h.rifts?.best || 0, false), (v) => 'Tier ' + v], ['Most slain', best((h) => h.kills || 0, false), fmtInt],
    ];
    page.appendChild(el('div', 'kp-records', rec.map(([label, b, f]) => `<div><span>${label}</span><b>${b && b.v ? f(b.v) : '—'}</b><i>${b && b.v ? escapeHtml(b.h.name) : ''}</i></div>`).join('')));
  },
  war(page, c, k) {
    const comps = companionsOf(c), now = Date.now();
    page.appendChild(el('div', 'kp-note', `The War Table: send your other heroes on the keep's errands. They are gone in real time (they leave the hall while away) and bring back Embers, gold and gems. ${comps.length ? '' : '<b>You have no other heroes yet: make one of another class on the hero screen and they will stand in this hall.</b>'}`));
    for (const h of comps) {
      const e = k.exp.find((q) => q.cls === h.cls), row = el('div', 'kp-row');
      let s = `<div class="kp-title"><b>${escapeHtml(h.name)}</b> <span class="dim">· ${escapeHtml(CLASSES[h.cls]?.name || h.cls)} · level ${h.lvl}</span></div>`;
      if (e) {
        const E = EXPEDITIONS.find((q) => q.id === e.id), done = expeditionDone(e);
        s += `<div class="kp-text">${escapeHtml(E ? `${E.name}, ${E.where}` : e.id)} — ${done ? '<b style="color:#c8f060">back home</b>' : `back in ${fmtT((e.end - now) / 1000)}`}</div>${bar(Math.min(e.end, now) - e.start, e.end - e.start, '#c8a050')}`;
        row.innerHTML = s;
        if (done) { const b = el('button', 'btn small red', 'Bring them home'); b.onclick = () => { const r = collectExpedition(h.cls, c, addToBag); if (r) { sfx('gold'); UI.log(`${escapeHtml(h.name)} is back from "${escapeHtml(r.name)}": <b style="color:${EMBER_COLOR}">+${r.embers} Embers</b>, <b style="color:#ffd34a">+${fmtInt(r.gold)} gold</b>${r.gems.length ? `, ${r.gems.length} gem${r.gems.length > 1 ? 's' : ''}` : ''}.`, '#e0f0c0'); changed(); G.game?.autosave?.(); } this.refresh(); }; row.appendChild(b); }
      } else {
        row.innerHTML = s;
        const opts = el('div', 'kp-exps');
        for (const E of EXPEDITIONS) {
          const b = el('button', 'btn small', `${E.name} <i>${E.min >= 60 ? E.min / 60 + 'h' : E.min + 'm'} · ${E.embers} Embers</i>`);
          b.disabled = h.lvl < E.lvl; if (h.lvl < E.lvl) b.title = `Needs level ${E.lvl}`;
          b.onclick = () => { if (sendExpedition(h.cls, h.lvl, E.id, c)) { sfx('ui'); UI.log(`${escapeHtml(h.name)} sets out: ${escapeHtml(E.name)}, ${escapeHtml(E.where)}.`, '#d8d0c0'); hideHero(h.cls); G.game?.autosave?.(); } this.refresh(); };
          opts.appendChild(b);
        }
        row.appendChild(opts);
      }
      page.appendChild(row);
    }
    const kin = el('div', 'kp-row');
    kin.innerHTML = `<div class="kp-title"><b>The Sacred Flame</b> <span class="dim">· kneel at it in the hall</span></div><div class="kp-text">${kindled(c) ? `<b style="color:${EMBER_COLOR}">Kindled</b> for ${fmtT((c.keep.kindled.until - now) / 1000)} more` : kindleReadyIn(c) > 0 ? `Resting: ready in ${fmtT(kindleReadyIn(c) / 1000)}` : 'Ready'}: +${KINDLE.xp}% XP, +${KINDLE.gf}% gold, +${KINDLE.mf} magic find for ${KINDLE.minutes} minutes, once an hour.</div>`;
    page.appendChild(kin);
    void today;
  },
};

/** Rewards paid in the hall: Embers stream from the Castellan to the hero, the Flame leaps, every new trophy is
 *  unveiled in a ring of light with its name over it. */
function claimCeremony(got) {
  const w = G.world, p = w && w.player;
  if (!w || !w.keep || !p) return;
  const cas = w.keepFolk && w.keepFolk.castellan;
  w.flameSurge = Math.max(w.flameSurge || 0, 0.8);
  if (cas) sparkle(cas.x, cas.y, 50, '#c8f060', 26, 1);
  sparkle(p.x, p.y, 40, '#fff0a0', 30, 1.1);
  addEffect(new Ring(p.x, p.y, 0.2, 2.2, 0.8, '#c8f060', 3));
  if (got[0] && got[0].embers) floatText(p.x, p.y, 70, `+${got[0].embers} Embers`, EMBER_COLOR, 15);
  let i = 0;
  for (const pr of w.props) {
    if (!pr.trophy || !got.some((g) => g.trophy === pr.trophy)) continue;
    addEffect(new Ring(pr.x, pr.y, 0.2, 2.4, 1.2 + i * 0.15, '#ffe8a0', 3));
    sparkle(pr.x, pr.y, 46, '#ffe8a0', 34, 1.4);
    floatText(pr.x, pr.y, 96, TROPHY_BY_ID[pr.trophy].name, '#ffe0a0', 13);
    i++;
  }
}

/** The hall shows a change of decoration at once: its props rebuilt, its floor (rugs) baked again. */
export function rebuildDecor() {
  const w = G.world, k = keepState();
  if (!w || !w.keep || !k) return;
  const keepOthers = w.props.filter((p) => !p.keepDecor);
  w.props = keepOthers.concat(keepProps(w, k.decor, k.have));
  w.floorChunks = null; w.floorChunksFlux = null; w._propReach = null;
}
/** A hero sent on an expedition leaves the hall. */
function hideHero(cls) {
  const w = G.world;
  if (!w || !w.keep) return;
  w.npcs = w.npcs.filter((n) => !(n.keepHero && n.cls === cls));
  if (w.keepFolk) w.keepFolk.heroes = w.keepFolk.heroes.filter((n) => n.cls !== cls);
}
