// VELSCOUR - entry point.
import { G, loadSettings } from './state.js';
import { initInput, input } from './core/input.js';
import { camera } from './core/view.js';
import { loadAssets } from './core/assets.js';
import { loadEnemyArt } from './core/enemyart.js';
import { rand, TAU } from './core/util.js';
import { UI, $ } from './ui/ui.js';
import { HUD } from './ui/hud.js';
import { TouchUI } from './ui/touch.js';
import { titleScreen } from './ui/screens.js';
import { Vendor } from './ui/vendor.js';
import { game } from './game/game.js';
import { controls } from './game/controls.js';
import { glowSprite } from './gfx/vfx.js';
import { applyVolumes } from './core/audio.js';

function resize() {
  G.W = window.innerWidth;
  G.H = window.innerHeight;
  const maxDpr = G.touch ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  // cap the backing store to keep fill-rate sane on huge / high-dpi screens
  const maxPixels = G.touch ? 1.6e6 : 4.2e6;
  if (G.W * G.H * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (G.W * G.H));
  G.dpr = Math.max(0.75, dpr);
  G.canvas.width = Math.round(G.W * G.dpr);
  G.canvas.height = Math.round(G.H * G.dpr);
  camera.computeZoom();
  const portrait = G.touch && G.H > G.W;
  $('#rotate-hint').classList.toggle('hidden', !portrait || G.dismissedRotate);
}

// ---------------------------------------------------------- title backdrop
const embers = [];
function renderTitle(dt) {
  const ctx = G.ctx, W = G.canvas.width, H = G.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060203'); g.addColorStop(0.7, '#1a0503'); g.addColorStop(1, '#3a0a04');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  while (embers.length < 140) embers.push({ x: rand(W), y: H + rand(0, H), vy: rand(20, 80), vx: rand(-15, 15), s: rand(1, 3.5), ph: rand(TAU) });
  ctx.globalCompositeOperation = 'lighter';
  for (const e of embers) {
    e.y -= e.vy * dt * G.dpr; e.x += (e.vx + Math.sin(G.time + e.ph) * 12) * dt * G.dpr;
    if (e.y < -20) { e.y = H + 10; e.x = rand(W); }
    const a = Math.min(1, e.y / H + 0.2);
    ctx.globalAlpha = a;
    const s = e.s * 5 * G.dpr;
    ctx.drawImage(glowSprite(e.s > 2.5 ? '#ffb040' : '#ff4010'), e.x - s, e.y - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  G.time += dt;
  G.dt = dt;
  G.frame++;
  try {
    if (G.mode === 'game' && G.world) {
      game.update(dt);
      game.render();
    } else {
      renderTitle(dt);
    }
  } catch (err) {
    reportError(err);
  }
  input.endFrame();
  requestAnimationFrame(loop);
}

let errShown = 0;
function reportError(err) {
  console.error(err);
  if (errShown++ > 3) return;
  UI.log && UI.logEl && UI.log(`<span style="color:#ff6060">Error: ${String(err && err.message || err).slice(0, 140)}</span>`);
}

async function boot() {
  loadSettings();
  G.canvas = $('#game');
  G.ctx = G.canvas.getContext('2d', { alpha: false });
  G.touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  if (G.touch) { document.body.classList.add('touch'); G.settings.autoLoot = true; }
  G.input = input;
  G.controls = controls;
  G.game = game;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  initInput(G.canvas);
  UI.init();
  UI.vendor = Vendor;
  $('#rotate-dismiss').onclick = () => { G.dismissedRotate = true; resize(); };
  window.addEventListener('error', (e) => reportError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
  window.addEventListener('beforeunload', () => { if (G.char) game.autosave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.char) game.autosave(); });
  requestAnimationFrame(loop);
  try {
    await loadAssets((p) => { $('#loading-text').textContent = `Summoning the depths… ${Math.round(p * 100)}%`; });
  } catch (e) {
    $('#loading-text').innerHTML = `Could not load game assets.<br><small>${e.message}</small><br><small>If you opened index.html directly from disk, serve the folder over http instead (see README).</small>`;
    return;
  }
  HUD.init();
  if (G.touch) TouchUI.init();
  applyVolumes();
  $('#loading').classList.add('hidden');
  titleScreen();
  loadEnemyArt().catch((e) => console.warn(e)); // prefetch monster art while the player is on the title screen
  // debug helpers for testing in the console
  window.VELSCOUR = { G, game };
}

boot();
