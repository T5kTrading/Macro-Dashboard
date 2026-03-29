import React, { useState } from 'react'
import MacroDashboard from './components/MacroDashboard.jsx'
import JournalTab from './components/journal/JournalTab.jsx'

const TABS = [
  { id: 'macro', label: 'Macro' },
  { id: 'charts', label: 'Charts' },
  { id: 'cot', label: 'COT' },
  { id: 'journal', label: 'Journal' },
]

function PlaceholderTab({ name }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">⬡</div>
      <div className="empty-state-title">{name}</div>
      <div className="empty-state-text">This section is under construction.</div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('macro')

  return (
    <div className="terminal-root">
      <header className="terminal-header">
        <span className="terminal-title">Macro Terminal</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
        </span>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="terminal-body">
        {activeTab === 'macro' && <MacroDashboard />}
        {activeTab === 'charts' && <PlaceholderTab name="Charts" />}
        {activeTab === 'cot' && <PlaceholderTab name="COT Data" />}
        {activeTab === 'journal' && <JournalTab />}
      </main>
    </div>
  )
}
