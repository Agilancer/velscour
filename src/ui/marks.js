// The Infernal Marks panel (docs/ENDGAME.md, game/marks.js): the points every hero shares, spent on four categories.
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI } from './ui.js';
import { CATS, marksTotal, marksFree, marksIn, bonusAt, spendMark, resetMarks, autoSpend, markXp } from '../game/marks.js';
import { endgame } from '../game/endgame.js';
import { MARK_CATS } from '../game/endgame.js';

export const Marks = {
  active: false,
  open() {
    UI.closeAll();
    this.active = true;
    sfx('ui');
    UI.openPanel('marks', 'Infernal Marks', (b) => this.render(b), { onClose: () => { this.active = false; }, cls: 'marks-panel', width: 'min(560px, 94vw)' });
  },
  render(body) {
    const free = marksFree(), xp = endgame().marks.xp;
    body.innerHTML = '';
    body.appendChild(el('div', 'mk-head', `<b>${marksTotal()}</b> Marks · <b>${free}</b> free <span class="dim">· next from XP: ${Math.floor((xp / markXp()) * 100)}%</span><div class="dim">Earned by XP past the level cap, Abyssal Rift clears and Heresy rank 20; shared by every hero on this browser. Each category's bonus grows ever more slowly.</div>`));
    for (const k of MARK_CATS) {
      const C = CATS[k], n = marksIn(k), now = bonusAt(k, n), next = bonusAt(k, n + 1);
      const row = el('div', 'mk-row', `<div class="mk-name" style="color:${C.color}"><b>${escapeHtml(C.name)}</b> <span class="dim">${escapeHtml(C.desc)}</span></div><div class="mk-val"><b>${n}</b> pts · +${now}${escapeHtml(C.unit)} <span class="dim">(next +${(next - now).toFixed(2)}, at most +${C.cap})</span></div>`);
      const b = el('button', 'btn small', '+1'); b.disabled = !free; b.onclick = () => { spendMark(k); sfx('ui'); UI.refresh(); };
      const b5 = el('button', 'btn small', '+5'); b5.disabled = free < 5; b5.onclick = () => { spendMark(k, 5); sfx('ui'); UI.refresh(); };
      row.append(b, b5);
      body.appendChild(row);
    }
    const foot = el('div', 'mk-foot');
    const all = el('button', 'btn small', 'Spend all (balanced)'); all.disabled = !free; all.onclick = () => { autoSpend(); sfx('levelup', 0.4); UI.refresh(); };
    const reset = el('button', 'btn small', 'Reset (free)'); reset.disabled = !(marksTotal() - free); reset.onclick = () => { resetMarks(); sfx('ui'); UI.refresh(); };
    foot.append(all, reset);
    body.appendChild(foot);
  },
};
