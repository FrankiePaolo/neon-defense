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
    'game.gameOver': 'GAME OVER',
    'game.score': 'Score',
    'game.wave': 'Wave',
    'game.enterName': 'Enter name',
    'game.saveScore': 'SAVE SCORE',
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
    'tut.1': 'Welcome to <span style="color:#00ffff">NEON DEFENSE</span>! Enemies travel along the glowing path. Place towers to stop them before they reach the exit.',
    'tut.2': 'Select a tower from the <span style="color:#00ffff">TOWERS</span> panel to start building.',
    'tut.3': 'Now tap a <span style="color:#aaa">dark tile</span> next to the path to place your tower.',
    'tut.4': 'Press <span style="color:#00ffff">START WAVE</span> to send enemies. Your towers fire automatically!',
    'tut.5': 'Enemies that reach the exit cost you a life. Destroy them all to clear the wave!',
    'tut.6': 'You earned gold! Place more towers or tap an existing tower to see upgrades. You can only build <span style="color:#ffd700">between waves</span>.',
    'tut.6b': 'Click on a placed tower to see its <span style="color:#00ff66">upgrade paths</span>. Each tower has two branches — <span style="color:#ffd700">choosing one locks the other</span>, so pick wisely! You can also <span style="color:#00aaff">move</span> or <span style="color:#ff6666">sell</span> towers between waves.',
    'tut.7': "You've got the basics! Good luck, commander.",
    'tut.ok': 'GOT IT',

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
    'up.blaster.A.1': '+167% fire rate',
    'up.blaster.A.2': 'Overclocked',
    'up.blaster.B.0': '+120% damage',
    'up.blaster.B.1': '+300% damage',
    'up.blaster.B.2': 'Armor-piercing',

    'up.frost.A.0': '50% slow',
    'up.frost.A.1': '60% slow',
    'up.frost.A.2': 'AoE freeze pulse',
    'up.frost.B.0': 'Frostbite damage',
    'up.frost.B.1': '+20% vuln (brittle)',
    'up.frost.B.2': '+35% vuln (shatter)',

    'up.lightning.A.0': '5 chain targets',
    'up.lightning.A.1': '7 chains',
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
    'up.sniper.A.2': 'Infinite range',
    'up.sniper.B.0': 'Hollow-point',
    'up.sniper.B.1': 'Execute < 30% HP',
    'up.sniper.B.2': 'Death mark',

    'up.support.A.0': '+25% damage amp',
    'up.support.A.1': 'Wider aura',
    'up.support.A.2': '+50% dmg +20% rate',
    'up.support.B.0': '+25 gold/wave',
    'up.support.B.1': '+60 gold/wave',
    'up.support.B.2': '+120g +10% sell',

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
    'game.gameOver': 'GAME OVER',
    'game.score': 'Punteggio',
    'game.wave': 'Ondata',
    'game.enterName': 'Inserisci nome',
    'game.saveScore': 'SALVA PUNTEGGIO',
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
    'tut.1': 'Benvenuto in <span style="color:#00ffff">NEON DEFENSE</span>! I nemici percorrono il sentiero luminoso. Piazza le torri per fermarli prima che raggiungano l\'uscita.',
    'tut.2': 'Seleziona una torre dal pannello <span style="color:#00ffff">TORRI</span> per iniziare a costruire.',
    'tut.3': 'Tocca una <span style="color:#aaa">casella scura</span> vicino al percorso per piazzare la torre.',
    'tut.4': 'Premi <span style="color:#00ffff">INIZIA ONDATA</span> per inviare i nemici. Le torri sparano automaticamente!',
    'tut.5': 'I nemici che raggiungono l\'uscita ti costano una vita. Distruggili tutti per completare l\'ondata!',
    'tut.6': 'Hai guadagnato oro! Piazza altre torri o tocca una torre per i potenziamenti. Puoi costruire solo <span style="color:#ffd700">tra le ondate</span>.',
    'tut.6b': 'Clicca su una torre piazzata per vedere i suoi <span style="color:#00ff66">percorsi di potenziamento</span>. Ogni torre ha due rami — <span style="color:#ffd700">sceglierne uno blocca l\'altro</span>, quindi scegli bene! Puoi anche <span style="color:#00aaff">spostare</span> o <span style="color:#ff6666">vendere</span> le torri tra le ondate.',
    'tut.7': 'Hai imparato le basi! Buona fortuna, comandante.',
    'tut.ok': 'CAPITO',

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
    'up.blaster.A.1': '+167% cadenza di tiro',
    'up.blaster.A.2': 'Overcloccato',
    'up.blaster.B.0': '+120% danno',
    'up.blaster.B.1': '+300% danno',
    'up.blaster.B.2': 'Perforante',

    'up.frost.A.0': '50% rallentamento',
    'up.frost.A.1': '60% rallentamento',
    'up.frost.A.2': 'Impulso gelo ad area',
    'up.frost.B.0': 'Danno da congelamento',
    'up.frost.B.1': '+20% vuln (fragile)',
    'up.frost.B.2': '+35% vuln (frantuma)',

    'up.lightning.A.0': '5 bersagli a catena',
    'up.lightning.A.1': '7 catene',
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
    'up.sniper.A.2': 'Gittata infinita',
    'up.sniper.B.0': 'Punta cava',
    'up.sniper.B.1': 'Esecuzione < 30% HP',
    'up.sniper.B.2': 'Marchio mortale',

    'up.support.A.0': '+25% amplif. danno',
    'up.support.A.1': 'Aura più ampia',
    'up.support.A.2': '+50% danno +20% cadenza',
    'up.support.B.0': '+25 oro/ondata',
    'up.support.B.1': '+60 oro/ondata',
    'up.support.B.2': '+120o +10% vendita',

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
