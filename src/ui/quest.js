// Quest Log (HUD button "Quest", key Q): this depth's objectives, the road to Velscour, boss rooms conquered.
import { G } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { UI } from './ui.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { isRaidDepth } from '../world/dungeon.js';

const step = (done, html) => `<div class="q-step${done ? ' done' : ''}"><i>${done ? '&#10004;' : '&#9670;'}</i><span>${html}</span></div>`;
const nextRaid = (d) => { let n = Math.max(5, Math.ceil(d / 5) * 5); if (n === 100) n = 105; return n; };

export function renderQuest(body) {
  const c = G.char, w = G.world;
  if (!c) return;
  body.innerHTML = '';
  let h = '<div class="q-sec"><h3>Current Quest</h3>';
  if (!w || w.kind === 'town') {
    const b = BIOME_BY_ID[c.depth === 100 ? 'throne' : c.nextBiome];
    h += `<div class="q-title">Descend to Depth ${c.depth}</div>`;
    h += step(false, `Step into the <b style="color:#ff8050">portal</b> at the edge of Duskhollow${b ? `. It opens on <b>${escapeHtml(b.name)}</b>` : ''}.`);
    if (c.depth === 100) h += step(false, '<b style="color:#ff4020">Demon Lord Velscour</b> waits on his throne.');
    else if (isRaidDepth(c.depth)) h += step(false, '<b style="color:#ff6030">A BOSS ROOM</b> lies at the end of this depth.');
  } else {
    const boss = w.boss, slain = !!(boss && boss.dead);
    const raid = boss && boss.raid;
    h += `<div class="q-title">Depth ${w.depth} &middot; ${escapeHtml(w.biome ? w.biome.name : '')}</div>`;
    const who = boss && (boss.awake || slain) ? `<b>${escapeHtml(boss.name)}</b>` : raid || isRaidDepth(w.depth) ? 'the lord of the <b>Boss Room</b>' : w.depth === 100 ? '<b>Demon Lord Velscour</b>' : 'the guardian of this depth';
    h += step(slain, `Slay ${who}${raid && !slain ? ` <span class="dim">(phase ${raid.pi + 1} of ${raid.phases.length})</span>` : ''}.`);
    h += step(false, slain ? 'The exit is open: pass through it to go deeper or return to town.' : 'Reach the exit. It stays sealed until the guardian falls.');
    h += `<div class="dim q-note">Foes slain on this depth: ${fmtInt(w.kills || 0)}</div>`;
  }
  h += '</div>';
  const deepest = c.deepest || 0, pctV = Math.min(100, deepest);
  h += `<div class="q-sec"><h3>The Great Quest</h3><div class="q-title">Slay Demon Lord Velscour at Depth 100</div>`;
  h += `<div class="q-bar"><div style="width:${pctV}%"></div><span>Deepest depth cleared: ${deepest} / 100</span></div>`;
  if (deepest >= 100) h += step(true, 'Velscour has fallen. The Endless Torment goes on below.');
  else h += step(false, `Next boss room: <b>Depth ${nextRaid(Math.max(c.depth, (w && w.depth) || 1))}</b>`);
  h += '</div>';
  const raids = Object.keys(c.cleared || {}).map(Number).filter((d) => isRaidDepth(d)).sort((a, b) => a - b);
  h += `<div class="q-sec"><h3>Boss Rooms Conquered</h3>${raids.length ? `<div class="q-raids">${raids.map((d) => `<span>${d}</span>`).join('')}</div>` : '<div class="dim">None yet. Every 5th depth ends in one.</div>'}</div>`;
  h += `<div class="q-sec dim">Depths cleared: ${Object.keys(c.cleared || {}).length} &middot; Foes slain: ${fmtInt(c.kills || 0)} &middot; Deaths: ${c.deaths || 0}</div>`;
  body.appendChild(el('div', 'quest-log', h));
}

export function toggleQuest() {
  if (UI.isOpen('quest')) UI.closePanel('quest');
  else UI.openPanel('quest', 'Quest Log', renderQuest, { width: 'min(400px, 92vw)' });
}
