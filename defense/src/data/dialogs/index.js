// The 320 campaign dialogs (docs/STORY.md), each with its stage, when it plays and who leads (docs/dialog_schedule.json).
import p1 from './part1.js';
import p2 from './part2.js';
import p3 from './part3.js';
import p4 from './part4.js';

export const DIALOGS = [...p1, ...p2, ...p3, ...p4].map((d) => ({ ...d, level: +d.id.slice(1, 3), at: d.id[3] === 'b' ? 'begin' : 'end' }));
