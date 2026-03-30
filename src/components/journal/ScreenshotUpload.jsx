import React, { useState, useRef } from 'react'
import { analyzeScreenshot, fileToBase64 } from '../../utils/aiAnalysis.js'

export default function ScreenshotUpload({ onAnalysis, onScreenshots, existingScreenshots = [] }) {
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [previews, setPreviews] = useState(existingScreenshots)
  const inputRef = useRef(null)

  async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!validFiles.length) return

    setError(null)

    const newPreviews = []
    const newBase64s = []

    for (const file of validFiles) {
      const { base64, mimeType } = await fileToBase64(file)
      newBase64s.push({ base64, mimeType })
      newPreviews.push(`data:${mimeType};base64,${base64}`)
    }

    const allPreviews = [...previews, ...newPreviews]
    setPreviews(allPreviews)
    onScreenshots(allPreviews)

    if (onAnalysis && newBase64s.length > 0) {
      setAnalyzing(true)
      try {
        const result = await analyzeScreenshot(newBase64s[0].base64, newBase64s[0].mimeType)
        onAnalysis(result)
      } catch (e) {
        setError(e.message)
      } finally {
        setAnalyzing(false)
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function removeScreenshot(idx) {
    const updated = previews.filter((_, i) => i !== idx)
    setPreviews(updated)
    onScreenshots(updated)
  }

  return (
    <div>
      <div
        className={`upload-zone${dragging ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="upload-zone-icon">⬆</div>
        <div className="upload-zone-text">
          <strong>Drop TradingView screenshots here</strong><br />
          or click to select files<br />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            AI will auto-fill the form — requires VITE_ANTHROPIC_API_KEY
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {analyzing && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue)', fontSize: 11 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
          Analyzing screenshot with Claude Vision...
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(240,62,62,0.3)', borderRadius: 3, fontSize: 11, color: 'var(--red)' }}>
          AI Analysis failed: {error}
        </div>
      )}

      {previews.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={src}
                alt={`Screenshot ${i + 1}`}
                style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border-accent)' }}
              />
              <button
                onClick={() => removeScreenshot(i)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                  width: 16, height: 16, cursor: 'pointer', color: '#fff', fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
