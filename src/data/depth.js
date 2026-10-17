// The descent: Demon Lord Velscour waits at FINAL_DEPTH, and depthLevel maps a depth to the monster level that
// sets its monsters' life, damage, XP and loot. The curve runs 1:1 to depth 60 and flattens after it, so 500
// depths fit a scale the gear, skill points and skill mastery (game/augments.js) can keep up with.
export const FINAL_DEPTH = 500;
export const depthLevel = (d) => (d <= 60 ? d : Math.round(60 + (d - 60) * 0.45));
/** Every fifth depth but the last ends in a BOSS ROOM. */
export const isRaidDepth = (d) => d % 5 === 0 && d !== FINAL_DEPTH;
/** First depth of d's five-depth block (the block ends in its BOSS ROOM): where a death sends the hero back to. */
export const blockStart = (d) => Math.floor((Math.max(1, d) - 1) / 5) * 5 + 1;
/**
 * Armor's divisor against a monster of level `lvl`: armor / (armor + armorDiv) of physical damage is stopped. Item
 * armor grows 1.045 an item level, so past level 100 the divisor grows as fast, or deep heroes became immune.
 */
export const armorDiv = (lvl) => (30 + lvl * 18) * Math.pow(1.045, Math.max(0, lvl - 100));
/** Hero life multiplier by hero level ("Fortitude"): gear and attributes add life linearly, monster hits don't. */
export const fortitude = (level) => 1 + Math.max(0, level - 60) * 0.022;
