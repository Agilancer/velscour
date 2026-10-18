// THE DARK FOREST's trials (game/darkforest.js). Each map deals five of the twelve glade trials, without repeats,
// to its scenario glades; the Heart of the Forest always holds the Elder Heartwood.
export const DF_TRIALS = {
  wisps: ['The Witch-Lights', 'Catch five fleeing will-o\'-wisps before their light fails.'],
  nest: ['The Brood Mother', 'Burn the egg sacs, then slay the spider queen who laid them.'],
  effigies: ['The Hanging Effigies', 'Burn four effigies. While they hang, the slain rise again.'],
  lanterns: ['The Lantern Vigil', 'Keep the glade\'s lanterns burning until the dark passes.'],
  druids: ['The Druid Circle', 'Watch the stones glow, then touch them in the same order.'],
  wolfmoon: ['Wolf Moon', 'Slay the alpha before its howling calls the whole pack.'],
  lostchildren: ['Lost in the Woods', 'Find three lost children in the trails and lead them back.'],
  palisade: ['The Bandit Stockade', 'Storm the palisade and bring down the bandit chief.'],
  fairyring: ['The Fairy Ring', 'Stand in each ring of mushrooms while the fey try to drive you out.'],
  barrow: ['The Hollow King\'s Barrow', 'Open the barrow and put its risen king back in the ground.'],
  woodcutters: ['The Woodcutters\' Last Stand', 'Defend the woodcutters from the trees that woke up angry.'],
  thorns: ['The Creeping Thorns', 'Uproot four thorn hearts before the briars swallow the glade.'],
  heart: ['The Elder Heartwood', 'Sever the roots, fell the Heartwood Warden, and open the way on.'],
};
export const DF_GLADE_TYPES = Object.keys(DF_TRIALS).filter((k) => k !== 'heart');
