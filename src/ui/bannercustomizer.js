import { G } from '../state.js';
import { UI } from './ui.js';
import { sfx } from '../core/audio.js';
import { changed } from './inventory.js';
import {
  BANNER_SHAPES,
  BANNER_COLORS,
  BANNER_PATTERNS,
  PATTERN_COLORS,
  BANNER_EMBLEMS,
  EMBLEM_COLORS,
  DEFAULT_BANNER,
  createBannerCanvas,
  getBannerSkin,
  getBannerRoll,
} from '../gfx/bannergen.js';

export function openBannerCustomizer(opts = {}) {
  const c = G.char;
  if (!c) return;

  if (c.classId !== 'lancer') {
    UI.log('Only a Lancer can unfurl and customize the War Banner.', '#ff8080');
    sfx('error');
    return;
  }

  // Clone active banner or fallback to default
  const cur = { ...(c.banner || DEFAULT_BANNER) };
  let unfurl = 1.0; // 0.18 to 1.0 preview
  let animId = null;

  const html = `
    <div class="banner-cust-wrap">
      <div class="banner-preview-pane">
        <div class="banner-canvas-frame">
          <canvas class="banner-live-canvas" width="144" height="288"></canvas>
        </div>
        <div class="banner-unfurl-ctrl">
          <label class="dim">Valor Unfurl: <span class="unfurl-val">100%</span></label>
          <input type="range" class="banner-unfurl-slider" min="18" max="100" value="100">
        </div>
      </div>
      <div class="banner-options-pane">
        <!-- Shape -->
        <div class="banner-section">
          <div class="banner-section-title">Cloth Silhouette</div>
          <div class="banner-btn-group shape-group">
            ${Object.values(BANNER_SHAPES).map((s) => `
              <button class="btn small banner-sel-btn ${cur.shape === s.id ? 'active' : ''}" data-type="shape" data-val="${s.id}" title="${s.desc}">
                ${s.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Field Color -->
        <div class="banner-section">
          <div class="banner-section-title">Field Color <span class="dim field-color-name">${BANNER_COLORS[cur.color]?.name || ''}</span></div>
          <div class="banner-swatch-row field-swatches">
            ${Object.values(BANNER_COLORS).map((col) => `
              <div class="banner-swatch ${cur.color === col.id ? 'sel' : ''}" data-type="color" data-val="${col.id}" title="${col.name}" style="background:${col.hex};"></div>
            `).join('')}
          </div>
        </div>

        <!-- Heraldic Pattern -->
        <div class="banner-section">
          <div class="banner-section-title">Heraldic Pattern</div>
          <div class="banner-btn-group pattern-group">
            ${Object.values(BANNER_PATTERNS).map((p) => `
              <button class="btn small banner-sel-btn ${cur.pattern === p.id ? 'active' : ''}" data-type="pattern" data-val="${p.id}">
                ${p.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Pattern Color -->
        <div class="banner-section">
          <div class="banner-section-title">Pattern & Trim Color <span class="dim pattern-color-name">${PATTERN_COLORS[cur.patternColor]?.name || ''}</span></div>
          <div class="banner-swatch-row pattern-swatches">
            ${Object.values(PATTERN_COLORS).map((col) => `
              <div class="banner-swatch ${cur.patternColor === col.id ? 'sel' : ''}" data-type="patternColor" data-val="${col.id}" title="${col.name}" style="background:${col.hex};"></div>
            `).join('')}
          </div>
        </div>

        <!-- Emblem Charge -->
        <div class="banner-section">
          <div class="banner-section-title">Heraldic Crest</div>
          <div class="banner-btn-group emblem-group">
            ${Object.values(BANNER_EMBLEMS).map((e) => `
              <button class="btn small banner-sel-btn ${cur.emblem === e.id ? 'active' : ''}" data-type="emblem" data-val="${e.id}" title="${e.desc}">
                ${e.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Emblem Color -->
        <div class="banner-section">
          <div class="banner-section-title">Crest Color <span class="dim emblem-color-name">${EMBLEM_COLORS[cur.emblemColor]?.name || ''}</span></div>
          <div class="banner-swatch-row emblem-swatches">
            ${Object.values(EMBLEM_COLORS).map((col) => `
              <div class="banner-swatch ${cur.emblemColor === col.id ? 'sel' : ''}" data-type="emblemColor" data-val="${col.id}" title="${col.name}" style="background:${col.hex};"></div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const buttons = [
    {
      label: 'Randomize',
      cls: 'dim',
      keepOpen: true,
      fn: () => randomize(),
    },
    {
      label: 'Apply Design',
      cls: 'gold',
      keepOpen: true,
      fn: (close) => apply(close),
    },
    {
      label: 'Cancel',
      fn: (close) => {
        if (animId) cancelAnimationFrame(animId);
        close();
      },
    },
  ];

  const dlg = UI.dialog({
    title: 'War Banner Studio',
    html,
    buttons,
    closable: true,
    cls: 'banner-customizer-dialog',
  });

  const box = dlg.box;
  const canvas = box.querySelector('.banner-live-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const slider = box.querySelector('.banner-unfurl-slider');
  const sliderLabel = box.querySelector('.unfurl-val');

  slider.oninput = () => {
    unfurl = parseInt(slider.value, 10) / 100;
    sliderLabel.textContent = `${slider.value}%`;
    renderPreview();
  };

  box.querySelectorAll('[data-type]').forEach((elNode) => {
    elNode.onclick = () => {
      const type = elNode.dataset.type;
      const val = elNode.dataset.val;
      if (!type || !val) return;
      cur[type] = val;
      sfx('ui');
      updateUI();
      renderPreview();
    };
  });

  function updateUI() {
    box.querySelectorAll('.shape-group .banner-sel-btn').forEach((b) => b.classList.toggle('active', b.dataset.val === cur.shape));
    box.querySelectorAll('.pattern-group .banner-sel-btn').forEach((b) => b.classList.toggle('active', b.dataset.val === cur.pattern));
    box.querySelectorAll('.emblem-group .banner-sel-btn').forEach((b) => b.classList.toggle('active', b.dataset.val === cur.emblem));

    box.querySelectorAll('.field-swatches .banner-swatch').forEach((s) => s.classList.toggle('sel', s.dataset.val === cur.color));
    box.querySelectorAll('.pattern-swatches .banner-swatch').forEach((s) => s.classList.toggle('sel', s.dataset.val === cur.patternColor));
    box.querySelectorAll('.emblem-swatches .banner-swatch').forEach((s) => s.classList.toggle('sel', s.dataset.val === cur.emblemColor));

    const fc = box.querySelector('.field-color-name');
    if (fc) fc.textContent = BANNER_COLORS[cur.color]?.name || '';
    const pc = box.querySelector('.pattern-color-name');
    if (pc) pc.textContent = PATTERN_COLORS[cur.patternColor]?.name || '';
    const ec = box.querySelector('.emblem-color-name');
    if (ec) ec.textContent = EMBLEM_COLORS[cur.emblemColor]?.name || '';
  }

  function randomize() {
    const shapes = Object.keys(BANNER_SHAPES);
    const colors = Object.keys(BANNER_COLORS);
    const patterns = Object.keys(BANNER_PATTERNS);
    const patColors = Object.keys(PATTERN_COLORS);
    const emblems = Object.keys(BANNER_EMBLEMS);
    const embColors = Object.keys(EMBLEM_COLORS);

    cur.shape = shapes[Math.floor(Math.random() * shapes.length)];
    cur.color = colors[Math.floor(Math.random() * colors.length)];
    cur.pattern = patterns[Math.floor(Math.random() * patterns.length)];
    cur.patternColor = patColors[Math.floor(Math.random() * patColors.length)];
    cur.emblem = emblems[Math.floor(Math.random() * emblems.length)];
    cur.emblemColor = embColors[Math.floor(Math.random() * embColors.length)];

    sfx('dice');
    updateUI();
    renderPreview();
  }

  function renderPreview() {
    const tex = createBannerCanvas(cur);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);

    const shownH = Math.round(96 * unfurl);
    ctx.drawImage(tex, 0, 0, 48, shownH, 0, 0, 144, shownH * 3);

    if (unfurl < 0.98) {
      const rollY = shownH * 3;
      const rollCol = BANNER_COLORS[cur.color]?.dark || '#1c3470';
      ctx.fillStyle = rollCol;
      ctx.fillRect(0, rollY - 4, 144, 9);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(0, rollY - 3, 144, 2);
    }
  }

  function apply(close) {
    let consumed = false;
    if (opts.bagIdx !== undefined && c.bag[opts.bagIdx]?.type === 'banner_kit') {
      c.bag[opts.bagIdx] = null;
      consumed = true;
    } else {
      const idx = c.bag.findIndex((it) => it && it.type === 'banner_kit');
      if (idx !== -1) {
        c.bag[idx] = null;
        consumed = true;
      }
    }

    c.banner = { ...cur };

    if (G.player) {
      G.player.bannerCanvas = getBannerSkin(c.banner);
      G.player.bannerRoll = getBannerRoll(c.banner);
      if (G.player.sig?.s) {
        G.player.sig.s.cloth = null;
      }
    }

    sfx('levelup');
    UI.log('War Banner customized: <span style="color:#ffd860">The Order rides under your colors!</span>');
    if (consumed) {
      UI.log('Consumed 1x <span style="color:#ffd860">Lancer\'s Banner Kit</span>.', '#b9a17d');
    }

    changed();
    if (G.game && G.game.autosave) {
      G.game.autosave();
    }

    close();
  }

  updateUI();
  renderPreview();
}
