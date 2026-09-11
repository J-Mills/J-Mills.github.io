/* ---------------------------------- deck ---------------------------------- */

// The five card groups. Acts of God live in their own deck, drawn on a timer.
const CATEGORIES = [
  { key: 'aid', label: 'Player Aids', colour: '#2f9e8f', note: '' },
  { key: 'gift', label: 'Gifts from the Gods', colour: '#c79a2b', note: 'permanent climb items' },
  { key: 'item', label: 'Items', colour: '#8a5cd6', note: 'single use' },
  { key: 'action', label: 'Actions', colour: '#3b7dd8', note: '' },
  { key: 'god', label: 'Acts of God', colour: '#d9694a', note: 'separate deck, on a timer' },
];

// `fx` is the only part the simulation acts on; everything else is just a card.
const CARD_DEFS = [
  { name: 'Free Actions', type: 'aid', qty: 1, effect: 'n/a' },

  { name: 'Pickaxe', type: 'gift', qty: 1, effect: 'n/a' },
  { name: 'Climbing Equipment', type: 'gift', qty: 1, effect: 'n/a' },
  { name: 'Bristol Gold', type: 'gift', qty: 2, effect: 'n/a' },
  { name: 'Grappling Hook', type: 'gift', qty: 1, effect: 'n/a' },

  { name: 'Veridian Talon', type: 'item', qty: 2, effect: 'Severs a random rope segment — degrades it by 1', fx: 'cut' },
  { name: 'Lasso', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Wind Fan', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Hissing Hourglass', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Horn of the Ancients', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Chant of Solitude', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Hooky Stick', type: 'item', qty: 2, effect: 'n/a' },
  { name: 'Echo Conch', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Cinnabar Dust', type: 'item', qty: 1, effect: 'n/a' },
  { name: 'Blood Jade Scarab', type: 'item', qty: 1, effect: 'Moves 1 HP from a random player to the current player', fx: 'move-hp' },

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

// Live quantities. The deck builder writes here; everything else reads cfg.qty.
let deckQty = Object.assign({}, DEFAULT_QTY);

function deckDefs(cfg) {
  return CARD_DEFS.map((d) => Object.assign({}, d, { qty: cfg.qty[d.name] || 0 }));
}

function mainDefs(cfg) {
  return deckDefs(cfg).filter((d) => d.type !== 'god');
}

function godDefs(cfg) {
  return deckDefs(cfg).filter((d) => d.type === 'god');
}

function sumQty(defs) {
  return defs.reduce((a, d) => a + d.qty, 0);
}

function deckSize(cfg) {
  return sumQty(mainDefs(cfg));
}

function godDeckSize(cfg) {
  return sumQty(godDefs(cfg));
}

function typeTotals(cfg) {
  return deckDefs(cfg).reduce((acc, d) => {
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

function buildFrom(defs) {
  const cards = [];
  for (const def of defs) {
    for (let i = 0; i < def.qty; i++) {
      cards.push({ uid: uid++, name: def.name, effect: def.effect, type: def.type, fx: def.fx });
    }
  }
  return cards;
}

function buildDeck(cfg) {
  return buildFrom(mainDefs(cfg));
}

function buildGods(cfg) {
  return buildFrom(godDefs(cfg));
}

function readConfig() {
  const playMin = Number(document.getElementById('play-min').value);
  const playMax = Number(document.getElementById('play-max').value);
  return {
    playerCount: Number(document.getElementById('players').value),
    sharedHand: document.getElementById('hand-mode').value === 'shared',
    manual: document.getElementById('turn-mode').value === 'manual',
    cutPolicy: document.getElementById('cut-policy').value,
    cutSeverity: document.getElementById('cut-severity').value,
    handSize: Number(document.getElementById('hand-size').value),
    playMin: Math.min(playMin, playMax),
    playMax: Math.max(playMin, playMax),
    playedDest: document.getElementById('played-dest').value,
    startHealth: Number(document.getElementById('start-health').value),
    segmentHp: Number(document.getElementById('segment-hp').value),
    godEvery: Number(document.getElementById('god-every').value),
    qty: Object.assign({}, deckQty),
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
      kept: [],
      fresh: [],
      played: 0,
      health: cfg.startHealth,
      maxHealth: cfg.startHealth,
    });
  }
  if (cfg.sharedHand) {
    const shared = [];
    for (const p of players) p.hand = shared;
  }
  return players;
}

// Every card currently held, counted once even when the hand is shared.
function heldCards() {
  if (state.cfg.sharedHand) return state.players[0].hand;
  const all = [];
  for (const p of state.players) all.push(...p.hand);
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
    discard: [],
    removed: [],
    gods: [],
    godDiscard: [],
    godFires: {},
    godsFired: 0,
    godReshuffles: 0,
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
    pendingDiscard: 0,
    pendingTargets: 0,
    turnPlayed: [],
    lastFresh: [],
  };
}

function setupText(cfg) {
  return cfg.sharedHand
    ? cfg.playerCount + ' players sharing one hand — press Start Game to deal ' + cfg.handSize + ' cards'
    : cfg.playerCount + ' players — press Start Game to deal ' + cfg.handSize + ' cards each';
}

// Pre-game: seats laid out and both decks intact, but nothing dealt yet.
function resetTable() {
  stopAuto();

  const cfg = readConfig();
  state = freshState(cfg);
  state.deck = buildDeck(cfg);
  state.gods = buildGods(cfg);

  addLog(null, [['note', 'Table set for ' + setupText(cfg)]]);
  updateForecast();
  render();
}

function dealHands() {
  const cfg = state.cfg;
  if (cfg.sharedHand) {
    drawCards(state.players[0], cfg.handSize);
  } else {
    // Deal one card at a time around the table.
    for (let c = 0; c < cfg.handSize; c++) {
      for (const p of state.players) drawCards(p, 1);
    }
  }
  for (const p of state.players) p.fresh = [];
  state.lastFresh = [];
}

function startGame() {
  stopAuto();

  const cfg = readConfig();
  state = freshState(cfg);
  state.deck = shuffle(buildDeck(cfg));
  state.gods = shuffle(buildGods(cfg));
  state.started = true;
  state.turn = 1;

  dealHands();

  const dealt = cfg.sharedHand
    ? cfg.playerCount + ' players sharing one hand of ' + cfg.handSize + ' cards'
    : cfg.playerCount + ' players dealt ' + cfg.handSize + ' cards each';
  addLog(null, [['note', 'Game start — ' + dealt]]);
  addLog(null, [
    [
      'note',
      deckSize(cfg) + '-card deck · ' + godDeckSize(cfg) + ' Acts of God · ' + godTimingText(cfg),
    ],
  ]);

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

// A sever takes the whole segment; the softer reading is a single point.
function applyCut(index) {
  const amount = state.cfg.cutSeverity === 'sever' ? state.bridge[index] : 1;
  return damageSegment(index, 'Veridian Talon', amount);
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
  state.turnMoves.push(
    '1 HP from ' + donor.name + (donor.health === 0 ? ' (down)' : '') + ' to ' + player.name,
  );
}

/* ------------------------------- acts of god ------------------------------ */

function godTimingText(cfg) {
  return cfg.godEvery > 0
    ? 'one drawn every ' + (cfg.godEvery === 1 ? 'turn' : cfg.godEvery + ' turns')
    : 'never drawn';
}

function godDue() {
  const every = state.cfg.godEvery;
  return every > 0 && state.turn % every === 0;
}

function nextGodTurn() {
  const every = state.cfg.godEvery;
  if (every <= 0) return null;
  const from = Math.max(state.turn, 1);
  return from + ((every - (from % every)) % every);
}

function fireGod() {
  if (state.broken) return null;
  if (state.gods.length === 0) {
    if (state.godDiscard.length === 0) return null;
    state.gods = shuffle(state.godDiscard);
    state.godDiscard = [];
    state.godReshuffles++;
  }

  const card = state.gods.pop();
  state.godDiscard.push(card);
  state.godFires[card.name] = (state.godFires[card.name] || 0) + 1;
  state.godsFired++;

  if (card.fx === 'weaken') damageSegment(randInt(0, SEGMENTS - 1), card.name, 1);
  if (card.fx === 'strain') runStrengthTest(card.name);
  return card;
}

/* ---------------------------------- rules --------------------------------- */

function drawCards(player, n) {
  const drawn = [];
  const cap = deckSize(state.cfg) + 1;
  let pulled = 0;

  while (drawn.length < n) {
    if (state.deck.length === 0) {
      if (state.cfg.reshuffle && state.discard.length > 0) {
        state.deck = shuffle(state.discard);
        state.discard = [];
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
    state.drawCounts[card.name] = (state.drawCounts[card.name] || 0) + 1;
    player.hand.push(card);
    drawn.push(card);
  }

  player.fresh = drawn.map((c) => c.uid);
  state.lastFresh = player.fresh;
  return { drawn };
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
    state.playCounts[card.name] = (state.playCounts[card.name] || 0) + 1;

    // Gifts from the Gods are permanent: they stay with the player, out of the cycle.
    if (card.type === 'gift') player.kept.push(card);
    else if (state.cfg.playedDest === 'removed') state.removed.push(card);
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

function finishTurn(player, played, discarded) {
  for (const card of discarded) state.discard.push(card);
  for (const p of state.players) p.fresh = [];

  let drawn = [];
  if (!state.broken) {
    drawn = drawCards(player, Math.max(0, state.cfg.handSize - player.hand.length)).drawn;
  }
  const god = godDue() ? fireGod() : null;

  const parts = [];
  parts.push(['play', played.length ? 'played ' + names(played) : 'played nothing']);
  const gifts = played.filter((c) => c.type === 'gift');
  if (gifts.length) parts.push(['keep', 'kept ' + names(gifts)]);
  if (state.turnHeal) {
    parts.push(['heal', 'healed +' + state.turnHeal + ' to ' + state.turnHealTo + ' strength']);
  }
  for (const move of state.turnMoves) parts.push(['heal', 'moved ' + move]);
  if (discarded.length) parts.push(['discard', 'discarded ' + names(discarded)]);
  if (drawn.length) parts.push(['draw', 'drew ' + drawn.length]);
  if (god) parts.push(['god', 'Act of God: ' + god.name]);
  for (const s of state.turnStrain) parts.push(['strain', strainText(s)]);
  if (state.turnHits.length) parts.push(['bridge', state.turnHits.map(hitText).join(', ')]);
  if (!state.broken && player.hand.length < state.cfg.handSize) {
    parts.push(['note', 'could not refill (deck exhausted)']);
  }
  addLog(player, parts);

  state.turnHits = [];
  state.turnStrain = [];
  state.turnMoves = [];
  state.turnHeal = 0;
  state.turnHealTo = 0;
  state.turn++;
  state.active = (state.active + 1) % state.players.length;
  state.phase = 'play';
  state.selected = [];
  state.pendingDiscard = 0;
  state.pendingTargets = 0;
  state.turnPlayed = [];
  updateForecast();
  render();
}

function takeTurn() {
  if (!state || !state.started || state.cfg.manual || state.broken) return;
  const cfg = state.cfg;
  const player = state.players[state.active];

  const wanted = randInt(cfg.playMin, cfg.playMax);
  const played = takeRandom(player.hand, Math.min(wanted, player.hand.length));
  applyPlays(player, played);
  resolveCuts(countCuts(played));

  const discarded = takeRandom(player.hand, discardsDueAfter(player, played.length));
  finishTurn(player, played, discarded);
}

// Once the plays are locked in, move to discarding (or straight to the draw).
function afterPlays(player, played) {
  const due = state.broken ? 0 : discardsDueAfter(player, played.length);
  if (due === 0) {
    finishTurn(player, played, []);
    return;
  }
  state.turnPlayed = played;
  state.pendingDiscard = due;
  state.phase = 'discard';
  render();
}

// Manual mode: pick cards to play, aim any cuts, then pick the discards.
function confirmSelection() {
  const player = state.players[state.active];

  if (state.phase === 'play') {
    const played = removeByUid(player.hand, state.selected);
    applyPlays(player, played);
    state.selected = [];

    const cuts = countCuts(played);
    if (cuts > 0 && !state.broken) {
      if (state.cfg.cutPolicy === 'pick') {
        state.turnPlayed = played;
        state.pendingTargets = cuts;
        state.phase = 'target';
        render();
        return;
      }
      resolveCuts(cuts);
    }
    afterPlays(player, played);
    return;
  }

  const discarded = removeByUid(player.hand, state.selected);
  finishTurn(player, state.turnPlayed, discarded);
}

// Manual mode: the player aims a Veridian Talon at a segment.
function chooseTarget(index) {
  if (!isPicking() || state.phase !== 'target') return;
  if (!applyCut(index)) return;

  // The cut changes the odds, so refresh them before the board redraws.
  updateForecast();
  state.pendingTargets--;
  if (state.broken || state.pendingTargets === 0) {
    afterPlays(state.players[state.active], state.turnPlayed);
    return;
  }
  render();
}

function selectionCap() {
  return state.phase === 'play'
    ? Math.min(state.cfg.playMax, state.players[state.active].hand.length)
    : state.pendingDiscard;
}

function toggleSelection(cardUid) {
  const i = state.selected.indexOf(cardUid);
  if (i >= 0) state.selected.splice(i, 1);
  else if (state.selected.length < selectionCap()) state.selected.push(cardUid);
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
  c.discard = s.discard.slice();
  c.removed = s.removed.slice();
  c.gods = s.gods.slice();
  c.godDiscard = s.godDiscard.slice();
  c.bridge = s.bridge.slice();
  c.active = s.active;
  c.turn = s.turn;
  c.broken = s.broken;
  c.brokenTurn = s.brokenTurn;
  c.brokenSegment = s.brokenSegment;
  c.starved = s.starved;
  c.started = s.started;

  const shared = s.cfg.sharedHand ? s.players[0].hand.slice() : null;
  c.players = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: shared || p.hand.slice(),
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
  s.deck = shuffle(buildDeck(s.cfg));
  s.gods = shuffle(buildGods(s.cfg));
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
  renderTurnBar();
  renderPlayers();
  renderLog();
  renderTracker();

  const auto = state.started && !state.cfg.manual && !state.broken;
  for (const id of ['next-turn', 'auto', 'skip']) {
    document.getElementById(id).disabled = !auto;
  }
  document.getElementById('save-btn').disabled = !state.started;
  document.getElementById('new-game').textContent = state.started ? 'New Game' : 'Start Game';
  document.getElementById('hand-size-label').textContent = state.cfg.sharedHand ? 'Shared hand size' : 'Hand size';
  document.getElementById('health-note').textContent =
    'Strength Test and Divine Thunderstorm each give every player a 50% chance to lose 1 (net 0.5). ' +
    'Heal and Strength of the Jaguars restore 1, up to ' + state.cfg.startHealth + '.';
  document.getElementById('bridge-note').textContent =
    SEGMENTS + ' segments × ' + state.cfg.segmentHp + ' hp — the bridge snaps when any one segment reaches 0.';
  document.getElementById('god-note').textContent =
    godDeckSize(state.cfg) + ' Acts of God, ' + godTimingText(state.cfg) +
    ' at the end of the turn. They are their own deck and never mix into the player deck.';
  document.getElementById('deck-note').textContent =
    'Quantities are live: change any number and the table re-sets with the new deck, so the snap forecast ' +
    'at the top of the page updates straight away.';
  document.getElementById('discard-note').textContent =
    'Anything not played is discarded, so ' + state.cfg.playMax + ' cards leave the hand each turn.';
}

function renderLegend() {
  const held = {};
  for (const c of heldCards()) held[c.type] = (held[c.type] || 0) + 1;
  const kept = keptCards().length;

  const totals = typeTotals(state.cfg);
  const items = CATEGORIES.map((cat) => {
    const total = totals[cat.key] || 0;
    let counts;
    if (cat.key === 'god') counts = total + ' total · ' + state.gods.length + ' left in the deck';
    else if (cat.key === 'gift') {
      counts = total + ' total' + (state.started ? ' · ' + kept + ' kept' : '');
    } else {
      counts = total + ' total' + (state.started ? ' · ' + (held[cat.key] || 0) + ' in hands' : '');
    }
    return (
      '<span class="legend-item">' +
      '<span class="legend-key" style="background:' + cat.colour + '"></span>' +
      '<span class="legend-label">' + esc(cat.label) + '</span>' +
      '<span class="legend-count">' + esc(counts) + '</span>' +
      '</span>'
    );
  });

  document.getElementById('legend').innerHTML =
    items.join('') +
    '<span class="legend-total">' + deckSize(state.cfg) + '-card deck · ' +
    godDeckSize(state.cfg) + ' Acts of God</span>';
}

function renderStats() {
  const s = state;
  const round = Math.floor((s.turn - 1) / s.players.length) + 1;
  const nextGod = nextGodTurn();
  const tiles = [
    { k: 'Turn', v: s.started ? s.turn : '—', sub: s.started ? 'round ' + round : 'not started' },
    {
      k: 'Active',
      v: s.started ? s.players[s.active].name.replace('Player ', 'P') : '—',
      sub: s.started ? 'to act' : 'awaiting deal',
    },
    { k: 'Deck', v: s.deck.length, sub: 'of ' + deckSize(s.cfg) },
    { k: 'In hands', v: heldCards().length, sub: s.cfg.sharedHand ? 'shared hand' : s.players.length + ' players' },
    { k: 'Discard', v: s.discard.length, sub: s.reshuffles + ' reshuffles' },
    { k: 'Gifts kept', v: keptCards().length, sub: 'permanent' },
    {
      k: 'Acts of God',
      v: s.godsFired,
      sub: nextGod === null ? 'switched off' : s.started ? 'next on turn ' + nextGod : 'every ' + s.cfg.godEvery + ' turns',
    },
    {
      k: 'Party',
      v: partyHealth(),
      sub: playersDown() ? playersDown() + ' down' : 'of ' + partyMax() + ' strength',
    },
    {
      k: 'Bridge',
      v: s.broken ? 'SNAP' : bridgeHp(),
      sub: s.broken ? 'turn ' + s.brokenTurn : 'of ' + bridgeMax() + ' hp',
    },
    { k: 'Out of play', v: s.removed.length, sub: s.cfg.playedDest === 'removed' ? 'played cards' : 'none' },
  ];
  document.getElementById('stats').innerHTML = tiles
    .map((t) => '<div class="stat"><div class="k">' + t.k + '</div><div class="v">' + esc(t.v) + '</div><div class="sub">' + esc(t.sub) + '</div></div>')
    .join('');
}

function healthHTML(p) {
  let pips = '';
  for (let i = 0; i < p.maxHealth; i++) {
    pips += '<span class="hpip' + (i < p.health ? ' on' : '') + '"></span>';
  }
  const label = p.health === 0 ? 'down' : p.health + ' / ' + p.maxHealth + ' strength';
  return (
    '<div class="health hp-' + p.health + (p.health === 0 ? ' down' : '') + '">' +
    '<span class="health-pips">' + pips + '</span>' +
    '<span class="health-hp">' + label + '</span>' +
    '</div>'
  );
}

function cardHTML(card, fresh, selectable) {
  const cls =
    (fresh ? ' fresh' : '') +
    (selectable ? ' selectable' : '') +
    (state.selected.includes(card.uid) ? ' selected' : '');
  const sub = card.effect && card.effect !== 'n/a' ? card.effect : TYPE_LABEL[card.type];
  return (
    '<div class="card t-' + card.type + cls + '" data-uid="' + card.uid + '">' +
    (fresh ? '<div class="card-tag">drawn</div>' : '') +
    '<div class="cn">' + esc(card.name) + '</div>' +
    '<div class="ce">' + esc(sub) + '</div>' +
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
  const chips = p.kept
    .map((c) => '<span class="kept-chip">' + esc(c.name) + '</span>')
    .join('');
  return '<div class="kept"><span class="kept-label">Kept</span>' + chips + '</div>';
}

function playerPanelHTML(p) {
  return (
    '<div class="player' + (p.id === state.active && state.started ? ' active' : '') + '">' +
    '<div class="player-head"><span class="player-name">' + esc(p.name) + '</span>' +
    '<span class="player-meta">' + p.hand.length + ' cards · ' + p.played + ' played</span></div>' +
    healthHTML(p) +
    keptHTML(p) +
    '<div class="hand">' + handHTML(p.hand, p.fresh, isPicking() && p.id === state.active) + '</div>' +
    '</div>'
  );
}

function sharedPanelHTML() {
  const cards = state.players[0].hand;
  const played = state.players.reduce((a, p) => a + p.played, 0);
  const seats = state.players
    .map(
      (p) =>
        '<span class="seat' + (p.id === state.active && state.started ? ' active' : '') + '">' +
        '<span class="seat-top">' + esc(p.name) + '<em>' + p.played + ' played</em></span>' +
        healthHTML(p) +
        keptHTML(p) +
        '</span>',
    )
    .join('');
  return (
    '<div class="player' + (state.started ? ' active' : '') + '">' +
    '<div class="player-head"><span class="player-name plain">Shared Hand</span>' +
    '<span class="player-meta">' + cards.length + ' cards · ' + played + ' played this game</span></div>' +
    '<div class="hand">' + handHTML(cards, state.lastFresh || [], isPicking()) + '</div>' +
    '</div>' +
    '<div class="panel"><h3>Turn Order</h3><div class="seat-row">' + seats + '</div></div>'
  );
}

function renderBridge() {
  const targeting = isPicking() && state.phase === 'target';
  const risk = state.forecast ? state.forecast.segmentRisk : null;

  const segs = state.bridge
    .map((hp, i) => {
      const cls =
        'seg hp-' + hp + (hp === 0 ? ' broken' : '') + (targeting && hp > 0 ? ' targetable' : '');
      let pips = '';
      for (let p = 0; p < state.cfg.segmentHp; p++) {
        pips += '<span class="pip' + (p < hp ? ' on' : '') + '"></span>';
      }
      const note = hp === 0
        ? 'snapped'
        : risk
          ? Math.round(risk[i] * 100) + '% to break here'
          : '&nbsp;';
      return (
        '<div class="' + cls + '" data-seg="' + i + '">' +
        '<div class="seg-label">Seg ' + (i + 1) + '</div>' +
        '<div class="pips">' + pips + '</div>' +
        '<div class="seg-hp">' + hp + ' hp</div>' +
        '<div class="seg-risk">' + note + '</div>' +
        '</div>'
      );
    })
    .join('');

  document.getElementById('bridge').innerHTML =
    '<div class="bridge-head"><h3>The Bridge</h3>' +
    '<span class="bridge-hp">' + bridgeHp() + ' / ' + bridgeMax() + ' hp across ' + SEGMENTS + ' segments</span></div>' +
    '<div class="bridge-row">' + segs + '</div>' +
    forecastHTML();

  const banner = document.getElementById('broken-banner');
  if (state.broken) {
    banner.className = 'broken-banner';
    banner.innerHTML =
      'The bridge snapped on turn ' + state.brokenTurn + ' — segment ' + (state.brokenSegment + 1) + ' gave way.' +
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
      : 'Snaps around <b>turn ' + (f.from + f.median) + '</b> (' +
        (f.median === 0 ? 'this turn' : 'in ' + f.median + ' turns') + ')';

  const peak = Math.max(...f.hist, 1);
  const bars = f.hist
    .map((n, i) => {
      const h = Math.round((n / peak) * 100);
      return '<div class="hist-bar" style="height:' + Math.max(h, n ? 4 : 1) + '%" title="turn ' +
        (f.from + i) + ': ' + Math.round((n / f.trials) * 100) + '%"></div>';
    })
    .join('');

  const where = f.fresh ? 'from a fresh deal with this deck' : 'from here';
  const first = f.fresh ? ' · turn 1 <b>' + pct(f.next) + '</b>' : ' · next turn <b>' + pct(f.next) + '</b>';

  return (
    '<div class="forecast">' +
    '<h4>Snap forecast — ' + f.trials + ' playouts ' + where + ', random play</h4>' +
    '<div class="forecast-line">' + headline +
    first +
    ' · within 5 <b>' + pct(f.in5) + '</b>' +
    ' · within 10 <b>' + pct(f.in10) + '</b>' +
    ' · within 20 <b>' + pct(f.in20) + '</b>' +
    (survived ? ' · held past ' + FORECAST_HORIZON + ' turns in ' + pct(1 - f.broke / f.trials) : '') +
    '</div>' +
    '<div class="hist">' + bars + '</div>' +
    '<div class="hist-axis"><span>turn ' + f.from + '</span><span>turn ' + (f.from + HIST_TURNS - 1) + '</span></div>' +
    '</div>'
  );
}

function isPicking() {
  return state.started && state.cfg.manual && !state.broken;
}

function renderTurnBar() {
  const bar = document.getElementById('turn-bar');
  if (!isPicking()) {
    bar.className = '';
    bar.innerHTML = '';
    return;
  }

  const player = state.players[state.active];
  const sel = state.selected.length;
  let text, label, ready;

  if (state.phase === 'target') {
    const left = state.pendingTargets;
    const verb = state.cfg.cutSeverity === 'sever' ? 'sever' : 'degrade';
    bar.className = 'panel turn-bar discarding';
    bar.innerHTML =
      '<span class="turn-bar-text">' +
      esc(player.name + ' — Veridian Talon: pick a segment to ' + verb + (left > 1 ? ' (' + left + ' left)' : '')) +
      '</span>';
    return;
  }

  if (state.phase === 'play') {
    const max = Math.min(state.cfg.playMax, player.hand.length);
    const min = Math.min(state.cfg.playMin, max);
    const range = min === max ? String(min) : min === 0 ? 'up to ' + max : min + '–' + max;
    text = player.name + ' — select ' + range + ' card' + (max === 1 ? '' : 's') + ' to play';
    ready = sel >= min && sel <= max;
    label = 'Play ' + sel + ' card' + (sel === 1 ? '' : 's');
  } else {
    const need = state.pendingDiscard;
    text = player.name + ' — select ' + need + ' card' + (need === 1 ? '' : 's') + ' to discard';
    ready = sel === need;
    label = 'Discard ' + sel + ' of ' + need;
  }

  const discarding = state.phase === 'discard';
  bar.className = 'panel turn-bar' + (discarding ? ' discarding' : '');
  bar.innerHTML =
    '<span class="turn-bar-text">' + esc(text) + '</span>' +
    '<button id="confirm-selection" class="' + (discarding ? 'danger' : '') + '"' +
    (ready ? '' : ' disabled') + '>' + esc(label) + '</button>';
}

function renderPlayers() {
  const view = document.getElementById('players-view');
  const cls = ['players'];
  if (state.cfg.sharedHand) cls.push('shared');
  if (isPicking() && state.phase === 'discard') cls.push('discarding');
  view.className = cls.join(' ');
  view.innerHTML = state.cfg.sharedHand
    ? sharedPanelHTML()
    : state.players.map(playerPanelHTML).join('');
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

/* ------------------------------ deck builder ------------------------------ */

let deckBuilderBuilt = false;

function buildDeckBuilder() {
  const blocks = CATEGORIES.map((cat) => {
    const rows = CARD_DEFS.filter((d) => d.type === cat.key)
      .map((d) => {
        const note = d.effect && d.effect !== 'n/a'
          ? '<em>' + esc(d.effect) + '</em>'
          : '<em class="db-na">no simulated effect</em>';
        return (
          '<div class="db-row">' +
          '<span class="db-name">' + esc(d.name) + note + '</span>' +
          '<span class="db-step">' +
          '<button class="db-btn" data-card="' + esc(d.name) + '" data-delta="-1" aria-label="one fewer ' + esc(d.name) + '">−</button>' +
          '<input class="db-qty" type="number" min="0" max="' + MAX_QTY + '" step="1" ' +
          'data-card="' + esc(d.name) + '" value="' + (deckQty[d.name] || 0) + '" />' +
          '<button class="db-btn" data-card="' + esc(d.name) + '" data-delta="1" aria-label="one more ' + esc(d.name) + '">+</button>' +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="db-cat' + (cat.key === 'god' ? ' god' : '') + '">' +
      '<div class="db-cat-head">' +
      '<span class="swatch" style="background:' + cat.colour + '"></span>' +
      '<span class="db-cat-label">' + esc(cat.label) + (cat.note ? ' <i>' + esc(cat.note) + '</i>' : '') + '</span>' +
      '<span class="db-cat-total" data-cat="' + cat.key + '">0</span>' +
      '</div>' + rows +
      '</div>'
    );
  }).join('');

  document.getElementById('deck-grid').innerHTML = blocks;
}

function updateDeckBuilderValues() {
  const totals = typeTotals(state.cfg);

  for (const input of document.querySelectorAll('.db-qty')) {
    const value = String(state.cfg.qty[input.dataset.card] || 0);
    // Leave the box alone while it is being typed into.
    if (document.activeElement !== input && input.value !== value) input.value = value;
  }
  for (const el of document.querySelectorAll('.db-cat-total')) {
    el.textContent = (totals[el.dataset.cat] || 0) + ' cards';
  }
  document.getElementById('deck-total').textContent =
    deckSize(state.cfg) + ' in the player deck · ' + godDeckSize(state.cfg) + ' Acts of God';
  document.getElementById('deck-reset').disabled = isDefaultDeck();
}

function renderDeckBuilder() {
  if (!deckBuilderBuilt) {
    buildDeckBuilder();
    deckBuilderBuilt = true;
  }
  updateDeckBuilderValues();
}

function isDefaultDeck() {
  return CARD_DEFS.every((d) => (deckQty[d.name] || 0) === DEFAULT_QTY[d.name]);
}

function setQty(name, value) {
  const n = Math.max(0, Math.min(MAX_QTY, Math.round(Number(value) || 0)));
  if (deckQty[name] === n) return false;
  deckQty[name] = n;
  return true;
}

/* -------------------------------- trackers -------------------------------- */

function countBy(cards) {
  const out = {};
  for (const c of cards) out[c.name] = (out[c.name] || 0) + 1;
  return out;
}

function renderTracker() {
  const inHand = countBy(heldCards());
  const inDeck = countBy(state.deck);
  const inDiscard = countBy(state.discard);
  const kept = countBy(keptCards());
  const out = countBy(state.removed);
  const cell = (n) => '<td class="num' + (n ? '' : ' zero') + '">' + n + '</td>';

  const rows = mainDefs(state.cfg)
    .filter((def) => def.qty > 0)
    .map(
      (def) =>
        '<tr><td><span class="swatch" style="background:' + TYPE_COLOUR[def.type] + '"></span>' +
        esc(def.name) + '</td>' +
        '<td class="muted">' + esc(TYPE_LABEL[def.type]) + '</td>' +
        cell(def.qty) +
        cell(inDeck[def.name] || 0) +
        cell(inHand[def.name] || 0) +
        cell(inDiscard[def.name] || 0) +
        cell(kept[def.name] || 0) +
        cell(out[def.name] || 0) +
        cell(state.playCounts[def.name] || 0) +
        cell(state.drawCounts[def.name] || 0) +
        '</tr>',
    )
    .join('');

  document.getElementById('tracker').innerHTML =
    '<thead><tr><th>Card</th><th>Group</th><th class="num">Qty</th><th class="num">Deck</th>' +
    '<th class="num">Hands</th><th class="num">Discard</th><th class="num">Kept</th><th class="num">Out</th>' +
    '<th class="num">Played</th><th class="num">Drawn</th></tr></thead><tbody>' + rows + '</tbody>';

  const godDeck = countBy(state.gods);
  const godDisc = countBy(state.godDiscard);
  const godRows = godDefs(state.cfg)
    .filter((def) => def.qty > 0)
    .map(
      (def) =>
        '<tr><td><span class="swatch" style="background:' + TYPE_COLOUR[def.type] + '"></span>' +
        esc(def.name) + '</td>' +
        '<td class="muted">' + esc(def.effect === 'n/a' ? 'no simulated effect' : def.effect) + '</td>' +
        cell(def.qty) +
        cell(godDeck[def.name] || 0) +
        cell(godDisc[def.name] || 0) +
        cell(state.godFires[def.name] || 0) +
        '</tr>',
    )
    .join('');

  document.getElementById('tracker-god').innerHTML =
    '<thead><tr><th>Act of God</th><th>Effect</th><th class="num">Qty</th>' +
    '<th class="num">Deck</th><th class="num">Discard</th><th class="num">Fired</th></tr></thead><tbody>' +
    godRows + '</tbody>';
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

['players', 'hand-size', 'play-min', 'play-max', 'start-health', 'segment-hp'].forEach((id) =>
  bindSlider(id),
);
bindSlider('god-every', (v) => (Number(v) === 0 ? 'never' : Number(v) === 1 ? 'every turn' : v + ' turns'));
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
  const el = e.target.closest('.card.selectable');
  if (el) toggleSelection(Number(el.dataset.uid));
});

document.getElementById('bridge').addEventListener('click', (e) => {
  const el = e.target.closest('.seg.targetable');
  if (el) chooseTarget(Number(el.dataset.seg));
});

document.getElementById('turn-bar').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-selection') confirmSelection();
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

document.getElementById('deck-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.db-btn');
  if (!btn) return;
  const name = btn.dataset.card;
  if (setQty(name, (deckQty[name] || 0) + Number(btn.dataset.delta))) {
    state.cfg.qty = Object.assign({}, deckQty);
    deckChanged();
  }
});

document.getElementById('deck-grid').addEventListener('change', (e) => {
  const input = e.target.closest('.db-qty');
  if (!input) return;
  setQty(input.dataset.card, input.value);
  input.value = String(deckQty[input.dataset.card]);
  state.cfg.qty = Object.assign({}, deckQty);
  deckChanged();
});

document.getElementById('tracker-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  for (const t of document.querySelectorAll('#tracker-tabs .tab')) {
    t.classList.toggle('active', t === tab);
  }
  for (const pane of document.querySelectorAll('.tab-pane')) {
    pane.classList.toggle('hidden', pane.id !== tab.dataset.pane);
  }
});

document.getElementById('deck-reset').addEventListener('click', () => {
  deckQty = Object.assign({}, DEFAULT_QTY);
  state.cfg.qty = Object.assign({}, deckQty);
  deckChanged();
});

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
['players', 'hand-size', 'hand-mode', 'start-health', 'segment-hp', 'god-every'].forEach((id) =>
  document.getElementById(id).addEventListener('change', resetTable),
);
['play-min', 'play-max', 'played-dest', 'turn-mode', 'cut-policy', 'cut-severity'].forEach((id) =>
  document.getElementById(id).addEventListener('change', () => {
    if (!state) return;
    state.cfg = readConfig();
    if (state.cfg.manual) stopAuto();
    if (state.started && state.phase === 'discard') {
      // Settle the pending discard at random rather than stranding the turn.
      const player = state.players[state.active];
      const discarded = takeRandom(player.hand, Math.min(state.pendingDiscard, player.hand.length));
      finishTurn(player, state.turnPlayed, discarded);
      return;
    }
    state.selected = [];
    updateForecast();
    render();
  }),
);

resetTable();
