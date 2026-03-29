import React, { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { edgeStability, drawdownClustering, monteCarlo } from '../../utils/journalCalculations.js'

const MIN_TRADES = 30

function fmt(v, d = 2) { return v != null && !isNaN(v) ? Number(v).toFixed(d) : '—' }
function pct(v) { return v != null && !isNaN(v) ? `${(v * 100).toFixed(1)}%` : '—' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function InsufficientData({ have }) {
  return (
    <div className="insufficient-data">
      Insufficient data — need {MIN_TRADES} trades, have {have ?? '?'}
    </div>
  )
}

// ============================================================
// EDGE STABILITY
// ============================================================

function EdgeStabilityPanel({ trades }) {
  const data = useMemo(() => edgeStability(trades), [trades])

  if (!data || data.status === 'insufficient') return <InsufficientData have={trades.length} />

  const statusColor = {
    stable: 'var(--blue)',
    improving: 'var(--green)',
    decaying: 'var(--red)',
  }[data.status] ?? 'var(--text-muted)'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>{data.label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Δ Expectancy: <span style={{ color: data.delta > 0 ? 'var(--green)' : data.delta < 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
            {data.delta > 0 ? '+' : ''}{fmt(data.delta)}R
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
            First Half ({data.firstHalf.count} trades)
          </div>
          <div className="stat-row">
            <span className="stat-key">Winrate</span>
            <span className={`stat-val ${data.firstHalf.winrate > 0.5 ? 'green' : 'red'}`}>{pct(data.firstHalf.winrate)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Expectancy</span>
            <span className={`stat-val ${data.firstHalf.expectancy > 0 ? 'green' : 'red'}`}>{fmt(data.firstHalf.expectancy)}R</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
            Second Half ({data.secondHalf.count} trades)
          </div>
          <div className="stat-row">
            <span className="stat-key">Winrate</span>
            <span className={`stat-val ${data.secondHalf.winrate > 0.5 ? 'green' : 'red'}`}>{pct(data.secondHalf.winrate)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Expectancy</span>
            <span className={`stat-val ${data.secondHalf.expectancy > 0 ? 'green' : 'red'}`}>{fmt(data.secondHalf.expectancy)}R</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DRAWDOWN CLUSTERING
// ============================================================

function ClusteringPanel({ trades }) {
  const data = useMemo(() => drawdownClustering(trades), [trades])

  if (!data) return <InsufficientData have={trades.length} />

  const labelColor = data.clustered ? 'var(--red)' : data.alternating ? 'var(--orange)' : 'var(--green)'

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: labelColor }}>{data.label}</span>
      </div>
      <div className="metrics-grid-3">
        <div className="card">
          <div className="metric-label">Observed Runs</div>
          <div className="metric-value blue" style={{ marginTop: 4 }}>{data.runs}</div>
        </div>
        <div className="card">
          <div className="metric-label">Expected Runs</div>
          <div className="metric-value" style={{ marginTop: 4 }}>{data.expectedRuns}</div>
        </div>
        <div className="card">
          <div className="metric-label">Z-Score</div>
          <div className="metric-value" style={{ marginTop: 4, color: Math.abs(data.zScore) > 1.96 ? 'var(--orange)' : 'var(--text-primary)' }}>
            {fmt(data.zScore)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8 }}>
        Runs Test: z &lt; -1.96 = clustered losses · z &gt; 1.96 = alternating · else = random<br />
        Current: z = {fmt(data.zScore)} → {data.clustered ? 'losses tend to cluster' : data.alternating ? 'wins and losses alternate' : 'random distribution (healthy)'}
      </div>
    </div>
  )
}

// ============================================================
// MONTE CARLO
// ============================================================

function MonteCarloPanel({ trades }) {
  const data = useMemo(() => monteCarlo(trades, 1000), [trades])

  if (!data) return <InsufficientData have={trades.length} />

  // Build distribution histogram
  const buckets = {}
  data.distribution.forEach(v => {
    const key = Math.round(v / 5) * 5 // 5R buckets
    buckets[key] = (buckets[key] || 0) + 1
  })
  const chartData = Object.entries(buckets)
    .map(([r, count]) => ({ r: parseFloat(r), count }))
    .sort((a, b) => a.r - b.r)

  const percentileColor = data.worst5 >= 0 ? 'var(--green)' : data.worst5 > -20 ? 'var(--orange)' : 'var(--red)'

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
        1,000 simulations · {trades.length} trade samples · bootstrapped with replacement
      </div>

      <div className="metrics-grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label">Median Outcome</div>
          <div className={`metric-value ${data.median >= 0 ? 'green' : 'red'}`} style={{ marginTop: 4 }}>
            {data.median >= 0 ? '+' : ''}{fmt(data.median)}R
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Worst 5%</div>
          <div className="metric-value" style={{ color: percentileColor, marginTop: 4 }}>
            {fmt(data.worst5)}R
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Worst 1%</div>
          <div className="metric-value red" style={{ marginTop: 4 }}>
            {fmt(data.worst1)}R
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Prob. of Profit</div>
          <div className={`metric-value ${data.probPositive > 0.7 ? 'green' : data.probPositive > 0.5 ? 'orange' : 'red'}`} style={{ marginTop: 4 }}>
            {pct(data.probPositive)}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Distribution of Outcomes (R)</div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--purple)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="r" tick={{ fontSize: 9 }} tickFormatter={v => `${v > 0 ? '+' : ''}${v}R`} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="custom-tooltip">
                    <div>{payload[0].payload.r > 0 ? '+' : ''}{payload[0].payload.r}R</div>
                    <div style={{ color: 'var(--purple)' }}>{payload[0].value} simulations</div>
                  </div>
                )
              }} />
              <ReferenceLine x={0} stroke="var(--border-accent)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="count" name="Simulations" stroke="var(--purple)" fill="url(#mcGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function AdvancedMetrics({ trades }) {
  return (
    <div>
      <Section title="Edge Stability — First vs Second Half">
        <EdgeStabilityPanel trades={trades} />
      </Section>

      <Section title="Drawdown Clustering (Runs Test)">
        <ClusteringPanel trades={trades} />
      </Section>

      <Section title="Monte Carlo Simulation">
        <MonteCarloPanel trades={trades} />
      </Section>
    </div>
  )
}
