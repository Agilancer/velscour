import assert from 'node:assert/strict';
import fs from 'node:fs';

// Minimal DOM + Canvas mock for headless Node UI/save/vanity/macro verification
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

class MockClassList {
  constructor(init = '') {
    this.set = new Set(init.split(/\s+/).filter(Boolean));
  }
  add(...cs) { for (const c of cs) if (c) this.set.add(c); }
  remove(...cs) { for (const c of cs) this.set.delete(c); }
  toggle(c, force) {
    const on = force !== undefined ? !!force : !this.set.has(c);
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  contains(c) { return this.set.has(c); }
  toString() { return [...this.set].join(' '); }
}

class MockNode {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this._className = '';
    this.classList = new MockClassList();
    this._innerHTML = '';
    this._textContent = '';
    this.listeners = {};
    this.offsetWidth = 420;
    this.offsetHeight = 360;
    this.clientWidth = 1280;
    this.clientHeight = 720;
    if (this.tagName === 'CANVAS') {
      this.width = 64;
      this.height = 64;
    }
  }
  get className() { return this.classList.toString(); }
  set className(v) {
    this._className = String(v || '');
    this.classList = new MockClassList(this._className);
  }
  get innerHTML() {
    if (this.children.length) return this.children.map((c) => c.outerHTML).join('');
    return this._innerHTML;
  }
  set innerHTML(v) {
    this._innerHTML = String(v || '');
    this._textContent = this._innerHTML.replace(/<[^>]+>/g, '');
    this.children = [];
    const tagRe = /<([a-zA-Z0-9]+)\b([^>]*?)>/g;
    let m;
    while ((m = tagRe.exec(this._innerHTML)) !== null) {
      const tag = m[1].toLowerCase();
      if (tag === 'br' || tag === 'hr') continue;
      const attrs = m[2] || '';
      const child = new MockNode(tag);
      const idM = attrs.match(/\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
      if (idM) child.id = idM[1] ?? idM[2] ?? idM[3];
      const clsM = attrs.match(/\bclass=(?:"([^"]*)"|'([^']*)')/);
      if (clsM) child.className = clsM[1] ?? clsM[2];
      const typeM = attrs.match(/\btype=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
      if (typeM) child.type = typeM[1] ?? typeM[2] ?? typeM[3];
      const dataRe = /\bdata-([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let dm;
      while ((dm = dataRe.exec(attrs)) !== null) {
        const camel = dm[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        child.dataset[camel] = dm[2] ?? dm[3] ?? dm[4] ?? '';
      }
      child.parentNode = this;
      this.children.push(child);
    }
  }
  get outerHTML() {
    if (!this.children.length || this._innerHTML) {
      const cls = this.className ? ` class="${this.className}"` : '';
      const dp = this.dataset.panel ? ` data-panel="${this.dataset.panel}"` : '';
      const inner = this._innerHTML || this.children.map((c) => c.outerHTML).join('');
      return `<${this.tagName.toLowerCase()}${cls}${dp}>${inner}</${this.tagName.toLowerCase()}>`;
    }
    const cls = this.className ? ` class="${this.className}"` : '';
    const dp = this.dataset.panel ? ` data-panel="${this.dataset.panel}"` : '';
    return `<${this.tagName.toLowerCase()}${cls}${dp}>${this.children.map((c) => c.outerHTML).join('')}</${this.tagName.toLowerCase()}>`;
  }
  get textContent() {
    if (this.children.length) return this.children.map((c) => c.textContent).join('');
    return this._textContent;
  }
  set textContent(v) {
    this._textContent = String(v ?? '');
    this._innerHTML = this._textContent;
    this.children = [];
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  prepend(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.unshift(child);
    return child;
  }
  insertBefore(child, ref) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const idx = ref ? this.children.indexOf(ref) : -1;
    if (idx >= 0) this.children.splice(idx, 0, child);
    else this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  get firstChild() { return this.children[0] || null; }
  addEventListener(ev, fn) {
    this.listeners[ev] = this.listeners[ev] || [];
    this.listeners[ev].push(fn);
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }
  getBoundingClientRect() { return { left: 100, top: 80, right: 520, bottom: 440, width: this.offsetWidth, height: this.offsetHeight }; }
  contains(other) {
    let cur = other;
    while (cur) { if (cur === this) return true; cur = cur.parentNode; }
    return false;
  }
  closest() { return null; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const parts = sel.split(',').map((s) => s.trim()).filter(Boolean);
    const matchOne = (n, s) => {
      if (s.startsWith('.')) return n.classList.contains(s.slice(1));
      if (s.startsWith('#')) return n.id === s.slice(1);
      const dataAttr = s.match(/^\[data-([a-zA-Z0-9-]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
      if (dataAttr) {
        const camel = dataAttr[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        return dataAttr[2] !== undefined ? n.dataset[camel] === dataAttr[2] : camel in n.dataset;
      }
      const inputType = s.match(/^input\[type=['"]?([a-z]+)['"]?\]$/i);
      if (inputType) return n.tagName === 'INPUT' && n.type === inputType[1];
      return n.tagName.toLowerCase() === s.toLowerCase();
    };
    const walk = (n) => {
      for (const c of n.children) {
        if (parts.some((p) => matchOne(c, p))) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  getContext() {
    const grad = { addColorStop() {} };
    return {
      save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {},
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
      quadraticCurveTo() {}, bezierCurveTo() {}, fill() {}, stroke() {}, clip() {},
      translate() {}, rotate() {}, scale() {}, drawImage() {}, fillText() {}, strokeText() {},
      createRadialGradient: () => grad,
      createLinearGradient: () => grad,
      setLineDash() {},
    };
  }
  toDataURL() { return 'data:image/png;base64,AAAA'; }
}

globalThis.Image = class MockImage extends MockNode {
  constructor() { super('img'); this.src = ''; }
};

const elsById = new Map();
const makeIdEl = (id, tag = 'div') => {
  const n = new MockNode(tag);
  n.id = id;
  elsById.set(id, n);
  return n;
};
const bodyEl = new MockNode('body');
for (const id of ['panels', 'tooltip', 'drag-ghost', 'log', 'center-msg', 'screens', 'hud']) {
  bodyEl.appendChild(makeIdEl(id));
}
elsById.get('tooltip').classList.add('hidden');
elsById.get('drag-ghost').classList.add('hidden');

globalThis.document = {
  body: bodyEl,
  createElement: (tag) => new MockNode(tag),
  getElementById: (id) => elsById.get(id) || null,
  querySelector: (sel) => (sel.startsWith('#') ? elsById.get(sel.slice(1)) || null : bodyEl.querySelector(sel)),
  querySelectorAll: (sel) => bodyEl.querySelectorAll(sel),
  addEventListener() {},
};
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener() {},
};

const { G, loadSettings } = await import('../../src/state.js');
const { A } = await import('../../src/core/assets.js');
A.classes.barbarian = new MockNode('canvas');
const { VANITY_SLOTS, rollItem, itemBaseType, canWearVanity, shownEquip } = await import('../../src/data/items.js');
const { newCharData, migrate } = await import('../../src/game/save.js');
const { UI } = await import('../../src/ui/ui.js');
const { itemTooltip } = await import('../../src/ui/itemui.js');
const { toggleCharacter, toggleInventory, wearLook, takeOffLook } = await import('../../src/ui/inventory.js');
const { settingsDialog } = await import('../../src/ui/screens.js');
const { Macros } = await import('../../src/game/macros.js');
const { input } = await import('../../src/core/input.js');
const { smiteIcon, madnessIcon } = await import('../../src/ui/icons.js');

console.log('1. Testing 4-slot VANITY_SLOTS, weapon/offhand matching, and save migration...');
assert.deepEqual(VANITY_SLOTS, ['head', 'body', 'weapon', 'offhand']);

const barb = newCharData('barbarian', 'Conan');
G.char = barb;
G.player = { char: barb, classId: 'barbarian', hp: 100, maxHp: 100, mana: 50, maxMana: 50, tryUseSkill() {}, recompute() {}, st: { str: 15, dex: 10, vit: 14, int: 8, weapon: [10, 20], dmgPct: 10, primary: 15, armor: 30, critChance: 5, critDmg: 50, atkSpeed: 0, castSpeed: 0, moveSpeed: 0, res: { fire: 0, cold: 0, light: 0, poison: 0 }, lifeSteal: 0, block: 0, lifeRegen: 1, manaRegen: 2, magicFind: 0, goldFind: 0 } };
UI.init();

const eqSword = Object.assign(rollItem(20, { slot: 'weapon', rarity: 2 }), { base: 'sword', icon: 'sword' });
const lookSword = Object.assign(rollItem(60, { slot: 'weapon', rarity: 5 }), { base: 'sword', icon: 'sword' });
const lookBow = Object.assign(rollItem(60, { slot: 'weapon', rarity: 5 }), { base: 'bow', icon: 'bow' });
const eqAxeOff = Object.assign(rollItem(20, { slot: 'weapon', rarity: 2 }), { base: 'axe', icon: 'axe' });
const lookAxeOff = Object.assign(rollItem(50, { slot: 'weapon', rarity: 4 }), { base: 'axe', icon: 'axe' });
const eqHelm = rollItem(20, { slot: 'head', rarity: 1 });
const lookHelm = rollItem(60, { slot: 'head', rarity: 5 });

barb.equip.weapon = eqSword;
barb.equip.offhand = eqAxeOff;
barb.equip.head = eqHelm;

assert.equal(itemBaseType(eqSword), 'sword');
assert.equal(canWearVanity(barb, lookSword, 'weapon').ok, true, 'Sword look matches equipped sword');
assert.equal(canWearVanity(barb, lookBow, 'weapon').ok, false, 'Bow look rejected when sword is equipped');
assert.equal(canWearVanity(barb, lookAxeOff, 'offhand').ok, true, 'Barbarian off-hand axe look matches equipped off-hand axe');

barb.bag[0] = lookSword;
barb.bag[1] = lookBow;
barb.bag[2] = lookAxeOff;
barb.bag[3] = lookHelm;

assert.equal(wearLook(0, 'weapon'), true, 'Wore matching sword look');
assert.equal(wearLook(1, 'weapon'), false, 'Rejected mismatched bow look');
assert.equal(wearLook(2, 'offhand'), true, 'Wore matching off-hand axe look');
assert.equal(wearLook(3, 'head'), true, 'Wore helmet look');

let shown = shownEquip(barb);
assert.equal(shown.weapon, lookSword, 'shownEquip uses sword vanity look');
assert.equal(shown.offhand, lookAxeOff, 'shownEquip uses off-hand vanity look');
assert.equal(shown.head, lookHelm, 'shownEquip uses head vanity look');

// Unequipping or swapping weapon to a bow deactivates the sword vanity look visually without deleting it
const eqMace = Object.assign(rollItem(20, { slot: 'weapon', rarity: 2 }), { base: 'mace', icon: 'mace' });
barb.equip.weapon = eqMace;
shown = shownEquip(barb);
assert.equal(shown.weapon, eqMace, 'Mismatched weapon base falls back to real equipped weapon');
assert.equal(barb.vanity.weapon, lookSword, 'Vanity weapon remains stored in slot');
barb.equip.weapon = eqSword;

barb.hideHelm = true;
assert.equal(shownEquip(barb).head, null, 'hideHelm hides helmet look');
barb.hideHelm = false;

// Save migration round-trip & legacy 2-slot save upgrade
const roundTrip = migrate(JSON.parse(JSON.stringify(barb)));
assert.equal(roundTrip.vanity.weapon.uid, lookSword.uid);
assert.equal(roundTrip.vanity.offhand.uid, lookAxeOff.uid);
assert.equal(roundTrip.vanity.head.uid, lookHelm.uid);

const legacy2Slot = migrate({ ...JSON.parse(JSON.stringify(barb)), vanity: { head: lookHelm, body: null } });
assert.equal(legacy2Slot.vanity.head.uid, lookHelm.uid);
assert.equal(legacy2Slot.vanity.weapon, null);
assert.equal(legacy2Slot.vanity.offhand, null);

assert.equal(takeOffLook('weapon'), true);
assert.equal(barb.vanity.weapon, null);
assert.ok(barb.bag.includes(lookSword));

console.log('2. Testing split Character (C) & Backpack (I) side-by-side panels and interactive tooltips...');
UI.closeAll();
toggleCharacter();
assert.equal(UI.isOpen('character'), true, 'Character panel opens independently');
assert.equal(UI.isOpen('inventory'), false, 'Inventory stays closed when only Character opened');
assert.equal(UI.panels.get('character').root.querySelectorAll('.vslot').length, 4, 'Character panel renders 4 vanity slots');

toggleInventory();
assert.equal(UI.isOpen('character'), true, 'Character panel stays open when Backpack opens alongside it');
assert.equal(UI.isOpen('inventory'), true, 'Backpack panel opens alongside Character');
assert.equal(elsById.get('panels').classList.contains('multi-panel'), true, '#panels receives multi-panel class when both are open');

// Interactive tooltip with action buttons rendered via itemTooltip
let clickedEquip = false;
const actions = [{ label: 'Equip', cls: 'primary', fn: () => { clickedEquip = true; } }];
UI.showTip({
  html: itemTooltip(lookSword, { actions }),
  actions,
  interactive: true,
}, 200, 200, true);
const tipEl = elsById.get('tooltip');
assert.equal(tipEl.classList.contains('touch-open'), true);
assert.equal(tipEl.classList.contains('interactive'), true);
const actionBtns = tipEl.querySelectorAll('[data-tt-act]');
assert.equal(actionBtns.length, 1, 'Tooltip renders .tt-actions button via itemTooltip');
actionBtns[0].onclick({ stopPropagation() {} });
assert.equal(clickedEquip, true, 'Clicking tooltip action runs handler');
assert.equal(tipEl.classList.contains('hidden'), true, 'Tooltip closes after action');

console.log('3. Testing 5-tab Settings dialog, firstPerson preservation, and mobileHudV2 migration...');
assert.equal(fs.existsSync(new URL('../../src/gfx/firstperson.js', import.meta.url)), true, 'src/gfx/firstperson.js preserved');
assert.equal(G.settings.firstPerson, false, 'G.settings.firstPerson default preserved');

// Pre-V2 save with old default mobileSkillBar: true resets once to compact mobile HUD (false) and stamps mobileHudV2
storage.set('velscour_settings_v1', JSON.stringify({ mobileSkillBar: true }));
loadSettings();
assert.equal(G.settings.mobileSkillBar, false, 'Pre-V2 mobileSkillBar resets once to false');
assert.equal(G.settings.mobileHudV2, true, 'Stamps mobileHudV2 migration flag');

// Post-V2 save preserves user opt-in to mobileSkillBar: true
storage.set('velscour_settings_v1', JSON.stringify({ mobileHudV2: true, mobileSkillBar: true, showHeroStats: false, showTargetSprite: false }));
loadSettings();
assert.equal(G.settings.mobileSkillBar, true, 'Post-V2 mobileSkillBar opt-in preserved');
assert.equal(G.settings.showHeroStats, false, 'showHeroStats loaded');
assert.equal(G.settings.showTargetSprite, false, 'showTargetSprite loaded');

settingsDialog();
const screenHtml = elsById.get('screens').innerHTML;
for (const tab of ['data-tab="general"', 'data-tab="audio"', 'data-tab="graphics"', 'data-tab="hud"', 'data-tab="autoplay"']) {
  assert.ok(screenHtml.includes(tab), `Settings dialog includes ${tab}`);
}
assert.ok(screenHtml.includes('data-k="firstPerson"'), 'Settings Graphics tab preserves First-person mode checkbox');
assert.ok(screenHtml.includes('data-k="mobileSkillBar"'), 'Settings HUD & UI tab includes Mobile skill layout checkbox');
assert.ok(screenHtml.includes('data-k="showHeroStats"'), 'Settings HUD & UI tab includes Hero stats box checkbox');
assert.ok(screenHtml.includes('data-k="showTargetBox"'), 'Settings HUD & UI tab includes Target info box checkbox');
assert.ok(screenHtml.includes('data-k="showTargetSprite"'), 'Settings HUD & UI tab includes Target portrait sprite checkbox');

console.log('4. Testing KeyR Rejuvenation Potion vs empty/populated Macro 1...');
G.world = { kind: 'dungeon', nearestHostile() { return null; } };
G.controls = { castSkill() { return true; } };
Object.assign(G.player, { dead: false, castLock: 0, channel: null, cooldowns: {}, buffs: [], skillLevel(sk) { return barb.skills[sk.id] || 0; } });
Macros.reset();
assert.equal(barb.macros[0].key, 'KeyR', 'Macro 1 defaults to KeyR');
assert.equal(barb.macros[0].skills.length, 0, 'Macro 1 starts empty');
input.reset();
input.pressed.add('KeyR');
Macros.tick(0.016);
assert.equal(input.pressed.has('KeyR'), true, 'Empty Macro 1 MUST NOT consume KeyR so Rejuvenation Potion can use KeyR');
assert.equal(input.consume('KeyR'), true, 'Controls can consume KeyR for Rejuvenation Potion');

// When Macro 1 has a skill, KeyR triggers the macro and consumes KeyR
barb.skills = { bash: 1 };
barb.macros[0].skills = ['bash'];
G.mode = 'game';
input.pressed.add('KeyR');
Macros.tick(0.016);
assert.equal(input.pressed.has('KeyR'), false, 'Populated Macro 1 consumes KeyR');

console.log('5. Testing procedural Smite & Madness circular HUD icons...');
const smCv = smiteIcon(64);
const mdCv = madnessIcon(64);
assert.equal(smCv.width, 64);
assert.equal(mdCv.width, 64);

console.log('ALL UI SPLIT, 4-SLOT VANITY, SETTINGS & MACRO TESTS PASSED!');
process.exit(0);
