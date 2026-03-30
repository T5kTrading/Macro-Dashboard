import React, { useState } from 'react'
import { exportCSV } from '../../utils/journalStorage.js'
import { filterTrades, uniqueValues } from '../../utils/journalCalculations.js'

const SESSIONS = ['all', 'Asia', 'London', 'New York', 'Overlap']
const MARKET_TYPES = ['all', 'Trend', 'Range', 'Volatil', 'Unklar']

function fmt(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—'
  return Number(val).toFixed(decimals)
}

function RCell({ val }) {
  if (val == null || isNaN(val)) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const v = parseFloat(val)
  const color = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-muted)'
  return <span style={{ color, fontWeight: 500 }}>{v > 0 ? '+' : ''}{fmt(v)}</span>
}

export default function TradeList({ trades, onSelectTrade, onDeleteTrade }) {
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [filters, setFilters] = useState({ pair: 'all', session: 'all', marketType: 'all', pnl: 'all' })

  const pairs = ['all', ...uniqueValues(trades, 'pair')]

  function setFilter(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = filterTrades(trades, filters)

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortField] ?? ''
    let bv = b[sortField] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  function SortTh({ field, children }) {
    const active = sortField === field
    return (
      <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', color: active ? 'var(--blue)' : undefined }}>
        {children} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <select className="filter-select" value={filters.pair} onChange={e => setFilter('pair', e.target.value)}>
          {pairs.map(p => <option key={p} value={p}>{p === 'all' ? 'All Pairs' : p}</option>)}
        </select>
        <select className="filter-select" value={filters.session} onChange={e => setFilter('session', e.target.value)}>
          {SESSIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sessions' : s}</option>)}
        </select>
        <select className="filter-select" value={filters.marketType} onChange={e => setFilter('marketType', e.target.value)}>
          {MARKET_TYPES.map(m => <option key={m} value={m}>{m === 'all' ? 'All Market Types' : m}</option>)}
        </select>
        <select className="filter-select" value={filters.pnl} onChange={e => setFilter('pnl', e.target.value)}>
          <option value="all">Win + Loss</option>
          <option value="Win">Wins Only</option>
          <option value="Loss">Losses Only</option>
        </select>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sorted.length} trades</span>

        <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(sorted)}>
          ↓ CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <SortTh field="date">Date</SortTh>
              <SortTh field="pair">Pair</SortTh>
              <SortTh field="direction">Dir</SortTh>
              <SortTh field="session">Session</SortTh>
              <SortTh field="marketType">Market</SortTh>
              <SortTh field="htfScore">HTF</SortTh>
              <SortTh field="ltfScore">LTF</SortTh>
              <SortTh field="totalScore">Score</SortTh>
              <SortTh field="result">Result</SortTh>
              <SortTh field="entryEfficiency">Entry Eff</SortTh>
              <SortTh field="exitEfficiency">Exit Eff</SortTh>
              <SortTh field="timeTo2R">T to 2R</SortTh>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(trade => (
              <tr key={trade.id} onClick={() => onSelectTrade(trade)}>
                <td>{trade.date}</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{trade.pair}</td>
                <td>
                  <span className={`badge ${trade.direction === 'Long' ? 'badge-green' : 'badge-red'}`}>
                    {trade.direction}
                  </span>
                </td>
                <td>{trade.session}</td>
                <td>{trade.marketType}</td>
                <td style={{ color: 'var(--purple)' }}>{trade.htfScore ?? '—'}</td>
                <td style={{ color: 'var(--green)' }}>{trade.ltfScore ?? '—'}</td>
                <td style={{ color: 'var(--blue)' }}>{trade.totalScore ?? '—'}</td>
                <td><RCell val={trade.result} /></td>
                <td>{trade.entryEfficiency != null ? `${(trade.entryEfficiency * 100).toFixed(0)}%` : '—'}</td>
                <td>{trade.exitEfficiency != null ? `${(trade.exitEfficiency * 100).toFixed(0)}%` : '—'}</td>
                <td>{trade.timeTo2R != null ? `${trade.timeTo2R}h` : '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: 'transparent' }}
                    onClick={() => {
                      if (confirm('Delete this trade?')) onDeleteTrade(trade.id)
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  No trades match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
