const STORAGE_KEY = 'macro_journal_trades'

export function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTrades(trades) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
    return true
  } catch (e) {
    console.error('Failed to save trades:', e)
    return false
  }
}

export function addTrade(trades, trade) {
  const updated = [...trades, trade]
  saveTrades(updated)
  return updated
}

export function updateTrade(trades, updated) {
  const list = trades.map(t => t.id === updated.id ? updated : t)
  saveTrades(list)
  return list
}

export function deleteTrade(trades, id) {
  const list = trades.filter(t => t.id !== id)
  saveTrades(list)
  return list
}

export function exportCSV(trades) {
  const headers = [
    'Date', 'Pair', 'Direction', 'Session', 'Market Type',
    'Entry', 'SL', 'TP', 'Exit', 'Risk%', 'Result (R)', 'P/L',
    'HTF Score', 'LTF Score', 'Total Score',
    'MAE', 'MFE', 'Time to 1R (h)', 'Time to 2R (h)', 'Duration (h)',
    'Entry Efficiency', 'Exit Efficiency',
    'Setup Type', 'Errors', 'Notes',
  ]

  const rows = trades.map(t => [
    t.date, t.pair, t.direction, t.session, t.marketType,
    t.entry, t.stopLoss, t.takeProfit, t.exit, t.riskPercent, t.result, t.pnl,
    t.htfScore, t.ltfScore, t.totalScore,
    t.mae, t.mfe, t.timeTo1R ?? '', t.timeTo2R ?? '', t.tradeDuration,
    t.entryEfficiency?.toFixed(3) ?? '', t.exitEfficiency?.toFixed(3) ?? '',
    `"${t.setupType ?? ''}"`, `"${(t.errors ?? []).join('; ')}"`, `"${t.notes ?? ''}"`,
  ])

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `journal_export_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
