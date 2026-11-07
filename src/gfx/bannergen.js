// Layered Banner Generator for Lancer 3D Cloth Banner (48 x 96 px texels, 2 texels/world px)
// Generates custom skins in VELSCOUR's Grim Nocturne dark fantasy chivalric style.

export const BANNER_SHAPES = {
  pointed: {
    id: 'pointed',
    name: 'Pointed V-Foot',
    desc: 'The classic heraldic knight banner tapering to a spearhead point.',
  },
  swallowtail: {
    id: 'swallowtail',
    name: 'Swallowtail',
    desc: 'Twin split cavalry tails that stream dynamically in the wind.',
  },
  square: {
    id: 'square',
    name: 'Royal Tabard',
    desc: 'Stately rectangular standard trimmed with gold fringe.',
  },
  shield: {
    id: 'shield',
    name: 'Heater Shield',
    desc: 'Curved fortress shield base protecting the rear line.',
  },
};

export const BANNER_COLORS = {
  azure: { id: 'azure', name: 'Royal Azure', hex: '#1c3470', dark: '#0c1a40', light: '#2e4e9e' },
  crimson: { id: 'crimson', name: 'Scarlet Crimson', hex: '#6e121a', dark: '#3a080d', light: '#9e1c28' },
  emerald: { id: 'emerald', name: 'Forest Emerald', hex: '#144626', dark: '#0a2614', light: '#206838' },
  obsidian: { id: 'obsidian', name: 'Void Obsidian', hex: '#181822', dark: '#0c0c12', light: '#2c2c3a' },
  purple: { id: 'purple', name: 'Imperial Tyrian', hex: '#441458', dark: '#240a30', light: '#682284' },
  gold: { id: 'gold', name: 'Solar Amber', hex: '#8c5e14', dark: '#483008', light: '#ba8020' },
  silver: { id: 'silver', name: 'Argent Ivory', hex: '#8892a4', dark: '#4c5464', light: '#b8c4d8' },
  bronze: { id: 'bronze', name: 'Autumn Rust', hex: '#5c2b14', dark: '#321608', light: '#84401e' },
};

export const BANNER_PATTERNS = {
  none: { id: 'none', name: 'Solid Field' },
  cross: { id: 'cross', name: 'Saint’s Cross' },
  pale: { id: 'pale', name: 'Center Pale' },
  chevron: { id: 'chevron', name: 'V-Chevron' },
  bend: { id: 'bend', name: 'Diagonal Sash' },
  border: { id: 'border', name: 'Gilded Border' },
  stripes: { id: 'stripes', name: 'War Stripes' },
};

export const PATTERN_COLORS = {
  gold: { id: 'gold', name: 'Gold', hex: '#c8942a', dark: '#6e4414', hi: '#fce078' },
  silver: { id: 'silver', name: 'Silver', hex: '#a8b8cc', dark: '#4e5a6c', hi: '#eef4fc' },
  white: { id: 'white', name: 'White', hex: '#dce2ec', dark: '#707c90', hi: '#ffffff' },
  black: { id: 'black', name: 'Black', hex: '#16161c', dark: '#0a0a0e', hi: '#323242' },
  crimson: { id: 'crimson', name: 'Crimson', hex: '#9e1824', dark: '#500a10', hi: '#de3844' },
  azure: { id: 'azure', name: 'Azure', hex: '#26488c', dark: '#12244e', hi: '#4270c4' },
};

export const BANNER_EMBLEMS = {
  vanguard: { id: 'vanguard', name: 'Order of the Vanguard', desc: 'The signature barbed chevron spear of the Order, bearing a faceted soul ruby.' },
  templar: { id: 'templar', name: 'Chivalric Cross Patonce', desc: 'Floriated heraldic cross of knightly vows with multi-layered bevels and diamond boss.' },
  deathguard: { id: 'deathguard', name: 'Abyssal Skull & Iron Halo', desc: 'Grim knight skull crowned with a radiating iron halo and crossed bone pikes.' },
  citadel: { id: 'citadel', name: 'Bastion & Portcullis', desc: 'The Bastion Warden’s fortress tower with corbelled battlements and iron portcullis.' },
  warlances: { id: 'warlances', name: 'Twin Lances & Shield', desc: 'Crossed tournament war-lances behind an embossed knightly heater shield.' },
  sunburst: { id: 'sunburst', name: 'Cathedral Solar Disc', desc: 'Sun cathedral solar radiance with eight flared spear rays and burning core.' },
  wyvern: { id: 'wyvern', name: 'Drakon Wyvern', desc: 'Primeval heraldic wyvern with ribbed bat wings, talons, and a barbed serpentine tail.' },
  crown: { id: 'crown', name: 'Sovereign Coronet & Thorns', desc: 'Gothic spiked high coronet intertwined with battle thorns and faceted gems.' },
};

export const EMBLEM_COLORS = {
  gold: { id: 'gold', name: 'Gold', hex: '#fed653', dark: '#b0821c' },
  silver: { id: 'silver', name: 'Silver', hex: '#edf2fa', dark: '#94a0b0' },
  crimson: { id: 'crimson', name: 'Crimson', hex: '#ff3b4b', dark: '#8a111c' },
  bone: { id: 'bone', name: 'Bone', hex: '#f5edd7', dark: '#a59878' },
  obsidian: { id: 'obsidian', name: 'Obsidian', hex: '#3c3c4e', dark: '#14141c' },
};

export const DEFAULT_BANNER = Object.freeze({
  shape: 'pointed',
  color: 'azure',
  pattern: 'none',
  patternColor: 'silver',
  emblem: 'vanguard',
  emblemColor: 'gold',
});

const W = 48, H = 96, SLEEVE = 4;

const EMBLEM_ALIASES = {
  lance: 'vanguard',
  lion: 'templar',
  dragon: 'wyvern',
  sun: 'sunburst',
  tower: 'citadel',
  skull: 'deathguard',
  phoenix: 'sunburst',
};

function resolveEmblemId(id) {
  if (BANNER_EMBLEMS[id]) return id;
  if (EMBLEM_ALIASES[id]) return EMBLEM_ALIASES[id];
  return 'vanguard';
}

function getMetalPalette(embCol) {
  const id = embCol.id || 'gold';
  if (id === 'silver') {
    return { dark: '#10141c', shadow: '#4e5a6c', mid: '#9cb0c6', hi: '#eaf2fc', spec: '#ffffff' };
  } else if (id === 'crimson') {
    return { dark: '#140406', shadow: '#580812', mid: '#b21626', hi: '#ff6272', spec: '#ffe0e4' };
  } else if (id === 'bone') {
    return { dark: '#14120c', shadow: '#6e624c', mid: '#cec2a4', hi: '#fbf7ea', spec: '#ffffff' };
  } else if (id === 'obsidian') {
    return { dark: '#08080c', shadow: '#181822', mid: '#323242', hi: '#62627a', spec: '#98a4bc' };
  }
  // Default gold / reliquary brass
  return { dark: '#140c04', shadow: '#6a4012', mid: '#c49028', hi: '#fae074', spec: '#fffde4' };
}

/** Render the 48x96 pixel canvas with the chosen banner layers */
export function createBannerCanvas(cfg = DEFAULT_BANNER) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const shapeId = cfg.shape || 'pointed';
  const col = BANNER_COLORS[cfg.color] || BANNER_COLORS.azure;
  const pat = BANNER_PATTERNS[cfg.pattern] || BANNER_PATTERNS.none;
  const patCol = PATTERN_COLORS[cfg.patternColor] || PATTERN_COLORS.silver;
  const rawEmbId = cfg.emblem || 'vanguard';
  const embId = resolveEmblemId(rawEmbId);
  const embCol = EMBLEM_COLORS[cfg.emblemColor] || EMBLEM_COLORS.gold;
  const pal = getMetalPalette(embCol);

  // 1. Clip to Silhouette
  ctx.save();
  buildShapePath(ctx, shapeId);
  ctx.clip();

  // 2. Base Field Fill with Realistic Medieval Draped Cloth
  drawClothField(ctx, shapeId, col);

  // 3. Heraldic Pattern (Ordinary)
  if (pat.id !== 'none') {
    drawPattern(ctx, pat.id, patCol);
  }

  // 4. Heavy Gothic Border & Corner Finials
  drawGothicBorder(ctx, shapeId, patCol);

  // 5. Crossbar Sleeve Wrap
  drawSleeve(ctx, col, patCol);

  // 6. Heraldic Crest with Cast Drop Shadow
  drawEmblemWithShadow(ctx, embId, pal, patCol);

  // 7. Bottom Hem Fringe / Stitching
  drawTrimDetails(ctx, shapeId, patCol);

  ctx.restore();
  return canvas;
}

function buildShapePath(ctx, shapeId) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W - 1, 0);

  if (shapeId === 'pointed') {
    ctx.lineTo(W - 1, 84);
    ctx.lineTo(W / 2, H - 1);
    ctx.lineTo(W / 2 - 1, H - 1);
    ctx.lineTo(0, 84);
  } else if (shapeId === 'swallowtail') {
    ctx.lineTo(W - 1, H - 1);
    ctx.lineTo(W / 2, 74);
    ctx.lineTo(0, H - 1);
  } else if (shapeId === 'square') {
    ctx.lineTo(W - 1, 88);
    ctx.lineTo(0, 88);
  } else if (shapeId === 'shield') {
    ctx.lineTo(W - 1, 68);
    ctx.quadraticCurveTo(W - 1, H - 1, W / 2, H - 1);
    ctx.quadraticCurveTo(0, H - 1, 0, 68);
  } else {
    ctx.lineTo(W - 1, 84);
    ctx.lineTo(W / 2, H - 1);
    ctx.lineTo(0, 84);
  }
  ctx.closePath();
}

function drawClothField(ctx, shapeId, col) {
  // Base field
  ctx.fillStyle = col.hex;
  ctx.fillRect(0, 0, W, H);

  // Vertical draped folds (folds & crevices of heavy silk/wool)
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0.00, 'rgba(0,0,0,0.36)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.24, 'rgba(0,0,0,0.24)');
  grad.addColorStop(0.38, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.50, 'rgba(0,0,0,0.30)');
  grad.addColorStop(0.62, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.76, 'rgba(0,0,0,0.24)');
  grad.addColorStop(0.88, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1.00, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Vertical hanging drop gradient (darker near bottom hem)
  const vgrad = ctx.createLinearGradient(0, 0, 0, H);
  vgrad.addColorStop(0.00, 'rgba(0,0,0,0.35)');
  vgrad.addColorStop(0.08, 'rgba(0,0,0,0.08)');
  vgrad.addColorStop(0.70, 'rgba(0,0,0,0.00)');
  vgrad.addColorStop(1.00, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = vgrad;
  ctx.fillRect(0, 0, W, H);
}

function drawGothicBorder(ctx, shapeId, patCol) {
  ctx.save();
  ctx.lineWidth = 1;

  // Outer dark contour
  ctx.strokeStyle = '#0e0c14';
  buildShapePath(ctx, shapeId);
  ctx.stroke();

  // Steel / slate bevel inner track
  ctx.strokeStyle = 'rgba(160, 175, 195, 0.45)';
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Gilded piping edge
  ctx.strokeStyle = patCol.dark;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.strokeStyle = patCol.hex;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // Top corner brackets
  ctx.fillStyle = patCol.hex;
  ctx.fillRect(2, 2, 4, 3);
  ctx.fillRect(W - 6, 2, 4, 3);
  ctx.fillStyle = '#fce078';
  ctx.fillRect(3, 2, 2, 2);
  ctx.fillRect(W - 5, 2, 2, 2);

  // Bottom tip finial on pointed banner
  if (shapeId === 'pointed') {
    ctx.fillStyle = patCol.hex;
    ctx.fillRect(W / 2 - 1, H - 7, 2, 6);
    ctx.fillStyle = '#ffe894';
    ctx.fillRect(W / 2 - 1, H - 4, 2, 2);
  }

  ctx.restore();
}

function drawSleeve(ctx, col, patCol) {
  // Top sleeve wrapping crossbar
  ctx.fillStyle = col.dark;
  ctx.fillRect(0, 0, W, SLEEVE);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(0, 1, W, 1);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, SLEEVE - 1, W, 1);
  ctx.fillStyle = patCol.hex;
  ctx.fillRect(0, SLEEVE, W, 1);
}

function drawPattern(ctx, patId, patCol) {
  ctx.save();
  ctx.fillStyle = patCol.hex;
  ctx.strokeStyle = patCol.dark;
  ctx.lineWidth = 1;

  if (patId === 'cross') {
    ctx.fillRect(0, 34, W, 8);
    ctx.fillRect(20, 0, 8, H);
    ctx.fillStyle = patCol.dark;
    ctx.fillRect(0, 34, W, 1);
    ctx.fillRect(0, 41, W, 1);
    ctx.fillRect(20, 0, 1, H);
    ctx.fillRect(27, 0, 1, H);
  } else if (patId === 'pale') {
    ctx.fillRect(16, 0, 16, H);
    ctx.fillStyle = patCol.dark;
    ctx.fillRect(16, 0, 1, H);
    ctx.fillRect(31, 0, 1, H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(23, 0, 2, H);
  } else if (patId === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(W / 2, 28);
    ctx.lineTo(W, 48);
    ctx.lineTo(W, 58);
    ctx.lineTo(W / 2, 38);
    ctx.lineTo(0, 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (patId === 'bend') {
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(32, 0);
    ctx.lineTo(W, 26);
    ctx.lineTo(W, 48);
    ctx.lineTo(0, 92);
    ctx.lineTo(0, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (patId === 'border') {
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.strokeStyle = patCol.hex;
    ctx.strokeRect(7, 7, W - 14, H - 14);
  } else if (patId === 'stripes') {
    for (let x = 6; x < W; x += 12) {
      ctx.fillRect(x, 0, 5, H);
      ctx.fillStyle = patCol.dark;
      ctx.fillRect(x, 0, 1, H);
      ctx.fillRect(x + 4, 0, 1, H);
      ctx.fillStyle = patCol.hex;
    }
  }
  ctx.restore();
}

function drawEmblemWithShadow(ctx, embId, pal, patCol) {
  const cx = W / 2;
  const cy = 38;

  // 1. Cast Drop-Shadow onto the cloth folds
  ctx.save();
  ctx.translate(1, 1.5);
  ctx.fillStyle = 'rgba(4, 4, 10, 0.72)';
  ctx.strokeStyle = 'rgba(4, 4, 10, 0.72)';
  drawEmblemShape(ctx, embId, cx, cy, true, pal);
  ctx.restore();

  // 2. Authentic Gothic Heraldic Crest in Foreground
  ctx.save();
  drawEmblemShape(ctx, embId, cx, cy, false, pal);
  ctx.restore();
}

function drawEmblemShape(ctx, embId, cx, cy, isShadow, pal) {
  if (embId === 'vanguard') {
    drawVanguard(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'templar') {
    drawTemplar(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'deathguard') {
    drawDeathGuard(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'citadel') {
    drawCitadel(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'warlances') {
    drawWarLances(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'sunburst') {
    drawSunburst(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'wyvern') {
    drawWyvern(ctx, cx, cy, isShadow, pal);
  } else if (embId === 'crown') {
    drawCrown(ctx, cx, cy, isShadow, pal);
  } else {
    drawVanguard(ctx, cx, cy, isShadow, pal);
  }
}

// ------------------------------------------------------------------ 1. Vanguard Chevron & Ruby
function drawVanguard(ctx, cx, cy, isShadow, pal) {
  if (isShadow) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx + 17, cy - 8);
    ctx.lineTo(cx + 15, cy + 2);
    ctx.lineTo(cx + 9, cy - 2);
    ctx.lineTo(cx + 11, cy + 12);
    ctx.lineTo(cx, cy + 28);
    ctx.lineTo(cx - 11, cy + 12);
    ctx.lineTo(cx - 9, cy - 2);
    ctx.lineTo(cx - 15, cy + 2);
    ctx.lineTo(cx - 17, cy - 8);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Dark contour
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 17, cy - 8);
  ctx.lineTo(cx + 15, cy + 2);
  ctx.lineTo(cx + 9, cy - 2);
  ctx.lineTo(cx + 11, cy + 12);
  ctx.lineTo(cx, cy + 28);
  ctx.lineTo(cx - 11, cy + 12);
  ctx.lineTo(cx - 9, cy - 2);
  ctx.lineTo(cx - 15, cy + 2);
  ctx.lineTo(cx - 17, cy - 8);
  ctx.closePath();
  ctx.fill();

  // Right Shadow Bevel
  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 21);
  ctx.lineTo(cx + 15, cy - 8);
  ctx.lineTo(cx + 13, cy + 1);
  ctx.lineTo(cx + 8, cy - 2);
  ctx.lineTo(cx + 9, cy + 11);
  ctx.lineTo(cx, cy + 26);
  ctx.closePath();
  ctx.fill();

  // Left Highlight Ridge
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 21);
  ctx.lineTo(cx - 15, cy - 8);
  ctx.lineTo(cx - 13, cy + 1);
  ctx.lineTo(cx - 8, cy - 2);
  ctx.lineTo(cx - 9, cy + 11);
  ctx.lineTo(cx, cy + 26);
  ctx.closePath();
  ctx.fill();

  // Inner Golden Blade Body
  ctx.fillStyle = pal.mid;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx + 11, cy - 7);
  ctx.lineTo(cx + 6, cy + 7);
  ctx.lineTo(cx, cy + 22);
  ctx.lineTo(cx - 6, cy + 7);
  ctx.lineTo(cx - 11, cy - 7);
  ctx.closePath();
  ctx.fill();

  // Center Spire & Ridge
  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 1, cy - 22, 2, 46);
  ctx.fillStyle = pal.spec;
  ctx.fillRect(cx - 1, cy - 20, 2, 4);

  // Faceted Crimson Soul Ruby Diamond
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx + 5, cy - 9);
  ctx.lineTo(cx, cy - 2);
  ctx.lineTo(cx - 5, cy - 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#4c050c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 15);
  ctx.lineTo(cx + 4, cy - 9);
  ctx.lineTo(cx, cy - 3);
  ctx.lineTo(cx - 4, cy - 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#b81222';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 3, cy - 9);
  ctx.lineTo(cx, cy - 4);
  ctx.lineTo(cx - 3, cy - 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff5466';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx - 3, cy - 9);
  ctx.lineTo(cx, cy - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 12, 1.5, 1.5);
}

// ------------------------------------------------------------------ 2. Chivalric Cross Patonce
function drawTemplar(ctx, cx, cy, isShadow, pal) {
  function pathArms() {
    ctx.beginPath();
    // North Arm (floriated 3 lobes)
    ctx.moveTo(cx - 3, cy - 3);
    ctx.lineTo(cx - 6, cy - 12);
    ctx.lineTo(cx - 9, cy - 15);
    ctx.lineTo(cx - 5, cy - 15);
    ctx.lineTo(cx, cy - 18);
    ctx.lineTo(cx + 5, cy - 15);
    ctx.lineTo(cx + 9, cy - 15);
    ctx.lineTo(cx + 6, cy - 12);
    ctx.lineTo(cx + 3, cy - 3);

    // East Arm
    ctx.lineTo(cx + 12, cy - 6);
    ctx.lineTo(cx + 15, cy - 9);
    ctx.lineTo(cx + 15, cy - 5);
    ctx.lineTo(cx + 18, cy);
    ctx.lineTo(cx + 15, cy + 5);
    ctx.lineTo(cx + 15, cy + 9);
    ctx.lineTo(cx + 12, cy + 6);
    ctx.lineTo(cx + 3, cy + 3);

    // South Arm
    ctx.lineTo(cx + 6, cy + 12);
    ctx.lineTo(cx + 9, cy + 15);
    ctx.lineTo(cx + 5, cy + 15);
    ctx.lineTo(cx, cy + 18);
    ctx.lineTo(cx - 5, cy + 15);
    ctx.lineTo(cx - 9, cy + 15);
    ctx.lineTo(cx - 6, cy + 12);
    ctx.lineTo(cx - 3, cy + 3);

    // West Arm
    ctx.lineTo(cx - 12, cy + 6);
    ctx.lineTo(cx - 15, cy + 9);
    ctx.lineTo(cx - 15, cy + 5);
    ctx.lineTo(cx - 18, cy);
    ctx.lineTo(cx - 15, cy - 5);
    ctx.lineTo(cx - 15, cy - 9);
    ctx.lineTo(cx - 12, cy - 6);
    ctx.closePath();
  }

  if (isShadow) {
    pathArms();
    ctx.fill();
    return;
  }

  // Dark border
  ctx.fillStyle = pal.dark;
  pathArms();
  ctx.fill();

  // Shadow facets (South & East)
  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 17, cy);
  ctx.lineTo(cx + 14, cy + 8);
  ctx.lineTo(cx, cy + 17);
  ctx.lineTo(cx - 14, cy + 8);
  ctx.closePath();
  ctx.fill();

  // Highlight facets (North & West)
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 17, cy);
  ctx.lineTo(cx - 14, cy - 8);
  ctx.lineTo(cx, cy - 17);
  ctx.lineTo(cx + 14, cy - 8);
  ctx.closePath();
  ctx.fill();

  // Body tone fill
  ctx.fillStyle = pal.mid;
  ctx.fillRect(cx - 3, cy - 14, 6, 28);
  ctx.fillRect(cx - 14, cy - 3, 28, 6);

  // Center Raised Diamond Boss & Gem
  ctx.fillStyle = pal.dark;
  ctx.fillRect(cx - 5, cy - 5, 10, 10);
  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
  ctx.fillStyle = '#102868';
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
  ctx.fillStyle = '#2b6cd6';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 2, 2, 1.5);
}

// ------------------------------------------------------------------ 3. Abyssal Skull & Iron Halo
function drawDeathGuard(ctx, cx, cy, isShadow, pal) {
  if (isShadow) {
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 12, cy - 12, 24, 24);
    return;
  }

  // Iron Spiked Halo radiating behind
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 2.4;
  for (let a = -140; a <= -40; a += 20) {
    const rad = a * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 9, cy - 3 + Math.sin(rad) * 9);
    ctx.lineTo(cx + Math.cos(rad) * 16, cy - 3 + Math.sin(rad) * 16);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.hi;
  ctx.lineWidth = 1;
  for (let a = -140; a <= -40; a += 20) {
    const rad = a * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 11, cy - 3 + Math.sin(rad) * 11);
    ctx.lineTo(cx + Math.cos(rad) * 15, cy - 3 + Math.sin(rad) * 15);
    ctx.stroke();
  }

  // Crossed Bone Pikes
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 14); ctx.lineTo(cx + 14, cy - 14);
  ctx.moveTo(cx + 14, cy + 14); ctx.lineTo(cx - 14, cy - 14);
  ctx.stroke();
  ctx.strokeStyle = pal.shadow;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 14); ctx.lineTo(cx + 14, cy - 14);
  ctx.moveTo(cx + 14, cy + 14); ctx.lineTo(cx - 14, cy - 14);
  ctx.stroke();

  // Cranium Dome
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 5, cy + 2, 10, 8);

  ctx.fillStyle = pal.mid;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 4, cy + 2, 8, 7);

  // Skull Brow Highlight
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 6, Math.PI, Math.PI * 2);
  ctx.fill();

  // Deep Hollow Eye Sockets
  ctx.fillStyle = '#08080c';
  ctx.fillRect(cx - 5, cy - 4, 3, 4);
  ctx.fillRect(cx + 2, cy - 4, 3, 4);
  // Nasal cavity
  ctx.fillRect(cx - 1, cy, 2, 3);
  // Teeth
  ctx.fillStyle = pal.hi;
  for (let x = cx - 3; x <= cx + 3; x += 2) {
    ctx.fillRect(x, cy + 5, 1.2, 3);
  }
}

// ------------------------------------------------------------------ 4. Fortress Bastion & Portcullis
function drawCitadel(ctx, cx, cy, isShadow, pal) {
  if (isShadow) {
    ctx.fillRect(cx - 11, cy - 14, 22, 28);
    return;
  }

  // Fortress Stone Base & Walls
  ctx.fillStyle = pal.dark;
  ctx.fillRect(cx - 11, cy - 14, 22, 28);

  // Shadow Bevel
  ctx.fillStyle = pal.shadow;
  ctx.fillRect(cx, cy - 13, 10, 26);

  // Light Side Wall
  ctx.fillStyle = pal.mid;
  ctx.fillRect(cx - 10, cy - 13, 10, 26);

  // Highlight Ridge (Left & Top)
  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 10, cy - 13, 1, 26);
  ctx.fillRect(cx - 10, cy - 13, 20, 1);

  // Crenellated Battlements (3 towers)
  ctx.fillStyle = pal.dark;
  ctx.fillRect(cx - 11, cy - 17, 6, 4);
  ctx.fillRect(cx - 2, cy - 17, 4, 4);
  ctx.fillRect(cx + 5, cy - 17, 6, 4);

  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 10, cy - 16, 4, 3);
  ctx.fillRect(cx - 1, cy - 16, 2, 3);
  ctx.fillStyle = pal.shadow;
  ctx.fillRect(cx + 6, cy - 16, 4, 3);

  // Corbel Machicolation Brackets under parapet
  ctx.fillStyle = pal.dark;
  for (let x = cx - 9; x <= cx + 9; x += 4) {
    ctx.fillRect(x, cy - 11, 2, 2);
  }

  // Stone Quoins (Corner blocks)
  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 10, cy - 7, 3, 2);
  ctx.fillRect(cx - 10, cy - 1, 2, 2);
  ctx.fillRect(cx - 10, cy + 5, 3, 2);

  // Central Cross Arrow-Slit
  ctx.fillStyle = '#08080c';
  ctx.fillRect(cx - 1, cy - 7, 2, 8);
  ctx.fillRect(cx - 3, cy - 5, 6, 1.5);

  // Gothic Arched Portal & Spiked Portcullis
  ctx.fillStyle = '#0a0810';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 5, Math.PI, 0);
  ctx.lineTo(cx + 5, cy + 13);
  ctx.lineTo(cx - 5, cy + 13);
  ctx.closePath();
  ctx.fill();

  // Spiked Iron Portcullis Teeth
  ctx.fillStyle = '#9aa8bc';
  ctx.fillRect(cx - 4, cy + 5, 1, 6);
  ctx.fillRect(cx - 2, cy + 5, 1, 7);
  ctx.fillRect(cx, cy + 5, 1, 8);
  ctx.fillRect(cx + 2, cy + 5, 1, 7);
  ctx.fillRect(cx + 4, cy + 5, 1, 6);
}

// ------------------------------------------------------------------ 5. Twin War-Lances & Heater Shield
function drawWarLances(ctx, cx, cy, isShadow, pal) {
  if (isShadow) {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx + 16, cy + 16);
    ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx - 16, cy + 16);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillRect(cx - 9, cy - 8, 18, 20);
    return;
  }

  // Lance 1: Diagonal NW to SE
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx + 16, cy + 16); ctx.stroke();
  ctx.strokeStyle = '#b89446'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx + 16, cy + 16); ctx.stroke();
  // Spearhead 1
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx - 11, cy - 15); ctx.lineTo(cx - 15, cy - 11);
  ctx.closePath(); ctx.fill();

  // Lance 2: Diagonal NE to SW
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx - 16, cy + 16); ctx.stroke();
  ctx.strokeStyle = '#b89446'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx - 16, cy + 16); ctx.stroke();
  // Spearhead 2
  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx + 11, cy - 15); ctx.lineTo(cx + 15, cy - 11);
  ctx.closePath(); ctx.fill();

  // Embossed Knight Heater Shield in Foreground
  function pathShield() {
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy - 8);
    ctx.lineTo(cx + 8, cy + 2);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx - 8, cy + 2);
    ctx.closePath();
  }

  ctx.fillStyle = pal.dark;
  pathShield();
  ctx.fill();

  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 7, cy - 7); ctx.lineTo(cx + 7, cy + 1); ctx.lineTo(cx, cy + 10);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7); ctx.lineTo(cx - 7, cy - 7); ctx.lineTo(cx - 7, cy + 1); ctx.lineTo(cx, cy + 10);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = pal.mid;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy - 5); ctx.lineTo(cx + 5, cy + 1); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 5, cy + 1);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

// ------------------------------------------------------------------ 6. Cathedral Solar Disc
function drawSunburst(ctx, cx, cy, isShadow, pal) {
  if (isShadow) {
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 0; i < 8; i++) {
    const a = (i * 45) * Math.PI / 180;
    const len = (i % 2 === 0) ? 17 : 12;
    const p0x = cx + Math.cos(a - 0.22) * 5;
    const p0y = cy + Math.sin(a - 0.22) * 5;
    const tipX = cx + Math.cos(a) * len;
    const tipY = cy + Math.sin(a) * len;
    const p1x = cx + Math.cos(a + 0.22) * 5;
    const p1y = cy + Math.sin(a + 0.22) * 5;

    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y); ctx.lineTo(tipX, tipY); ctx.lineTo(p1x, p1y);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = (i >= 2 && i <= 5) ? pal.shadow : pal.hi;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y); ctx.lineTo(tipX, tipY); ctx.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
    ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = pal.dark;
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = pal.shadow;
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = pal.hi;
  ctx.beginPath(); ctx.arc(cx, cy, 5, Math.PI * 0.75, Math.PI * 1.75); ctx.fill();

  ctx.fillStyle = pal.mid;
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#ff3010';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 1.5, 1.5, 1.5);
}

// ------------------------------------------------------------------ 7. Drakon Wyvern Crest
function drawWyvern(ctx, cx, cy, isShadow, pal) {
  function pathWyvern() {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 12);
    ctx.lineTo(cx - 13, cy - 12);
    ctx.lineTo(cx - 11, cy - 9);
    ctx.lineTo(cx - 8, cy - 8);
    ctx.lineTo(cx - 6, cy - 4);
    ctx.lineTo(cx + 2, cy - 16);
    ctx.lineTo(cx + 6, cy - 10);
    ctx.lineTo(cx + 12, cy - 14);
    ctx.lineTo(cx + 10, cy - 6);
    ctx.lineTo(cx + 14, cy - 8);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.lineTo(cx + 2, cy + 8);
    ctx.lineTo(cx - 4, cy + 6);
    ctx.lineTo(cx - 8, cy + 11);
    ctx.lineTo(cx - 5, cy + 4);
    ctx.lineTo(cx + 4, cy + 11);
    ctx.lineTo(cx + 10, cy + 16);
    ctx.lineTo(cx + 13, cy + 13);
    ctx.lineTo(cx + 7, cy + 9);
    ctx.closePath();
  }

  if (isShadow) {
    pathWyvern();
    ctx.fill();
    return;
  }

  ctx.fillStyle = pal.dark;
  pathWyvern();
  ctx.fill();

  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 4); ctx.lineTo(cx + 12, cy - 12); ctx.lineTo(cx + 6, cy + 2); ctx.lineTo(cx + 10, cy + 16);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 12); ctx.lineTo(cx - 13, cy - 12); ctx.lineTo(cx - 10, cy - 9); ctx.lineTo(cx - 5, cy - 4);
  ctx.lineTo(cx + 2, cy - 15); ctx.lineTo(cx + 5, cy - 6);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = pal.mid;
  ctx.fillRect(cx - 4, cy - 5, 6, 8);

  ctx.fillStyle = '#ff2836';
  ctx.fillRect(cx - 9, cy - 10, 1.5, 1.5);
}

// ------------------------------------------------------------------ 8. Sovereign Coronet & Thorns
function drawCrown(ctx, cx, cy, isShadow, pal) {
  function pathCrown() {
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 8);
    ctx.lineTo(cx + 12, cy + 8);
    ctx.lineTo(cx + 13, cy + 2);
    ctx.lineTo(cx + 11, cy - 6);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx + 5, cy - 10);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx, cy - 14);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.lineTo(cx - 5, cy - 10);
    ctx.lineTo(cx - 8, cy);
    ctx.lineTo(cx - 11, cy - 6);
    ctx.lineTo(cx - 13, cy + 2);
    ctx.closePath();
  }

  if (isShadow) {
    pathCrown();
    ctx.fill();
    return;
  }

  // Intertwined Battle Thorns behind crown
  ctx.strokeStyle = '#18141c';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 6); ctx.quadraticCurveTo(cx, cy + 12, cx + 14, cy + 6);
  ctx.stroke();
  ctx.strokeStyle = '#5a4e3a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = pal.dark;
  pathCrown();
  ctx.fill();

  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 13);
  ctx.lineTo(cx + 12, cy - 5);
  ctx.lineTo(cx + 11, cy + 7);
  ctx.lineTo(cx, cy + 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = pal.hi;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 13);
  ctx.lineTo(cx - 12, cy - 5);
  ctx.lineTo(cx - 11, cy + 7);
  ctx.lineTo(cx, cy + 7);
  ctx.closePath();
  ctx.fill();

  // Center Fleuron Chivalric Cross
  ctx.fillStyle = pal.spec;
  ctx.fillRect(cx - 1, cy - 15, 2, 4);
  ctx.fillRect(cx - 2, cy - 14, 4, 1.5);

  // Embossed Base Circlet Band
  ctx.fillStyle = pal.mid;
  ctx.fillRect(cx - 11, cy + 3, 22, 4);
  ctx.fillStyle = pal.hi;
  ctx.fillRect(cx - 11, cy + 3, 22, 1);

  // 3 Faceted Cabochon Jewels
  ctx.fillStyle = pal.dark; ctx.fillRect(cx - 9, cy + 3, 4, 4);
  ctx.fillStyle = '#2070ff'; ctx.fillRect(cx - 8, cy + 4, 2, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 8, cy + 4, 1, 1);

  ctx.fillStyle = pal.dark; ctx.fillRect(cx - 2, cy + 3, 4, 4);
  ctx.fillStyle = '#ff2038'; ctx.fillRect(cx - 1, cy + 4, 2, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy + 4, 1, 1);

  ctx.fillStyle = pal.dark; ctx.fillRect(cx + 5, cy + 3, 4, 4);
  ctx.fillStyle = '#20c060'; ctx.fillRect(cx + 6, cy + 4, 2, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 6, cy + 4, 1, 1);
}

function drawTrimDetails(ctx, shapeId, patCol) {
  ctx.fillStyle = patCol.hi;
  if (shapeId === 'square') {
    for (let x = 2; x < W - 2; x += 3) {
      ctx.fillRect(x, 88, 1.5, 6);
    }
  } else if (shapeId === 'pointed') {
    for (let x = 6; x < W - 5; x += 6) {
      ctx.fillRect(x, 70, 1.5, 1.5);
    }
  } else if (shapeId === 'swallowtail') {
    ctx.fillStyle = patCol.dark;
    ctx.fillRect(W / 2 - 2, 75, 4, 2);
  }
}

/** In-memory cache of generated banner canvas elements */
const skinCache = new Map();

export function bannerKey(cfg) {
  if (!cfg) return 'default';
  return `${cfg.shape || 'pointed'}|${cfg.color || 'azure'}|${cfg.pattern || 'none'}|${cfg.patternColor || 'silver'}|${cfg.emblem || 'vanguard'}|${cfg.emblemColor || 'gold'}`;
}

export function getBannerSkin(cfg) {
  const k = bannerKey(cfg);
  let c = skinCache.get(k);
  if (!c) {
    c = createBannerCanvas(cfg);
    skinCache.set(k, c);
  }
  return c;
}

export function getBannerRoll(cfg) {
  const col = BANNER_COLORS[(cfg && cfg.color) || 'azure'] || BANNER_COLORS.azure;
  return col.dark;
}
