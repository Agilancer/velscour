// Passive Talent Tree UI (opened with T or from the HUD / Skill Tree header).
import { G } from '../state.js';
import { el, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { UI } from './ui.js';
import { talentIcon, talentIconURL } from './icons.js';
import { elem } from '../gfx/vfx.js';
import {
  CLASS_TALENTS,
  TALENTS,
  TALENT_ROW_LEVELS,
  getTalents,
  talentPointsSpent,
  getSiblingChoice,
  isTalentLockedByChoice,
  isTalentPrereqMet,
  canLearnTalent,
  learnTalent,
  respecTalents,
} from '../data/talents.js';

let selectedTalentId = null;

export const talentRespecCost = (lv) => Math.max(50, 40 * (lv || 1));

function talentWhyNot(c, node) {
  if (!c || !node) return 'Unavailable';
  const cur = getTalents(c)[node.id] || 0;
  if (cur >= node.maxRank) return 'Maxed';
  if (isTalentLockedByChoice(c, node)) {
    const sib = getSiblingChoice(node);
    return `Locked — chose ${sib ? sib.name : 'other branch path'}`;
  }
  if ((c.level || 1) < node.reqLevel) return `Requires character level ${node.reqLevel}`;
  if (!isTalentPrereqMet(c, node)) {
    if (node.row === 1) return 'Requires 1 point in Tier 1 of this branch';
    if (node.row === 2) return 'Requires 1 point in a Tier 2 Morph of this branch';
    if (node.row === 3) return 'Requires 2 points in Tier 3 of this branch';
    if (node.row === 4) return 'Requires 2 points in a Tier 4 Morph of this branch';
    return 'Prerequisite not met';
  }
  if ((c.talentPoints || 0) <= 0) return 'No talent points available';
  return null;
}

function handleLearnTalent(node, max = false) {
  const c = G.char;
  const why = talentWhyNot(c, node);
  if (why) {
    UI.log(why, '#ff8080');
    sfx('error');
    return;
  }
  const n = max ? node.maxRank : 1;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (learnTalent(c, node.id)) count++;
    else break;
  }
  if (count > 0) {
    sfx('buff');
    const cur = getTalents(c)[node.id] || 0;
    const sib = getSiblingChoice(node);
    UI.log(
      `Talent learned: <b>${escapeHtml(node.name)}</b> (${cur}/${node.maxRank})${sib && cur === count ? ` · <i>${escapeHtml(sib.name)} locked</i>` : ''}.`,
      '#ffd860'
    );
    G.player.recompute();
    UI.refresh();
    G.game.autosave();
  }
}

function handleRespecTalents() {
  const c = G.char;
  const spent = talentPointsSpent(c);
  if (!spent) {
    UI.log('No talent points to refund.', '#ff8080');
    sfx('error');
    return;
  }
  const cost = talentRespecCost(c.level);
  if (c.gold < cost) {
    UI.log(`Respec Talents costs ${cost.toLocaleString()} gold.`, '#ff8080');
    sfx('error');
    return;
  }
  UI.confirm(
    'Respec Passive Talents',
    `Refund all <b>${spent}</b> spent passive talent points and unlock all branch choices for <b class="gold-text">${cost.toLocaleString()} gold</b>?`,
    () => {
      const refunded = respecTalents(c);
      c.gold -= cost;
      sfx('buff');
      UI.log(`Passive Talents reset: <b>${refunded}</b> points refunded for ${cost.toLocaleString()} gold.`, '#ffd860');
      G.player.recompute();
      UI.refresh();
      G.game.autosave();
    },
    'Respec Talents'
  );
}

function renderTalentDetail(node) {
  const c = G.char;
  const box = el('div', 'skill-detail talent-detail');
  if (!node) {
    box.innerHTML = `<div class="dim">Select a passive talent or skill morph to inspect its effects. Tier 2 (Lv 10), Tier 4 (Lv 30), and Tier 5 (Lv 45) nodes are <b>mutually exclusive A/B choices</b> that transform your active skills and define your build.</div>`;
    return box;
  }
  const cur = getTalents(c)[node.id] || 0;
  const E = elem(node.el || 'phys');
  const sib = getSiblingChoice(node);
  const lockedByChoice = isTalentLockedByChoice(c, node);
  const tierNames = [
    'Tier 1 · Foundation Passive',
    'Tier 2 · Skill Morph (Exclusive Choice)',
    'Tier 3 · Synergy Mastery',
    'Tier 4 · Major Skill Morph (Exclusive Choice)',
    'Tier 5 · Apex Keystone (Exclusive Choice)',
  ];
  let h = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
    <img src="${talentIconURL(node)}" alt="" style="width:48px;height:48px;border-radius:5px;border:1px solid #6b4e28;flex-shrink:0">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <h3 style="margin:0;color:${E.glow}">${escapeHtml(node.name)}</h3>
        <span class="tag">${escapeHtml(tierNames[node.row] || 'Passive')}</span>
      </div>
    </div>
  </div>`;
  h += `<div class="dim" style="margin:4px 0">Rank <b>${cur} / ${node.maxRank}</b> · Requires Hero Level ${node.reqLevel}${sib ? ` · <span style="color:${lockedByChoice ? '#ff6b6b' : '#ffb86c'}">Mutually Exclusive with <b>${escapeHtml(sib.name)}</b></span>` : ''}</div>`;
  const showRank = Math.max(1, cur);
  h += `<p style="margin:6px 0;line-height:1.45">${node.desc(showRank)}</p>`;
  if (cur > 0 && cur < node.maxRank) {
    h += `<div class="dim" style="margin-top:4px;font-size:12px">Next rank (${cur + 1}/${node.maxRank}): ${node.desc(cur + 1)}</div>`;
  }
  box.innerHTML = h;

  const row = el('div', 'row');
  row.style.marginTop = '8px';
  const why = talentWhyNot(c, node);
  const btn = el('button', 'btn small', cur ? 'Upgrade (+1)' : 'Learn Talent');
  btn.disabled = !!why;
  btn.onclick = (e) => handleLearnTalent(node, e && (e.shiftKey || e.ctrlKey || e.metaKey));
  row.appendChild(btn);

  if (!why && (c.talentPoints || 0) > 1 && node.maxRank - cur > 1) {
    const room = Math.min(c.talentPoints || 0, node.maxRank - cur);
    const maxBtn = el('button', 'btn small', `Max (+${room})`);
    maxBtn.onclick = () => handleLearnTalent(node, true);
    row.appendChild(maxBtn);
  }
  if (why && why !== 'No talent points available') {
    const msg = el('span', 'dim', why);
    if (lockedByChoice) msg.style.color = '#ff7070';
    row.appendChild(msg);
  }
  box.appendChild(row);
  return box;
}

export function renderTalents(body) {
  const c = G.char;
  body.innerHTML = '';
  const branches = CLASS_TALENTS[c.classId] || CLASS_TALENTS.paladin;
  const tMap = getTalents(c);
  const spent = talentPointsSpent(c);

  if (!selectedTalentId || !TALENTS[selectedTalentId] || TALENTS[selectedTalentId].classId !== c.classId) {
    selectedTalentId = branches[0]?.nodes[1]?.id || branches[0]?.nodes[0]?.id || null;
  }

  // Top Header Bar
  const head = el('div', 'row');
  head.style.justifyContent = 'space-between';
  head.style.flexWrap = 'wrap';
  head.style.gap = '8px';
  head.innerHTML = `<span>Talent Points: <b class="gold-text" style="font-size:18px">${c.talentPoints || 0}</b> <span class="dim" style="font-size:12px">(${spent} spent · +1 every 5 levels)</span></span>
    <span class="dim" style="font-size:12px">Click to inspect · double/right-click to spend · Choosing branch A locks B</span>`;

  const btns = el('span', 'row');
  const toSkillsBtn = el('button', 'btn small', `Active Skills (K)${c.skillPoints > 0 ? ` [${c.skillPoints}]` : ''}`);
  toSkillsBtn.title = 'Switch to Active Skill Tree (K)';
  toSkillsBtn.onclick = () => {
    sfx('ui');
    UI.closePanel('talents');
    import('./skills.js').then(({ toggleTree }) => toggleTree());
  };

  const cost = talentRespecCost(c.level);
  const rb = el('button', 'btn small respec-btn', `Respec Talents (${cost.toLocaleString()}g)`);
  rb.title = 'Refund all spent talent points and unlock branch choices';
  if (c.gold < cost || spent === 0) rb.style.opacity = '.45';
  rb.onclick = () => { sfx('ui'); handleRespecTalents(); };

  btns.append(toSkillsBtn, rb);
  head.appendChild(btns);
  body.appendChild(head);

  // 3-Branch Columns Layout
  const colsWrap = el('div', 'talent-branches');
  for (const b of branches) {
    const bPts = b.nodes.reduce((acc, n) => acc + (tMap[n.id] || 0), 0);
    const bCol = el('div', 'talent-branch');
    const bE = elem(b.el || 'phys');
    const bHead = el('div', 'talent-branch-head');
    bHead.style.borderBottomColor = bE.glow;
    bHead.innerHTML = `<span style="color:${bE.glow};font-weight:700">${escapeHtml(b.name)}</span> <span class="dim">(${bPts} pts)</span>`;
    bCol.appendChild(bHead);

    for (let rowIdx = 0; rowIdx < TALENT_ROW_LEVELS.length; rowIdx++) {
      const rowNodes = b.nodes.filter((n) => n.row === rowIdx);
      const rowEl = el('div', 'talent-row' + (rowNodes.length > 1 ? ' talent-fork-row' : ''));
      const reqLv = TALENT_ROW_LEVELS[rowIdx] || 1;
      const tierBadge = el('div', 'talent-tier-lbl', `Lv ${reqLv}`);
      rowEl.appendChild(tierBadge);

      rowNodes.forEach((node, idx) => {
        if (idx === 1 && rowNodes.length === 2) {
          const orBadge = el('div', 'talent-or-badge', 'OR');
          rowEl.appendChild(orBadge);
        }
        const rank = tMap[node.id] || 0;
        const why = talentWhyNot(c, node);
        const lockedChoice = isTalentLockedByChoice(c, node);

        const card = el('div', 'snode talent-node');
        if (node.choice) card.classList.add('talent-choice');
        if (node.row === 4) card.classList.add('talent-keystone');
        if (rank > 0) card.classList.add('has');
        else if (!why) card.classList.add('avail');
        else if (why !== 'No talent points available') card.classList.add('locked');
        if (lockedChoice) card.classList.add('choice-locked');
        if (selectedTalentId === node.id) card.classList.add('sel');

        const iconCanvas = talentIcon(node, 64);
        const cv = document.createElement('canvas');
        cv.width = 64;
        cv.height = 64;
        cv.getContext('2d').drawImage(iconCanvas, 0, 0, 64, 64);
        card.appendChild(cv);

        const nameSpan = el('div', 'talent-node-name', escapeHtml(node.name));
        card.appendChild(nameSpan);

        const lvlBadge = el('span', 'lvl', `${rank}/${node.maxRank}`);
        card.appendChild(lvlBadge);

        if (lockedChoice) {
          const lockTag = el('span', 'talent-lock-tag', 'LOCKED');
          card.appendChild(lockTag);
        } else if (node.choice) {
          const chTag = el('span', 'talent-choice-tag', node.row === 4 ? 'KEY' : `PATH ${node.choice}`);
          card.appendChild(chTag);
        }

        card.onclick = () => {
          selectedTalentId = node.id;
          sfx('ui');
          UI.refresh();
        };
        card.ondblclick = (e) => {
          e.preventDefault();
          selectedTalentId = node.id;
          handleLearnTalent(node, e.shiftKey || e.ctrlKey);
        };
        card.oncontextmenu = (e) => {
          e.preventDefault();
          selectedTalentId = node.id;
          handleLearnTalent(node, e.shiftKey || e.ctrlKey);
        };

        UI.tip(card, () => {
          const sib = getSiblingChoice(node);
          return `<b style="color:${elem(node.el || 'phys').glow}">${escapeHtml(node.name)}</b>
            <div class="dim">Rank ${rank}/${node.maxRank} · Req. Lv ${node.reqLevel}${sib ? ` · Exclusive with ${escapeHtml(sib.name)}` : ''}</div>
            <div style="max-width:270px;margin-top:4px">${node.desc(Math.max(1, rank))}</div>
            ${why ? `<div style="color:#ff8080;font-size:11px;margin-top:4px">${escapeHtml(why)}</div>` : '<div style="color:#80ff90;font-size:11px;margin-top:4px">Right-click or double-click to learn</div>'}`;
        });

        rowEl.appendChild(card);
      });

      bCol.appendChild(rowEl);
    }
    colsWrap.appendChild(bCol);
  }

  body.appendChild(colsWrap);
  body.appendChild(renderTalentDetail(selectedTalentId ? TALENTS[selectedTalentId] : null));
}

export function toggleTalents() {
  if (UI.isOpen('talents')) UI.closePanel('talents');
  else UI.openPanel('talents', 'Passive Talents (T)', renderTalents, { width: 'min(920px, 96vw)' });
}
