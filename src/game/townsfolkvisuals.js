// Shared, deterministic town visitor animation helpers.
// Coordinates are isometric: screen X is proportional to world X minus world Y.
// Mirroring is a property of the character's facing, not of individual frames.
export const TOWN_WALK_FPS = 4.25;

export function townFacingFlip(dx, dy, previous = false) {
  const screenDx = dx - dy;
  return Math.abs(screenDx) <= 0.02 ? previous : screenDx < 0;
}

export function townFrame(n) {
  if (n.knight && n.townAttackT > 0) {
    const count = Math.max(1, Math.floor(n.frameCount || 13) - 11);
    return 11 + (Math.floor((n.animT || 0) * 4.5 + (n.townAttackSeed || 0)) % count);
  }
  if (n.townPoseT > 0) return Math.max(0, Math.min(10, n.townPoseFrame ?? 1));
  if (n.walking) return 3 + Math.floor((n.walkT || 0) * TOWN_WALK_FPS) % 2;
  return Math.floor((n.animT || 0) * 0.7 + (n.idleSeed || 0)) % 3;
}

export function townMotion(animT = 0, moving = false) {
  // Match Creature.draw: 2.2px rising bob, 3% squash/stretch on a moving
  // character, with a very subtle idle breathing motion.
  return moving
    ? { bob: Math.abs(Math.sin(animT * 9)) * 2.2, squash: 1 + Math.sin(animT * 18) * 0.03 }
    : { bob: Math.sin(animT * 2) * 0.6, squash: 1 };
}
