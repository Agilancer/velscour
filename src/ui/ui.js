// UI core: panels, dialogs, tooltips, drag & drop, message log.
import { onArtLoad } from '../core/classart.js';
import { onSkillSheetLoad } from './icons.js';
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';

export const $ = (s, root = document) => root.querySelector(s);

export const UI = {
  panels: new Map(),
  renderers: new Map(),
  modalCount: 0,
  selected: null,
  get modal() { return this.modalCount > 0; },

  init() {
    G.ui = this;
    onArtLoad(() => this.refresh()); // armor icons and the portrait appear once their strips arrive
    onSkillSheetLoad(() => {
      if (this.hud && this.hud.slots) for (const s of this.hud.slots) if (s.last && typeof s.map !== 'string') s.last.icon = undefined;
      if (G.touchUI) {
        if (G.touchUI.btns) for (const t of G.touchUI.btns) if (t.last) t.last.id = undefined;
        if (G.touchUI.macroBtns) for (const m of G.touchUI.macroBtns) m.last = undefined;
      }
      this.refresh();
    });
    this.panelsEl = $('#panels');
    this.screensEl = $('#screens');
    this.tipEl = $('#tooltip');
    this.logEl = $('#log');
    this.msgEl = $('#center-msg');
    this.ghost = $('#drag-ghost');
    initDnD();
    this.tipEl.addEventListener('pointerenter', () => {
      if (this.tipHideT) { clearTimeout(this.tipHideT); this.tipHideT = 0; }
    });
    this.tipEl.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.isInteractiveTip && !this.isTouchTip) {
        this.scheduleHideTip();
      }
    });
    document.addEventListener('pointermove', (e) => {
      if (!this.tipEl.classList.contains('hidden') && e.pointerType === 'mouse' && !this.isTouchTip && !this.isInteractiveTip) {
        this.placeTip(e.clientX, e.clientY);
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.tipEl && !this.tipEl.classList.contains('hidden')) {
        if (this.tipEl.contains(e.target)) return;
        if (this.touchTipTarget && this.touchTipTarget.contains(e.target)) return;
        this.hideTip();
      }
    });
  },

  // ------------------------------------------------------------- panels
  /** Create (or reuse) a panel. render(body, panel) is called on open and refresh(). */
  openPanel(name, title, render, opts = {}) {
    let p = this.panels.get(name);
    if (!p) {
      const root = el('div', 'panel ' + (opts.cls || ''));
      root.dataset.panel = name;
      if (opts.width) root.style.width = opts.width;
      const head = el('div', 'panel-head', `<h2>${escapeHtml(title)}</h2>`);
      const close = el('button', 'panel-close', '&times;');
      close.title = 'Close (Esc)';
      close.onclick = () => { sfx('ui'); this.closePanel(name); };
      head.appendChild(close);
      root.appendChild(head);
      const body = el('div', 'panel-body');
      root.appendChild(body);
      if (opts.order === 'first') this.panelsEl.prepend(root); else this.panelsEl.appendChild(root);
      p = { root, head, body, title, opts };
      this.panels.set(name, p);
    }
    p.head.querySelector('h2').textContent = title;
    this.renderers.set(name, render);
    render(p.body, p);
    this.onPanelsChanged();
    return p;
  },
  closePanel(name) {
    const p = this.panels.get(name);
    if (!p) return;
    const hadTipInside = this.touchTipTarget && p.root.contains(this.touchTipTarget);
    p.root.remove();
    this.panels.delete(name);
    this.renderers.delete(name);
    if (p.opts.onClose) p.opts.onClose();
    if (!this.panels.size || hadTipInside) { if (!this.panels.size) this.selected = null; this.hideTip(); }
    this.onPanelsChanged();
  },
  closeAll() { for (const k of [...this.panels.keys()]) this.closePanel(k); },
  isOpen(name) { return this.panels.has(name); },
  anyOpen() { return this.panels.size > 0; },
  refresh() {
    for (const [name, r] of this.renderers) {
      const p = this.panels.get(name);
      if (p) { const st = p.body.scrollTop; r(p.body, p); p.body.scrollTop = st; }
    }
    if (this.tipEl && !this.tipEl.classList.contains('hidden') && this.tipKey && this.tipRefreshFn) {
      const safeKey = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(this.tipKey) : this.tipKey.replace(/"/g, '\\"');
      const nextAnchor = document.querySelector(`[data-tip-key="${safeKey}"]`);
      if (nextAnchor) {
        this.showTip(this.tipRefreshFn(), 0, 0, this.isTouchTip, nextAnchor, { interactive: this.isInteractiveTip, key: this.tipKey, fn: this.tipRefreshFn });
      } else {
        this.hideTip();
      }
    }
    if (this.hud) this.hud.refreshStatic();
  },
  onPanelsChanged() { document.body.classList.toggle('panel-open', this.panels.size > 0); if (this.hud) this.hud.refreshStatic(); }, // (portrait touch hides its buttons under a panel)

  // ------------------------------------------------------------- messages
  log(html, color) {
    const d = el('div', '', html);
    if (color) d.style.color = color;
    this.logEl.appendChild(d);
    while (this.logEl.children.length > 6) this.logEl.firstChild.remove();
    const sea = !!(G.world && G.world.seaRun), life = sea ? 4000 : 6200;   // at sea the deck's left edge is where the boats come from
    if (sea) { d.style.transition = 'opacity .6s'; setTimeout(() => { d.style.opacity = '0'; }, life - 600); }
    setTimeout(() => d.remove(), life);
  },
  /** A centred banner; o.top puts it in the band under the boss bar, smaller (a fight's running banners). */
  centerMsg(title, sub = '', dur = 2.6, o = {}) {
    this.msgEl.innerHTML = `${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}`;
    const lu = this.hud && this.hud.lu;
    this.msgEl.classList.toggle('top', !!o.top);
    this.msgEl.classList.toggle('below', !o.top && !!(lu && performance.now() < lu.end));
    this.msgEl.style.opacity = '1';
    clearTimeout(this.msgT);
    this.msgT = setTimeout(() => { this.msgEl.style.opacity = '0'; }, dur * 1000);
  },

  clearCenterMsg() { clearTimeout(this.msgT); this.msgEl.style.opacity = '0'; },
  clearLog() { this.logEl.innerHTML = ''; },

  // ------------------------------------------------------------- dialogs
  dialog({ title, html, buttons = [], closable = true, cls = '' }) {
    const wrap = el('div', 'screen');
    wrap.style.background = 'rgba(0,0,0,.6)';
    wrap.style.zIndex = 40;
    const box = el('div', 'dialog-box ' + cls, `${title ? `<h2>${title}</h2>` : ''}<div class="dlg-body">${html || ''}</div>`);
    const row = el('div', 'row');
    row.style.justifyContent = 'center';
    row.style.marginTop = '10px';
    const close = () => { if (wrap.parentNode) { wrap.remove(); this.modalCount = Math.max(0, this.modalCount - 1); } };
    for (const b of buttons) {
      const btn = el('button', 'btn ' + (b.cls || ''), b.label);
      btn.onclick = () => { sfx('ui'); if (b.keepOpen) { b.fn && b.fn(close); return; } close(); b.fn && b.fn(); };
      row.appendChild(btn);
    }
    box.appendChild(row);
    wrap.appendChild(box);
    if (closable) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
    this.screensEl.appendChild(wrap);
    this.modalCount++;
    return { close, box, wrap };
  },
  confirm(title, text, yes, yesLabel = 'Yes', noLabel = 'Cancel') {
    return this.dialog({ title, html: `<p>${text}</p>`, buttons: [{ label: noLabel }, { label: yesLabel, cls: 'red', fn: yes }] });
  },

  // ------------------------------------------------------------- tooltip
  scheduleHideTip(ms = 130) {
    clearTimeout(this.tipHideT);
    this.tipHideT = setTimeout(() => { this.tipHideT = 0; this.hideTip(); }, ms);
  },
  showTip(content, x, y, isTouch = false, anchorEl = null, opts = {}) {
    let html = '', actions = null, interactive = !!opts.interactive;
    if (content && typeof content === 'object') {
      html = content.html || '';
      actions = content.actions || null;
      if (content.interactive) interactive = true;
    } else {
      html = content || '';
    }
    if (!html) return;
    if (this.tipHideT) { clearTimeout(this.tipHideT); this.tipHideT = 0; }
    this.tipEl.innerHTML = html;
    this.isTouchTip = isTouch;
    this.isInteractiveTip = interactive;
    this.touchTipTarget = anchorEl;
    this.tipKey = opts.key || null;
    this.tipRefreshFn = opts.fn || null;
    this.tipEl.classList.toggle('touch-open', isTouch);
    this.tipEl.classList.toggle('interactive', interactive);
    this.tipEl.classList.remove('hidden');
    if (actions && actions.length) {
      this.tipEl.querySelectorAll('[data-tt-act]').forEach((btn) => {
        const idx = +btn.dataset.ttAct;
        const act = actions[idx];
        if (act && act.fn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            if (!act.keepOpen) this.hideTip();
            act.fn(e);
          };
        }
      });
    }
    if (interactive && anchorEl) this.placeTipAtAnchor(anchorEl);
    else this.placeTip(x, y);
  },
  placeTipAtAnchor(anchorEl) {
    const t = this.tipEl;
    t.style.maxWidth = 'min(340px, calc(100vw - 16px))';
    t.style.maxHeight = 'calc(100vh - 24px)';
    t.style.overflowY = 'auto';
    const a = anchorEl.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    let nx, ny;
    if (a.right + 10 + r.width <= innerWidth - 8) {
      nx = a.right + 10;
      ny = a.top - 6;
    } else if (a.left - 10 - r.width >= 8) {
      nx = a.left - r.width - 10;
      ny = a.top - 6;
    } else {
      nx = (innerWidth - r.width) / 2;
      ny = a.bottom + 8 + r.height <= innerHeight - 8 ? a.bottom + 8 : a.top - r.height - 8;
    }
    nx = Math.max(8, Math.min(nx, innerWidth - r.width - 8));
    ny = Math.max(8, Math.min(ny, innerHeight - r.height - 8));
    t.style.left = Math.round(nx) + 'px';
    t.style.top = Math.round(ny) + 'px';
  },
  placeTip(x, y) {
    const t = this.tipEl;
    t.style.maxWidth = 'min(340px, calc(100vw - 16px))';
    t.style.maxHeight = 'calc(100vh - 24px)';
    t.style.overflowY = 'auto';
    const r = t.getBoundingClientRect();
    let nx = x + 18, ny = y + 12;
    if (nx + r.width > innerWidth - 8) nx = x - r.width - 14;
    if (ny + r.height > innerHeight - 8) ny = innerHeight - r.height - 8;
    nx = Math.max(8, Math.min(nx, innerWidth - r.width - 8));
    ny = Math.max(8, Math.min(ny, innerHeight - r.height - 8));
    t.style.left = Math.round(nx) + 'px';
    t.style.top = Math.round(ny) + 'px';
  },
  hideTip() {
    if (this.tipHideT) { clearTimeout(this.tipHideT); this.tipHideT = 0; }
    this.tipEl.classList.add('hidden');
    this.tipEl.classList.remove('touch-open', 'interactive');
    this.isTouchTip = false;
    this.isInteractiveTip = false;
    this.touchTipTarget = null;
    this.tipKey = null;
    this.tipRefreshFn = null;
  },
  /** Attach hover tooltip to an element (and tap on touch). html may be a function returning string or { html, actions }. */
  tip(elm, html, opts = {}) {
    const fn = typeof html === 'function' ? html : () => html;
    if (opts.key) elm.dataset.tipKey = opts.key;
    elm.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !drag.active) {
        if (this.tipHideT) { clearTimeout(this.tipHideT); this.tipHideT = 0; }
        this.showTip(fn(), e.clientX, e.clientY, false, elm, { ...opts, fn });
      }
    });
    elm.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !this.isTouchTip) {
        if (opts.interactive || this.isInteractiveTip) this.scheduleHideTip();
        else this.hideTip();
      }
    });
    elm.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse' || G.touch) {
        if (!drag.active) {
          const content = fn();
          if (content) {
            this.showTip(content, e.clientX, e.clientY, true, elm, { ...opts, fn });
          }
        }
      }
    });
  },
};

// ================================================================ drag & drop
const drag = { active: false, data: null, src: null, sx: 0, sy: 0, pid: -1, pending: null, lastOver: null };

/**
 * Make an element draggable.
 * opts: { data: () => any, icon: () => url|canvas, onClick(e), onDouble(e), onRight(e), onDropWorld(data, x, y) }
 */
export function draggable(elm, opts) {
  elm.style.touchAction = 'none';
  elm.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    drag.pending = { elm, opts, x: e.clientX, y: e.clientY, pid: e.pointerId, t: performance.now() };
  });
  elm.addEventListener('contextmenu', (e) => { e.preventDefault(); if (opts.onRight) opts.onRight(e); });
}

/** Register a drop target. handler(data) returns true if accepted. canDrop(data) highlights. */
export function droppable(elm, handler, canDrop) {
  elm._drop = handler;
  elm._canDrop = canDrop || (() => true);
}

function findDrop(x, y) {
  let n = document.elementFromPoint(x, y);
  while (n && !n._drop) n = n.parentElement;
  return n;
}

let lastClick = { key: null, t: 0 };
function initDnD() {
  document.addEventListener('pointermove', (e) => {
    const p = drag.pending;
    if (p && !drag.active && e.pointerId === p.pid && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 7) {
      drag.active = true;
      drag.data = p.opts.data ? p.opts.data() : null;
      drag.opts = p.opts;
      if (!drag.data) { drag.active = false; drag.pending = null; return; }
      const g = UI.ghost;
      g.innerHTML = '';
      const icon = p.opts.icon ? p.opts.icon() : null;
      if (icon) {
        if (typeof icon === 'string') { const im = new Image(); im.src = icon; im.style.width = '100%'; g.appendChild(im); } else { g.appendChild(icon); }
      }
      g.classList.remove('hidden');
      UI.hideTip();
    }
    if (drag.active) {
      UI.ghost.style.left = e.clientX + 'px';
      UI.ghost.style.top = e.clientY + 'px';
      const over = findDrop(e.clientX, e.clientY);
      if (drag.lastOver && drag.lastOver !== over) drag.lastOver.classList.remove('drop-target');
      if (over && over._canDrop(drag.data)) over.classList.add('drop-target');
      drag.lastOver = over;
    }
  });
  const end = (e) => {
    const p = drag.pending;
    if (drag.active) {
      UI.ghost.classList.add('hidden');
      if (drag.lastOver) drag.lastOver.classList.remove('drop-target');
      const over = findDrop(e.clientX, e.clientY);
      let ok = false;
      if (over && over._canDrop(drag.data)) ok = over._drop(drag.data) !== false;
      else if (!over && drag.opts.onDropWorld && e.target && e.target.id === 'game') ok = drag.opts.onDropWorld(drag.data, e.clientX, e.clientY);
      if (ok) sfx('ui');
      drag.active = false; drag.data = null; drag.lastOver = null;
    } else if (p && e.pointerId === p.pid) {
      const now = performance.now();
      // compare a stable key: clicks often re-render the panel, replacing the element
      const key = p.opts.key !== undefined ? p.opts.key : p.elm;
      if (lastClick.key === key && now - lastClick.t < 350 && p.opts.onDouble) { lastClick = { key: null, t: 0 }; p.opts.onDouble(e); }
      else { lastClick = { key, t: now }; p.opts.onClick && p.opts.onClick(e); }
    }
    drag.pending = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', () => { drag.pending = null; drag.active = false; UI.ghost.classList.add('hidden'); });
}

export { el, escapeHtml };
