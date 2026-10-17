import { el, rand } from '../core/util.js';
import { ART_BY_ID } from '../data/bestiary.js';
import { enemyImage } from '../core/enemyart.js';

const OPENERS = [
  'Oh no,', 'Well then,', 'Listen,', 'Dear abyss,', 'By my bones,', 'I regret to report,', 'Tiny problem:', 'Friends,',
  'Unhand me,', 'This was not in the prophecy,', 'I have a question,', 'Wait a moment,', 'I demand a recount,', 'Mother,', 'Behold,',
  'For the record,', 'I was promised treasure,', 'My lawyers will hear of this,', 'This is awkward,', 'I come in peace,', 'No refunds,',
  'I can explain,', 'Please hold,', 'A small correction,', 'I have made a mistake,', 'Can we talk,', 'Pardon me,', 'Not to panic,',
  'I meant to do that,', 'The floor is lava,', 'I have one note,', 'What a lovely evening,', 'So this is happening,', 'A bold choice,',
  'I object,', 'Just between us,', 'The moon saw nothing,', 'Nobody tell the boss,', 'I brought snacks,', 'This seems unsafe,',
  'My final words are,', 'I am reconsidering,', 'Is this the exit,', 'I shall return,', 'Plot twist,', 'I knew this day would come,',
  'A little help,', 'My confidence was misplaced,', 'I regret nothing,', 'That was a warning,', 'Hold my helmet,', 'I have a plan,',
  'I had a plan,', 'This is fine,', 'Can somebody catch me,', 'Tell my skeleton,', 'I left the oven on,', 'What is that smell,',
  'I see the light,', 'One last thing,'
];
const TAILS = {
  happy: ['this is the best terrible idea ever!', 'I regret nothing and I regret everything!', 'wheeee, what a view!', 'my helmet is full of joy!', 'I am having a wonderful fall!', 'somebody rate that landing!', 'I finally get to be the main character!', 'this is better than my birthday!', 'I am airborne and emotionally thriving!', 'the lava is very welcoming!', 'tell my friends I looked heroic!', 'I can see my house from here!', 'I have never felt so alive!', 'this is a five-star catastrophe!', 'I would do this again immediately!', 'I am the king of the splash!', 'what a fabulous way to go!', 'I regret nothing until the heat!', 'look at me go!', 'I was born for dramatic entrances!', 'the abyss has excellent scenery!', 'I am making memories!', 'best day of my unlife!', 'that was a graceful tumble!', 'I meant to land right there!', 'someone clap for the spin!', 'I am having a blast!', 'my scream sounds majestic!', 'worth it for the view!', 'this is strangely refreshing!', 'I shall name the splash!', 'I feel spectacular!', 'what a ride!', 'I am a comet now!', 'I brought my own fireworks!', 'at least the audience is nice!', 'I am smiling under this helmet!', 'what a glorious mistake!', 'give me a perfect ten!', 'I regret nothing, probably!', 'the landing was intentional!', 'I am floating like a champion!', 'I have achieved maximum drama!', 'the fireflies are pretty!', 'I shall call this a vacation!', 'I came, I saw, I slipped!', 'that was a very good leap!', 'I am having fun, somehow!', 'remember me as fabulous!', 'I am going out with style!'],
  scared: ['I would like to cancel this appointment!', 'please rewind the last three seconds!', 'I suddenly miss the dungeon!', 'my bravery was mostly decorative!', 'I am too young to be crispy!', 'somebody catch me, anybody!', 'I have reconsidered my life choices!', 'I promise to be good!', 'is the lava always this bright?', 'I would like to speak to a manager!', 'I am not emotionally prepared!', 'please tell my feet to stop!', 'I regret the confident speech!', 'I am screaming on the inside and outside!', 'this is significantly hotter than expected!', 'I would like to unsubscribe from falling!', 'my knees have left the party!', 'I am filing a complaint with gravity!', 'I meant to jump the other way!', 'please make the ground come back!', 'I am suddenly very religious!', 'I can explain everything!', 'I did not read the warning sign!', 'my courage has melted!', 'someone turn off the sun!', 'I would like my old life back!', 'I am not a fan of this finale!', 'I am too handsome to melt!', 'this was a terrible shortcut!', 'I should have stayed in bed!', 'the floor is glowing ominously!', 'I am beginning to panic!', 'please pause the cutscene!', 'I promise I will stop looting!', 'my escape plan was a nap!', 'I have made an awful mistake!', 'why is the air crunchy?', 'I am begging the laws of physics!', 'I will be good forever!', 'this is not what I pictured!', 'can I have a tiny ladder?', 'I am having second thoughts!', 'I no longer like surprises!', 'I would like to land somewhere else!', 'I am frightened of my own shadow!', 'this is an unexpected career change!', 'the heat is very persuasive!', 'I should have worn sandals!', 'my last words are a squeak!', 'somebody tell the boss I tried!'],
  silly: ['my soup is in another castle!', 'I left my courage in the other pants!', 'does this count as fast travel?', 'I am a professional sky potato!', 'the floor has excellent manners!', 'I should not have eaten that rune!', 'my hat is doing all the thinking!', 'I regret naming my boots Kevin!', 'I can smell the soundtrack!', 'this leap has too many vowels!', 'I am shaped like a question mark!', 'gravity is being very rude!', 'I was promised a trampoline!', 'my bones are playing percussion!', 'I demand a softer volcano!', 'I packed a snack for this!', 'I am auditioning for a puddle!', 'the view is mostly orange!', 'I forgot how down works!', 'I am a spicy little dumpling!', 'is this a boss mechanic?', 'my map says there is a bridge!', 'I would like extra cheese!', 'I am falling with confidence!', 'the wind stole my eyebrows!', 'I have become a cautionary tale!', 'my helmet is full of bees!', 'I am not a baked potato!', 'I meant to do a backflip!', 'my socks are now legendary!', 'I have seen stranger menus!', 'can lava catch a cold?', 'I am a very loud pebble!', 'somebody save my lunch!', 'this is a poor place to nap!', 'I would like to speak to the rocks!', 'the rocks are not listening!', 'I have a coupon for water!', 'my cape is steering badly!', 'I forgot my dramatic music!', 'the landing zone moved!', 'I am allergic to destiny!', 'I could use a smaller fire!', 'this is why I wear a helmet!', 'my shadow got there first!', 'I am a falling encyclopedia!', 'I have no notes, only screams!', 'is the abyss hiring?', 'I should have taken the stairs!', 'I am making a splashy exit!'],
  begging: ['please let me be a cautionary tale later!', 'I will return every coin!', 'I can be useful as a doorstop!', 'please reconsider my dramatic ending!', 'I will stop biting the hero!', 'I can guide you to treasure!', 'I promise to stop summoning things!', 'please accept this tiny apology!', 'I will clean the dungeon!', 'I know where the secret chest is!', 'I will even say nice things!', 'I can carry your bags!', 'please do not toast me!', 'I will give back the shiny key!', 'I can be a very quiet ghost!', 'I will never block the doorway!', 'I shall become a pacifist!', 'I will tell you a funny story!', 'please spare my eyebrows!', 'I can make excellent soup!', 'I will stop guarding the stairs!', 'I can teach you a spell!', 'I will be so very polite!', 'I promise to behave on Tuesdays!', 'please rescue my dignity!', 'I will write a glowing review!', 'I can be your emotional support monster!', 'I will return the borrowed axe!', 'I will stop making ominous noises!', 'I can open jars for you!', 'please remember I waved first!', 'I will become a friendly landmark!', 'I will share my snacks!', 'I can distract the other monsters!', 'I will stop haunting the basement!', 'please accept my surrender!', 'I can fetch a potion!', 'I will learn a respectable trade!', 'I will never jump again!', 'I can be a very small threat!', 'I will stop standing in the way!', 'I promise not to bite the furniture!', 'I will be nice to the next hero!', 'please put me on a cooler shelf!', 'I can tell you a secret!', 'I will become a humble bard!', 'I can hold the map!', 'I will stop saying boo!', 'please save my favorite horn!', 'I can pay you in pebbles!'],
  sad: ['I was supposed to have a little more time!', 'please tell my friends I tried my best!', 'I never finished my tiny evil plan!', 'I miss my damp cave already!', 'nobody will water my bones!', 'I wanted to see the next sunrise!', 'I left my favorite rock at home!', 'I was saving that scream for later!', 'I never got to learn the lute!', 'my mother said I could be anything!', 'I am not ready to become a cautionary tale!', 'I will miss the sound of rats!', 'I had finally made a friend!', 'my diary is under the bed!', 'I wanted one more snack!', 'I am too young to be a legend!', 'please remember my good side!', 'I never got to return that helmet!', 'the dungeon will feel so empty!', 'I was going to turn over a new leaf!', 'I am sorry about the biting!', 'I wanted to see the ocean!', 'nobody will hear my terrible jokes!', 'I had plans for the weekend!', 'my little cactus needs me!', 'I finally learned everybody’s names!', 'I will miss my suspicious puddle!', 'I never got to apologize to the stairs!', 'I thought I had more lives!', 'my favorite bridge will miss me!', 'I am leaving all my chores undone!', 'I wanted to be a baker someday!', 'I never got to use my fancy key!', 'I was about to say something nice!', 'please keep my tiny hat safe!', 'I will miss my echo!', 'I had just cleaned my lair!', 'I never got my participation trophy!', 'I thought the sign was a joke!', 'I am going to miss the moon!', 'my lunch is still in the oven!', 'I wanted to meet a friendly hero!', 'I was saving a seat for you!', 'my evil laugh was getting better!', 'I am sorry I stood in the doorway!', 'I wanted to see the credits!', 'I have so many unread scrolls!', 'my little slime will be lonely!', 'I wish I had hugged a rock!', 'this is a very sad splash!'],
  outrageous: ['I demand a parade for this entrance!', 'tell the volcano I challenge it to a duel!', 'I am suing the sky for emotional damages!', 'this is the most dramatic thing ever filmed!', 'someone give gravity a very stern look!', 'I will haunt this entire mountain!', 'I expect a statue and a snack!', 'I am the greatest comet in history!', 'behold my absolutely illegal trajectory!', 'the laws of nature are clearly biased!', 'I demand a rematch with the ground!', 'I shall return with a bigger hat!', 'this fall deserves its own orchestra!', 'I am setting a new world record!', 'somebody call the royal cartographer!', 'I will write a strongly worded prophecy!', 'the volcano has challenged the wrong monster!', 'make room for my grand finale!', 'I am about to make geology famous!', 'I refuse to fall in an ordinary way!', 'my lawyers are already airborne!', 'I demand a softer landing zone!', 'witness the most expensive mistake!', 'the abyss shall remember my name!', 'I am the official champion of falling!', 'someone put this in the history books!', 'I am declaring the lava my rival!', 'this is a scandal of legendary proportions!', 'I require a red carpet down there!', 'the audience owes me a standing ovation!', 'I am breaking at least seven rules!', 'this is a hostile work environment!', 'tell the moon I am on my way!', 'I demand a dramatic slow-motion replay!', 'I am too iconic for this ending!', 'the volcano is stealing my spotlight!', 'I will conquer the next puddle!', 'what a disgracefully good stunt!', 'this landing will change everything!', 'I expect premium afterlife seating!', 'someone alert the bard guild!', 'I am making a formal complaint to fire!', 'this is a historic amount of audacity!', 'I refuse to be a background monster!', 'my entrance budget was enormous!', 'I am the duke of this disaster!', 'the sky has made a powerful enemy!', 'give my stunt double a raise!', 'I am taking this up with destiny!', 'what a scandalously fabulous splash!'],
  crazy: ['the stars are doing cartwheels in my helmet!', 'I can hear the lava thinking!', 'my shadow just yelled “plot twist!”', 'the wind has turned into a trumpet!', 'I am falling through seventeen Tuesdays!', 'the rocks are wearing tiny hats!', 'my elbows have achieved enlightenment!', 'the moon is made of spicy soup!', 'I can taste the color purple!', 'there are bees in the soundtrack!', 'my knees are speaking ancient runes!', 'the abyss is humming my theme song!', 'I have become a very hot idea!', 'the fire is spelling my name backward!', 'I am a comet full of sandwiches!', 'gravity has grown extra arms!', 'I see a parade of dancing doors!', 'my helmet is full of tiny planets!', 'the lava just winked at me!', 'I am falling in alphabetical order!', 'my socks have started a guild!', 'the sky is made of toasted cheese!', 'I can hear colors falling upward!', 'my bones are playing jazz solos!', 'the volcano has a very nice smile!', 'I am currently shaped like a trumpet!', 'the rocks have formed a committee!', 'my cape is writing a cookbook!', 'I see twelve thousand tiny spoons!', 'the floor is singing opera!', 'I just remembered tomorrow twice!', 'my eyebrows have become weather!', 'the wind has stolen next Thursday!', 'I am a sandwich with excellent posture!', 'my shadow is doing the dishes!', 'the stars are rolling downhill!', 'I can see the back of my thoughts!', 'the lava smells like a trumpet solo!', 'my helmet is full of polite thunder!', 'I have misplaced the color orange!', 'the moon is applauding with noodles!', 'my knees are plotting a musical!', 'the abyss brought a tiny umbrella!', 'I am falling in surround sound!', 'every pebble knows my middle name!', 'the flames are telling knock-knock jokes!', 'my elbows have unionized!', 'I think the floor is upside down!', 'a very small dragon stole my map!', 'I have become an enthusiastic question mark!']
};

const LOGOS = [
  { src: 'assets/ui/credits-blastorama.webp', alt: 'Blastorama Gaming Presents' },
  { src: 'assets/ui/credits-jamie.webp', alt: 'Jamie Herrington' },
  { src: 'assets/ui/logo.webp', alt: 'Velscour' },
];
const FADE_IN = 0.9, HOLD = 6, FADE_OUT = 0.9, LOGO_PHASE = FADE_IN + HOLD + FADE_OUT;
// Sixty named spectacle cards cycle without repeats. Fifteen drawing grammars each have four palettes,
// scales, and motion variants; together they produce a long run of visibly different eruptions.
const EVENT_NAMES = [
  'TIDAL VENT', 'BRIMSTONE ZIPPER', 'BLUE CORONA WHIP', 'SPIRAL GEYSER', 'SIX-POINT RUPTURE',
  'MAGMA RAIN', 'SKULL COMET', 'EMBER FAN', 'MOLTEN CROWN', 'FIRE TORNADO',
  'SHELLBURST', 'RED LIGHTNING', 'BLUE LIGHTNING', 'LAVA MONSOON', 'INFERNAL FOUNTAIN',
  'SHOCK RING', 'ERUPTION COLUMN', 'FURNACE BLAST', 'DEMON METEOR', 'ASH CYCLONE',
  'CHAIN REACTION', 'TWIN GEYSER', 'SLAG AVALANCHE', 'CINDER HALO', 'OBSIDIAN SHARDS',
  'FURNACE MOUTH', 'DRAGON WAKE', 'MAGMA FLOWER', 'DOUBLE FLARE', 'SPLASH CROWN',
  'HEARTBEAT FISSURE', 'FLARE WHIP', 'PLASMA FORK', 'RIFT BLOOM', 'FIREBALL SALVO',
  'SOOT GEYSER', 'MOLTEN RAINBOW', 'COMET STORM', 'ACID PLUME', 'VOLCANO SNEEZE',
  'SHARD FAN', 'EMBER AURORA', 'RED THUNDER', 'BLUE THUNDER', 'HEAT MIRAGE',
  'LAVA LEAPER', 'SKELETON RAIN', 'WINGED INFERNO', 'BASALT BURST', 'ASH TORNADO',
  'COMET VOLLEY', 'INFERNAL WAVE', 'MAGMA CHANDELIER', 'STARFALL', 'UNDERWORLD FIREWORKS',
  'HOT ROCK RICOCHET', 'FLAME SERPENT', 'LAVA TSUNAMI', 'SCREAMING FISSURE', 'FINAL CATASTROPHE'
];
const EVENT_HUES = [12, 26, 202, 18, 48, 8, 2, 35, 20, 14, 192, 4, 207, 24, 32];
const EVENT_SPECS = EVENT_NAMES.map((name, i) => ({ name, kind: i % 15, hue: EVENT_HUES[i % 15], variant: (i / 15) | 0 }));
const pick = (a) => a[(Math.random() * a.length) | 0];
const phrase = (mood) => `${pick(OPENERS)} ${pick(TAILS[mood])}`; // 60 openers × 50 lines per mood = 3,000+ lines in every deck.
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hsl = (h, s = 100, l = 60, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

export function creditsScreen(back) {
  const s = el('div', 'screen credits-screen');
  s.innerHTML = `<canvas class="credits-canvas" aria-hidden="true"></canvas><div class="credits-title"><img class="credits-logo" alt=""><canvas class="credits-logo-fire" aria-hidden="true"></canvas></div><div class="credits-event" aria-live="polite"></div><div class="credits-speech" aria-live="polite"></div><button class="btn credits-back">Return to Velscour</button>`;
  const cv = s.querySelector('.credits-canvas'), ctx = cv.getContext('2d', { alpha: false });
  const fireCv = s.querySelector('.credits-logo-fire'), fireCtx = fireCv.getContext('2d');
  const logoEl = s.querySelector('.credits-logo'), speech = s.querySelector('.credits-speech'), eventLabel = s.querySelector('.credits-event');
  const logos = LOGOS.map(({ src }) => { const im = new Image(); im.src = src; return im; });
  const logoGeo = new WeakMap();
  const mobile = matchMedia('(pointer: coarse)').matches;
  const maxParticles = mobile ? 720 : 1750, maxLogoParticles = mobile ? 220 : 520, maxMonsters = mobile ? 5 : 12, maxEvents = mobile ? 15 : 34;
  const particles = [], logoParticles = [], flares = [], monsters = [], spectacles = [];
  const ids = Object.keys(ART_BY_ID);
  let W = 0, H = 0, DPR = 1, bg = null, lavaTile = null, lavaPattern = null, raf = 0, last = performance.now(), elapsed = 0;
  let flareIn = 1, fallIn = 0.8, eventIn = 0.7, wind = 0, speechTimer = 0, eventTimer = 0, eventFlash = 0, quality = mobile ? 0.66 : 1, slowFrames = 0, stopped = false;
  let logoIndex = -1, logoAlpha = -1, ambientCarry = 0, logoCarry = 0, eventDeck = [];
  const onReturn = () => { stop(); back(); };
  s.querySelector('.credits-back').onclick = onReturn;
  document.querySelector('#screens').replaceChildren(s);
  const recycle = (arr) => { for (const p of arr) p.dead = true; arr.length = 0; };

  function makeLavaTile() {
    const tile = document.createElement('canvas'); tile.width = 256; tile.height = 128;
    const tctx = tile.getContext('2d'), image = tctx.createImageData(tile.width, tile.height), d = image.data;
    for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
      const u = x / tile.width * Math.PI * 2, v = y / tile.height * Math.PI * 2;
      const broad = Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * .28 + Math.cos(v * 3 - u * 2) * .22;
      const grain = Math.sin(u * 13 + Math.cos(v * 9)) * .1 + Math.cos(v * 17 + Math.sin(u * 11)) * .08;
      const seam = Math.max(0, Math.sin(u * 5 + Math.sin(v * 4) * 2 + v * 3));
      const crack = Math.pow(seam, 22), heat = clamp01(.25 + broad + grain + crack * .82);
      const i = (y * tile.width + x) * 4;
      d[i] = Math.min(255, 20 + heat * 235); d[i + 1] = Math.min(220, 5 + heat * heat * 148 + crack * 58);
      d[i + 2] = Math.min(92, 2 + heat * heat * 26); d[i + 3] = 255;
    }
    tctx.putImageData(image, 0, 0);
    // A few opaque basalt islands make the molten seams read as a material, not a flat gradient.
    tctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * tile.width, y = Math.random() * tile.height, r = rand(2, 10);
      tctx.fillStyle = `rgba(18,${4 + Math.random() * 12 | 0},${3 + Math.random() * 8 | 0},${rand(.2,.66)})`;
      tctx.beginPath(); tctx.ellipse(x, y, r * 1.5, r * .7, Math.random() * 2, 0, Math.PI * 2); tctx.fill();
    }
    return tile;
  }

  function resize() {
    const r = s.getBoundingClientRect(); DPR = Math.min(mobile ? 1 : 1.35, devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    const cw = Math.max(1, Math.round(W * DPR)), ch = Math.max(1, Math.round(H * DPR));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    if (fireCv.width !== cw || fireCv.height !== ch) { fireCv.width = cw; fireCv.height = ch; }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); fireCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#020308'); bg.addColorStop(.34, '#100707'); bg.addColorStop(.62, '#2b0903'); bg.addColorStop(.8, '#6e1605'); bg.addColorStop(1, '#f34108');
    if (!lavaTile) lavaTile = makeLavaTile();
    lavaPattern = ctx.createPattern(lavaTile, 'repeat');
  }

  function getGeo(img) {
    let geo = logoGeo.get(img); if (geo || !img.complete || !img.naturalWidth) return geo;
    try {
      const c = document.createElement('canvas'); c.width = 192; c.height = 96;
      const x = c.getContext('2d', { willReadFrequently: true });
      const sc = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc, ox = (c.width - w) / 2, oy = (c.height - h) / 2;
      x.drawImage(img, ox, oy, w, h); const pix = x.getImageData(0, 0, c.width, c.height).data;
      const top = [], hot = [];
      for (let xx = 0; xx < c.width; xx += 2) {
        for (let yy = 0; yy < c.height; yy++) { const k = (yy * c.width + xx) * 4; if (pix[k + 3] > 80) { top.push([xx / c.width, yy / c.height]); break; } }
      }
      for (let n = 0; n < 1200 && hot.length < 180; n++) {
        const xx = (Math.random() * c.width) | 0, yy = (Math.random() * c.height) | 0, k = (yy * c.width + xx) * 4;
        if (pix[k + 3] > 180 && pix[k] > 165 && pix[k + 1] > 32 && pix[k + 1] < 180) hot.push([xx / c.width, yy / c.height]);
      }
      geo = { top: top.length ? top : [[.5, .2]], hot: hot.length ? hot : top };
      logoGeo.set(img, geo); return geo;
    } catch (_) { return null; }
  }

  function logoState() {
    const n = LOGO_PHASE * LOGOS.length, cycle = elapsed % n, i = Math.floor(elapsed / LOGO_PHASE) % LOGOS.length, t = cycle % LOGO_PHASE;
    const alpha = Math.max(0, Math.min(1, t / FADE_IN, (LOGO_PHASE - t) / FADE_OUT));
    return { i, alpha, hold: t >= FADE_IN && t <= FADE_IN + HOLD };
  }

  function particle(x, y, vx, vy, life, kind = 0, hue = 22, size = 3) {
    if (particles.length >= maxParticles) return;
    particles.push({ x, y, vx, vy, life, t: 0, kind, hue, size, spin: rand(-5, 5) });
  }
  function logoParticle(x, y, vx, vy, life, kind = 0, hue = 22, size = 3) {
    if (logoParticles.length >= maxLogoParticles) return;
    logoParticles.push({ x, y, vx, vy, life, t: 0, kind, hue, size });
  }
  function burst(x, y, n, hue = 24, speed = 180, kinds = 0) {
    const count = Math.min(Math.floor(n * quality), maxParticles - particles.length);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = rand(speed * .16, speed);
      particle(x, y, Math.cos(a) * v, Math.sin(a) * v - rand(16, 85), rand(.5, 1.7), i % 11 === 0 ? 2 : kinds, hue + rand(-15, 25), rand(1.5, 6));
    }
  }
  function logoBounds(img) {
    if (!img?.naturalWidth) return null;
    const box = s.querySelector('.credits-title').getBoundingClientRect(), k = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    return { x: box.left + (box.width - w) / 2, y: box.top + (box.height - h) / 2, w, h };
  }
  function refillEventDeck() {
    eventDeck = EVENT_SPECS.map((_, i) => i);
    for (let i = eventDeck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [eventDeck[i], eventDeck[j]] = [eventDeck[j], eventDeck[i]]; }
  }
  function launchSpectacle(floor) {
    if (!eventDeck.length) refillEventDeck();
    const spec = EVENT_SPECS[eventDeck.pop()];
    const e = { ...spec, x: rand(W * .12, W * .88), y: rand(floor - H * .08, floor), t: 0, life: rand(1.1, 2), size: rand(.72, 1.35) * (1 + spec.variant * .12), lean: rand(-1, 1), seed: rand(0, 12) };
    if (spectacles.length >= maxEvents) spectacles.shift(); spectacles.push(e);
    eventLabel.textContent = spec.name; eventLabel.style.color = hsl(spec.hue, 100, 72); eventTimer = 1.25;
    wind = Math.max(wind, rand(.65, 1.7)); eventFlash = Math.max(eventFlash, rand(.13, .34));
    const pop = spec.kind === 10 || spec.kind === 11 ? 86 : 48;
    burst(e.x, e.y, mobile ? pop * .48 : pop, spec.hue, rand(130, 290), spec.hue > 175 ? 1 : 0);
    if (Math.random() < .18) addMonster();
  }

  function drawLava(floor) {
    const rim = new Path2D(); rim.moveTo(0, floor + Math.sin(elapsed * 1.2) * 7);
    for (let x = 0; x <= W + 30; x += 30) rim.lineTo(x, floor + Math.sin(x * .018 + elapsed * 1.2) * 7 + Math.sin(x * .043 - elapsed) * 3);
    rim.lineTo(W, H); rim.lineTo(0, H); rim.closePath();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Fine smoky curtains move on slow sine bands; no per-pixel work runs in the frame loop.
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const x = ((Math.sin(elapsed * (.14 + i * .04) + i * 4) * .5 + .5) * W), y = H * (.28 + i * .07);
      const haze = ctx.createRadialGradient(x, y, 2, x, y, W * .45);
      haze.addColorStop(0, `rgba(${i % 2 ? '68,20,12' : '34,28,72'},.13)`); haze.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = haze; ctx.fillRect(x - W * .45, y - W * .35, W * .9, W * .7);
    }
    ctx.restore();
    ctx.save(); ctx.clip(rim); ctx.fillStyle = 'rgba(46,7,2,.94)'; ctx.fillRect(0, floor, W, H - floor);
    const hot = ctx.createLinearGradient(0, floor, 0, H); hot.addColorStop(0, '#ff4e08'); hot.addColorStop(.18, '#b82505'); hot.addColorStop(.58, '#541105'); hot.addColorStop(1, '#180908');
    ctx.fillStyle = hot; ctx.fillRect(0, floor, W, H - floor);
    if (lavaPattern) {
      const off = (elapsed * 26) % 256; ctx.save(); ctx.globalAlpha = .76; ctx.translate(-off, Math.sin(elapsed * .7) * 3); ctx.fillStyle = lavaPattern; ctx.fillRect(-256, floor, W + 512, H - floor + 8); ctx.restore();
      ctx.save(); ctx.globalAlpha = .22; ctx.globalCompositeOperation = 'screen'; ctx.translate((elapsed * 13) % 256, Math.cos(elapsed * .55) * 5); ctx.fillStyle = lavaPattern; ctx.fillRect(-256, floor, W + 512, H - floor + 8); ctx.restore();
    }
    ctx.restore();
    // Bright rim, mirrored highlights, and a large underlighting bloom.
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 5; ctx.strokeStyle = '#ff7d19'; ctx.beginPath(); ctx.moveTo(0, floor);
    for (let x = 0; x <= W + 24; x += 24) ctx.lineTo(x, floor + Math.sin(x * .018 + elapsed * 1.2) * 7);
    ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff0a0'; ctx.stroke();
    const glow = ctx.createRadialGradient(W * (.5 + Math.sin(elapsed * .27) * .13), floor + 8, 8, W * .5, floor + 10, W * .82);
    glow.addColorStop(0, 'rgba(255,109,18,.38)'); glow.addColorStop(.4, 'rgba(255,50,8,.13)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0, floor - H * .25, W, H * 1.2);
    ctx.restore();
  }

  function drawFlare(f, floor, dt) {
    f.t += dt; const q = f.t / f.life; if (q >= 1) return false;
    const bend = Math.sin(q * Math.PI) * f.height, sway = Math.sin(q * Math.PI * 1.5 + elapsed * 1.8) * f.width;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(q * Math.PI) * .88;
    for (let j = 0; j < 7; j++) {
      ctx.beginPath(); ctx.moveTo(f.x - f.width * .4 + j * 3, floor);
      ctx.bezierCurveTo(f.x - f.width * .3 + sway * .2, floor - bend * .75, f.x + sway + j * 3, floor - bend * 1.22, f.x + f.width * .44, floor - 4);
      ctx.strokeStyle = ['#ff5b08','#ff9e20','#ffe16a','#fff8d0','#99dfff','#4eaaff','#c8f7ff'][j]; ctx.lineWidth = [13,9,6,2,2,4,1][j]; ctx.stroke();
    }
    ctx.restore();
    if (Math.random() < dt * (mobile ? 14 : 25)) burst(f.x + sway * .3, floor - bend * .7, mobile ? 2 : 5, 194, 110, 1);
    return true;
  }

  function drawSpectacle(e, floor) {
    const q = e.t / e.life, fade = Math.sin(Math.PI * q), sz = e.size, w = W * (.08 + .07 * sz), h = H * (.12 + .2 * sz);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, fade) * .9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = hsl(e.hue, 100, 62); ctx.fillStyle = hsl(e.hue, 100, 60, .34); ctx.lineWidth = Math.max(2, 3 * sz);
    switch (e.kind) {
      case 0: case 10: case 12: { const n = e.kind === 10 ? 4 : e.kind === 12 ? 3 : 2; for (let i = 0; i < n; i++) { const r = (q * (w + i * 18)) % (w + 30); ctx.globalAlpha *= .87; ctx.beginPath(); ctx.ellipse(e.x, floor - 3, r, r * .35, e.lean * .15, 0, Math.PI * 2); ctx.stroke(); } break; }
      case 1: case 11: { const forks = e.kind === 11 ? 5 : 3; for (let k = 0; k < forks; k++) { let x = e.x + (k - forks / 2) * 8, y = floor - 2; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 8; j++) { x += rand(-w * .22, w * .22); y -= h / 8; ctx.lineTo(x, y); } ctx.stroke(); } break; }
      case 2: case 14: { const columns = e.kind === 14 ? 5 : 3; for (let k = 0; k < columns; k++) { const bx = e.x + (k - columns / 2) * w * .27, sway = Math.sin(q * 8 + e.seed + k) * w * .22; ctx.beginPath(); ctx.moveTo(bx, floor); ctx.bezierCurveTo(bx + sway, floor - h * .45, bx - sway, floor - h * .78, bx + sway * .2, floor - h * (1 - q * .15)); ctx.lineWidth = 5 + (k % 3) * 4; ctx.stroke(); } break; }
      case 3: case 9: { const count = e.kind === 9 ? 9 : 4; for (let k = 0; k < count; k++) { const x = (e.x + k * W / count + elapsed * (40 + k * 5)) % (W + 40); ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x - w * .18, H * .55); ctx.lineTo(x - w * .42, floor); ctx.stroke(); } break; }
      case 4: case 13: { for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let j = 0; j <= 26; j++) { const a = j * .34 + elapsed * 3 + k * 1.2, r = j / 26 * w * .55; const x = e.x + Math.cos(a) * r, y = floor - 8 - j / 26 * h; if (!j) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke(); } break; }
      case 5: case 7: { const arms = e.kind === 7 ? 14 : 10; for (let k = 0; k < arms; k++) { const a = (k / arms) * Math.PI * 2 + elapsed * (e.kind === 7 ? 1.4 : .3), r = (q * .6 + .4) * w; ctx.beginPath(); ctx.moveTo(e.x, floor - 6); ctx.quadraticCurveTo(e.x + Math.cos(a) * r * .45, floor - h * .5, e.x + Math.cos(a) * r, floor - h * (1 + Math.sin(a) * .25)); ctx.stroke(); } break; }
      case 6: case 8: { for (let k = 0; k < 7; k++) { const a = k * Math.PI * 2 / 7 + elapsed * 1.8, r = w * (.25 + q * .65); ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r, floor - h * .45 + Math.sin(a) * h * .25); ctx.lineTo(e.x + Math.cos(a + .16) * r * .75, floor - h * .1); ctx.lineTo(e.x + Math.cos(a - .1) * r * 1.2, floor - h * .8); ctx.closePath(); ctx.stroke(); } break; }
      default: { ctx.beginPath(); for (let x = -w; x <= w; x += 8) { const y = floor - Math.sin((x / w * 2 + q * 3) * Math.PI) * h * .45 - h * .2; if (x === -w) ctx.moveTo(e.x + x,y); else ctx.lineTo(e.x + x,y); } ctx.stroke(); }
    }
    ctx.restore();
  }

  function makeGibs(m) {
    const img = m.art, n = mobile ? 4 : 9, w = img?.width || 24, h = img?.height || 32; m.gibs = [];
    for (let i = 0; i < n; i++) {
      const sw = Math.max(3, rand(w * .12, w * .38)), sh = Math.max(3, rand(h * .12, h * .32));
      m.gibs.push({ img, sx: rand(0, Math.max(0, w - sw)), sy: rand(0, Math.max(0, h - sh)), sw, sh, x: m.x, y: m.y - rand(2, 28), vx: rand(-150, 150), vy: -rand(70, 230), rot: rand(0, 6), vr: rand(-9, 9), life: rand(.65, 1.25), age: 0, size: rand(7, 19) });
    }
  }

  function addMonster() {
    if (monsters.length >= maxMonsters) return;
    const mood = pick(['happy', 'scared', 'silly', 'begging', 'sad', 'outrageous', 'crazy']);
    monsters.push({ x: rand(W * .1, W * .9), y: -72, vx: rand(-35,35), vy: rand(130,190), age: 0, scale: rand(.55,1.05), art: null,
      id: pick(ids), mood, line: phrase(mood), state: 'fall', landY: rand(H * .72,H * .79), logoHit: false, floatFor: rand(1.1,2), burning: false });
  }

  function speak(line, seconds = 2.3) { speech.textContent = line; speechTimer = seconds; }

  function drawLogoFlames(dt) {
    fireCtx.clearRect(0, 0, W, H);
    const live = logoState(), img = logos[live.i], geo = getGeo(img), box = logoBounds(img);
    const a = Math.round(live.alpha * 100) / 100;
    if (logoIndex !== live.i || logoAlpha !== a) {
      logoEl.src = LOGOS[live.i].src; logoEl.alt = LOGOS[live.i].alt;
      logoEl.style.opacity = a.toFixed(2);
      logoEl.style.filter = `drop-shadow(0 0 ${Math.round(18 + a * 38)}px rgba(255,74,8,${(.4 + a * .48).toFixed(2)})) drop-shadow(0 0 ${Math.round(a * 18)}px rgba(255,201,83,${(a * .8).toFixed(2)}))`;
      logoEl.style.transform = `scale(${(0.975 + a * .025).toFixed(3)})`;
      logoIndex = live.i; logoAlpha = a;
    }
    if (geo && box && live.alpha > .03) {
      logoCarry += dt * (mobile ? 220 : 510) * quality * live.alpha;
      while (logoCarry >= 1) {
        logoCarry--;
        const p = Math.random() < .76 ? pick(geo.top) : pick(geo.hot), x = box.x + p[0] * box.w, y = box.y + p[1] * box.h;
        logoParticle(x + rand(-4,4), y + rand(-2,5), rand(-42,42) + (wind ? rand(8,30) : 0), -rand(38,Math.random() < .18 ? 230 : 135), rand(.35,1.05), Math.random() < .12 ? 1 : 0, rand(8,48), rand(2,6));
      }
    }
    let liveCount = 0;
    fireCtx.globalCompositeOperation = 'lighter';
    for (let i = 0, n = logoParticles.length; i < n; i++) {
      const p = logoParticles[i]; p.t += dt;
      if (p.t >= p.life || p.y < -30 || p.x < -40 || p.x > W + 40) continue;
      p.vx += (wind > .1 ? 30 : 0) * dt; p.vy += (p.kind === 2 ? -5 : -12) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.t / p.life, r = Math.max(.5, p.size * k), c = p.kind === 2 ? '#6e6c77' : p.hue > 180 ? '#83d7ff' : p.t / p.life < .28 ? '#fff3bb' : `hsl(${p.hue},100%,${48 + k * 24}%)`;
      fireCtx.globalAlpha = p.kind === 2 ? k * .25 : k * .92; fireCtx.fillStyle = c;
      if (p.kind === 1) { fireCtx.lineWidth = Math.max(1, r * .45); fireCtx.beginPath(); fireCtx.moveTo(p.x, p.y); fireCtx.lineTo(p.x - p.vx * .045, p.y - p.vy * .045); fireCtx.strokeStyle = c; fireCtx.stroke(); }
      else { fireCtx.beginPath(); fireCtx.ellipse(p.x, p.y, r * (p.kind === 2 ? 1.7 : .65), r * (p.kind === 2 ? .9 : 1.8), p.vx * .01, 0, Math.PI * 2); fireCtx.fill(); }
      logoParticles[liveCount++] = p;
    }
    logoParticles.length = liveCount; fireCtx.globalAlpha = 1; fireCtx.globalCompositeOperation = 'source-over';
  }

  function draw(now) {
    if (stopped || !s.isConnected) return;
    raf = requestAnimationFrame(draw);
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(.04, raw); last = now; elapsed += dt;
    slowFrames = raw > .026 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 22) { quality = Math.max(mobile ? .32 : .48, quality * .82); slowFrames = 0; }
    else if (slowFrames === 0 && quality < (mobile ? .66 : 1)) quality = Math.min(mobile ? .66 : 1, quality + .0015);
    const floor = H * .76;
    flareIn -= dt; fallIn -= dt; eventIn -= dt; wind = Math.max(0, wind - dt * .55); eventFlash = Math.max(0, eventFlash - dt * 1.5);
    if (fallIn <= 0) { addMonster(); fallIn = rand(mobile ? 1.8 : 1.2, mobile ? 3.4 : 2.6); }
    if (flareIn <= 0) { flares.push({ x: rand(W * .05, W * .95), t: 0, life: rand(.9,1.55), height: rand(.2,.5) * H, width: rand(85,190) }); flareIn = rand(mobile ? 2.2 : 1.45, mobile ? 4.1 : 2.9); wind = Math.max(wind, .9); }
    if (eventIn <= 0) { launchSpectacle(floor); eventIn = rand(mobile ? 1.1 : .72, mobile ? 2.1 : 1.35); }
    drawLava(floor);

    // Dozens of wind-whipped flame veils make the horizon busy while the low-resolution tile keeps the lava cheap.
    const layers = Math.max(2, Math.round((mobile ? 5 : 9) * quality));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < layers; i++) {
      const x = ((elapsed * (25 + i * 7) + i * W / layers) % (W + 120)) - 60, y = floor - H * (.12 + (i % 4) * .1) + Math.sin(elapsed * 2 + i) * 9;
      ctx.globalAlpha = .14 + (i % 3) * .025; ctx.fillStyle = i % 4 === 0 ? '#89dcff' : i % 3 === 0 ? '#ffcf49' : '#f43a0a';
      ctx.beginPath(); ctx.ellipse(x, y, W * (.09 + (i % 3) * .035), H * (.035 + (i % 4) * .012), Math.sin(elapsed + i) * .3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    const ls = logoState();

    for (let i = flares.length - 1; i >= 0; i--) if (!drawFlare(flares[i], floor, dt)) flares.splice(i, 1);
    for (let i = spectacles.length - 1; i >= 0; i--) { const e = spectacles[i]; e.t += dt; if (e.t >= e.life) spectacles.splice(i, 1); else drawSpectacle(e, floor); }

    for (let i = monsters.length - 1; i >= 0; i--) {
      const m = monsters[i]; m.age += dt; if (!m.art) m.art = enemyImage(m.id) || null;
      if (m.state === 'fall') {
        m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 170 * dt;
        const lb = logoBounds(logos[ls.i]);
        if (!m.logoHit && ls.alpha > .82 && lb && m.x > lb.x + lb.w * .25 && m.x < lb.x + lb.w * .75 && m.y > lb.y - 18 && m.y < lb.y + lb.h * .42) {
          m.logoHit = true; m.landY = lb.y + lb.h * .43; m.state = 'float'; m.age = 0; m.floatFor = 1.25; m.mood = 'happy'; makeGibs(m); speak(phrase('happy'), 2.3); burst(m.x, m.landY, mobile ? 32 : 70, 40, 210); eventFlash = .28;
        } else if (m.y >= floor - 13) {
          m.y = floor - 13; m.state = 'float'; m.age = 0; m.floatFor = rand(1.2, 2.05); m.burning = true; makeGibs(m); m.mood = 'scared'; speak(phrase('scared'), 2.4); burst(m.x, floor - 4, mobile ? 46 : 100, 23, 260); eventFlash = .42;
        }
      } else if (m.state === 'float') {
        if (m.logoHit) {
          m.y = m.landY;
          if (logoState().alpha < .38) { m.mood = pick(['scared','sad','crazy']); speak(phrase(m.mood), 2.2); m.logoHit = false; m.state = 'fall'; m.vy = 55; m.age = 0; }
        } else {
          m.y = floor - 11 + Math.sin(m.age * 4) * 4; m.x += (wind ? 16 : 3) * dt;
          if (!m.burning && m.age > .52) { m.burning = true; speak(phrase(pick(['scared','silly','begging','sad','outrageous','crazy'])), 2.1); }
          if (m.burning && Math.random() < dt * (mobile ? 24 : 38)) particle(m.x + rand(-15,15), m.y - rand(5,39), rand(-36,36), -rand(45,210), rand(.35,1.05), Math.random() < .15 ? 1 : 0, rand(8,48), rand(2,6));
          if (m.age > m.floatFor) { m.state = 'sink'; m.age = 0; }
        }
      } else {
        m.y += 58 * dt;
        m.burning = true;
        if (Math.random() < dt * (mobile ? 20 : 32)) particle(m.x + rand(-12,12), m.y - rand(0,34), rand(-32,32), -rand(55,220), rand(.38,1), Math.random() < .2 ? 1 : 0, rand(4,45), rand(2,6));
        if (m.age > 1.05) { burst(m.x, floor, mobile ? 24 : 55, 16, 220); monsters.splice(i, 1); continue; }
      }
      // The molten surface catches sprite shards, gives them a short viscous float, then swallows them.
      if (m.gibs) for (const g of m.gibs) {
        g.age += dt; if (g.age > g.life) continue; g.vy += 230 * dt; g.x += (g.vx + (wind ? 24 : 0)) * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
        if (g.y > floor - 12) { g.y = floor - 12; g.vy *= -.24; g.vx *= .62; }
        if (g.img) { ctx.save(); ctx.translate(g.x,g.y); ctx.rotate(g.rot); ctx.globalAlpha = 1 - g.age / g.life; ctx.drawImage(g.img,g.sx,g.sy,g.sw,g.sh,-g.size/2,-g.size/2,g.size,g.size); ctx.restore(); }
        else { ctx.fillStyle = '#9c3520'; ctx.fillRect(g.x,g.y,g.size,g.size); }
      }
      ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(Math.sin(m.age * 8) * .17); const sc = 50 * m.scale;
      if (m.state === 'float' && !m.logoHit) { ctx.globalAlpha = .7; ctx.fillStyle = '#ff6a13'; ctx.beginPath(); ctx.ellipse(0,4,sc*.55,sc*.16,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
      if (m.burning) {
        const sink = m.state === 'sink' ? clamp01(m.age / 1.05) : 0;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = m.state === 'sink' ? .12 + (1 - sink) * .2 : .24;
        ctx.fillStyle = hsl(12 + sink * 8, 100, 48 - sink * 30, .65); ctx.beginPath(); ctx.ellipse(0,-sc*.48,sc*.4,sc*.52,0,0,Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.filter = `sepia(1) saturate(${1.8 + sink * 3}) hue-rotate(${-18 + sink * 8}deg) brightness(${1 - sink * .82})`;
      }
      if (m.art) ctx.drawImage(m.art,-sc*.45,-sc,sc*.9,sc);
      else { ctx.fillStyle='#32110b'; ctx.beginPath(); ctx.ellipse(0,-sc*.47,sc*.28,sc*.46,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(-sc*.32,-sc*.26,sc*.64,sc*.56); ctx.fillStyle='#ffd04b'; ctx.fillRect(-sc*.15,-sc*.58,4,3); ctx.fillRect(sc*.08,-sc*.58,4,3); }
      ctx.filter = 'none';
      if (m.burning) { ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.75; ctx.fillStyle='#ff6712'; ctx.beginPath(); ctx.ellipse(0,-sc*.7,sc*.22,sc*.4,0,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }

    ambientCarry += dt * (mobile ? 120 : 310) * quality;
    while (ambientCarry >= 1) { ambientCarry--; particle(rand(0,W),floor + rand(-6,16),rand(-24,24) + wind * 35,-rand(60,210),rand(.45,1.5),Math.random()<.08?2:0,rand(8,48),rand(1.5,6)); }
    let live = 0; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.t += dt; if (p.t >= p.life) continue; const k=1-p.t/p.life; p.vy += 64*dt; p.vx += wind*22*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      const r=Math.max(.6,p.size*k); ctx.globalAlpha=p.kind===2?k*.2:k*.7; ctx.fillStyle=p.kind===2?'#87818c':p.hue>180?'#8fdbff':p.t/p.life<.25?'#fff1b8':hsl(p.hue,100,54+k*20);
      if (p.kind===1) { ctx.lineWidth=Math.max(1,r*.5);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.04,p.y-p.vy*.04);ctx.strokeStyle=ctx.fillStyle;ctx.stroke(); }
      else { ctx.beginPath();ctx.ellipse(p.x,p.y,r*(p.kind===2?1.8:.7),r*(p.kind===2?.8:1.5),p.vx*.01,0,Math.PI*2);ctx.fill(); }
      particles[live++]=p;
    }
    particles.length=live; ctx.restore();
    if (wind > .1) {
      ctx.save(); ctx.globalAlpha=Math.min(.35,wind*.18); ctx.strokeStyle='#fff0c4'; ctx.lineWidth=1;
      for(let i=0;i<7;i++){const y=H*(.25+i*.065)+Math.sin(elapsed*4+i)*14,x=((elapsed*(220+i*34)+i*145)%(W+160))-160;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+35,y-12,x+110,y+2);ctx.stroke();} ctx.restore();
    }
    if (eventFlash > .04) { ctx.save(); ctx.globalAlpha=eventFlash*.22; ctx.fillStyle='#ff9b28'; ctx.fillRect(0,0,W,H); ctx.restore(); }
    drawLogoFlames(dt);
    speechTimer=Math.max(0,speechTimer-dt); speech.style.opacity=speechTimer>0?String(Math.min(1,speechTimer)): '0';
    eventTimer=Math.max(0,eventTimer-dt); eventLabel.style.opacity=eventTimer>0?String(Math.min(1,eventTimer)): '0';
    if (speechTimer<=0) speech.textContent='';
  }

  const observer = new ResizeObserver(resize); observer.observe(s); resize();
  const onEsc = (e) => { if (e.key === 'Escape' && s.isConnected) onReturn(); };
  function stop() { if (stopped) return; stopped = true; cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('keydown', onEsc); recycle(particles); recycle(logoParticles); recycle(flares); recycle(monsters); recycle(spectacles); s.remove(); }
  window.addEventListener('keydown', onEsc);
  raf = requestAnimationFrame(draw);
  return stop;
}
