import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { coreMetrics, drawdownMetrics, executionMetrics } from '../../utils/journalCalculations.js'

const MIN_TRADES = 30

function fmt(val, decimals = 2, suffix = '') {
  if (val == null || isNaN(val)) return '—'
  return `${Number(val).toFixed(decimals)}${suffix}`
}

function pct(val) {
  if (val == null || isNaN(val)) return '—'
  return `${(val * 100).toFixed(1)}%`
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${color || ''}`} style={{ marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Trade #{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function InsufficientData({ needed = 30, have = 0 }) {
  return (
    <div className="insufficient-data">
      Insufficient data — need {needed} trades, have {have}
    </div>
  )
}

// ============================================================
// EQUITY CURVE
// ============================================================

function EquityChart({ data }) {
  return (
    <div className="chart-container-tall">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="trade" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(1)} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--border-accent)" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="equity" name="Equity (R)" stroke="var(--blue)" fill="url(#eqGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// R DISTRIBUTION
// ============================================================

function RDistChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="r" tick={{ fontSize: 9 }} tickFormatter={v => `${v > 0 ? '+' : ''}${v}R`} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="var(--border-accent)" />
          <Bar dataKey="count" name="Trades" fill="var(--blue)"
            radius={[2, 2, 0, 0]}
            label={false}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// DRAWDOWN CHART
// ============================================================

function DrawdownChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--red)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="trade" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(1)}R`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--border-accent)" />
          <Area type="monotone" dataKey="drawdown" name="Drawdown (R)" stroke="var(--red)" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MetricsDashboard({ trades }) {
  const core = useMemo(() => coreMetrics(trades), [trades])
  const dd = useMemo(() => drawdownMetrics(trades), [trades])
  const exec = useMemo(() => executionMetrics(trades), [trades])
  const count = trades.length

  if (count === 0) return null

  return (
    <div>
      {/* ---- CORE PERFORMANCE ---- */}
      <Section title="Core Performance">
        <div className="metrics-grid" style={{ marginBottom: 16 }}>
          <MetricCard
            label="Winrate"
            value={core ? pct(core.winrate) : '—'}
            color={core && core.winrate >= 0.5 ? 'green' : 'red'}
          />
          <MetricCard
            label="Expectancy"
            value={core ? fmt(core.expectancy, 3) + 'R' : '—'}
            color={core && core.expectancy > 0 ? 'green' : 'red'}
            sub="per trade"
          />
          <MetricCard
            label="Profit Factor"
            value={core && core.profitFactor != null ? fmt(core.profitFactor, 2) : '—'}
            color={core && core.profitFactor > 1 ? 'green' : 'red'}
          />
          <MetricCard
            label="Avg Win"
            value={core ? fmt(core.avgWin, 2) + 'R' : '—'}
            color="green"
          />
          <MetricCard
            label="Avg Loss"
            value={core ? fmt(core.avgLoss, 2) + 'R' : '—'}
            color="red"
          />
          <MetricCard
            label="Sharpe Ratio"
            value={core?.sharpe != null ? fmt(core.sharpe, 2) : count < MIN_TRADES ? `${count}/${MIN_TRADES}` : '—'}
            color={core?.sharpe > 1 ? 'green' : 'orange'}
          />
          <MetricCard
            label="Sortino"
            value={core?.sortino != null ? fmt(core.sortino, 2) : count < MIN_TRADES ? `${count}/${MIN_TRADES}` : '—'}
            color={core?.sortino > 1 ? 'green' : 'orange'}
          />
          <MetricCard
            label="Total Trades"
            value={count}
            color="blue"
            sub={core ? `${core.wins}W / ${core.losses}L` : undefined}
          />
        </div>

        {/* Equity Curve */}
        {core && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Equity Curve (R)</div>
              <EquityChart data={core.equityCurve} />
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>R Distribution</div>
              <RDistChart data={core.rDistribution} />
            </div>
          </div>
        )}
      </Section>

      {/* ---- DRAWDOWN ---- */}
      <Section title="Drawdown Analysis">
        {count < MIN_TRADES ? (
          <InsufficientData needed={MIN_TRADES} have={count} />
        ) : (
          <>
            <div className="metrics-grid" style={{ marginBottom: 16 }}>
              <MetricCard label="Max Drawdown" value={dd ? fmt(dd.maxDDR, 2) + 'R' : '—'} color="red" />
              <MetricCard label="Max DD (%)" value={dd ? pct(dd.maxDDPct) : '—'} color="red" />
              <MetricCard label="Avg DD / Trade" value={dd ? fmt(dd.avgPerTrade, 2) + 'R' : '—'} color="orange" />
              <MetricCard label="Avg Recovery" value={dd ? `${dd.avgRecovery} trades` : '—'} color="orange" />
              <MetricCard label="Avg DD Duration" value={dd ? `${dd.avgDDDuration}d` : '—'} color="orange" />
              <MetricCard label="Avg DD Length" value={dd ? `${dd.avgDDLength} trades` : '—'} color="orange" />
            </div>
            {dd && (
              <div className="card" style={{ padding: 12 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Drawdown Curve</div>
                <DrawdownChart data={dd.ddCurve} />
              </div>
            )}
          </>
        )}
      </Section>

      {/* ---- EXECUTION ---- */}
      <Section title="Execution & Risk">
        {count < MIN_TRADES ? (
          <InsufficientData needed={MIN_TRADES} have={count} />
        ) : (
          <div className="metrics-grid-2" style={{ gap: 12 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Execution Quality</div>
              <div className="stat-row">
                <span className="stat-key">Avg Entry Efficiency</span>
                <span className="stat-val">{exec?.avgEntryEff != null ? pct(exec.avgEntryEff) : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Avg Exit Efficiency</span>
                <span className="stat-val">{exec?.avgExitEff != null ? pct(exec.avgExitEff) : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Avg MAE (Winners)</span>
                <span className="stat-val">{exec?.avgMAEWins != null ? fmt(exec.avgMAEWins, 2) + 'R' : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Avg MAE (Losers)</span>
                <span className="stat-val red">{exec?.avgMAELoss != null ? fmt(exec.avgMAELoss, 2) + 'R' : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Avg MFE</span>
                <span className="stat-val green">{exec?.avgMFE != null ? fmt(exec.avgMFE, 2) + 'R' : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Avg R Left on Table</span>
                <span className="stat-val orange">{exec?.avgLeftOnTable != null ? fmt(exec.avgLeftOnTable, 2) + 'R' : '—'}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Risk Management</div>
              <div className="stat-row">
                <span className="stat-key">Avg Risk / Trade</span>
                <span className="stat-val">{exec?.riskMean != null ? fmt(exec.riskMean, 2) + '%' : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Risk Consistency (σ)</span>
                <span className="stat-val">{exec?.riskStd != null ? fmt(exec.riskStd, 3) : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Kelly Criterion</span>
                <span className={`stat-val ${exec?.kelly > 0 ? 'green' : 'red'}`}>
                  {exec?.kelly != null ? pct(exec.kelly) : '—'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Risk of Ruin (20R)</span>
                <span className={`stat-val ${exec?.ror < 0.05 ? 'green' : exec?.ror < 0.1 ? 'orange' : 'red'}`}>
                  {exec?.ror != null ? pct(exec.ror) : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
