function dieDistribution(die) {
    const counts = {};
    for (const v of die) counts[v] = (counts[v] || 0) + 1;
    const dist = {};
    for (const [v, c] of Object.entries(counts)) dist[v] = c / die.length;
    return dist;
}

function dieAvg(die) {
    return die.reduce((a, b) => a + b, 0) / die.length;
}

function exactProbability(startStr, target, strategyFn, exhaustionDist, moveDistMap, restBenefit = 2, maxRounds = 7) {
    let states = { [`${startStr},0,1`]: 1.0 };
    let winProb = 0, winRoundSum = 0, winStrSum = 0, allRoundsSum = 0, exhaustionProb = 0;

    for (let iter = 0; iter < maxRounds; iter++) {
        const nextStates = {};
        for (const [key, prob] of Object.entries(states)) {
            const [strength, position, roundNum] = key.split(',').map(Number);
            if (strength <= 0) {
                exhaustionProb += prob;
                allRoundsSum   += prob * (roundNum - 1);
                continue;
            }
            const choice = strategyFn(strength, position, target, roundNum);
            if (choice === 3) {
                const k = `${strength + restBenefit},${position},${roundNum + 1}`;
                nextStates[k] = (nextStates[k] || 0) + prob;
                continue;
            }
            const moveDist = moveDistMap[choice];
            for (const [move, mp] of Object.entries(moveDist)) {
                for (const [drain, dp] of Object.entries(exhaustionDist)) {
                    const newPos = position + Number(move);
                    const newStr = strength - Number(drain);
                    const p = prob * mp * dp;
                    if (newPos >= target && newStr > 0) {
                        winProb       += p;
                        winRoundSum   += p * roundNum;
                        winStrSum     += p * newStr;
                        allRoundsSum  += p * roundNum;
                    } else {
                        const k = `${newStr},${newPos},${roundNum + 1}`;
                        nextStates[k] = (nextStates[k] || 0) + p;
                    }
                }
            }
        }
        states = nextStates;
    }

    let timeoutProb = 0;
    for (const [key, prob] of Object.entries(states)) {
        const roundNum = Number(key.split(',')[2]);
        timeoutProb   += prob;
        allRoundsSum  += prob * (roundNum - 1);
    }

    return {
        winProb,
        expectedWinRound: winProb > 0 ? winRoundSum / winProb : null,
        avgStrLeft:        winProb > 0 ? winStrSum   / winProb : null,
        avgRounds:         allRoundsSum,
        exhaustionProb,
        timeoutProb,
    };
}

function formatWinRound(result) {
    if (result.expectedWinRound !== null) return result.expectedWinRound.toFixed(2);
    const t = result.timeoutProb, e = result.exhaustionProb;
    if (t > 0 && e > 0) return `N/A (Timeout ${(t*100).toFixed(0)}% / Exhausted ${(e*100).toFixed(0)}%)`;
    if (t > 0) return 'N/A (Timeout)';
    return 'N/A (Exhausted)';
}

function parseDie(str) {
    return str.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
}

const STRATEGIES = {
    'Always Steady':        (s, h, t, r) => 1,
    'Always Risky':         (s, h, t, r) => 2,
    'Rest if Low (Steady)': (s, h, t, r) => s <= 2 ? 3 : 1,
    'Rest if Low (Risky)':  (s, h, t, r) => s <= 3 ? 3 : 2,
    'Desperate Risky':      (s, h, t, r) => (s <= 2 && r <= 3) ? 3 : 2,
};

// --- UI ---

let lastRows = [];

function update() {
    const steadyDie  = parseDie(document.getElementById('steady').value);
    const riskyDie   = parseDie(document.getElementById('risky').value);
    const exhaustDie = parseDie(document.getElementById('exhaust').value);
    const strengths  = parseDie(document.getElementById('strengths').value);
    const targets    = parseDie(document.getElementById('targets').value);
    const maxRounds  = Number(document.getElementById('rounds').value);
    const restBenefit = Number(document.getElementById('rest').value);
    const strategyName = document.getElementById('strategy').value;

    if (!steadyDie.length || !riskyDie.length || !exhaustDie.length ||
        !strengths.length || !targets.length) return;

    document.getElementById('stats').textContent =
        `Steady avg climb: ${dieAvg(steadyDie).toFixed(2)}  |  ` +
        `Risky avg climb: ${dieAvg(riskyDie).toFixed(2)}  |  ` +
        `Avg strength loss: ${dieAvg(exhaustDie).toFixed(2)}`;

    const moveDistMap   = { 1: dieDistribution(steadyDie), 2: dieDistribution(riskyDie) };
    const exhaustionDist = dieDistribution(exhaustDie);
    const strategyFn    = STRATEGIES[strategyName];

    lastRows = [];
    for (const strStart of strengths) {
        for (const target of targets) {
            const result = exactProbability(strStart, target, strategyFn, exhaustionDist, moveDistMap, restBenefit, maxRounds);
            lastRows.push({
                'Starting Strength': strStart,
                'Target Height':     target,
                'Win %':             (result.winProb * 100).toFixed(4) + '%',
                'Exp. Win Round':    formatWinRound(result),
                'Avg Str Left':      result.avgStrLeft !== null ? result.avgStrLeft.toFixed(2) : 'N/A',
                'Avg Rounds':        result.avgRounds.toFixed(2),
            });
        }
    }

    const cols = ['Starting Strength', 'Target Height', 'Win %', 'Exp. Win Round', 'Avg Str Left', 'Avg Rounds'];
    const thead = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${lastRows.map(row =>
        `<tr>${cols.map(c => `<td>${row[c]}</td>`).join('')}</tr>`
    ).join('')}</tbody>`;
    document.getElementById('results').innerHTML = thead + tbody;
}

function saveCSV() {
    if (!lastRows.length) return;
    const cols = ['Starting Strength', 'Target Height', 'Win %', 'Exp. Win Round', 'Avg Str Left', 'Avg Rounds'];
    const lines = [cols.join(','), ...lastRows.map(row => cols.map(c => `"${row[c]}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', () => {
    // Populate strategy dropdown
    const sel = document.getElementById('strategy');
    for (const name of Object.keys(STRATEGIES)) {
        const opt = document.createElement('option');
        opt.value = opt.textContent = name;
        sel.appendChild(opt);
    }

    // Slider labels
    for (const id of ['rounds', 'rest']) {
        const el = document.getElementById(id);
        document.getElementById(`${id}-val`).textContent = el.value;
        el.addEventListener('input', () => {
            document.getElementById(`${id}-val`).textContent = el.value;
            update();
        });
    }

    // All other inputs
    for (const id of ['steady', 'risky', 'exhaust', 'strengths', 'targets', 'strategy']) {
        document.getElementById(id).addEventListener('input', update);
    }

    document.getElementById('save-btn').addEventListener('click', saveCSV);

    update();
});
