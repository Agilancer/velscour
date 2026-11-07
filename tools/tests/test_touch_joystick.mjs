import assert from 'node:assert/strict';
import { input, initInput } from '../../src/core/input.js';
import { G } from '../../src/state.js';
import { camera } from '../../src/core/view.js';

console.log('Testing touch joystick drag-to-start, tap pass-through, cine guard, and pinch-to-zoom...');

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    };
  }
}

const mockBase = new MockElement('joy-base');
const mockKnob = new MockElement('joy-knob');

const listeners = {};
const mockCanvas = {
  addEventListener(event, fn) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(fn);
  },
  setPointerCapture() {}
};

globalThis.document = {
  getElementById(id) {
    if (id === 'joy-base') return mockBase;
    if (id === 'joy-knob') return mockKnob;
    return null;
  },
  addEventListener() {}
};

globalThis.window = {
  innerWidth: 400,
  innerHeight: 800,
  addEventListener() {}
};

G.W = 400;
G.H = 800;
G.mode = 'game';
G.cine = false;
G.settings.zoom = 1.0;

initInput(mockCanvas);

const fireEvent = (event, data) => {
  if (listeners[event]) {
    for (const fn of listeners[event]) {
      fn({
        preventDefault() {},
        ...data
      });
    }
  }
};

// -------------------------------------------------------------
// Test 1: Portrait mode - Tap on lower half (clientY = 600 >= 400)
// -------------------------------------------------------------
input.reset();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 10, clientX: 200, clientY: 600 });
assert.strictEqual(input.joy.active, false, 'Joystick should not immediately activate on pointerdown');
assert.strictEqual(input.worldTouch, null, 'worldTouch should be deferred until tap or drag is determined');
assert.ok(input.pendingJoy, 'pendingJoy should be registered');
assert.strictEqual(input.pendingJoy.ox, 200);
assert.strictEqual(input.pendingJoy.oy, 600);

// Tiny jitter move (2px < 10px threshold)
fireEvent('pointermove', { pointerType: 'touch', pointerId: 10, clientX: 201, clientY: 601 });
assert.strictEqual(input.joy.active, false, 'Joystick should remain inactive on sub-threshold movement');
assert.ok(input.pendingJoy, 'pendingJoy still active');

// Pointer up (tap completed)
fireEvent('pointerup', { pointerType: 'touch', pointerId: 10, clientX: 201, clientY: 601 });
assert.strictEqual(input.joy.active, false, 'Joystick never activated on tap');
assert.strictEqual(input.pendingJoy, null, 'pendingJoy should be cleared');
assert.ok(input.worldTouch, 'worldTouch should now be emitted for the tap');
assert.strictEqual(input.worldTouch.x, 200);
assert.strictEqual(input.worldTouch.y, 600);
assert.strictEqual(input.worldTouch.pressed, true);
assert.strictEqual(input.worldTouch.tapOnly, true);

input.endFrame();
assert.strictEqual(input.worldTouch, null, 'tapOnly worldTouch should be cleared after endFrame');

// -------------------------------------------------------------
// Test 2: Portrait mode - Drag on lower half (joystick activation)
// -------------------------------------------------------------
input.reset();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 11, clientX: 150, clientY: 650 });
assert.strictEqual(input.joy.active, false);

// Drag by 25px (>= 10px) to the right
fireEvent('pointermove', { pointerType: 'touch', pointerId: 11, clientX: 175, clientY: 650 });
assert.strictEqual(input.joy.active, true, 'Joystick MUST activate once drag exceeds threshold');
assert.strictEqual(input.joy.ox, 150, 'Joystick origin must be initial touch point');
assert.strictEqual(input.joy.oy, 650);
assert.ok(input.joy.vx > 0, 'vx should be positive for rightward drag');
assert.strictEqual(mockBase.classList.contains('on'), true, 'joy-base should have "on" class');
assert.strictEqual(input.pendingJoy, null);
assert.strictEqual(input.worldTouch, null, 'worldTouch should NOT be created on joystick drag');

fireEvent('pointerup', { pointerType: 'touch', pointerId: 11, clientX: 175, clientY: 650 });
assert.strictEqual(input.joy.active, false, 'Joystick ends on pointerup');
assert.strictEqual(mockBase.classList.contains('on'), false, 'joy-base "on" removed');
assert.strictEqual(input.worldTouch, null, 'No worldTouch emitted after joystick release');

// -------------------------------------------------------------
// Test 3: Landscape mode - Tap and Drag on left half
// -------------------------------------------------------------
G.W = 800;
G.H = 400;
window.innerWidth = 800;
window.innerHeight = 400;

input.reset();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 12, clientX: 200, clientY: 200 });
assert.strictEqual(input.joy.active, false);
assert.ok(input.pendingJoy);
fireEvent('pointerup', { pointerType: 'touch', pointerId: 12, clientX: 200, clientY: 200 });
assert.strictEqual(input.joy.active, false);
assert.ok(input.worldTouch, 'Tap on left half in landscape emits worldTouch');
assert.strictEqual(input.worldTouch.tapOnly, true);
input.endFrame();
assert.strictEqual(input.worldTouch, null);

input.reset();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 13, clientX: 250, clientY: 250 });
fireEvent('pointermove', { pointerType: 'touch', pointerId: 13, clientX: 250, clientY: 280 });
assert.strictEqual(input.joy.active, true);
assert.ok(input.joy.vy > 0);
fireEvent('pointerup', { pointerType: 'touch', pointerId: 13, clientX: 250, clientY: 280 });
assert.strictEqual(input.joy.active, false);
assert.strictEqual(input.worldTouch, null);

// -------------------------------------------------------------
// Test 4: Direct world touch outside joystick zone
// -------------------------------------------------------------
input.reset();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 14, clientX: 600, clientY: 200 });
assert.strictEqual(input.joy.active, false);
assert.strictEqual(input.pendingJoy, null);
assert.ok(input.worldTouch, 'Direct world touch on right half');
assert.strictEqual(input.worldTouch.x, 600);
assert.strictEqual(input.worldTouch.y, 200);
assert.strictEqual(input.worldTouch.pressed, true);
assert.strictEqual(input.worldTouch.tapOnly, undefined);

// -------------------------------------------------------------
// Test 5: G.cine blocks touch pointerdown
// -------------------------------------------------------------
input.reset();
G.cine = true;
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 15, clientX: 200, clientY: 200 });
assert.strictEqual(input.pendingJoy, null, 'Touch ignored while G.cine is active');
assert.strictEqual(input.worldTouch, null, 'No worldTouch while G.cine is active');
G.cine = false;

// -------------------------------------------------------------
// Test 6: Two-finger pinch-to-zoom clamps to 0.7 - 1.6
// -------------------------------------------------------------
input.reset();
G.settings.zoom = 1.0;
camera.computeZoom();
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 20, clientX: 200, clientY: 200 });
fireEvent('pointerdown', { pointerType: 'touch', pointerId: 21, clientX: 300, clientY: 200 }); // dist = 100
assert.strictEqual(input.isPinching, true, 'Two fingers initiate pinch gesture');
assert.strictEqual(input.pendingJoy, null, 'Pinch cancels pendingJoy');
assert.strictEqual(input.worldTouch, null, 'Pinch clears worldTouch');

// Spread fingers from 100px to 130px -> zoom = 1.3
fireEvent('pointermove', { pointerType: 'touch', pointerId: 21, clientX: 330, clientY: 200 });
assert.ok(Math.abs(G.settings.zoom - 1.3) < 0.01, `Expected zoom ~1.3, got ${G.settings.zoom}`);

// Extreme spread -> clamped at 1.6
fireEvent('pointermove', { pointerType: 'touch', pointerId: 21, clientX: 500, clientY: 200 });
assert.strictEqual(G.settings.zoom, 1.6, 'Pinch zoom clamps at max 1.6');

// Extreme pinch in -> clamped at 0.7
fireEvent('pointermove', { pointerType: 'touch', pointerId: 21, clientX: 220, clientY: 200 });
assert.strictEqual(G.settings.zoom, 0.7, 'Pinch zoom clamps at min 0.7');

fireEvent('pointerup', { pointerType: 'touch', pointerId: 20, clientX: 200, clientY: 200 });
fireEvent('pointerup', { pointerType: 'touch', pointerId: 21, clientX: 220, clientY: 200 });
assert.strictEqual(input.isPinching, false, 'Pinch ends when fingers lift');

console.log('ALL TOUCH JOYSTICK & PINCH TESTS PASSED!');
process.exit(0);
