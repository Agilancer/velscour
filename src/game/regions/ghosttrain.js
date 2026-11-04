// THE IRON EXPRESS (region id ghost_train; docs/GHOST_TRAIN.md): raiders have taken the night express across the
// Wilds. The map is world/ghosttrain.js, the run game/ghosttrain.js, the three.js train gfx/ghosttrain3d.js. three.js
// failing to load leaves ready() false, and the level plays as the Forsaken Wilds.
import { registerRegion } from '../regions.js';
import { generateGhostTrain } from '../../world/ghosttrain.js';
import { createGhostTrainRun } from '../ghosttrain.js';
import { loadTrain3D, train3dReady } from '../../gfx/ghosttrain3d.js';

registerRegion({
  id: 'ghost_train',
  words: ['train', 'iron express', 'express', 'all aboard'],
  portal: 'Raiders have taken the night express. Board at the caboose and fight forward, car by car, past their lieutenant to the engine. She stops at five stations: step off to loot, but be aboard when she leaves.',
  townLine: 'The Iron Express runs beyond: sixteen cars held by raiders, five stations, a lieutenant halfway along and their chief on the tender.',
  load: () => loadTrain3D().catch((e) => console.warn(e)),
  ready: train3dReady,
  generate: generateGhostTrain,
  createRun: createGhostTrainRun,
  intro: () => 'Tickets, please. Fight forward to the engine.',
  quest(sc, step) {
    const n = sc.carDone.length, left = sc.leavesIn;
    let h = step(sc.cleared >= n, `Fight forward car by car: <b>${sc.cleared}/${n}</b> cleared.`);
    const L = sc.lieutenant;
    if (L) h += step(L.dead, L.dead ? 'Their lieutenant is down.' : 'Halfway along, their lieutenant holds the prison car.');
    h += step(sc.completed || (sc.stationsSeen >= sc.stations && !sc.stop), sc.stop && !sc.stop.last
      ? `<b>${sc.stop.name}</b>${left != null ? `: she leaves in <b>${left}s</b>` : ''}. Step off to loot, or stay aboard.`
      : `Stations: <b>${sc.stationsSeen}/${sc.stations}</b> <span class="dim">— step off to loot; be aboard when she leaves.</span>`);
    h += step(sc.completed || sc.fire < 1, "Defeat the raiders' chief on the tender.");
    h += step(sc.completed, sc.completed ? 'The Last Stop: the exit is open on the platform.' : 'His fall puts the brakes on.');
    return h;
  },
  winText: 'Bonus skill point for taking back the Iron Express!',
  amb: 'town',
  wilds: false,
});
