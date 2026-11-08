import assert from 'node:assert';

const elements = {};

// Mock DOM
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this.classes.add(c); else this.classes.delete(c);
      return force;
    }
    if (this.classes.has(c)) { this.classes.delete(c); return false; }
    this.classes.add(c); return true;
  }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList();
    this.children = [];
    this.parentElement = null;
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this._innerHTML = '';
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    // If it contains data-tt-act buttons, parse simple buttons for mock testing
    const actMatches = [...val.matchAll(/data-tt-act="(\d+)"/g)];
    for (const m of actMatches) {
      const btn = new MockElement('button');
      btn.dataset.ttAct = m[1];
      this.appendChild(btn);
    }
  }
  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  dispatchEvent(evt) {
    evt.target = evt.target || this;
    evt.currentTarget = this;
    const list = this.listeners[evt.type] || [];
    for (const fn of list) {
      fn(evt);
      if (evt._stopped) break;
    }
    if (!evt._stopped && this.parentElement) {
      this.parentElement.dispatchEvent(evt);
    }
  }
  contains(el) {
    if (el === this) return true;
    for (const c of this.children) {
      if (c === el || c.contains(el)) return true;
    }
    return false;
  }
  getBoundingClientRect() {
    return { left: 100, top: 100, right: 140, bottom: 140, width: 40, height: 40 };
  }
  querySelector(sel) {
    if (elements[sel]) return elements[sel];
    for (const c of this.children) {
      if (c.matches && c.matches(sel)) return c;
      const f = c.querySelector && c.querySelector(sel);
      if (f) return f;
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (sel === '[data-tt-act]' && child.dataset.ttAct !== undefined) res.push(child);
        walk(child);
      }
    };
    walk(this);
    return res;
  }
}

globalThis.innerWidth = 1920;
globalThis.innerHeight = 1080;
const doc = new MockElement('document');
doc.body = new MockElement('body');
doc.appendChild(doc.body);
globalThis.document = doc;
globalThis.window = { addEventListener: () => {} };
globalThis.performance = { now: () => 1000 };
globalThis.G = { touch: false, char: { bag: [], equip: {} } };

const tooltipEl = new MockElement('div');
tooltipEl.classList.add('hidden');
const ghostEl = new MockElement('div');
ghostEl.classList.add('hidden');
const screensEl = new MockElement('div');
const panelsEl = new MockElement('div');

Object.assign(elements, {
  '#tooltip': tooltipEl,
  '#drag-ghost': ghostEl,
  '#screens': screensEl,
  '#panels': panelsEl,
});

globalThis.$ = (sel) => elements[sel] || new MockElement('div');

const { UI } = await import('../../src/ui/ui.js');
UI.init();

console.log('--- TEST 1: Mouse Hover Tooltip ---');
const slotA = new MockElement('div');
doc.body.appendChild(slotA);
UI.tip(slotA, () => ({ html: '<div>Item A</div>' }));

// Mouse enters Slot A
slotA.dispatchEvent({ type: 'pointerenter', pointerType: 'mouse', clientX: 110, clientY: 110 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Tooltip should be visible on hover');
assert.strictEqual(UI.tipEl.classList.contains('touch-open'), false, 'Hover tooltip should not have touch-open');
assert.strictEqual(UI.isTouchTip, false, 'Hover tooltip is not pinned');

// Mouse leaves Slot A
slotA.dispatchEvent({ type: 'pointerleave', pointerType: 'mouse' });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Tooltip should hide when mouse leaves on hover');

console.log('--- TEST 2: Left Click Pins Tooltip Open with Actions ---');
let actionExecuted = false;
const slotA2 = new MockElement('div');
doc.body.appendChild(slotA2);
UI.tip(slotA2, () => ({
  html: '<div>Item A with Actions</div><button data-tt-act="0">Equip</button>',
  actions: [{ label: 'Equip', fn: () => { actionExecuted = true; } }],
}), { key: 'bag:0' });

// User left-clicks Slot A2
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Tooltip is visible after click');
assert.strictEqual(UI.tipEl.classList.contains('touch-open'), true, 'Tooltip has touch-open class when pinned');
assert.strictEqual(UI.isTouchTip, true, 'isTouchTip is true when pinned');
assert.strictEqual(UI.touchTipTarget, slotA2, 'touchTipTarget is set to slotA2');

console.log('--- TEST 3: Mouse Movement Over Neighbor Slot Does Not Overwrite Pinned Tooltip ---');
const slotB = new MockElement('div');
doc.body.appendChild(slotB);
UI.tip(slotB, () => ({ html: '<div>Item B</div>' }), { key: 'bag:1' });

// Mouse leaves Slot A2 towards Tooltip, passing over Slot B
slotA2.dispatchEvent({ type: 'pointerleave', pointerType: 'mouse' });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pinned tooltip stays open on pointerleave');
assert.strictEqual(UI.isTouchTip, true, 'isTouchTip remains true');

slotB.dispatchEvent({ type: 'pointerenter', pointerType: 'mouse', clientX: 200, clientY: 100 });
assert.strictEqual(UI.touchTipTarget, slotA2, 'Neighbor pointerenter does NOT hijack pinned slotA2');
assert.strictEqual(UI.isTouchTip, true, 'isTouchTip remains true after neighbor pointerenter');

console.log('--- TEST 4: Clicking Inside Tooltip Executes Action and Closes ---');
const actionBtn = UI.tipEl.querySelectorAll('[data-tt-act]')[0];
assert.ok(actionBtn, 'Action button exists in tooltip');
// pointerdown on button does not hide tooltip because it is inside tipEl
doc.dispatchEvent({ type: 'pointerdown', target: actionBtn, _stopped: false });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pointerdown on button inside tipEl does not close tip');

actionBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(actionExecuted, true, 'Action callback executed');
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Tooltip closed after action executed');

console.log('--- TEST 5: Toggle Closed by Clicking the Same Slot Again ---');
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pinned open again');
assert.strictEqual(UI.isTouchTip, true, 'isTouchTip is true');

// Pointerdown on slotA2 itself does not close
doc.dispatchEvent({ type: 'pointerdown', target: slotA2, _stopped: false });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pointerdown on same slot does not close tip');

// Pointerup on slotA2 toggles closed
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Second click on same slot toggled it closed');

console.log('--- TEST 6: Outside Click Closes Pinned Tooltip ---');
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pinned open');

const outsideEl = new MockElement('div');
doc.body.appendChild(outsideEl);
doc.dispatchEvent({ type: 'pointerdown', target: outsideEl, _stopped: false });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Clicking outside closed the pinned tooltip');

console.log('--- TEST 7: Escape Key Closes Pinned Tooltip ---');
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Pinned open');
doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Escape key closed the pinned tooltip');

console.log('--- TEST 8: Switching Between Slots Directly ---');
slotA2.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 115, clientY: 115 });
assert.strictEqual(UI.touchTipTarget, slotA2, 'Slot A2 is pinned');

// Click Slot B: pointerdown on B hides slotA2's tip, then pointerup on B opens slotB's tip
doc.dispatchEvent({ type: 'pointerdown', target: slotB, _stopped: false });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), true, 'Old tip hidden on pointerdown of new slot');
slotB.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', button: 0, clientX: 200, clientY: 100 });
assert.strictEqual(UI.tipEl.classList.contains('hidden'), false, 'Slot B tip opened');
assert.strictEqual(UI.touchTipTarget, slotB, 'touchTipTarget switched to Slot B');
assert.strictEqual(UI.isTouchTip, true, 'Slot B is pinned');

console.log('ALL DESKTOP TOOLTIP PINNING TESTS PASSED SUCCESSFULLY!');
