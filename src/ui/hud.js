// In-game HUD built on top of the provided skill-bar art.
import { G } from '../state.js';
import { el, fmt, fmtInt, escapeHtml, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { A, potionIcon } from '../core/assets.js';
import { UI, $, droppable } from './ui.js';
import { skillIconURL } from './icons.js';
import { SKILLS, effLevel, manaCost, rageCost, cooldown, CLASS_SKILLS } from '../data/skills.js';
import { xpToNext } from '../game/player.js';
import { drawMinimap } from '../game/render.js';
import { assign, SLOT_LABELS } from './skills.js';
import { elem } from '../gfx/vfx.js';
import { pickTaunt } from '../data/taunts.js';

const TAUNT_KEY = 'velscour_taunts_v1'; // Velscour's level-up deck: the last mood and the lines already shown
import { Meter } from '../game/dpsmeter.js';
import { heroDamage } from '../game/autoplay.js';
import { madnessReady, madnessOn, unleashMadness } from '../game/mayhem.js';

const POTIONS = ['hp', 'mp', 'rejuv', 'fury'];
// hud slot index -> bar index (skills) or potion kind: LMB, ` 1-9 0 - =, the potions, RMB
const SLOT_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 'hp', 'mp', 'rejuv', 'fury', 14];

/** [x, y, w, h] of a sprite's non-transparent pixels (monster sheets carry lots of padding), memoised per image. */
const boxes = new WeakMap();
function opaqueBox(img) {
  let b = boxes.get(img);
  if (b) return b;
  b = [0, 0, img.width, img.height];
  try {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 >= x0) b = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  } catch (e) { /* tainted or not ready: draw it whole */ }
  boxes.set(img, b);
  return b;
}

export const HUD = {
  slots: [],
  last: {},
  portraitOrbFrames: null,
  init() {
    UI.hud = this;
    const geo = A.hudGeo;
    // the bar's aspect (and how much room it takes at the bottom) comes from the art's geometry
    document.documentElement.style.setProperty('--hud-k', String(geo.h / geo.w));
    this.initFrames(geo);
    $('#madness-btn').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); unleashMadness(); });
    const wrap = $('#hud-slots');
    const pct = (v, total) => (v / total) * 100 + '%';
    geo.slots.forEach((s, i) => {
      const d = el('div', 'slot');
      d.style.left = pct(s.x, geo.w); d.style.top = pct(s.y, geo.h);
      d.style.width = pct(s.w, geo.w); d.style.height = pct(s.h, geo.h);
      const map = SLOT_MAP[i];
      if (typeof map === 'string') { d.classList.add('potion-slot'); d.dataset.potion = map; }
      const icon = new Image(); icon.className = 'icon'; icon.draggable = false; icon.style.display = 'none';
      d.appendChild(icon);
      const nomana = el('div', 'nomana hidden');
      const cd = el('div', 'cd'); cd.style.height = '0%';
      const cdt = el('div', 'cdtext');
      const cnt = el('span', 'count');
      d.append(nomana, cd, cdt, cnt);
      const entry = { d, icon, cd, cdt, cnt, nomana, map, last: {} };
      this.slots.push(entry);
      if (typeof map === 'string') {
        d.title = { hp: 'Healing Potion (Z)', mp: 'Mana Potion (X)', rejuv: 'Rejuvenation Potion (C)', fury: 'Elixir of Fury (V)' }[map];
        d.addEventListener('pointerdown', (e) => { e.stopPropagation(); G.player && G.player.usePotion(map); });
      } else {
        d.title = `Skill slot ${SLOT_LABELS[map]}`;
        let pressT = 0, longT = null;
        d.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (e.pointerType !== 'mouse') {
            pressT = performance.now();
            longT = setTimeout(() => { longT = null; chooser(map); }, 550);
          }
        });
        d.addEventListener('pointerup', (e) => {
          if (e.pointerType === 'mouse') { if (e.button === 0) chooser(map); return; }
          if (longT) { clearTimeout(longT); longT = null; if (performance.now() - pressT < 550) G.controls && G.controls.useSlot(map); }
        });
        droppable(d, (data) => { assign(map, data.id); return true; }, (data) => data.type === 'skill');
      }
      UI.tip(d, () => slotTip(map));
      wrap.appendChild(d);
    });
    const [lo, mo] = geo.orbs;
    const place = (elx, o) => { elx.style.left = pct(o.cx - o.r, geo.w); elx.style.top = pct(o.cy - o.r, geo.h); elx.style.width = pct(o.r * 2, geo.w); elx.style.height = pct(o.r * 2, geo.h); };
    place($('#life-cover'), lo); place($('#mana-cover'), mo);
    const lt = $('#life-text'), mt = $('#mana-text');
    lt.style.left = pct(lo.cx - 110, geo.w); lt.style.width = pct(220, geo.w); lt.style.top = pct(lo.cy - 12, geo.h);
    mt.style.left = pct(mo.cx - 110, geo.w); mt.style.width = pct(220, geo.w); mt.style.top = pct(mo.cy - 12, geo.h);
    const xp = geo.xp;
    if (geo.barTop) $('#hud-rail').style.top = pct(geo.barTop, geo.h);
    const xt = $('#xp-track');
    xt.style.left = pct(xp.x, geo.w); xt.style.width = pct(xp.w, geo.w); xt.style.top = pct(xp.y, geo.h); xt.style.height = pct(xp.h, geo.h);
    for (const b of document.querySelectorAll('.hbtn')) {
      b.addEventListener('click', () => { sfx('ui'); G.game.hudAction(b.dataset.act); });
    }
    window.addEventListener('resize', () => this.layoutMobile());
    this.layoutMobile();
    $('#minimap').addEventListener('click', () => { G.showAutomap = !G.showAutomap; });
    $('#velscour-skull').addEventListener('click', () => { sfx('ui'); G.game.openVelscourContact(); });
    const spark = $('#hs-spark');
    spark.width = 150 * G.dpr; spark.height = 18 * G.dpr;
    UI.tip($('#hero-stats'), () => `<b style="color:#ffe2a0">Battle Ledger</b>
      <div><b>Attack</b>: the average hit of your main attack (left-click skill), crits included.</div>
      <div><b>DPS</b>: what your skill bar deals to one foe per second at your current stats: crits, attack and cast speed, cooldowns, mana and minions.</div>
      <div><b>Avg DPS · 30s</b>: the damage you and your minions really dealt over the last 30 seconds, divided by 30. The bars show each second.</div>
      <div><b>Player Deaths</b> and <b>Total Monsters Killed</b>: this hero's lifetime counts.</div>`);
  },

  /** The minimap sits in the ring's open middle (a little oval); the ring overhangs it on every side. */
  initFrames(geo) {
    const r = geo.ring;
    if (!r) return;
    const h = r.hole, ring = $('#minimap-ring'), cvs = $('#minimap');
    $('#minimap-wrap').style.aspectRatio = `${h.rx} / ${h.ry}`;
    ring.style.width = (r.w / (2 * h.rx)) * 100 + '%';
    ring.style.left = -((h.cx - h.rx) / (2 * h.rx)) * 100 + '%';
    ring.style.top = -((h.cy - h.ry) / (2 * h.ry)) * 100 + '%';
    cvs.width = 200; cvs.height = Math.round((200 * h.ry) / h.rx);
  },

  layoutMobile() {
    const portrait = G.touch && innerHeight > innerWidth;
    const compact = G.touch && (portrait || !G.settings.mobileSkillBar);
    document.body.classList.toggle('compact-mobile-hud', compact);
    const hud = $('#hud'), img = $('#hud-img'), xp = $('#xp-track'), rail = $('#hud-rail');
    hud.classList.toggle('compact-mobile', compact);
    img.src = compact ? 'assets/ui/hud-orbs.webp' : 'assets/ui/hud.webp';
    xp.classList.toggle('hidden', compact);
    rail.classList.toggle('hidden', compact);
    const size = innerHeight > innerWidth ? 38 : 42;
    const bar = $('#hud-bar').getBoundingClientRect();
    if (portrait) {
      if (!this.portraitOrbFrames) {
        const makeFrame = (name, src) => {
          const frame = new Image();
          frame.className = 'portrait-orb-frame';
          frame.alt = '';
          frame.draggable = false;
          frame.src = src;
          frame.dataset.orb = name;
          $('#hud-bar').appendChild(frame);
          return frame;
        };
        this.portraitOrbFrames = [
          makeFrame('life', 'assets/ui/hud-orb-life.webp'),
          makeFrame('mana', 'assets/ui/hud-orb-mana.webp'),
        ];
      }
      const frameW = Math.max(74, Math.min(98, innerWidth * .24));
      const scale = frameW / 270;
      const frameH = 296 * scale;
      const inset = Math.max(5, innerWidth * .015);
      const x = [inset, innerWidth - frameW - inset];
      const y = bar.height - frameH;
      this.portraitOrbFrames.forEach((frame, i) => Object.assign(frame.style, {
        display: 'block', left: `${x[i]}px`, top: `${y}px`, width: `${frameW}px`, height: `${frameH}px`,
      }));
      const [lifeGeo, manaGeo] = A.hudGeo.orbs;
      const orbPos = [
        { frameX: x[0], cx: lifeGeo.cx, cy: lifeGeo.cy, r: lifeGeo.r },
        { frameX: x[1], cx: manaGeo.cx - 1730, cy: manaGeo.cy, r: manaGeo.r },
      ];
      const placePortraitOrb = (cover, text, p) => {
        const cx = p.frameX + p.cx * scale;
        const cy = y + p.cy * scale;
        const diameter = p.r * 2 * scale;
        Object.assign(cover.style, { left: `${cx - diameter / 2}px`, top: `${cy - diameter / 2}px`, width: `${diameter}px`, height: `${diameter}px` });
        Object.assign(text.style, { left: `${cx - 42}px`, top: `${cy - 7}px`, width: '84px', fontSize: '10px' });
      };
      placePortraitOrb($('#life-cover'), $('#life-text'), orbPos[0]);
      placePortraitOrb($('#mana-cover'), $('#mana-text'), orbPos[1]);
    } else if (this.portraitOrbFrames) {
      this.portraitOrbFrames.forEach((frame) => { frame.style.display = 'none'; });
    }
    const gap = 8, x0 = (bar.width - (size * 4 + gap * 3)) / 2, y = bar.height - size - (innerHeight > innerWidth ? 10 : 8);
    this.slots.forEach((s) => {
      const potion = typeof s.map === 'string';
      if (potion) s.icon.style.opacity = compact ? '1' : '0';
      s.d.classList.toggle('hidden', compact && !potion);
      if (compact && potion) Object.assign(s.d.style, { left: `${x0 + POTIONS.indexOf(s.map) * (size + gap)}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
      else {
        const g = A.hudGeo, m = SLOT_MAP.indexOf(s.map);
        const slot = g.slots[m];
        if (slot) Object.assign(s.d.style, { left: `${(slot.x / g.w) * 100}%`, top: `${(slot.y / g.h) * 100}%`, width: `${(slot.w / g.w) * 100}%`, height: `${(slot.h / g.h) * 100}%` });
      }
    });
  },

  refreshStatic() {
    const c = G.char;
    if (!c) return;
    for (const s of this.slots) {
      if (typeof s.map === 'string') {
        if (s.last.icon !== s.map) { s.icon.src = potionIcon({ hp: 'red', mp: 'blue', rejuv: 'purple', fury: 'orange' }[s.map], 64).toDataURL(); s.icon.style.display = 'block'; s.last.icon = s.map; }
        s.icon.style.opacity = $('#hud').classList.contains('compact-mobile') ? '1' : '0';
        continue;
      }
      const id = c.bar[s.map];
      if (s.last.icon !== id) {
        s.last.icon = id;
        if (id && SKILLS[id]) { s.icon.src = skillIconURL(SKILLS[id]); s.icon.style.display = 'block'; } else s.icon.style.display = 'none';
      }
    }
    const sp = $('#sp-badge'), stb = $('#stat-badge');
    sp.textContent = c.skillPoints; sp.classList.toggle('hidden', !c.skillPoints);
    stb.textContent = c.statPoints; stb.classList.toggle('hidden', !c.statPoints);
    if (G.touchUI) G.touchUI.refresh();
  },

  update(dt) {
    const p = G.player, c = G.char, w = G.world;
    if (!p || !c) return;
    const set = (key, v, fn) => { if (this.last[key] !== v) { this.last[key] = v; fn(v); } };
    const lifeK = Math.round(clamp(1 - p.hp / p.maxHp, 0, 1) * 200) / 2;
    set('life', lifeK, (v) => { $('#life-cover .orb-empty').style.height = v + '%'; });
    set('mana', Math.round(clamp(1 - p.mana / p.maxMana, 0, 1) * 200) / 2, (v) => { $('#mana-cover .orb-empty').style.height = v + '%'; });
    set('rageClass', p.classId === 'barbarian', v => { $('#barbarian-rage').classList.toggle('hidden', !v); });
    if (p.classId === 'barbarian') {
      set('rageAmount', Math.round(p.rage), v => { $('#barbarian-rage-fill').style.width = v + '%'; $('#barbarian-rage-text').textContent = `Rage ${v}%`; });
    }
    set('lt', `${fmt(Math.max(0, p.hp))}/${fmt(p.maxHp)}`, (v) => { $('#life-text').textContent = v; });
    set('mt', `${fmt(p.mana)}/${fmt(p.maxMana)}`, (v) => { $('#mana-text').textContent = v; });
    const ready = madnessReady(), on = madnessOn();
    set('mad', Math.round(clamp(c.madness || 0, 0, 1) * 1000) / 10, (v) => { $('#mad-fill').style.width = v + '%'; });
    set('madst', ready ? 'full' : on ? 'on' : '', (v) => {
      $('#madness').className = v;
      $('#madness-btn').classList.toggle('hidden', v !== 'full');
      if (v === 'full') { sfx('levelup', 0.4); UI.log('MADNESS is full: press the MADNESS button (G) to unleash it.', '#ff6090'); }
    });
    set('madt', on ? `MADNESS ${Math.ceil(c.madT)}s` : ready ? 'Madness — ready' : `Madness ${Math.floor((c.madness || 0) * 100)}%`, (v) => { $('#mad-text').textContent = v; });
    const need = xpToNext(c.level);
    set('xp', Math.round((c.xp / need) * 1000) / 10, (v) => { $('#xp-fill').style.width = v + '%'; });
    set('xpt', `Level ${c.level} · ${fmtInt(c.xp)} / ${fmtInt(need)} XP`, (v) => { $('#xp-text').textContent = v; });
    for (const s of this.slots) {
      if (typeof s.map === 'string') {
        const n = c.potions[s.map] || 0;
        if (s.last.n !== n) { s.last.n = n; s.cnt.textContent = n; s.d.style.opacity = n ? '1' : '0.45'; }
        continue;
      }
      const id = c.bar[s.map];
      const sk = id && SKILLS[id];
      let cdK = 0, cdTxt = '', nm = false;
      if (sk) {
        const rem = p.cooldowns[id] || 0;
        const tot = cooldown(sk) * (1 - p.st.cdr / 100);
        if (rem > 0 && tot > 0) { cdK = Math.round((rem / tot) * 100); cdTxt = rem >= 1 ? Math.ceil(rem) + '' : ''; }
        const L = effLevel(p, sk);
        nm = L > 0 && (p.mana < manaCost(sk, L) || p.rage < rageCost(sk) ||
          (sk.classId === 'barbarian' && sk.kind === 'whirl' && p.rage < 10));
      }
      if (s.last.cd !== cdK) { s.last.cd = cdK; s.cd.style.height = cdK + '%'; }
      if (s.last.cdt !== cdTxt) { s.last.cdt = cdTxt; s.cdt.textContent = cdTxt; }
      if (s.last.nm !== nm) { s.last.nm = nm; s.nomana.classList.toggle('hidden', !nm); }
    }
    // boss bar
    const boss = w && w.boss && !w.boss.dead && w.boss.awake ? w.boss : null;
    set('boss', boss ? boss.id : 0, () => {
      $('#boss-bar').classList.toggle('hidden', !boss);
      if (boss) $('#boss-name').textContent = boss.name;
      // a raid boss's phase changes, as marks on the bar
      const tr = $('#boss-track');
      tr.querySelectorAll('.boss-mark').forEach((e) => e.remove());
      if (boss && boss.raid) for (const k of boss.raid.marks) { const d = el('div', 'boss-mark'); d.style.left = k * 100 + '%'; tr.appendChild(d); }
    });
    if (boss) set('bossHp', Math.round((boss.hp / boss.maxHp) * 500) / 5, (v) => { $('#boss-fill').style.width = v + '%'; });
    set('bossSub', boss && boss.raid ? boss.raid.label() : '', (v) => { $('#boss-sub').textContent = v; });
    set('bossWard', !!(boss && boss.ward < 1), (v) => { $('#boss-bar').classList.toggle('warded', v); });
    const sand = w?.biome?.id === 'sea_of_sand' && w.overworldScenario?.hud ? w.overworldScenario.hud : null;
    set('sandHud', sand ? `${sand.title}|${sand.beat}|${sand.total}|${sand.progress}|${sand.timer}` : '', (v) => {
      const panel=$('#sand-objective');
      panel.classList.toggle('hidden',!sand);
      if(sand){
        $('#sand-title').textContent=sand.title;
        $('#sand-beat').textContent=`Area ${sand.beat}/${sand.total}`;
        $('#sand-progress').textContent=sand.progress;
        $('#sand-timer').textContent=sand.timer?`Time ${sand.timer}`:'';
      }
    });
    // buffs
    this.buffT = (this.buffT || 0) - dt;
    if (this.buffT <= 0) {
      this.buffT = 0.25;
      const row = $('#buff-row');
      const key = p.buffs.map((b) => b.id + ':' + Math.ceil(b.t)).join('|');
      if (key !== this.last.buffs) {
        this.last.buffs = key;
        row.innerHTML = '';
        for (const b of p.buffs) {
          if (b.hidden) continue;
          const d = el('div', 'buff');
          const sk = SKILLS[b.id];
          if (sk) { const im = new Image(); im.src = skillIconURL(sk); im.style.width = '100%'; d.appendChild(im); }
          else { d.style.background = elem(b.el).glow; }
          d.title = b.name;
          if (!b.aura) d.appendChild(el('span', '', Math.ceil(b.t)));
          row.appendChild(d);
        }
      }
    }
    this.updateStats(dt);
    drawMinimap(w, dt, $('#minimap'));
  },

  /** The stats plaque: level, attack, sheet DPS and the real 30 s average, refreshed every 0.1 s. */
  updateStats(dt) {
    const p = G.player, c = G.char;
    if (Meter.char !== c) { Meter.char = c; Meter.reset(); this.sheetT = 0; }
    this.statT = (this.statT || 0) - dt;
    if (this.statT > 0) return;
    this.statT = 0.1;
    this.sheetT = (this.sheetT || 0) - 0.1;
    if (this.sheetT <= 0) { this.sheetT = 0.5; this.sheet = heroDamage(p); }
    const set = (key, v, fn) => { if (this.last[key] !== v) { this.last[key] = v; fn(v); } };
    set('hsl', c.level, (v) => { $('#hs-lvl').textContent = v; });
    set('hsa', fmt(this.sheet.atk), (v) => { $('#hs-atk').textContent = v; });
    set('hsd', fmt(this.sheet.dps), (v) => { $('#hs-dps').textContent = v; });
    set('hsv', fmt(Meter.avg()), (v) => { $('#hs-avg').textContent = v; });
    set('hsk', fmtInt(c.kills || 0), (v) => { $('#hs-kills').textContent = v; });
    set('hsx', fmtInt(c.deaths || 0), (v) => { $('#hs-deaths').textContent = v; });
    // a bar per second for the last 30 s, with the average as a gold line
    const cv = $('#hs-spark'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const secs = Meter.perSecond(30), avg = Meter.avg(), top = Math.max(1, avg * 1.6, ...secs);
    g.clearRect(0, 0, W, H);
    const bw = W / 30;
    for (let i = 0; i < 30; i++) {
      const h = Math.round((secs[i] / top) * (H - 2));
      if (!h) continue;
      g.fillStyle = i === 29 ? '#ff7a30' : i > 24 ? '#c8200e' : '#7a1008';
      g.fillRect(Math.round(i * bw), H - h, Math.max(1, Math.round(bw) - 1), h);
    }
    if (avg > 0) { g.fillStyle = '#ffd860'; g.fillRect(0, Math.round(H - 1 - (avg / top) * (H - 2)), W, Math.max(1, G.dpr)); }
    this.updateTarget();
  },

  /** The target window: the hovered / attacked / last-hit monster's picture and name; it stays up, greyed, once slain. */
  updateTarget() {
    const p = G.player, w = G.world, box = $('#target-box');
    if (this.tbWorld !== w) { this.tbWorld = w; this.tb = null; if (G.lastHit && !w.creatures.includes(G.lastHit)) G.lastHit = null; }
    const live = (m) => m && !m.dead && m.team === 'enemy' && m.targetable !== false;
    const at = p.attackTarget && p.attackTarget.target;
    const cur = live(G.hover) ? G.hover : live(at) ? at : live(G.lastHit) ? G.lastHit : null;
    if (cur) this.tb = cur;
    const t = this.tb, set = (key, v, fn) => { if (this.last[key] !== v) { this.last[key] = v; fn(v); } };
    set('tbOn', !!t, (v) => box.classList.toggle('hidden', !v));
    if (!t) return;
    const dead = !!t.dead || t.hp <= 0;
    set('tbCls', (dead ? 'dead ' : '') + 'r-' + (t.rank || 'normal'), (v) => { box.className = v; });
    set('tbName', t.name || '???', (v) => { $('#tb-name').textContent = v; box.title = v; });
    set('tbHp', dead ? 0 : Math.ceil(clamp(t.hp / t.maxHp, 0, 1) * 100), (v) => { $('#tb-fill').style.width = v + '%'; });
    const rank = { champion: 'Champion', unique: 'Unique', boss: 'Boss' }[t.rank] || '';
    set('tbSub', dead ? 'Slain' : [t.level ? 'Level ' + t.level : '', rank].filter(Boolean).join(' · '), (v) => { $('#tb-sub').textContent = v; });
    if (dead) return; // keep the last living picture
    const img = t.spriteImage && t.spriteImage();
    if (!img || !img.width || (this.tbImg === img && this.tbFor === t)) return;
    this.tbImg = img; this.tbFor = t;
    const cv = $('#tb-pic'), g = cv.getContext('2d'), S = cv.width, pad = Math.round(S * 0.05);
    const [bx, by, bw, bh] = opaqueBox(img);
    const k = Math.min((S - pad * 2) / bw, (S - pad * 2) / bh);
    const dw = bw * k, dh = bh * k;
    g.clearRect(0, 0, S, S);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.filter = 'brightness(1.35) contrast(1.1)'; // dungeon art is dark; lift it so it reads small
    g.drawImage(img, bx, by, bw, bh, (S - dw) / 2, S - pad - dh, dw, dh);
    g.filter = 'none';
  },

  /** The level-up banner: a dark vignette, the title and new level bleeding in from blur, then Velscour's two lines. */
  levelUp(level, sound) {
    const box = $('#levelup'), num = $('#lu-num');
    num.textContent = level;
    const now = performance.now();
    if (this.lu && now < this.lu.end) { // more levels while it's up: punch the number again
      num.classList.remove('punch'); void num.offsetWidth; num.classList.add('punch');
      return;
    }
    if (this.lu) this.lu.timers.forEach(clearTimeout);
    const at = sound ? sound.voiceAt : 0.55, dur = 5;
    const lu = this.lu = { end: now + (at + dur + 0.6) * 1000, timers: [] };
    const later = (s, fn) => lu.timers.push(setTimeout(fn, s * 1000));
    let deck = {};
    try { deck = JSON.parse(localStorage.getItem(TAUNT_KEY) || '{}') || {}; } catch (e) { /* a fresh deck */ }
    const t = pickTaunt(G.char, deck);
    try { localStorage.setItem(TAUNT_KEY, JSON.stringify(deck)); } catch (e) { /* ignore */ }
    box.classList.remove('hidden', 'play', 'out'); num.classList.remove('punch');
    $('#center-msg')?.classList.add('below'); // a showing area title steps out of the banner's way
    box.dataset.mood = t.mood;
    $('#lu-l1').textContent = t.l1; $('#lu-l2').textContent = t.l2;
    void box.offsetWidth;
    box.classList.add('play');
    later(at + dur + 0.1, () => box.classList.add('out'));
    later(at + dur + 0.9, () => box.classList.add('hidden'));
  },

  setArea(name, sub) { $('#area-name').textContent = name; $('#area-sub').textContent = sub || ''; },
  show(v) { $('#hud').classList.toggle('hidden', !v); if (v) this.layoutMobile(); },
};

function slotTip(map) {
  if (typeof map === 'string') return `<b>${{ hp: 'Healing Potion', mp: 'Mana Potion', rejuv: 'Rejuvenation Potion', fury: 'Elixir of Fury' }[map]}</b><div class="dim">Key ${{ hp: 'Z', mp: 'X', rejuv: 'C', fury: 'V' }[map]} · Buy more from the Alchemist</div>`;
  const id = G.char.bar[map];
  if (!id) return `<b>Empty slot [${SLOT_LABELS[map]}]</b><div class="dim">Click to choose a skill, or drag one here from the Skill Book (B).</div>`;
  const sk = SKILLS[id];
  return `<b style="color:#ffe2a0">${escapeHtml(sk.name)}</b> <span class="dim">[${SLOT_LABELS[map]}]</span><div class="dim">Click to change</div>`;
}

/** Pick a learned skill for a bar slot. */
export function chooser(slotIdx) {
  const c = G.char;
  const learned = CLASS_SKILLS[c.classId].filter((s) => (c.skills[s.id] || 0) > 0);
  const html = learned.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-height:55vh;overflow:auto">${learned.map((s) => `<button class="btn small" data-id="${s.id}" style="display:flex;align-items:center;gap:6px;padding:4px 8px"><img src="${skillIconURL(s)}" style="width:32px;height:32px">${escapeHtml(s.name)}</button>`).join('')}</div>`
    : '<p>You have not learned any skills yet. Open the Skill Tree (K).</p>';
  const d = UI.dialog({ title: `Assign slot ${SLOT_LABELS[slotIdx]}`, html, buttons: [{ label: 'Clear slot', fn: () => { c.bar[slotIdx] = null; UI.refresh(); } }, { label: 'Close' }] });
  d.box.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { d.close(); assign(slotIdx, b.dataset.id); }; });
}
