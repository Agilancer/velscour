// Keyboard, mouse and touch input.
import { G, saveSettings } from '../state.js';
import { camera } from './view.js';
import { clamp } from './util.js';

const GAME_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false, inside: true },
  joy: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 },
  pendingJoy: null, // { id, ox, oy, x, y }
  worldTouch: null, // { id, x, y, pressed, tapOnly }
  activeTouches: new Map(),
  isPinching: false,
  lastPointerType: 'mouse',
  enabled: true,

  down(code) { return this.keys.has(code); },
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  },
  endFrame() {
    this.pressed.clear();
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    if (this.worldTouch) {
      this.worldTouch.pressed = false;
      if (this.worldTouch.tapOnly) this.worldTouch = null;
    }
  },
  reset() {
    this.keys.clear(); this.pressed.clear();
    this.mouse.left = this.mouse.right = false;
    this.endJoy();
    this.worldTouch = null;
    this.pendingJoy = null;
    this.activeTouches.clear();
    this.isPinching = false;
  },
  endJoy() {
    this.joy.active = false; this.joy.id = -1; this.joy.vx = 0; this.joy.vy = 0;
    this.pendingJoy = null;
    const base = document.getElementById('joy-base');
    if (base) base.classList.remove('on');
  },
};

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (GAME_KEYS.has(e.code) && G.mode === 'game') e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
  window.addEventListener('blur', () => input.reset());
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (G.mode === 'game') e.preventDefault(); });

  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const JOY_R = 52;
  const JOY_DRAG_THRESHOLD = 10;

  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchCooldown = false;
  let pinchCooldownTimer = null;
  let pinchPointers = [];

  canvas.addEventListener('pointerdown', (e) => {
    input.lastPointerType = e.pointerType;
    if (G.cine) {
      if (input.joy.active) input.endJoy();
      input.pendingJoy = null;
      input.worldTouch = null;
      return;
    }
    // a spectator's tap (aiming SMITE, catching a critter: game/spectate.js) never moves the hero or stops auto-play
    if (G.tapHook && G.tapHook(e.clientX, e.clientY, e)) { e.preventDefault(); return; }
    if (e.pointerType === 'mouse') {
      input.mouse.x = e.clientX; input.mouse.y = e.clientY;
      if (e.button === 0) { input.mouse.left = true; input.mouse.leftPressed = true; }
      if (e.button === 2) { input.mouse.right = true; input.mouse.rightPressed = true; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }
    // touch / pen
    e.preventDefault();
    input.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch: 2 or more touches activate pinch zoom and cancel single-finger actions
    if (input.activeTouches.size >= 2) {
      input.isPinching = true;
      pinchCooldown = true;
      if (pinchCooldownTimer) { clearTimeout(pinchCooldownTimer); pinchCooldownTimer = null; }
      if (input.joy.active) input.endJoy();
      input.pendingJoy = null;
      input.worldTouch = null;

      const keys = [...input.activeTouches.keys()];
      pinchPointers = [keys[0], keys[1]];
      const p1 = input.activeTouches.get(pinchPointers[0]);
      const p2 = input.activeTouches.get(pinchPointers[1]);
      pinchStartDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchStartZoom = G.settings.zoom || 1;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }

    if (pinchCooldown) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }

    const isPortrait = G.H > G.W || (typeof window !== 'undefined' && window.innerHeight > window.innerWidth);
    const inJoyZone = isPortrait ? (e.clientY >= G.H * 0.5) : (e.clientX < G.W * 0.5);
    if (inJoyZone && !input.joy.active) {
      input.pendingJoy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    } else if (!input.worldTouch || input.worldTouch.tapOnly) {
      input.worldTouch = { id: e.pointerId, x: e.clientX, y: e.clientY, pressed: true };
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }, { passive: false });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.inside = true;
      return;
    }
    if (input.activeTouches.has(e.pointerId)) {
      input.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch-to-zoom
    if (input.isPinching && pinchPointers.length === 2) {
      const p1 = input.activeTouches.get(pinchPointers[0]);
      const p2 = input.activeTouches.get(pinchPointers[1]);
      if (p1 && p2 && pinchStartDist > 10 && G.mode === 'game') {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const factor = dist / pinchStartDist;
        const current = G.settings.zoom || 1;
        const next = clamp(Math.round(pinchStartZoom * factor * 100) / 100, 0.7, 1.6);
        if (Math.abs(next - current) > 0.001) {
          G.settings.zoom = next;
          camera.computeZoom();
          debouncedSaveSettings();
        }
      }
      return;
    }

    if (pinchCooldown) return;

    if (input.pendingJoy && e.pointerId === input.pendingJoy.id) {
      const dx = e.clientX - input.pendingJoy.ox;
      const dy = e.clientY - input.pendingJoy.oy;
      const d = Math.hypot(dx, dy);
      if (d >= JOY_DRAG_THRESHOLD) {
        // Drag threshold reached: activate virtual joystick!
        const j = input.joy;
        j.active = true;
        j.id = input.pendingJoy.id;
        j.ox = input.pendingJoy.ox;
        j.oy = input.pendingJoy.oy;
        base.style.left = j.ox + 'px';
        base.style.top = j.oy + 'px';
        base.classList.add('on');
        input.pendingJoy = null;

        let kdx = dx, kdy = dy;
        if (d > JOY_R) { kdx = kdx / d * JOY_R; kdy = kdy / d * JOY_R; }
        j.vx = kdx / JOY_R;
        j.vy = kdy / JOY_R;
        knob.style.transform = `translate(${kdx}px,${kdy}px)`;
      }
      return;
    }

    const j = input.joy;
    if (j.active && e.pointerId === j.id) {
      let dx = e.clientX - j.ox, dy = e.clientY - j.oy;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
      j.vx = dx / JOY_R; j.vy = dy / JOY_R;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (input.worldTouch && input.worldTouch.id === e.pointerId) {
      input.worldTouch.x = e.clientX; input.worldTouch.y = e.clientY;
    }
  });

  const up = (e) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) input.mouse.left = false;
      if (e.button === 2) input.mouse.right = false;
      return;
    }
    input.activeTouches.delete(e.pointerId);
    if (input.activeTouches.size < 2) {
      input.isPinching = false;
      pinchPointers = [];
    }
    if (input.activeTouches.size === 0) {
      pinchCooldown = false;
      if (pinchCooldownTimer) { clearTimeout(pinchCooldownTimer); pinchCooldownTimer = null; }
    } else if (pinchCooldown && !pinchCooldownTimer) {
      pinchCooldownTimer = setTimeout(() => {
        pinchCooldown = false;
        pinchCooldownTimer = null;
      }, 350);
    }

    const isCancel = e.type === 'pointercancel';
    if (input.pendingJoy && e.pointerId === input.pendingJoy.id) {
      if (!isCancel) {
        // Finger released without dragging: this was a tap in the joystick zone!
        input.worldTouch = {
          id: input.pendingJoy.id,
          x: input.pendingJoy.ox,
          y: input.pendingJoy.oy,
          pressed: true,
          tapOnly: true,
        };
      }
      input.pendingJoy = null;
    }

    if (input.joy.active && e.pointerId === input.joy.id) input.endJoy();
    if (input.worldTouch && input.worldTouch.id === e.pointerId && !input.worldTouch.tapOnly) input.worldTouch = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse' && input.activeTouches.has(e.pointerId)) up(e);
  });
  window.addEventListener('pointercancel', (e) => {
    if (e.pointerType !== 'mouse' && input.activeTouches.has(e.pointerId)) up(e);
  });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length >= 2) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') input.mouse.inside = false; });

  let saveTimer = null;
  const debouncedSaveSettings = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; saveSettings(); }, 300);
  };

  const onWheel = (e) => {
    if (G.mode !== 'game') return;
    const target = e.target;
    // Don't zoom if scrolling inside interactive UI panels, dialogs, screens, or form controls
    if (target && target.closest && target.closest('.panel, .dialog-box, .screen, select, textarea, input')) {
      return;
    }
    // Check if target or any ancestor is a scrollable container
    let el = target;
    while (el && el !== document.body && el !== document.documentElement && el !== canvas) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') return;
      }
      el = el.parentElement;
    }

    e.preventDefault();
    const dy = clamp(e.deltaMode === 1 ? e.deltaY * 33 : (e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY), -300, 300);
    const factor = Math.exp(-dy * 0.001);
    const current = G.settings.zoom || 1;
    const next = clamp(Math.round(current * factor * 100) / 100, 0.7, 1.6);
    if (Math.abs(next - current) > 0.001) {
      G.settings.zoom = next;
      camera.computeZoom();
      debouncedSaveSettings();
    }
  };
  window.addEventListener('wheel', onWheel, { passive: false });
}
