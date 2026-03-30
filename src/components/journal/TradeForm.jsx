import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ALL_CONFLUENCES, HTF_CONFLUENCES, LTF_CONFLUENCES, KEY_CONFLUENCES,
  computeScores, computeEfficiencies
} from '../../utils/journalCalculations.js'
import ScreenshotUpload from './ScreenshotUpload.jsx'

const SESSIONS = ['Asia', 'London', 'New York', 'Overlap']
const MARKET_TYPES = ['Trend', 'Range', 'Volatil', 'Unklar']
const COMMON_ERRORS = [
  'FOMO Entry', 'Overlevered', 'No Setup Present', 'Ignored SL',
  'Early Exit', 'Moved SL', 'Against HTF Bias', 'Chased Price',
  'Wrong Session', 'News Event Missed', 'Over-traded',
]

function emptyForm() {
  const confluences = {}
  ALL_CONFLUENCES.forEach(c => { confluences[c.id] = false })
  return {
    pair: '',
    direction: 'Long',
    date: new Date().toISOString().slice(0, 10),
    session: 'London',
    marketType: 'Trend',
    entry: '',
    stopLoss: '',
    takeProfit: '',
    exit: '',
    riskPercent: '',
    result: '',
    pnl: 'Win',
    mae: '',
    mfe: '',
    timeTo1R: '',
    timeTo2R: '',
    tradeDuration: '',
    partialCloses: [],
    confluences,
    setupType: '',
    errors: [],
    notes: '',
    screenshots: [],
  }
}

function applyAIResult(form, ai) {
  const updated = { ...form }
  if (ai.pair) updated.pair = ai.pair
  if (ai.direction) updated.direction = ai.direction
  if (ai.session) updated.session = ai.session
  if (ai.marketType) updated.marketType = ai.marketType
  if (ai.entry != null) updated.entry = String(ai.entry)
  if (ai.stopLoss != null) updated.stopLoss = String(ai.stopLoss)
  if (ai.takeProfit != null) updated.takeProfit = String(ai.takeProfit)
  if (ai.confluences) {
    const merged = { ...updated.confluences }
    Object.entries(ai.confluences).forEach(([k, v]) => {
      if (k in merged) merged[k] = Boolean(v)
    })
    updated.confluences = merged
  }
  if (ai.notes) updated.notes = ai.notes
  return updated
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children, half }) {
  return (
    <div className="form-group" style={{ gridColumn: half ? 'span 1' : undefined }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function ConfluenceGroup({ title, items, values, onChange, groupClass }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        {title}
      </div>
      <div className="confluence-grid">
        {items.map(conf => {
          const checked = values[conf.id]
          return (
            <div
              key={conf.id}
              className={`confluence-item${checked ? ` checked ${groupClass}` : ''}`}
              onClick={() => onChange(conf.id, !checked)}
            >
              <div className="confluence-check">{checked ? '✓' : ''}</div>
              <span className="confluence-name">{conf.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TradeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial ? { ...emptyForm(), ...initial, confluences: { ...emptyForm().confluences, ...initial.confluences } } : emptyForm())
  const [aiResult, setAIResult] = useState(null)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setConfluence(id, value) {
    setForm(prev => ({ ...prev, confluences: { ...prev.confluences, [id]: value } }))
  }

  function handleAIAnalysis(result) {
    setAIResult(result)
    setForm(prev => applyAIResult(prev, result))
  }

  function toggleError(err) {
    set('errors', form.errors.includes(err)
      ? form.errors.filter(e => e !== err)
      : [...form.errors, err]
    )
  }

  function addPartial() {
    set('partialCloses', [...form.partialCloses, { price: '', percent: '' }])
  }

  function setPartial(i, field, value) {
    const updated = form.partialCloses.map((p, idx) => idx === i ? { ...p, [field]: value } : p)
    set('partialCloses', updated)
  }

  function removePartial(i) {
    set('partialCloses', form.partialCloses.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    // Validate required fields
    const req = ['pair', 'direction', 'date', 'session', 'marketType', 'entry', 'stopLoss', 'exit', 'result']
    for (const f of req) {
      if (!form[f] && form[f] !== 0) {
        alert(`Required field missing: ${f}`)
        return
      }
    }

    const result = parseFloat(form.result)
    const scores = computeScores(form.confluences)
    const efficiencies = computeEfficiencies({
      mae: parseFloat(form.mae) || null,
      mfe: parseFloat(form.mfe) || null,
      result,
    })

    const d = new Date(form.date + 'T12:00:00')
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]

    const trade = {
      id: initial?.id ?? uuidv4(),
      pair: form.pair.toUpperCase(),
      direction: form.direction,
      date: form.date,
      dayOfWeek,
      month,
      session: form.session,
      marketType: form.marketType,
      entry: parseFloat(form.entry),
      stopLoss: parseFloat(form.stopLoss),
      takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
      exit: parseFloat(form.exit),
      riskPercent: parseFloat(form.riskPercent) || null,
      result,
      pnl: result > 0 ? 'Win' : 'Loss',
      mae: form.mae !== '' ? parseFloat(form.mae) : null,
      mfe: form.mfe !== '' ? parseFloat(form.mfe) : null,
      timeTo1R: form.timeTo1R !== '' ? parseFloat(form.timeTo1R) : null,
      timeTo2R: form.timeTo2R !== '' ? parseFloat(form.timeTo2R) : null,
      tradeDuration: form.tradeDuration !== '' ? parseFloat(form.tradeDuration) : null,
      partialCloses: form.partialCloses.filter(p => p.price && p.percent),
      confluences: { ...form.confluences },
      ...scores,
      ...efficiencies,
      setupType: form.setupType,
      errors: form.errors,
      notes: form.notes,
      screenshots: form.screenshots,
      aiAnalysis: aiResult,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(trade)
  }

  const scores = computeScores(form.confluences)

  return (
    <div>
      {/* Screenshots */}
      <Section title="Screenshots + AI Analysis">
        <ScreenshotUpload
          onAnalysis={handleAIAnalysis}
          onScreenshots={s => set('screenshots', s)}
          existingScreenshots={form.screenshots}
        />
        {aiResult && (
          <div className="ai-result" style={{ marginTop: 10 }}>
            <div className="ai-result-header">AI Analysis Applied</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {aiResult.notes || 'Form fields updated from screenshot analysis.'}
            </div>
          </div>
        )}
      </Section>

      {/* Core Fields */}
      <Section title="Trade Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="Pair">
            <input className="form-input" value={form.pair} onChange={e => set('pair', e.target.value)} placeholder="EURUSD" />
          </Field>
          <Field label="Direction">
            <select className="form-select" value={form.direction} onChange={e => set('direction', e.target.value)}>
              <option>Long</option>
              <option>Short</option>
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="Session">
            <select className="form-select" value={form.session} onChange={e => set('session', e.target.value)}>
              {SESSIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Market Type">
            <select className="form-select" value={form.marketType} onChange={e => set('marketType', e.target.value)}>
              {MARKET_TYPES.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Entry">
            <input type="number" step="any" className="form-input" value={form.entry} onChange={e => set('entry', e.target.value)} placeholder="1.0850" />
          </Field>
          <Field label="Stop Loss">
            <input type="number" step="any" className="form-input" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} placeholder="1.0820" />
          </Field>
          <Field label="Take Profit">
            <input type="number" step="any" className="form-input" value={form.takeProfit} onChange={e => set('takeProfit', e.target.value)} placeholder="1.0920" />
          </Field>
          <Field label="Exit">
            <input type="number" step="any" className="form-input" value={form.exit} onChange={e => set('exit', e.target.value)} placeholder="1.0900" />
          </Field>
          <Field label="Risk (%)">
            <input type="number" step="any" className="form-input" value={form.riskPercent} onChange={e => set('riskPercent', e.target.value)} placeholder="1.0" />
          </Field>
          <Field label="Result (R)">
            <input type="number" step="any" className="form-input" value={form.result} onChange={e => set('result', e.target.value)} placeholder="2.0" />
          </Field>
        </div>
      </Section>

      {/* Confluences */}
      <Section title={`Confluences — Total: ${scores.totalScore} (HTF: ${scores.htfScore} / LTF: ${scores.ltfScore} / Key: ${scores.keyScore})`}>
        <ConfluenceGroup title="HTF — Higher Timeframe" items={HTF_CONFLUENCES} values={form.confluences} onChange={setConfluence} groupClass="htf" />
        <ConfluenceGroup title="LTF — Lower Timeframe" items={LTF_CONFLUENCES} values={form.confluences} onChange={setConfluence} groupClass="ltf" />
        <ConfluenceGroup title="Key Levels" items={KEY_CONFLUENCES} values={form.confluences} onChange={setConfluence} groupClass="key" />
      </Section>

      {/* Execution */}
      <Section title="Execution Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <Field label="MAE (R)">
            <input type="number" step="any" className="form-input" value={form.mae} onChange={e => set('mae', e.target.value)} placeholder="0.3" />
          </Field>
          <Field label="MFE (R)">
            <input type="number" step="any" className="form-input" value={form.mfe} onChange={e => set('mfe', e.target.value)} placeholder="3.5" />
          </Field>
          <Field label="Time to 1R (h)">
            <input type="number" step="any" className="form-input" value={form.timeTo1R} onChange={e => set('timeTo1R', e.target.value)} placeholder="4" />
          </Field>
          <Field label="Time to 2R (h)">
            <input type="number" step="any" className="form-input" value={form.timeTo2R} onChange={e => set('timeTo2R', e.target.value)} placeholder="12" />
          </Field>
          <Field label="Duration (h)">
            <input type="number" step="any" className="form-input" value={form.tradeDuration} onChange={e => set('tradeDuration', e.target.value)} placeholder="18" />
          </Field>
        </div>

        {/* Partial Closes */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="form-label">Partial Closes</span>
            <button className="btn btn-ghost btn-sm" onClick={addPartial}>+ Add</button>
          </div>
          {form.partialCloses.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 6 }}>
              <input type="number" step="any" className="form-input" value={p.price} onChange={e => setPartial(i, 'price', e.target.value)} placeholder="Price" />
              <input type="number" step="any" className="form-input" value={p.percent} onChange={e => setPartial(i, 'percent', e.target.value)} placeholder="% closed" />
              <button className="btn btn-ghost btn-sm" onClick={() => removePartial(i)}>×</button>
            </div>
          ))}
        </div>
      </Section>

      {/* Context */}
      <Section title="Context">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="Setup Type">
            <input className="form-input" value={form.setupType} onChange={e => set('setupType', e.target.value)} placeholder="MSS + POC Rejection" />
          </Field>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Errors Made</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {COMMON_ERRORS.map(err => (
              <button
                key={err}
                className={`btn btn-sm${form.errors.includes(err) ? '' : ' btn-ghost'}`}
                style={form.errors.includes(err) ? { background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)' } : {}}
                onClick={() => toggleError(err)}
              >
                {err}
              </button>
            ))}
          </div>
          <input
            className="form-input"
            style={{ marginTop: 8 }}
            placeholder="Custom error (press Enter)"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                toggleError(e.target.value.trim())
                e.target.value = ''
              }
            }}
          />
        </div>

        <Field label="Notes">
          <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Trade notes, observations..." />
        </Field>
      </Section>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Save Trade</button>
      </div>
    </div>
  )
}
