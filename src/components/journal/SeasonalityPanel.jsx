import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { seasonalityMetrics } from '../../utils/journalCalculations.js'

function pct(v) { return v != null ? `${(v * 100).toFixed(1)}%` : '—' }
function fmt(v, d = 2) { return v != null ? Number(v).toFixed(d) : '—' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  )
}

function GroupChart({ data, dataKey = 'expectancy', nameKey = 'key', height = 160 }) {
  if (!data || data.every(d => d.count === 0)) {
    return <div className="insufficient-data">No data</div>
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 20, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(2)}R`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} name="Expectancy" radius={[2,2,0,0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={(entry[dataKey] ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GroupTable({ data, nameLabel = 'Group' }) {
  return (
    <table className="data-table" style={{ fontSize: 11 }}>
      <thead>
        <tr>
          <th>{nameLabel}</th>
          <th>Trades</th>
          <th>Winrate</th>
          <th>Expectancy</th>
        </tr>
      </thead>
      <tbody>
        {data.filter(d => d.count > 0).map(row => (
          <tr key={row.key}>
            <td style={{ color: 'var(--text-primary)' }}>{row.key}</td>
            <td>{row.count}</td>
            <td style={{ color: row.winrate > 0.5 ? 'var(--green)' : 'var(--red)' }}>
              {pct(row.winrate)}
            </td>
            <td style={{ color: row.expectancy > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {fmt(row.expectancy)}R
            </td>
          </tr>
        ))}
        {data.every(d => d.count === 0) && (
          <tr><td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No data</td></tr>
        )}
      </tbody>
    </table>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

export default function SeasonalityPanel({ trades }) {
  const data = useMemo(() => seasonalityMetrics(trades), [trades])

  if (!data || trades.length === 0) return null

  const { byDay, bySession, byMarket, byMonth, bySetup, currentStreak, maxWinStreak, maxLossStreak } = data

  const streakColor = currentStreak > 0 ? 'var(--green)' : currentStreak < 0 ? 'var(--red)' : 'var(--text-muted)'
  const streakLabel = currentStreak === 0 ? '—' : `${Math.abs(currentStreak)} ${currentStreak > 0 ? 'wins' : 'losses'}`

  return (
    <div>
      {/* Streaks */}
      <Section title="Win / Loss Streaks">
        <div className="metrics-grid-3">
          <div className="card">
            <div className="metric-label">Current Streak</div>
            <div className="metric-value" style={{ color: streakColor, marginTop: 4 }}>{streakLabel}</div>
          </div>
          <div className="card">
            <div className="metric-label">Max Win Streak</div>
            <div className="metric-value green" style={{ marginTop: 4 }}>{maxWinStreak}</div>
          </div>
          <div className="card">
            <div className="metric-label">Max Loss Streak</div>
            <div className="metric-value red" style={{ marginTop: 4 }}>{maxLossStreak}</div>
          </div>
        </div>
      </Section>

      {/* By Day */}
      <Section title="Performance by Weekday">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <GroupChart data={byDay} />
          <GroupTable data={byDay} nameLabel="Day" />
        </div>
      </Section>

      {/* By Session */}
      <Section title="Performance by Session">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <GroupChart data={bySession} />
          <GroupTable data={bySession} nameLabel="Session" />
        </div>
      </Section>

      {/* By Market Type */}
      <Section title="Performance by Market Type">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <GroupChart data={byMarket} />
          <GroupTable data={byMarket} nameLabel="Market" />
        </div>
      </Section>

      {/* By Month */}
      <Section title="Performance by Month">
        <GroupChart data={byMonth} height={180} />
        <div style={{ marginTop: 12 }}>
          <GroupTable data={byMonth} nameLabel="Month" />
        </div>
      </Section>

      {/* By Setup */}
      {bySetup.some(d => d.count > 0) && (
        <Section title="Performance by Setup Type">
          <GroupChart data={bySetup} height={160} />
          <div style={{ marginTop: 12 }}>
            <GroupTable data={bySetup} nameLabel="Setup" />
          </div>
        </Section>
      )}
    </div>
  )
}
