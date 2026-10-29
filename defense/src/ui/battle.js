// A stage, start to finish: the opening dialogs, the battle (HUD, deploy tray, posts, Empower/Retreat, Bastion works,
// speed and AUTO), the closing dialogs and the result. Fantasica's flow: tap a hero, tap a post, confirm.
import { D, save } from '../state.js';
import { el, escapeHtml, clamp, fmt } from '../core/util.js';
import { LEVELS, TOTAL_WAVES } from '../data/campaign.js';
import { CARDS } from '../data/cards.js';
import { startStage, finishStage, regionOf, resolveOf } from '../meta/progress.js';
import { STEP, BASTION } from '../battle/sim.js';
import { autoBattle } from '../battle/autoplay.js';
import { BattleView } from '../battle/render.js';
import { loadHeroArt } from '../art/heroart.js';
import { loadMonsters } from '../art/monsterart.js';
import { stageRoster } from '../data/waves.js';
import { portrait } from './portrait.js';
import { playStageDialogs } from './dialog.js';
import { show, toast, modal } from './app.js';
import { sfx, preloadSfx, preloadPiano, playAmbience, playMusic } from '../core/audio.js';
import { upgradeCharacters, pickSquad, nextStage } from '../meta/autopilot.js';
import { renderCard } from '../cards/cardart.js';

const SKILL_NAMES = {};
let ctl = null;
export const battleActive = () => !!ctl;

/** Begin stage n: load its art, play the opening scene, then fight. */
export async function playStage(n, opts = {}) {
  const s = D.save, L = LEVELS[n - 1], R = regionOf(n);
  const ui = document.getElementById('ui');
  ui.innerHTML = `<div class="screen full" style="display:grid;place-items:center;background:radial-gradient(#0c1638,#05060c 70%)"><div style="text-align:center"><div class="cinzel" style="font-size:14px;color:#8aa0d0">${escapeHtml(R.name)} · Stage ${n}</div><h1 class="cinzel" style="color:#ffdf9a;margin:6px 0">${escapeHtml(L.name)}</h1><div class="dim">Opening the rift…</div></div></div>`;
  const b = startStage(s, n);
  const roster = stageRoster(n);
  await Promise.all([
    ...[...new Set(b.squad.map((d) => d.cls))].map((c) => loadHeroArt(c).catch(() => {})),
    loadMonsters(Object.values(roster).flat()).catch(() => {}),
  ]);
  preloadSfx();
  if (b.squad.some((d) => d.cls === 'bard')) preloadPiano();
  const view = new BattleView(document.getElementById('bf'));
  await view.setup(b, R.id);
  playMusic(null); playAmbience(view.theme.amb, 0.55);
  ctl = { n, b, view, L, R, sel: null, slot: null, preview: null, speed: s.settings.speed || 1, paused: true, acc: 0, done: false, auto: !!opts.auto || s.settings.autoBattle, campaign: !!opts.campaign };
  ui.innerHTML = '';
  view.fit();
  await playStageDialogs(n, 'begin', { title: `Stage ${n} · ${L.name}`, auto: ctl.campaign && s.settings.autoCampaign });
  if (!ctl) return;
  buildHud();
  ctl.paused = false;
  view.banner('QUEST START', '#ffdf9a');
  sfx('portcullis_gate', 0.6);
}

// ------------------------------------------------------------------ per frame (called by main.js)
export function battleFrame(dt) {
  if (!ctl) return;
  const { b, view } = ctl;
  if (!ctl.paused && !b.done) {
    ctl.acc += dt * ctl.speed;
    let n = 0;
    while (ctl.acc >= STEP && n++ < 12) { if (ctl.auto) autoBattle(b, STEP); b.step(STEP); ctl.acc -= STEP; }
    if (n >= 12) ctl.acc = 0;
  }
  view.update(ctl.paused ? 0 : dt * Math.min(ctl.speed, 2));
  view.draw();
  if (D.frame % 6 === 0) updateHud();
  if (b.done && !ctl.done) { ctl.done = true; setTimeout(() => endBattle(), 1400); }
}

// ------------------------------------------------------------------ HUD
function buildHud() {
  const ui = document.getElementById('ui'), { b, L, n } = ctl;
  ui.innerHTML = '';
  const top = el('div', 'bhud-top');
  top.innerHTML = `<div class="bh-box bh-stage"><span class="n">${n}. ${escapeHtml(L.name)}</span><span class="w" data-k="wave"></span></div>
    <div class="bh-box bh-heart" data-k="heart"></div>
    <div class="bh-box bh-valor"><div class="lbl"><span>VALOR</span><b data-k="valor"></b></div><div class="bar"><i data-k="vbar"></i></div></div>
    <div class="bh-box" data-k="foes" title="Monsters left"></div>
    <div class="bh-sp"><button class="bh-btn" data-sp="1">1×</button><button class="bh-btn" data-sp="2">2×</button><button class="bh-btn" data-sp="3">3×</button>
      <button class="bh-btn auto" data-k="auto">AUTO</button><button class="bh-btn" data-k="pause">❚❚</button></div>`;
  ui.appendChild(top);
  top.querySelectorAll('[data-sp]').forEach((x) => x.onclick = () => { ctl.speed = +x.dataset.sp; D.save.settings.speed = ctl.speed; save(); updateHud(true); });
  top.querySelector('[data-k=auto]').onclick = () => { ctl.auto = !ctl.auto; D.save.settings.autoBattle = ctl.auto; save(); toast(ctl.auto ? 'Auto-battle: deploying, empowering and building on its own' : 'Auto-battle off'); updateHud(true); };
  top.querySelector('[data-k=pause]').onclick = pauseMenu;
  const boss = el('div', 'bossbar hidden'); boss.innerHTML = '<div class="nm"></div><div class="bar"><i></i></div>'; ui.appendChild(boss);
  const call = el('button', 'btn blue callwave hidden', 'Call next wave'); call.onclick = () => { const v = b.callWave(); if (v) toast(`+${v} Valor for calling the wave early`); }; ui.appendChild(call);
  const bot = el('div', 'bhud-bot');
  const works = el('div', 'works');
  for (const [k, w] of Object.entries(BASTION)) { const x = el('button', 'work'); x.dataset.w = k; x.onclick = () => { if (b.buyBastion(k)) { toast(`${w.name} raised`); sfx('firebuff', 0.6); } else sfx('sword_blocked', 0.3); updateHud(true); }; works.appendChild(x); }
  bot.appendChild(works);
  const tray = el('div', 'tray');
  b.squad.forEach((d, i) => {
    const c = el('div', 'tcard' + (d.ally ? ' ally' : ''));
    c.dataset.slot = i;
    c.appendChild(portrait(d.look, 70, 98, { bust: true }));
    c.insertAdjacentHTML('beforeend', `<div class="cost">${d.cost}</div><div class="nm">${escapeHtml(d.name)}</div><div class="cd hidden"></div>`);
    c.onclick = () => pickSlot(i);
    tray.appendChild(c);
  });
  bot.appendChild(tray);
  ui.appendChild(bot);
  const panel = el('div', 'unit-panel panel hidden'); ui.appendChild(panel);
  ctl.hud = { top, boss, call, works, tray, panel };
  // canvas input
  const cv = document.getElementById('bf');
  cv.onpointermove = (e) => { if (e.pointerType !== 'mouse' || ctl.slot === null) return; const p = ctl.view.postAt(e.clientX, e.clientY); setPreview(p && b.postFree(p.id) ? p : null); };
  cv.onpointerdown = (e) => onTap(e.clientX, e.clientY, e.pointerType);
  updateHud(true);
}
function pickSlot(i) {
  const { b } = ctl, u = b.deployed(i);
  if (u) { selectUnit(u); return; }
  const why = b.canDeploy(i);
  if (why && why !== 'not enough Valor') { toast(why[0].toUpperCase() + why.slice(1)); sfx('sword_blocked', 0.3); return; }
  ctl.slot = ctl.slot === i ? null : i; ctl.sel = null; ctl.view.sel = null;
  ctl.view.highlight = ctl.slot !== null ? true : null;
  setPreview(null);
  sfx('lock_unlock', 0.3);
  updateHud(true);
}
function setPreview(p) {
  ctl.preview = p;
  ctl.view.deployPreview = p && ctl.slot !== null ? { post: p, def: ctl.b.squad[ctl.slot] } : null;
  ctl.view.highlight = ctl.slot !== null ? (p || true) : null;
}
function onTap(x, y, type) {
  const { b, view } = ctl;
  const p = view.postAt(x, y);
  if (ctl.slot !== null) {
    if (p && b.postFree(p.id)) {
      if (type === 'mouse' || ctl.preview === p) return deployAt(p); // touch: first tap previews, second confirms
      setPreview(p); updateHud(true); return;
    }
    ctl.slot = null; setPreview(null); updateHud(true); return;
  }
  const u = view.unitAt(x, y) || (p && b.units.find((q) => q.post === p));
  if (u) return selectUnit(u);
  if (p && b.postFree(p.id)) return postPicker(p);
  ctl.sel = null; view.sel = null; updateHud(true);
}
function deployAt(p) {
  const { b } = ctl, slot = ctl.slot, why = b.canDeploy(slot, p.id);
  if (why) { toast(why[0].toUpperCase() + why.slice(1)); sfx('sword_blocked', 0.3); return; }
  b.deploy(slot, p.id);
  ctl.slot = null; setPreview(null); updateHud(true);
}
/** Fantasica's "Deploy Unit": tap an empty post, pick from the heroes you can afford. */
function postPicker(p) {
  const { b } = ctl, box = el('div');
  box.innerHTML = `<h2>Deploy a hero</h2><div class="dim">Post ${p.raised ? '(raised: +range)' : ''} · Valor ${Math.floor(b.valor)}</div>`;
  const row = el('div', 'row'); row.style.marginTop = '10px';
  b.squad.forEach((d, i) => {
    if (b.deployed(i)) return;
    const why = b.canDeploy(i, p.id), c = el('div', 'tcard' + (why ? ' poor' : ''));
    c.appendChild(portrait(d.look, 70, 98, { bust: true }));
    c.insertAdjacentHTML('beforeend', `<div class="cost">${d.cost}</div><div class="nm">${escapeHtml(d.name)}</div>`);
    c.onclick = () => { if (why) { toast(why); return; } m.close(); ctl.slot = i; deployAt(p); };
    row.appendChild(c);
  });
  box.appendChild(row);
  const m = modal(box, [{ label: 'Cancel', cls: 'ghost' }]);
}
function selectUnit(u) { ctl.sel = u; ctl.view.sel = u; ctl.slot = null; setPreview(null); updateHud(true); }

function updateHud(force) {
  if (!ctl?.hud) return;
  const { b, hud, L } = ctl;
  const q = (k) => hud.top.querySelector(`[data-k=${k}]`);
  const wave = Math.min(b.waveI, b.waves.length), g = L.wave0 + Math.max(1, wave);
  q('wave').textContent = `Wave ${Math.max(1, wave)}/${b.waves.length} · ${g} of ${TOTAL_WAVES}`;
  q('heart').innerHTML = `❤ ${b.heart}/${b.heartMax}`;
  q('valor').textContent = `${Math.floor(b.valor)} / ${b.valorCap}`;
  q('vbar').style.width = (b.valor / b.valorCap * 100).toFixed(1) + '%';
  q('foes').textContent = `☠ ${b.monsters.length + b.queue.length} · ${b.kills} slain`;
  hud.top.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', +x.dataset.sp === ctl.speed));
  q('auto').classList.toggle('on', ctl.auto);
  const boss = b.monsters.find((m) => m.boss || m.lt);
  hud.boss.classList.toggle('hidden', !boss);
  if (boss) { hud.boss.querySelector('.nm').textContent = boss.boss ? ctl.R.boss : 'Lieutenant · ' + ctl.R.lieutenant; hud.boss.querySelector('i').style.width = clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%'; }
  hud.call.classList.toggle('hidden', !(b.waveDone && b.waveI < b.waves.length && b.nextWaveAt - b.t > 1.5));
  if (!hud.call.classList.contains('hidden')) hud.call.textContent = `Call next wave (+${Math.round(b.nextWaveAt - b.t)} Valor)`;
  for (const x of hud.works.children) {
    const k = x.dataset.w, w = BASTION[k], c = b.bastionCost(k), lv = b.works[k];
    x.innerHTML = `${w.name} ${'●'.repeat(lv)}${'○'.repeat(w.costs.length - lv)}<span class="c">${c === Infinity ? 'MAX' : c}</span><small>${w.text}</small>`;
    x.disabled = c === Infinity || b.valor < c; x.style.opacity = x.disabled ? 0.55 : 1;
  }
  for (const c of hud.tray.children) {
    const i = +c.dataset.slot, d = b.squad[i], u = b.deployed(i), cd = b.cooldown[i];
    c.classList.toggle('out', !!u); c.classList.toggle('sel', ctl.slot === i || (ctl.sel && ctl.sel.slot === i));
    c.classList.toggle('poor', !u && (b.valor < d.cost || (!d.ally && b.units.filter((x) => !x.def.ally).length >= b.deployLimit)));
    const cdd = c.querySelector('.cd'); cdd.classList.toggle('hidden', !(cd > 0)); if (cd > 0) cdd.textContent = Math.ceil(cd);
  }
  // the selected hero's panel
  const u = ctl.sel && b.units.includes(ctl.sel) ? ctl.sel : null, P = hud.panel;
  if (!u && ctl.sel) { ctl.sel = null; ctl.view.sel = null; }
  if (ctl.slot !== null && ctl.preview) {
    const d = b.squad[ctl.slot];
    P.classList.remove('hidden');
    P.innerHTML = `<b>${escapeHtml(d.full)}</b><div class="dim">Deploy here for ${d.cost} Valor?</div><div class="row" style="margin-top:6px"><button class="btn green" data-k="ok">Deploy ✓</button><button class="btn ghost" data-k="no">✕</button></div>`;
    P.querySelector('[data-k=ok]').onclick = () => deployAt(ctl.preview);
    P.querySelector('[data-k=no]').onclick = () => { ctl.slot = null; setPreview(null); updateHud(true); };
  } else if (u) {
    const ec = b.empowerCost(u);
    if (force || P.dataset.u !== String(u.id) || D.frame % 30 === 0) {
      P.dataset.u = u.id; P.classList.remove('hidden');
      P.innerHTML = `<div class="up-h"></div><div class="statgrid" style="margin:6px 0"><div>ATK<b>${fmt(b.atkOf(u))}</b></div><div>SPD<b>${(1 / b.rateOf(u)).toFixed(2)}/s</b></div><div>RNG<b>${b.rangeOf(u).toFixed(1)}</b></div></div>
        <div class="dim" style="font-size:12px">${escapeHtml(u.def.skill.name)}: ${Math.min(100, Math.round(u.charge / u.def.skill.charge * 100))}% · ${u.kills} kills</div>
        <div class="row" style="margin-top:6px"><button class="btn" data-k="emp" ${ec === Infinity || b.valor < ec ? 'disabled' : ''}>${ec === Infinity ? 'MAX' : `Empower ${ec}`}</button><button class="btn red" data-k="ret">Retreat +${Math.floor(u.def.cost / 2)}</button></div>`;
      const h = P.querySelector('.up-h');
      h.appendChild(portrait(u.def.look, 54, 72, { bust: true }));
      h.insertAdjacentHTML('beforeend', `<div><b>${escapeHtml(u.def.full)}</b><div class="stars">Battle Lv ${u.lvl}/5</div><div class="dim" style="font-size:11px">Empowering lasts this battle only</div></div>`);
      P.querySelector('[data-k=emp]').onclick = () => { if (b.empower(u)) sfx('firebuff', 0.5); updateHud(true); };
      P.querySelector('[data-k=ret]').onclick = () => { b.retreat(u); ctl.sel = null; ctl.view.sel = null; updateHud(true); };
    }
  } else P.classList.add('hidden');
}

function pauseMenu() {
  ctl.paused = true;
  modal(`<h2>Paused</h2><p class="dim">Stage ${ctl.n} · ${escapeHtml(ctl.L.name)}</p>`, [
    { label: 'Retreat from battle', cls: 'red', fn: () => { ctl.b.heart = 0; ctl.b.finish(false); ctl.paused = false; } },
    { label: 'Resume', cls: 'green', fn: () => { ctl.paused = false; } },
  ], { onClose: () => { ctl && (ctl.paused = false); }, sticky: false });
}

// ------------------------------------------------------------------ the end
async function endBattle() {
  const { b, n, L } = ctl, s = D.save;
  const res = finishStage(s, n, b);
  save(true);
  document.getElementById('ui').innerHTML = '';
  ctl.view.banner(b.won ? (b.stars === 3 ? 'COMPLETE VICTORY!' : 'QUEST CLEAR') : 'THE HEART BREAKS', b.won ? '#ffdf9a' : '#ff5040');
  sfx(b.won ? 'chest_open' : 'sword_blocked', 0.8);
  await new Promise((r) => setTimeout(r, 1600));
  if (b.won) await playStageDialogs(n, 'end', { title: `Stage ${n} · ${L.name}`, auto: ctl.campaign && s.settings.autoCampaign });
  if (!ctl) return;
  resultScreen(res);
}
function resultScreen(res) {
  const { b, n, L } = ctl, s = D.save, ui = document.getElementById('ui');
  const pct = Math.round((b.pct || 0) * 100);
  const box = el('div', 'modal-bg');
  box.innerHTML = `<div class="modal result">
    <div class="dim cinzel">Stage ${n} · ${escapeHtml(L.name)}</div>
    <h1 class="cinzel" style="color:${b.won ? '#ffdf9a' : '#ff6a50'}">${b.won ? (b.stars === 3 ? 'Complete Victory!' : 'Quest Clear') : 'Defeat'}</h1>
    <div class="big-stars">${[1, 2, 3].map((k) => `<span class="${k <= b.stars ? '' : 'off'}">★</span>`).join('')}</div>
    <div class="dim">Enemy ${pct}% destroyed · ${b.kills} slain · ${b.leaked} reached the Heart · waves ${L.wave0 + 1}-${L.wave0 + L.waves} of ${TOTAL_WAVES}</div>
    <div class="loot"><div class="cur gold"><i>◉</i>+${fmt(res.gold)}</div><div class="cur shard"><i>◆</i>+${res.shards}</div>${res.first ? '<div class="cur"><b style="color:#9ad0ff">FIRST CLEAR</b></div>' : ''}</div>
    ${res.recruit ? `<div class="panel" style="margin:8px auto;max-width:420px"><b style="color:#ffdf9a">${escapeHtml(res.recruit.name)}</b> joins the Bastion! <div class="dim">Their Rift Card is in your collection and squad.</div></div>` : ''}
    ${!b.won ? `<div class="dim" style="margin:8px 0">Bastion's Resolve: your heroes strike ${Math.round(resolveOf(s, n) * 100)}% harder here until you win. Level heroes, equip gear, or bring other heroes.</div>` : ''}
    <div class="row" style="justify-content:center;margin-top:12px" data-k="btns"></div>
    <div class="dim" data-k="autoline" style="margin-top:8px"></div></div>`;
  ui.appendChild(box);
  const btns = box.querySelector('[data-k=btns]');
  const go = (fn) => { cancelAuto(); leaveBattle(); fn(); };
  const add = (label, cls, fn) => { const x = el('button', 'btn ' + cls, label); x.onclick = () => go(fn); btns.appendChild(x); };
  if (b.won && n < LEVELS.length) add(`Next: Stage ${n + 1} ▸`, 'big green', () => playStage(n + 1));
  add('Retry', 'blue', () => playStage(n));
  add('Campaign', 'ghost', () => show('campaign', { region: Math.floor((n - 1) / 10) }));
  add('Bastion', 'ghost', () => show('hub'));
  // auto-campaign: upgrade the characters and go on by itself
  let t = null;
  const cancelAuto = () => clearInterval(t);
  if (ctl.campaign && D.save.settings.autoCampaign) {
    let left = 4;
    const line = box.querySelector('[data-k=autoline]');
    const tick = () => {
      line.innerHTML = `Auto-campaign: upgrading heroes and moving on in ${left}… <button class="btn ghost" style="padding:2px 8px">Stop</button>`;
      line.querySelector('button').onclick = () => { cancelAuto(); D.save.settings.autoCampaign = false; save(); line.textContent = 'Auto-campaign stopped.'; };
      if (left-- <= 0) { cancelAuto(); go(() => autoCampaignNext()); }
    };
    tick(); t = setInterval(tick, 1000);
  }
}
let fails = 0;
export function autoCampaignNext() {
  const s = D.save;
  fails = s.progress[s.frontier]?.losses || 0;
  pickSquad(s);
  const log = upgradeCharacters(s);
  if (log.length) toast('Auto-play: ' + log.slice(0, 3).join(', ') + (log.length > 3 ? '…' : ''));
  save(true);
  playStage(nextStage(s, fails), { campaign: true, auto: true });
}
export function leaveBattle() {
  if (!ctl) return;
  const cv = document.getElementById('bf');
  cv.onpointermove = cv.onpointerdown = null;
  ctl = null;
  playAmbience(null);
}
export const battleCtl = () => ctl;
