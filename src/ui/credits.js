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
  begging: ['please let me be a cautionary tale later!', 'I will return every coin!', 'I can be useful as a doorstop!', 'please reconsider my dramatic ending!', 'I will stop biting the hero!', 'I can guide you to treasure!', 'I promise to stop summoning things!', 'please accept this tiny apology!', 'I will clean the dungeon!', 'I know where the secret chest is!', 'I will even say nice things!', 'I can carry your bags!', 'please do not toast me!', 'I will give back the shiny key!', 'I can be a very quiet ghost!', 'I will never block the doorway!', 'I shall become a pacifist!', 'I will tell you a funny story!', 'please spare my eyebrows!', 'I can make excellent soup!', 'I will stop guarding the stairs!', 'I can teach you a spell!', 'I will be so very polite!', 'I promise to behave on Tuesdays!', 'please rescue my dignity!', 'I will write a glowing review!', 'I can be your emotional support monster!', 'I will return the borrowed axe!', 'I will stop making ominous noises!', 'I can open jars for you!', 'please remember I waved first!', 'I will become a friendly landmark!', 'I will share my snacks!', 'I can distract the other monsters!', 'I will stop haunting the basement!', 'please accept my surrender!', 'I can fetch a potion!', 'I will learn a respectable trade!', 'I will never jump again!', 'I can be a very small threat!', 'I will stop standing in the way!', 'I promise not to bite the furniture!', 'I will be nice to the next hero!', 'please put me on a cooler shelf!', 'I can tell you a secret!', 'I will become a humble bard!', 'I can hold the map!', 'I will stop saying boo!', 'please save my favorite horn!', 'I can pay you in pebbles!']
};
const pick = (a) => a[(Math.random() * a.length) | 0];
const phrase = (mood) => `${pick(OPENERS)} ${pick(TAILS[mood])}`;
const particleColor = (hue) => hue > 160 ? (hue > 205 ? '#63b5ff' : '#c7f0ff') : hue > 39 ? '#ffd24c' : hue > 24 ? '#ff9a20' : '#ff4a0c';

export function creditsScreen(back) {
  const s = el('div', 'screen credits-screen');
  s.innerHTML = `<canvas class="credits-canvas" aria-hidden="true"></canvas><div class="credits-title" aria-live="polite"><img class="credits-logo" alt=""></div><div class="credits-speech" aria-live="polite"></div><button class="btn credits-back">Return to Velscour</button>`;
  const cv = s.querySelector('canvas'), ctx = cv.getContext('2d', { alpha: false });
  const logos = ['assets/ui/credits-blastorama.webp', 'assets/ui/credits-jamie.webp'].map((src) => { const im = new Image(); im.src = src; return im; });
  const logoEl = s.querySelector('.credits-logo'), speech = s.querySelector('.credits-speech');
  s.querySelector('.credits-back').onclick = () => { stop(); back(); };
  document.querySelector('#screens').replaceChildren(s);
  let W = 0, H = 0, DPR = 1, bg = null, raf = 0, last = performance.now(), elapsed = 0, flareIn = 2, fallIn = 1.1, wind = 0, speechTimer = 0, logoCard = -1, logoAlpha = -1;
  const mobile = matchMedia('(pointer: coarse)').matches;
  const cap = mobile ? 180 : 480, particles = [], monsters = [], flares = [];
  const ids = Object.keys(ART_BY_ID);
  const phases = 4.3;
  let stopped = false;
  const resize = () => {
    const r = s.getBoundingClientRect(); DPR = Math.min(mobile ? 1 : 1.5, devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#030304'); bg.addColorStop(.48, '#100403'); bg.addColorStop(.75, '#300902'); bg.addColorStop(.9, '#8e1a03'); bg.addColorStop(1, '#ff5a08');
  };
  const burst = (x, y, n, hue = 28, speed = 150) => {
    const count = Math.min(n, cap - particles.length);
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, v = rand(speed * .25, speed), h = hue + rand(-12, 28); particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rand(10, 85), life: rand(.45, 1.5), t: 0, r: rand(1, 4), color: particleColor(h) }); }
  };
  const logoState = () => {
    const local = elapsed % (phases * 2), i = Math.floor(elapsed / phases) % 2;
    const t = local % phases;
    const a = Math.min(1, t / .85, (phases - t) / .9);
    return { i, alpha: Math.max(0, a), local };
  };
  const addMonster = () => {
    const x = rand(W * .12, W * .88), m = { x, y: -70, vx: rand(-26, 26), vy: rand(110, 170), age: 0, scale: rand(.55, 1.05), art: null, id: pick(ids), mood: pick(['happy', 'scared', 'silly', 'begging']), line: '', state: 'fall', landY: rand(H * .76, H * .88), logoHit: false, said: false };
    m.line = phrase(m.mood); monsters.push(m);
  };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(s); resize();
  function draw(now) {
    if (stopped || !s.isConnected) return;
    raf = requestAnimationFrame(draw);
    const dt = Math.min(.04, Math.max(0, (now - last) / 1000)); last = now; elapsed += dt;
    flareIn -= dt; fallIn -= dt;
    if (fallIn <= 0) { addMonster(); fallIn = rand(2.5, 5.4); }
    if (flareIn <= 0) { flares.push({ x: rand(W * .08, W * .92), life: 0, dur: rand(.8, 1.5), height: rand(.19, .4) * H, width: rand(80, 180) }); flareIn = rand(3.2, 6); wind = rand(.7, 1.3); }
    wind = Math.max(0, wind - dt);
    const floor = H * .84;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Slow, low lava channels give the screen motion without a full-screen pixel simulation.
    ctx.save(); ctx.globalAlpha = .45; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const yy = floor + i * (H - floor) / 8 + Math.sin(elapsed * .7 + i) * 5; ctx.strokeStyle = i % 2 ? '#fa4010' : '#ffb42b'; ctx.lineWidth = 2 + i % 3; ctx.beginPath(); ctx.moveTo(0, yy); for (let x = 0; x <= W; x += 45) ctx.lineTo(x, yy + Math.sin(x * .016 + elapsed + i) * (5 + i)); ctx.stroke(); }
    ctx.restore();
    if (wind > 0) { ctx.globalAlpha = .22 * wind; ctx.strokeStyle = '#ffd28a'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const y = H * (.34 + i * .09) + Math.sin(elapsed * 4 + i) * 12, x = ((elapsed * (190 + i * 22) + i * 160) % (W + 120)) - 120; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 9, x + 78, y + 2); ctx.stroke(); } ctx.globalAlpha = 1; }
    // Flame tongues and embers; fixed cap bounds both memory and fill cost on phones/tablets.
    const emissions = mobile ? 5 : 12;
    for (let i = 0; i < emissions && particles.length < cap; i++) particles.push({ x: rand(0, W), y: floor + rand(-5, 24), vx: rand(-18, 18) + (wind ? 24 : 0), vy: -rand(60, 190), life: rand(.4, 1.4), t: 0, r: rand(2, 7), color: particleColor(rand(8, 52)) });
    const ls = logoState(), logo = logos[ls.i];
    if (logo.complete && logo.naturalWidth) {
      const lw = Math.min(W * .72, logo.naturalWidth), lh = lw * logo.naturalHeight / logo.naturalWidth, lx = (W - lw) / 2, ly = Math.min(H * .41, H * .34) - lh / 2;
      const alphaStep = Math.round(ls.alpha * 100);
      if (logoCard !== ls.i || logoEl.dataset.src !== logo.src) { logoEl.src = logo.src; logoEl.dataset.src = logo.src; logoCard = ls.i; logoAlpha = -1; }
      if (logoAlpha !== alphaStep) {
        const a = alphaStep / 100;
        logoEl.style.opacity = a.toFixed(2);
        logoEl.style.filter = `drop-shadow(0 0 ${Math.round(26 * a)}px rgba(255,92,16,${(0.35 + a * .55).toFixed(2)}))`;
        logoEl.style.transform = `scale(${(0.98 + a * .02).toFixed(2)})`;
        logoAlpha = alphaStep;
      }
      if (ls.alpha > .75 && Math.random() < .004) { burst(rand(lx, lx + lw), ly + lh * .83, 16, 35, 110); }
    }
    // Plasma ribbons rise in broad magnetic arcs and curl back toward the lava line.
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i]; f.life += dt; const q = f.life / f.dur; if (q >= 1) { flares.splice(i, 1); continue; }
      const bend = Math.sin(q * Math.PI) * f.height, sway = Math.sin(q * Math.PI * 1.4 + elapsed) * f.width;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(q * Math.PI) * .84;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(f.x - f.width * .38 + j * 4, floor); ctx.bezierCurveTo(f.x - f.width * .3 + sway * .2, floor - bend * .9, f.x + sway + j * 3, floor - bend * 1.3, f.x + f.width * .42 + j * 2, floor - 5); ctx.strokeStyle = ['#ff6b13','#ffbf58','#b9eaff','#61aaff'][j]; ctx.lineWidth = j === 0 ? 12 : j === 1 ? 6 : 2; ctx.shadowColor = j < 2 ? '#ff5a08' : '#65bfff'; ctx.shadowBlur = j < 2 ? 24 : 16; ctx.stroke(); }
      ctx.restore();
      if (Math.random() < .35) burst(f.x + sway * .3, floor - bend * .75, mobile ? 2 : 5, 205, 100);
    }
    // Incoming enemies use the game's sprite atlas when available and a small silhouette fallback otherwise.
    for (let i = monsters.length - 1; i >= 0; i--) {
      const m = monsters[i]; m.age += dt;
      if (!m.art) m.art = enemyImage(m.id) || null;
      if (m.state === 'fall') {
        m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 120 * dt;
        const ls2 = logoState(), logo = logos[ls2.i], lw = logo.naturalWidth ? Math.min(W * .72, logo.naturalWidth) : 0, lh = logo.naturalWidth ? lw * logo.naturalHeight / logo.naturalWidth : 0, ly = Math.min(H * .41, H * .34) - lh / 2;
        if (!m.logoHit && ls2.alpha > .75 && m.x > W * .32 && m.x < W * .68 && m.y > ly - 16 && m.y < ly + lh * .45) { m.logoHit = true; m.landY = ly + lh * .43; m.mood = 'happy'; m.line = phrase('happy'); speechTimer = 2; speech.textContent = m.line; }
        if (m.y >= (m.logoHit ? m.landY : floor - 10)) { m.y = m.logoHit ? m.landY : floor - 10; m.state = 'float'; m.age = 0; burst(m.x, m.y, mobile ? 22 : 48, 28, 260); m.mood = 'scared'; m.line = phrase('scared'); speech.textContent = m.line; speechTimer = 2.4; }
      } else if (m.state === 'float') {
        if (m.logoHit) {
          // A lucky monster can perch on the credit mark until it fades, then
          // panic and drop into the lava beneath it.
          m.y = m.landY;
          if (logoState().alpha < .42) { m.mood = 'scared'; m.line = phrase('scared'); speech.textContent = m.line; speechTimer = 2; m.logoHit = false; m.state = 'fall'; m.vy = 38; m.age = 0; }
        } else {
          m.y = floor - 12 + Math.sin(m.age * 4) * 4; m.x += (wind ? 14 : 0) * dt;
          if (m.age > 1.35) { m.state = 'sink'; m.age = 0; }
        }
      } else {
        m.y += 48 * dt; if (Math.random() < .18) burst(m.x + rand(-9,9), m.y, mobile ? 1 : 3, 12, 80);
        if (m.age > 1.05) { burst(m.x, floor, mobile ? 12 : 30, 16, 190); monsters.splice(i, 1); continue; }
      }
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.sin(m.age * 8) * .16); const sc = 48 * m.scale;
      if (m.art) ctx.drawImage(m.art, -sc * .45, -sc, sc * .9, sc);
      else { ctx.fillStyle = '#29110c'; ctx.beginPath(); ctx.ellipse(0, -sc * .47, sc * .28, sc * .46, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-sc * .32, -sc * .26, sc * .64, sc * .56); ctx.fillStyle = '#ffad42'; ctx.fillRect(-sc * .15, -sc * .58, 4, 3); ctx.fillRect(sc * .08, -sc * .58, 4, 3); }
      ctx.restore();
      if ((m.state === 'float' || m.state === 'sink') && Math.random() < .018) { speech.textContent = phrase(m.mood); speechTimer = 2.2; }
      if (m.state === 'sink' && Math.random() < .42) burst(m.x + rand(-14, 14), m.y - rand(0, 36), mobile ? 1 : 2, 22, 90);
    }
    speechTimer = Math.max(0, speechTimer - dt); speech.style.opacity = speechTimer > 0 ? String(Math.min(1, speechTimer)) : '0';
    // One broad-hot base glow and a small number of cached particle quads keep overdraw under control.
    ctx.globalCompositeOperation = 'lighter';
    let liveParticles = 0;
    for (let i = 0, n = particles.length; i < n; i++) { const p = particles[i]; p.t += dt; if (p.t >= p.life) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 75 * dt; const a = 1 - p.t / p.life; ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = Math.min(12, p.r * 3); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill(); particles[liveParticles++] = p; }
    particles.length = liveParticles;
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    if (speechTimer <= 0) speech.textContent = '';
  }
  const onEsc = (e) => { if (e.key === 'Escape' && s.isConnected) { stop(); window.removeEventListener('keydown', onEsc); back(); } };
  function stop() { if (stopped) return; stopped = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); window.removeEventListener('keydown', onEsc); s.remove(); }
  window.addEventListener('keydown', onEsc);
  raf = requestAnimationFrame(draw);
  return stop;
}
