// "Skill Up!" card: a little panel that slides in when a skill gains a rank, its icon bursting with the class colour.
// Ranks 5/10/15/20 also announce the skill's new effect tier (gfx/classfx.js makes its particles wilder there).
import { escapeHtml } from '../core/util.js';
import { skillIconURL } from './icons.js';
import { CLASSES } from '../data/classes.js';
import { MAX_SKILL_LEVEL } from '../data/skills.js';
import { tierName } from '../gfx/classfx.js';

let css = false;
function style() {
  if (css) return; css = true;
  const s = document.createElement('style');
  s.textContent = `
#skillups{position:fixed;right:16px;top:40%;display:flex;flex-direction:column;gap:6px;align-items:flex-end;pointer-events:none;z-index:60}
.skup{display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;min-width:220px;border:2px solid var(--c);border-radius:6px;
 background:linear-gradient(180deg,rgba(28,18,12,.94),rgba(10,6,4,.94));box-shadow:0 0 18px var(--c),inset 0 0 12px rgba(0,0,0,.8);
 font-family:inherit;color:#f0e0c0;animation:skin .35s cubic-bezier(.2,1.6,.4,1) both, skout .4s ease-in 2.6s forwards}
.skup img{width:40px;height:40px;image-rendering:pixelated;border:1px solid #000;animation:skglow .9s ease-in-out infinite alternate}
.skup .t{font-size:11px;letter-spacing:2px;color:var(--c);text-transform:uppercase;text-shadow:0 0 6px var(--c)}
.skup .n{font-size:15px;font-weight:bold}.skup .r{font-size:12px;color:#d8c8a0}.skup .r b{color:#fff}.skup .x{font-size:11px;color:#ffe080;text-shadow:0 0 6px #ff9020}
@keyframes skin{from{opacity:0;transform:translateY(-14px) scale(.7)}to{opacity:1;transform:none}}
@keyframes skout{to{opacity:0;transform:translateY(-10px) scale(.95)}}
@keyframes skglow{from{box-shadow:0 0 4px var(--c)}to{box-shadow:0 0 14px var(--c),0 0 4px #fff}}
@media (max-height:500px){#skillups{top:22%}.skup{min-width:180px;padding:5px 12px 5px 5px}.skup img{width:30px;height:30px}}`;
  document.head.appendChild(s);
}

/** Show the card for skill `sk` reaching rank `L`. */
export function skillUp(sk, L) {
  if (typeof document === 'undefined') return;
  style();
  let box = document.getElementById('skillups');
  if (!box) { box = document.createElement('div'); box.id = 'skillups'; document.body.appendChild(box); }
  while (box.children.length >= 3) box.firstChild.remove();
  const c = (CLASSES[sk.classId] && CLASSES[sk.classId].color) || '#ffd860';
  const tier = L % 5 === 0 ? tierName(L) : '';
  const d = document.createElement('div');
  d.className = 'skup'; d.style.setProperty('--c', c);
  d.innerHTML = `<img src="${skillIconURL(sk)}"><div><div class="t">${L === 1 ? 'Skill Learned' : L >= MAX_SKILL_LEVEL ? 'Skill Mastered!' : 'Skill Up!'}</div>`
    + `<div class="n">${escapeHtml(sk.name)}</div><div class="r">Rank <b>${L}</b>${L > 1 ? ` <span style="color:#80ff80">(+1)</span>` : ''}</div>`
    + (tier ? `<div class="x">✦ ${tier} effects unlocked ✦</div>` : '') + '</div>';
  box.appendChild(d);
  setTimeout(() => d.remove(), 3100);
}
