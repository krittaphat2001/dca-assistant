# 🚀 DCA Assistant - Real-Time Stock Analysis with Volume Profile & Order Flow

A professional-grade Dollar-Cost Averaging analysis tool that integrates with **Yahoo Finance** and **Alpha Vantage** APIs to provide real-time technical and fundamental analysis.

---

## 📋 Features

✅ **Real-Time Data Integration**
- Yahoo Finance API for fundamental data (P/E, dividend yield, debt ratios, etc.)
- Alpha Vantage API for technical data (RSI, moving averages, volume profile)
- Automatic data fusion from multiple sources

✅ **Advanced Technical Analysis**
- RSI (Relative Strength Index) - Momentum detection
- Volume Profile & Point of Control (POC) - Support/Resistance zones
- Order Flow Analysis - Buy vs Sell pressure
- Moving Averages (20, 50) - Trend confirmation
- Bollinger Bands - Volatility assessment

✅ **Fundamental Analysis**
- P/E Ratio - Valuation
- ROE (Return on Equity) - Profitability
- Debt-to-Equity - Financial stability
- Dividend Yield - Income potential

✅ **Smart DCA Scoring**
- Combined technical + fundamental score (0-100)
- Clear recommendations (STRONG BUY, BUY, HOLD, WAIT)
- Support/Resistance levels from volume data
- Monthly entry strategy suggestions

---

## 🔧 Installation & Setup

### Step 1: Get API Keys (2 min)

#### Alpha Vantage (Technical Data - FREE)
1. Visit: https://www.alphavantage.co/api/
2. Enter your email
3. Copy your API key
4. Save it: `export ALPHA_VANTAGE_KEY=your_api_key_here`

#### Yahoo Finance (Fundamental Data - FREE, No Key Needed)
- Used automatically via public endpoints
- No authentication required

### Step 2: Install Dependencies

```bash
# Clone the project or download files
git clone https://github.com/yourusername/dca-assistant.git
cd dca-assistant

# Install Node.js dependencies
npm install

# Set your Alpha Vantage API key
export ALPHA_VANTAGE_KEY=your_key_here
# OR on Windows:
set ALPHA_VANTAGE_KEY=your_key_here
```

### Step 3: Run the Server

```bash
# Start the API server
npm start

# You'll see:
# ╔════════════════════════════════════════════════════════════╗
# ║          🚀 DCA ASSISTANT SERVER STARTED 🚀               ║
# ╠════════════════════════════════════════════════════════════╣
# ║  Server: http://localhost:3000                             ║
# ║  API: http://localhost:3000/api/analyze?symbol=AAPL        ║
# ╚════════════════════════════════════════════════════════════╝
```

---

## 📱 Usage

### Via Command Line (cURL)

```bash
# Analyze Apple (AAPL)
curl "http://localhost:3000/api/analyze?symbol=AAPL"

# Analyze Microsoft (MSFT)
curl "http://localhost:3000/api/analyze?symbol=MSFT"

# Analyze Tesla (TSLA)
curl "http://localhost:3000/api/analyze?symbol=TSLA"

# Pretty print the output
curl "http://localhost:3000/api/analyze?symbol=AAPL" | json_pp
```

### Via React Frontend

1. Open `DCAAssistant.jsx` in your React app
2. Update the API endpoint (default: `http://localhost:3000`)
3. Enter ticker symbol
4. Click "Analyze"
5. View results across 4 tabs: Overview, Market, Technical, Fundamental

### Via Node.js/JavaScript

```javascript
const http = require('http');

async function analyzeStock(symbol) {
  const url = `http://localhost:3000/api/analyze?symbol=${symbol}`;
  
  const data = await fetch(url).then(r => r.json());
  
  console.log(`${symbol} DCA Score: ${data.analysis.dcaScore}`);
  console.log(`Recommendation: ${data.analysis.recommendation}`);
  console.log(`Current Price: $${data.market.currentPrice}`);
}

analyzeStock('AAPL');
```

---

## 📊 API Response Format

```json
{
  "symbol": "AAPL",
  "analysis": {
    "dcaScore": "75.42",
    "recommendation": "✅ STRONG BUY",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "market": {
    "currentPrice": "150.25",
    "high52Week": "199.62",
    "low52Week": "125.38",
    "position": "42",
    "avgVolume": "45230000"
  },
  "technical": {
    "rsi": "48.5",
    "ma20": "148.75",
    "ma50": "146.32",
    "pocPrice": "147.80",
    "pocVolume": "1250000",
    "distToPOC": "1.85",
    "orderFlowDelta": "2500000",
    "buyPressure": "52.5",
    "sellPressure": "47.5"
  },
  "fundamental": {
    "pe": "28.34",
    "roe": "82.5",
    "debtToEquity": "1.12",
    "dividendYield": "0.42",
    "marketCap": "2300000000000"
  }
}
```

---

## 📈 Understanding the Analysis

### DCA Score (0-100)

| Score | Signal | Action |
|-------|--------|--------|
| 70-100 | ✅ STRONG BUY | Buy 100% of monthly amount |
| 55-69 | 👍 BUY | Buy 75-100% of monthly amount |
| 40-54 | ⚖️ HOLD | Buy 50% or wait for better entry |
| 0-39 | ⏸️ WAIT | Don't buy; monitor for better entry |

### Key Metrics Explained

**RSI (Relative Strength Index)**
- < 30: Oversold (🟢 good buying signal)
- 30-70: Neutral
- > 70: Overbought (🔴 caution)

**Volume Profile (POC)**
- Shows where most institutional trading occurred
- Buying near POC = safer entry (support level)
- Distance to POC > 10% = risky entry

**Order Flow Delta**
- Positive = more buyers (bullish)
- Negative = more sellers (bearish)
- Larger absolute value = stronger signal

**P/E Ratio**
- < 15: Undervalued 🟢
- 15-25: Fair value ⚖️
- > 25: Overvalued 🔴

---

## ⚠️ Important Notes

### Rate Limiting
- **Alpha Vantage (free)**: 5 API calls per minute, 100 per day
  - Solutions: Get premium key, use caching, or stagger requests
- **Yahoo Finance**: Generally no rate limits for basic queries
  - May block if > 2000 requests/hour from same IP

### Data Accuracy
- Real-time data may have 15-20 minute delays (market feed delays)
- Use for tactical DCA decisions (weekly/monthly), not intraday
- Always cross-reference with broker before making trades

### Limitations
- Some stocks may not have complete fundamental data
- Penny stocks and very new IPOs may not have sufficient data
- International stocks may have limited data availability

---

## 🔧 Customization

### Change API Endpoint

Edit `DCAAssistant.jsx`:
```javascript
const [apiEndpoint, setApiEndpoint] = useState('http://your-server:3000');
```

### Add More Indicators

Edit `dca-assistant-server.js`, add to `analyzeDCA()`:
```javascript
// MACD Example
const macdValue = calculateMACD(closes);
fundamental.macd = macdValue;
```

### Adjust DCA Scoring

Edit scoring logic in `dca-assistant-server.js`:
```javascript
// Change weights to prefer technical vs fundamental
const dcaScore = (technicalScore * 0.6 + fundamentalScore * 0.4) / 2 * 100;
```

---

## 📚 References

**Yahoo Finance Documentation**
- https://finance.yahoo.com/

**Alpha Vantage Documentation**
- https://www.alphavantage.co/documentation/

**Technical Analysis Concepts**
- RSI: https://www.investopedia.com/terms/r/rsi.asp
- Volume Profile: https://www.investopedia.com/terms/v/volume-profile.asp
- Moving Averages: https://www.investopedia.com/terms/m/movingaverage.asp

**DCA Strategy**
- Investopedia: https://www.investopedia.com/terms/d/dollarcostaveraging.asp

---

## 🐛 Troubleshooting

### "Cannot connect to server"
```bash
# Make sure server is running
npm start
# Check if port 3000 is available
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows
```

### "API limit reached"
```bash
# Get a premium Alpha Vantage key or wait 1 minute for free tier reset
# Check your key is set:
echo $ALPHA_VANTAGE_KEY
```

### "Invalid symbol"
- Make sure ticker is correct (AAPL not Apple)
- Check symbol exists on exchange (no typos)
- Some delisted stocks won't work

### "Missing data"
- Some stocks don't have all metrics (especially small-cap)
- Check the `errors` field in response for which data sources failed
- Use major stocks (S&P 500) for complete data

---

## 🚀 Next Steps

1. **Set up alerts**: Add email/Slack notifications when DCA Score hits thresholds
2. **Database integration**: Store analysis history for backtesting
3. **Mobile app**: React Native version for iOS/Android
4. **Trading bot**: Auto-execute DCA orders via broker API
5. **Portfolio tracker**: Monitor multiple stocks and entire portfolio

---

## 📝 Example Workflow

```
Monday: Check all your watchlist stocks
┌─────────────────────────────────────┐
│ curl .../api/analyze?symbol=AAPL    │
│ curl .../api/analyze?symbol=MSFT    │
│ curl .../api/analyze?symbol=TSLA    │
└─────────────────────────────────────┘
           ↓
Compare scores and recommendations
           ↓
Execute DCA orders for highest-scoring stocks
           ↓
Set reminder for next month
```

---

## 📞 Support

Having issues? Check:
1. Server logs (running in terminal)
2. API response in browser: http://localhost:3000/api/analyze?symbol=AAPL
3. API key is set: `echo $ALPHA_VANTAGE_KEY`
4. Node.js version: `node --version` (need 14+)

---

**Built with ❤️ for smart DCA investors**
