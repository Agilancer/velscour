// Phobos's voices (src/data/phobostalk.js), no browser: thousands of different lines, and every one (with the longest
// place and lord names) fits a speech bubble. Usage: node tools/tests/phobostalk.mjs
import { TALK, CONVOS, allLines } from '../../src/data/phobostalk.js';
const ctx = { place: 'The Castle Approach', lord: 'The Crowned Gallows-Bride' }, errors = [];
let total = CONVOS.length * 2;
for (const k of Object.keys(TALK)) {
  const a = allLines(k, ctx); total += a.length;
  for (const l of a) { if (l.length > 120) errors.push(`${k}: too long (${l.length}): ${l}`); if (/\{|\}|  |\s[,.!?]/.test(l)) errors.push(`${k}: malformed: ${l}`); }
  console.log(k.padEnd(12), String(a.length).padStart(5), 'e.g.', a[Math.floor(a.length / 2)]);
}
console.log('total', total);
if (total < 3000) errors.push(`only ${total} lines`);
if (errors.length) { console.log(errors.slice(0, 20).join('\n')); process.exit(1); } else console.log('NO ERRORS');
