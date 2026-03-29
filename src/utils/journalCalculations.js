// ============================================================
// CONFLUENCE DEFINITIONS
// ============================================================

export const HTF_CONFLUENCES = [
  { id: 'htf_mss', label: 'HTF MSS', group: 'htf' },
  { id: 'htf_poc', label: 'HTF POC', group: 'htf' },
  { id: 'htf_vah', label: 'HTF VAH', group: 'htf' },
  { id: 'htf_val', label: 'HTF VAL', group: 'htf' },
  { id: 'htf_fib', label: 'HTF Fib ≥0.5', group: 'htf' },
  { id: 'htf_elliott', label: 'HTF Elliott Wave', group: 'htf' },
  { id: 'cot', label: 'COT Alignment', group: 'htf' },
  { id: 'opens', label: 'Y/M/W/D Opens', group: 'htf' },
]

export const LTF_CONFLUENCES = [
  { id: 'ltf_mss', label: 'LTF MSS', group: 'ltf' },
  { id: 'ltf_fib', label: 'LTF Fib', group: 'ltf' },
  { id: 'ltf_poc', label: 'LTF POC', group: 'ltf' },
  { id: 'ltf_vah', label: 'LTF VAH', group: 'ltf' },
  { id: 'ltf_val', label: 'LTF VAL', group: 'ltf' },
  { id: 'ltf_fvg', label: 'LTF FVG', group: 'ltf' },
]

export const KEY_CONFLUENCES = [
  { id: 'pdh', label: 'PDH', group: 'key' },
  { id: 'pdl', label: 'PDL', group: 'key' },
]

export const ALL_CONFLUENCES = [...HTF_CONFLUENCES, ...LTF_CONFLUENCES, ...KEY_CONFLUENCES]

export const HTF_MAX = HTF_CONFLUENCES.length   // 8
export const LTF_MAX = LTF_CONFLUENCES.length   // 6
export const KEY_MAX = KEY_CONFLUENCES.length    // 2
export const TOTAL_MAX = ALL_CONFLUENCES.length  // 16

// ============================================================
// TRADE HELPERS
// ============================================================

export function computeScores(confluences = {}) {
  const htfScore = HTF_CONFLUENCES.filter(c => confluences[c.id]).length
  const ltfScore = LTF_CONFLUENCES.filter(c => confluences[c.id]).length
  const keyScore = KEY_CONFLUENCES.filter(c => confluences[c.id]).length
  const totalScore = htfScore + ltfScore + keyScore
  return { htfScore, ltfScore, keyScore, totalScore }
}

export function computeEfficiencies(trade) {
  const mae = Math.abs(trade.mae ?? 0)
  const mfe = Math.abs(trade.mfe ?? 0)
  const result = trade.result ?? 0

  const entryEfficiency = (mae + mfe) > 0 ? 1 - mae / (mae + mfe) : null
  const exitEfficiency = mfe > 0 ? Math.min(1, result / mfe) : null

  return { entryEfficiency, exitEfficiency }
}

export function isWin(trade) { return (trade.result ?? 0) > 0 }

export function getActiveConfluences(trade) {
  return ALL_CONFLUENCES.filter(c => trade.confluences?.[c.id]).map(c => c.id)
}

// ============================================================
// FILTER
// ============================================================

export function filterTrades(trades, filters) {
  const { period, pair, session, marketType, dateFrom, dateTo, pnl } = filters
  let list = [...trades]

  const now = new Date()
  if (period === '30d') {
    const cutoff = new Date(now - 30 * 864e5)
    list = list.filter(t => new Date(t.date) >= cutoff)
  } else if (period === '90d') {
    const cutoff = new Date(now - 90 * 864e5)
    list = list.filter(t => new Date(t.date) >= cutoff)
  } else if (period === 'custom' && dateFrom && dateTo) {
    list = list.filter(t => t.date >= dateFrom && t.date <= dateTo)
  }

  if (pair && pair !== 'all') list = list.filter(t => t.pair === pair)
  if (session && session !== 'all') list = list.filter(t => t.session === session)
  if (marketType && marketType !== 'all') list = list.filter(t => t.marketType === marketType)
  if (pnl && pnl !== 'all') list = list.filter(t => t.pnl === pnl)

  return list
}

// ============================================================
// CORE PERFORMANCE
// ============================================================

const MIN_TRADES = 30

export function coreMetrics(trades) {
  if (trades.length === 0) return null

  const wins = trades.filter(isWin)
  const losses = trades.filter(t => !isWin(t))

  const winrate = wins.length / trades.length
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.result, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.result, 0) / losses.length : 0
  const expectancy = winrate * avgWin + (1 - winrate) * avgLoss

  const totalWins = wins.reduce((a, t) => a + t.result, 0)
  const totalLosses = Math.abs(losses.reduce((a, t) => a + t.result, 0))
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : null

  const Rs = trades.map(t => t.result)
  const mean = Rs.reduce((a, b) => a + b, 0) / Rs.length
  const variance = Rs.reduce((a, b) => a + (b - mean) ** 2, 0) / Rs.length
  const stdDev = Math.sqrt(variance)
  const sharpe = stdDev > 0 ? mean / stdDev : null

  const negRs = Rs.filter(r => r < 0)
  const negVariance = negRs.length > 0 ? negRs.reduce((a, b) => a + b ** 2, 0) / negRs.length : 0
  const sortino = negVariance > 0 ? mean / Math.sqrt(negVariance) : null

  // Equity curve
  const equityCurve = trades.reduce((acc, t, i) => {
    const prev = i === 0 ? 0 : acc[i - 1].equity
    acc.push({ trade: i + 1, equity: +(prev + t.result).toFixed(4), date: t.date })
    return acc
  }, [])

  // R distribution histogram
  const buckets = {}
  trades.forEach(t => {
    const key = Math.round(t.result * 2) / 2 // 0.5R buckets
    buckets[key] = (buckets[key] || 0) + 1
  })
  const rDistribution = Object.entries(buckets)
    .map(([r, count]) => ({ r: parseFloat(r), count }))
    .sort((a, b) => a.r - b.r)

  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    winrate,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    sharpe,
    sortino,
    equityCurve,
    rDistribution,
    insufficient: trades.length < MIN_TRADES,
  }
}

// ============================================================
// DRAWDOWN
// ============================================================

export function drawdownMetrics(trades) {
  if (trades.length === 0) return null

  let running = 0, peak = 0
  let maxDDR = 0   // in R
  let maxDDPct = 0 // in %
  let ddStart = null, ddDurations = [], ddLengths = []
  let inDD = false, ddStartTrade = 0
  let peakEquityForPct = 0

  const ddCurve = []

  trades.forEach((t, i) => {
    running += t.result
    if (running > peak) {
      if (inDD && ddStart !== null) {
        const dur = Math.max(0, (new Date(t.date) - new Date(ddStart)) / 864e5)
        ddDurations.push(dur)
        ddLengths.push(i - ddStartTrade)
        inDD = false
        ddStart = null
      }
      peak = running
      peakEquityForPct = peak
    }
    const dd = peak - running
    const ddPct = peakEquityForPct > 0 ? dd / peakEquityForPct : 0
    if (dd > maxDDR) maxDDR = dd
    if (ddPct > maxDDPct) maxDDPct = ddPct

    if (dd > 0 && !inDD) {
      inDD = true
      ddStart = t.date
      ddStartTrade = i
    }

    ddCurve.push({ trade: i + 1, drawdown: -dd })
  })

  // Time to recovery
  let runningEq = 0, peakEq2 = 0, recoveryCounts = []
  let underwater = 0
  trades.forEach(t => {
    runningEq += t.result
    if (runningEq > peakEq2) {
      if (underwater > 0) recoveryCounts.push(underwater)
      underwater = 0
      peakEq2 = runningEq
    } else {
      underwater++
    }
  })

  const avgRecovery = recoveryCounts.length > 0
    ? recoveryCounts.reduce((a, b) => a + b, 0) / recoveryCounts.length
    : 0

  const avgDDDuration = ddDurations.length > 0
    ? ddDurations.reduce((a, b) => a + b, 0) / ddDurations.length
    : 0

  const avgDDLength = ddLengths.length > 0
    ? ddLengths.reduce((a, b) => a + b, 0) / ddLengths.length
    : 0

  const perTradeDD = trades.map(t => t.result < 0 ? Math.abs(t.result) : 0)
  const avgPerTrade = perTradeDD.filter(d => d > 0).reduce((a, b) => a + b, 0) / (trades.filter(t => t.result < 0).length || 1)

  return {
    maxDDR,
    maxDDPct,
    avgPerTrade,
    avgRecovery: Math.round(avgRecovery),
    avgDDDuration: Math.round(avgDDDuration),
    avgDDLength: Math.round(avgDDLength),
    ddCurve,
    insufficient: trades.length < MIN_TRADES,
  }
}

// ============================================================
// EXECUTION METRICS
// ============================================================

export function executionMetrics(trades) {
  if (trades.length === 0) return null

  const withMAE = trades.filter(t => t.mae != null)
  const withMFE = trades.filter(t => t.mfe != null)
  const withEff = trades.filter(t => t.entryEfficiency != null)

  const avgEntryEff = withEff.length > 0
    ? withEff.reduce((a, t) => a + t.entryEfficiency, 0) / withEff.length
    : null

  const withExitEff = trades.filter(t => t.exitEfficiency != null && t.result > 0)
  const avgExitEff = withExitEff.length > 0
    ? withExitEff.reduce((a, t) => a + t.exitEfficiency, 0) / withExitEff.length
    : null

  const wins = trades.filter(t => t.result > 0)
  const losses = trades.filter(t => t.result <= 0)

  const avgMAEWins = wins.filter(t => t.mae != null).length > 0
    ? wins.filter(t => t.mae != null).reduce((a, t) => a + Math.abs(t.mae), 0) / wins.filter(t => t.mae != null).length
    : null

  const avgMAELoss = losses.filter(t => t.mae != null).length > 0
    ? losses.filter(t => t.mae != null).reduce((a, t) => a + Math.abs(t.mae), 0) / losses.filter(t => t.mae != null).length
    : null

  const avgMFE = withMFE.length > 0
    ? withMFE.reduce((a, t) => a + Math.abs(t.mfe), 0) / withMFE.length
    : null

  const leftOnTable = wins.filter(t => t.mfe != null)
  const avgLeftOnTable = leftOnTable.length > 0
    ? leftOnTable.reduce((a, t) => a + Math.max(0, t.mfe - t.result), 0) / leftOnTable.length
    : null

  // Risk consistency (stddev of riskPercent)
  const risks = trades.filter(t => t.riskPercent).map(t => t.riskPercent)
  const riskMean = risks.reduce((a, b) => a + b, 0) / (risks.length || 1)
  const riskStd = risks.length > 1
    ? Math.sqrt(risks.reduce((a, b) => a + (b - riskMean) ** 2, 0) / risks.length)
    : 0

  // Kelly criterion
  const wins2 = trades.filter(t => t.result > 0)
  const losses2 = trades.filter(t => t.result <= 0)
  const wr = wins2.length / trades.length
  const avgW = wins2.length ? wins2.reduce((a, t) => a + t.result, 0) / wins2.length : 0
  const avgL = losses2.length ? Math.abs(losses2.reduce((a, t) => a + t.result, 0) / losses2.length) : 0
  const kelly = avgL > 0 ? wr - (1 - wr) / (avgW / avgL) : null

  // Risk of Ruin (Monte Carlo based: probability equity drops 20% in 1000 sims)
  const ror = monteCarloRoR(trades, 0.2 * 100, 1000) // 20R ruin level

  return {
    avgEntryEff,
    avgExitEff,
    avgMAEWins,
    avgMAELoss,
    avgMFE,
    avgLeftOnTable,
    riskMean,
    riskStd,
    kelly,
    ror,
    insufficient: trades.length < MIN_TRADES,
  }
}

function monteCarloRoR(trades, ruinLevel, iterations) {
  const Rs = trades.map(t => t.result)
  let ruinCount = 0
  for (let i = 0; i < iterations; i++) {
    let eq = 0
    for (let j = 0; j < trades.length; j++) {
      eq += Rs[Math.floor(Math.random() * Rs.length)]
      if (eq <= -ruinLevel) { ruinCount++; break }
    }
  }
  return ruinCount / iterations
}

// ============================================================
// MONTE CARLO
// ============================================================

export function monteCarlo(trades, iterations = 1000) {
  if (trades.length < MIN_TRADES) return null
  const Rs = trades.map(t => t.result)
  const results = []
  for (let i = 0; i < iterations; i++) {
    let eq = 0
    for (let j = 0; j < trades.length; j++) {
      eq += Rs[Math.floor(Math.random() * Rs.length)]
    }
    results.push(eq)
  }
  results.sort((a, b) => a - b)
  return {
    median: results[Math.floor(iterations / 2)],
    worst5: results[Math.floor(iterations * 0.05)],
    worst1: results[Math.floor(iterations * 0.01)],
    best95: results[Math.floor(iterations * 0.95)],
    probPositive: results.filter(r => r > 0).length / iterations,
    distribution: results,
  }
}

// ============================================================
// EDGE ANALYSIS
// ============================================================

export function confluenceScoreAnalysis(trades) {
  if (trades.length < MIN_TRADES) return null
  const groups = {}
  trades.forEach(t => {
    const s = t.totalScore ?? 0
    if (!groups[s]) groups[s] = []
    groups[s].push(t)
  })
  return Object.entries(groups)
    .map(([score, list]) => {
      const wins = list.filter(isWin)
      const wr = wins.length / list.length
      const exp = list.reduce((a, t) => a + t.result, 0) / list.length
      return { score: parseInt(score), count: list.length, winrate: wr, expectancy: exp }
    })
    .sort((a, b) => a.score - b.score)
}

export function htfLtfEdge(trades) {
  if (trades.length < MIN_TRADES) return null

  function stats(list) {
    if (list.length === 0) return null
    const wins = list.filter(isWin)
    return {
      count: list.length,
      winrate: wins.length / list.length,
      expectancy: list.reduce((a, t) => a + t.result, 0) / list.length,
    }
  }

  const withHTF = trades.filter(t => (t.htfScore ?? 0) > 0)
  const withoutHTF = trades.filter(t => (t.htfScore ?? 0) === 0)
  const withLTF = trades.filter(t => (t.ltfScore ?? 0) > 0)
  const withoutLTF = trades.filter(t => (t.ltfScore ?? 0) === 0)

  return {
    htf: { with: stats(withHTF), without: stats(withoutHTF) },
    ltf: { with: stats(withLTF), without: stats(withoutLTF) },
  }
}

export function singleConfluenceEdge(trades) {
  if (trades.length < MIN_TRADES) return []

  return ALL_CONFLUENCES.map(conf => {
    const withConf = trades.filter(t => t.confluences?.[conf.id])
    const withoutConf = trades.filter(t => !t.confluences?.[conf.id])

    if (withConf.length < MIN_TRADES || withoutConf.length < MIN_TRADES) {
      return { ...conf, insufficient: true }
    }

    const wrWith = withConf.filter(isWin).length / withConf.length
    const wrWithout = withoutConf.filter(isWin).length / withoutConf.length
    const expWith = withConf.reduce((a, t) => a + t.result, 0) / withConf.length
    const expWithout = withoutConf.reduce((a, t) => a + t.result, 0) / withoutConf.length

    return {
      ...conf,
      insufficient: false,
      withCount: withConf.length,
      withoutCount: withoutConf.length,
      wrWith, wrWithout, wrDelta: wrWith - wrWithout,
      expWith, expWithout, expDelta: expWith - expWithout,
    }
  }).filter(c => !c.insufficient).sort((a, b) => b.expDelta - a.expDelta)
}

function getCombinations(arr, size) {
  if (size === 1) return arr.map(x => [x])
  const result = []
  for (let i = 0; i < arr.length - size + 1; i++) {
    const rest = getCombinations(arr.slice(i + 1), size - 1)
    rest.forEach(combo => result.push([arr[i], ...combo]))
  }
  return result
}

export function topCombinations(trades, size = 2) {
  if (trades.length < MIN_TRADES) return []

  const map = {}
  trades.forEach(t => {
    const active = getActiveConfluences(t)
    if (active.length < size) return
    const combos = getCombinations(active, size)
    combos.forEach(combo => {
      const key = combo.sort().join('+')
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
  })

  return Object.entries(map)
    .filter(([, list]) => list.length >= MIN_TRADES)
    .map(([key, list]) => {
      const wins = list.filter(isWin)
      const labels = key.split('+').map(id => ALL_CONFLUENCES.find(c => c.id === id)?.label ?? id)
      return {
        key,
        labels,
        count: list.length,
        winrate: wins.length / list.length,
        expectancy: list.reduce((a, t) => a + t.result, 0) / list.length,
      }
    })
    .sort((a, b) => b.expectancy - a.expectancy)
    .slice(0, 10)
}

export function conditionalEdge(trades, confA, confB) {
  const withA = trades.filter(t => t.confluences?.[confA])
  const withAB = withA.filter(t => t.confluences?.[confB])
  const withAnotB = withA.filter(t => !t.confluences?.[confB])

  function stats(list) {
    if (list.length < 10) return null
    const wins = list.filter(isWin)
    return {
      count: list.length,
      winrate: wins.length / list.length,
      expectancy: list.reduce((a, t) => a + t.result, 0) / list.length,
    }
  }
  return { withBoth: stats(withAB), withAOnly: stats(withAnotB) }
}

export function minimumConfluenceValidation(trades) {
  if (trades.length < MIN_TRADES) return null
  const thresholds = [3, 4, 5, 6, 7, 8]
  return thresholds.map(min => {
    const filtered = trades.filter(t => (t.totalScore ?? 0) >= min)
    if (filtered.length < 10) return { min, count: filtered.length, insufficient: true }
    const wins = filtered.filter(isWin)
    const withHTFMSS = filtered.filter(t => t.confluences?.htf_mss)
    const withoutHTFMSS = filtered.filter(t => !t.confluences?.htf_mss)
    function mkStats(list) {
      if (!list.length) return null
      const w = list.filter(isWin)
      return { count: list.length, winrate: w.length / list.length, expectancy: list.reduce((a, t) => a + t.result, 0) / list.length }
    }
    return {
      min, count: filtered.length, insufficient: false,
      winrate: wins.length / filtered.length,
      expectancy: filtered.reduce((a, t) => a + t.result, 0) / filtered.length,
      withMSS: mkStats(withHTFMSS),
      withoutMSS: mkStats(withoutHTFMSS),
    }
  })
}

// ============================================================
// SEASONALITY
// ============================================================

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function groupStats(trades, keyFn, keys) {
  const groups = {}
  keys.forEach(k => { groups[k] = [] })
  trades.forEach(t => {
    const k = keyFn(t)
    if (groups[k]) groups[k].push(t)
  })
  return Object.entries(groups).map(([key, list]) => {
    if (list.length === 0) return { key, count: 0, winrate: null, expectancy: null }
    const wins = list.filter(isWin)
    return {
      key,
      count: list.length,
      winrate: wins.length / list.length,
      expectancy: list.reduce((a, t) => a + t.result, 0) / list.length,
    }
  })
}

export function seasonalityMetrics(trades) {
  if (trades.length === 0) return null

  const byDay = groupStats(trades,
    t => DAYS[new Date(t.date + 'T12:00:00').getDay()],
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  )

  const bySession = groupStats(trades, t => t.session,
    ['Asia', 'London', 'New York', 'Overlap']
  )

  const byMarket = groupStats(trades, t => t.marketType,
    ['Trend', 'Range', 'Volatil', 'Unklar']
  )

  const byMonth = groupStats(trades,
    t => MONTHS[new Date(t.date + 'T12:00:00').getMonth()],
    MONTHS
  )

  const setups = [...new Set(trades.map(t => t.setupType).filter(Boolean))]
  const bySetup = groupStats(trades, t => t.setupType || 'Unknown', setups.length ? setups : ['Unknown'])

  // Streaks
  let currentStreak = 0
  let maxWinStreak = 0, maxLossStreak = 0
  let curWin = 0, curLoss = 0
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  sorted.forEach((t, i) => {
    const win = isWin(t)
    if (win) { curWin++; curLoss = 0 }
    else { curLoss++; curWin = 0 }
    if (curWin > maxWinStreak) maxWinStreak = curWin
    if (curLoss > maxLossStreak) maxLossStreak = curLoss
  })

  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1]
    let streak = 1
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (isWin(sorted[i]) === isWin(last)) streak++
      else break
    }
    currentStreak = isWin(last) ? streak : -streak
  }

  return { byDay, bySession, byMarket, byMonth, bySetup, currentStreak, maxWinStreak, maxLossStreak }
}

// ============================================================
// EDGE STABILITY
// ============================================================

export function edgeStability(trades) {
  if (trades.length < MIN_TRADES) return { status: 'insufficient', label: 'Insufficient Data' }

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const mid = Math.floor(sorted.length / 2)
  const first = sorted.slice(0, mid)
  const second = sorted.slice(mid)

  const exp1 = first.reduce((a, t) => a + t.result, 0) / first.length
  const exp2 = second.reduce((a, t) => a + t.result, 0) / second.length

  const delta = exp2 - exp1
  let status, label
  if (Math.abs(delta) < 0.05) { status = 'stable'; label = 'Stable' }
  else if (delta > 0) { status = 'improving'; label = 'Improving' }
  else { status = 'decaying'; label = 'Decaying' }

  const wr1 = first.filter(isWin).length / first.length
  const wr2 = second.filter(isWin).length / second.length

  return {
    status,
    label: delta > 0.05 ? 'Improving' : delta < -0.05 ? 'Decaying' : 'Stable',
    firstHalf: { count: first.length, expectancy: exp1, winrate: wr1 },
    secondHalf: { count: second.length, expectancy: exp2, winrate: wr2 },
    delta,
  }
}

// ============================================================
// DRAWDOWN CLUSTERING
// ============================================================

export function drawdownClustering(trades) {
  if (trades.length < MIN_TRADES) return null

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const sequence = sorted.map(t => isWin(t) ? 1 : 0)

  // Runs test
  let runs = 1
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) runs++
  }

  const n = sequence.length
  const n1 = sequence.filter(v => v === 1).length
  const n0 = n - n1

  // Expected runs and variance
  const expRuns = (2 * n1 * n0) / n + 1
  const varRuns = (2 * n1 * n0 * (2 * n1 * n0 - n)) / (n * n * (n - 1))
  const z = varRuns > 0 ? (runs - expRuns) / Math.sqrt(varRuns) : 0

  // z < -1.96: clustered, z > 1.96: alternating, else random
  const clustered = z < -1.96
  const alternating = z > 1.96

  return {
    runs,
    expectedRuns: Math.round(expRuns),
    zScore: z,
    clustered,
    alternating,
    label: clustered ? 'Clustered (losses come in series)' : alternating ? 'Alternating (consistent pattern)' : 'Random distribution',
  }
}

// ============================================================
// UNIQUE PAIRS / SESSIONS (for filter dropdowns)
// ============================================================

export function uniqueValues(trades, key) {
  return [...new Set(trades.map(t => t[key]).filter(Boolean))].sort()
}
