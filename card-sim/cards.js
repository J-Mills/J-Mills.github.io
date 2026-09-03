/* ---------------------------------- deck ---------------------------------- */

const CARD_DEFS = [
  { name: 'Heal', effect: 'Heal', qty: 4, type: 'action' },
  { name: 'Check Rucksack', effect: 'Check Rucksack', qty: 6, type: 'action' },
  { name: 'Switch Gold', effect: 'Switch Gold', qty: 6, type: 'action' },
  { name: 'Defend', effect: 'Defend', qty: 2, type: 'action' },
  { name: 'Brace', effect: 'Brace', qty: 2, type: 'action' },
  { name: 'Veridian Talon', effect: 'Cut the Ropes', qty: 2, type: 'relic' },
  { name: 'Sturdy Rope', effect: 'Repair the Bridge', qty: 1, type: 'relic' },
  { name: 'Lasso', effect: 'Pull Players from a distance', qty: 1, type: 'relic' },
  { name: 'Wind Fan of the Maw', effect: 'Push Players further', qty: 1, type: 'relic' },
  { name: 'Hissing Hourglass', effect: 'Repeat', qty: 2, type: 'relic' },
  { name: 'Horn of the Ancients', effect: 'Draw Players to Self', qty: 1, type: 'relic' },
  { name: 'Gravity Stone', effect: 'Draw Players to Centre', qty: 1, type: 'relic' },
  { name: 'Chant of Solitude', effect: 'Push All Players Away', qty: 1, type: 'relic' },
  { name: 'Run', effect: 'Run', qty: 4, type: 'action' },
  { name: 'Hooky Stick', effect: 'Remote Steal', qty: 1, type: 'relic' },
  { name: 'Echo Conch', effect: 'Switch Places', qty: 1, type: 'relic' },
  { name: 'Blood Jade Scarab', effect: 'Suck Power', qty: 2, type: 'relic' },
  { name: 'Cinnabar Dust', effect: 'Blind', qty: 2, type: 'relic' },
  { name: 'Bridge Weakens', effect: 'Bridge Weakens', qty: 6, type: 'event' },
  { name: 'Strength Test', effect: 'Strength Test', qty: 4, type: 'event' },
];

const TYPE_COLOUR = { action: '#3b7dd8', relic: '#8a5cd6', event: '#d9694a' };
const TYPE_LABEL = { action: 'Actions', relic: 'Relics', event: 'Events' };
// Event counts are adjustable, so the deck list is derived rather than fixed.
function deckDefs(cfg) {
  return CARD_DEFS.map((d) => {
    if (d.name === 'Bridge Weakens') return Object.assign({}, d, { qty: cfg.bridgeWeakens });
    if (d.name === 'Strength Test') return Object.assign({}, d, { qty: cfg.strengthTest });
    return d;
  });
}

function deckSize(cfg) {
  return deckDefs(cfg).reduce((a, d) => a + d.qty, 0);
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

/* ---------------------------------- state --------------------------------- */

let state = null;
let autoTimer = null;
let uid = 0;

function buildDeck(cfg) {
  const deck = [];
  for (const def of deckDefs(cfg)) {
    for (let i = 0; i < def.qty; i++) {
      deck.push({ uid: uid++, name: def.name, effect: def.effect, type: def.type });
    }
  }
  return deck;
}

function readConfig() {
  const playMin = Number(document.getElementById('play-min').value);
  const playMax = Number(document.getElementById('play-max').value);
  return {
    playerCount: Number(document.getElementById('players').value),
    sharedHand: document.getElementById('hand-mode').value === 'shared',
    manual: document.getElementById('turn-mode').value === 'manual',
    cutPolicy: document.getElementById('cut-policy').value,
    handSize: Number(document.getElementById('hand-size').value),
    playMin: Math.min(playMin, playMax),
    playMax: Math.max(playMin, playMax),
    playedDest: document.getElementById('played-dest').value,
    startHealth: Number(document.getElementById('start-health').value),
    segmentHp: Number(document.getElementById('segment-hp').value),
    bridgeWeakens: Number(document.getElementById('bridge-weakens').value),
    strengthTest: Number(document.getElementById('strength-test').value),
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

// Pre-game: seats laid out and deck intact, but nothing dealt until Start Game.
function resetTable() {
  stopAuto();

  const cfg = readConfig();
  state = {
    cfg,
    deck: buildDeck(cfg),
    discard: [],
    removed: [],
    players: makePlayers(cfg),
    active: 0,
    turn: 0,
    log: [],
    playCounts: {},
    drawCounts: {},
    reshuffles: 0,
    eventsFired: 0,
    starved: false,
    started: false,
    bridge: new Array(SEGMENTS).fill(cfg.segmentHp),
    broken: false,
    brokenTurn: null,
    brokenSegment: null,
    turnHits: [],
    turnStrain: [],
    turnHeal: 0,
    turnHealTo: 0,
    forecast: null,
    phase: 'play',
    selected: [],
    pendingDiscard: 0,
    pendingTargets: 0,
    turnPlayed: [],
  };

  const setup = cfg.sharedHand
    ? cfg.playerCount + ' players sharing one hand — press Start Game to deal ' + cfg.handSize + ' cards'
    : cfg.playerCount + ' players — press Start Game to deal ' + cfg.handSize + ' cards each';
  addLog(null, [['note', 'Table set for ' + setup]]);

  render();
}

function startGame() {
  stopAuto();

  const cfg = readConfig();
  const players = makePlayers(cfg);

  state = {
    cfg,
    deck: shuffle(buildDeck(cfg)),
    discard: [],
    removed: [],
    players,
    active: 0,
    turn: 1,
    log: [],
    playCounts: {},
    drawCounts: {},
    reshuffles: 0,
    eventsFired: 0,
    starved: false,
    started: true,
    bridge: new Array(SEGMENTS).fill(cfg.segmentHp),
    broken: false,
    brokenTurn: null,
    brokenSegment: null,
    turnHits: [],
    turnStrain: [],
    turnHeal: 0,
    turnHealTo: 0,
    forecast: null,
    phase: 'play',
    selected: [],
    pendingDiscard: 0,
    pendingTargets: 0,
    turnPlayed: [],
  };

  const dealEvents = [];
  if (cfg.sharedHand) {
    dealEvents.push(...drawCards(players[0], cfg.handSize).triggered);
  } else {
    // Deal one card at a time around the table.
    for (let c = 0; c < cfg.handSize; c++) {
      for (const p of players) dealEvents.push(...drawCards(p, 1).triggered);
    }
  }
  for (const p of players) p.fresh = [];
  state.lastFresh = [];

  const dealt = cfg.sharedHand
    ? cfg.playerCount + ' players sharing one hand of ' + cfg.handSize + ' cards'
    : cfg.playerCount + ' players dealt ' + cfg.handSize + ' cards each';
  addLog(null, [['note', 'Game start — ' + dealt]]);
  if (dealEvents.length) {
    addLog(null, [['event', 'Fired on the deal: ' + names(dealEvents)]]);
  }
  for (const fell of state.turnStrain) {
    addLog(null, [
      [
        'strain',
        fell.length ? 'Strength Test hit ' + fell.join(', ') : 'Strength Test — everyone held firm',
      ],
    ]);
  }
  state.turnStrain = [];
  if (state.turnHits.length) {
    addLog(null, [['bridge', state.turnHits.map(hitText).join(', ')]]);
    state.turnHits = [];
  }
  updateForecast();

  render();
}

/* --------------------------------- bridge --------------------------------- */

function bridgeHp() {
  return state.bridge.reduce((a, b) => a + b, 0);
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

// A Strength Test rolls independently against every player still standing.
function runStrengthTest() {
  const fell = [];
  for (const p of state.players) {
    if (p.health > 0 && Math.random() < 0.5) {
      p.health--;
      fell.push(p);
    }
  }
  state.turnStrain.push(fell.map((p) => p.name + (p.health === 0 ? ' (down)' : '')));
}

function bridgeMax() {
  return SEGMENTS * state.cfg.segmentHp;
}

// One point of damage to a segment; at 0 the bridge snaps and the game moves on.
function damageSegment(index, reason) {
  if (state.broken || state.bridge[index] <= 0) return null;
  state.bridge[index]--;
  const hit = { index, hp: state.bridge[index], reason };
  if (state.bridge[index] === 0) {
    state.broken = true;
    state.brokenTurn = state.turn;
    state.brokenSegment = index;
  }
  state.turnHits.push(hit);
  return hit;
}

// Where the auto-player aims a Cut the Ropes.
function autoTarget() {
  const alive = [];
  for (let i = 0; i < SEGMENTS; i++) if (state.bridge[i] > 0) alive.push(i);
  if (alive.length === 0) return null;

  if (state.cfg.cutPolicy === 'weakest' || state.cfg.cutPolicy === 'strongest') {
    const pick = state.cfg.cutPolicy === 'weakest' ? Math.min : Math.max;
    const target = pick(...alive.map((i) => state.bridge[i]));
    const tied = alive.filter((i) => state.bridge[i] === target);
    return tied[Math.floor(Math.random() * tied.length)];
  }
  return alive[Math.floor(Math.random() * alive.length)];
}

function countCuts(cards) {
  return cards.filter((c) => c.effect === 'Cut the Ropes').length;
}

/* ---------------------------------- rules --------------------------------- */

// Is there a non-event card left that could actually reach a hand?
function fillableRemains() {
  const pool = state.cfg.reshuffle ? state.deck.concat(state.discard) : state.deck;
  return pool.some((c) => c.type !== 'event');
}

function drawCards(player, n) {
  const drawn = [];
  const triggered = [];
  const cap = deckSize(state.cfg);
  let pulled = 0;

  while (drawn.length < n) {
    // Only events left to pull anywhere: the hand can never be filled.
    if (!fillableRemains()) {
      state.starved = true;
      break;
    }
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
    // With nothing but events left to pull, drawing would cycle forever.
    if (pulled++ > cap) {
      state.starved = true;
      break;
    }

    const card = state.deck.pop();
    state.drawCounts[card.name] = (state.drawCounts[card.name] || 0) + 1;

    if (card.type === 'event') {
      // Events happen the moment they are drawn, then go straight to discard.
      state.discard.push(card);
      state.eventsFired++;
      triggered.push(card);
      if (card.name === 'Bridge Weakens') {
        damageSegment(randInt(0, SEGMENTS - 1), 'Bridge Weakens');
        if (state.broken) break;
      }
      if (card.name === 'Strength Test') runStrengthTest();
      continue;
    }

    player.hand.push(card);
    drawn.push(card);
  }

  player.fresh = drawn.map((c) => c.uid);
  state.lastFresh = player.fresh;
  return { drawn, triggered };
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
  for (const uid of uids) {
    const i = hand.findIndex((c) => c.uid === uid);
    if (i >= 0) taken.push(hand.splice(i, 1)[0]);
  }
  return taken;
}

function applyPlays(player, cards) {
  for (const card of cards) {
    state.playCounts[card.name] = (state.playCounts[card.name] || 0) + 1;
    if (state.cfg.playedDest === 'removed') state.removed.push(card);
    else state.discard.push(card);

    if (card.effect === 'Heal' && player.health < player.maxHealth) {
      player.health++;
      state.turnHeal++;
      state.turnHealTo = player.health;
    }
  }
  player.played += cards.length;
}

// How many cards must be discarded to make playMax leave the hand.
function discardsDueAfter(player, playedCount) {
  return Math.min(Math.max(0, state.cfg.playMax - playedCount), player.hand.length);
}

function finishTurn(player, played, discarded) {
  for (const card of discarded) state.discard.push(card);
  for (const p of state.players) p.fresh = [];

  let refill = { drawn: [], triggered: [] };
  if (!state.broken) {
    refill = drawCards(player, Math.max(0, state.cfg.handSize - player.hand.length));
  }
  const drawn = refill.drawn;

  const parts = [];
  parts.push(['play', played.length ? 'played ' + names(played) : 'played nothing']);
  if (state.turnHeal) {
    parts.push(['heal', 'healed +' + state.turnHeal + ' to ' + state.turnHealTo + ' strength']);
  }
  if (discarded.length) parts.push(['discard', 'discarded ' + names(discarded)]);
  if (drawn.length) parts.push(['draw', 'drew ' + drawn.length]);
  if (refill.triggered.length) parts.push(['event', 'fired ' + names(refill.triggered)]);
  for (const fell of state.turnStrain) {
    parts.push([
      'strain',
      fell.length ? 'Strength Test hit ' + fell.join(', ') : 'Strength Test — everyone held firm',
    ]);
  }
  if (state.turnHits.length) parts.push(['bridge', state.turnHits.map(hitText).join(', ')]);
  if (player.hand.length < state.cfg.handSize) {
    parts.push(['note', 'could not refill (deck exhausted)']);
  }
  addLog(player, parts);

  state.turnHits = [];
  state.turnStrain = [];
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

function hitText(h) {
  const seg = 'segment ' + (h.index + 1);
  return h.hp === 0 ? seg + ' SNAPPED' : seg + ' \u2192 ' + h.hp + ' hp';
}

function takeTurn() {
  if (!state || !state.started || state.cfg.manual || state.broken) return;
  const cfg = state.cfg;
  const player = state.players[state.active];

  const wanted = randInt(cfg.playMin, cfg.playMax);
  const played = takeRandom(player.hand, Math.min(wanted, player.hand.length));
  applyPlays(player, played);

  for (let i = 0; i < countCuts(played) && !state.broken; i++) {
    const target = autoTarget();
    if (target !== null) damageSegment(target, 'Cut the Ropes');
  }

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
      state.turnPlayed = played;
      state.pendingTargets = cuts;
      state.phase = 'target';
      render();
      return;
    }
    afterPlays(player, played);
    return;
  }

  const discarded = removeByUid(player.hand, state.selected);
  finishTurn(player, state.turnPlayed, discarded);
}

// Manual mode: the player aims a Cut the Ropes at a segment.
function chooseTarget(index) {
  if (!isPicking() || state.phase !== 'target') return;
  if (!damageSegment(index, 'Cut the Ropes')) return;

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

function toggleSelection(uid) {
  const i = state.selected.indexOf(uid);
  if (i >= 0) state.selected.splice(i, 1);
  else if (state.selected.length < selectionCap()) state.selected.push(uid);
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
  const c = {
    // The auto-player stands in for whoever would be choosing.
    cfg: Object.assign({}, s.cfg, { manual: false }),
    deck: s.deck.slice(),
    discard: s.discard.slice(),
    removed: s.removed.slice(),
    bridge: s.bridge.slice(),
    active: s.active,
    turn: s.turn,
    broken: s.broken,
    brokenTurn: s.brokenTurn,
    brokenSegment: s.brokenSegment,
    reshuffles: s.reshuffles,
    eventsFired: s.eventsFired,
    starved: s.starved,
    started: s.started,
    turnHits: [],
    turnStrain: [],
    turnHeal: 0,
    turnHealTo: 0,
    log: [],
    playCounts: {},
    drawCounts: {},
    phase: 'play',
    selected: [],
    pendingDiscard: 0,
    pendingTargets: 0,
    turnPlayed: [],
    forecast: null,
    forecasting: true,
  };
  const hands = s.cfg.sharedHand ? s.players[0].hand.slice() : null;
  c.players = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: hands || p.hand.slice(),
    fresh: [],
    played: p.played,
    health: p.health,
    maxHealth: p.maxHealth,
  }));
  return c;
}

// Play the position out many times to see when the bridge tends to go.
function updateForecast() {
  if (!state || state.forecasting) return;
  if (!state.started || state.broken) {
    if (state) state.forecast = null;
    return;
  }

  const real = state;
  const from = real.turn;
  const delays = [];
  const bySegment = new Array(SEGMENTS).fill(0);

  for (let t = 0; t < FORECAST_TRIALS; t++) {
    state = cloneState(real);
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
    'Every Strength Test gives each player a 50% chance to lose 1. Heal restores 1, up to ' +
    state.cfg.startHealth + '.';
  document.getElementById('bridge-note').textContent =
    SEGMENTS + ' segments \u00d7 ' + state.cfg.segmentHp + ' hp — the bridge snaps when any one segment reaches 0.';
  document.getElementById('deck-note').textContent =
    deckSize(state.cfg) + ' cards in the deck; only Bridge Weakens damages the bridge.';
  document.getElementById('discard-note').textContent =
    'Anything not played is discarded, so ' + state.cfg.playMax + ' cards leave the hand each turn.';
}

function renderLegend() {
  const held = {};
  for (const c of heldCards()) held[c.type] = (held[c.type] || 0) + 1;

  const totals = typeTotals(state.cfg);
  const items = Object.keys(TYPE_LABEL).map((type) => {
    const counts =
      type === 'event'
        ? totals[type] + ' total · fires on draw'
        : totals[type] + ' total' + (state.started ? ' · ' + (held[type] || 0) + ' in hands' : '');
    return (
      '<span class="legend-item">' +
      '<span class="legend-key" style="background:' + TYPE_COLOUR[type] + '"></span>' +
      '<span class="legend-label">' + TYPE_LABEL[type] + '</span>' +
      '<span class="legend-count">' + counts + '</span>' +
      '</span>'
    );
  });

  document.getElementById('legend').innerHTML =
    items.join('') + '<span class="legend-total">' + deckSize(state.cfg) + ' cards in the deck</span>';
}

function renderStats() {
  const s = state;
  const round = Math.floor((s.turn - 1) / s.players.length) + 1;
  const inHands = heldCards().length;
  const tiles = [
    { k: 'Turn', v: s.started ? s.turn : '—', sub: s.started ? 'round ' + round : 'not started' },
    {
      k: 'Active',
      v: s.started ? s.players[s.active].name.replace('Player ', 'P') : '—',
      sub: s.started ? 'to act' : 'awaiting deal',
    },
    { k: 'Deck', v: s.deck.length, sub: 'of ' + deckSize(s.cfg) },
    { k: 'In hands', v: inHands, sub: s.cfg.sharedHand ? 'shared hand' : s.players.length + ' players' },
    { k: 'Discard', v: s.discard.length, sub: s.reshuffles + ' reshuffles' },
    { k: 'Events fired', v: s.eventsFired, sub: 'on draw' },
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
  return (
    '<div class="card t-' + card.type + cls + '" data-uid="' + card.uid + '">' +
    (fresh ? '<div class="card-tag">drawn</div>' : '') +
    '<div class="cn">' + esc(card.name) + '</div>' +
    '<div class="ce">' + esc(card.effect) + '</div>' +
    '</div>'
  );
}

function handHTML(cards, fresh, selectable) {
  return cards.length
    ? cards.map((c) => cardHTML(c, fresh.includes(c.uid), selectable)).join('')
    : '<div class="empty-hand">' + (state.started ? 'empty hand' : 'not dealt yet') + '</div>';
}

function playerPanelHTML(p) {
  return (
    '<div class="player' + (p.id === state.active && state.started ? ' active' : '') + '">' +
    '<div class="player-head"><span class="player-name">' + esc(p.name) + '</span>' +
    '<span class="player-meta">' + p.hand.length + ' cards · ' + p.played + ' played</span></div>' +
    healthHTML(p) +
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

  return (
    '<div class="forecast">' +
    '<h4>Snap forecast — ' + f.trials + ' playouts from here, random play</h4>' +
    '<div class="forecast-line">' + headline +
    ' · next turn <b>' + pct(f.next) + '</b>' +
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
    bar.className = 'panel turn-bar discarding';
    bar.innerHTML =
      '<span class="turn-bar-text">' +
      esc(player.name + ' — cut the ropes: pick a bridge segment' + (left > 1 ? ' (' + left + ' cuts left)' : '')) +
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

function renderTracker() {
  const inHand = {};
  for (const c of heldCards()) inHand[c.name] = (inHand[c.name] || 0) + 1;
  const inDeck = {};
  for (const c of state.deck) inDeck[c.name] = (inDeck[c.name] || 0) + 1;
  const inDiscard = {};
  for (const c of state.discard) inDiscard[c.name] = (inDiscard[c.name] || 0) + 1;
  const out = {};
  for (const c of state.removed) out[c.name] = (out[c.name] || 0) + 1;

  const cell = (n) => '<td class="num' + (n ? '' : ' zero') + '">' + n + '</td>';

  const rows = deckDefs(state.cfg).map((def) => {
    return (
      '<tr><td><span class="swatch" style="background:' + TYPE_COLOUR[def.type] + '"></span>' +
      esc(def.name) + '</td>' +
      '<td>' + esc(def.effect) + '</td>' +
      cell(def.qty) +
      cell(inDeck[def.name] || 0) +
      cell(inHand[def.name] || 0) +
      cell(inDiscard[def.name] || 0) +
      cell(out[def.name] || 0) +
      cell(state.playCounts[def.name] || 0) +
      cell(state.drawCounts[def.name] || 0) +
      '</tr>'
    );
  }).join('');

  document.getElementById('tracker').innerHTML =
    '<thead><tr><th>Card</th><th>Effect</th><th class="num">Qty</th><th class="num">Deck</th>' +
    '<th class="num">Hands</th><th class="num">Discard</th><th class="num">Out</th>' +
    '<th class="num">Played</th><th class="num">Drawn</th></tr></thead><tbody>' +
    rows +
    '</tbody>';
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

[
  'players',
  'hand-size',
  'play-min',
  'play-max',
  'start-health',
  'segment-hp',
  'bridge-weakens',
  'strength-test',
].forEach((id) => bindSlider(id));
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
[
  'players',
  'hand-size',
  'hand-mode',
  'start-health',
  'segment-hp',
  'bridge-weakens',
  'strength-test',
].forEach((id) =>
  document.getElementById(id).addEventListener('change', resetTable),
);
['play-min', 'play-max', 'played-dest', 'turn-mode', 'cut-policy'].forEach((id) =>
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
