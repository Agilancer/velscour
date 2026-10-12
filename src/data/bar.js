// The skill bar: 15 skill slots in the order the HUD art shows them (LMB, ` 1-9 0 - =, RMB).
export const BAR_SIZE = 15;
export const LMB = 0, RMB = 14;
export const SLOT_LABELS = ['LMB', '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'RMB'];
export const SLOT_KEYS = [null, 'Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', null];
// where a newly learned skill lands: 1-9, 0, -, =, then ` and RMB
export const FILL_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1, RMB];

/** The first empty slot a new skill should go to, or -1. */
export const freeSlot = (bar) => { const i = FILL_ORDER.find((k) => !bar[k]); return i === undefined ? -1 : i; };

/** Saves before the 15-slot bar had 10 slots: [LMB, 1-8, RMB]. */
export function migrateBar(bar) {
  if (Array.isArray(bar) && bar.length === BAR_SIZE) return bar;
  const out = Array(BAR_SIZE).fill(null);
  if (Array.isArray(bar) && bar.length === 10) {
    out[LMB] = bar[0];
    for (let i = 1; i <= 8; i++) out[i + 1] = bar[i];
    out[RMB] = bar[9];
  }
  return out;
}
