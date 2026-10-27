// The Altar of Heresy panel (docs/ENDGAME.md): the Heresies to switch on, the rank and what it pays, the milestones,
// and the Endgame's other doors (the Abyssal Rift gate, Velscour Unbound, the Infernal Marks).
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI } from './ui.js';
import { HERESIES, HERESY_MILESTONES, HERESY_MAX_RANK } from '../data/heresies.js';
import { heresiesOf, heresyRankOf, setHeresy, heresyRewardText } from '../game/heresies.js';
import { endgameUnlocked } from '../game/endgame.js';
import { keysOf, UNBOUND_KEYS, unboundReady } from '../game/unbound.js';
import { marksTotal, marksFree } from '../game/marks.js';
import { riftOpen } from '../game/rifts.js';

export const Heresies = {
  active: false,
  open() {
    UI.closeAll();
    this.active = true;
    sfx('ui');
    UI.openPanel('heresies', 'Altar of Heresy', (b) => this.render(b), { onClose: () => { this.active = false; }, cls: 'heresy-panel', width: 'min(640px, 94vw)' });
  },
  render(body) {
    const c = G.char, on = heresiesOf(c), rank = heresyRankOf(c), open = endgameUnlocked(c);
    body.innerHTML = '';
    if (!open) body.appendChild(el('div', 'hx-locked', '<b>Velscour still sits his throne.</b> Slay him at Depth 500 and the Heresies open for every hero on this browser.'));
    const head = el('div', 'hx-head', `<div class="hx-rank">Heresy rank <b>${rank}</b> <span class="dim">of ${HERESY_MAX_RANK}</span></div><div class="dim">${rank ? escapeHtml(heresyRewardText(rank)) : 'Embrace a Heresy for richer rewards. They take hold from the next level you enter (never in Abyssal Rifts or Velscour Unbound).'}</div>`);
    body.appendChild(head);
    const list = el('div', 'hx-list');
    for (const H of HERESIES) {
      const isOn = on.includes(H.id);
      const row = el('div', 'hx-row' + (isOn ? ' on' : '') + (open ? '' : ' locked'));
      row.innerHTML = `<label class="hx-name" style="--hc:${H.color}"><input type="checkbox" ${isOn ? 'checked' : ''} ${open ? '' : 'disabled'}><b>${escapeHtml(H.name)}</b><span class="hx-pips">${'<i></i>'.repeat(H.rank)}</span></label><div class="hx-desc dim">${escapeHtml(H.desc)}</div>`;
      row.querySelector('input').addEventListener('change', (e) => { setHeresy(H.id, e.target.checked); sfx(e.target.checked ? 'boss' : 'ui'); UI.refresh(); });
      list.appendChild(row);
    }
    body.appendChild(list);
    body.appendChild(el('div', 'hx-miles', HERESY_MILESTONES.map((m) => `<div class="hx-mile${rank >= m.rank ? ' done' : ''}"><b>Rank ${m.rank}</b> ${escapeHtml(m.text)}</div>`).join('')));
    const doors = el('div', 'hx-doors');
    const btn = (label, fn, dis) => { const b = el('button', 'btn small', label); b.disabled = !!dis; b.onclick = () => { sfx('ui'); fn(); }; return b; };
    doors.appendChild(btn(`Abyssal Rift — Tier ${riftOpen(c)} open`, () => G.game.confirmRift(), !open));
    doors.appendChild(btn(`Velscour Unbound — ${Math.min(UNBOUND_KEYS, keysOf(c))}/${UNBOUND_KEYS} Abyssal Keys`, () => G.game.enterUnbound(), !unboundReady(c)));
    doors.appendChild(btn(`Infernal Marks — ${marksTotal()} (${marksFree()} free)`, () => G.ui.marks.open(), false));
    body.appendChild(doors);
  },
};
