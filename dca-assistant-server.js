/**
 * DCA Assistant v3.0 - Enhanced Real-Time Stock Analysis Server
 * Technical + Market Context + Price Action + Fundamental scoring
 * Data: Yahoo Finance (no auth) + Alpha Vantage (optional, for fundamentals)
 */

const http = require('http');
const https = require('https');
const url = require('url');

function loadConfig() {
  const base = { port: 3000, alphaVantageKey: process.env.ALPHA_VANTAGE_KEY || 'demo' };
  try {
    const file = require('fs').readFileSync(require('path').join(__dirname, 'config.json'), 'utf8');
    return { ...base, ...JSON.parse(file) };
  } catch { return base; }
}

const CONFIG = loadConfig();
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Map tickers to their sector ETF for relative strength comparison
const SECTOR_ETF = {
  // XLK — Technology
  AAPL:'XLK',MSFT:'XLK',NVDA:'XLK',AVGO:'XLK',AMD:'XLK',INTC:'XLK',QCOM:'XLK',TXN:'XLK',
  ORCL:'XLK',CRM:'XLK',ADBE:'XLK',NOW:'XLK',INTU:'XLK',IBM:'XLK',CSCO:'XLK',
  MU:'XLK',AMAT:'XLK',KLAC:'XLK',LRCX:'XLK',MRVL:'XLK',ON:'XLK',STX:'XLK',WDC:'XLK',
  SNPS:'XLK',CDNS:'XLK',ANSS:'XLK',PTC:'XLK',FTNT:'XLK',PANW:'XLK',ZS:'XLK',
  CRWD:'XLK',OKTA:'XLK',DDOG:'XLK',SNOW:'XLK',PLTR:'XLK',PATH:'XLK',
  HPQ:'XLK',HPE:'XLK',DELL:'XLK',NTAP:'XLK',PSTG:'XLK',
  TEAM:'XLK',HUBS:'XLK',WDAY:'XLK',VEEV:'XLK',PCTY:'XLK',
  NET:'XLK',CFLT:'XLK',MDB:'XLK',ESTC:'XLK',SPLK:'XLK',
  ACN:'XLK',CTSH:'XLK',IT:'XLK',WIT:'XLK',INFY:'XLK',
  TSM:'XLK',ASML:'XLK',AEHR:'XLK',

  // XLC — Communication Services
  GOOGL:'XLC',GOOG:'XLC',META:'XLC',NFLX:'XLC',DIS:'XLC',
  CMCSA:'XLC',VZ:'XLC',T:'XLC',TMUS:'XLC',
  CHTR:'XLC',PARA:'XLC',FOXA:'XLC',FOX:'XLC',WBD:'XLC',
  SNAP:'XLC',PINS:'XLC',RDDT:'XLC',RBLX:'XLC',
  EA:'XLC',TTWO:'XLC',
  ZM:'XLC',MTCH:'XLC',IAC:'XLC',NYT:'XLC',

  // XLF — Financials
  JPM:'XLF',BAC:'XLF',WFC:'XLF',GS:'XLF',MS:'XLF',C:'XLF',
  USB:'XLF',PNC:'XLF',TFC:'XLF',COF:'XLF',DFS:'XLF',AXP:'XLF',
  V:'XLF',MA:'XLF',PYPL:'XLF',SQ:'XLF',FIS:'XLF',FISV:'XLF',
  BLK:'XLF',SCHW:'XLF',ICE:'XLF',CME:'XLF',CBOE:'XLF',
  SPGI:'XLF',MCO:'XLF',MSCI:'XLF',NDAQ:'XLF',
  AIG:'XLF',MET:'XLF',PRU:'XLF',AFL:'XLF',ALL:'XLF',PGR:'XLF',CB:'XLF',
  MMC:'XLF',AON:'XLF',MKL:'XLF',
  ALLY:'XLF',SYF:'XLF',WU:'XLF',TREE:'XLF',

  // XLV — Health Care
  LLY:'XLV',UNH:'XLV',JNJ:'XLV',ABBV:'XLV',MRK:'XLV',PFE:'XLV',MRNA:'XLV',
  BMY:'XLV',AMGN:'XLV',GILD:'XLV',BIIB:'XLV',REGN:'XLV',VRTX:'XLV',
  ISRG:'XLV',MDT:'XLV',ABT:'XLV',TMO:'XLV',DHR:'XLV',BSX:'XLV',SYK:'XLV',
  ZBH:'XLV',BAX:'XLV',BDX:'XLV',EW:'XLV',HOLX:'XLV',DXCM:'XLV',
  HCA:'XLV',CVS:'XLV',CI:'XLV',HUM:'XLV',ELV:'XLV',CNC:'XLV',MOH:'XLV',
  IQV:'XLV',A:'XLV',ILMN:'XLV',IDXX:'XLV',MTD:'XLV',WAT:'XLV',
  MCK:'XLV',CAH:'XLV',ABC:'XLV',GEHC:'XLV',

  // XLY — Consumer Discretionary
  AMZN:'XLY',TSLA:'XLY',HD:'XLY',MCD:'XLY',NKE:'XLY',SBUX:'XLY',TGT:'XLY',
  LOW:'XLY',TJX:'XLY',ROST:'XLY',BURL:'XLY',DG:'XLY',DLTR:'XLY',
  BBY:'XLY',AZO:'XLY',ORLY:'XLY',GPC:'XLY',
  F:'XLY',GM:'XLY',RIVN:'XLY',LCID:'XLY',
  CMG:'XLY',YUM:'XLY',DPZ:'XLY',QSR:'XLY',DRI:'XLY',
  BKNG:'XLY',EXPE:'XLY',ABNB:'XLY',UBER:'XLY',LYFT:'XLY',
  HLT:'XLY',MAR:'XLY',H:'XLY',WYNN:'XLY',LVS:'XLY',MGM:'XLY',
  DKNG:'XLY',PENN:'XLY',
  DECK:'XLY',RH:'XLY',WSM:'XLY',KMX:'XLY',AN:'XLY',
  RL:'XLY',PVH:'XLY',VFC:'XLY',HBI:'XLY',
  SHOP:'XLY',ETSY:'XLY',W:'XLY',CHWY:'XLY',COIN:'XLY',

  // XLP — Consumer Staples
  WMT:'XLP',PG:'XLP',KO:'XLP',PEP:'XLP',COST:'XLP',
  PM:'XLP',MO:'XLP',BTI:'XLP',
  MDLZ:'XLP',KHC:'XLP',GIS:'XLP',K:'XLP',CPB:'XLP',CAG:'XLP',SJM:'XLP',
  MKC:'XLP',CLX:'XLP',CHD:'XLP',CL:'XLP',EL:'XLP',
  HRL:'XLP',HSY:'XLP',
  STZ:'XLP',TAP:'XLP',MNST:'XLP',KDP:'XLP',
  SYY:'XLP',USFD:'XLP',

  // XLE — Energy
  XOM:'XLE',CVX:'XLE',COP:'XLE',OXY:'XLE',SLB:'XLE',
  EOG:'XLE',PXD:'XLE',HAL:'XLE',BKR:'XLE',
  MPC:'XLE',VLO:'XLE',PSX:'XLE',
  HES:'XLE',DVN:'XLE',FANG:'XLE',APA:'XLE',MRO:'XLE',
  NOV:'XLE',TRGP:'XLE',WMB:'XLE',KMI:'XLE',OKE:'XLE',
  ET:'XLE',EPD:'XLE',LNG:'XLE',

  // XLI — Industrials
  GE:'XLI',HON:'XLI',RTX:'XLI',BA:'XLI',CAT:'XLI',UPS:'XLI',
  LMT:'XLI',NOC:'XLI',GD:'XLI',LHX:'XLI',TDG:'XLI',HWM:'XLI',TXT:'XLI',
  FDX:'XLI',CSX:'XLI',UNP:'XLI',NSC:'XLI',CP:'XLI',CNI:'XLI',
  DAL:'XLI',UAL:'XLI',AAL:'XLI',LUV:'XLI',ALK:'XLI',
  MMM:'XLI',EMR:'XLI',ETN:'XLI',PH:'XLI',ROK:'XLI',AME:'XLI',
  GWW:'XLI',FAST:'XLI',SNA:'XLI',IR:'XLI',XYL:'XLI',GNRC:'XLI',
  CARR:'XLI',OTIS:'XLI',JCI:'XLI',TT:'XLI',
  J:'XLI',PWR:'XLI',MTZ:'XLI',HUBB:'XLI',IEX:'XLI',

  // XLU — Utilities
  NEE:'XLU',DUK:'XLU',SO:'XLU',AEP:'XLU',
  EXC:'XLU',PCG:'XLU',ED:'XLU',D:'XLU',SRE:'XLU',EIX:'XLU',
  PPL:'XLU',WEC:'XLU',ES:'XLU',XEL:'XLU',CMS:'XLU',LNT:'XLU',
  AEE:'XLU',DTE:'XLU',ETR:'XLU',PEG:'XLU',

  // XLRE — Real Estate
  AMT:'XLRE',PLD:'XLRE',O:'XLRE',EQIX:'XLRE',CCI:'XLRE',SBAC:'XLRE',
  DLR:'XLRE',PSA:'XLRE',EXR:'XLRE',CUBE:'XLRE',
  AVB:'XLRE',EQR:'XLRE',UDR:'XLRE',CPT:'XLRE',MAA:'XLRE',
  SPG:'XLRE',KIM:'XLRE',REG:'XLRE',BRX:'XLRE',
  VTR:'XLRE',WELL:'XLRE',PEAK:'XLRE',HR:'XLRE',MPW:'XLRE',OHI:'XLRE',
  NVR:'XLRE',DHI:'XLRE',LEN:'XLRE',PHM:'XLRE',TOL:'XLRE',
  SUI:'XLRE',ELS:'XLRE',AMH:'XLRE',INVH:'XLRE',

  // XLB — Materials
  LIN:'XLB',APD:'XLB',NEM:'XLB',FCX:'XLB',
  ALB:'XLB',SQM:'XLB',AA:'XLB',ATI:'XLB',
  NUE:'XLB',STLD:'XLB',RS:'XLB',CMC:'XLB',
  CF:'XLB',MOS:'XLB',
  DOW:'XLB',LYB:'XLB',EMN:'XLB',CC:'XLB',HUN:'XLB',OLN:'XLB',
  SHW:'XLB',PPG:'XLB',ECL:'XLB',RPM:'XLB',
  AVY:'XLB',PKG:'XLB',IP:'XLB',SEE:'XLB',
};

// ─── HTTP helper ────────────────────────────────────────────────────────────

function makeRequest(urlString) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(urlString);
    const req = https.get({
      hostname: urlObj.hostname, port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json, */*', 'Accept-Language': 'en-US,en;q=0.9' },
      maxHeaderSize: 32768
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error from ${urlObj.hostname}: ${e.message}`)); }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
  });
}

// ─── Technical indicators ────────────────────────────────────────────────────

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0, changes[i])) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -changes[i])) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// Detects the most significant pattern on the last two bars (chronological array)
function detectCandlestickPattern(ohlcv) {
  if (ohlcv.length < 2) return null;
  const curr = ohlcv[ohlcv.length - 1];
  const prev = ohlcv[ohlcv.length - 2];
  const body = Math.abs(curr.close - curr.open);
  const range = curr.high - curr.low;
  if (range === 0) return null;
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const upperWick = curr.high - Math.max(curr.open, curr.close);

  if (body / range < 0.1) return 'doji';
  if (curr.close > curr.open && prev.close < prev.open &&
      curr.open < prev.close && curr.close > prev.open) return 'bullish_engulfing';
  if (curr.close < curr.open && prev.close > prev.open &&
      curr.open > prev.close && curr.close < prev.open) return 'bearish_engulfing';
  if (lowerWick > 2 * body && upperWick < body && curr.close > curr.open) return 'hammer';
  return null;
}

// Finds the nearest swing-low support below current price in OHLCV array
function findNearestSupport(ohlcv, currentPrice) {
  if (ohlcv.length < 5) return null;
  const swingLows = [];
  for (let i = 2; i < ohlcv.length - 2; i++) {
    const lo = ohlcv[i].low;
    if (lo < ohlcv[i-1].low && lo < ohlcv[i-2].low &&
        lo < ohlcv[i+1].low && lo < ohlcv[i+2].low) {
      swingLows.push(lo);
    }
  }
  const below = swingLows.filter(l => l <= currentPrice);
  return below.length ? Math.max(...below) : null;
}

// Returns { streak, direction } — how many consecutive same-direction days
function countConsecutiveDays(ohlcv) {
  if (ohlcv.length < 2) return { streak: 0, direction: 'neutral' };
  const recent = [...ohlcv].reverse();
  const firstUp = recent[0].close > recent[0].open;
  let streak = 0;
  for (const d of recent) {
    if ((d.close > d.open) === firstUp) streak++;
    else break;
  }
  return { streak, direction: firstUp ? 'up' : 'down' };
}

// Volume confirmation: ratio of up-day volume in last 10 bars → 0/1/2 pts
function scoreVolumeConfirmation(ohlcv) {
  const recent = ohlcv.slice(-10);
  const upVol = recent.filter(d => d.close >= d.open).reduce((s, d) => s + d.volume, 0);
  const total = recent.reduce((s, d) => s + d.volume, 0);
  if (total === 0) return 0;
  const ratio = upVol / total;
  return ratio > 0.65 ? 2 : ratio > 0.50 ? 1 : 0;
}

// ─── New technical indicators ─────────────────────────────────────────────────

function calcEMASeq(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calculateMACD(closes) {
  const ema12 = calcEMASeq(closes, 12);
  const ema26 = calcEMASeq(closes, 26);
  if (ema12.length < 15 || ema26.length < 2) return null;
  const macdLine = ema26.map((v, i) => ema12[i + 14] - v);
  const signalLine = calcEMASeq(macdLine, 9);
  if (!signalLine.length) return null;
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const histogram = macd - signal;
  const prevHist = signalLine.length >= 2
    ? macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2]
    : 0;
  return { macd, signal, histogram, expanding: histogram > 0 && Math.abs(histogram) > Math.abs(prevHist) };
}

function calculateBollingerBands(closes, period = 20) {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  const sma = recent.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(recent.reduce((s, c) => s + (c - sma) ** 2, 0) / period);
  return { upper: sma + 2 * std, middle: sma, lower: sma - 2 * std };
}

function calculateADX(ohlcv, period = 14) {
  if (ohlcv.length < period * 2 + 1) return null;
  const bars = ohlcv.slice(-(period * 3 + 1));
  const tr = [], pDM = [], mDM = [];
  for (let i = 1; i < bars.length; i++) {
    const { high, low } = bars[i];
    const prevClose = bars[i - 1].close;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    const up = high - bars[i - 1].high;
    const dn = bars[i - 1].low - low;
    pDM.push(up > dn && up > 0 ? up : 0);
    mDM.push(dn > up && dn > 0 ? dn : 0);
  }
  if (tr.length < period) return null;
  let sTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let sPDM = pDM.slice(0, period).reduce((a, b) => a + b, 0);
  let sMDM = mDM.slice(0, period).reduce((a, b) => a + b, 0);
  const dxArr = [];
  let latestPDI = 0, latestMDI = 0;
  for (let i = period; i < tr.length; i++) {
    sTR = sTR - sTR / period + tr[i];
    sPDM = sPDM - sPDM / period + pDM[i];
    sMDM = sMDM - sMDM / period + mDM[i];
    if (sTR === 0) continue;
    latestPDI = (sPDM / sTR) * 100;
    latestMDI = (sMDM / sTR) * 100;
    const diSum = latestPDI + latestMDI;
    if (diSum > 0) dxArr.push(Math.abs(latestPDI - latestMDI) / diSum * 100);
  }
  if (dxArr.length < period) return null;
  const adx = dxArr.slice(-period).reduce((a, b) => a + b, 0) / period;
  return { adx, plusDI: latestPDI, minusDI: latestMDI };
}

function calculateOBVTrend(ohlcv) {
  if (ohlcv.length < 21) return null;
  const bars = ohlcv.slice(-21);
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) obv += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) obv -= bars[i].volume;
    obvArr.push(obv);
  }
  const latest = obvArr[obvArr.length - 1];
  const mid = obvArr[Math.floor(obvArr.length / 2)];
  const earliest = obvArr[0];
  return { trendUp: latest > earliest, strongUp: latest > mid && mid > earliest };
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

// Lightweight fetch for SPY, VIX, sector ETF — only needs price + MAs + 20-day return
async function fetchQuickChartData(symbol) {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo&includePrePost=false`;
  const data = await makeRequest(chartUrl);
  if (!data.chart?.result?.length) return null;
  const quotes = data.chart.result[0].indicators.quote[0];
  const closes = (data.chart.result[0].timestamp || [])
    .map((_, i) => quotes.close[i])
    .filter(c => c != null);
  if (!closes.length) return null;
  const currentPrice = closes[closes.length - 1];
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
  const ret20 = closes.length >= 21
    ? (currentPrice - closes[closes.length - 21]) / closes[closes.length - 21]
    : 0;
  return { symbol, currentPrice, ma20, ma50, ret20 };
}

// Full chart data for the analyzed stock
async function fetchYahooChartData(symbol) {
  console.log(`📊 Fetching Yahoo Finance chart data for ${symbol}...`);
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo&includePrePost=false`;
  const data = await makeRequest(chartUrl);
  if (!data.chart?.result?.length) {
    throw new Error(data.chart?.error?.description || 'Symbol not found or data unavailable');
  }
  const result = data.chart.result[0];
  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.timestamp || [];

  const ohlcv = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i], high: quotes.high[i],
      low: quotes.low[i], close: quotes.close[i], volume: quotes.volume[i]
    }))
    .filter(d => d.close != null && d.volume != null);

  if (!ohlcv.length) throw new Error('No trading data available');

  const recent = [...ohlcv].reverse(); // most-recent first
  const last20 = recent.slice(0, 20);

  // Order flow
  let totalBuyVolume = 0, totalSellVolume = 0;
  for (const d of last20) {
    if (d.close > d.open) totalBuyVolume += d.volume;
    else totalSellVolume += d.volume;
  }

  const pocData = [...last20].sort((a, b) => b.volume - a.volume)[0];
  const closes = recent.map(d => d.close); // most-recent first

  const ma20 = closes.slice(0, Math.min(20, closes.length)).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const ma50 = closes.slice(0, Math.min(50, closes.length)).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
  const ma200 = closes.slice(0, Math.min(200, closes.length)).reduce((a, b) => a + b, 0) / Math.min(200, closes.length);
  const rsi = calculateRSI([...closes].reverse(), 14);
  const avgVolume = Math.round(last20.reduce((a, d) => a + d.volume, 0) / last20.length);

  const currentPrice = meta.regularMarketPrice;
  const high52Week = meta.fiftyTwoWeekHigh || Math.max(...ohlcv.map(d => d.high));
  const low52Week = meta.fiftyTwoWeekLow || Math.min(...ohlcv.map(d => d.low));
  const drawdownFromHigh = ((high52Week - currentPrice) / high52Week) * 100;

  const nearestSupport = findNearestSupport(ohlcv, currentPrice);
  const streak = countConsecutiveDays(ohlcv);
  const candlestickPattern = detectCandlestickPattern(ohlcv);
  const volConfirmScore = scoreVolumeConfirmation(ohlcv);

  const closesChron = ohlcv.map(d => d.close);
  const macdData = calculateMACD(closesChron);
  const bbData = calculateBollingerBands(closesChron);
  const adxData = calculateADX(ohlcv);
  const obvData = calculateOBVTrend(ohlcv);
  const ret20 = ohlcv.length >= 21
    ? (currentPrice - ohlcv[ohlcv.length - 21].close) / ohlcv[ohlcv.length - 21].close
    : 0;

  // Chart data: last 60 days with rolling MA lines
  const allCloses = ohlcv.map(d => d.close);
  const chartCount = Math.min(60, ohlcv.length);
  const chartStart = ohlcv.length - chartCount;
  const chartData = ohlcv.slice(chartStart).map((d, i) => {
    const idx = chartStart + i;
    const s20 = allCloses.slice(Math.max(0, idx - 19), idx + 1);
    const s50 = allCloses.slice(Math.max(0, idx - 49), idx + 1);
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
    symbol, currentPrice,
    high52Week, low52Week,
    avgVolume, pocPrice: pocData.close, pocVolume: pocData.volume,
    buyVolume: totalBuyVolume, sellVolume: totalSellVolume,
    orderFlowDelta: totalBuyVolume - totalSellVolume,
    ma20Raw: ma20, ma50Raw: ma50, ma200Raw: ma200,
    ma20: ma20.toFixed(2), ma50: ma50.toFixed(2), ma200: ma200.toFixed(2),
    rsi: rsi.toFixed(2),
    drawdownFromHigh: drawdownFromHigh.toFixed(2),
    candlestickPattern,
    nearestSupport: nearestSupport ? nearestSupport.toFixed(2) : null,
    streak, volConfirmScore, ret20,
    macdData, bbData, adxData, obvData,
    chartData,
    timestamp: new Date().toISOString()
  };
}

async function fetchAlphaVantageFundamentals(symbol) {
  const apiKey = CONFIG.alphaVantageKey;
  if (apiKey === 'demo') throw new Error('Set ALPHA_VANTAGE_KEY env var for fundamental data (free at alphavantage.co)');
  console.log(`📈 Fetching Alpha Vantage fundamentals for ${symbol}...`);
  const data = await makeRequest(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`);
  if (data.Note || data.Information) throw new Error('Alpha Vantage rate limit. Try again in 1 minute.');
  if (!data.Symbol) throw new Error('Symbol not found in Alpha Vantage');
  return {
    pe: parseFloat(data.PERatio) || null,
    forwardPE: parseFloat(data.ForwardPE) || null,
    eps: parseFloat(data.EPS) || null,
    roe: parseFloat(data.ReturnOnEquityTTM) || null,
    profitMargin: parseFloat(data.ProfitMargin) || null,
    revenueGrowthYOY: parseFloat(data.QuarterlyRevenueGrowthYOY) || null,
    earningsGrowthYOY: parseFloat(data.QuarterlyEarningsGrowthYOY) || null,
    beta: parseFloat(data.Beta) || null,
    dividendYield: parseFloat(data.DividendYield) || 0,
    marketCap: parseInt(data.MarketCapitalization) || 0,
    priceToBook: parseFloat(data.PriceToBookRatio) || null,
    sector: data.Sector || null
  };
}

// ─── Natural-language explanation ────────────────────────────────────────────

function generateExplanation(symbol, rec, dcaScore, allocationPct, signals, scoreBreakdown, market, riskFlags, fundamentalData) {
  const cp = parseFloat(market.currentPrice);
  const rsi = parseFloat(signals.rsi?.value);
  const drawdown = parseFloat(market.drawdownFromHigh);
  const position52 = parseInt(market.position);

  // Collect bullish and bearish points from signals
  const bullish = [];
  const bearish = [];

  // Technical
  if (signals.maTrend?.score === 2) bullish.push('a golden cross (MA20 above MA50 with price above both, confirming an uptrend)');
  else if (signals.maTrend?.score === 0) bearish.push('a downtrend (price below both MA20 and MA50)');

  if (signals.rsi?.score === 2) bullish.push(`an oversold RSI of ${rsi} suggesting the recent selloff may be overdone`);
  else if (signals.rsi?.score === 0 && rsi > 70) bearish.push(`an overbought RSI of ${rsi} indicating the stock is extended and due for a pullback`);

  if (signals.orderFlow?.score === 2) bullish.push(`net buying pressure over the last 20 sessions (delta: ${signals.orderFlow.value})`);
  else bearish.push(`net selling pressure over the last 20 sessions (delta: ${signals.orderFlow?.value})`);

  if (signals.poc?.score >= 1) bullish.push(`price trading ${signals.poc.value} from its highest-volume price level (Point of Control)`);
  else bearish.push(`price far (${signals.poc?.value}) from its key volume concentration level`);

  if (signals.volumeConfirm?.score === 2) bullish.push('above-average volume on up days, confirming buyer conviction');
  else if (signals.volumeConfirm?.score === 0) bearish.push('heavier volume on down days than up days, suggesting distribution');

  if (signals.candle?.score === 2) bullish.push(`a ${signals.candle.label} candlestick pattern at the current level`);
  else if (signals.candle?.label === 'bearish engulfing') bearish.push('a bearish engulfing candle signaling potential reversal to the downside');

  // Market context
  if (signals.spyRegime?.score === 2) bullish.push('the broad market (SPY) in a confirmed uptrend above its 50-day average');
  else if (signals.spyRegime?.score === 0) bearish.push('the broad market (SPY) in a downtrend — macro headwinds reduce the probability of any individual stock recovering');

  if (signals.vix?.score === 2) bullish.push(`elevated market fear (VIX ${signals.vix.value}) historically creating good DCA entry points`);
  else if (signals.vix?.score === 0) bearish.push(`low market fear (VIX ${signals.vix.value}) suggesting complacency — little margin of safety is priced in`);

  if (signals.sectorStrength?.score === 2) bullish.push(`outperformance versus its sector ETF (${signals.sectorStrength.value}) showing relative strength`);
  else if (signals.sectorStrength?.score === 0) bearish.push(`underperformance versus its sector ETF (${signals.sectorStrength.value}), which may indicate stock-specific weakness`);

  // Price action
  if (drawdown > 20) bullish.push(`a meaningful ${drawdown.toFixed(1)}% discount from its 52-week high, offering value for long-term DCA buyers`);
  else if (drawdown < 5) bearish.push(`trading within ${drawdown.toFixed(1)}% of its 52-week high — near the top of the range with limited margin of safety`);

  if (signals.support?.score >= 1) bullish.push(`price near a known swing-low support at ${signals.support.value}`);

  if (position52 < 33) bullish.push(`sitting in the lower third of its 52-week range ($${market.low52Week}–$${market.high52Week})`);
  else if (position52 > 66) bearish.push(`in the upper third of its 52-week range ($${market.low52Week}–$${market.high52Week}), limiting near-term upside`);

  // Fundamentals
  if (fundamentalData) {
    if (fundamentalData.revenueGrowthYOY && fundamentalData.revenueGrowthYOY !== 'N/A') {
      const growth = parseFloat(fundamentalData.revenueGrowthYOY);
      if (!isNaN(growth)) {
        if (growth > 10) bullish.push(`strong year-over-year revenue growth of ${fundamentalData.revenueGrowthYOY}`);
        else if (growth < 0) bearish.push(`declining revenue (${fundamentalData.revenueGrowthYOY} YOY), which undermines the fundamental case`);
      }
    }
    if (fundamentalData.pe && fundamentalData.pe !== 'N/A') {
      const pe = parseFloat(fundamentalData.pe);
      if (!isNaN(pe) && pe < 20) bullish.push(`an attractive P/E of ${fundamentalData.pe}x`);
      else if (!isNaN(pe) && pe > 30) bearish.push(`a high P/E of ${fundamentalData.pe}x leaving little room for earnings disappointment`);
    }
  }

  // Risk flags sentence
  const riskSentence = riskFlags?.length
    ? ` Note that the score has been discounted because: ${riskFlags.join('; ')}.`
    : '';

  // Build the paragraph
  const topBullish = bullish.slice(0, 3);
  const topBearish = bearish.slice(0, 3);

  let para = '';

  if (rec.includes('STRONG BUY')) {
    para = `${symbol} presents a compelling DCA entry at $${cp.toFixed(2)}, scoring ${dcaScore}/100 across technical, market, and price action factors. `;
    if (topBullish.length) para += `The case for buying is supported by ${topBullish.join(', ')}. `;
    if (topBearish.length) para += `The main risks to monitor are ${topBearish.join(' and ')}. `;
    para += `At this score, deploying the full planned DCA amount this period is justified.`;
  } else if (rec.includes('BUY')) {
    para = `${symbol} shows a favorable but not exceptional setup at $${cp.toFixed(2)}, scoring ${dcaScore}/100. `;
    if (topBullish.length) para += `On the positive side: ${topBullish.join(', ')}. `;
    if (topBearish.length) para += `However, ${topBearish.join(' and ')} temper the conviction. `;
    para += `Deploying ${allocationPct}% of your planned amount this period is reasonable — saving the remainder for a better entry if conditions improve.`;
  } else if (rec.includes('HOLD')) {
    para = `${symbol} is in a mixed state at $${cp.toFixed(2)}, scoring ${dcaScore}/100 — not an ideal DCA entry, but not a clear stay-away either. `;
    if (topBearish.length) para += `The primary concerns are ${topBearish.join(' and ')}, which reduce confidence in an immediate move higher. `;
    if (topBullish.length) para += `On the other hand, ${topBullish.slice(0,2).join(' and ')} keep the longer-term thesis intact. `;
    para += `Consider deploying only ${allocationPct}% of your planned amount now and waiting for a better technical setup — a pullback toward support or an RSI reset — before adding more.`;
  } else {
    para = `${symbol} is not offering a favorable DCA entry at $${cp.toFixed(2)}, scoring just ${dcaScore}/100. `;
    if (topBearish.length) para += `Multiple factors are working against it: ${topBearish.join(', ')}. `;
    if (topBullish.length) para += `${topBullish[0].charAt(0).toUpperCase() + topBullish[0].slice(1)} is a positive, but insufficient to offset the headwinds. `;
    para += `Patience is warranted — wait for conditions to improve before initiating or adding to a position.`;
  }

  return para + riskSentence;
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

async function analyzeDCA(symbol, options = {}) {
  console.log(`\n🚀 Starting DCA analysis for ${symbol.toUpperCase()}...\n`);
  const errors = [];
  const sectorEtf = SECTOR_ETF[symbol.toUpperCase()];

  // All external fetches run in parallel
  const [stockResult, spyResult, vixResult, sectorResult, fundResult] = await Promise.allSettled([
    fetchYahooChartData(symbol),
    fetchQuickChartData('SPY'),
    fetchQuickChartData('^VIX'),
    sectorEtf ? fetchQuickChartData(sectorEtf) : Promise.resolve(null),
    options.yahooOnly ? Promise.resolve(null) : fetchAlphaVantageFundamentals(symbol)
  ]);

  if (stockResult.status !== 'fulfilled') {
    errors.push(`Market data: ${stockResult.reason?.message}`);
    console.error(`❌ ${stockResult.reason?.message}`);
    return {
      symbol: symbol.toUpperCase(),
      error: errors.join(' | '),
      tips: [
        '1️⃣ Check ticker symbol is correct (e.g., AAPL, MSFT, TSLA)',
        '2️⃣ Yahoo Finance may be temporarily unavailable — retry in a moment',
        '3️⃣ For fundamentals, get a FREE Alpha Vantage key: alphavantage.co',
        '4️⃣ Windows: set ALPHA_VANTAGE_KEY=your_key  |  Linux/Mac: export ALPHA_VANTAGE_KEY=your_key'
      ]
    };
  }

  const marketData = stockResult.value;
  const spyData = spyResult.status === 'fulfilled' ? spyResult.value : null;
  const vixData = vixResult.status === 'fulfilled' ? vixResult.value : null;
  const sectorData = sectorResult.status === 'fulfilled' ? sectorResult.value : null;
  const fundamentalData = fundResult.status === 'fulfilled' ? fundResult.value : null;

  if (fundamentalData) console.log('✅ Fundamental data loaded');
  else errors.push(`Fundamentals: ${fundResult.reason?.message}`);

  const d = { ...marketData, ...(fundamentalData || {}) };
  const cp = d.currentPrice;
  const range52 = (d.high52Week || 0) - (d.low52Week || 0);
  const position52 = range52 > 0 ? (cp - d.low52Week) / range52 : 0.5;
  const distToPOC = d.pocPrice ? Math.abs(cp - d.pocPrice) / cp * 100 : 99;

  const signals = {};

  // ── 1. TECHNICAL SCORE (0–12) ──────────────────────────────────────────────

  let technicalScore = 0;

  // RSI (0–2): oversold is bullish only when price isn't already collapsing below MA50
  const rsi = parseFloat(d.rsi);
  let rsiScore = 0;
  if (!isNaN(rsi)) {
    if (rsi < 30) rsiScore = cp > d.ma50Raw ? 2 : 1; // discount if below MA50
    else if (rsi <= 70) rsiScore = 1;
    else rsiScore = 0;
  }
  signals.rsi = { score: rsiScore, max: 2, label: rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral', value: rsi.toFixed(1) };
  technicalScore += rsiScore;

  // POC proximity (0–2)
  const pocScore = distToPOC < 5 ? 2 : distToPOC < 10 ? 1 : 0;
  signals.poc = { score: pocScore, max: 2, label: distToPOC < 5 ? 'At POC' : distToPOC < 10 ? 'Near POC' : 'Far from POC', value: `${distToPOC.toFixed(1)}%` };
  technicalScore += pocScore;

  // Order flow (0–2)
  const flowScore = d.orderFlowDelta > 0 ? 2 : 0;
  const flowM = Math.round(Math.abs(d.orderFlowDelta) / 1e6);
  signals.orderFlow = { score: flowScore, max: 2, label: d.orderFlowDelta > 0 ? 'Bullish' : 'Bearish', value: `${d.orderFlowDelta > 0 ? '+' : '-'}${flowM}M` };
  technicalScore += flowScore;

  // MA trend (0–2): golden cross = price > MA20 AND MA20 > MA50
  const priceAboveMA20 = cp > d.ma20Raw;
  const ma20AboveMA50 = d.ma20Raw > d.ma50Raw;
  const maScore = (priceAboveMA20 && ma20AboveMA50) ? 2 : (priceAboveMA20 || ma20AboveMA50) ? 1 : 0;
  signals.maTrend = { score: maScore, max: 2, label: maScore === 2 ? 'Golden Cross' : maScore === 1 ? 'Partial Uptrend' : 'Downtrend', value: `P${priceAboveMA20?'>':'<'}MA20, MA20${ma20AboveMA50?'>':'<'}MA50` };
  technicalScore += maScore;

  // Volume confirmation (0–2)
  signals.volumeConfirm = { score: d.volConfirmScore, max: 2, label: d.volConfirmScore === 2 ? 'Strong Buy Volume' : d.volConfirmScore === 1 ? 'Moderate' : 'Sell Pressure', value: '' };
  technicalScore += d.volConfirmScore;

  // Candlestick pattern (0–2)
  const candleScore = (d.candlestickPattern === 'bullish_engulfing' || d.candlestickPattern === 'hammer') ? 2
                    : d.candlestickPattern === 'doji' ? 1 : 0;
  signals.candle = { score: candleScore, max: 2, label: d.candlestickPattern ? d.candlestickPattern.replace('_', ' ') : 'No pattern', value: '' };
  technicalScore += candleScore;

  // MACD (0–2): trend momentum direction + histogram expansion
  let macdScore = 0, macdLabel = 'N/A';
  if (d.macdData) {
    const { macd, signal: sig, expanding } = d.macdData;
    if (macd > sig && expanding) { macdScore = 2; macdLabel = 'Bullish + Expanding'; }
    else if (macd > sig)         { macdScore = 1; macdLabel = 'Bullish Crossover'; }
    else                          { macdScore = 0; macdLabel = 'Bearish'; }
  }
  signals.macd = { score: macdScore, max: 2, label: macdLabel, value: d.macdData ? `${d.macdData.macd.toFixed(2)} vs ${d.macdData.signal.toFixed(2)}` : 'N/A' };
  technicalScore += macdScore;

  // Bollinger Bands (0–2): oversold positioning is best DCA entry
  let bbScore = 0, bbLabel = 'N/A';
  if (d.bbData) {
    const { upper, middle, lower } = d.bbData;
    if (cp <= lower)  { bbScore = 2; bbLabel = 'At/Below Lower Band'; }
    else if (cp < middle) { bbScore = 1; bbLabel = 'Below Mid Band'; }
    else { bbScore = 0; bbLabel = cp > upper ? 'Above Upper Band' : 'Above Mid Band'; }
  }
  signals.bollingerBands = { score: bbScore, max: 2, label: bbLabel, value: d.bbData ? `${d.bbData.lower.toFixed(2)}–${d.bbData.upper.toFixed(2)}` : 'N/A' };
  technicalScore += bbScore;

  // ADX – trend strength (0–2)
  let adxScore = 0, adxLabel = 'N/A';
  if (d.adxData) {
    const { adx, plusDI, minusDI } = d.adxData;
    if (adx > 25 && plusDI > minusDI) { adxScore = 2; adxLabel = `Strong Uptrend`; }
    else if (plusDI > minusDI)         { adxScore = 1; adxLabel = `Bullish DI`; }
    else                                { adxScore = 0; adxLabel = `Downtrend/Weak`; }
  }
  signals.adx = { score: adxScore, max: 2, label: adxLabel, value: d.adxData ? `ADX ${d.adxData.adx.toFixed(1)}  +DI ${d.adxData.plusDI.toFixed(1)}  -DI ${d.adxData.minusDI.toFixed(1)}` : 'N/A' };
  technicalScore += adxScore;

  // OBV trend (0–2): accumulation vs distribution
  let obvScore = 0, obvLabel = 'N/A';
  if (d.obvData) {
    if (d.obvData.strongUp)      { obvScore = 2; obvLabel = 'Strong Accumulation'; }
    else if (d.obvData.trendUp)  { obvScore = 1; obvLabel = 'Mild Accumulation'; }
    else                          { obvScore = 0; obvLabel = 'Distribution / Flat'; }
  }
  signals.obv = { score: obvScore, max: 2, label: obvLabel, value: '' };
  technicalScore += obvScore;

  // ── 2. MARKET CONTEXT SCORE (0–6) ─────────────────────────────────────────

  let marketContextScore = 0;

  // SPY regime (0–2)
  let spyScore = 0, spyLabel = 'Unknown';
  if (spyData) {
    if (spyData.currentPrice > spyData.ma50) { spyScore = 2; spyLabel = 'Bull Market'; }
    else if (spyData.currentPrice > spyData.ma20) { spyScore = 1; spyLabel = 'Mixed'; }
    else { spyScore = 0; spyLabel = 'Bear Market'; }
  }
  signals.spyRegime = { score: spyScore, max: 2, label: spyLabel, value: spyData ? `$${spyData.currentPrice.toFixed(2)}` : 'N/A' };
  marketContextScore += spyScore;

  // VIX fear gauge (0–2): high fear = good DCA entry
  let vixScore = 0, vixLabel = 'Unknown';
  const vixLevel = vixData?.currentPrice;
  if (vixLevel) {
    if (vixLevel > 30) { vixScore = 2; vixLabel = 'High Fear (opportunity)'; }
    else if (vixLevel > 20) { vixScore = 1; vixLabel = 'Elevated'; }
    else { vixScore = 0; vixLabel = 'Low Fear (complacent)'; }
  }
  signals.vix = { score: vixScore, max: 2, label: vixLabel, value: vixLevel ? vixLevel.toFixed(1) : 'N/A' };
  marketContextScore += vixScore;

  // Sector relative strength (0–2)
  let sectorScore = 0, sectorLabel = 'No sector data';
  if (sectorData) {
    const diff = d.ret20 - sectorData.ret20;
    if (diff > 0.02) { sectorScore = 2; sectorLabel = `Outperforming ${sectorEtf}`; }
    else if (diff > -0.02) { sectorScore = 1; sectorLabel = `In-line with ${sectorEtf}`; }
    else { sectorScore = 0; sectorLabel = `Underperforming ${sectorEtf}`; }
  }
  signals.sectorStrength = {
    score: sectorScore, max: 2, label: sectorLabel,
    value: sectorData ? `${(d.ret20*100).toFixed(1)}% vs ${(sectorData.ret20*100).toFixed(1)}%` : 'N/A'
  };
  marketContextScore += sectorScore;

  // ── 3. PRICE ACTION SCORE (0–6) ───────────────────────────────────────────

  let priceActionScore = 0;

  // 52-week position (0–2): lower third = best DCA value
  const pos52Score = position52 < 0.33 ? 2 : position52 < 0.66 ? 1 : 0;
  signals.position52 = { score: pos52Score, max: 2, label: position52 < 0.33 ? 'Near 52W Low' : position52 < 0.66 ? 'Mid Range' : 'Near 52W High', value: `${(position52*100).toFixed(0)}% of range` };
  priceActionScore += pos52Score;

  // Drawdown from 52-week high (0–2): deeper discount = more DCA value
  const drawdown = parseFloat(d.drawdownFromHigh);
  const drawdownScore = drawdown > 30 ? 2 : drawdown > 15 ? 1 : 0;
  signals.drawdown = { score: drawdownScore, max: 2, label: `${drawdown.toFixed(1)}% off 52W high`, value: `$${d.high52Week?.toFixed(2)} → $${cp?.toFixed(2)}` };
  priceActionScore += drawdownScore;

  // Support proximity (0–2): bounce from a swing-low support is a stronger entry
  let supportScore = 0, supportLabel = 'No clear support';
  if (d.nearestSupport) {
    const distToSupport = Math.abs(cp - parseFloat(d.nearestSupport)) / cp * 100;
    if (distToSupport < 3) { supportScore = 2; supportLabel = 'At support'; }
    else if (distToSupport < 7) { supportScore = 1; supportLabel = 'Near support'; }
    else { supportScore = 0; supportLabel = 'Far from support'; }
  }
  signals.support = { score: supportScore, max: 2, label: supportLabel, value: d.nearestSupport ? `$${d.nearestSupport}` : 'N/A' };
  priceActionScore += supportScore;

  // ── 4. FUNDAMENTAL SCORE (0–8, if available) ──────────────────────────────

  let fundamentalScore = 0, fundamentalMax = 0;
  if (fundamentalData) {
    fundamentalMax = 8;
    if (d.pe) fundamentalScore += d.pe < 20 ? 2 : d.pe < 25 ? 1 : 0;
    if (d.roe) fundamentalScore += d.roe > 0.15 ? 2 : d.roe > 0.08 ? 1 : 0;
    if (d.profitMargin) fundamentalScore += d.profitMargin > 0.20 ? 2 : d.profitMargin > 0.10 ? 1 : 0;
    if (d.revenueGrowthYOY != null) fundamentalScore += d.revenueGrowthYOY > 0.10 ? 2 : d.revenueGrowthYOY > 0 ? 1 : 0;
  }

  // ── 5. RISK MODIFIERS ─────────────────────────────────────────────────────

  let riskModifier = 1.0;
  const riskFlags = [];

  if (d.beta && d.beta > 1.5) {
    riskModifier *= 0.92;
    riskFlags.push(`High beta (${d.beta.toFixed(2)}) — more noise`);
  }
  if (d.streak?.direction === 'down' && d.streak?.streak >= 5) {
    riskModifier *= 0.90;
    riskFlags.push(`${d.streak.streak} consecutive down days — momentum dump risk`);
  }
  if (d.ma200Raw && cp < d.ma200Raw) {
    riskModifier *= 0.93;
    riskFlags.push(`Below MA200 ($${d.ma200}) — long-term downtrend`);
  }
  if (d.candlestickPattern === 'bearish_engulfing') {
    riskModifier *= 0.95;
    riskFlags.push('Bearish engulfing candle — reversal signal');
  }

  // ── 6. FINAL SCORE + RECOMMENDATION ──────────────────────────────────────

  const techRatio  = technicalScore / 20;
  const mktRatio   = marketContextScore / 6;
  const priceRatio = priceActionScore / 6;
  const fundRatio  = fundamentalMax > 0 ? fundamentalScore / fundamentalMax : null;

  const rawScore = fundRatio !== null
    ? (techRatio * 0.35 + mktRatio * 0.25 + priceRatio * 0.20 + fundRatio * 0.20) * 100
    : (techRatio * 0.45 + mktRatio * 0.30 + priceRatio * 0.25) * 100;

  const dcaScore = Math.min(100, Math.max(0, rawScore * riskModifier));

  const recommendation = dcaScore > 70 ? '✅ STRONG BUY'
                       : dcaScore > 55 ? '👍 BUY'
                       : dcaScore > 40 ? '⚖️ HOLD'
                       : '⏸️ WAIT';

  const allocationPct = dcaScore > 70 ? 100
                      : dcaScore > 55 ? 75
                      : dcaScore > 40 ? 50
                      : dcaScore > 25 ? 25 : 0;

  const marketForExplanation = {
    currentPrice: cp?.toFixed(2),
    high52Week: d.high52Week?.toFixed(2),
    low52Week: d.low52Week?.toFixed(2),
    position: (position52 * 100).toFixed(0),
    drawdownFromHigh: parseFloat(d.drawdownFromHigh)
  };

  const explanation = generateExplanation(
    symbol.toUpperCase(), recommendation, dcaScore.toFixed(2), allocationPct,
    signals, null, marketForExplanation, riskFlags, fundamentalData
  );

  return {
    symbol: symbol.toUpperCase(),
    analysis: {
      dcaScore: dcaScore.toFixed(2),
      recommendation,
      allocationPct,
      explanation,
      riskModifier: riskModifier.toFixed(3),
      riskFlags,
      scoreBreakdown: {
        technical:     { score: technicalScore,     max: 20, pct: Math.round(techRatio * 100) },
        marketContext: { score: marketContextScore,  max: 6,  pct: Math.round(mktRatio * 100) },
        priceAction:   { score: priceActionScore,    max: 6,  pct: Math.round(priceRatio * 100) },
        fundamental: fundamentalMax > 0
          ? { score: fundamentalScore, max: fundamentalMax, pct: Math.round((fundamentalScore/fundamentalMax) * 100) }
          : null
      },
      signals,
      timestamp: d.timestamp
    },
    market: {
      currentPrice: cp?.toFixed(2),
      high52Week: d.high52Week?.toFixed(2),
      low52Week: d.low52Week?.toFixed(2),
      position: (position52 * 100).toFixed(0),
      drawdownFromHigh: d.drawdownFromHigh,
      avgVolume: d.avgVolume,
      ma200: d.ma200,
      spyPrice: spyData?.currentPrice?.toFixed(2) || null,
      spyRegime: spyLabel,
      vixLevel: vixLevel?.toFixed(1) || null,
      sectorEtf: sectorEtf || null,
      streak: d.streak
    },
    technical: {
      rsi: d.rsi,
      ma20: d.ma20, ma50: d.ma50, ma200: d.ma200,
      pocPrice: d.pocPrice?.toFixed(2),
      distToPOC: distToPOC.toFixed(2),
      orderFlowDelta: d.orderFlowDelta,
      buyPressure: d.buyVolume,
      sellPressure: d.sellVolume,
      candlestickPattern: d.candlestickPattern,
      nearestSupport: d.nearestSupport,
      streak: d.streak
    },
    fundamental: fundamentalData ? {
      pe: d.pe?.toFixed(2) || 'N/A',
      forwardPE: d.forwardPE?.toFixed(2) || 'N/A',
      eps: d.eps?.toFixed(2) || 'N/A',
      roe: d.roe ? `${(d.roe * 100).toFixed(1)}%` : 'N/A',
      profitMargin: d.profitMargin ? `${(d.profitMargin * 100).toFixed(1)}%` : 'N/A',
      revenueGrowthYOY: d.revenueGrowthYOY != null ? `${(d.revenueGrowthYOY * 100).toFixed(1)}%` : 'N/A',
      earningsGrowthYOY: d.earningsGrowthYOY != null ? `${(d.earningsGrowthYOY * 100).toFixed(1)}%` : 'N/A',
      beta: d.beta?.toFixed(2) || 'N/A',
      dividendYield: d.dividendYield != null ? `${(d.dividendYield * 100).toFixed(2)}%` : '0%',
      priceToBook: d.priceToBook?.toFixed(2) || 'N/A',
      marketCap: d.marketCap,
      sector: d.sector
    } : null,
    chartData: d.chartData || null,
    errors: errors.length ? errors : null
  };
}

// ─── Scan Helpers ─────────────────────────────────────────────────────────────

function extractScanEntry(result) {
  return {
    symbol: result.symbol,
    dcaScore: parseFloat(result.analysis.dcaScore),
    recommendation: result.analysis.recommendation,
    allocationPct: result.analysis.allocationPct,
    price: result.market.currentPrice,
    drawdownFromHigh: result.market.drawdownFromHigh,
    rsi: result.technical.rsi,
    fundamentalScore: result.analysis.scoreBreakdown.fundamental?.score ?? null,
    fundamentalMax: result.analysis.scoreBreakdown.fundamental?.max ?? null,
    fundamental: result.fundamental ? {
      pe: result.fundamental.pe,
      forwardPE: result.fundamental.forwardPE,
      roe: result.fundamental.roe,
      profitMargin: result.fundamental.profitMargin,
      revenueGrowthYOY: result.fundamental.revenueGrowthYOY,
      sector: result.fundamental.sector
    } : null,
    error: null
  };
}

async function scanConcurrent(symbols, sseWrite, isCancelled, concurrency = 5) {
  const total = symbols.length;
  for (let i = 0; i < total; i += concurrency) {
    if (isCancelled()) break;
    const batch = symbols.slice(i, i + concurrency);
    sseWrite({ type: 'progress', current: i, total, symbol: batch[0] });
    const settled = await Promise.allSettled(
      batch.map(sym =>
        analyzeDCA(sym, { yahooOnly: true }).then(r => extractScanEntry(r))
      )
    );
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled') {
        sseWrite({ type: 'result', ...r.value });
      } else {
        sseWrite({ type: 'result', symbol: batch[j], dcaScore: null, error: r.reason?.message || 'Failed' });
      }
    }
    // Brief pause between batches to avoid hammering Yahoo
    if (i + concurrency < total && !isCancelled()) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  sseWrite({ type: 'done' });
}

async function scanWatchlist(symbols, sseWrite, isCancelled) {
  const DELAY_MS = 13000;
  for (let i = 0; i < symbols.length; i++) {
    if (isCancelled()) break;
    const sym = symbols[i];
    sseWrite({ type: 'progress', current: i + 1, total: symbols.length, symbol: sym });
    try {
      const result = await analyzeDCA(sym);
      sseWrite({ type: 'result', ...extractScanEntry(result) });
    } catch (e) {
      sseWrite({ type: 'result', symbol: sym, dcaScore: null, error: e.message });
    }
    if (i < symbols.length - 1 && !isCancelled()) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  sseWrite({ type: 'done' });
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (parsedUrl.pathname === '/api/analyze' && parsedUrl.query.symbol) {
    try {
      const result = await analyzeDCA(parsedUrl.query.symbol);
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (parsedUrl.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', version: '3.0.0' }));
  } else if (parsedUrl.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'DCA Assistant API', version: '3.0.0',
      note: 'Technical data from Yahoo Finance (no key needed). Fundamental data requires ALPHA_VANTAGE_KEY.',
      endpoints: { analyze: '/api/analyze?symbol=AAPL', scan: '/api/scan (POST {"symbols":[...]})', health: '/health' }
    }));
  } else if (parsedUrl.pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let symbols, universeMode = false;
      try {
        const parsed = JSON.parse(body);
        if (parsed.universe === true) {
          universeMode = true;
          symbols = Object.keys(SECTOR_ETF);
        } else {
          symbols = parsed.symbols;
          if (!Array.isArray(symbols) || symbols.length === 0) throw new Error('No symbols');
          symbols = symbols
            .slice(0, 20)
            .map(s => String(s).toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10))
            .filter(Boolean);
          if (symbols.length === 0) throw new Error('No valid symbols');
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message || 'Invalid request: expected {"symbols":[...]} or {"universe":true}' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      let cancelled = false;
      res.on('close', () => { cancelled = true; });
      const sseWrite = (obj) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
      };
      if (universeMode) {
        await scanConcurrent(symbols, sseWrite, () => cancelled);
      } else {
        await scanWatchlist(symbols, sseWrite, () => cancelled);
      }
      if (!res.writableEnded) res.end();
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(CONFIG.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🚀 DCA ASSISTANT SERVER v3.0 🚀                    ║
╠═══════════════════════════════════════════════════════════════╣
║  http://localhost:${CONFIG.port}/api/analyze?symbol=AAPL          ║
║                                                               ║
║  Scoring categories:                                          ║
║  ✅ Technical      (RSI, MA trend, POC, order flow,           ║
║                    volume confirm, candlestick)               ║
║  ✅ Market Context (SPY regime, VIX, sector strength)         ║
║  ✅ Price Action   (52W position, drawdown, support)          ║
║  ✅ Risk Modifiers (beta, MA200, streak, bearish candle)       ║
║  ✅ Position Sizing (0/25/50/75/100% of planned amount)       ║
║  ${CONFIG.alphaVantageKey !== 'demo' ? '✅' : '⚠️ '} Fundamentals  (P/E, ROE, margins, revenue growth)     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { analyzeDCA, fetchYahooChartData, fetchAlphaVantageFundamentals };
