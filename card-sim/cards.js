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
const TYPE_TOTALS = CARD_DEFS.reduce((acc, d) => {
  acc[d.type] = (acc[d.type] || 0) + d.qty;
  return acc;
}, {});
const DECK_SIZE = CARD_DEFS.reduce((a, c) => a + c.qty, 0);

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

function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
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
    handSize: Number(document.getElementById('hand-size').value),
    playMin: Math.min(playMin, playMax),
    playMax: Math.max(playMin, playMax),
    playedDest: document.getElementById('played-dest').value,
    reshuffle: document.getElementById('reshuffle').checked,
  };
}

function makePlayers(cfg) {
  const players = [];
  for (let i = 0; i < cfg.playerCount; i++) {
    players.push({ id: i, name: 'Player ' + (i + 1), hand: [], fresh: [], played: 0 });
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
    deck: buildDeck(),
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
    phase: 'play',
    selected: [],
    pendingDiscard: 0,
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
    deck: shuffle(buildDeck()),
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
    phase: 'play',
    selected: [],
    pendingDiscard: 0,
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

  render();
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
    if (pulled++ > DECK_SIZE) {
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

  const refill = drawCards(player, Math.max(0, state.cfg.handSize - player.hand.length));
  const drawn = refill.drawn;

  const parts = [];
  parts.push(['play', played.length ? 'played ' + names(played) : 'played nothing']);
  if (discarded.length) parts.push(['discard', 'discarded ' + names(discarded)]);
  if (drawn.length) parts.push(['draw', 'drew ' + drawn.length]);
  if (refill.triggered.length) parts.push(['event', 'fired ' + names(refill.triggered)]);
  if (player.hand.length < state.cfg.handSize) {
    parts.push(['note', 'could not refill (deck exhausted)']);
  }
  addLog(player, parts);

  state.turn++;
  state.active = (state.active + 1) % state.players.length;
  state.phase = 'play';
  state.selected = [];
  state.pendingDiscard = 0;
  state.turnPlayed = [];
  render();
}

function takeTurn() {
  if (!state || !state.started || state.cfg.manual) return;
  const cfg = state.cfg;
  const player = state.players[state.active];

  const wanted = randInt(cfg.playMin, cfg.playMax);
  const played = takeRandom(player.hand, Math.min(wanted, player.hand.length));
  applyPlays(player, played);

  const discarded = takeRandom(player.hand, discardsDueAfter(player, played.length));
  finishTurn(player, played, discarded);
}

// Manual mode: pick the cards to play, then pick the discards.
function confirmSelection() {
  const player = state.players[state.active];

  if (state.phase === 'play') {
    const played = removeByUid(player.hand, state.selected);
    applyPlays(player, played);
    state.selected = [];
    const due = discardsDueAfter(player, played.length);
    if (due === 0) {
      finishTurn(player, played, []);
      return;
    }
    state.turnPlayed = played;
    state.pendingDiscard = due;
    state.phase = 'discard';
    render();
    return;
  }

  const discarded = removeByUid(player.hand, state.selected);
  finishTurn(player, state.turnPlayed, discarded);
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
  state.log.unshift({ turn: player ? state.turn : null, who: player ? player.name : null, parts });
  if (state.log.length > 400) state.log.pop();
}

/* --------------------------------- rendering ------------------------------- */

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function render() {
  renderStats();
  renderLegend();
  renderTurnBar();
  renderPlayers();
  renderLog();
  renderTracker();
  const auto = state.started && !state.cfg.manual;
  for (const id of ['next-turn', 'auto', 'skip']) {
    document.getElementById(id).disabled = !auto;
  }
  document.getElementById('save-btn').disabled = !state.started;
  document.getElementById('new-game').textContent = state.started ? 'New Game' : 'Start Game';
  document.getElementById('hand-size-label').textContent = state.cfg.sharedHand ? 'Shared hand size' : 'Hand size';
  document.getElementById('discard-note').textContent =
    'Anything not played is discarded, so ' + state.cfg.playMax + ' cards leave the hand each turn.';
}

function renderLegend() {
  const held = {};
  for (const c of heldCards()) held[c.type] = (held[c.type] || 0) + 1;

  const items = Object.keys(TYPE_LABEL).map((type) => {
    const counts =
      type === 'event'
        ? TYPE_TOTALS[type] + ' total · fires on draw'
        : TYPE_TOTALS[type] + ' total' + (state.started ? ' · ' + (held[type] || 0) + ' in hands' : '');
    return (
      '<span class="legend-item">' +
      '<span class="legend-key" style="background:' + TYPE_COLOUR[type] + '"></span>' +
      '<span class="legend-label">' + TYPE_LABEL[type] + '</span>' +
      '<span class="legend-count">' + counts + '</span>' +
      '</span>'
    );
  });

  document.getElementById('legend').innerHTML =
    items.join('') + '<span class="legend-total">' + DECK_SIZE + ' cards in the deck</span>';
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
    { k: 'Deck', v: s.deck.length, sub: 'of ' + DECK_SIZE },
    { k: 'In hands', v: inHands, sub: s.cfg.sharedHand ? 'shared hand' : s.players.length + ' players' },
    { k: 'Discard', v: s.discard.length, sub: s.reshuffles + ' reshuffles' },
    { k: 'Events fired', v: s.eventsFired, sub: 'on draw' },
    { k: 'Out of play', v: s.removed.length, sub: s.cfg.playedDest === 'removed' ? 'played cards' : 'none' },
  ];
  document.getElementById('stats').innerHTML = tiles
    .map((t) => '<div class="stat"><div class="k">' + t.k + '</div><div class="v">' + esc(t.v) + '</div><div class="sub">' + esc(t.sub) + '</div></div>')
    .join('');
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
        esc(p.name) + '<em>' + p.played + ' played</em></span>',
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

function isPicking() {
  return state.started && state.cfg.manual;
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

  const rows = CARD_DEFS.map((def) => {
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

['players', 'hand-size', 'play-min', 'play-max'].forEach((id) => bindSlider(id));
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
['players', 'hand-size', 'hand-mode'].forEach((id) =>
  document.getElementById(id).addEventListener('change', resetTable),
);
['play-min', 'play-max', 'played-dest', 'reshuffle', 'turn-mode'].forEach((id) =>
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
    render();
  }),
);

resetTable();
