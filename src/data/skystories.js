// The Sky Battle's stories (docs/SKY_STORIES.md): thirty more battles on the ironclad's deck, each its own tale with its
// own boarders (any painted art, palette-swapped), captains, sky-knights and dialogue, some with a gauntlet of bosses and a
// master who comes over last. A story rides on one of the eight weathers of data/skybattle.js (`base`) and overrides what
// it names. game/skybattle.js runs them like the eight scenarios; tools/tests/skystories.mjs checks the data.
import { STORIES_0 } from './skystories/s0.js';
import { STORIES_1 } from './skystories/s1.js';
import { STORIES_2 } from './skystories/s2.js';
import { STORIES_3 } from './skystories/s3.js';
import { STORIES_4 } from './skystories/s4.js';

export const SKY_STORIES = [...STORIES_0, ...STORIES_1, ...STORIES_2, ...STORIES_3, ...STORIES_4];
