// The descent: Demon Lord Velscour waits at FINAL_DEPTH, and depthLevel maps a depth to the monster level that
// sets its monsters' life, damage, XP and loot. The curve runs 1:1 to depth 60 and flattens after it, so 500
// depths fit a scale the gear, skill points and skill mastery (game/augments.js) can keep up with.
export const FINAL_DEPTH = 500;
export const depthLevel = (d) => (d <= 60 ? d : Math.round(60 + (d - 60) * 0.45));
/** Every fifth depth but the last ends in a BOSS ROOM. */
export const isRaidDepth = (d) => d % 5 === 0 && d !== FINAL_DEPTH;
