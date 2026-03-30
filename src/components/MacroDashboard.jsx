import React, { useState, useEffect } from 'react'

const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY || 'DPO6P55HB388RUUZ'

async function fetchFRED(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Network error')
    const data = await res.json()
    const latest = data.observations.reverse().find(o => o.value && o.value !== '.')
    return parseFloat(latest.value)
  } catch {
    return NaN
  }
}

function MetricCard({ title, value, suffix = '', loading }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 8 }}>{title}</div>
      <div className={`metric-value blue`}>
        {loading ? '—' : isNaN(value) ? 'N/A' : `${Number(value).toLocaleString()}${suffix}`}
      </div>
    </div>
  )
}

export default function MacroDashboard() {
  const [data, setData] = useState({ nfp: NaN, unemp: NaN, cpi: NaN, coreCpi: NaN })
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [nfp, unemp, cpi, coreCpi] = await Promise.all([
        fetchFRED('PAYEMS'),
        fetchFRED('UNRATE'),
        fetchFRED('CPIAUCSL'),
        fetchFRED('CPILFESL'),
      ])
      setData({ nfp, unemp, cpi, coreCpi })
      setUpdated(new Date().toLocaleString())
      setLoading(false)
    }
    load()
  }, [])

  const hawkish = ([
    data.nfp > 150000,
    data.cpi > 3,
    data.coreCpi > 3,
  ].filter(Boolean).length)

  let bias = { label: 'Calculating...', color: 'var(--text-muted)' }
  if (!loading) {
    if (hawkish >= 2) bias = { label: 'Bearish — Hawkish indicators suggest tighter Fed policy', color: 'var(--red)' }
    else if (hawkish === 1) bias = { label: 'Neutral — Mixed signals, market may stay range-bound', color: 'var(--orange)' }
    else bias = { label: 'Bullish — Dovish signals, Fed likely to ease policy', color: 'var(--green)' }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span className="section-title" style={{ marginBottom: 0, border: 'none' }}>US Macro Data</span>
        {updated && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updated: {updated}</span>
        )}
      </div>

      <div className="metrics-grid-4" style={{ marginBottom: 20 }}>
        <MetricCard title="Non-Farm Payrolls" value={data.nfp} suffix="K" loading={loading} />
        <MetricCard title="Unemployment Rate" value={data.unemp} suffix="%" loading={loading} />
        <MetricCard title="CPI (YoY)" value={data.cpi} suffix="%" loading={loading} />
        <MetricCard title="Core CPI (YoY)" value={data.coreCpi} suffix="%" loading={loading} />
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Trader Bias</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: bias.color }}>
          {bias.label}
        </div>
        {!loading && (
          <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
            {[
              { key: 'NFP', val: data.nfp > 150000 ? 'Hawkish' : 'Neutral', hawk: data.nfp > 150000 },
              { key: 'CPI', val: data.cpi > 3 ? 'Hawkish' : 'Neutral', hawk: data.cpi > 3 },
              { key: 'Core CPI', val: data.coreCpi > 3 ? 'Hawkish' : 'Neutral', hawk: data.coreCpi > 3 },
            ].map(f => (
              <span key={f.key} className="inline-stat">
                <span className="key">{f.key}:</span>
                <span className="val" style={{ color: f.hawk ? 'var(--red)' : 'var(--text-muted)' }}>{f.val}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
