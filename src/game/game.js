// Game flow: characters, town, dungeon depths, death, victory.
import { G } from '../state.js';
import { input } from '../core/input.js';
import { camera } from '../core/view.js';
import { sfx, playMusic, stopMusic, setAmbience, stopAmbience, footsteps } from '../core/audio.js';
import { rand, pick, randi, escapeHtml, dist, makeCanvas, fmtInt } from '../core/util.js';
import { biomeTileSet, loadBiomeArt, mixedTileSet } from '../core/assets.js';
import { loadClassArt } from '../core/classart.js';
import { loadGearArt } from '../core/gearart.js';
import { preloadBarFx } from '../gfx/artfx.js';
import { SKILLS } from '../data/skills.js';
import { setClassItems } from '../data/items.js';
import { BIOME_BY_ID, TOWN_BIOME, drawBiome, mixPartner } from '../data/biomes.js';
import { CLASSES } from '../data/classes.js';
import { generateDungeon, isRaidDepth } from '../world/dungeon.js';
import { generateTown, makeTownTiles } from '../world/town.js';
import { World } from './world.js';
import { Player } from './player.js';
import { makeMonster, Monster } from './monster.js';
import { makeRaidBoss } from './raid.js';
import { dropChest } from './loot.js';
import { renderWorld, drawMinimap } from './render.js';
import { controls } from './controls.js';
import { Auto } from './autoplay.js';
import { writeSave, newCharData, migrate } from './save.js';
import { clearVfx, floatText, sparkle, addEffect, Ring } from '../gfx/vfx.js';
import { Meter } from './dpsmeter.js';
import { UI } from '../ui/ui.js';
import { HUD } from '../ui/hud.js';
import { TouchUI } from '../ui/touch.js';
import { Vendor } from '../ui/vendor.js';
import { toggleInventory } from '../ui/inventory.js';
import { toggleTree, toggleBook } from '../ui/skills.js';
import { toggleQuest } from '../ui/quest.js';
import { titleScreen, hide as hideScreen, deathScreen, victoryScreen, pauseMenu, helpDialog } from '../ui/screens.js';

const STEP_SURFACE = { sunken: 'water', plague: 'water', serpent: 'water', library: 'wood', gilded: 'wood' };   // footstep sounds; default stone

let townCache = null, townTiles = null;
let saveT = 0;
let automapCanvas = null;

const VILLAGERS = [
  { name: 'Old Tobin', sprite: 'necromancer', pal: { hue: 30, sat: 0.3, light: 0.05 }, barks: ['The dead walk louder every night...', 'My boy went through that portal. Never came back.'] },
  { name: 'Mira', sprite: 'ranger', pal: { hue: 200, sat: 0.4 }, barks: ['Bring back something shiny, hero!', 'They say a demon sleeps at the bottom of the world.'] },
  { name: 'Brother Cael', sprite: 'paladin', pal: { hue: 160, sat: 0.3, light: -0.05 }, barks: ['Light preserve you, wanderer.', 'Velscour... do not speak that name aloud.'] },
  { name: 'Gorm', sprite: 'barbarian', pal: { hue: -20, sat: 0.4 }, barks: ['Hah! I would go down there myself if not for my knees.', 'Gold buys steel. Steel buys life.'] },
];

export const game = {
  // ------------------------------------------------------------ characters
  // async: the class's art pack (if it has one) loads first, because it names the class's catalog items
  async newChar(classId, name, slot) {
    await this.loadClassPack(classId);
    const c = newCharData(classId, name, slot);
    this.startChar(c, true);
  },
  async loadChar(c) {
    await this.loadClassPack(c.classId);
    this.startChar(migrate(c), false);
  },
  async loadClassPack(classId) {
    const el = document.getElementById('loading');
    const slow = setTimeout(() => el && el.classList.remove('hidden'), 250);
    const [meta] = await Promise.all([loadClassArt(classId), loadGearArt(classId)]);
    clearTimeout(slow);
    if (el) el.classList.add('hidden');
    setClassItems(classId, meta);
  },

  startChar(c, fresh) {
    hideScreen();
    if (Auto.on) Auto.toggle(false);
    G.char = c;
    const p = new Player(c);
    G.player = p;
    p.applyGrants();
    if (!c.bar[0]) c.bar[0] = `${c.classId}.0.0`;
    p.recompute();
    p.hp = p.maxHp; p.mana = p.maxMana;
    G.mode = 'game';
    HUD.show(true);
    if (G.touch) TouchUI.show(true);
    UI.refresh();
    Vendor.restock();
    this.enterTown();
    if (fresh) {
      setTimeout(() => {
        UI.centerMsg('DUSKHOLLOW', 'The last town above the abyss', 3.5);
        UI.log(`Welcome, ${escapeHtml(c.name)}. Visit the vendors, then step into the <b style="color:#ff8050">portal</b> to the south-east.`, '#ffe2a0');
        UI.log('You have <b>1 skill point</b> — open the Skill Tree (K) to learn your first ability.', '#ffd860');
        if (!G.touch) UI.log('Left-click to move/attack, right-click, ` 1–9 0 - = for skills, Z X C V for potions, Q for the quest log.');
        else UI.log('Left thumb moves, tap to attack, skill buttons on the right.');
      }, 400);
    }
    this.autosave();
  },

  autosave() {
    if (!G.char) return;
    writeSave(G.char);
    saveT = 0;
  },

  quitToTitle() {
    if (Auto.on) Auto.toggle(false);
    this.autosave();
    UI.closeAll();
    G.world = null; G.player = null; G.char = null;
    setClassItems(null);
    HUD.show(false); TouchUI.show(false);
    G.mode = 'title';
    clearVfx();
    stopMusic(); stopAmbience();
    titleScreen();
  },

  // ------------------------------------------------------------ worlds
  carrySummons(oldWorld) {
    if (!oldWorld) return [];
    return oldWorld.creatures.filter((c) => c.summon && !c.dead && !c.life && c.owner === G.player && !c.static);
  },

  setWorld(world, start, oldWorld) {
    const p = G.player;
    const keep = this.carrySummons(oldWorld);
    clearVfx();
    UI.closeAll();
    p.x = start[0]; p.y = start[1]; p.z = 0;
    p.channel = null; p.path = null; p.moveTarget = null; p.attackTarget = null; p.interact = null; p.lootTarget = null;
    p.status = {}; p.dead = false; p.kbx = p.kby = 0; p.castLock = 0;
    world.player = p;
    world.add(p);
    for (const s of keep) {
      const [x, y] = world.map.randomNear(p.x, p.y, 1.5);
      s.x = x; s.y = y; s.world = world; s.aggro = null; s.foe = null; s.nav = null; s.fol = null;
      world.add(s);
    }
    G.world = world;
    camera.computeZoom();
    camera.follow(p.x, p.y, 0, true);
    world.map.reveal(p.x, p.y, 12);
    preloadBarFx(p, SKILLS);
  },

  enterTown() {
    const old = G.world;
    const c = G.char;
    const tileset = biomeTileSet(TOWN_BIOME);
    if (!townTiles) townTiles = makeTownTiles();
    if (!townCache) townCache = generateTown(tileset);
    const t = townCache;
    t.map.seen.fill(0);
    const world = new World('town', { map: t.map, tileset, biome: TOWN_BIOME, depth: 0, townTiles, buildings: t.buildings, props: t.props });
    world.npcs = t.npcs.map((n) => ({ vendor: n.vendor, x: n.x, y: n.y, reach: 1.8, flip: n.x > 20, use: () => Vendor.open(n.vendor.id) }));
    for (const v of VILLAGERS) {
      const [x, y] = t.map.randomNear(t.center.x, t.center.y + 3, 5);
      const npc = {
        name: v.name, sprite: v.sprite, pal: v.pal, x, y, reach: 1.6, flip: false, tx: x, ty: y, waitT: rand(1, 4), barkT: rand(4, 12),
        use() { floatText(this.x, this.y, 70, pick(v.barks), '#e8dcc4', 12, { life: 3, vz: 8 }); },
        update(dt) {
          this.waitT -= dt;
          if (this.waitT <= 0) {
            const d = dist(this.x, this.y, this.tx, this.ty);
            if (d < 0.1) { this.waitT = rand(2, 6); [this.tx, this.ty] = t.map.randomNear(t.center.x, t.center.y + 3, 7); return; }
            const s = Math.min(d, 1.1 * dt);
            const nx = this.x + ((this.tx - this.x) / d) * s, ny = this.y + ((this.ty - this.y) / d) * s;
            if (t.map.walkable(nx, ny)) { this.flip = nx < this.x; this.x = nx; this.y = ny; } else this.waitT = 0.5, [this.tx, this.ty] = t.map.randomNear(t.center.x, t.center.y + 3, 7);
          }
          const p = G.player;
          this.barkT -= dt;
          if (p && this.barkT <= 0 && dist(p.x, p.y, this.x, this.y) < 4) { this.barkT = rand(14, 26); this.use(); }
        },
      };
      world.npcs.push(npc);
    }
    world.portals = [{
      x: t.portal.x, y: t.portal.y, active: true, color: '#ff5020', reach: 1.7,
      get label() { return `Portal — Depth ${G.char.depth}`; },
      use: () => this.confirmDungeon(),
    }];
    this.setWorld(world, t.start, old);
    HUD.setArea('Duskhollow', 'Town — a safe haven');
    playMusic('town'); setAmbience('town');
    Vendor.restock();
    const p = G.player;
    p.hp = p.maxHp; p.mana = p.maxMana;
    this.autosave();
  },

  confirmDungeon() {
    const c = G.char;
    const biome = BIOME_BY_ID[c.depth === 100 ? 'throne' : c.nextBiome] || BIOME_BY_ID.catacombs;
    UI.dialog({
      title: `Depth ${c.depth}`,
      html: `<p>The portal hums. Beyond lies <b style="color:#ffb070">${escapeHtml(biome.name)}</b>.</p><p class="dim">Find the exit. It is sealed until its guardian is slain.${c.depth === 100 ? '<br><b style="color:#ff4020">Demon Lord Velscour awaits.</b>' : isRaidDepth(c.depth) ? '<br><b style="color:#ff6030">A BOSS ROOM lies at the end of this depth.</b>' : ''}</p>`,
      buttons: [{ label: 'Not yet' }, { label: 'Enter', cls: 'red', fn: () => this.enterDungeon() }],
    });
  },

  enterDungeon() {
    const c = G.char;
    const depth = c.depth;
    if (depth !== 100 && (!c.nextBiome || c.nextBiome === 'throne')) c.nextBiome = drawBiome(c, depth);
    const biome = BIOME_BY_ID[depth === 100 ? 'throne' : c.nextBiome] || BIOME_BY_ID.catacombs;
    const mix = mixPartner(biome); // a like-coloured biome whose tiles this level borrows, or null
    const loading = document.getElementById('loading');
    document.getElementById('loading-text').textContent = `Descending to Depth ${depth} — ${biome.name}…`;
    loading.classList.remove('hidden');
    sfx('portal');
    // fetch this biome's art first (about 1 MB); if that fails the default set stands in
    setTimeout(async () => {
      try { await Promise.all([loadBiomeArt(biome), mix && loadBiomeArt(mix)]); } catch (e) { console.warn(e); }
      try { this.buildDungeon(depth, biome, mix); } finally { loading.classList.add('hidden'); }
    }, 40);
  },

  buildDungeon(depth, biome, mix = null) {
    const c = G.char;
    const old = G.world;
    const tileset = mix ? mixedTileSet(biome, mix, Math.random() < 0.5) : biomeTileSet(biome);
    const gen = generateDungeon(depth, biome, tileset, (Math.random() * 1e9) | 0);
    const world = new World('dungeon', { map: gen.map, tileset, biome, depth, props: gen.props, torches: gen.torches, looks: gen.looks });
    world.chests = gen.chests.map((ch) => ({
      ...ch, opened: false, reach: 1.3,
      use() {
        if (this.opened) return;
        this.opened = true;
        sfx('chest'); sfx('gold');
        dropChest(world, this, depth);
        sparkle(this.x, this.y, 20, '#ffd060', 20, 0.5);
      },
    }));
    const [sx, sy] = gen.start;
    let tp = [sx + 1.6, sy - 0.6];
    if (!gen.map.walkable(tp[0], tp[1])) tp = gen.map.randomNear(sx, sy, 2);
    const exit = {
      x: gen.exit[0], y: gen.exit[1], type: 'exit', active: false, color: '#5a5a60', reach: 1.6, label: 'Sealed Exit',
      use: () => this.useExit(world, exit),
    };
    world.portals = [
      { x: tp[0], y: tp[1], type: 'town', active: true, color: '#3a8aff', reach: 1.6, label: 'Town Portal', use: () => this.useTownPortal() },
      exit,
    ];
    // monsters
    const lvl = depth;
    for (const s of gen.spawns) {
      if (s.rank === 'raid') {
        const m = makeRaidBoss(world, gen.raid, depth, lvl + 3);
        world.add(m);
        world.boss = m;
        world.raid = m.raid;
        continue;
      }
      if (s.rank === 'boss') {
        const m = makeMonster(world, s.arch, biome, lvl + 2, 'boss', s.x, s.y, 0, s.look);
        world.add(m);
        world.boss = m;
        continue;
      }
      const n = s.n;
      const variant = Math.random() < Math.min(0.5, 0.2 + depth * 0.005) ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const [x, y] = i === 0 ? [s.x, s.y] : gen.map.randomNear(s.x, s.y, 1.6);
        const rank = s.rank === 'unique' ? (i === 0 ? 'unique' : 'normal') : s.rank;
        const m = makeMonster(world, s.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, x, y, variant, s.look);
        if (s.rank === 'unique' && i > 0) { m.affixes = []; m.name = m.name + ' Minion'; }
        world.add(m);
      }
    }
    world.onBossAwake = (m) => {
      UI.centerMsg(m.name, m.isVelscour ? 'The Demon Lord rises' : m.raid ? `${m.title}${m.raid.mods.length ? ' · ' + m.raid.modText() : ''}` : 'Guardian of the Exit', 3);
      sfx('boss');
      playMusic(m.isVelscour ? 'velscour' : 'boss');
    };
    world.onBossKilled = (m) => {
      exit.active = true; exit.color = '#40a0ff'; exit.label = 'Exit — continue';
      const first = !c.cleared[depth];
      c.cleared[depth] = true;
      c.deepest = Math.max(c.deepest || 0, depth);
      UI.centerMsg(m.raid ? `${m.name} DEFEATED` : 'GUARDIAN SLAIN', first ? '+1 bonus skill point · the exit is open' : 'The exit is open', 3.5);
      if (first) { c.skillPoints++; UI.log('Bonus skill point for clearing a new depth!', '#ffd860'); }
      addEffect(new Ring(exit.x, exit.y, 0.2, 3, 1, '#40a0ff', 5));
      sfx('gate');
      playMusic('dungeon');
      UI.refresh();
      this.autosave();
      if (m.isVelscour) setTimeout(() => victoryScreen(() => {}), 3200);
    };
    this.setWorld(world, gen.start, old);
    c.lastBiome = biome.id;
    HUD.setArea(`Depth ${depth}${depth > 100 ? ' — Endless Torment' : ''}`, gen.raid ? `${biome.name} · Boss Room` : biome.name);
    playMusic('dungeon'); setAmbience(biome.id);
    const kin = tileset.mixed && BIOME_BY_ID[tileset.mixed];
    UI.centerMsg(biome.name.toUpperCase(), `Depth ${depth}${kin ? ` · bleeding into the ${kin.name}` : ''}`, 2.4);
    if (!c.tips.dungeon) { c.tips.dungeon = true; setTimeout(() => UI.log('Find the exit portal. It stays sealed until the depth\'s guardian is slain. The blue portal returns you to town.', '#ffe2a0'), 1500); }
    this.autosave();
  },

  useTownPortal() {
    UI.dialog({
      title: 'Return to Town?',
      html: `<p>You will return to Duskhollow. Depth ${G.char.depth} will be re-forged when you come back.</p>`,
      buttons: [{ label: 'Stay' }, { label: 'Return', fn: () => { sfx('portal'); this.enterTown(); } }],
    });
  },

  useExit(world, exit) {
    const c = G.char;
    if (!exit.active) { floatText(exit.x, exit.y, 70, 'Sealed — slay the guardian!', '#ff6040', 13, { life: 1.6 }); sfx('error'); return; }
    const depth = world.depth;
    const next = depth + 1;
    const nb = drawBiome(c, next);
    const nbName = BIOME_BY_ID[nb].name;
    UI.dialog({
      title: `Depth ${depth} Cleared`,
      html: `<p>The way down opens onto <b style="color:#ffb070">${escapeHtml(nbName)}</b> (Depth ${next}).</p><p class="dim">Continue the descent, or return to town to trade — the town portal will lead to Depth ${next}.</p>`,
      closable: false,
      buttons: [
        { label: 'Return to Town', fn: () => { c.depth = next; c.nextBiome = nb; sfx('portal'); this.enterTown(); } },
        { label: `Descend to Depth ${next}`, cls: 'red', fn: () => { c.depth = next; c.nextBiome = nb; this.enterDungeon(); } },
      ],
    });
  },

  onPlayerDeath(src) {
    const c = G.char;
    const w = G.world;
    c.deaths = (c.deaths || 0) + 1;
    const depth = w ? w.depth : c.depth;
    const killer = src ? (src.owner ? src.owner.name : src.name) : null;
    stopMusic();
    this.autosave();
    setTimeout(() => {
      deathScreen(depth, killer, () => {
        c.depth = 1;
        c.nextBiome = drawBiome(c, 1);
        const p = G.player;
        p.dead = false;
        p.buffs = [];
        p.recompute();
        p.hp = p.maxHp; p.mana = p.maxMana;
        this.enterTown();
        UI.log('You awaken in Duskhollow. The descent begins anew at Depth 1.', '#ff8060');
      });
    }, 1700);
  },

  hudAction(act) {
    switch (act) {
      case 'inventory': case 'character': toggleInventory(); break;
      case 'skills': toggleTree(); break;
      case 'book': toggleBook(); break;
      case 'quest': toggleQuest(); break;
      case 'menu': pauseMenu(); break;
      case 'auto': Auto.toggle(); break;
    }
  },

  // ------------------------------------------------------------ frame
  update(dt) {
    const w = G.world, p = G.player;
    if (!w || !p) return;
    const ui = UI;
    if (!ui.modal) {
      if (input.consume('KeyI')) toggleInventory();
      if (input.consume('KeyK') || input.consume('KeyT')) toggleTree();
      if (input.consume('KeyB')) toggleBook();
      if (input.consume('KeyQ')) toggleQuest();
      if (input.consume('KeyH')) helpDialog();
      if (input.consume('KeyP')) Auto.toggle();
      if (input.consume('Tab') || input.consume('KeyM')) G.showAutomap = !G.showAutomap;
      if (input.consume('Escape')) {
        if (ui.anyOpen()) ui.closeAll();
        else if (G.showAutomap) G.showAutomap = false;
        else pauseMenu();
      }
    } else if (input.consume('Escape')) {
      const top = UI.screensEl.lastElementChild;
      if (top && top.querySelector('.dialog-box')) top.dispatchEvent(new PointerEvent('pointerdown'));
    }
    const pauseMenus = G.settings.pauseMenus !== false && w.kind === 'dungeon' && ui.anyOpen();
    G.paused = ui.modal || pauseMenus;
    if (G.hitStop > 0) { G.hitStop -= dt; controls.update(0); }
    else if (!G.paused) {
      Auto.noteInput();
      controls.update(dt);
      Auto.update(dt);
      w.update(dt);
      footsteps(p, w.kind === 'town' ? 'dirt' : STEP_SURFACE[w.biome && w.biome.id] || 'stone');
      Meter.tick(dt);
    } else {
      input.endFrame();
    }
    camera.follow(p.x, p.y, dt);
    camera.update(dt);
    if (G.hurtFlash > 0) G.hurtFlash = Math.max(0, G.hurtFlash - dt * 1.5);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2);
    HUD.update(dt);
    if (G.touch) TouchUI.update();
    // hovering things -> cursor
    G.canvas.style.cursor = G.hover ? 'pointer' : '';
    saveT += dt;
    if (saveT > 30) this.autosave();
  },

  render() {
    const w = G.world;
    if (!w) return;
    renderWorld(G.ctx, w);
    if (G.showAutomap) {
      const W = G.W * G.dpr, H = G.H * G.dpr;
      if (!automapCanvas || automapCanvas.width !== W || automapCanvas.height !== H) automapCanvas = makeCanvas(W, H);
      drawMinimap(w, 0, automapCanvas, true);
      const ctx = G.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.9; ctx.drawImage(automapCanvas, 0, 0); ctx.globalAlpha = 1;
    }
  },
};

export { Monster, CLASSES, fmtInt, randi };
