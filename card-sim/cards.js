/* ---------------------------------- deck ---------------------------------- */

// Both decks can contain every group. Acts of God fire when drawn.
const CATEGORIES = [
  { key: 'god', label: 'Acts of God', colour: '#d9694a', note: 'trigger when drawn' },
  { key: 'gift', label: 'Gifts from the Gods', colour: '#c79a2b', note: 'permanent climb items' },
  { key: 'item', label: 'Items', colour: '#8a5cd6', note: '' },
  { key: 'action', label: 'Actions', colour: '#3b7dd8', note: '' },
];

function treasureDef(name, blue, red) {
  const signed = (value) => (value > 0 ? '+' + value : String(value));
  return {
    name,
    type: 'item',
    qty: 1,
    effect: 'Blue ' + signed(blue) + ' · Red ' + signed(red),
    points: { blue, red },
  };
}

function isTreasure(card) {
  return !!(card && card.points);
}

// `fx` drives immediate effects. Treasure values count while a player holds the card.
const CARD_DEFS = [
  { name: 'Pickaxe', type: 'gift', qty: 1, effect: 'n/a' },
  { name: 'Climbing Equipment', type: 'gift', qty: 1, effect: 'n/a' },
  { name: 'Bristol Gold', type: 'gift', qty: 2, effect: 'n/a' },
  { name: 'Grappling Hook', type: 'gift', qty: 1, effect: 'n/a' },

  { name: 'Veridian Talon', type: 'item', qty: 2, effect: 'Degrades a rope segment by 1', fx: 'cut' },
  { name: 'Lasso', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Wind Fan', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Hissing Hourglass', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Horn of the Ancients', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Chant of Solitude', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Hooky Stick', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Echo Conch', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Cinnabar Dust', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Blood Jade Scarab', type: 'item', qty: 1, effect: 'Moves 1 HP from a random player to the current player', fx: 'move-hp' },
  treasureDef('Quartz Gold', 2, 1),
  treasureDef('Glacial Gold', 3, 1),
  treasureDef('Small Blue Gold', 1, 0),
  treasureDef('Brimstone Gold', 1, 2),
  treasureDef('Igneous Gold', 1, 3),
  treasureDef('Small Red Gold', 0, 1),
  treasureDef('Neutral Gold', 2, 2),
  treasureDef('Small Gold', 1, 1),
  treasureDef('Statue of Xal Tok', 0, 2),
  treasureDef("Statue of H'mraa", 2, 0),
  treasureDef('Heart of Xal Tok', -3, 3),
  treasureDef("Breath of H'mraa", 3, -3),
  treasureDef('Gold Sarcophagus', 6, 6),

  { name: 'Heal', type: 'action', qty: 5, effect: 'Adds 1 HP to the current player', fx: 'heal' },
  { name: 'Strength of the Jaguars', type: 'action', qty: 1, effect: 'Adds 1 HP to the current player', fx: 'heal' },
  { name: 'Rucksack Check', type: 'action', qty: 5, effect: 'n/a' },
  { name: 'Steal', type: 'action', qty: 10, effect: 'n/a' },
  { name: 'Defend', type: 'action', qty: 1, effect: 'n/a' },
  { name: 'Brace', type: 'action', qty: 1, effect: 'n/a' },
  { name: 'Run', type: 'action', qty: 5, effect: 'n/a' },

  { name: 'Bridge Weakens', type: 'god', qty: 6, effect: 'Degrades 1 rope segment by 1', fx: 'weaken' },
  { name: 'Strength Test', type: 'god', qty: 3, effect: 'Removes NET 0.5 HP from all players', fx: 'strain' },
  { name: 'Divine Thunderstorm', type: 'god', qty: 1, effect: 'Removes NET 0.5 HP from all players', fx: 'strain' },
  { name: 'Mischief Monkey', type: 'god', qty: 1, effect: 'n/a' },
  { name: 'Termites', type: 'god', qty: 1, effect: 'n/a' },
  { name: 'The Call of Xal Tok', type: 'god', qty: 1, effect: 'Effect not specified' },
  { name: "The Call of H'mraa", type: 'god', qty: 1, effect: 'Effect not specified' },
];

const TYPE_COLOUR = {};
const TYPE_LABEL = {};
for (const c of CATEGORIES) {
  TYPE_COLOUR[c.key] = c.colour;
  TYPE_LABEL[c.key] = c.label;
}

const MAX_QTY = 40;
const DEFAULT_QTY = {};
for (const d of CARD_DEFS) DEFAULT_QTY[d.name] = d.qty;

const DECKS = ['A', 'B'];
// Each deck starts with the same list and can be tuned independently.
let deckQty = { A: Object.assign({}, DEFAULT_QTY), B: Object.assign({}, DEFAULT_QTY) };

const STARTER_DEFS = [
  { name: 'Small Gold Coin', type: 'item', qty: 8, effect: 'Blue 1 · Red 1', points: { blue: 1, red: 1 } },
  { name: 'Small Red Coin', type: 'item', qty: 8, effect: 'Blue 0 · Red 1', points: { blue: 0, red: 1 } },
  { name: 'Small Blue Coin', type: 'item', qty: 8, effect: 'Blue 1 · Red 0', points: { blue: 1, red: 0 } },
  { name: 'Rocks', type: 'item', qty: 8, effect: 'No value', points: { blue: 0, red: 0 } },
];
const DEFAULT_STARTER_QTY = Object.fromEntries(STARTER_DEFS.map((d) => [d.name, d.qty]));
let starterQty = Object.assign({}, DEFAULT_STARTER_QTY);

function deckDefs(cfg, deck) {
  return CARD_DEFS.map((d) => Object.assign({}, d, { qty: cfg.qty[deck][d.name] || 0 }));
}

function sumQty(defs) {
  return defs.reduce((a, d) => a + d.qty, 0);
}

function deckSize(cfg, deck) {
  return sumQty(deckDefs(cfg, deck));
}

function totalDeckSize(cfg) {
  return DECKS.reduce((sum, deck) => sum + deckSize(cfg, deck), 0);
}

function starterSize(cfg) {
  return STARTER_DEFS.reduce((sum, def) => sum + (cfg.starterQty[def.name] || 0), 0);
}

function typeTotals(cfg, deck) {
  return deckDefs(cfg, deck).reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + d.qty;
    return acc;
  }, {});
}

const SEGMENTS = 6;
const FORECAST_TRIALS = 300;
const FORECAST_HORIZON = 80;
const HIST_TURNS = 30;

/* --------------------------------- helpers -------------------------------- */

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---------------------------------- state --------------------------------- */

let state = null;
let autoTimer = null;
let uid = 0;

function buildFrom(defs, deck) {
  const cards = [];
  for (const def of defs) {
    for (let i = 0; i < def.qty; i++) {
      cards.push({ uid: uid++, deck, name: def.name, effect: def.effect, type: def.type, fx: def.fx, points: def.points });
    }
  }
  return cards;
}

function buildDeck(cfg, deck) {
  return buildFrom(deckDefs(cfg, deck), deck);
}

function buildStarterDeck(cfg) {
  return buildFrom(
    STARTER_DEFS.map((d) => Object.assign({}, d, { qty: cfg.starterQty[d.name] || 0 })),
    'Start',
  );
}

function readConfig() {
  const playMin = Number(document.getElementById('play-min').value);
  const playMax = Number(document.getElementById('play-max').value);
  return {
    playerCount: Number(document.getElementById('players').value),
    manual: document.getElementById('turn-mode').value === 'manual',
    godAutoDiscard: document.getElementById('god-auto-discard').checked,
    cutPolicy: document.getElementById('cut-policy').value,
    handSize: 4,
    playMin: Math.min(playMin, playMax),
    playMax: Math.max(playMin, playMax),
    playedDest: document.getElementById('played-dest').value,
    startHealth: Number(document.getElementById('start-health').value),
    segmentHp: Number(document.getElementById('segment-hp').value),
    qty: { A: Object.assign({}, deckQty.A), B: Object.assign({}, deckQty.B) },
    starterQty: Object.assign({}, starterQty),
    // The discard always cycles back in; without it the table just stalls.
    reshuffle: true,
  };
}

function makePlayers(cfg) {
  const players = [];
  for (let i = 0; i < cfg.playerCount; i++) {
    players.push({
      id: i,
      name: 'Player ' + (i + 1),
      hand: [],
      backpack: [],
      bank: null,
      kept: [],
      fresh: [],
      played: 0,
      health: cfg.startHealth,
      maxHealth: 10,
    });
  }
  const shared = [];
  for (const p of players) p.hand = shared;
  return players;
}

// Bridge cards held in the shared hand, backpacks, or bank slots.
function heldCards() {
  const all = state.players[0].hand.slice();
  for (const p of state.players) {
    if (p.bank) all.push(p.bank);
    for (const card of p.backpack) if (card && card.deck !== 'Start') all.push(card);
  }
  return all;
}

function keptCards() {
  const all = [];
  for (const p of state.players) all.push(...p.kept);
  return all;
}

function freshState(cfg, forecasting) {
  return {
    cfg,
    deck: [],
    reserveDeck: [],
    starterDeck: [],
    activeDeck: 'A',
    discard: [],
    removed: [],
    godFires: {},
    godsFired: 0,
    turnGods: [],
    pendingGod: null,
    players: makePlayers(cfg),
    active: 0,
    turn: 0,
    log: [],
    playCounts: {},
    drawCounts: {},
    reshuffles: 0,
    starved: false,
    started: false,
    bridge: new Array(SEGMENTS).fill(cfg.segmentHp),
    broken: false,
    brokenTurn: null,
    brokenSegment: null,
    turnHits: [],
    turnStrain: [],
    turnMoves: [],
    turnHeal: 0,
    turnHealTo: 0,
    forecast: null,
    forecasting: !!forecasting,
    phase: 'play',
    selected: [],
    pendingTargets: 0,
    lastFresh: [],
  };
}

function setupText(cfg) {
  return cfg.playerCount + ' players — press Start Game to deal a shared four-card hand and four starting cards each';
}

// Pre-game: seats laid out and both decks intact, but nothing dealt yet.
function resetTable() {
  stopAuto();

  const cfg = readConfig();
  state = freshState(cfg);
  state.deck = buildDeck(cfg, 'A');
  state.reserveDeck = buildDeck(cfg, 'B');
  state.starterDeck = buildStarterDeck(cfg);

  addLog(null, [['note', 'Table set for ' + setupText(cfg)]]);
  updateForecast();
  render();
}

function dealHands() {
  const cfg = state.cfg;
  // Deal the starting deck evenly around the table, then lay out the shared hand.
  for (let c = 0; c < 4; c++) {
    for (const p of state.players) {
      const card = state.starterDeck.pop();
      if (card) p.backpack.push(card);
    }
  }
  drawCards(state.players[0], cfg.handSize);
  for (const p of state.players) p.fresh = [];
  state.lastFresh = state.pendingGod ? [state.pendingGod.uid] : [];
}

function startGame() {
  stopAuto();

  const cfg = readConfig();
  if (starterSize(cfg) < cfg.playerCount * 4) return;
  state = freshState(cfg);
  state.deck = shuffle(buildDeck(cfg, 'A'));
  state.reserveDeck = shuffle(buildDeck(cfg, 'B'));
  state.starterDeck = shuffle(buildStarterDeck(cfg));
  state.started = true;
  state.turn = 1;

  dealHands();
  const openingGods = state.turnGods.slice();
  const openingStrain = state.turnStrain.map(strainText);
  const openingHits = state.turnHits.map(hitText);
  state.turnGods = [];
  state.turnHits = [];
  state.turnStrain = [];

  const dealt = cfg.playerCount + ' players dealt up to four starting cards each; shared hand of ' + state.players[0].hand.length + ' bridge cards';
  addLog(null, [['note', 'Game start — ' + dealt]]);
  addLog(null, [['note', 'Deck A: ' + deckSize(cfg, 'A') + ' cards · Deck B: ' + deckSize(cfg, 'B') + ' cards']]);
  if (openingGods.length) {
    const parts = [['god', 'Opening draw triggered ' + names(openingGods)]];
    for (const result of openingStrain) parts.push(['strain', result]);
    if (openingHits.length) parts.push(['bridge', openingHits.join(', ')]);
    addLog(null, parts);
  }

  updateForecast();
  render();
}

/* --------------------------------- bridge --------------------------------- */

function bridgeHp() {
  return state.bridge.reduce((a, b) => a + b, 0);
}

function bridgeMax() {
  return SEGMENTS * state.cfg.segmentHp;
}

// Damage to a segment; at 0 the bridge snaps and the game moves on.
function damageSegment(index, reason, amount) {
  if (state.broken || state.bridge[index] <= 0) return null;
  const dealt = Math.min(amount == null ? 1 : amount, state.bridge[index]);
  state.bridge[index] -= dealt;
  const hit = { index, hp: state.bridge[index], reason, dealt };
  if (state.bridge[index] === 0) {
    state.broken = true;
    state.brokenTurn = state.turn;
    state.brokenSegment = index;
  }
  state.turnHits.push(hit);
  return hit;
}

// Which segment a Veridian Talon hits when nobody is choosing.
function cutTarget() {
  const alive = [];
  for (let i = 0; i < SEGMENTS; i++) if (state.bridge[i] > 0) alive.push(i);
  if (alive.length === 0) return null;

  const policy = state.cfg.cutPolicy;
  if (policy === 'weakest' || policy === 'strongest') {
    const choose = policy === 'weakest' ? Math.min : Math.max;
    const target = choose(...alive.map((i) => state.bridge[i]));
    return pick(alive.filter((i) => state.bridge[i] === target));
  }
  return pick(alive);
}

function applyCut(index) {
  return damageSegment(index, 'Veridian Talon', 1);
}

function resolveCuts(n) {
  for (let i = 0; i < n && !state.broken; i++) {
    const target = cutTarget();
    if (target === null) return;
    applyCut(target);
  }
}

function countCuts(cards) {
  return cards.filter((c) => c.fx === 'cut').length;
}

/* -------------------------------- strength -------------------------------- */

function partyHealth() {
  return state.players.reduce((a, p) => a + p.health, 0);
}

function partyMax() {
  return state.players.reduce((a, p) => a + p.maxHealth, 0);
}

function playersDown() {
  return state.players.filter((p) => p.health === 0).length;
}

// NET 0.5 HP per player: an independent coin flip against everyone standing.
function runStrengthTest(label) {
  const fell = [];
  for (const p of state.players) {
    if (p.health > 0 && Math.random() < 0.5) {
      p.health--;
      fell.push(p);
    }
  }
  state.turnStrain.push({
    label,
    fell: fell.map((p) => p.name + (p.health === 0 ? ' (down)' : '')),
  });
}

function healPlayer(player) {
  if (player.health >= player.maxHealth) return;
  player.health++;
  state.turnHeal++;
  state.turnHealTo = player.health;
}

// Blood Jade Scarab: one HP changes hands rather than appearing from nowhere.
function moveHp(player) {
  if (player.health >= player.maxHealth) return;
  const donors = state.players.filter((p) => p.id !== player.id && p.health > 0);
  if (donors.length === 0) return;
  const donor = pick(donors);
  donor.health--;
  player.health++;
  state.turnMoves.push('1 HP from ' + donor.name + (donor.health === 0 ? ' (down)' : '') + ' to ' + player.name);
}

/* ------------------------------- acts of god ------------------------------ */

function fireGod(card) {
  const key = card.deck + ':' + card.name;
  state.godFires[key] = (state.godFires[key] || 0) + 1;
  state.godsFired++;
  state.turnGods.push(card);

  let outcome = 'No simulated effect has been set for this card yet.';
  if (card.fx === 'weaken') {
    const hit = damageSegment(randInt(0, SEGMENTS - 1), card.name, 1);
    outcome = hit ? 'Bridge ' + hitText(hit) : 'The bridge was already broken.';
  }
  if (card.fx === 'strain') {
    runStrengthTest(card.name);
    outcome = strainText(state.turnStrain[state.turnStrain.length - 1]);
  }
  return outcome;
}

function resolvePendingGod() {
  if (!state || !state.pendingGod) return;
  const player = state.players[0];
  const card = removeByUid(player.hand, [state.pendingGod.uid])[0];
  if (!card) return;
  state.pendingGod = null;
  state.discard.push(card);

  const drawn = state.broken ? [] : drawCards(player, Math.max(0, state.cfg.handSize - player.hand.length)).drawn;
  if (state.forecasting) return;
  const parts = [['discard', 'sent ' + card.name + ' to discard']];
  if (drawn.length) parts.push(['draw', 'drew ' + names(drawn)]);
  addLog(state.players[state.active], parts);
  updateForecast();
  render();
}

/* ---------------------------------- rules --------------------------------- */

function drawCards(player, n) {
  const drawn = [];
  if (state.pendingGod) return { drawn };
  const cap = totalDeckSize(state.cfg) + 1;
  let pulled = 0;

  while (drawn.length < n) {
    if (state.deck.length === 0) {
      if (state.activeDeck === 'A') {
        activateDeckB();
        continue;
      }
      if (state.cfg.reshuffle && state.discard.some((card) => card.type !== 'god')) {
        state.deck = shuffle(state.discard);
        state.discard = [];
        state.activeDeck = 'recycle';
        state.reshuffles++;
      } else {
        state.starved = true;
        break;
      }
    }
    // Nothing left anywhere that could reach a hand.
    if (pulled++ > cap) {
      state.starved = true;
      break;
    }

    const card = state.deck.pop();
    if (state.activeDeck === 'A' && state.deck.length === 0) activateDeckB();
    const key = card.deck + ':' + card.name;
    state.drawCounts[key] = (state.drawCounts[key] || 0) + 1;
    if (card.type === 'god') {
      const outcome = fireGod(card);
      if (state.forecasting || state.cfg.godAutoDiscard) {
        state.discard.push(card);
        if (state.broken) break;
        continue;
      }
      player.hand.push(card);
      drawn.push(card);
      state.pendingGod = { uid: card.uid, outcome };
      break;
    }
    player.hand.push(card);
    drawn.push(card);
  }

  player.fresh = drawn.map((c) => c.uid);
  state.lastFresh = player.fresh;
  return { drawn };
}

function activateDeckB() {
  state.deck = state.reserveDeck;
  state.reserveDeck = [];
  state.activeDeck = 'B';
  addLog(null, [['note', 'Deck A exhausted — Deck B is now in play']]);
}

function takeRandom(hand, n) {
  const taken = [];
  for (let i = 0; i < n && hand.length > 0; i++) {
    taken.push(hand.splice(Math.floor(Math.random() * hand.length), 1)[0]);
  }
  return taken;
}

function removeByUid(hand, uids) {
  const taken = [];
  for (const u of uids) {
    const i = hand.findIndex((c) => c.uid === u);
    if (i >= 0) taken.push(hand.splice(i, 1)[0]);
  }
  return taken;
}

function applyPlays(player, cards) {
  for (const card of cards) {
    const key = card.deck + ':' + card.name;
    state.playCounts[key] = (state.playCounts[key] || 0) + 1;

    // Gifts from the Gods are permanent: they stay with the player, out of the cycle.
    if (card.type === 'gift') player.kept.push(card);
    else if (card.deck === 'Start' || state.cfg.playedDest === 'removed') state.removed.push(card);
    else state.discard.push(card);

    if (card.fx === 'heal') healPlayer(player);
    if (card.fx === 'move-hp') moveHp(player);
  }
  player.played += cards.length;
}

// How many cards must be discarded to make playMax leave the hand.
function discardsDueAfter(player, playedCount) {
  return Math.min(Math.max(0, state.cfg.playMax - playedCount), player.hand.length);
}

function strainText(s) {
  const what = s.label || 'Strength Test';
  return s.fell.length ? what + ' hit ' + s.fell.join(', ') : what + ' — everyone held firm';
}

function hitText(h) {
  const seg = 'segment ' + (h.index + 1);
  return h.hp === 0 ? seg + ' SNAPPED' : seg + ' → ' + h.hp + ' hp';
}

function finishTurn(player, played, discarded, manualPass) {
  for (const card of discarded) state.discard.push(card);
  for (const p of state.players) p.fresh = [];

  let drawn = [];
  if (!state.broken) {
    drawn = drawCards(player, Math.max(0, state.cfg.handSize - player.hand.length)).drawn;
  }
  const parts = [];
  if (manualPass) parts.push(['note', state.broken ? 'turn ended as the bridge snapped' : 'passed turn']);
  else if (played.length) parts.push(['play', 'played ' + names(played)]);
  else parts.push(['play', 'played nothing']);
  const gifts = played.filter((c) => c.type === 'gift');
  if (gifts.length) parts.push(['keep', 'kept ' + names(gifts)]);
  if (state.turnHeal) {
    parts.push(['heal', 'healed +' + state.turnHeal + ' to ' + state.turnHealTo + ' strength']);
  }
  for (const move of state.turnMoves) parts.push(['heal', 'moved ' + move]);
  if (discarded.length) parts.push(['discard', 'discarded ' + names(discarded)]);
  if (drawn.length) parts.push(['draw', 'drew ' + drawn.length]);
  if (state.turnGods.length) parts.push(['god', 'Acts of God triggered: ' + names(state.turnGods)]);
  for (const s of state.turnStrain) parts.push(['strain', strainText(s)]);
  if (state.turnHits.length) parts.push(['bridge', state.turnHits.map(hitText).join(', ')]);
  if (!state.broken && !state.pendingGod && player.hand.length < state.cfg.handSize) {
    parts.push(['note', 'could not refill (deck exhausted)']);
  }
  addLog(player, parts);

  state.turnHits = [];
  state.turnStrain = [];
  state.turnGods = [];
  state.turnMoves = [];
  state.turnHeal = 0;
  state.turnHealTo = 0;
  state.turn++;
  state.active = (state.active + 1) % state.players.length;
  state.phase = 'play';
  state.selected = [];
  state.pendingTargets = 0;
  updateForecast();
  render();
}

function takeTurn() {
  if (!state || !state.started || state.cfg.manual || state.broken) return;
  if (state.pendingGod) {
    if (!state.forecasting) return;
    resolvePendingGod();
    if (state.pendingGod || state.broken) return;
  }
  const cfg = state.cfg;
  const player = state.players[state.active];

  const wanted = randInt(cfg.playMin, cfg.playMax);
  const played = takeRandom(player.hand, Math.min(wanted, player.hand.length));
  applyPlays(player, played);
  resolveCuts(countCuts(played));

  const discarded = takeRandom(player.hand, discardsDueAfter(player, played.length));
  finishTurn(player, played, discarded);
}

// Manual actions leave the current player in control until they pass.
function afterManualAction() {
  state.selected = [];
  if (state.broken) {
    finishTurn(state.players[state.active], [], [], true);
    return;
  }
  updateForecast();
  render();
}

function playSelected() {
  if (!isPicking() || state.phase !== 'play' || state.selected.length !== 1) return;
  const player = state.players[state.active];
  if (isTreasure(player.hand.find((card) => card.uid === state.selected[0]))) return;
  const card = removeByUid(player.hand, state.selected)[0];
  if (!card) return;
  applyPlays(player, [card]);
  addLog(player, [['play', 'played ' + card.name]]);
  state.selected = [];
  const cuts = countCuts([card]);
  if (cuts && state.cfg.cutPolicy === 'pick' && !state.broken) {
    state.pendingTargets = cuts;
    state.phase = 'target';
    render();
    return;
  }
  resolveCuts(cuts);
  afterManualAction();
}

function discardSelected() {
  if (!isPicking() || state.phase !== 'play' || state.selected.length !== 1) return;
  const player = state.players[state.active];
  const card = removeByUid(player.hand, state.selected)[0];
  if (!card) return;
  state.discard.push(card);
  addLog(player, [['discard', 'discarded ' + card.name]]);
  afterManualAction();
}

function passTurn() {
  if (!isPicking() || state.phase !== 'play') return;
  finishTurn(state.players[state.active], [], [], true);
}

function bankSelected() {
  if (!isPicking() || state.phase !== 'play' || state.selected.length !== 1) return;
  const player = state.players[state.active];
  if (isTreasure(player.hand.find((card) => card.uid === state.selected[0]))) return;
  const card = removeByUid(player.hand, state.selected)[0];
  if (!card) return;
  const old = player.bank;
  if (old) state.removed.push(old);
  player.bank = card;
  addLog(player, [['keep', 'banked ' + card.name + (old ? '; sent ' + old.name + ' to the canyon' : '')]]);
  afterManualAction();
}

function playBanked() {
  if (!isPicking() || state.phase !== 'play') return;
  const player = state.players[state.active];
  if (!player.bank) return;
  const card = player.bank;
  player.bank = null;
  playStoredCard(player, card);
}

function playStoredCard(player, card) {
  state.selected = [];
  applyPlays(player, [card]);
  addLog(player, [['play', 'played banked ' + card.name]]);
  const cuts = countCuts([card]);
  if (cuts && !state.broken && state.cfg.cutPolicy === 'pick') {
    state.pendingTargets = cuts;
    state.phase = 'target';
    render();
    return;
  }
  resolveCuts(cuts);
  afterManualAction();
}

function replaceBackpack(slot) {
  if (!isPicking() || state.phase !== 'play' || state.selected.length !== 1 || slot < 0 || slot >= 4) return;
  const player = state.players[state.active];
  const chosen = player.hand.find((card) => card.uid === state.selected[0]);
  if (!chosen || chosen.type !== 'item') return;
  const card = removeByUid(player.hand, state.selected)[0];
  const old = player.backpack[slot];
  if (old) state.discard.push(old);
  player.backpack[slot] = card;
  addLog(player, [['keep', 'stored ' + card.name + ' in backpack slot ' + (slot + 1) + (old ? '; discarded ' + old.name : '')]]);
  afterManualAction();
}

// Manual mode: the player aims a Veridian Talon at a segment.
function chooseTarget(index) {
  if (!isPicking() || state.phase !== 'target') return;
  if (!applyCut(index)) return;

  state.pendingTargets--;
  if (state.broken) {
    finishTurn(state.players[state.active], [], [], true);
    return;
  }
  if (state.pendingTargets === 0) state.phase = 'play';
  updateForecast();
  render();
}

function toggleSelection(cardUid) {
  if (!isPicking() || state.phase !== 'play') return;
  state.selected = state.selected[0] === cardUid ? [] : [cardUid];
  render();
}

function names(cards) {
  return cards.map((c) => c.name).join(', ');
}

function addLog(player, parts) {
  if (state.forecasting) return;
  state.log.unshift({ turn: player ? state.turn : null, who: player ? player.name : null, parts });
  if (state.log.length > 400) state.log.pop();
}

/* --------------------------------- forecast -------------------------------- */

// A copy of the position that the real turn logic can be run against.
function cloneState(s) {
  const c = freshState(Object.assign({}, s.cfg, { manual: false }), true);
  c.deck = s.deck.slice();
  c.reserveDeck = s.reserveDeck.slice();
  c.starterDeck = s.starterDeck.slice();
  c.activeDeck = s.activeDeck;
  c.discard = s.discard.slice();
  c.removed = s.removed.slice();
  c.bridge = s.bridge.slice();
  c.active = s.active;
  c.turn = s.turn;
  c.broken = s.broken;
  c.brokenTurn = s.brokenTurn;
  c.brokenSegment = s.brokenSegment;
  c.starved = s.starved;
  c.started = s.started;
  c.pendingGod = s.pendingGod ? Object.assign({}, s.pendingGod) : null;

  const shared = s.players[0].hand.slice();
  c.players = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: shared,
    backpack: p.backpack.slice(),
    bank: p.bank,
    kept: p.kept.slice(),
    fresh: [],
    played: p.played,
    health: p.health,
    maxHealth: p.maxHealth,
  }));
  return c;
}

// Before the deal there is no position to copy, so deal a fresh one per trial.
function trialState(real) {
  if (real.started) return cloneState(real);

  const s = freshState(Object.assign({}, real.cfg, { manual: false }), true);
  s.deck = shuffle(buildDeck(s.cfg, 'A'));
  s.reserveDeck = shuffle(buildDeck(s.cfg, 'B'));
  s.starterDeck = shuffle(buildStarterDeck(s.cfg));
  s.started = true;
  s.turn = 1;

  const prev = state;
  state = s;
  dealHands();
  state = prev;
  return s;
}

// Play the position out many times to see when the bridge tends to go.
function updateForecast() {
  if (!state || state.forecasting) return;
  if (!state.started && starterSize(state.cfg) < state.cfg.playerCount * 4) {
    state.forecast = null;
    return;
  }
  if (state.broken) {
    state.forecast = null;
    return;
  }

  const real = state;
  const from = real.started ? real.turn : 1;
  const delays = [];
  const bySegment = new Array(SEGMENTS).fill(0);

  for (let t = 0; t < FORECAST_TRIALS; t++) {
    state = trialState(real);
    let guard = 0;
    while (!state.broken && state.turn - from < FORECAST_HORIZON && guard++ <= FORECAST_HORIZON) {
      takeTurn();
    }
    if (state.broken) {
      delays.push(state.brokenTurn - from);
      bySegment[state.brokenSegment]++;
    }
  }
  state = real;

  const sorted = delays.slice().sort((a, b) => a - b);
  const within = (k) => delays.filter((d) => d <= k).length / FORECAST_TRIALS;
  const hist = new Array(HIST_TURNS).fill(0);
  for (const d of delays) if (d < HIST_TURNS) hist[d]++;

  state.forecast = {
    from,
    fresh: !real.started,
    trials: FORECAST_TRIALS,
    broke: delays.length,
    median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    mean: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null,
    next: within(0),
    in5: within(4),
    in10: within(9),
    in20: within(19),
    hist,
    segmentRisk: bySegment.map((n) => (delays.length ? n / delays.length : 0)),
  };
}

/* --------------------------------- rendering ------------------------------- */

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function render() {
  if (state.forecasting) return;
  renderStats();
  renderLegend();
  renderBridge();
  renderDeckBuilder();
  renderStarterBuilder();
  renderTurnBar();
  renderPlayers();
  renderLog();
  renderDiscard();
  renderTracker();

  const auto = state.started && !state.cfg.manual && !state.broken;
  document.getElementById('auto').disabled = !auto;
  for (const id of ['next-turn', 'skip']) document.getElementById(id).disabled = !auto || !!state.pendingGod;
  document.getElementById('save-btn').disabled = !state.started;
  document.getElementById('new-game').disabled = starterSize(state.cfg) < state.cfg.playerCount * 4;
  document.getElementById('new-game').textContent = state.started ? 'New Game' : 'Start Game';
  document.getElementById('health-note').textContent =
    'Strength Test and Divine Thunderstorm each give every player a 50% chance to lose 1 (net 0.5). ' + 'Heal and Strength of the Jaguars restore 1, up to 10.';
  document.getElementById('bridge-note').textContent =
    SEGMENTS + ' segments × ' + state.cfg.segmentHp + ' hp — the bridge snaps when any one segment reaches 0.';
  document.getElementById('god-note').textContent =
    'Acts take effect when drawn. With auto discard off, use the orange card in the shared hand to discard it and draw a replacement.';
  document.getElementById('deck-note').textContent =
    'Deck A draws first; Deck B takes over when A runs out. After B runs out, discarded cards reshuffle. ' +
    'Changing a quantity resets the table and updates the snap forecast.';
  document.getElementById('starter-note').textContent =
    starterSize(state.cfg) < state.cfg.playerCount * 4
      ? 'Add at least ' + (state.cfg.playerCount * 4 - starterSize(state.cfg)) + ' cards to deal four to every player.'
      : 'Four random cards per player; unused starting cards stay in the starting deck.';
  document.getElementById('discard-note').textContent =
    'Random mode only: up to ' + state.cfg.playMax + ' cards leave the shared hand each turn. In Manual mode, use Pass Turn to refill it.';
}

function renderLegend() {
  const held = {};
  for (const c of heldCards()) held[c.type] = (held[c.type] || 0) + 1;
  const kept = keptCards().length;

  const totals = {};
  for (const deck of DECKS) {
    const each = typeTotals(state.cfg, deck);
    for (const key of Object.keys(each)) totals[key] = (totals[key] || 0) + each[key];
  }
  const items = CATEGORIES.map((cat) => {
    const total = totals[cat.key] || 0;
    let counts;
    if (cat.key === 'god') counts = total + ' total · ' + state.godsFired + ' triggered';
    else if (cat.key === 'gift') {
      counts = total + ' total' + (state.started ? ' · ' + kept + ' kept' : '');
    } else {
      counts = total + ' total' + (state.started ? ' · ' + (held[cat.key] || 0) + ' in hands' : '');
    }
    return (
      '<span class="legend-item">' +
      '<span class="legend-key" style="background:' +
      cat.colour +
      '"></span>' +
      '<span class="legend-label">' +
      esc(cat.label) +
      '</span>' +
      '<span class="legend-count">' +
      esc(counts) +
      '</span>' +
      '</span>'
    );
  });

  document.getElementById('legend').innerHTML =
    items.join('') + '<span class="legend-total">Deck A ' + deckSize(state.cfg, 'A') + ' · Deck B ' + deckSize(state.cfg, 'B') + '</span>';
}

function renderStats() {
  const s = state;
  const tiles = [
    { k: 'Turn', v: s.started ? s.turn : '—' },
    { k: 'Active', v: s.started ? s.players[s.active].name.replace('Player ', 'P') : '—' },
    { k: s.activeDeck === 'recycle' ? 'Recycled' : 'Deck ' + s.activeDeck, v: s.deck.length },
    ...(s.activeDeck === 'A' ? [{ k: 'B reserve', v: s.reserveDeck.length }] : []),
    { k: 'Middle hand', v: s.players[0].hand.length },
    { k: 'Backpacks', v: s.players.reduce((n, p) => n + p.backpack.filter(Boolean).length, 0) },
    { k: 'Banked', v: s.players.filter((p) => p.bank).length },
    { k: 'Discard', v: s.discard.length },
    { k: 'Canyon', v: s.removed.length },
    { k: 'Acts', v: s.godsFired },
    { k: 'Party', v: partyHealth(), sub: 'of ' + partyMax() },
  ];
  document.getElementById('stats').innerHTML = tiles
    .map(
      (t) =>
        '<div class="stat"><span class="k">' +
        esc(t.k) +
        '</span><span class="v">' +
        esc(t.v) +
        '</span>' +
        (t.sub ? '<span class="sub">' + esc(t.sub) + '</span>' : '') +
        '</div>',
    )
    .join('');
}

function healthHTML(p) {
  let pips = '';
  for (let i = 0; i < p.maxHealth; i++) {
    pips += '<span class="hpip' + (i < p.health ? ' on' : '') + '"></span>';
  }
  const label = p.health === 0 ? 'down' : p.health + ' / ' + p.maxHealth + ' strength';
  return (
    '<div class="health hp-' +
    p.health +
    (p.health === 0 ? ' down' : '') +
    '">' +
    '<span class="health-pips">' +
    pips +
    '</span>' +
    '<span class="health-hp">' +
    label +
    '</span>' +
    '</div>'
  );
}

function cardHTML(card, fresh, selectable) {
  const glyph = { gift: '✦', item: '◆', action: '➤', god: '☄' }[card.type];
  const canSelect = selectable && card.type !== 'god';
  const pendingGod = state.pendingGod && state.pendingGod.uid === card.uid;
  const cls = (fresh ? ' fresh' : '') + (canSelect ? ' selectable' : '') + (state.selected.includes(card.uid) ? ' selected' : '');
  const sub = card.effect && card.effect !== 'n/a' ? card.effect : TYPE_LABEL[card.type];
  return (
    '<div class="card deck-' +
    card.deck.toLowerCase() +
    ' t-' +
    card.type +
    cls +
    '" data-uid="' +
    card.uid +
    '"' +
    (canSelect ? ' role="button" tabindex="0" aria-label="Select ' + esc(card.name) + '"' : '') +
    '>' +
    '<div class="card-top"><span>' +
    esc(TYPE_LABEL[card.type]) +
    '</span><span class="card-mark">' +
    (fresh ? '<span class="card-tag">drawn</span>' : '') +
    esc(card.deck) +
    '</span></div>' +
    '<div class="card-glyph" aria-hidden="true">' +
    glyph +
    '</div>' +
    '<div class="cn">' +
    esc(card.name) +
    '</div>' +
    '<div class="ce">' +
    esc(sub) +
    '</div>' +
    (pendingGod
      ? '<div class="god-result">Effect: ' +
        esc(state.pendingGod.outcome) +
        '</div>' +
        '<button class="resolve-god" type="button">' +
        (state.broken ? 'Discard' : 'Resolve, discard + draw new') +
        '</button>'
      : '') +
    '</div>'
  );
}

function handHTML(cards, fresh, selectable) {
  return cards.length
    ? cards.map((c) => cardHTML(c, fresh.includes(c.uid), selectable)).join('')
    : '<div class="empty-hand">' + (state.started ? 'empty hand' : 'not dealt yet') + '</div>';
}

function keptHTML(p) {
  if (!p.kept.length) return '';
  const chips = p.kept.map((c) => '<span class="kept-chip">' + esc(c.name) + '</span>').join('');
  return '<div class="kept"><span class="kept-label">Kept</span>' + chips + '</div>';
}

function playerGodPoints(player) {
  const held = [...player.backpack, player.bank, ...player.kept];
  return held.reduce(
    (total, card) => {
      if (card && card.points) {
        total.blue += card.points.blue || 0;
        total.red += card.points.red || 0;
      }
      return total;
    },
    { blue: 0, red: 0 },
  );
}

function sharedPanelHTML() {
  const cards = state.players[0].hand;
  const played = state.players.reduce((a, p) => a + p.played, 0);
  const chosen = state.selected.length === 1 ? cards.find((card) => card.uid === state.selected[0]) : null;
  const seats = state.players
    .map((p) => {
      const points = playerGodPoints(p);
      const canSwap = isPicking() && state.phase === 'play' && p.id === state.active && chosen && chosen.type === 'item';
      const slots = Array.from({ length: 4 }, (_, i) => {
        const card = p.backpack[i];
        return (
          '<div class="backpack-card' +
          (canSwap ? ' swappable' : '') +
          '" data-player="' +
          p.id +
          '" data-slot="' +
          i +
          '">' +
          '<span class="backpack-slot">Slot ' +
          (i + 1) +
          '</span><strong>' +
          (card ? esc(card.name) : 'Empty') +
          '</strong>' +
          (card ? '<small>' + esc(card.effect) + '</small>' : '') +
          '<span class="backpack-actions">' +
          (canSwap ? '<button class="swap-backpack" type="button" aria-label="Replace slot ' + (i + 1) + ' with ' + esc(chosen.name) + '">Swap</button>' : '') +
          '</span></div>'
        );
      }).join('');
      return (
        '<div class="seat' +
        (p.id === state.active && state.started ? ' active' : '') +
        '">' +
        '<span class="seat-top"><span class="seat-name">' +
        esc(p.name) +
        '</span>' +
        '<span class="god-scores" aria-label="Blue ' +
        points.blue +
        ' points, red ' +
        points.red +
        ' points">' +
        '<span class="god-score blue" title="Blue value">Blue <b>' +
        points.blue +
        '</b></span>' +
        '<span class="god-score red" title="Red value">Red <b>' +
        points.red +
        '</b></span></span>' +
        '<em>' +
        p.played +
        ' played</em></span>' +
        healthHTML(p) +
        keptHTML(p) +
        '<div class="backpack-row">' +
        slots +
        '</div>' +
        '<div class="bank-slot"><span>Bank slot</span><strong>' +
        (p.bank ? esc(p.bank.name) : 'Empty') +
        '</strong>' +
        (p.bank && isPicking() && state.phase === 'play' && p.id === state.active ? '<button class="play-banked" type="button">Play</button>' : '') +
        '</div>' +
        '</div>'
      );
    })
    .join('');
  return (
    '<div class="player' +
    (state.started ? ' active' : '') +
    '">' +
    '<div class="player-head"><span class="player-name plain">Shared Bridge Hand</span>' +
    '<span class="player-meta">' +
    cards.length +
    ' cards · ' +
    played +
    ' played this game</span></div>' +
    '<div class="hand">' +
    handHTML(cards, state.lastFresh || [], isPicking() && state.phase === 'play') +
    '</div>' +
    '</div>' +
    '<div class="panel"><h3>Player Backpacks &amp; Banks</h3><div class="seat-row">' +
    seats +
    '</div></div>'
  );
}

function renderBridge() {
  const targeting = isPicking() && state.phase === 'target';
  const risk = state.forecast ? state.forecast.segmentRisk : null;

  const segs = state.bridge
    .map((hp, i) => {
      const cls = 'seg hp-' + hp + (hp === 0 ? ' broken' : '') + (targeting && hp > 0 ? ' targetable' : '');
      let pips = '';
      for (let p = 0; p < state.cfg.segmentHp; p++) {
        pips += '<span class="pip' + (p < hp ? ' on' : '') + '"></span>';
      }
      const note = hp === 0 ? 'snapped' : risk ? Math.round(risk[i] * 100) + '% to break here' : '&nbsp;';
      return (
        '<div class="' +
        cls +
        '" data-seg="' +
        i +
        '" aria-label="Segment ' +
        (i + 1) +
        ': ' +
        hp +
        ' of ' +
        state.cfg.segmentHp +
        ' rope health"' +
        (targeting && hp > 0 ? ' role="button" tabindex="0"' : '') +
        '>' +
        '<div class="seg-label">Seg ' +
        (i + 1) +
        '</div>' +
        '<div class="pips">' +
        pips +
        '</div>' +
        '<div class="seg-hp">' +
        hp +
        ' hp</div>' +
        '<div class="seg-risk">' +
        note +
        '</div>' +
        '</div>'
      );
    })
    .join('');

  document.getElementById('bridge').innerHTML =
    '<div class="bridge-head"><h3>The Bridge</h3>' +
    '<span class="bridge-hp">' +
    bridgeHp() +
    ' / ' +
    bridgeMax() +
    ' hp across ' +
    SEGMENTS +
    ' segments</span></div>' +
    '<div class="bridge-scene"><div class="bridge-row">' +
    segs +
    '</div></div>';
  document.getElementById('forecast').innerHTML = forecastHTML();

  const banner = document.getElementById('broken-banner');
  if (state.broken) {
    banner.className = 'broken-banner';
    banner.innerHTML =
      'The bridge snapped on turn ' +
      state.brokenTurn +
      ' — segment ' +
      (state.brokenSegment + 1) +
      ' gave way.' +
      '<span>Phase 2 begins. Press Start Game to run it again.</span>';
  } else {
    banner.className = '';
    banner.innerHTML = '';
  }
}

function forecastHTML() {
  if (state.broken) return '';
  const f = state.forecast;
  if (!f) return '';

  const pct = (v) => Math.round(v * 100) + '%';
  const survived = f.broke < f.trials;
  const headline =
    f.median === null
      ? 'The bridge held in every simulation.'
      : 'Snaps around <b>turn ' + (f.from + f.median) + '</b> (' + (f.median === 0 ? 'this turn' : 'in ' + f.median + ' turns') + ')';

  const peak = Math.max(...f.hist, 1);
  const bars = f.hist
    .map((n, i) => {
      const h = Math.round((n / peak) * 100);
      return (
        '<div class="hist-bar" style="height:' +
        Math.max(h, n ? 4 : 1) +
        '%" title="turn ' +
        (f.from + i) +
        ': ' +
        Math.round((n / f.trials) * 100) +
        '%"></div>'
      );
    })
    .join('');

  const where = f.fresh ? 'from a fresh deal with this deck' : 'from here';
  const first = f.fresh ? ' · turn 1 <b>' + pct(f.next) + '</b>' : ' · next turn <b>' + pct(f.next) + '</b>';

  return (
    '<div class="forecast">' +
    '<h4>Snap forecast — ' +
    f.trials +
    ' playouts ' +
    where +
    ', random play</h4>' +
    '<div class="forecast-line">' +
    headline +
    first +
    ' · within 5 <b>' +
    pct(f.in5) +
    '</b>' +
    ' · within 10 <b>' +
    pct(f.in10) +
    '</b>' +
    ' · within 20 <b>' +
    pct(f.in20) +
    '</b>' +
    (survived ? ' · held past ' + FORECAST_HORIZON + ' turns in ' + pct(1 - f.broke / f.trials) : '') +
    '</div>' +
    '<div class="hist">' +
    bars +
    '</div>' +
    '<div class="hist-axis"><span>turn ' +
    f.from +
    '</span><span>turn ' +
    (f.from + HIST_TURNS - 1) +
    '</span></div>' +
    '</div>'
  );
}

function isPicking() {
  return state.started && state.cfg.manual && !state.broken && !state.pendingGod;
}

function renderTurnBar() {
  const bar = document.getElementById('turn-bar');
  if (state.started && state.cfg.manual && state.pendingGod && !state.broken) {
    bar.className = 'panel turn-bar discarding';
    bar.innerHTML = '<span class="turn-bar-text">Resolve the Act of God in the shared hand before continuing.</span>';
    return;
  }
  if (!isPicking()) {
    bar.className = '';
    bar.innerHTML = '';
    return;
  }

  const player = state.players[state.active];
  if (state.phase === 'target') {
    const left = state.pendingTargets;
    bar.className = 'panel turn-bar discarding';
    bar.innerHTML =
      '<span class="turn-bar-text">' + esc(player.name + ' — Veridian Talon: pick a segment to degrade' + (left > 1 ? ' (' + left + ' left)' : '')) + '</span>';
    return;
  }
  const chosen = state.selected.length === 1 ? player.hand.find((card) => card.uid === state.selected[0]) : null;
  const treasure = isTreasure(chosen);
  bar.className = 'panel turn-bar';
  bar.innerHTML =
    '<span class="turn-bar-text">' +
    esc(player.name) +
    ' — select a shared card, then choose an action. Keep going until you pass.</span>' +
    '<button id="play-selection"' +
    (chosen && !treasure ? '' : ' disabled') +
    '>Play</button>' +
    '<button id="discard-selection" class="danger"' +
    (chosen ? '' : ' disabled') +
    '>Discard</button>' +
    '<button id="bank-selection" class="secondary"' +
    (chosen && !treasure ? '' : ' disabled') +
    '>Bank</button>' +
    '<button id="pass-turn" class="secondary">Pass Turn</button>' +
    (treasure
      ? '<span class="turn-hint">To keep this treasure, Swap it into a backpack slot. The replaced card goes to discard.</span>'
      : chosen && chosen.type === 'item'
        ? '<span class="turn-hint">You can also Swap this item into one of your backpack slots.</span>'
        : '');
}

function renderPlayers() {
  const view = document.getElementById('players-view');
  view.className = 'players shared';
  view.innerHTML = sharedPanelHTML();
}

function renderLog() {
  document.getElementById('log').innerHTML = state.log
    .map((e) => {
      const turn = e.turn === null ? '' : 'T' + e.turn;
      const who = e.who ? '<span class="log-who">' + esc(e.who) + '</span> ' : '';
      const body = e.parts.map((p) => '<span class="log-' + p[0] + '">' + esc(p[1]) + '</span>').join('<span class="log-note"> · </span>');
      return '<div class="log-entry"><span class="log-turn">' + turn + '</span>' + who + body + '</div>';
    })
    .join('');
}

function renderDiscard() {
  const cards = state.discard;
  document.getElementById('discard-count').textContent = cards.length;
  const view = document.getElementById('discard-view');
  if (!cards.length) {
    view.innerHTML = '<p class="discard-empty">The discard pile is empty.</p>';
    return;
  }

  const groups = new Map();
  for (const card of cards.slice().reverse()) {
    const key = card.deck + ':' + card.name;
    if (!groups.has(key)) groups.set(key, { card, count: 0 });
    groups.get(key).count++;
  }
  view.innerHTML =
    '<p class="discard-summary">' +
    cards.length +
    ' cards in the pile · most recently discarded types first</p>' +
    '<div class="discard-grid">' +
    [...groups.values()]
      .map(({ card, count }) => '<div class="discard-card">' + cardHTML(card, false, false) + '<span class="discard-qty">' + count + ' in discard</span></div>')
      .join('') +
    '</div>';
}

/* ------------------------------ deck builder ------------------------------ */

let deckBuilderBuilt = false;

function buildDeckBuilder() {
  for (const deck of DECKS) {
    const blocks = CATEGORIES.map((cat) => {
      const rows = CARD_DEFS.filter((d) => d.type === cat.key)
        .map((d) => {
          const note = d.effect && d.effect !== 'n/a' ? '<em>' + esc(d.effect) + '</em>' : '<em class="db-na">no simulated effect</em>';
          return (
            '<div class="db-row">' +
            '<span class="db-name">' +
            esc(d.name) +
            note +
            '</span>' +
            '<span class="db-step">' +
            '<button class="db-btn" data-deck="' +
            deck +
            '" data-card="' +
            esc(d.name) +
            '" data-delta="-1" aria-label="one fewer ' +
            esc(d.name) +
            ' in Deck ' +
            deck +
            '">−</button>' +
            '<input class="db-qty" type="number" min="0" max="' +
            MAX_QTY +
            '" step="1" ' +
            'data-deck="' +
            deck +
            '" data-card="' +
            esc(d.name) +
            '" value="' +
            (deckQty[deck][d.name] || 0) +
            '" />' +
            '<button class="db-btn" data-deck="' +
            deck +
            '" data-card="' +
            esc(d.name) +
            '" data-delta="1" aria-label="one more ' +
            esc(d.name) +
            ' in Deck ' +
            deck +
            '">+</button>' +
            '</span>' +
            '</div>'
          );
        })
        .join('');

      return (
        '<div class="db-cat' +
        (cat.key === 'god' ? ' god' : '') +
        '">' +
        '<div class="db-cat-head">' +
        '<span class="swatch" style="background:' +
        cat.colour +
        '"></span>' +
        '<span class="db-cat-label">' +
        esc(cat.label) +
        (cat.note ? ' <i>' + esc(cat.note) + '</i>' : '') +
        '</span>' +
        '<span class="db-cat-total" data-deck="' +
        deck +
        '" data-cat="' +
        cat.key +
        '">0</span>' +
        '</div>' +
        rows +
        '</div>'
      );
    }).join('');

    document.getElementById('deck-grid-' + deck.toLowerCase()).innerHTML = blocks;
  }
}

function updateDeckBuilderValues() {
  for (const input of document.querySelectorAll('#deck-builders .db-qty')) {
    const value = String(state.cfg.qty[input.dataset.deck][input.dataset.card] || 0);
    // Leave the box alone while it is being typed into.
    if (document.activeElement !== input && input.value !== value) input.value = value;
  }
  for (const el of document.querySelectorAll('.db-cat-total')) {
    el.textContent = (typeTotals(state.cfg, el.dataset.deck)[el.dataset.cat] || 0) + ' cards';
  }
  for (const deck of DECKS) {
    document.getElementById('deck-total-' + deck.toLowerCase()).textContent = deckSize(state.cfg, deck) + ' cards';
    document.getElementById('deck-reset-' + deck.toLowerCase()).disabled = isDefaultDeck(deck);
  }
}

function renderDeckBuilder() {
  if (!deckBuilderBuilt) {
    buildDeckBuilder();
    deckBuilderBuilt = true;
  }
  updateDeckBuilderValues();
}

function isDefaultDeck(deck) {
  return CARD_DEFS.every((d) => (deckQty[deck][d.name] || 0) === DEFAULT_QTY[d.name]);
}

function setQty(deck, name, value) {
  const n = Math.max(0, Math.min(MAX_QTY, Math.round(Number(value) || 0)));
  if (deckQty[deck][name] === n) return false;
  deckQty[deck][name] = n;
  return true;
}

let starterBuilderBuilt = false;

function renderStarterBuilder() {
  if (!starterBuilderBuilt) {
    document.getElementById('starter-grid').innerHTML =
      '<div class="db-cat">' +
      STARTER_DEFS.map(
        (def) =>
          '<div class="db-row"><span class="db-name">' +
          esc(def.name) +
          '<em>' +
          esc(def.effect) +
          '</em></span>' +
          '<span class="db-step"><button class="db-btn" data-card="' +
          esc(def.name) +
          '" data-delta="-1" aria-label="one fewer ' +
          esc(def.name) +
          '">−</button>' +
          '<input class="db-qty" type="number" min="0" max="' +
          MAX_QTY +
          '" step="1" data-card="' +
          esc(def.name) +
          '" value="' +
          starterQty[def.name] +
          '" />' +
          '<button class="db-btn" data-card="' +
          esc(def.name) +
          '" data-delta="1" aria-label="one more ' +
          esc(def.name) +
          '">+</button></span></div>',
      ).join('') +
      '</div>';
    starterBuilderBuilt = true;
  }
  for (const input of document.querySelectorAll('#starter-grid .db-qty')) {
    const value = String(starterQty[input.dataset.card] || 0);
    if (document.activeElement !== input && input.value !== value) input.value = value;
  }
  document.getElementById('starter-total').textContent = starterSize(state.cfg) + ' cards';
  document.getElementById('starter-reset').disabled = STARTER_DEFS.every((d) => starterQty[d.name] === DEFAULT_STARTER_QTY[d.name]);
}

function setStarterQty(name, value) {
  const n = Math.max(0, Math.min(MAX_QTY, Math.round(Number(value) || 0)));
  if (starterQty[name] === n) return false;
  starterQty[name] = n;
  return true;
}

/* -------------------------------- trackers -------------------------------- */

function countBy(cards) {
  const out = {};
  for (const c of cards) {
    const key = c.deck + ':' + c.name;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function renderTracker() {
  const inHand = countBy(heldCards());
  const inDeck = countBy(state.deck);
  const inReserve = countBy(state.reserveDeck);
  const inDiscard = countBy(state.discard);
  const kept = countBy(keptCards());
  const out = countBy(state.removed);
  const cell = (n) => '<td class="num' + (n ? '' : ' zero') + '">' + n + '</td>';

  for (const deck of DECKS) {
    const rows = deckDefs(state.cfg, deck)
      .filter((def) => def.qty > 0)
      .map((def) => {
        const key = deck + ':' + def.name;
        return (
          '<tr><td><span class="swatch" style="background:' +
          TYPE_COLOUR[def.type] +
          '"></span>' +
          esc(def.name) +
          '</td>' +
          '<td class="muted">' +
          esc(TYPE_LABEL[def.type]) +
          '</td>' +
          cell(def.qty) +
          cell((inDeck[key] || 0) + (inReserve[key] || 0)) +
          cell(inHand[key] || 0) +
          cell(inDiscard[key] || 0) +
          cell(kept[key] || 0) +
          cell(out[key] || 0) +
          cell(state.playCounts[key] || 0) +
          cell(state.godFires[key] || 0) +
          cell(state.drawCounts[key] || 0) +
          '</tr>'
        );
      })
      .join('');

    document.getElementById('tracker-' + deck.toLowerCase()).innerHTML =
      '<thead><tr><th>Card</th><th>Group</th><th class="num">Qty</th><th class="num">Deck</th>' +
      '<th class="num">Hands</th><th class="num">Discard</th><th class="num">Kept</th><th class="num">Out</th>' +
      '<th class="num">Played</th><th class="num">Triggered</th><th class="num">Drawn</th></tr></thead><tbody>' +
      rows +
      '</tbody>';
  }
}

/* ---------------------------------- controls ------------------------------- */

function startAuto() {
  const speed = Number(document.getElementById('speed').value);
  autoTimer = setInterval(takeTurn, speed);
  document.getElementById('auto').textContent = 'Pause';
}

function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  const btn = document.getElementById('auto');
  if (btn) btn.textContent = 'Auto';
}

function saveLog() {
  const lines = ['turn,player,detail'];
  for (const e of [...state.log].reverse()) {
    const detail = e.parts.map((p) => p[1]).join('; ');
    lines.push([e.turn === null ? '' : e.turn, e.who || '', '"' + detail.replace(/"/g, '""') + '"'].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'card-sim-log.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function bindSlider(id, format) {
  const input = document.getElementById(id);
  const out = document.getElementById(id + '-val');
  const sync = () => (out.textContent = format ? format(input.value) : input.value);
  input.addEventListener('input', sync);
  sync();
}

['players', 'play-min', 'play-max', 'start-health', 'segment-hp'].forEach((id) => bindSlider(id));
bindSlider('speed', (v) => v + 'ms');

// Keep the play min/max sliders from crossing over.
document.getElementById('play-min').addEventListener('input', () => {
  const min = document.getElementById('play-min');
  const max = document.getElementById('play-max');
  if (Number(min.value) > Number(max.value)) {
    max.value = min.value;
    document.getElementById('play-max-val').textContent = max.value;
  }
});
document.getElementById('play-max').addEventListener('input', () => {
  const min = document.getElementById('play-min');
  const max = document.getElementById('play-max');
  if (Number(max.value) < Number(min.value)) {
    min.value = max.value;
    document.getElementById('play-min-val').textContent = min.value;
  }
});

document.getElementById('players-view').addEventListener('click', (e) => {
  if (e.target.closest('.resolve-god')) {
    resolvePendingGod();
    return;
  }
  if (e.target.closest('.play-banked')) {
    playBanked();
    return;
  }
  const slot = e.target.closest('.swap-backpack')?.closest('.backpack-card');
  if (slot) {
    replaceBackpack(Number(slot.dataset.slot));
    return;
  }
  const el = e.target.closest('.card.selectable');
  if (el) toggleSelection(Number(el.dataset.uid));
});
document.getElementById('players-view').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('.card.selectable');
  if (!el) return;
  e.preventDefault();
  toggleSelection(Number(el.dataset.uid));
});

document.getElementById('bridge').addEventListener('click', (e) => {
  const el = e.target.closest('.seg.targetable');
  if (el) chooseTarget(Number(el.dataset.seg));
});
document.getElementById('bridge').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('.seg.targetable');
  if (!el) return;
  e.preventDefault();
  chooseTarget(Number(el.dataset.seg));
});

document.getElementById('turn-bar').addEventListener('click', (e) => {
  if (e.target.id === 'play-selection') playSelected();
  if (e.target.id === 'discard-selection') discardSelected();
  if (e.target.id === 'bank-selection') bankSelected();
  if (e.target.id === 'pass-turn') passTurn();
});

// Re-deal on a short delay so holding down a stepper does not re-run the
// forecast on every click.
let deckTimer = null;
function deckChanged() {
  if (deckTimer) clearTimeout(deckTimer);
  updateDeckBuilderValues();
  deckTimer = setTimeout(() => {
    deckTimer = null;
    resetTable();
  }, 140);
}

document.getElementById('deck-builders').addEventListener('click', (e) => {
  const btn = e.target.closest('.db-btn');
  if (!btn) return;
  const deck = btn.dataset.deck;
  const name = btn.dataset.card;
  if (setQty(deck, name, (deckQty[deck][name] || 0) + Number(btn.dataset.delta))) {
    state.cfg.qty = { A: Object.assign({}, deckQty.A), B: Object.assign({}, deckQty.B) };
    deckChanged();
  }
});

document.getElementById('deck-builders').addEventListener('change', (e) => {
  const input = e.target.closest('.db-qty');
  if (!input) return;
  setQty(input.dataset.deck, input.dataset.card, input.value);
  input.value = String(deckQty[input.dataset.deck][input.dataset.card]);
  state.cfg.qty = { A: Object.assign({}, deckQty.A), B: Object.assign({}, deckQty.B) };
  deckChanged();
});

document.getElementById('starter-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.db-btn');
  if (!btn) return;
  if (setStarterQty(btn.dataset.card, (starterQty[btn.dataset.card] || 0) + Number(btn.dataset.delta))) {
    state.cfg.starterQty = Object.assign({}, starterQty);
    renderStarterBuilder();
    deckChanged();
  }
});
document.getElementById('starter-grid').addEventListener('change', (e) => {
  const input = e.target.closest('.db-qty');
  if (!input) return;
  setStarterQty(input.dataset.card, input.value);
  input.value = String(starterQty[input.dataset.card]);
  state.cfg.starterQty = Object.assign({}, starterQty);
  renderStarterBuilder();
  deckChanged();
});
document.getElementById('starter-reset').addEventListener('click', (e) => {
  e.preventDefault();
  starterQty = Object.assign({}, DEFAULT_STARTER_QTY);
  state.cfg.starterQty = Object.assign({}, starterQty);
  renderStarterBuilder();
  deckChanged();
});

document.getElementById('tracker-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  for (const t of document.querySelectorAll('#tracker-tabs .tab')) {
    t.classList.toggle('active', t === tab);
  }
  for (const pane of document.querySelectorAll('#deck-tracker-panel .tab-pane')) {
    pane.classList.toggle('hidden', pane.id !== tab.dataset.pane);
  }
});

document.getElementById('history-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  for (const t of document.querySelectorAll('#history-tabs .tab')) {
    const active = t === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  }
  for (const pane of document.querySelectorAll('#history-panel .tab-pane')) {
    pane.classList.toggle('hidden', pane.id !== tab.dataset.pane);
  }
});

for (const deck of DECKS) {
  document.getElementById('deck-reset-' + deck.toLowerCase()).addEventListener('click', (e) => {
    e.preventDefault();
    deckQty[deck] = Object.assign({}, DEFAULT_QTY);
    state.cfg.qty = { A: Object.assign({}, deckQty.A), B: Object.assign({}, deckQty.B) };
    deckChanged();
  });
}

document.getElementById('new-game').addEventListener('click', startGame);
document.getElementById('next-turn').addEventListener('click', () => {
  stopAuto();
  takeTurn();
});
document.getElementById('auto').addEventListener('click', () => {
  if (autoTimer) stopAuto();
  else startAuto();
});
document.getElementById('skip').addEventListener('click', () => {
  stopAuto();
  for (let i = 0; i < 10; i++) takeTurn();
});
document.getElementById('save-btn').addEventListener('click', saveLog);
document.getElementById('speed').addEventListener('change', () => {
  if (autoTimer) {
    stopAuto();
    startAuto();
  }
});

// Changing table setup returns to an undealt table; turn rules apply from the next turn.
['players', 'start-health', 'segment-hp'].forEach((id) => document.getElementById(id).addEventListener('change', resetTable));
['play-min', 'play-max', 'played-dest', 'turn-mode', 'cut-policy', 'god-auto-discard'].forEach((id) =>
  document.getElementById(id).addEventListener('change', () => {
    if (!state) return;
    state.cfg = readConfig();
    if (state.cfg.manual) stopAuto();
    if (state.cfg.godAutoDiscard && state.pendingGod) {
      resolvePendingGod();
      return;
    }
    if (state.started && state.phase === 'target' && !state.cfg.manual) {
      resolveCuts(state.pendingTargets);
      state.pendingTargets = 0;
      state.phase = 'play';
      if (state.broken) {
        finishTurn(state.players[state.active], [], [], true);
        return;
      }
    }
    state.selected = [];
    updateForecast();
    render();
  }),
);

resetTable();
