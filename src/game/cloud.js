// Cloud saves: Google sign-in (Firebase Auth) and one Firestore document per hero, users/{uid}/heroes/{classId}.
// localStorage stays the real save and the game never waits on the network; the cloud is a copy kept in step.
// Each class merges three ways against what this device last synced (base): only this device changed -> push,
// only the cloud changed -> pull, both -> the player picks one (screens.js asks). A change is a different hero id
// or lastPlayed. The Firebase SDK loads from Google's CDN only for players who sign in.
import { G } from '../state.js';
import { heroesByClass, replaceClassHero, onSaveChange } from './save.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const CONFIG = {
  apiKey: 'AIzaSyAGqRSMtHdwt73HVyrcL0b_47pjoRz_fUg',
  authDomain: 'velscour.firebaseapp.com',
  projectId: 'velscour',
  storageBucket: 'velscour.firebasestorage.app',
  messagingSenderId: '368591862441',
  appId: '1:368591862441:web:77117f1ec81c33192387b8',
};
const KEY = 'velscour_cloud_v1';
const PUSH_DELAY = 60e3;   // a played hero goes up at most once a minute (and when the tab hides or play stops)
const RETRY = 120e3;       // offline: try again this often
const RESYNC = 20e3;       // back on the title or the tab: a full sync if the last is older than this

/** Firebase behind the few calls the sync needs (tests swap in a fake with Cloud.useBackend). */
function firebaseBackend() {
  let auth, fs, au, db;
  return {
    async init() {
      const [app, a, f] = await Promise.all(['app', 'auth', 'firestore-lite'].map((m) => import(SDK + 'firebase-' + m + '.js')));
      const fbApp = app.initializeApp(CONFIG);
      auth = a; fs = f; au = a.getAuth(fbApp); db = f.getFirestore(fbApp);
      await au.authStateReady();
    },
    user() { const u = au.currentUser; return u && { uid: u.uid, name: u.displayName || '', email: u.email || '' }; },
    async signIn() { await auth.signInWithPopup(au, new auth.GoogleAuthProvider()); return this.user(); },
    signOut() { return auth.signOut(au); },
    async list(uid) {
      const out = {};
      (await fs.getDocs(fs.collection(db, 'users', uid, 'heroes'))).forEach((d) => { out[d.id] = fromDoc(d.data()); });
      return out;
    },
    /** Write rec (null deletes) if the document still holds `expect` (meta or null): { ok } or { ok: false, cur }. */
    commit(uid, cls, expect, rec) {
      const ref = fs.doc(db, 'users', uid, 'heroes', cls);
      return fs.runTransaction(db, async (t) => {
        const d = await t.get(ref), cur = d.exists() ? fromDoc(d.data()) : null;
        if (!same(meta(cur), expect)) return { ok: false, cur };
        if (!rec) t.delete(ref);
        else t.set(ref, { ...rec, gz: rec.gz ? fs.Bytes.fromUint8Array(rec.gz) : null, at: fs.serverTimestamp() });
        return { ok: true };
      });
    },
  };
  function fromDoc(r) { return { ...r, gz: r.gz && r.gz.toUint8Array ? r.gz.toUint8Array() : r.gz || null }; }
}

const meta = (r) => (r ? { id: r.id, lastPlayed: r.lastPlayed } : null);
const same = (a, b) => (!a || !b ? !a && !b : a.id === b.id && a.lastPlayed === b.lastPlayed);

/** A hero as a cloud record: a few fields to show in a conflict, and the save gzipped (plain JSON where the browser
 * has no CompressionStream). A full 300-slot stash is ~150 KB of JSON, ~18 KB gzipped. */
async function pack(c) {
  const json = JSON.stringify(c);
  const rec = { v: 1, id: c.id, classId: c.classId, name: c.name, level: c.level, depth: c.depth, gold: c.gold, lastPlayed: c.lastPlayed, gz: null, json: null };
  if (typeof CompressionStream === 'undefined') rec.json = json;
  else rec.gz = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  return rec;
}
async function unpack(r) {
  if (r.json) return JSON.parse(r.json);
  return JSON.parse(await new Response(new Blob([r.gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}

function loadState() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return { base: {}, ...s }; } catch (e) { /* fresh */ }
  return { uid: null, name: '', email: '', base: {}, last: 0 };
}

let be = null, ready = null, st = loadState(), chain = Promise.resolve(), pushT = 0, retryT = 0, busy = 0;
const dirty = new Set(), listeners = [], warned = new Set();
const saveState = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* full: the base is rebuilt next sync */ } };
const emit = (what) => { for (const fn of listeners) try { fn(what); } catch (e) { console.warn(e); } };
const setStatus = (s, err) => { Cloud.status = s; Cloud.error = err || ''; emit('status'); };
const playing = (cls) => G.mode === 'game' && G.char && G.char.classId === cls;
/** Run sync steps one at a time; a network failure leaves the work dirty and retries later. */
function queue(fn) {
  busy++;
  const p = chain.then(() => ready).then(fn).catch((e) => {
    console.warn('Cloud save:', e);
    const off = !navigator.onLine || /unavailable|network|offline|fetch/i.test(String(e && (e.code || e.message)));
    setStatus(off ? 'offline' : 'error', off ? 'Offline: saved on this device, will sync later.' : String(e && (e.message || e)));
    clearTimeout(retryT); retryT = setTimeout(() => Cloud.sync(true), RETRY);
  }).finally(() => { if (!--busy) emit('idle'); });
  chain = p;
  return p;
}

async function push(cls, hero, expect) {
  const r = await be.commit(st.uid, cls, expect, hero ? await pack(hero) : null);
  if (r.ok) { st.base[cls] = meta(hero); Cloud.conflicts.delete(cls); return; }
  if (same(meta(r.cur), meta(hero))) { st.base[cls] = meta(hero); return; }   // another tab already sent it
  conflict(cls, hero, r.cur);
}
async function pull(cls, rec) {
  replaceClassHero(cls, rec ? await unpack(rec) : null);
  st.base[cls] = meta(rec);
  Cloud.conflicts.delete(cls);
  emit('change');
}
function conflict(cls, local, cloud) {
  Cloud.conflicts.set(cls, { cls, local: local || null, cloud: cloud || null });
  emit('conflict');
}

async function syncAll() {
  if (!st.uid) return;
  setStatus('syncing');
  const cloud = await be.list(st.uid), local = heroesByClass();
  for (const cls of new Set([...Object.keys(local), ...Object.keys(cloud), ...Object.keys(st.base)])) {
    const L = local[cls] || null, C = cloud[cls] || null, B = st.base[cls] || null;
    dirty.delete(cls);
    if (same(meta(L), meta(C))) { st.base[cls] = meta(L); Cloud.conflicts.delete(cls); continue; }
    const lc = !same(meta(L), B), cc = !same(meta(C), B);
    if (lc && !cc) await push(cls, L, meta(C));
    else if (cc && !lc && !playing(cls)) await pull(cls, C);
    else conflict(cls, L, C);
  }
  for (const cls of Object.keys(st.base)) if (!st.base[cls]) delete st.base[cls];
  st.last = Date.now();
  saveState();
  setStatus(Cloud.conflicts.size ? 'conflict' : 'ok');
}
async function flush() {
  if (!st.uid) return;
  clearTimeout(pushT); pushT = 0;
  const local = heroesByClass();
  for (const cls of [...dirty]) {
    dirty.delete(cls);
    const L = local[cls] || null, B = st.base[cls] || null;
    if (Cloud.conflicts.has(cls)) { Cloud.conflicts.get(cls).local = L; continue; }
    if (!same(meta(L), B)) {
      setStatus('syncing');
      try { await push(cls, L, B); } catch (e) { dirty.add(cls); throw e; }   // offline: still to send
    }
  }
  saveState();
  setStatus(Cloud.conflicts.size ? 'conflict' : 'ok');
}

onSaveChange((cls) => {
  if (!st.uid) return;
  dirty.add(cls);
  if (!ready) return;                                  // not connected yet: start()'s sync sends it
  if (G.mode !== 'game') queue(flush);                 // a deleted or new hero on the select screen goes up now
  else if (!pushT) pushT = setTimeout(() => queue(flush), PUSH_DELAY);
});

if (typeof addEventListener === 'function') addEventListener('visibilitychange', () => { if (document.hidden) setTimeout(() => Cloud.flush(), 0); else Cloud.sync(); });   // after main.js's autosave
if (typeof addEventListener === 'function') addEventListener('online', () => Cloud.sync(true));

export const Cloud = {
  status: 'off',     // off | loading | syncing | ok | conflict | offline | error
  error: '',
  conflicts: new Map(),   // classId -> { cls, local: hero | null, cloud: record | null }
  get signedIn() { return !!st.uid; },
  get user() { return st.uid ? { name: st.name, email: st.email } : null; },
  get lastSync() { return st.last; },
  /** fn(what): 'status' | 'change' (local heroes were replaced from the cloud) | 'conflict' | 'idle'. */
  on(fn) { listeners.push(fn); },
  useBackend(b) { be = b; ready = null; },
  /** Load the SDK (the settings dialog calls this so the sign-in popup opens inside the tap). */
  preload() {
    if (!ready) {
      be = be || firebaseBackend();
      ready = be.init().catch((e) => { ready = null; throw e; });
    }
    return ready;
  },
  /** On boot: a device that was signed in picks its session back up and syncs. */
  async start() {
    if (!st.uid) return;
    setStatus('loading');
    try { await this.preload(); } catch (e) { setStatus('offline', 'Could not reach Google: saved on this device.'); clearTimeout(retryT); retryT = setTimeout(() => this.start(), RETRY); return; }
    const u = be.user();
    if (!u || u.uid !== st.uid) { st.uid = null; saveState(); setStatus('off', 'Your Google sign-in expired. Sign in again in Settings.'); return; }
    st.name = u.name; st.email = u.email;
    await this.sync(true);
  },
  async signIn() {
    await this.preload();
    const u = await be.signIn();
    if (!u) return;
    if (u.uid !== st.uid) st.base = {};   // a new account (or after a sign-out): everything merges afresh
    Object.assign(st, { uid: u.uid, name: u.name, email: u.email });
    saveState();
    await this.sync(true);
  },
  /** Signs out of the game's cloud copy. The heroes stay on this device. */
  async signOut() {
    await chain.catch(() => {});
    if (dirty.size) await queue(flush);
    try { if (be) await be.signOut(); } catch (e) { console.warn(e); }
    st = { uid: null, name: '', email: '', base: {}, last: 0 };
    saveState();
    this.conflicts.clear(); dirty.clear();
    setStatus('off');
  },
  /** A full merge (skipped when one ran in the last 20 s unless forced). Resolves when done. */
  sync(force) {
    if (!st.uid || !ready) return chain;
    if (!force && (busy || Date.now() - st.last < RESYNC)) return chain;
    return queue(syncAll);
  },
  /** Send played heroes now (quitting to the title, the tab hiding). */
  flush() { return st.uid && ready ? queue(flush) : chain; },
  /** Wait for a sync in flight, at most ms. */
  settle(ms = 5000) { return busy ? Promise.race([chain, new Promise((r) => setTimeout(r, ms))]) : Promise.resolve(); },
  /** The player chose which copy of a class's hero to keep. */
  resolve(cls, keep) {
    const c = this.conflicts.get(cls);
    if (!c) return chain;
    return queue(async () => {
      setStatus('syncing');
      if (keep === 'cloud') await pull(cls, c.cloud);
      else { this.conflicts.delete(cls); await push(cls, heroesByClass()[cls] || null, meta(c.cloud)); }
      saveState();
      setStatus(this.conflicts.size ? 'conflict' : 'ok');
    });
  },
  /** Once per class and session: tell the player in a fight why this hero stopped syncing. */
  warnOnce(cls) { if (warned.has(cls)) return false; warned.add(cls); return true; },
  unpack,
};
