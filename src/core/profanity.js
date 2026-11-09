// Velscour Online - Profanity Filter & Name Sanitizer (Client ESM)
// Sourced from @coffeeandfun/google-profanity-words

const RAW_TERMS = ["capullos de rosa de chocolate","las chicas se volvieron locas","bolsillo caliente de alabama","rosy palm and her 5 sisters","acción doble penetración","mierdamierdahijo de puta","rubia sobre rubia acción","blonde on blonde action","chaqueta recta de cuero","leather straight jacket","masticador de alfombras","empacador de chocolate","empaquetador de dulces","follando con los dedos","follando con los puños","prince albert piercing","abrazaderas de trébol","conejito hijo de puta","mascador de alfombras","rosquilla de gelatina","violación en una cita","follando con el puño","follar con los dedos","restricción de cuero","traficante de gallos","traficante de pollas","cerradura de pájaro","dominación femenina","folla con los dedos","folla con los puños","folladores de dedos","folladores de puños","maestro murciélago*","missionary position","oleoducto de alaska","pistola con la mano","alabama hot pocket","cabeza de chorlito","chocolate rosebuds","chorros masculinos","cuchillo de castor","devorador de semen","double penetration","fetichismo de pies","follador de perros","follar con el puño","ladrón de traseros","mordedura de gallo","va te faire foutre","vapor de cleveland","batidor de pollas","botones de mierda","cebo de la cárcel","chorros femeninos","chupador de culos","cleveland steamer","doble penetración","follador de dedos","follador de puños","fumador de pollas","garganta profunda","leather restraint","maestro de gallos","mascador de culos","one cup two girls","two girls one cup","wrinkled starfish","agujero de tapón","alaskan pipeline","almohadas sucias","female squirting","follador de culo","hacerse una paja","haciendo el amor","labios de castor","llamada de botín","masticar trasero","metedura de pata","patear la pelota","racimo de mierda","2 chicas 1 taza","bolsa de basura","bolsa de pelota","brunette action","cabeza de gallo","dedo de camello","duchas marrones","ferme ta gueule","fiesta de limon","girls gone wild","grandes aldabas","masa para bebes","mordaza de bola","niña en la cima","one guy one jar","pelota lamiendo","ponche de burro","reverse cowgirl","a cuatro patas","beaver cleaver","blow your load","cara de chocho","carpet muncher","chica caliente","chupando bolas","círculo idiota","estilo perrito","grande y negro","lamiendo coños","male squirting","menage a trois","mound of venus","nariz de gallo","pechos grandes","pleasure chest","puta de la cam","rusty trombone","saco de pelota","salsa de bolas","son-of-a-bitch","sopla tu carga","tirado un pedo","trabajo manual","trasero-pirata","yellow showers","2 girls 1 cup","acción morena","blonde action","boca de tonel","bolsa de culo","bolsa de pene","brown showers","caliente carl","cara de gallo","clover clamps","como asesinar","dirty pillows","dirty sanchez","golden shower","grandes tetas","hijos de puta","how to murder","jugo de polla","lamer el coño","lamer el culo","mother fucker","piece of shit","polla gigante","saco de bolas","sexo caliente","sexo en grupo","shaved beaver","splooge moose","sucio sanchez","suicide girls","tirando pedos","vibra de bala","acción rubia","apenas legal","auto erótico","ball kicking","ball licking","ball sucking","barely legal","big knockers","bunny fucker","cara de culo","cara de pene","come mi culo","dedo follado","doggie style","donkey punch","dún do chlab","estilo perro","fils de pute","fuck buttons","fudge packer","gordo enorme","hazme llegar","hijo de puta","ir a tientas","jugo de bebe","maestro-bate","make me come","más caliente","paja de pies","póg mo thóin","puño follado","raging boner","shaved pussy","shit-spitter","sultry women","tainted love","urethra play","wrapping men","يا ابن الكلب","asno duende","auto erotic","baby batter","baño de oro","beaver lips","big breasts","blue waffle","buena chica","bullet vibe","buscador de","butt-pirate","cock-sucker","culo-pirata","deep throat","doble polla","doggy style","double dong","f u c k e r","foot fetish","gallo negro","girl on top","how to kill","jelly donut","joroba seca","lemon party","maldita sea","master-bate","nsfw images","núcleo duro","pole smoker","shit-bagger","shit-breath","shit-eating","spread legs","style doggy","tea bagging","tight white","tongue in a","trou du cul","venus mound","violet wand","white power","ainnis ort","ass-fucker","ass-pirate","baby juice","ball gravy","black cock","booty call","buena caca","como matar","culo-gorro","dog-fucker","eat my ass","giant cock","god-damned","gofre azul","mono gallo","muff diver","poop chute","shit-brain","shit-faced","shit-house","shit-stain","strip club","una mierda","ball sack","bang bros","big black","bung hole","camel toe","culo mono","damnú ort","date rape","dog style","dp action","gang bang","group sex","hard core","hot chick","jail bait","nob jokey","phone sex","píosa cac","rosy palm","señor gay","sexo duro","shit-cunt","shit-dick","shit-face","shit-head","shit-heel","shit-hole","shit-load","ta gueule","tardo gay","wet dream","يلعن أبوك","يلعن شكلك","ball gag","big tits","blow job","chica en","culo gay","dry hump","god damn","goo girl","gros con","hand job","hot carl","huge fat","jack off","jack-off","jerk off","jerk-off","mr hands","piss pig","se corre","sexo gay","shit-ass","shit-bag","shit-fit","shit-pot","strap on","taste my","tub girl","ابن حرام","تفو عليك","ass-hat","el ella","f u c k","f_u_c_k","gay sex","girl on","god-dam","nig nog","punto g","s_h_i_t","tied up","ابن زنا","يا حمار","a pelo","g-spot","va-j-j","يا كلب","5 hit","a_s_s","mo-fo","s hit","fuckingshitmotherfucker","desmoronamiento","acrotomophilia","masterbaciones","motherfuckings","acrotomofilia","carpetmuncher","dingleberries","fingerfuckers","fingerfucking","masterbations","mothafuckings","motherfuckers","motherfucking","ciberfuckers","cockmongruel","consoladores","cyberfuckers","cyberfucking","dendrophilia","donkeyribber","ejaculatings","fingerfucked","fingerfucker","fistfuckings","masterbación","masterbation","mothafuckers","mothafucking","motherfucked","motherfucker","motherfuckin","motherfuckka","muthafuckker","mutherfucker","persiguiendo","pussylicking","tittiefucker","vorarephilia","autoerotico","beastiality","bestialidad","chupapollas","cibernético","clusterfuck","cockmongler","cockmuncher","cocksucking","coprolagnia","coprophilia","cumdumpster","cunillingus","cunnilingus","cuntlicking","cyberfucked","cyberfucker","dendrofilia","dingleberry","doggiestyle","ejaculating","ejaculation","estupideces","eyaculación","fannyfucker","fingerfucks","fistfuckers","fistfucking","fudgepacker","hamburguesa","hardcoresex","homoerótico","intercourse","lanzallamas","masturbarse","mothafuckas","mothafuckaz","mothafucked","mothafucker","mothafuckin","motherfucks","muthafecker","nimphomania","nymphomania","penisfucker","pornography","shitspitter","snowballing","thundercunt","asscracker","assmuncher","autoerotic","beastility","bestiality","booooooobs","buttcheeks","c0cksucker","chinchilla","circlejerk","cockburger","cockjockey","cockknoker","cockmaster","cockmonkey","cocknugget","cocksmoker","cocksucked","cocksucker","codiciando","cokmuncher","comepollas","consolador","coprofilia","cumguzzler","cunilingus","cuntlicker","deepthroat","dickbeater","dickmonger","dicksucker","dickweasel","digitación","doggystyle","dominación","domination","dominatrix","dominatriz","ejaculated","ejaculates","esclavitud","eyaculando","fannyflaps","fingerbang","fingerfuck","fistfucked","fistfucker","frotándose","gangbanged","gilipollas","homoerotic","kunilingus","lovemaking","m45terbate","m45terbato","ma5terbate","ma5terbato","mariconear","masoquista","masterbat*","masterbat3","masterbate","masturbate","mothafucka","mothafucks","motherfuck","muffdiving","paedophile","peckerhead","pervertido","polesmoker","quejándose","rompeculos","sangriento","scissoring","shitbagger","shitbreath","shiteating","undressing","anilingus","asaltante","assbandit","assbanger","assfucker","assgoblin","asshopper","assjacker","asslicker","assmonkey","asspirate","asssucker","barenaked","bastinado","borrachos","buttmunch","casse‑toi","cocinando","cockmunch","cocksmith","cocksucks","cocksukka","comadreja","coquetear","cumbubble","cumjockey","cyberfuck","dickjuice","dickleche","dirección","douchebag","ejaculate","ejakulate","eyaculado","fijándose","fingering","fistfucks","fuckheads","fucktards","gangbangs","genitales","goddamned","goregasmo","imbéciles","jiggerboo","knobjocky","knobjokey","lamecoños","lameculos","maestrob8","maldición","masochist","masturbar","mothafuck","muffdiver","octopussy","pedophile","pigfucker","pissflaps","pollasuka","poopchute","queerbait","queerhole","shitblimp","shitbrain","shitfaced","shithouse","shitstain","shittiest","shittings","shrimping","strappado","threesome","throating","tittyfuck","tittywank","tonterías","towelhead","tribadism","urophilia","zarzamora","zoophilia","arsehole","assclown","assfukka","assholes","assmunch","assshole","asswhole","babeland","ballsack","bangbros","bareback","bastardo","basurero","beastial","birdlock","bitchers","bitching","blowjobs","blumpkin","bofetada","bollocks","booooobs","bromista","bulldyke","bullshit","bunghole","butthole","buttplug","cabrones","camwhore","chiflado","clitface","clitoris","clítoris","cockbite","cockface","cockhead","cocknose","cockshit","cocksuck","cocksuka","coksucka","connasse","cornhole","correrse","couillon","creampie","cuntface","cunthole","cuntlick","cyberfuc","daterape","dickface","dickhead","dickhole","dickmilk","dickslap","dickweed","doochbag","dumbshit","enculada","erotismo","estúpido","eyacular","felación","felching","fellatio","fistfuck","follando","frijoles","frotting","fuckhead","fuckings","fuckwhit","futanari","gangbang","genitals","gobshite","goodpoop","goregasm","hardcore","horniest","infierno","jailbait","jiggaboo","kinkster","knobbing","knobhead","lesbiana","lúdramán","ma5terb8","malditos","mapaches","masterb8","nobjocky","nobjokey","numbnuts","omorashi","orgasims","pedobear","perillas","phonesex","phukking","pissflap","ponyplay","poontang","santorum","screwing","shagging","shitcunt","shitdick","shitface","shitfuck","shitfull","shithead","shitheel","shithole","shitings","shitload","shitters","shitting","slanteye","sodomize","swastika","testical","testicle","twathead","twatlips","vibrator","apeshit","aspirar","assbite","asscock","assface","asshead","asshole","asslick","asswipe","balbhán","ballbag","bandido","bastard","beaners","bellend","bestial","bitcher","bitches","bitchin","blowjob","boiolas","bollock","bondage","boooobs","breasts","bukkake","bullyke","cabracx","camgirl","campana","camslut","chiflar","cojones","connard","coochie","corrida","couille","cremita","cumming","cumshot","cumslut","cumtart","cuntrag","desnudo","dickbag","dickwad","dickwod","dipshit","dogging","dolcett","dumshit","enfoiré","erótico","erotism","escolta","esperma","eyacula","fagging","faggitt","fagtard","farting","fcuking","felatio","fellate","fieltro","figging","fisting","fóllame","footjob","fuckers","fucking","fuckwit","fukwhit","gaylord","gaytard","goddamn","graznar","handjob","herrero","humping","imbécil","incesto","jackass","jackoff","jigaboo","kinbaku","knobead","knobend","kondums","kumming","lujuria","lusting","maldito","mamadas","mamando","mapache","maricas","maricón","mordida","nawashi","neonazi","niggers","nipples","nobhead","nutsack","orgasim","orgasms","panooch","panties","pegging","pelotas","pendejo","perilla","phuking","phukked","picazón","pissers","pissing","pissoff","pisspig","playboy","pollock","poonani","poonany","punanny","pussies","raghead","rimming","schlong","scrotum","shagger","shaggin","shemale","shibari","shitass","shitbag","shitfit","shiting","shitpot","shitted","shitter","shiznit","slutbag","splooge","strapon","swinger","t1tt1e5","t1tties","timonel","titfuck","tittie5","titties","titwank","topless","tubgirl","twinkie","twunter","upskirt","vjayjay","wetback","willies","aldaba","amadán","assbag","asshat","asswad","bampot","bastún","bâtard","beaner","biatch","bimbos","bloody","bollok","bollox","boobie","booobs","bordel","buceta","bugger","buscar","cabron","cariño","chiant","coochy","cooter","córneo","culata","cummer","cunnie","cyalis","dammit","darkie","dildos","doggin","dommes","dookie","douche","enculé","erotic","escort","eunuch","eunuco","fagbag","faggit","faggot","fagots","farted","fatass","fcuker","fecker","feckin","feltch","femdom","flamer","flange","fooker","foutre","frijol","fucked","fucker","fuckin","fuckme","fukker","fukkin","fukwit","gayass","gaybob","gaysex","gaywad","goatcx","goatse","gokkun","grieta","gringo","hentai","honkey","hooker","hotsex","idiota","incest","jockey","jodido","knobed","kondum","kootch","kummer","l3i+ch","l3itch","labios","lezzie","lolita","mamada","marica","menaje","mierda","moreno","muther","n1gger","nalgas","nambla","nigg3r","nigg4h","niggah","niggas","niggaz","nigger","niglet","nipple","nudity","nudoso","nympho","orgasm","orgias","payaso","pecker","pepita","perras","phuked","pimpis","pising","pissed","pisser","pisses","pissin","pollas","pornos","pricks","punany","pusies","pussys","putain","raping","rapist","rectum","retard","rimjaw","rimjob","rizado","s.o.b.","sadism","sadist","salaud","salope","scroat","scrote","shited","shitey","shitty","smegma","snatch","sodomy","spooge","sucker","tetona","tontas","tosser","tranny","twatty","v14gra","vagina","viagra","voyeur","wanker","xrated","اللعنة","شرموطة","arrse","asses","azada","b!tch","b00bs","b17ch","b1tch","balls","bi+ch","bitch","boner","boobs","brida","burro","busty","cabra","chinc","chink","choad","chode","chulo","clits","cocks","coito","coños","coons","culos","cunts","dildo","dinks","dique","dirsa","domos","doosh","ducha","duche","ecchi","eejit","f4nny","faggs","fagot","fanny","fanyy","farty","fecal","felch","folla","fucka","fucks","fuker","fux0r","gallo","gaydo","golpe","gooch","gordo","grope","guido","heshe","hoare","honky","horny","horre","japón","joder","juggs","kinky","kiunt","kooch","kumer","kúmer","labia","lesbo","lmfao","mamar","mando","merde","minge","moras","mutha","n1gga","negro","nigga","ojete","orgia","panty","penis","perra","phuck","phuks","pises","pisin","pisof","polla","porno","prick","pubes","punta","pusse","pussi","pussy","queaf","queef","renob","ruski","semen","senos","shite","shits","shity","shota","skank","skeet","sluts","spick","spunk","sucks","teets","tetas","titty","tonto","tushy","twink","twunt","v1gra","verga","vulva","w00se","wanky","whoar","whore","willy","yiffy","zorra","انقلع","2g1c","4r5e","5h1t","5hit","anal","anus","ar5e","arse","bdsm","bien","bobo","boob","c0ck","cawk","cipa","cipá","cita","cl1t","clit","cnut","coca","cock","coño","coon","crap","culo","cums","cunt","d1ck","damn","dick","dike","dink","dlck","duro","dvda","dyke","fagg","fags","fart","fcuk","feck","fook","fuck","fuks","gook","guro","heeb","hoar","hoer","homo","hore","jerk","jism","jizm","jizz","kawk","kike","knob","kock","kums","kunt","kyke","m0f0","m0fo","milf","mof0","mofo","muff","nazi","nude","nuez","orgy","p0rn","paja","paki","pedo","phuk","phuq","piss","poof","poon","poop","porn","pozo","pron","pthc","pube","puño","pusy","puta","pute","puto","quim","rape","scat","sexo","sexy","sh!+","sh!t","sh1t","shag","shi+","shit","shiz","slut","smeg","smut","spac","spic","suck","tard","teez","teta","tits","titt","turd","tw4t","twat","wang","wank","yaoi","اخرس","حمار","خراء","قحبة","لعنة","去你妈的","狗娘养的","a55","ano","ass","bbw","bod","bum","cac","cok","con","cox","cul","cum","fag","fuk","fux","hoe","jap","jiz","kum","muc","nob","pis","poo","s&m","sex","tío","tit","vag","xxx","تبا","تفو","خرا","قذر","قرف","كلب","他妈的","操你妈","日你妈","死变态","王八蛋","龟儿子","🖕","ho","زب","كس","他妈","傻子","傻逼","去死","垃圾","妈的","婊子","废物","操你","日你","混蛋","滚开","煞笔","狗屎","蠢货","贱人","屌","屎","操","日","滚","靠"];

const PHRASE_TERMS = [];
const SINGLE_TERMS = new Set();

for (let i = 0; i < RAW_TERMS.length; i++) {
  const term = RAW_TERMS[i];
  if (term.includes(' ') || term.includes('-') || term.includes('_')) {
    PHRASE_TERMS.push(term);
  } else {
    SINGLE_TERMS.add(term);
  }
}

function normalizeLeet(str) {
  if (!str) return '';
  return str
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\+/g, 't');
}

/**
 * Checks if a string contains any profanity (phrases or words).
 */
function isProfane(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();

  for (let i = 0; i < PHRASE_TERMS.length; i++) {
    const phrase = PHRASE_TERMS[i];
    if (lower.includes(phrase)) return true;
  }

  const words = lower.match(/[\p{L}\p{N}!$@+]+/gu) || [];
  for (let i = 0; i < words.length; i++) {
    const rawMatch = words[i];
    const core = rawMatch.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (!core) continue;
    if (SINGLE_TERMS.has(core)) return true;
    const leet = normalizeLeet(core);
    if (SINGLE_TERMS.has(leet)) return true;
  }

  return false;
}

/**
 * Returns a list of unique detected profanity words in the string.
 */
function getProfaneWords(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  const lower = text.toLowerCase();

  for (let i = 0; i < PHRASE_TERMS.length; i++) {
    const phrase = PHRASE_TERMS[i];
    if (lower.includes(phrase)) {
      found.add(phrase);
    }
  }

  const words = lower.match(/[\p{L}\p{N}!$@+]+/gu) || [];
  for (let i = 0; i < words.length; i++) {
    const rawMatch = words[i];
    const core = rawMatch.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (!core) continue;
    if (SINGLE_TERMS.has(core)) {
      found.add(core);
      continue;
    }
    const leet = normalizeLeet(core);
    if (SINGLE_TERMS.has(leet)) {
      found.add(core);
    }
  }

  return Array.from(found);
}

/**
 * Replaces profane words with asterisks while preserving casing and punctuation.
 */
function censorText(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;

  // 1. Multi-word phrases
  for (let i = 0; i < PHRASE_TERMS.length; i++) {
    const phrase = PHRASE_TERMS[i];
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- _]+/g, '[- _]+');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    result = result.replace(regex, (m) => '*'.repeat(m.length));
  }

  // 2. Single words and leetspeak
  result = result.replace(/[\p{L}\p{N}!$@+]+/gu, (match) => {
    const leadingMatch = match.match(/^[^a-zA-Z0-9]+/);
    const trailingMatch = match.match(/[^a-zA-Z0-9]+$/);
    const leading = leadingMatch ? leadingMatch[0] : '';
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const core = match.slice(leading.length, match.length - trailing.length);
    if (!core) return match;

    const lower = core.toLowerCase();
    if (SINGLE_TERMS.has(lower) || SINGLE_TERMS.has(normalizeLeet(lower))) {
      return leading + '*'.repeat(core.length) + trailing;
    }
    return match;
  });

  return result;
}

/**
 * Comprehensive character / room name profanity check.
 * Checks direct matches, camelCase splits, delimiter splits, and leetspeak.
 */
function isProfaneName(rawName) {
  if (!rawName || typeof rawName !== 'string') return false;
  const raw = rawName.trim();
  if (!raw) return false;

  const lower = raw.toLowerCase();
  const leet = normalizeLeet(lower);

  // 1. Direct match
  if (SINGLE_TERMS.has(lower) || SINGLE_TERMS.has(leet)) return true;
  for (let i = 0; i < PHRASE_TERMS.length; i++) {
    if (lower === PHRASE_TERMS[i] || leet === PHRASE_TERMS[i]) return true;
  }

  // 2. Delimiter & number splitting (e.g. Lord_Asshole, Bitch123, sir-fuck)
  const tokens = lower.split(/[\s_\-.'0-9]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (SINGLE_TERMS.has(tok)) return true;
    const lTok = normalizeLeet(tok);
    if (SINGLE_TERMS.has(lTok)) return true;
  }

  // 3. CamelCase splitting (e.g. LordAsshole -> Lord, Asshole)
  const camelTokens = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 0; i < camelTokens.length; i++) {
    const tok = camelTokens[i];
    if (SINGLE_TERMS.has(tok)) return true;
    const lTok = normalizeLeet(tok);
    if (SINGLE_TERMS.has(lTok)) return true;
  }

  // 4. Substring check for terms >= 4 characters on stripped name
  const stripped = lower.replace(/[^a-z0-9]/g, '');
  const strippedLeet = leet.replace(/[^a-z0-9]/g, '');
  for (const term of SINGLE_TERMS) {
    if (term.length >= 4) {
      if (stripped.includes(term) || strippedLeet.includes(term)) {
        // Protect common innocent fantasy substrings
        if (term === 'ass' && (stripped.includes('assassin') || stripped.includes('classic') || stripped.includes('passage'))) {
          continue;
        }
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a character name for length, characters, and profanity.
 */
function validateCharName(rawName) {
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2) {
    return { valid: false, name, error: 'Character name must be at least 2 characters.' };
  }
  if (name.length > 18) {
    return { valid: false, name, error: 'Character name must be 18 characters or fewer.' };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9 _'-]*$/.test(name)) {
    return { valid: false, name, error: 'Name may only contain letters, numbers, spaces, hyphens, or apostrophes.' };
  }
  if (isProfaneName(name)) {
    return { valid: false, name, error: 'Character name contains inappropriate or prohibited language.' };
  }
  return { valid: true, name, nameLower: name.toLowerCase(), error: null };
}

export {
  RAW_TERMS as PROFANITY_WORDS,
  isProfane,
  getProfaneWords,
  censorText,
  isProfaneName,
  validateCharName,
};
