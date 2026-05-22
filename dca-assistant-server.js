/**
 * DCA Assistant - Real-Time Stock Analysis Server
 * Uses Yahoo Finance chart API (no auth) + Alpha Vantage (optional key for fundamentals)
 */

const http = require('http');
const https = require('https');
const url = require('url');

function loadConfig() {
  const base = { port: 3000, alphaVantageKey: process.env.ALPHA_VANTAGE_KEY || 'demo' };
  try {
    const file = require('fs').readFileSync(require('path').join(__dirname, 'config.json'), 'utf8');
    const saved = JSON.parse(file);
    return { ...base, ...saved };
  } catch {
    return base;
  }
}

const CONFIG = loadConfig();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Helper: Make HTTPS GET request
function makeRequest(urlString) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(urlString);
    const req = https.get({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      maxHeaderSize: 32768
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response from ${urlObj.hostname}: ${e.message}`));
        }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
  });
}

// Fetch market + technical data from Yahoo Finance chart API (no authentication needed)
async function fetchYahooChartData(symbol) {
  console.log(`📊 Fetching Yahoo Finance chart data for ${symbol}...`);

  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo&includePrePost=false`;
  const data = await makeRequest(chartUrl);

  if (!data.chart?.result?.length) {
    const errMsg = data.chart?.error?.description || 'Symbol not found or data unavailable';
    throw new Error(errMsg);
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.timestamp || [];

  // Build OHLCV array, filtering out null entries (market holidays)
  const ohlcv = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i]
    }))
    .filter(d => d.close != null && d.volume != null);

  if (ohlcv.length === 0) throw new Error('No trading data available');

  // Most recent first
  const recent = [...ohlcv].reverse();
  const last20 = recent.slice(0, 20);

  // Order flow: days where close > open are net buying
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  for (const d of last20) {
    if (d.close > d.open) totalBuyVolume += d.volume;
    else totalSellVolume += d.volume;
  }

  // POC = bar with highest volume in last 20 days
  const pocData = [...last20].sort((a, b) => b.volume - a.volume)[0];

  // Moving averages (recent-first array)
  const closes = recent.map(d => d.close);
  const ma20 = closes.slice(0, Math.min(20, closes.length)).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const ma50 = closes.slice(0, Math.min(50, closes.length)).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);

  // RSI needs chronological order (oldest first)
  const rsi = calculateRSI([...closes].reverse(), 14);

  const avgVolume = Math.round(last20.reduce((a, d) => a + d.volume, 0) / last20.length);

  // Chart data: last 60 days with per-day rolling MA20 / MA50
  const allCloses = ohlcv.map(d => d.close); // chronological
  const chartCount = Math.min(60, ohlcv.length);
  const chartStart = ohlcv.length - chartCount;
  const chartData = ohlcv.slice(chartStart).map((d, i) => {
    const absIdx = chartStart + i;
    const s20 = allCloses.slice(Math.max(0, absIdx - 19), absIdx + 1);
    const s50 = allCloses.slice(Math.max(0, absIdx - 49), absIdx + 1);
    return {
      date: d.date,
      close: parseFloat(d.close.toFixed(2)),
      volume: d.volume,
      bullish: d.close >= d.open,
      ma20: parseFloat((s20.reduce((a, b) => a + b, 0) / s20.length).toFixed(2)),
      ma50: parseFloat((s50.reduce((a, b) => a + b, 0) / s50.length).toFixed(2))
    };
  });

  return {
    symbol,
    currentPrice: meta.regularMarketPrice,
    high52Week: meta.fiftyTwoWeekHigh,
    low52Week: meta.fiftyTwoWeekLow,
    avgVolume,
    volumeData: last20,
    pocPrice: pocData.close,
    pocVolume: pocData.volume,
    buyVolume: totalBuyVolume,
    sellVolume: totalSellVolume,
    orderFlowDelta: totalBuyVolume - totalSellVolume,
    ma20: ma20.toFixed(2),
    ma50: ma50.toFixed(2),
    rsi: rsi.toFixed(2),
    chartData,
    timestamp: new Date().toISOString()
  };
}

// Fetch fundamental data from Alpha Vantage OVERVIEW endpoint (requires real API key)
async function fetchAlphaVantageFundamentals(symbol) {
  const apiKey = CONFIG.alphaVantageKey;
  if (apiKey === 'demo') {
    throw new Error('Set ALPHA_VANTAGE_KEY env var for fundamental data (free at alphavantage.co)');
  }

  console.log(`📈 Fetching Alpha Vantage fundamentals for ${symbol}...`);

  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
  const data = await makeRequest(overviewUrl);

  if (data.Note || data.Information) {
    throw new Error('Alpha Vantage API rate limit reached. Try again in 1 minute.');
  }

  if (!data.Symbol) {
    throw new Error('Symbol not found in Alpha Vantage');
  }

  return {
    pe: parseFloat(data.PERatio) || null,
    forwardPE: parseFloat(data.ForwardPE) || null,
    eps: parseFloat(data.EPS) || null,
    roe: parseFloat(data.ReturnOnEquityTTM) || null,
    profitMargin: parseFloat(data.ProfitMargin) || null,
    beta: parseFloat(data.Beta) || null,
    dividendYield: parseFloat(data.DividendYield) || 0,
    marketCap: parseInt(data.MarketCapitalization) || 0
  };
}

// RSI Calculation (prices must be in chronological order, oldest first)
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Comprehensive DCA analysis
async function analyzeDCA(symbol) {
  console.log(`\n🚀 Starting DCA analysis for ${symbol.toUpperCase()}...\n`);

  let marketData = null;
  let fundamentalData = null;
  const errors = [];

  try {
    marketData = await fetchYahooChartData(symbol);
    console.log('✅ Market/technical data loaded');
  } catch (e) {
    errors.push(`Market data: ${e.message}`);
    console.error(`❌ Chart data error: ${e.message}`);
  }

  try {
    fundamentalData = await fetchAlphaVantageFundamentals(symbol);
    console.log('✅ Fundamental data loaded');
  } catch (e) {
    errors.push(`Fundamentals: ${e.message}`);
  }

  if (!marketData) {
    return {
      symbol: symbol.toUpperCase(),
      error: errors.join(' | '),
      tips: [
        '1️⃣ Check the ticker symbol is correct (e.g., AAPL, MSFT, TSLA)',
        '2️⃣ Try again in a moment (Yahoo Finance may be temporarily unavailable)',
        '3️⃣ For fundamentals, get a FREE Alpha Vantage key: https://www.alphavantage.co/support/#api-key',
        '4️⃣ Windows: set ALPHA_VANTAGE_KEY=your_key  |  Linux/Mac: export ALPHA_VANTAGE_KEY=your_key'
      ]
    };
  }

  const d = { ...marketData, ...fundamentalData };

  const range = (d.high52Week || 0) - (d.low52Week || 0);
  const position = range > 0 ? (d.currentPrice - d.low52Week) / range : 0;
  const distToPOC = d.pocPrice ? Math.abs(d.currentPrice - d.pocPrice) / d.currentPrice * 100 : 0;

  // Technical score (0–6)
  let technicalScore = 0;
  const rsi = parseFloat(d.rsi);
  if (!isNaN(rsi)) technicalScore += rsi < 30 ? 2 : rsi > 70 ? 0 : 1;
  if (d.pocPrice) technicalScore += distToPOC < 5 ? 2 : distToPOC < 10 ? 1 : 0;
  if (d.orderFlowDelta !== undefined) technicalScore += d.orderFlowDelta > 0 ? 2 : 0;

  // Fundamental score (0–6, only if data available)
  let fundamentalScore = 0;
  let fundamentalMax = 0;
  if (fundamentalData) {
    fundamentalMax = 6;
    if (d.pe) fundamentalScore += d.pe < 20 ? 2 : d.pe < 25 ? 1 : 0;
    if (d.roe) fundamentalScore += d.roe > 0.15 ? 2 : d.roe > 0.08 ? 1 : 0;
    if (d.profitMargin) fundamentalScore += d.profitMargin > 0.20 ? 2 : d.profitMargin > 0.10 ? 1 : 0;
  }

  // Score: average of available components
  const techRatio = technicalScore / 6;
  const dcaScore = fundamentalMax > 0
    ? ((techRatio + fundamentalScore / fundamentalMax) / 2) * 100
    : techRatio * 100;

  const recommendation = dcaScore > 70 ? '✅ STRONG BUY' :
                         dcaScore > 55 ? '👍 BUY' :
                         dcaScore > 40 ? '⚖️ HOLD' :
                         '⏸️ WAIT';

  return {
    symbol: symbol.toUpperCase(),
    analysis: {
      dcaScore: dcaScore.toFixed(2),
      recommendation,
      timestamp: d.timestamp
    },
    market: {
      currentPrice: d.currentPrice?.toFixed(2),
      high52Week: d.high52Week?.toFixed(2),
      low52Week: d.low52Week?.toFixed(2),
      position: (position * 100).toFixed(0),
      avgVolume: d.avgVolume
    },
    technical: {
      rsi: d.rsi,
      ma20: d.ma20,
      ma50: d.ma50,
      pocPrice: d.pocPrice?.toFixed(2),
      pocVolume: d.pocVolume,
      distToPOC: distToPOC.toFixed(2),
      orderFlowDelta: d.orderFlowDelta,
      buyPressure: d.buyVolume,
      sellPressure: d.sellVolume
    },
    fundamental: fundamentalData ? {
      pe: d.pe?.toFixed(2) || 'N/A',
      forwardPE: d.forwardPE?.toFixed(2) || 'N/A',
      eps: d.eps?.toFixed(2) || 'N/A',
      roe: d.roe?.toFixed(4) || 'N/A',
      profitMargin: d.profitMargin?.toFixed(4) || 'N/A',
      beta: d.beta?.toFixed(2) || 'N/A',
      dividendYield: d.dividendYield != null ? (d.dividendYield * 100).toFixed(2) : '0',
      marketCap: d.marketCap
    } : null,
    chartData: d.chartData || null,
    errors: errors.length > 0 ? errors : null
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/api/analyze' && query.symbol) {
    try {
      const result = await analyzeDCA(query.symbol);
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', version: '2.0.0' }));
  } else if (pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'DCA Assistant API',
      version: '2.0.0',
      note: 'Technical data from Yahoo Finance (no key needed). Fundamental data requires ALPHA_VANTAGE_KEY env var.',
      endpoints: { analyze: '/api/analyze?symbol=AAPL', health: '/health' },
      example: 'http://localhost:3000/api/analyze?symbol=MSFT'
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(CONFIG.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🚀 DCA ASSISTANT SERVER STARTED 🚀               ║
╠════════════════════════════════════════════════════════════╣
║  Server:  http://localhost:${CONFIG.port}                        ║
║  Example: http://localhost:${CONFIG.port}/api/analyze?symbol=AAPL║
║                                                            ║
║  Data sources:                                             ║
║  ✅ Yahoo Finance chart API  (no key needed)               ║
║  ${CONFIG.alphaVantageKey !== 'demo' ? '✅' : '⚠️ '} Alpha Vantage fundamentals (${CONFIG.alphaVantageKey !== 'demo' ? 'key set' : 'set ALPHA_VANTAGE_KEY'})     ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { analyzeDCA, fetchYahooChartData, fetchAlphaVantageFundamentals };
