# Cloud saves (Google sign-in)

Players can sign in with Google (Settings > Cloud save) to copy their heroes to the cloud and play them on any device.
The code is `src/game/cloud.js` and `src/game/herobackup.js`, the screens are in `src/ui/screens.js` (`cloudDialog`,
`conflictDialogs`, `backupsDialog`), and the test is `tools/tests/cloud.js`.

## No save is ever lost (the rules the code keeps)
1. **localStorage is never changed by the cloud without a backup first.** Before a pull, a remote deletion or "Keep
   the cloud" replaces or removes a hero here, every save of that class is copied to IndexedDB (`herobackup.js`,
   `velscour_backups`, newest 12 per class). If the backup fails (no IndexedDB, storage full), the change doesn't
   happen. "Keep this device" also backs up the cloud copy it writes over. **Settings > Hero backups** restores any
   backup, and the hero it replaces is backed up too.
2. **Missing isn't deleted.** A hero gone from this device counts as deleted only when the player deleted it here
   (`deleteSave`/`deleteClassSaves` report the ids; `st.deleted`). A hero gone from the cloud counts as deleted only
   when a tombstone names it (`{ deleted: true, id }`; documents are never removed). Otherwise the missing side gets
   a copy back. So wiped or corrupt saves, or a lost cloud document, can never spread a deletion.
3. **Unreadable saves are never written over.** If `velscour_saves_v1` exists but doesn't parse or isn't a list
   (`savesReadable()`), the sync changes nothing, here or in the cloud, and `replaceClassHero` refuses to write. The
   game's own saving is guarded too (`writeAll` in save.js, for every player): before the first new save replaces
   them, the unreadable text is set aside under `velscour_saves_v1_unreadable_<time>` (or in IndexedDB's `raw` store
   when localStorage is full; a copy that then crowds out the save moves there). Until a copy exists, every save is
   refused and the player is warned. The title explains, and Settings > Hero backups downloads the data. A signed-in
   player's heroes then come back from the cloud (rule 2). Test: `tools/tests/savesafe.js`.
4. **Damaged cloud copies aren't loaded.** A cloud hero must unpack and match its record (id, class, lastPlayed,
   level, equip, bag) before it can replace anything (`unpackChecked`).
5. **A failed local write isn't counted as synced**, so the old copy can't later be sent over a newer cloud one.
6. **Conflicts ask.** Both sides changed → the player picks a copy. The hero being played is never swapped.
7. **Players who never sign in are untouched.** The only change to their saving is a hook call after each write,
   wrapped so it can't throw.

## How it works
- **Firebase project `velscour`** (console.firebase.google.com, owned by the user, free Spark plan). Authentication has
  Google enabled. The authorized domains are `localhost`, `agilancer.github.io` and the Firebase defaults. Firestore
  (Standard edition) has these rules:
  ```
  match /users/{uid}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }
  ```
  The web config in `cloud.js` is public by design. The rules are what protect the saves.
- **The SDK** (`firebase-app`, `firebase-auth`, `firebase-firestore-lite`, 12.19.0) is imported from gstatic only
  for a device that is signed in, or when the pointer reaches the sign-in button. Players who never sign in load
  nothing extra. The sign-in uses `signInWithPopup`; the popup waits on Google's iframe from `apis.google.com`.
- **localStorage stays the real save.** The game never waits on the network. Each class's hero is one document,
  `users/{uid}/heroes/{classId}`, holding `{ v, id, classId, name, level, depth, gold, lastPlayed, gz | json, at }`
  (or a tombstone `{ v, deleted: true, id, classId, lastPlayed, at }`).
  `gz` is the save gzipped as Firestore Bytes (a full 300-slot stash is ~150 KB of JSON, ~18 KB gzipped). Browsers
  without CompressionStream store plain `json` instead.
- **Merging is three-way per class**, against `base`, what this device last synced (`velscour_cloud_v1` in
  localStorage). A "change" is a different hero `id` or `lastPlayed`:
  - Only this device changed: push.
  - Only the cloud changed: pull (`replaceClassHero`, keeping `lastPlayed`).
  - Both changed: the player picks a copy in the "Two copies of a hero" dialog.

  Deleting a hero leaves a tombstone (see the rules above). A first sign-in on a device (empty base) never
  overwrites anything: a different hero on each side asks the player.
- **When it syncs:**
  - A full sync runs on boot, on sign-in, back on the title screen, when the tab shows again and when the device comes
    back online (skipped if one ran in the last 20 s).
  - The hero being played pushes at most once every 5 minutes (`PUSH_DELAY`), plus when play stops (back to the
    title) or the tab hides, so switching devices never waits on the timer.
  - Each push is a transaction that checks the document still matches `base`. If another device changed it in the
    meantime, it becomes a conflict instead of an overwrite. The class being played is never pulled; the player gets
    one log line, and the choice waits for the title screen.
- **Offline:** work stays dirty, the status reads offline, and it retries every 2 minutes and on the `online` event.
- **The account record** (the Endgame's shared record, `src/game/endgame.js`, docs/ENDGAME.md): one more document,
  `users/{uid}/account/endgame`, holding `{ v, unlocked, marks: { pts, xp, spent: { life, crit, mf, rift } }, bests,
  keysFound, unboundWins, at }`. It is not a hero: it never conflicts and never asks; `mergeEndgame(local, cloud,
  base)` folds the two copies into one that loses nothing, three ways against `st.endBase` (the record this device
  last synced, in `velscour_cloud_v1`):
  - **Counters** (`marks.pts`, `keysFound`, `unboundWins`): the base plus what each side earned since it, so 10
    Marks earned on one device and 5 on another while apart end at 15 on both. Never below either side or the base.
    No base (a first sign-in on this device): the larger.
  - **Spending** (`marks.spent`): each side's change since the base, per category (a reset on one device and a spend
    on the other both hold). If the sum is more than the Marks (the same free Marks spent on both devices), this
    device's spending wins. A side with fewer Marks than the base is damaged and its spending is ignored. No base:
    the spending of the side with more Marks.
  - **The rest:** `marks.xp` the larger, `unlocked` the earliest time, `bests` the better rift per class. A damaged
    record (junk values, spending past its Marks) is sanitised by `fixEndgame` first, so it lowers nothing; the next
    sync writes the merged record back over it.
  The sync (`syncAccount`, part of every full sync, and 60 s after any change to the record outside play's XP ticks)
  adopts the merge here, sets the base to what it read, and writes the merge back in a transaction that checks the
  document still holds what was read (another device wrote in between: read and merge again, up to 3 times); after
  the write the base is the merge. XP towards the next Mark alone does not wake the sync.
- **Sign out** keeps the heroes and the account record on the device and clears `base` and `endBase`, so a later
  sign-in merges from scratch.

## Costs
On the free tier (50,000 reads and 20,000 writes a day), one write every 5 minutes while playing allows roughly 1,600
player-hours a day. A full sync reads one document per hero.

## Not done yet
- Apple sign-in (needs an Apple Developer account; Firebase supports it with the same code plus an `OAuthProvider('apple.com')`).
- Settings, the taunt deck and the Bard's heard melodies stay per device.
- The real popup can't be tested in cloud containers (gstatic and apis.google.com are blocked there). `cloud.js` routes
  the SDK from the npm package and checks that it loads and that Firestore refuses a signed-out read.
