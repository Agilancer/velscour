// Quest Log (HUD button "Quest", key Q): this depth's objectives, the road to Velscour, boss rooms conquered.
import { G } from '../state.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { UI } from './ui.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { isRaidDepth } from '../world/dungeon.js';
import { FINAL_DEPTH } from '../data/depth.js';

const step = (done, html) => `<div class="q-step${done ? ' done' : ''}"><i>${done ? '&#10004;' : '&#9670;'}</i><span>${html}</span></div>`;
const nextRaid = (d) => { let n = Math.max(5, Math.ceil(d / 5) * 5); if (n === FINAL_DEPTH) n += 5; return n; };

export function renderQuest(body) {
  const c = G.char, w = G.world;
  if (!c) return;
  body.innerHTML = '';
  let h = '<div class="q-sec"><h3>Current Quest</h3>';
  if (!w || w.kind === 'town') {
    const b = BIOME_BY_ID[c.depth === FINAL_DEPTH ? 'throne' : c.nextBiome];
    h += `<div class="q-title">Descend to Depth ${c.depth}</div>`;
    h += step(false, `Step into the <b style="color:#ff8050">portal</b> at the edge of Duskhollow${b ? `. It opens on <b>${escapeHtml(b.name)}</b>` : ''}.`);
    if (c.depth === FINAL_DEPTH) h += step(false, '<b style="color:#ff4020">Demon Lord Velscour</b> waits on his throne.');
    else if (isRaidDepth(c.depth) && !b?.overworld) h += step(false, '<b style="color:#ff6030">A BOSS ROOM</b> lies at the end of this depth.');
    if (b?.overworld) h += step(false, 'A Forsaken Wilds scenario shrine guards the way forward.');
  } else {
    const boss = w.boss, slain = !!(boss && boss.dead);
    const raid = boss && boss.raid;
    h += `<div class="q-title">Depth ${w.depth} &middot; ${escapeHtml(w.biome ? w.biome.name : '')}</div>`;
    const who = boss && (boss.awake || slain) ? `<b>${escapeHtml(boss.name)}</b>` : raid || isRaidDepth(w.depth) ? 'the lord of the <b>Boss Room</b>' : w.depth === FINAL_DEPTH ? '<b>Demon Lord Velscour</b>' : 'the guardian of this depth';
    if (w.overworldScenario) {
      const sc = w.overworldScenario;
      h += step(sc.active || sc.completed, `Activate the glowing scenario shrine: <b>${escapeHtml(sc.title)}</b>.`);
      let progress = sc.description;
      if (sc.active && ['waves','battle','bridge','ward','defend','infestation'].includes(sc.type)) progress += ` Wave ${sc.stage} in progress.`;
      if (sc.active && sc.markers.length) progress += ` ${sc.remaining} objectives remaining.`;
      if (sc.active && sc.type === 'zones') progress += ` Control point ${sc.stage+1}/3, ${Math.floor(sc.capture)}/10 seconds.`;
      if (sc.active && sc.type === 'trial') progress += ` ${sc.kills}/${sc.goal} slain; ${Math.ceil(sc.remaining)}s left.`;
      if (sc.failed) progress = 'Scenario failed. Return to the shrine to retry.';
      h += step(sc.completed, escapeHtml(progress));
      h += step(sc.completed, sc.completed ? 'The exit is open — descend or return to town.' : 'Complete the scenario to unseal the exit.');
    } else {
      h += step(slain, `Slay ${who}${raid && !slain ? ` <span class="dim">(phase ${raid.pi + 1} of ${raid.phases.length})</span>` : ''}.`);
      h += step(false, slain ? 'The exit is open: pass through it to go deeper or return to town.' : 'Reach the exit. It stays sealed until the guardian falls.');
    }
    h += `<div class="dim q-note">Foes slain on this depth: ${fmtInt(w.kills || 0)}</div>`;
  }
  h += '</div>';
  const deepest = c.deepest || 0, pctV = Math.min(100, deepest / FINAL_DEPTH * 100);
  h += `<div class="q-sec"><h3>The Great Quest</h3><div class="q-title">Slay Demon Lord Velscour at Depth ${FINAL_DEPTH}</div>`;
  h += `<div class="q-bar"><div style="width:${pctV}%"></div><span>Deepest depth cleared: ${deepest} / ${FINAL_DEPTH}</span></div>`;
  if (deepest >= FINAL_DEPTH) h += step(true, 'Velscour has fallen. The Endless Torment goes on below.');
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
