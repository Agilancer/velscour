// Hero backups: before cloud sync replaces or deletes a hero on this device (or a cloud copy), the old one is kept
// here, in IndexedDB (not localStorage, so backups never eat the saves' quota). Settings > Hero backups restores them.
// A backup that can't be written rejects, and cloud.js then changes nothing.
const DB = 'velscour_backups', STORE = 'heroes', KEEP = 12;   // newest copies kept per class

let dbP = null;
function open() {
  if (!dbP) dbP = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('No IndexedDB on this device')); return; }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key', autoIncrement: true }).createIndex('cls', 'cls');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('IndexedDB blocked'));
  }).catch((e) => { dbP = null; throw e; });
  return dbP;
}
const done = (t) => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error || new Error('Backup failed')); });
const all = (q) => new Promise((res, rej) => { q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });

/** Keep copies of heroes (why: 'cloud' | 'deleted' | 'cloudcopy' | 'restore'). Resolves once they're on disk. */
export async function backupHeroes(heroes, why) {
  heroes = heroes.filter(Boolean);
  if (!heroes.length) return;
  const db = await open();
  const have = await all(db.transaction(STORE).objectStore(STORE).getAll());
  const t = db.transaction(STORE, 'readwrite'), os = t.objectStore(STORE);
  for (const h of heroes) {
    if (have.some((b) => b.hero.id === h.id && b.hero.lastPlayed === h.lastPlayed)) continue;   // already kept
    os.add({ cls: h.classId, why, at: Date.now(), hero: JSON.parse(JSON.stringify(h)) });
  }
  await done(t);
  // trim the oldest beyond KEEP per class (only after the new copies are safely written)
  const t2 = db.transaction(STORE, 'readwrite'), os2 = t2.objectStore(STORE);
  const byCls = {};
  for (const b of await all(os2.getAll())) (byCls[b.cls] = byCls[b.cls] || []).push(b);
  for (const list of Object.values(byCls)) list.sort((a, b) => b.at - a.at).slice(KEEP).forEach((b) => os2.delete(b.key));
  await done(t2);
}
/** All backups, newest first: [{ key, cls, why, at, hero }]. */
export async function listBackups() {
  const db = await open();
  return (await all(db.transaction(STORE).objectStore(STORE).getAll())).sort((a, b) => b.at - a.at);
}
