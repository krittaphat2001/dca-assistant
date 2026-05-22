# 🔗 API Integration Guide - Configuration Options

This guide shows how to configure the DCA Assistant with different APIs and deploy it.

---

## 📊 Data Sources Comparison

| API | Type | Free? | Rate Limit | Best For | Setup |
|-----|------|-------|-----------|----------|-------|
| **Yahoo Finance** | Fundamental | ✅ Yes | ~2000/hr | P/E, Dividend, Debt | No key needed |
| **Alpha Vantage** | Technical | ✅ Yes (Limited) | 5/min, 100/day | RSI, MA, Volume | Free key |
| **IEX Cloud** | Both | ❌ Paid | Depends on plan | Production systems | API key |
| **Polygon.io** | Both | ❌ Paid | Depends on plan | High-frequency | API key |
| **TradingView** | Technical | ⚠️ Limited | API limits | Charts & alerts | Unofficial SDK |

**Recommendation**: Start with Yahoo Finance + Alpha Vantage (both free), upgrade later if needed.

---

## ⚙️ Configuration Options

### Option 1: Yahoo Finance + Alpha Vantage (RECOMMENDED - Easiest)

**Current setup uses this combination.**

**Setup:**
```bash
# 1. Get free Alpha Vantage key
# Visit: https://www.alphavantage.co/api/

# 2. Set environment variable
export ALPHA_VANTAGE_KEY=your_key_here

# 3. Start server
npm start
```

**Advantages:**
- ✅ Completely free
- ✅ No authentication hassles
- ✅ Yahoo Finance is always available
- ✅ Good for most DCA use cases

**Limitations:**
- ⏱️ Alpha Vantage has rate limits (5 calls/min free)
- ⏱️ ~15-20 minute market data delay
- ⚠️ Some stocks may have incomplete data

---

### Option 2: IEX Cloud (Production-Grade)

For production systems with higher reliability and no rate limits.

**Setup:**
```bash
# 1. Sign up (free tier available)
# https://iexcloud.io/

# 2. Get API key from dashboard

# 3. Set environment variables
export IEX_API_KEY=your_key_here
export IEX_ENDPOINT=https://cloud.iexapis.com/stable

# 4. Update dca-assistant-server.js
```

**Modify dca-assistant-server.js:**
```javascript
async function fetchIEXCloudData(symbol) {
  const apiKey = process.env.IEX_API_KEY;
  const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${apiKey}`;
  
  const data = await makeRequest(url);
  
  return {
    symbol,
    currentPrice: data.latestPrice,
    high52Week: data.fiftyTwoWeekHigh,
    low52Week: data.fiftyTwoWeekLow,
    marketCap: data.marketCap,
    avgVolume: data.avgTotalVolume,
    pe: data.peRatio,
    // ... more fields
  };
}
```

**Advantages:**
- ✅ No rate limits on most plans
- ✅ Real-time data (15-minute delay)
- ✅ Highly reliable
- ✅ Production-ready

**Limitations:**
- 💰 Paid after free tier
- Need API key setup

---

### Option 3: Polygon.io (Advanced)

Best for high-frequency analysis and complex order flow.

**Setup:**
```bash
# 1. Sign up
# https://polygon.io/

# 2. Get API key

# 3. Set environment variables
export POLYGON_API_KEY=your_key_here

# 4. Add to configuration
```

**Example integration:**
```javascript
async function fetchPolygonData(symbol) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  // Get aggregates (candlestick data)
  const aggregatesUrl = 
    `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/2024-01-01/2024-12-31?apiKey=${apiKey}`;
  
  // Get options volume
  const optionsUrl = 
    `https://api.polygon.io/v2/snapshot/options/chains/${symbol}?apiKey=${apiKey}`;
  
  // Detailed analysis...
}
```

**Advantages:**
- ✅ Most comprehensive data
- ✅ Real-time options flow
- ✅ Detailed order book data
- ✅ Best for algorithmic trading

**Limitations:**
- 💰 Expensive for active trading
- Steeper learning curve

---

## 🚀 Deployment Options

### Local Development (Current)
```bash
npm start
# Access: http://localhost:3000
```

**Best for:** Testing, personal use, learning

---

### Docker Container (Recommended for Production)

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dca-assistant-server.js .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dca-assistant-server.js"]
```

**Build and run:**
```bash
# Build image
docker build -t dca-assistant .

# Run container
docker run -e ALPHA_VANTAGE_KEY=your_key \
           -p 3000:3000 \
           dca-assistant

# Access: http://localhost:3000
```

**Advantages:**
- ✅ Consistent environment
- ✅ Easy deployment
- ✅ Scalable

---

### Heroku Deployment (Free Option)

**Setup:**
```bash
# 1. Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create your-dca-assistant

# 4. Set environment variable
heroku config:set ALPHA_VANTAGE_KEY=your_key_here

# 5. Deploy
git push heroku main

# Access: https://your-dca-assistant.herokuapp.com/api/analyze?symbol=AAPL
```

**Advantages:**
- ✅ Free hosting
- ✅ Accessible from anywhere
- ✅ No local setup needed

---

### AWS Lambda + API Gateway (Serverless)

**Benefits:**
- ✅ Pay-per-use (very cheap)
- ✅ Auto-scaling
- ✅ Enterprise-grade

**Setup** (simplified):
```bash
# 1. Install AWS CLI
# 2. Create Lambda function from dca-assistant-server.js
# 3. Configure API Gateway for /api/analyze endpoint
# 4. Set environment variables in Lambda dashboard
```

---

## 🔐 Security Considerations

### API Key Management

**❌ NEVER do this:**
```javascript
// DON'T hardcode API keys!
const API_KEY = "sk_live_1234567890";
```

**✅ DO this:**
```bash
# Set as environment variable
export ALPHA_VANTAGE_KEY=your_key_here

# Access in code
const apiKey = process.env.ALPHA_VANTAGE_KEY;
```

### .env File (for local development)
```bash
# Create .env file in project root
ALPHA_VANTAGE_KEY=your_key_here
IEX_API_KEY=your_iex_key
PORT=3000
NODE_ENV=development
```

**Add to .gitignore:**
```
.env
.env.local
node_modules/
```

### Rate Limiting

Add rate limiting to protect your API:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,                   // 10 requests per minute
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

---

## 📊 Multi-Source Fallback Strategy

Improve reliability by trying multiple APIs:

```javascript
async function getStockData(symbol) {
  let data;
  
  try {
    // Try primary source
    data = await fetchYahooFinanceData(symbol);
  } catch (e) {
    console.log('Yahoo Finance failed, trying IEX...');
    try {
      // Fallback to secondary source
      data = await fetchIEXCloudData(symbol);
    } catch (e) {
      console.log('IEX failed, trying Alpha Vantage...');
      // Final fallback
      data = await fetchAlphaVantageData(symbol);
    }
  }
  
  return data;
}
```

**Advantages:**
- ✅ System never completely fails
- ✅ Automatic failover
- ✅ More resilient

---

## 🎯 Configuration Matrix

| Use Case | APIs | Hosting | Cost |
|----------|------|---------|------|
| **Personal/Learning** | Yahoo + Alpha Vantage | Local | FREE |
| **Small Trader** | Yahoo + Alpha Vantage | Docker locally | FREE |
| **Multiple Users** | IEX Cloud | Heroku | ~$50/mo |
| **Production** | Multiple with fallback | AWS Lambda | $5-20/mo |
| **Algo Trading** | Polygon.io | AWS/GCP | $100+/mo |

---

## 🔄 API Refresh Intervals

Recommended refresh schedules:

```javascript
// Technical data - every 5 minutes
setInterval(() => analyzeStock('AAPL'), 5 * 60 * 1000);

// Fundamental data - once daily
setInterval(() => analyzeStock('AAPL'), 24 * 60 * 60 * 1000);

// Order flow - every minute during market hours
setInterval(() => analyzeOrderFlow('AAPL'), 1 * 60 * 1000);
```

---

## 📱 Testing Your Configuration

**Test current setup:**
```bash
# Test server health
curl http://localhost:3000/health

# Test API key
curl "http://localhost:3000/api/analyze?symbol=AAPL"

# Expected response (if working):
# {
#   "symbol": "AAPL",
#   "analysis": {
#     "dcaScore": "75.42",
#     "recommendation": "✅ STRONG BUY"
#   },
#   ...
# }
```

---

## 🚀 Next Steps

1. **Start simple**: Use Yahoo Finance + Alpha Vantage (current setup)
2. **Test thoroughly**: Run analysis on 10+ stocks
3. **Monitor reliability**: Track which data sources fail
4. **Scale gradually**: Upgrade to IEX Cloud if rate limits become an issue
5. **Automate**: Set up daily email reports with recommendations

---

## 📚 Resources

- **Alpha Vantage**: https://www.alphavantage.co/documentation/
- **Yahoo Finance**: https://finance.yahoo.com/
- **IEX Cloud**: https://iexcloud.io/console/
- **Polygon.io**: https://polygon.io/docs/
- **Docker Guide**: https://docs.docker.com/
- **Heroku Deploy**: https://devcenter.heroku.com/articles/getting-started-with-nodejs

---

## ✅ Checklist for Production

- [ ] API keys stored as environment variables
- [ ] Rate limiting configured
- [ ] Error handling for all API failures
- [ ] Logging enabled for debugging
- [ ] HTTPS enabled (for web interfaces)
- [ ] Database for caching (optional but recommended)
- [ ] Monitoring/alerts set up
- [ ] Backup data source configured
- [ ] Documentation updated
- [ ] Security review completed

---

**You're all set! Start with the recommended setup and upgrade as needed.** 🚀
