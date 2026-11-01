// The hero's bag: 10 slots a row, 6 rows to start, up to 6 more bought with gold (each costs twice the last).
// c.bag.length is the row count, so a save keeps its bought rows with nothing else to store.
export const BAG_COLS = 10, BAG_ROWS = 6;
export const BAG_ROW_COST = [5000, 10000, 20000, 40000, 80000, 160000]; // rows 7..12
export const BAG_MAX_ROWS = BAG_ROWS + BAG_ROW_COST.length;

export function bagRows(c) { return Math.ceil(c.bag.length / BAG_COLS); }
/** Gold for the next row, or 0 when the bag is as big as it gets. */
export function nextRowCost(c) { return BAG_ROW_COST[bagRows(c) - BAG_ROWS] || 0; }
/** Buy the next row if there is one and the gold is there. */
export function buyBagRow(c) {
  const cost = nextRowCost(c);
  if (!cost || c.gold < cost) return false;
  c.gold -= cost;
  for (let i = 0; i < BAG_COLS; i++) c.bag.push(null);
  return true;
}
/** Saves: a full grid of at least 6 rows, never more than 12 (empty slots past that are dropped). */
export function fixBag(c) {
  if (!Array.isArray(c.bag)) c.bag = [];
  while (c.bag.length < BAG_COLS * BAG_ROWS || c.bag.length % BAG_COLS) c.bag.push(null);
  while (c.bag.length > BAG_COLS * BAG_MAX_ROWS && c.bag[c.bag.length - 1] === null) c.bag.pop();
}
