import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import {
  confluenceScoreAnalysis, htfLtfEdge, singleConfluenceEdge,
  topCombinations, conditionalEdge, minimumConfluenceValidation,
  ALL_CONFLUENCES,
} from '../../utils/journalCalculations.js'

const MIN_TRADES = 30

function pct(v) { return v != null ? `${(v * 100).toFixed(1)}%` : '—' }
function fmt(v, d = 3) { return v != null ? Number(v).toFixed(d) : '—' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function InsufficientData({ have, needed = 30 }) {
  return (
    <div className="insufficient-data">
      Insufficient data — need {needed} trades, have {have ?? '?'}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      {label != null && <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// CONFLUENCE SCORE BREAKDOWN
// ============================================================

function ScoreBreakdown({ trades }) {
  const data = useMemo(() => confluenceScoreAnalysis(trades), [trades])

  if (!data) return <InsufficientData have={trades.length} />

  return (
    <div>
      <div style={{ height: 180, marginBottom: 16 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="score" tick={{ fontSize: 9 }} label={{ value: 'Confluence Score', position: 'insideBottom', offset: -2, fontSize: 9, fill: 'var(--text-muted)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => pct(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="winrate" name="Winrate" fill="var(--green)" radius={[2,2,0,0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.winrate > 0.5 ? 'var(--green)' : 'var(--red)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Score</th>
              <th>Trades</th>
              <th>Winrate</th>
              <th>Expectancy</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.score}>
                <td><span className="badge badge-blue">{row.score}</span></td>
                <td>{row.count}</td>
                <td style={{ color: row.winrate > 0.5 ? 'var(--green)' : 'var(--red)' }}>{pct(row.winrate)}</td>
                <td style={{ color: row.expectancy > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(row.expectancy)}R</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// HTF vs LTF EDGE
// ============================================================

function HTFLTFEdge({ trades }) {
  const data = useMemo(() => htfLtfEdge(trades), [trades])

  if (!data) return <InsufficientData have={trades.length} />

  function Row({ label, with: w, without: wo }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="card" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>With confluence ({w?.count ?? 0} trades)</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span className="inline-stat"><span className="key">WR:</span><span className="val" style={{ color: 'var(--green)' }}>{pct(w?.winrate)}</span></span>
              <span className="inline-stat"><span className="key">E:</span><span className="val" style={{ color: w?.expectancy > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(w?.expectancy)}R</span></span>
            </div>
          </div>
          <div className="card" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Without ({wo?.count ?? 0} trades)</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span className="inline-stat"><span className="key">WR:</span><span className="val" style={{ color: 'var(--text-secondary)' }}>{pct(wo?.winrate)}</span></span>
              <span className="inline-stat"><span className="key">E:</span><span className="val" style={{ color: wo?.expectancy > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(wo?.expectancy)}R</span></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Row label="HTF Confluences" with={data.htf.with} without={data.htf.without} />
      <Row label="LTF Confluences" with={data.ltf.with} without={data.ltf.without} />
    </div>
  )
}

// ============================================================
// SINGLE CONFLUENCE EDGE
// ============================================================

function SingleConfluenceEdgePanel({ trades }) {
  const data = useMemo(() => singleConfluenceEdge(trades), [trades])

  if (!data || data.length === 0) return <InsufficientData have={trades.length} />

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Confluence</th>
            <th>Group</th>
            <th>With (n)</th>
            <th>WR With</th>
            <th>E With</th>
            <th>Without (n)</th>
            <th>WR Without</th>
            <th>E Without</th>
            <th>WR Δ</th>
            <th>E Δ</th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.label}</td>
              <td>
                <span className={`badge badge-${c.group === 'htf' ? 'purple' : c.group === 'ltf' ? 'green' : 'orange'}`}>
                  {c.group.toUpperCase()}
                </span>
              </td>
              <td>{c.withCount}</td>
              <td style={{ color: c.wrWith > 0.5 ? 'var(--green)' : 'var(--red)' }}>{pct(c.wrWith)}</td>
              <td style={{ color: c.expWith > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(c.expWith)}R</td>
              <td>{c.withoutCount}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{pct(c.wrWithout)}</td>
              <td style={{ color: c.expWithout > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(c.expWithout)}R</td>
              <td style={{ color: c.wrDelta > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {c.wrDelta > 0 ? '+' : ''}{pct(c.wrDelta)}
              </td>
              <td style={{ color: c.expDelta > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {c.expDelta > 0 ? '+' : ''}{fmt(c.expDelta)}R
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// TOP COMBINATIONS
// ============================================================

function TopCombos({ trades }) {
  const combos2 = useMemo(() => topCombinations(trades, 2), [trades])
  const combos3 = useMemo(() => topCombinations(trades, 3), [trades])

  if (trades.length < MIN_TRADES) return <InsufficientData have={trades.length} />

  function ComboTable({ data, title }) {
    if (data.length === 0) {
      return (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
          <div className="insufficient-data">No combinations with 30+ trades yet.</div>
        </div>
      )
    }
    return (
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{title}</div>
        <table className="data-table">
          <thead>
            <tr><th>Combination</th><th>Trades</th><th>Winrate</th><th>Expectancy</th></tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.key}>
                <td style={{ color: 'var(--text-primary)' }}>{row.labels.join(' + ')}</td>
                <td>{row.count}</td>
                <td style={{ color: row.winrate > 0.5 ? 'var(--green)' : 'var(--red)' }}>{pct(row.winrate)}</td>
                <td style={{ color: row.expectancy > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt(row.expectancy)}R</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <ComboTable data={combos2} title="Top 2-Confluence Combinations" />
      <ComboTable data={combos3} title="Top 3-Confluence Combinations" />
    </div>
  )
}

// ============================================================
// CONDITIONAL EDGE
// ============================================================

function ConditionalEdgePanel({ trades }) {
  const [confA, setConfA] = useState('htf_mss')
  const [confB, setConfB] = useState('ltf_poc')

  const result = useMemo(() => conditionalEdge(trades, confA, confB), [trades, confA, confB])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Show performance of</span>
        <select className="filter-select" value={confA} onChange={e => setConfA(e.target.value)}>
          {ALL_CONFLUENCES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>with vs without</span>
        <select className="filter-select" value={confB} onChange={e => setConfB(e.target.value)}>
          {ALL_CONFLUENCES.filter(c => c.id !== confA).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
            {ALL_CONFLUENCES.find(c => c.id === confA)?.label} + {ALL_CONFLUENCES.find(c => c.id === confB)?.label}
          </div>
          {result.withBoth ? (
            <div>
              <div className="stat-row"><span className="stat-key">Trades</span><span className="stat-val">{result.withBoth.count}</span></div>
              <div className="stat-row"><span className="stat-key">Winrate</span><span className={`stat-val ${result.withBoth.winrate > 0.5 ? 'green' : 'red'}`}>{pct(result.withBoth.winrate)}</span></div>
              <div className="stat-row"><span className="stat-key">Expectancy</span><span className={`stat-val ${result.withBoth.expectancy > 0 ? 'green' : 'red'}`}>{fmt(result.withBoth.expectancy)}R</span></div>
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Not enough data (&lt;10 trades)</div>}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
            {ALL_CONFLUENCES.find(c => c.id === confA)?.label} only (no {ALL_CONFLUENCES.find(c => c.id === confB)?.label})
          </div>
          {result.withAOnly ? (
            <div>
              <div className="stat-row"><span className="stat-key">Trades</span><span className="stat-val">{result.withAOnly.count}</span></div>
              <div className="stat-row"><span className="stat-key">Winrate</span><span className={`stat-val ${result.withAOnly.winrate > 0.5 ? 'green' : 'red'}`}>{pct(result.withAOnly.winrate)}</span></div>
              <div className="stat-row"><span className="stat-key">Expectancy</span><span className={`stat-val ${result.withAOnly.expectancy > 0 ? 'green' : 'red'}`}>{fmt(result.withAOnly.expectancy)}R</span></div>
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Not enough data (&lt;10 trades)</div>}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MINIMUM CONFLUENCE VALIDATION
// ============================================================

function MinConfluencePanel({ trades }) {
  const data = useMemo(() => minimumConfluenceValidation(trades), [trades])

  if (!data) return <InsufficientData have={trades.length} />

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Min Score</th>
          <th>Qualifying Trades</th>
          <th>Winrate</th>
          <th>Expectancy</th>
          <th>With HTF MSS</th>
          <th>Without HTF MSS</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.min}>
            <td><span className="badge badge-blue">≥{row.min}</span></td>
            <td>{row.count}</td>
            {row.insufficient ? (
              <td colSpan={4} style={{ color: 'var(--text-muted)' }}>Insufficient data</td>
            ) : (
              <>
                <td style={{ color: row.winrate > 0.5 ? 'var(--green)' : 'var(--red)' }}>{pct(row.winrate)}</td>
                <td style={{ color: row.expectancy > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt(row.expectancy)}R</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                  {row.withMSS ? `${pct(row.withMSS.winrate)} / ${fmt(row.withMSS.expectancy)}R (n=${row.withMSS.count})` : '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                  {row.withoutMSS ? `${pct(row.withoutMSS.winrate)} / ${fmt(row.withoutMSS.expectancy)}R (n=${row.withoutMSS.count})` : '—'}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================
// MAIN EXPORT
// ============================================================

const EDGE_TABS = [
  { id: 'score', label: 'Score Breakdown' },
  { id: 'htfltf', label: 'HTF vs LTF' },
  { id: 'single', label: 'Single Confluence' },
  { id: 'combos', label: 'Combinations' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'minconf', label: 'Min Confluence' },
]

export default function EdgeAnalysis({ trades }) {
  const [activeTab, setActiveTab] = useState('score')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {EDGE_TABS.map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'score' && <ScoreBreakdown trades={trades} />}
      {activeTab === 'htfltf' && <HTFLTFEdge trades={trades} />}
      {activeTab === 'single' && <SingleConfluenceEdgePanel trades={trades} />}
      {activeTab === 'combos' && <TopCombos trades={trades} />}
      {activeTab === 'conditional' && <ConditionalEdgePanel trades={trades} />}
      {activeTab === 'minconf' && <MinConfluencePanel trades={trades} />}
    </div>
  )
}
