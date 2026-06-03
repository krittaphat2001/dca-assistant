# DCA Assistant

A real-time Dollar-Cost Averaging analysis tool for stocks. Enter a ticker, get a DCA score backed by live price data, technical indicators, and fundamental metrics.

![DCA Assistant](https://img.shields.io/badge/node-%3E%3D14-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## What it does

- Fetches **live market data** from Yahoo Finance (no key needed)
- Pulls **fundamental data** from Alpha Vantage (free API key)
- Calculates a **DCA Score (0–100)** combining technical + fundamental signals
- For **ETFs & funds**, shows a **Factsheet tab** with holdings, sectors, fees, and a fund-quality grade
- Displays results across tabs: **Overview, Signals, Chart, Technical, Fundamental, Market** — plus a **Factsheet** tab for funds

### Chart tab
- 60-day price chart with MA 20 and MA 50
- Volume bars (green = bullish day, red = bearish)
- RSI gauge with oversold / neutral / overbought zones

### Factsheet tab (ETFs & funds only)
For fund tickers (e.g. `VOO`, `BND`, `QQQ`) an extra **📋 Factsheet** tab appears automatically — it stays hidden for ordinary stocks. It shows:

- **Fund-quality grade (A–F)** scoring the fund 0–100 across four pillars: expense ratio, track record, diversification, and risk/size. The return thresholds adapt to the fund's **asset class** (equity / bond / money-market / allocation), which is auto-detected and shown as a chip — so a ~2%/yr bond fund isn't judged against equity returns.
- Expense ratio, yield, AUM, 3-year beta, category, fund family, and inception date
- Trailing returns (YTD / 1Y / 3Y / 5Y / 10Y)
- Asset allocation and sector weightings
- Top-10 holdings

Factsheet data comes from Yahoo Finance's `quoteSummary` endpoint — no extra key needed.

### DCA Score
| Score | Signal | Meaning |
|-------|--------|---------|
| 70–100 | ✅ STRONG BUY | Strong technical + fundamental setup |
| 55–69 | 👍 BUY | Good entry conditions |
| 40–54 | ⚖️ HOLD | Mixed signals, wait for better entry |
| 0–39 | ⏸️ WAIT | Avoid — overbought or weak fundamentals |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/krittaphat2001/dca-assistant.git
cd dca-assistant
npm install
```

### 2. Get a free Alpha Vantage API key

Go to [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) — takes under a minute.

### 3. Add your key to config.json

Create `config.json` in the project root:

```json
{
  "alphaVantageKey": "YOUR_KEY_HERE"
}
```

> `config.json` is in `.gitignore` — your key stays local and is never committed.

### 4. Start the server

```bash
npm start
```

Output:
```
╔════════════════════════════════════════════════════════════╗
║          🚀 DCA ASSISTANT SERVER STARTED 🚀               ║
╠════════════════════════════════════════════════════════════╣
║  Server:  http://localhost:3000                            ║
║  ✅ Yahoo Finance chart API  (no key needed)               ║
║  ✅ Alpha Vantage fundamentals (key set)                   ║
╚════════════════════════════════════════════════════════════╝
```

### 5. Open the UI

Open `dca-assistant.html` in your browser. Set **API Endpoint** to `http://localhost:3000`, enter a ticker, and click **Analyze**.

---

## Data sources

| Source | Data | Auth |
|--------|------|------|
| Yahoo Finance `/v8/finance/chart` | Price, 52-week range, OHLCV, volume | None |
| Yahoo Finance `/v10/finance/quoteSummary` | Fund factsheet: expense ratio, holdings, sectors, returns, AUM (ETFs/funds) | None (crumb auto-handled) |
| Alpha Vantage `OVERVIEW` | P/E, Forward P/E, EPS, ROE, Profit Margin, Beta, Dividend Yield, Market Cap | Free API key |

---

## API

The server exposes a simple REST endpoint:

```
GET http://localhost:3000/api/analyze?symbol=AAPL
```

Example response:

```json
{
  "symbol": "AAPL",
  "analysis": { "dcaScore": "50.00", "recommendation": "⚖️ HOLD" },
  "market": { "currentPrice": "304.99", "high52Week": "305.54", "low52Week": "193.46", "position": "100" },
  "technical": { "rsi": "76.15", "ma20": "287.46", "ma50": "269.49", "pocPrice": "271.35", "distToPOC": "11.03" },
  "fundamental": { "pe": "36.64", "forwardPE": "34.25", "eps": "8.25", "roe": "1.4150", "profitMargin": "0.2720", "beta": "1.06", "dividendYield": "0.35", "marketCap": 4439253451000 }
}
```

For **fund tickers** the response also includes a `factsheet` object — expense ratio, holdings, sectors, trailing returns, plus a `fundQuality` block with the `score`, `grade`, `assetClass`, and per-pillar breakdown. It is `null` for ordinary stocks.

---

## Troubleshooting

**"Failed to connect"** — make sure `npm start` is running and the API Endpoint field shows `http://localhost:3000`.

**"Fundamentals unavailable"** — `config.json` is missing or the key is wrong. Check [alphavantage.co](https://www.alphavantage.co) for your key.

**"Alpha Vantage rate limit"** — the free tier allows 25 requests/day and 5/minute. Wait a minute and try again, or analyze one stock at a time.

**"No data found"** — check the ticker symbol is correct (e.g. `AAPL`, not `Apple`). Delisted or very new stocks may not have data.

---

## Requirements

- Node.js 14+
- Free Alpha Vantage API key (for fundamentals)
