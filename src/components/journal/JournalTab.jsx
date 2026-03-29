import React, { useState, useMemo } from 'react'
import { loadTrades, addTrade, updateTrade, deleteTrade } from '../../utils/journalStorage.js'
import { filterTrades, uniqueValues } from '../../utils/journalCalculations.js'
import TradeForm from './TradeForm.jsx'
import TradeList from './TradeList.jsx'
import MetricsDashboard from './MetricsDashboard.jsx'
import EdgeAnalysis from './EdgeAnalysis.jsx'
import SeasonalityPanel from './SeasonalityPanel.jsx'
import AdvancedMetrics from './AdvancedMetrics.jsx'

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'edge', label: 'Edge Analysis' },
  { id: 'seasonality', label: 'Seasonality' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'trades', label: 'Trade List' },
]

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
]

// ============================================================
// TRADE DETAIL MODAL
// ============================================================

function TradeDetailModal({ trade, onEdit, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {trade.pair} · {trade.direction} · {trade.date}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {trade.screenshots?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-title">Screenshots</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {trade.screenshots.map((src, i) => (
                  <img key={i} src={src} alt="" style={{ height: 140, borderRadius: 3, border: '1px solid var(--border)' }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 8 }}>Trade Details</div>
              {[
                ['Session', trade.session],
                ['Market', trade.marketType],
                ['Entry', trade.entry],
                ['Stop Loss', trade.stopLoss],
                ['Take Profit', trade.takeProfit ?? '—'],
                ['Exit', trade.exit],
                ['Risk', trade.riskPercent ? `${trade.riskPercent}%` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="stat-row">
                  <span className="stat-key">{k}</span>
                  <span className="stat-val">{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 8 }}>Result</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: trade.result > 0 ? 'var(--green)' : 'var(--red)', marginBottom: 12 }}>
                {trade.result > 0 ? '+' : ''}{trade.result}R
              </div>
              {[
                ['MAE', trade.mae != null ? `${trade.mae}R` : '—'],
                ['MFE', trade.mfe != null ? `${trade.mfe}R` : '—'],
                ['Time to 1R', trade.timeTo1R != null ? `${trade.timeTo1R}h` : '—'],
                ['Time to 2R', trade.timeTo2R != null ? `${trade.timeTo2R}h` : '—'],
                ['Duration', trade.tradeDuration != null ? `${trade.tradeDuration}h` : '—'],
                ['Entry Eff.', trade.entryEfficiency != null ? `${(trade.entryEfficiency * 100).toFixed(1)}%` : '—'],
                ['Exit Eff.', trade.exitEfficiency != null ? `${(trade.exitEfficiency * 100).toFixed(1)}%` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="stat-row">
                  <span className="stat-key">{k}</span>
                  <span className="stat-val">{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 8 }}>
                Confluences — Total {trade.totalScore} (HTF: {trade.htfScore} / LTF: {trade.ltfScore})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.entries(trade.confluences || {}).filter(([, v]) => v).map(([k]) => {
                  const isHTF = k.startsWith('htf') || k === 'cot' || k === 'opens'
                  const isLTF = k.startsWith('ltf')
                  return (
                    <span key={k} className={`badge ${isHTF ? 'badge-purple' : isLTF ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 9 }}>
                      {k}
                    </span>
                  )
                })}
                {Object.values(trade.confluences || {}).every(v => !v) && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>None selected</span>
                )}
              </div>
            </div>
          </div>

          {(trade.setupType || trade.errors?.length > 0 || trade.notes) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {trade.setupType && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 6 }}>Setup Type</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{trade.setupType}</div>
                </div>
              )}
              {trade.errors?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 6 }}>Errors</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {trade.errors.map(e => <span key={e} className="badge badge-red" style={{ fontSize: 9 }}>{e}</span>)}
                  </div>
                </div>
              )}
              {trade.notes && (
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-title" style={{ marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FORM MODAL — TradeForm includes its own save/cancel buttons
// ============================================================

function FormModal({ initial, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{initial ? 'Edit Trade' : 'New Trade'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <TradeForm initial={initial} onSave={onSave} onClose={onClose} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN JOURNAL TAB
// ============================================================

export default function JournalTab() {
  const [trades, setTrades] = useState(() => loadTrades())
  const [activeView, setActiveView] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editTrade, setEditTrade] = useState(null)
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [filters, setFilters] = useState({ period: 'all', pair: 'all', session: 'all', marketType: 'all' })

  const pairs = useMemo(() => ['all', ...uniqueValues(trades, 'pair')], [trades])
  const filtered = useMemo(() => filterTrades(trades, filters), [trades, filters])

  function handleSave(trade) {
    if (editTrade) {
      setTrades(prev => updateTrade(prev, trade))
    } else {
      setTrades(prev => addTrade(prev, trade))
    }
    setShowForm(false)
    setEditTrade(null)
  }

  function handleDelete(id) {
    setTrades(prev => deleteTrade(prev, id))
    setSelectedTrade(null)
  }

  function openEdit(trade) {
    setSelectedTrade(null)
    setEditTrade(trade)
    setShowForm(true)
  }

  function setFilter(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  const totalR = filtered.reduce((a, t) => a + (t.result ?? 0), 0)
  const wins = filtered.filter(t => (t.result ?? 0) > 0)
  const wr = filtered.length > 0 ? wins.length / filtered.length : 0
  const exp = filtered.length > 0 ? totalR / filtered.length : 0

  // ---- EMPTY STATE ----
  if (trades.length === 0 && !showForm) {
    return (
      <div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Trade</button>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <div className="empty-state-title">No trades yet</div>
          <div className="empty-state-text">
            Start by adding your first trade.<br />
            Upload a TradingView screenshot — Claude Vision will auto-fill the form.
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add First Trade</button>
        </div>
        {showForm && <FormModal initial={null} onSave={handleSave} onClose={() => setShowForm(false)} />}
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>

      {/* Top bar: view switcher + filters + new trade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`btn btn-sm ${activeView === v.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div className="filter-bar">
          <select className="filter-select" value={filters.period} onChange={e => setFilter('period', e.target.value)}>
            {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className="filter-select" value={filters.pair} onChange={e => setFilter('pair', e.target.value)}>
            {pairs.map(p => <option key={p} value={p}>{p === 'all' ? 'All Pairs' : p}</option>)}
          </select>
          <select className="filter-select" value={filters.session} onChange={e => setFilter('session', e.target.value)}>
            {['all', 'Asia', 'London', 'New York', 'Overlap'].map(s => <option key={s} value={s}>{s === 'all' ? 'All Sessions' : s}</option>)}
          </select>
          <select className="filter-select" value={filters.marketType} onChange={e => setFilter('marketType', e.target.value)}>
            {['all', 'Trend', 'Range', 'Volatil', 'Unklar'].map(m => <option key={m} value={m}>{m === 'all' ? 'All Markets' : m}</option>)}
          </select>
        </div>

        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} / {trades.length}
        </span>

        <button className="btn btn-primary btn-sm" onClick={() => { setEditTrade(null); setShowForm(true) }}>
          + New Trade
        </button>
      </div>

      {/* Quick stats strip */}
      <div style={{
        display: 'flex', gap: 24, padding: '10px 16px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 4, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Total R', val: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, color: totalR >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Winrate', val: `${(wr * 100).toFixed(1)}%`, color: wr >= 0.5 ? 'var(--green)' : 'var(--red)' },
          { label: 'Expectancy', val: `${exp >= 0 ? '+' : ''}${exp.toFixed(3)}R`, color: exp >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Wins', val: wins.length, color: 'var(--green)' },
          { label: 'Losses', val: filtered.length - wins.length, color: 'var(--red)' },
          { label: 'Avg Score', val: filtered.length > 0 ? (filtered.reduce((a, t) => a + (t.totalScore ?? 0), 0) / filtered.length).toFixed(1) : '—', color: 'var(--blue)' },
        ].map(s => (
          <span key={s.label} className="inline-stat">
            <span className="key">{s.label}:</span>
            <span style={{ fontWeight: 600, fontSize: 12, color: s.color }}>{s.val}</span>
          </span>
        ))}
      </div>

      {/* Main panel */}
      {activeView === 'dashboard' && <MetricsDashboard trades={filtered} />}
      {activeView === 'edge' && (
        <div>
          <div className="section-title">Edge Analysis — Confluence Engine</div>
          <EdgeAnalysis trades={filtered} />
        </div>
      )}
      {activeView === 'seasonality' && (
        <div>
          <div className="section-title">Seasonality</div>
          <SeasonalityPanel trades={filtered} />
        </div>
      )}
      {activeView === 'advanced' && (
        <div>
          <div className="section-title">Advanced Metrics</div>
          <AdvancedMetrics trades={filtered} />
        </div>
      )}
      {activeView === 'trades' && (
        <div>
          <div className="section-title">Trade List</div>
          <TradeList
            trades={filtered}
            onSelectTrade={setSelectedTrade}
            onDeleteTrade={handleDelete}
          />
        </div>
      )}

      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onEdit={() => openEdit(selectedTrade)}
          onClose={() => setSelectedTrade(null)}
        />
      )}

      {showForm && (
        <FormModal
          initial={editTrade}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTrade(null) }}
        />
      )}
    </div>
  )
}
