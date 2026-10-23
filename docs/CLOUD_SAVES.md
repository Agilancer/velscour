# Cloud saves (Google sign-in)

Players can sign in with Google (Settings > Cloud save) to copy their heroes to the cloud and play them on any device.
The code is `src/game/cloud.js`, the screens are in `src/ui/screens.js` (`cloudDialog`, `conflictDialogs`), and the
test is `tools/tests/cloud.js`.

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
  `users/{uid}/heroes/{classId}`, holding `{ v, id, classId, name, level, depth, gold, lastPlayed, gz | json, at }`.
  `gz` is the save gzipped as Firestore Bytes (a full 300-slot stash is ~150 KB of JSON, ~18 KB gzipped). Browsers
  without CompressionStream store plain `json` instead.
- **Merging is three-way per class**, against `base`, what this device last synced (`velscour_cloud_v1` in
  localStorage). A "change" is a different hero `id` or `lastPlayed`:
  - Only this device changed: push.
  - Only the cloud changed: pull (`replaceClassHero`, keeping `lastPlayed`).
  - Both changed: the player picks a copy in the "Two copies of a hero" dialog.

  Deleting a hero is a change too, so no tombstones are needed. A first sign-in on a device (empty base) never
  overwrites anything: a different hero on each side asks the player.
- **When it syncs:**
  - A full sync runs on boot, on sign-in, back on the title screen, when the tab shows again and when the device comes
    back online (skipped if one ran in the last 20 s).
  - The hero being played pushes at most once a minute (`PUSH_DELAY`), plus when play stops or the tab hides.
  - Each push is a transaction that checks the document still matches `base`. If another device changed it in the
    meantime, it becomes a conflict instead of an overwrite. The class being played is never pulled; the player gets
    one log line, and the choice waits for the title screen.
- **Offline:** work stays dirty, the status reads offline, and it retries every 2 minutes and on the `online` event.
- **Sign out** keeps the heroes on the device and clears `base`, so a later sign-in merges from scratch.

## Costs
On the free tier (50,000 reads and 20,000 writes a day), one write a minute while playing allows roughly 300
player-hours a day. A full sync reads one document per hero. Raise `PUSH_DELAY` if writes run short.

## Not done yet
- Apple sign-in (needs an Apple Developer account; Firebase supports it with the same code plus an `OAuthProvider('apple.com')`).
- Settings, the taunt deck and the Bard's heard melodies stay per device.
- The real popup can't be tested in cloud containers (gstatic and apis.google.com are blocked there). `cloud.js` routes
  the SDK from the npm package and checks that it loads and that Firestore refuses a signed-out read.
