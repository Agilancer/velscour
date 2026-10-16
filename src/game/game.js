// Game flow: characters, town, dungeon depths, death, victory.
import { G } from '../state.js';
import { input } from '../core/input.js';
import { camera } from '../core/view.js';
import { sfx, playMusic, stopMusic, setAmbience, stopAmbience, footsteps } from '../core/audio.js';
import { rand, pick, randi, escapeHtml, dist, makeCanvas, fmtInt } from '../core/util.js';
import { biomeTileSet, loadBiomeArt, mixedTileSet } from '../core/assets.js';
import { loadArtFor } from '../core/enemyart.js';
import { loadClassArt } from '../core/classart.js';
import { loadGearArt } from '../core/gearart.js';
import { preloadBarFx } from '../gfx/artfx.js';
import { SKILLS } from '../data/skills.js';
import { setClassItems, setRingContext } from '../data/items.js';
import { BIOMES, BIOME_BY_ID, TOWN_BIOME, drawBiome, mixPartner, recordBiomeVisit } from '../data/biomes.js';
import { CLASSES } from '../data/classes.js';
import { generateDungeon, isRaidDepth } from '../world/dungeon.js';
import { FINAL_DEPTH, depthLevel } from '../data/depth.js';
import { generateTown, makeTownTiles, rollTownWeather } from '../world/town.js';
import { generateOverworld } from '../world/overworld.js';
import { createOverworldScenario } from './overworld.js';
import { createSeaOfSandScenario } from './seaofsand.js';
import { loadSeaOfSandPack } from '../gfx/seaofsand.js';
import { loadCastlePack } from '../gfx/castle.js';
import { World } from './world.js';
import { Player } from './player.js';
import { makeMonster, Monster } from './monster.js';
import { applyTrait, rollTrait, ambushTick, madnessTick, unleashMadness } from './mayhem.js';
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
import { Stash } from '../ui/stash.js';
import { TOWNSFOLK, townLine, townEvent, townConversation } from '../data/townsfolk.js';
import { toggleInventory } from '../ui/inventory.js';
import { toggleTree, toggleBook } from '../ui/skills.js';
import { toggleQuest } from '../ui/quest.js';
import { titleScreen, hide as hideScreen, deathScreen, victoryScreen, pauseMenu, helpDialog } from '../ui/screens.js';

const STEP_SURFACE = { sunken: 'water', plague: 'water', serpent: 'water', library: 'wood', gilded: 'wood', sea_of_sand:'sand' };   // footstep sounds; default stone

const VELSCOUR_TAUNT_STARTS = [
  'WHY ARE YOU TRYING TO CONTACT VELSCOUR', 'WHAT MADE YOU THINK VELSCOUR WANTS TO HEAR FROM YOU',
  'DID YOU REALLY EXPECT VELSCOUR TO ANSWER', 'WHO TOLD YOU VELSCOUR TAKES MESSAGES',
  'IS THIS HOW YOU PLAN TO CHALLENGE VELSCOUR', 'DO YOU HAVE A DEATH WISH OR JUST POOR MANNERS',
  'WHY SUMMON A DEMON LORD WHEN YOU CAN BOTHER ANYONE ELSE', 'DID THE GRAVEYARD RECOMMEND THIS CONTACT METHOD',
  'ARE YOU LOST OR JUST COMMITTED TO MAKING THINGS WORSE', 'WHAT PART OF DOOM DID YOU MISTAKE FOR CUSTOMER SERVICE',
  'DID YOU BRING A MESSAGE OR JUST YOUR LAST WORDS', 'WHY IS YOUR FIRST IDEA ALWAYS THE MOST CURSED ONE',
  'DO YOU THINK HELL HAS A RECEPTION DESK', 'HOW MANY BAD DECISIONS FIT IN ONE SHORT MESSAGE',
  'ARE YOU TRYING TO NEGOTIATE WITH THE END OF YOU', 'DID YOUR COMMON SENSE DIE BEFORE YOU GOT HERE',
  'WHAT COULD POSSIBLY GO WRONG THIS TIME', 'WHY ASK THE ABYSS TO NOTICE YOU',
  'IS THIS BRAVERY OR A VERY SPECIFIC KIND OF STUPID', 'DID YOU THINK THE DEMON LORD WAS BETWEEN APPOINTMENTS',
];
const VELSCOUR_TAUNT_ENDS = [
  'He is busy polishing the thing that will end your adventure.', 'The abyss has a strict no refunds policy.',
  'Your courage is adorable. Your odds are not.', 'Hell called; it said to stop making it awkward.',
  'Please leave a message after the screaming.', 'The last visitor left as a cautionary stain.',
  'He read your aura and marked it spam.', 'Your odds are somewhere beneath the floor.',
  'This conversation may be recorded for the inquest.', 'Even the skeletons are embarrassed for you.',
  'The waiting room is just a pit with better lighting.', 'He is currently unavailable for mortal nonsense.',
  'Your bravery has been forwarded to the nearest grave.', 'The reply window is sealed until the heat death of hope.',
  'A single black candle is being lit in your honor.', 'The demons drew lots. Nobody wanted to answer.',
  'You have reached the bottom of the bad idea barrel.', 'Please hold. Eternity is estimated at eternity.',
  'Your message will be delivered by a very nervous imp.', 'There is no safe word in the terms of service.',
  'Somewhere, a lich just sighed at your decision.', 'The abyss knows your name and still declined.',
  'This is why the dead keep their phones on silent.', 'Try again when your survival instinct returns.',
  'Your next of kin may appreciate the initiative.',
];
const VELSCOUR_TAUNTS = VELSCOUR_TAUNT_STARTS.flatMap((start) => VELSCOUR_TAUNT_ENDS.map((end) => `${start}? ${end}`));

let townCache = null, townTiles = null;
let saveT = 0;
let automapCanvas = null;

export const game = {
  // ------------------------------------------------------------ characters
  // async: the class's art pack (if it has one) loads first, because it names the class's catalog items
  async newChar(classId, name) {
    await this.loadClassPack(classId);
    const c = newCharData(classId, name);
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
    setRingContext(c.classId, c.skills);
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
        UI.centerMsg('HERRINGTON HOLLOW', 'The last town above the abyss', 3.5);
        UI.log(`Welcome, ${escapeHtml(c.name)}. Visit the vendors, then step into the <b style="color:#ff8050">portal</b> at the edge of town.`, '#ffe2a0');
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
    // every hero has a town of their own: the layout is rolled from c.townSeed
    if (!townCache || townCache.seed !== c.townSeed) townCache = generateTown(tileset, c.townSeed);
    const t = townCache;
    t.map.seen.fill(0);
    const world = new World('town', { map: t.map, tileset, biome: TOWN_BIOME, depth: 0, townTiles, buildings: t.buildings, props: t.props, wallHangings: t.wallHangings });
    world.raining = rollTownWeather();
    world.npcs = t.npcs.map((n) => ({ vendor: n.vendor, x: n.x, y: n.y, reach: 1.8, flip: n.flip, use: () => Vendor.open(n.vendor.id) }));
    // the storage chest, beside the well where the hero arrives
    {
      let [x, y] = [t.start[0] + 1.5, t.start[1] - 0.5];
      if (!t.map.walkable(x, y)) [x, y] = t.map.randomNear(t.start[0], t.start[1], 2.5);
      world.npcs.push({ stash: true, name: 'Storage Chest', x, y, reach: 1.6, flip: false, use: () => Stash.open() });
    }
    c.townVisitCount = (c.townVisitCount || 0) + 1;
    const visit = c.townVisitCount, rand01 = (()=>{let s=((c.townSeed||1)+visit*0x9e3779b9)>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;};})();
    const ordinary=TOWNSFOLK.filter(v=>!v.royal&&!v.regular&&!v.child&&!v.courtier);
    const shuffled=ordinary.slice().sort(()=>rand01()-.5);
    const regulars=TOWNSFOLK.filter(v=>v.regular);
    const familyId=`family_${1+Math.floor(rand01()*5)}`;
    const family=TOWNSFOLK.filter(v=>v.familyId===familyId),familyParent=family.find(v=>!v.child),familyChildren=family.filter(v=>v.child);
    const visitors=[regulars[(visit-1)%regulars.length],regulars[visit%regulars.length],...shuffled.slice(0,4+Math.floor(rand01()*3)),familyParent,...familyChildren];
    if(visit%3===0){const court=TOWNSFOLK.filter(v=>v.royal||v.courtier);visitors.push(...court);}
    const uniqueVisitors=new Map(visitors.map(v=>[v.id,v]));
    visitors.splice(0,visitors.length,...uniqueVisitors.values());
    const eventSlot=Math.floor(rand01()*2000);
    world.townEvent=townEvent(visit,eventSlot);world.townEventIndex=eventSlot;
    const addCast=people=>{for(const person of people)if(person&&!visitors.some(v=>v.id===person.id))visitors.push(person);};
    const kind=world.townEvent.kind;
    if(kind==='royal_visit')addCast(TOWNSFOLK.filter(v=>v.royal||v.courtier));
    if(kind==='returning_knights')addCast(TOWNSFOLK.filter(v=>v.knight).slice(0,3));
    if(kind==='birth')addCast([TOWNSFOLK.find(v=>v.role==='midwife'),...TOWNSFOLK.filter(v=>v.child&&v.familyId===familyId).slice(0,1)]);
    if(kind==='wedding'||kind==='engagement')addCast(shuffled.filter(v=>!v.child).slice(0,2));
    if(kind==='funeral')addCast(regulars.slice(0,2));
    if(kind==='harvest_fair'||kind==='market_show'||kind==='caravan')addCast(TOWNSFOLK.filter(v=>['musician','merchant','storyteller','town crier'].includes(v.role)).slice(0,2));
    if(world.townEvent.attack||kind==='enemy_scouts'||kind==='siege_warning'||kind==='monster_sighting')addCast([...TOWNSFOLK.filter(v=>v.knight).slice(0,2),...TOWNSFOLK.filter(v=>v.role==='guard').slice(0,1)]);
    const visitorById=new Map(visitors.map(v=>[v.id,v]));visitors.splice(0,visitors.length,...visitorById.values());
    const eventActor=v=>kind==='royal_visit'?v.royal||v.courtier:kind==='returning_knights'?v.knight:kind==='birth'?v.role==='midwife'||v.familyId===familyId:kind==='wedding'||kind==='engagement'?!v.child&&!v.royal:kind==='funeral'?v.regular:kind==='street_fight'?v.knight:kind==='enemy_scouts'||kind==='siege_warning'||kind==='monster_sighting'?v.knight||v.role==='guard':kind==='harvest_fair'||kind==='market_show'||kind==='caravan'?['merchant','musician','storyteller','town crier'].includes(v.role):false;
    const eventActors=visitors.filter(eventActor).slice(0,4),eventActorIds=new Set(eventActors.map(v=>v.id));
    const eventChatter=eventActors.length>1?townConversation(eventActors[0],eventActors[1],visit,eventSlot):[];
    const fightSpots=world.townEvent.attack?[t.map.randomNear(t.center.x,t.center.y+2,1.8),t.map.randomNear(t.center.x+1.1,t.center.y+2,1.8)]:null;
    const destinations=[...t.npcs.map(n=>[n.x+(rand01()-.5)*1.4,n.y+(rand01()-.5)*1.4]),[t.center.x,t.center.y+2],[t.center.x+2,t.center.y+1]];
    const chooseDestination=()=>{const target=destinations[Math.floor(rand01()*destinations.length)];const [x,y]=t.map.randomNear(target[0],target[1],1.7);return [x,y];};
    for (let vi=0;vi<visitors.length;vi++) {
      const v=visitors[vi], [x,y] = t.map.randomNear(t.center.x, t.center.y + 3, 5), knightRank=visitors.filter(q=>q.knight).findIndex(q=>q.id===v.id), staged=eventActorIds.has(v.id), [tx,ty]=fightSpots&&v.knight&&knightRank<2?fightSpots[knightRank]:staged?t.map.randomNear(t.center.x,t.center.y+2,2.6):chooseDestination();
      const npc = {
        id:v.id,name: v.name,role:v.role,sprite: v.sprite,spriteId:v.spriteId,townsfolkSpriteId:v.spriteId,pal:v.palette,townsfolkId:v.id,frameCount:v.frame.count,child:v.child,royal:v.royal,courtier:v.courtier,knight:v.knight,familyId:v.familyId,
        x, y, reach: 1.6, flip: false, tx, ty, waitT: rand(1, 4), barkT: rand(7, 15),
        talkText:eventActorIds.has(v.id)?(v.id===eventActors[0]?.id?world.townEvent.text:eventChatter[eventActors.findIndex(a=>a.id===v.id)%2]||''): '',talkT:eventActorIds.has(v.id)?8:0,chatT:rand(2,8),
        townMood:eventActorIds.has(v.id)?world.townEvent.emote:null,
        townMoodT:eventActorIds.has(v.id)?18:0,
        townPoseFrame:eventActorIds.has(v.id)?({celebration:10,affection:9,birth:9,alarm:vi%2?8:7,fight:8,royal:10,relief:9})[world.townEvent.emote]??1:1,
        townPoseT:eventActorIds.has(v.id)?7:0,
        townAttackT:world.townEvent.attack&&v.knight&&knightRank<2?5.5:0,townAttackSeed:vi*2.3,
        use() { this.talkText=townLine(v.id,visit);this.talkT=4.5;floatText(this.x,this.y,70,this.talkText,'#e8dcc4',12,{life:3,vz:8}); },
        update(dt) {
          this.talkT=Math.max(0,this.talkT-dt);this.townMoodT=Math.max(0,this.townMoodT-dt);this.townPoseT=Math.max(0,this.townPoseT-dt);this.townAttackT=Math.max(0,this.townAttackT-dt);this.chatT=Math.max(0,this.chatT-dt);this.waitT -= dt;
          if (this.waitT <= 0) {
            const d = dist(this.x, this.y, this.tx, this.ty);
            if (d < 0.65) {
              this.walking=false;this.waitT=rand(3,7);
              if(this.chatT<=0){const other=world.npcs.find(q=>q!==this&&!q.vendor&&!q.stash&&dist(q.x,q.y,this.x,this.y)<2.2&&(!q.chatT||q.chatT<=0));
                if(other){const [one,two]=townConversation(v,other,visit,world.townEventIndex);this.talkText=one;this.talkT=3.8;other.talkText=two;other.talkT=3.8;this.chatT=other.chatT=rand(12,22);}}
              [this.tx, this.ty] = chooseDestination(); return;
            }
            const s = Math.min(d, 1.1 * dt);
            const nx = this.x + ((this.tx - this.x) / d) * s, ny = this.y + ((this.ty - this.y) / d) * s;
            if (t.map.walkable(nx, ny)) { this.walking=true;this.flip = nx < this.x; this.x = nx; this.y = ny; } else this.waitT = 0.5, [this.tx, this.ty] = chooseDestination();
          }
          const p = G.player;
          this.barkT -= dt;
          if (p && this.barkT <= 0 && dist(p.x, p.y, this.x, this.y) < 4) { this.barkT = rand(18, 32);this.talkText=townLine(v.id,visit,Math.floor(rand01()*8));this.talkT=3.6; }
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
    HUD.setArea('Herrington Hollow', 'Town — a safe haven');
    playMusic('town'); setAmbience('town');
    Vendor.restock();
    const p = G.player;
    p.hp = p.maxHp; p.mana = p.maxMana;
    this.autosave();
  },

  confirmDungeon() {
    const c = G.char;
    const biome = BIOME_BY_ID[c.depth === FINAL_DEPTH ? 'throne' : c.nextBiome] || BIOME_BY_ID.catacombs;
    UI.dialog({
      title: `Depth ${c.depth}`,
      html: `<p>The portal hums. Beyond lies <b style="color:#ffb070">${escapeHtml(biome.name)}</b>.</p><p class="dim">${biome.id === 'sea_of_sand' ? 'Follow the cliff maze and clear every marked scenario area to open the exit.' : biome.overworld ? 'Activate the scenario shrine and complete its trial to open the exit.' : 'Find the exit. It is sealed until its guardian is slain.'}${c.depth === FINAL_DEPTH ? '<br><b style="color:#ff4020">Demon Lord Velscour awaits.</b>' : !biome.overworld && isRaidDepth(c.depth) ? '<br><b style="color:#ff6030">A BOSS ROOM lies at the end of this depth.</b>' : ''}</p>`,
      buttons: [{ label: 'Not yet' }, { label: 'Enter', cls: 'red', fn: () => this.enterDungeon() }],
    });
  },

  openVelscourContact() {
    const taunt = VELSCOUR_TAUNTS[(Math.random() * VELSCOUR_TAUNTS.length) | 0];
    const dialog = UI.dialog({
      title: 'WHY ARE YOU TRYING TO CONTACT VELSCOUR',
      cls: 'velscour-contact-dialog',
      html: `<p class="velscour-taunt">${escapeHtml(taunt)}</p><label class="velscour-message-label" for="velscour-message">Send a message into the abyss</label><div class="velscour-message-row"><input id="velscour-message" class="name-input" type="text" maxlength="50" autocomplete="off" placeholder="50 characters, tops"><span id="velscour-message-count">0 / 50</span></div>`,
      buttons: [
        { label: 'Close' },
        { label: 'Send', cls: 'red', keepOpen: true, fn: (close) => {
          const message = document.getElementById('velscour-message')?.value || '';
          if (message === 'HAIL VELSCOUR!') {
            close();
            this.openVelscourTeleport();
          }
        } },
      ],
    });
    const inputEl = dialog.box.querySelector('#velscour-message');
    const countEl = dialog.box.querySelector('#velscour-message-count');
    inputEl.addEventListener('input', () => { countEl.textContent = `${inputEl.value.length} / 50`; });
  },

  openVelscourTeleport() {
    const options = BIOMES.map((biome) => `<option value="${escapeHtml(biome.id)}">${escapeHtml(biome.name)}${biome.overworld ? ' · Overworld' : ''}</option>`).join('');
    const dialog = UI.dialog({
      title: 'CHOOSE YOUR DOOM',
      cls: 'velscour-teleport-dialog',
      html: `<p>Select a biome. Your current depth will be reforged with a fresh path.</p><label class="velscour-message-label" for="velscour-biome">Destination biome</label><select id="velscour-biome" class="velscour-biome-select">${options}</select>`,
      buttons: [
        { label: 'Cancel' },
        { label: 'Teleport', cls: 'red', fn: () => {
          const id = dialog.box.querySelector('#velscour-biome').value;
          const biome = BIOME_BY_ID[id];
          if (biome) this.teleportToBiome(biome);
        } },
      ],
    });
  },

  async teleportToBiome(biome) {
    const c = G.char;
    if (!c || !biome) return;
    if (Auto.on) Auto.toggle(false);
    const depth = Math.max(1, G.world?.kind === 'dungeon' ? G.world.depth : c.depth || 1);
    c.depth = depth;
    c.nextBiome = biome.id;
    if (biome.id === 'sea_of_sand') {
      c.seaOfSandRuns ||= {};
      delete c.seaOfSandRuns[depth];
    }
    const loading = document.getElementById('loading');
    document.getElementById('loading-text').textContent = `Answering Velscour — Depth ${depth} · ${biome.name}…`;
    loading.classList.remove('hidden');
    try {
      if (biome.id === 'sea_of_sand') await loadSeaOfSandPack();
      else if (!biome.overworld) await loadBiomeArt(biome);
      const mix = mixPartner(biome);
      if (mix && !biome.overworld) await loadBiomeArt(mix);
      this.buildDungeon(depth, biome, mix);
      const w = G.world;
      await loadArtFor([...w.creatures.map((m) => m.art), ...(w.looks ? w.looks.ids() : [])]).catch((e) => console.warn(e));
    } catch (e) {
      console.warn(e);
      UI.log('The abyss rejected that destination. Try the skull again.', '#ff8060');
    } finally {
      loading.classList.add('hidden');
      this.autosave();
    }
  },

  enterDungeon() {
    const c = G.char;
    const depth = c.depth;
    if (depth !== FINAL_DEPTH && (!c.nextBiome || c.nextBiome === 'throne')) c.nextBiome = drawBiome(c, depth);
    const biome = BIOME_BY_ID[depth === FINAL_DEPTH ? 'throne' : c.nextBiome] || BIOME_BY_ID.catacombs;
    const mix = mixPartner(biome); // a like-coloured biome whose tiles this level borrows, or null
    const loading = document.getElementById('loading');
    document.getElementById('loading-text').textContent = `Descending to Depth ${depth} — ${biome.name}…`;
    loading.classList.remove('hidden');
    sfx('portal');
    // fetch this biome's art first (about 1 MB); if that fails the default set stands in
    setTimeout(async () => {
      try {
        if (biome.id === 'sea_of_sand') await loadSeaOfSandPack();
        else if (biome.id === 'castle') await loadCastlePack();
        else if (!biome.overworld) await Promise.all([loadBiomeArt(biome), mix && loadBiomeArt(mix)]);
      } catch (e) { console.warn(e); }
      try {
        this.buildDungeon(depth, biome, mix);
        // the level's monster art (set 2 sheets load per level); a failed sheet falls back to pixel sprites
        const w = G.world;
        await loadArtFor([...w.creatures.map((m) => m.art), ...(w.looks ? w.looks.ids() : [])]).catch((e) => console.warn(e));
      } finally { loading.classList.add('hidden'); }
    }, 40);
  },

  buildDungeon(depth, biome, mix = null) {
    const c = G.char;
    const old = G.world;
    const tileset = biome.overworld ? biomeTileSet(TOWN_BIOME) : mix ? mixedTileSet(biome, mix, Math.random() < 0.5) : biomeTileSet(biome);
    c.seaOfSandRuns ||= {};
    const seed = biome.id === 'sea_of_sand' && c.seaOfSandRuns[depth]
      ? c.seaOfSandRuns[depth].seed : (Math.random() * 1e9) | 0;
    const gen = biome.overworld ? generateOverworld(depth, biome, seed) : generateDungeon(depth, biome, tileset, seed);
    const world = new World('dungeon', { map: gen.map, tileset, biome, depth, props: gen.props, torches: gen.torches, wallHangings: gen.wallHangings, looks: gen.looks, townTiles: gen.townTiles || null, buildings: gen.buildings || [] });
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
    const lvl = depthLevel(depth);
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
      const trait = rollTrait(world, depth);
      for (let i = 0; i < n; i++) {
        const [x, y] = i === 0 ? [s.x, s.y] : gen.map.randomNear(s.x, s.y, 1.6);
        const rank = s.rank === 'unique' ? (i === 0 ? 'unique' : 'normal') : s.rank;
        const m = makeMonster(world, s.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, x, y, variant, s.look);
        if (s.rank === 'unique' && i > 0) { m.affixes = []; m.name = m.name + ' Minion'; }
        // tanks and bullet-hell casters lead their pack; hunters, phasers and burrowers come as a pack
        if (trait && (i === 0 || ['hunter', 'phaser', 'burrower'].includes(trait))) applyTrait(m, trait);
        world.add(m);
      }
    }
    world.roster = [...new Set(gen.spawns.filter((s) => s.arch && !['raid', 'boss'].includes(s.rank)).map((s) => s.arch))];
    world.onBossAwake = (m) => {
      UI.centerMsg(m.name, m.isVelscour ? 'The Demon Lord rises' : m.raid ? `${m.title}${m.raid.mods.length ? ' · ' + m.raid.modText() : ''}` : 'Guardian of the Exit', 3);
      sfx('boss');
    };
    world.onBossKilled = (m) => {
      if (biome.overworld) return;
      exit.active = true; exit.color = '#40a0ff'; exit.label = 'Exit — continue';
      const first = !c.cleared[depth];
      c.cleared[depth] = true;
      c.deepest = Math.max(c.deepest || 0, depth);
      UI.centerMsg(m.raid ? `${m.name} DEFEATED` : 'GUARDIAN SLAIN', first ? '+1 bonus skill point · the exit is open' : 'The exit is open', 3.5);
      if (first) { c.skillPoints++; UI.log('Bonus skill point for clearing a new depth!', '#ffd860'); }
      addEffect(new Ring(exit.x, exit.y, 0.2, 3, 1, '#40a0ff', 5));
      sfx('gate');
      UI.refresh();
      this.autosave();
      if (m.isVelscour) setTimeout(() => victoryScreen(() => {}), 3200);
    };
    if (biome.id === 'sea_of_sand') world.overworldScenario = createSeaOfSandScenario(world, gen, biome, () => {
      exit.active = true; exit.color = '#40a0ff'; exit.label = 'Exit — continue';
      const first = !c.cleared[depth];
      c.cleared[depth] = true;
      c.deepest = Math.max(c.deepest || 0, depth);
      if (first) { c.skillPoints++; UI.log('Bonus skill point for completing the Sea of Sand route!', '#ffd860'); }
      addEffect(new Ring(exit.x, exit.y, 0.2, 3, 1, '#40a0ff', 5));
      sfx('gate'); UI.refresh(); this.autosave();
    });
    else if (biome.overworld) world.overworldScenario = createOverworldScenario(world, gen, biome, () => {
      exit.active = true; exit.color = '#40a0ff'; exit.label = 'Exit — continue';
      const first = !c.cleared[depth];
      c.cleared[depth] = true;
      c.deepest = Math.max(c.deepest || 0, depth);
      if (first) { c.skillPoints++; UI.log('Bonus skill point for completing the overworld scenario!', '#ffd860'); }
      addEffect(new Ring(exit.x, exit.y, 0.2, 3, 1, '#40a0ff', 5));
      sfx('gate'); UI.refresh(); this.autosave();
    });
    this.setWorld(world, gen.start, old);
    recordBiomeVisit(c, biome, depth);
    c.lastBiome = biome.id;
    HUD.setArea(`Depth ${depth}${depth > FINAL_DEPTH ? ' — Endless Torment' : ''}`, biome.overworld ? `${biome.name} · ${world.overworldScenario.title}` : gen.raid ? `${biome.name} · Boss Room` : biome.name);
    stopMusic(); setAmbience(biome.id);
    const kin = tileset.mixed && BIOME_BY_ID[tileset.mixed];
    UI.centerMsg(biome.name.toUpperCase(), `Depth ${depth}${kin ? ` · bleeding into the ${kin.name}` : ''}`, 2.4);
    if (biome.id === 'sea_of_sand') UI.log(`Secure ${gen.scenarioCount} marked scenario area${gen.scenarioCount===1?'':'s'} to open the exit. Rewards improve with each clear.`, '#ffe2a0');
    else if (biome.overworld) UI.log('Activate the glowing shrine and complete its objective to open the exit.', '#ffe2a0');
    else if (!c.tips.dungeon) { c.tips.dungeon = true; setTimeout(() => UI.log('Find the exit portal. It stays sealed until the depth\'s guardian is slain. The blue portal returns you to town.', '#ffe2a0'), 1500); }
    this.autosave();
  },

  useTownPortal() {
    UI.dialog({
      title: 'Return to Town?',
      html: `<p>You will return to Herrington Hollow. Depth ${G.char.depth} will be re-forged when you come back.</p>`,
      buttons: [{ label: 'Stay' }, { label: 'Return', fn: () => { sfx('portal'); this.enterTown(); } }],
    });
  },

  useExit(world, exit) {
    const c = G.char;
    if (!exit.active) { floatText(exit.x, exit.y, 70, world.overworldScenario ? 'Sealed — complete the shrine trial!' : 'Sealed — slay the guardian!', '#ff6040', 13, { life: 1.6 }); sfx('error'); return; }
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
        // back to the start of the five depths before the wall: grind them for XP and gear, then try again
        c.depth = Math.max(1, Math.floor((depth - 1) / 5) * 5 - 4);
        c.nextBiome = drawBiome(c, c.depth);
        const p = G.player;
        p.dead = false;
        p.buffs = [];
        p.recompute();
        p.hp = p.maxHp; p.mana = p.maxMana;
        this.enterTown();
        UI.log(`You awaken in Herrington Hollow. The descent begins anew at Depth ${c.depth}.`, '#ff8060');
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
      if (input.consume('KeyG')) unleashMadness();
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
      if (w.overworldScenario) w.overworldScenario.update(dt);
      ambushTick(w, dt);
      madnessTick(dt);
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
