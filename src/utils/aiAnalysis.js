const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ANALYSIS_PROMPT = `You are analyzing a TradingView chart screenshot for a trading journal.

Extract the following information and respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "pair": "detected currency pair or instrument (e.g. EURUSD, GBPUSD, NAS100)",
  "timeframe": "chart timeframe (e.g. 1H, 4H, 1D, 15M)",
  "direction": "Long or Short based on visible trade direction, or null if unclear",
  "entry": null or number,
  "stopLoss": null or number,
  "takeProfit": null or number,
  "session": "Asia, London, New York, or Overlap based on time visible, or null",
  "marketType": "Trend, Range, or Volatil based on price structure, or null",
  "confluences": {
    "htf_mss": true/false,
    "htf_poc": true/false,
    "htf_vah": true/false,
    "htf_val": true/false,
    "htf_fib": true/false,
    "htf_elliott": false,
    "cot": false,
    "opens": true/false,
    "ltf_mss": true/false,
    "ltf_fib": true/false,
    "ltf_poc": true/false,
    "ltf_vah": true/false,
    "ltf_val": true/false,
    "ltf_fvg": true/false,
    "pdh": true/false,
    "pdl": true/false
  },
  "notes": "brief description of what is visible in the chart"
}

For confluences:
- htf_mss: visible Market Structure Shift on higher timeframe
- htf_poc/vah/val: visible Volume Profile Point of Control / Value Area High/Low (HTF)
- htf_fib: visible Fibonacci retracement >= 0.5 or 0.618 on HTF
- opens: daily/weekly/monthly open levels visible
- ltf_mss: lower timeframe MSS for entry
- ltf_fvg: Fair Value Gap visible
- ltf_poc/vah/val: LTF volume profile levels
- pdh/pdl: previous day high or low visible as reference

Set to false if not clearly visible.`

export async function analyzeScreenshot(base64Image, mimeType = 'image/png') {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY not set in .env file')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0]?.text ?? ''

  try {
    // Strip any accidental markdown
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // Strip the data URL prefix
      const base64 = result.split(',')[1]
      resolve({ base64, mimeType: file.type || 'image/png' })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
