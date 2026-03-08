const STRINGS = {
  en: {
    // Menu
    'menu.title': 'NEON DEFENSE',
    'menu.difficulty': 'SELECT DIFFICULTY',
    'menu.hard': 'SHORT PATH',
    'menu.normal': 'MEDIUM PATH',
    'menu.easy': 'LONG PATH',
    'menu.scores': 'GLOBAL SCORES',

    // HUD
    'hud.wave': 'WAVE',
    'hud.score': 'SCORE',

    // Game
    'game.startWave': 'START WAVE',
    'game.startWaveDesktop': 'START WAVE (SPACE)',
    'game.cancel': 'CANCEL',
    'game.paused': 'PAUSED',
    'game.pauseHint': 'Press SPACE or ESC to resume',
    'game.resume': 'RESUME',
    'game.restart': 'RESTART',
    'game.gameOver': 'GAME OVER',
    'game.score': 'Score',
    'game.wave': 'Wave',
    'game.enterName': 'Enter name',
    'game.saveScore': 'SAVE SCORE',
    'game.nameTaken': 'Name already taken — choose a different one',
    'game.playAgain': 'PLAY AGAIN',
    'game.next': 'Next',

    // Tower panel
    'towers.title': 'TOWERS',
    'towers.move': 'MOVE',
    'towers.sell': 'SELL',

    // Unlock
    'unlock.single': 'NEW TOWER UNLOCKED',
    'unlock.plural': 'NEW TOWERS UNLOCKED',
    'unlock.next': 'Next unlock',
    'unlock.in': 'in',
    'unlock.pts': 'pts',

    // Scores
    'scores.loading': 'Loading...',
    'scores.empty': 'No scores yet',

    // Tutorial
    'tut.1': 'Your mission: don\'t let enemies reach the <span style="color:#ff4444">END</span> of the path. Build towers to shoot them down!',
    'tut.2': 'Pick a tower from the <span style="color:#00ffff">TOWERS</span> panel below. The <span style="color:#00ffff">Blaster</span> is a great first choice.',
    'tut.3': 'Tap any <span style="color:#aaa">dark tile</span> to place it. Towers shoot enemies that walk nearby, so build <span style="color:#ffd700">next to the path</span>.',
    'tut.4': 'Hit <span style="color:#00ffff">START WAVE</span> — enemies will spawn and your towers fire on their own!',
    'tut.5': 'Each enemy that reaches the END costs you a <span style="color:#ff4444">life</span>. Lose them all and it\'s game over!',
    'tut.6': 'Killing enemies earns <span style="color:#ffd700">gold</span>. Use it to build more towers — but you can only build <span style="color:#ffd700">between waves</span>.',
    'tut.6b': 'Tap a tower to see its <span style="color:#00ff66">upgrades</span>. Each tower has two paths — pick one, the other locks. You can also <span style="color:#00aaff">move</span> or <span style="color:#ff6666">sell</span> towers.',
    'tut.7': "That's it! Survive as many waves as you can. Good luck!",
    'tut.ok': 'GOT IT',
    'tut.skip': 'SKIP TUTORIAL',

    // Tower names
    'tower.blaster': 'Blaster',
    'tower.frost': 'Frost',
    'tower.lightning': 'Lightning',
    'tower.cannon': 'Cannon',
    'tower.sniper': 'Sniper',
    'tower.support': 'Support',

    // Tower descriptions
    'tower.blaster.desc': 'Balanced all-rounder',
    'tower.frost.desc': 'Slows enemies',
    'tower.lightning.desc': 'Chain arcs between enemies',
    'tower.cannon.desc': 'AoE splash damage',
    'tower.sniper.desc': 'Extreme range, high damage',
    'tower.support.desc': 'Buffs nearby towers',

    // Upgrade path names
    'up.blaster.A': 'Rapid Fire',
    'up.blaster.B': 'Heavy Rounds',
    'up.frost.A': 'Deep Freeze',
    'up.frost.B': 'Frostbite',
    'up.lightning.A': 'Storm',
    'up.lightning.B': 'Overload',
    'up.cannon.A': 'Bombardment',
    'up.cannon.B': 'Demolisher',
    'up.sniper.A': 'Marksman',
    'up.sniper.B': 'Assassin',
    'up.support.A': 'Command',
    'up.support.B': 'Economy',

    // Upgrade level descriptions
    'up.blaster.A.0': '+67% fire rate',
    'up.blaster.A.1': '+133% fire rate',
    'up.blaster.A.2': 'Overclocked',
    'up.blaster.B.0': '+100% damage',
    'up.blaster.B.1': '+280% damage',
    'up.blaster.B.2': 'Armor-piercing',

    'up.frost.A.0': '45% slow',
    'up.frost.A.1': '55% slow',
    'up.frost.A.2': 'AoE freeze pulse',
    'up.frost.B.0': 'Frostbite damage',
    'up.frost.B.1': '+20% vuln (brittle)',
    'up.frost.B.2': '+30% vuln (shatter)',

    'up.lightning.A.0': '4 chain targets',
    'up.lightning.A.1': '6 chains, less decay',
    'up.lightning.A.2': 'Storm strike AoE',
    'up.lightning.B.0': 'High voltage',
    'up.lightning.B.1': '15% stun chance',
    'up.lightning.B.2': '30% stun',

    'up.cannon.A.0': 'Wider explosions',
    'up.cannon.A.1': 'Carpet bomb',
    'up.cannon.A.2': 'Napalm rounds',
    'up.cannon.B.0': 'HE shells',
    'up.cannon.B.1': 'Shreds 30% armor',
    'up.cannon.B.2': 'Critical strikes',

    'up.sniper.A.0': 'Extended range',
    'up.sniper.A.1': 'Eagle eye',
    'up.sniper.A.2': 'Full-map range',
    'up.sniper.B.0': 'Hollow-point',
    'up.sniper.B.1': 'Execute < 30% HP',
    'up.sniper.B.2': 'Death mark',

    'up.support.A.0': '+20% damage amp',
    'up.support.A.1': 'Wider aura',
    'up.support.A.2': '+40% dmg +15% rate',
    'up.support.B.0': '+20 gold/wave',
    'up.support.B.1': '+45 gold/wave',
    'up.support.B.2': '+80g +10% sell',

    // Stats tooltip
    'stats.dmg': 'DMG',
    'stats.rate': 'RATE',
    'stats.rng': 'RNG',
    'stats.slow': 'SLOW',
    'stats.chain': 'CHAIN',
    'stats.splash': 'SPLASH',
    'stats.amp': 'AMP',
    'stats.wave': 'wave',
    'stats.targeting': 'Targeting',
    'stats.place': 'PLACE',
    'stats.locked': 'LOCKED',
    'stats.unlocksAt': 'Unlocks at',
    'targeting.first': 'First',
    'targeting.closest': 'Closest',
    'targeting.strongest': 'Strongest',

    // Enemy names
    'enemy.basic': 'Drone',
    'enemy.fast': 'Scout',
    'enemy.tank': 'Brute',
    'enemy.armored': 'Sentinel',
    'enemy.healer': 'Medic',
    'enemy.splitter': 'Hydra',
    'enemy.flying': 'Wraith',
    'enemy.boss': 'Overlord',
    'enemy.stealth': 'Phantom',
    'enemy.shielded': 'Guardian',
  },

  it: {
    // Menu
    'menu.title': 'NEON DEFENSE',
    'menu.difficulty': 'SELEZIONA DIFFICOLTÀ',
    'menu.hard': 'PERCORSO CORTO',
    'menu.normal': 'PERCORSO MEDIO',
    'menu.easy': 'PERCORSO LUNGO',
    'menu.scores': 'CLASSIFICA GLOBALE',

    // HUD
    'hud.wave': 'ONDATA',
    'hud.score': 'PUNTI',

    // Game
    'game.startWave': 'INIZIA ONDATA',
    'game.startWaveDesktop': 'INIZIA ONDATA (SPAZIO)',
    'game.cancel': 'ANNULLA',
    'game.paused': 'IN PAUSA',
    'game.pauseHint': 'Premi SPAZIO o ESC per riprendere',
    'game.resume': 'RIPRENDI',
    'game.restart': 'RICOMINCIA',
    'game.gameOver': 'GAME OVER',
    'game.score': 'Punteggio',
    'game.wave': 'Ondata',
    'game.enterName': 'Inserisci nome',
    'game.saveScore': 'SALVA PUNTEGGIO',
    'game.nameTaken': 'Nome già in uso — scegline un altro',
    'game.playAgain': 'GIOCA ANCORA',
    'game.next': 'Prossimi',

    // Tower panel
    'towers.title': 'TORRI',
    'towers.move': 'SPOSTA',
    'towers.sell': 'VENDI',

    // Unlock
    'unlock.single': 'NUOVA TORRE SBLOCCATA',
    'unlock.plural': 'NUOVE TORRI SBLOCCATE',
    'unlock.next': 'Prossimo sblocco',
    'unlock.in': 'tra',
    'unlock.pts': 'punti',

    // Scores
    'scores.loading': 'Caricamento...',
    'scores.empty': 'Nessun punteggio',

    // Tutorial
    'tut.1': 'La tua missione: non far arrivare i nemici alla <span style="color:#ff4444">FINE</span> del percorso. Costruisci torri per abbatterli!',
    'tut.2': 'Scegli una torre dal pannello <span style="color:#00ffff">TORRI</span> in basso. Il <span style="color:#00ffff">Blaster</span> è un\'ottima scelta per iniziare.',
    'tut.3': 'Tocca una <span style="color:#aaa">casella scura</span> per piazzarla. Le torri sparano ai nemici vicini, quindi costruisci <span style="color:#ffd700">accanto al percorso</span>.',
    'tut.4': 'Premi <span style="color:#00ffff">INIZIA ONDATA</span> — i nemici appariranno e le torri spareranno da sole!',
    'tut.5': 'Ogni nemico che arriva alla FINE ti costa una <span style="color:#ff4444">vita</span>. Se le perdi tutte, è game over!',
    'tut.6': 'Uccidere i nemici ti dà <span style="color:#ffd700">oro</span>. Usalo per costruire più torri — ma puoi costruire solo <span style="color:#ffd700">tra le ondate</span>.',
    'tut.6b': 'Tocca una torre per vedere i suoi <span style="color:#00ff66">potenziamenti</span>. Ogni torre ha due rami — scegline uno, l\'altro si blocca. Puoi anche <span style="color:#00aaff">spostare</span> o <span style="color:#ff6666">vendere</span> le torri.',
    'tut.7': 'Tutto qui! Sopravvivi a più ondate possibili. Buona fortuna!',
    'tut.ok': 'CAPITO',
    'tut.skip': 'SALTA TUTORIAL',

    // Tower names
    'tower.blaster': 'Blaster',
    'tower.frost': 'Gelo',
    'tower.lightning': 'Fulmine',
    'tower.cannon': 'Cannone',
    'tower.sniper': 'Cecchino',
    'tower.support': 'Supporto',

    // Tower descriptions
    'tower.blaster.desc': 'Bilanciato e versatile',
    'tower.frost.desc': 'Rallenta i nemici',
    'tower.lightning.desc': 'Fulmini a catena tra nemici',
    'tower.cannon.desc': 'Danno ad area',
    'tower.sniper.desc': 'Gittata estrema, danno elevato',
    'tower.support.desc': 'Potenzia le torri vicine',

    // Upgrade path names
    'up.blaster.A': 'Fuoco Rapido',
    'up.blaster.B': 'Proiettili Pesanti',
    'up.frost.A': 'Gelo Profondo',
    'up.frost.B': 'Congelamento',
    'up.lightning.A': 'Tempesta',
    'up.lightning.B': 'Sovraccarico',
    'up.cannon.A': 'Bombardamento',
    'up.cannon.B': 'Demolitore',
    'up.sniper.A': 'Tiratore',
    'up.sniper.B': 'Assassino',
    'up.support.A': 'Comando',
    'up.support.B': 'Economia',

    // Upgrade level descriptions
    'up.blaster.A.0': '+67% cadenza di tiro',
    'up.blaster.A.1': '+133% cadenza di tiro',
    'up.blaster.A.2': 'Overcloccato',
    'up.blaster.B.0': '+100% danno',
    'up.blaster.B.1': '+280% danno',
    'up.blaster.B.2': 'Perforante',

    'up.frost.A.0': '45% rallentamento',
    'up.frost.A.1': '55% rallentamento',
    'up.frost.A.2': 'Impulso gelo ad area',
    'up.frost.B.0': 'Danno da congelamento',
    'up.frost.B.1': '+20% vuln (fragile)',
    'up.frost.B.2': '+30% vuln (frantuma)',

    'up.lightning.A.0': '4 bersagli a catena',
    'up.lightning.A.1': '6 catene, meno decadim.',
    'up.lightning.A.2': 'Tempesta ad area',
    'up.lightning.B.0': 'Alta tensione',
    'up.lightning.B.1': '15% stordimento',
    'up.lightning.B.2': '30% stordimento',

    'up.cannon.A.0': 'Esplosioni più ampie',
    'up.cannon.A.1': 'Bombardamento a tappeto',
    'up.cannon.A.2': 'Proiettili al napalm',
    'up.cannon.B.0': 'Proiettili HE',
    'up.cannon.B.1': '-30% armatura',
    'up.cannon.B.2': 'Colpi critici',

    'up.sniper.A.0': 'Gittata estesa',
    'up.sniper.A.1': 'Occhio d\'aquila',
    'up.sniper.A.2': 'Gittata massima',
    'up.sniper.B.0': 'Punta cava',
    'up.sniper.B.1': 'Esecuzione < 30% HP',
    'up.sniper.B.2': 'Marchio mortale',

    'up.support.A.0': '+20% amplif. danno',
    'up.support.A.1': 'Aura più ampia',
    'up.support.A.2': '+40% danno +15% cadenza',
    'up.support.B.0': '+20 oro/ondata',
    'up.support.B.1': '+45 oro/ondata',
    'up.support.B.2': '+80o +10% vendita',

    // Stats tooltip
    'stats.dmg': 'DAN',
    'stats.rate': 'CAD',
    'stats.rng': 'GIT',
    'stats.slow': 'RALL',
    'stats.chain': 'CATENA',
    'stats.splash': 'AREA',
    'stats.amp': 'AMPL',
    'stats.wave': 'ondata',
    'stats.targeting': 'Bersaglio',
    'stats.place': 'PIAZZA',
    'stats.locked': 'BLOCCATA',
    'stats.unlocksAt': 'Sblocco a',
    'targeting.first': 'Primo',
    'targeting.closest': 'Piu vicino',
    'targeting.strongest': 'Piu forte',

    // Enemy names
    'enemy.basic': 'Drone',
    'enemy.fast': 'Esploratore',
    'enemy.tank': 'Bruto',
    'enemy.armored': 'Sentinella',
    'enemy.healer': 'Medico',
    'enemy.splitter': 'Idra',
    'enemy.flying': 'Spettro',
    'enemy.boss': 'Supremo',
    'enemy.stealth': 'Fantasma',
    'enemy.shielded': 'Guardiano',
  },
};

let currentLang = localStorage.getItem('neon_td_lang') || 'en';

export function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key]) || STRINGS.en[key] || key;
}

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('neon_td_lang', lang);
}
