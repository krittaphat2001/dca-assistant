/**
 * DCA Assistant v3.0 - Enhanced Real-Time Stock Analysis Server
 * Technical + Market Context + Price Action + Fundamental scoring
 * Data: Yahoo Finance (no auth) + Alpha Vantage (optional, for fundamentals)
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

function loadConfig() {
  const base = { port: process.env.PORT || 3000, alphaVantageKey: process.env.ALPHA_VANTAGE_KEY || 'demo' };
  try {
    const file = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
    return { ...base, ...JSON.parse(file) };
  } catch { return base; }
}

const CONFIG = loadConfig();
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const portfolioDataPath = path.join(__dirname, 'portfolio-data.json');
const portfolioHistoryPath = path.join(__dirname, 'portfolio-history.json');

function readPortfolio() {
  try { return JSON.parse(fs.readFileSync(portfolioDataPath, 'utf8')); }
  catch { return { positions: [] }; }
}

function readPortfolioHistory() {
  try { return JSON.parse(fs.readFileSync(portfolioHistoryPath, 'utf8')); }
  catch { return []; }
}

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

// Median P/E ratio by sector — used for sector-relative valuation scoring
const SECTOR_PE_MEDIAN = {
  XLK: 28, XLC: 22, XLF: 14, XLV: 20, XLY: 24,
  XLP: 20, XLE: 12, XLI: 20, XLB: 18, XLRE: 35, XLU: 18
};

// Human-readable sector names for the 11 SPDR sector ETFs
const SECTOR_NAMES = {
  XLK: 'Technology', XLC: 'Communication Services', XLF: 'Financials',
  XLV: 'Health Care', XLY: 'Consumer Discretionary', XLP: 'Consumer Staples',
  XLE: 'Energy', XLI: 'Industrials', XLU: 'Utilities (Power)',
  XLRE: 'Real Estate', XLB: 'Materials'
};

// A few liquid, well-known names per sector — surfaced as starting ideas
const SECTOR_EXAMPLES = {
  XLK: ['MSFT', 'NVDA', 'AVGO'], XLC: ['GOOGL', 'META', 'NFLX'],
  XLF: ['JPM', 'V', 'MA'],       XLV: ['LLY', 'UNH', 'JNJ'],
  XLY: ['AMZN', 'HD', 'MCD'],    XLP: ['WMT', 'PG', 'COST'],
  XLE: ['XOM', 'CVX', 'COP'],    XLI: ['GE', 'CAT', 'HON'],
  XLU: ['CEG', 'NEE', 'SO'],     XLRE: ['PLD', 'AMT', 'O'],
  XLB: ['LIN', 'SHW', 'FCX']
};

// Broad-market / multi-sector funds: they give baseline exposure to every
// sector, so they don't count as a *dedicated* tilt toward any one sector.
const BROAD_FUNDS = new Set([
  'VOO', 'VTI', 'SPY', 'IVV', 'SPLG', 'ITOT', 'SCHB', 'VV', 'MGC',
  'QQQ', 'QQQM', 'VT', 'VEA', 'VXUS', 'VTV', 'VYM', 'SCHD', 'DGRO', 'VIG', 'NOBL', 'DIA', 'IWM', 'VUG']);

// ─── HTTP helper ────────────────────────────────────────────────────────────

function makeRequest(urlString, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(urlString);
    const req = https.get({
      hostname: urlObj.hostname, port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json, */*', 'Accept-Language': 'en-US,en;q=0.9', ...extraHeaders },
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

// Yahoo's quoteSummary endpoint requires a crumb tied to a session cookie.
// Cached for the process lifetime and refreshed periodically.
let _yahooAuth = null;
function rawGet(urlString, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new url.URL(urlString);
    const req = https.get({
      hostname: urlObj.hostname, port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': USER_AGENT, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9', ...extraHeaders },
      maxHeaderSize: 32768
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
  });
}

async function getYahooCrumb() {
  if (_yahooAuth && Date.now() - _yahooAuth.ts < 30 * 60 * 1000) return _yahooAuth;
  // 1. Obtain a session cookie (fc.yahoo.com 404s but still sets the cookie)
  const cookieRes = await rawGet('https://fc.yahoo.com/');
  const cookie = (cookieRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Could not obtain Yahoo session cookie');
  // 2. Fetch a crumb bound to that cookie
  const crumbRes = await rawGet('https://query1.finance.yahoo.com/v1/test/getcrumb', { Cookie: cookie });
  const crumb = (crumbRes.body || '').trim();
  if (!crumb || crumb.includes('<')) throw new Error('Could not obtain Yahoo crumb');
  _yahooAuth = { cookie, crumb, ts: Date.now() };
  return _yahooAuth;
}

// Authenticated quoteSummary call. Retries once with a fresh crumb on auth failure.
async function fetchQuoteSummary(symbol, modules) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const auth = await getYahooCrumb();
    const u = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`
            + `?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const data = await makeRequest(u, { Cookie: auth.cookie });
    if (data.quoteSummary?.error?.code === 'Unauthorized') { _yahooAuth = null; continue; }
    return data;
  }
  throw new Error('Yahoo quoteSummary unauthorized');
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
  const c0 = ohlcv[ohlcv.length - 1];
  const c1 = ohlcv[ohlcv.length - 2];
  const c2 = ohlcv.length >= 3 ? ohlcv[ohlcv.length - 3] : null;
  const body0 = Math.abs(c0.close - c0.open);
  const range0 = c0.high - c0.low;
  if (range0 === 0) return null;
  const lowerWick0 = Math.min(c0.open, c0.close) - c0.low;
  const upperWick0 = c0.high - Math.max(c0.open, c0.close);

  if (body0 / range0 < 0.1) return 'doji';
  if (c0.close > c0.open && c1.close < c1.open &&
      c0.open < c1.close && c0.close > c1.open) return 'bullish_engulfing';
  if (c0.close < c0.open && c1.close > c1.open &&
      c0.open > c1.close && c0.close < c1.open) return 'bearish_engulfing';
  if (lowerWick0 > 2 * body0 && upperWick0 < body0 * 0.5 && c0.close > c0.open) return 'hammer';
  if (upperWick0 > 2 * body0 && lowerWick0 < body0 * 0.5 && c0.close < c0.open) return 'shooting_star';
  if (c2 && c2.close < c2.open && body0 > range0 * 0.5 && c0.close > c0.open &&
      c0.close > (c2.open + c2.close) / 2) return 'morning_star';
  if (c2 && c2.close > c2.open && body0 > range0 * 0.5 && c0.close < c0.open &&
      c0.close < (c2.open + c2.close) / 2) return 'evening_star';
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
async function fetchQuickChartData(symbol, range = '3mo') {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}&includePrePost=false`;
  const data = await makeRequest(chartUrl);
  if (!data.chart?.result?.length) return null;
  const quotes = data.chart.result[0].indicators.quote[0];
  const closes = (data.chart.result[0].timestamp || [])
    .map((_, i) => quotes.close[i])
    .filter(c => c != null);
  if (!closes.length) return null;
  const currentPrice = closes[closes.length - 1];
  const n = closes.length;
  const ma20  = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n);
  const ma50  = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, n);
  const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(200, n);
  const ret20 = n >= 21 ? (currentPrice - closes[n - 21]) / closes[n - 21] : 0;
  const ret60 = n >= 61 ? (currentPrice - closes[n - 61]) / closes[n - 61] : ret20;
  return { symbol, currentPrice, ma20, ma50, ma200, ret20, ret60, closes };
}

// Full chart data for the analyzed stock
async function fetchYahooChartData(symbol) {
  console.log(`📊 Fetching Yahoo Finance chart data for ${symbol}...`);
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&includePrePost=false`;
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

  // RSI historical percentile (how oversold vs own history)
  const closesChron = ohlcv.map(d => d.close); // chronological order for MACD/indicators
  const rsiHistory = [];
  for (let i = 28; i < closesChron.length; i++) {
    rsiHistory.push(calculateRSI(closesChron.slice(0, i + 1), 14));
  }
  const rsiPercentile = rsiHistory.length > 5
    ? Math.round(rsiHistory.filter(r => r <= rsi).length / rsiHistory.length * 100)
    : 50;

  // Order flow magnitude percentile (normalized by avg volume)
  const flowHistory = [];
  for (let i = 20; i <= ohlcv.length; i++) {
    const w = ohlcv.slice(i - 20, i);
    const wAvg = w.reduce((s, d) => s + d.volume, 0) / 20;
    if (wAvg === 0) continue;
    const buyV = w.filter(d => d.close > d.open).reduce((s, d) => s + d.volume, 0);
    const sellV = w.filter(d => d.close <= d.open).reduce((s, d) => s + d.volume, 0);
    flowHistory.push((buyV - sellV) / wAvg);
  }
  const currentNormFlow = avgVolume > 0 ? (totalBuyVolume - totalSellVolume) / avgVolume : 0;
  const flowPercentile = flowHistory.length > 5
    ? Math.round(flowHistory.filter(f => f <= currentNormFlow).length / flowHistory.length * 100)
    : 50;

  // 10-day return to detect recovery vs continued fall
  const ret10 = ohlcv.length >= 11
    ? (currentPrice - ohlcv[ohlcv.length - 11].close) / ohlcv[ohlcv.length - 11].close
    : 0;

  const macdData = calculateMACD(closesChron);
  const bbData = calculateBollingerBands(closesChron);
  const adxData = calculateADX(ohlcv);
  const obvData = calculateOBVTrend(ohlcv);
  const ret20 = ohlcv.length >= 21
    ? (currentPrice - ohlcv[ohlcv.length - 21].close) / ohlcv[ohlcv.length - 21].close
    : 0;
  const ret60 = ohlcv.length >= 61
    ? (currentPrice - ohlcv[ohlcv.length - 61].close) / ohlcv[ohlcv.length - 61].close
    : ret20;

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
    rsi: rsi.toFixed(2), rsiPercentile, flowPercentile,
    drawdownFromHigh: drawdownFromHigh.toFixed(2),
    candlestickPattern,
    nearestSupport: nearestSupport ? nearestSupport.toFixed(2) : null,
    streak, volConfirmScore, ret10, ret20, ret60,
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

async function fetchEarningsDate(symbol) {
  try {
    const data = await fetchQuoteSummary(symbol, 'calendarEvents');
    const raw = data.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate?.[0]?.raw;
    return raw ? new Date(raw * 1000) : null;
  } catch { return null; }
}

// Fetch S&P 500 total-return trailing returns to benchmark a fund against "the
// market". Annualized for 3Y+, cumulative for YTD/1Y. `asOfMs` anchors the
// windows to the fund's reporting date (Yahoo reports a fund's trailing returns
// as-of a fixed, often month-end date) so the periods line up fairly.
async function fetchBenchmarkReturns(symbol = '^SP500TR', asOfMs = null) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10y&includePrePost=false`;
  const data = await makeRequest(u);
  const r = data.chart?.result?.[0];
  if (!r) return null;
  const ts = r.timestamp || [];
  const adj = r.indicators?.adjclose?.[0]?.adjclose || r.indicators?.quote?.[0]?.close || [];
  const series = ts.map((t, i) => ({ t: t * 1000, c: adj[i] })).filter(p => p.c != null);
  if (series.length < 60) return null;

  // Anchor to the fund's as-of date (latest point at/before it), else the newest point.
  let anchor = series.length - 1;
  if (asOfMs) for (let i = 0; i < series.length; i++) { if (series[i].t <= asOfMs) anchor = i; else break; }
  const last = series[anchor];

  const closeYearsAgo = years => {
    const target = last.t - years * 365.25 * 864e5;
    let best = null;
    for (let i = 0; i <= anchor; i++) { if (series[i].t <= target) best = series[i].c; else break; }
    return best;
  };
  const cum = years => { const c0 = closeYearsAgo(years); return c0 ? +(((last.c / c0) - 1) * 100).toFixed(2) : null; };
  const ann = years => { const c0 = closeYearsAgo(years); return c0 ? +((Math.pow(last.c / c0, 1 / years) - 1) * 100).toFixed(2) : null; };

  // YTD: last close before Jan 1 of the anchor's year
  const jan1 = new Date(new Date(last.t).getFullYear(), 0, 1).getTime();
  let ytdBase = null;
  for (let i = 0; i <= anchor; i++) { if (series[i].t < jan1) ytdBase = series[i].c; else break; }
  const ytd = ytdBase ? +(((last.c / ytdBase) - 1) * 100).toFixed(2) : null;

  return { ytd, oneYear: cum(1), threeYear: ann(3), fiveYear: ann(5), tenYear: ann(10) };
}

// Compare a fund's trailing returns against benchmark returns, period by period.
// Pure function: returns per-period excess, plus a win count over comparable periods.
function buildBenchmarkComparison(performance, benchReturns, name, symbol) {
  if (!benchReturns) return null;
  const periods = ['ytd', 'oneYear', 'threeYear', 'fiveYear', 'tenYear'];
  const excess = {};
  let wins = 0, comparable = 0;
  for (const p of periods) {
    const f = performance?.[p], b = benchReturns[p];
    if (f != null && b != null) {
      excess[p] = +(f - b).toFixed(2);
      comparable++;
      if (f >= b) wins++;
    } else {
      excess[p] = null;
    }
  }
  return { name, symbol, returns: benchReturns, excess, wins, comparable };
}

// Classify a fund by asset class so return thresholds match the asset type
// (a 4%/yr bond fund is good; a 4%/yr equity fund is weak). Uses Morningstar-
// style category names first, then asset allocation as a fallback.
function classifyFund(fs) {
  const cat = (fs.category || '').toLowerCase();
  if (/money market/.test(cat)) return 'moneymarket';
  if (/bond|muni|treasury|fixed income|inflation.protected|ultrashort/.test(cat)) return 'bond';

  const aa = fs.assetAllocation || {};
  if (aa.stock != null || aa.bond != null || aa.cash != null) {
    const stock = aa.stock ?? 0, bond = aa.bond ?? 0, cash = aa.cash ?? 0;
    if (cash >= 60 && stock < 20 && bond < 20) return 'moneymarket';
    if (bond > stock && bond >= 50)            return 'bond';
    if (stock >= 60 && bond < 15)              return 'equity';
    if (stock > 0 && bond > 0)                 return 'allocation';
    if (stock >= 60)                           return 'equity';
  }
  return 'equity';
}

// Fund-quality score (0–100) derived from factsheet data. Standalone — does NOT
// feed the DCA score. Encodes the four pillars: cost, track record,
// diversification, and risk/size. Pure function so thresholds are easy to tune.
function scoreFundQuality(fs) {
  const comps = [];
  const fundClass = classifyFund(fs);

  // ── 1. Expense ratio (30) — the single biggest long-run predictor; lower is better
  const er = fs.expenseRatio;
  let erScore, erDetail;
  if (er == null)      { erScore = 15; erDetail = 'Expense ratio not reported'; }
  else if (er <= 0.05) { erScore = 30; erDetail = `${er}% — rock-bottom cost`; }
  else if (er <= 0.10) { erScore = 27; erDetail = `${er}% — very low cost`; }
  else if (er <= 0.20) { erScore = 23; erDetail = `${er}% — low cost`; }
  else if (er <= 0.50) { erScore = 15; erDetail = `${er}% — moderate cost`; }
  else if (er <= 1.00) { erScore = 7;  erDetail = `${er}% — high cost`; }
  else                 { erScore = 0;  erDetail = `${er}% — very high cost`; }
  comps.push({ label: 'Expense Ratio', score: erScore, max: 30, detail: erDetail });

  // ── 2. Track record (30) = longevity (15) + long-term annualized return (15)
  let years = null;
  if (fs.inceptionDate) years = (Date.now() - new Date(fs.inceptionDate).getTime()) / (365.25 * 864e5);
  let longevity, longNote;
  if (years == null)    { longevity = 7;  longNote = 'inception unknown'; }
  else if (years >= 15) { longevity = 15; longNote = `${years.toFixed(0)}y history`; }
  else if (years >= 10) { longevity = 12; longNote = `${years.toFixed(0)}y history`; }
  else if (years >= 5)  { longevity = 9;  longNote = `${years.toFixed(0)}y history`; }
  else if (years >= 3)  { longevity = 5;  longNote = `${years.toFixed(0)}y — limited`; }
  else                  { longevity = 2;  longNote = `${years.toFixed(1)}y — unproven`; }

  const ltRet = fs.performance?.tenYear ?? fs.performance?.fiveYear ?? null;
  const ltLbl = fs.performance?.tenYear != null ? '10Y' : '5Y';
  // Return bands [strong, solid, modest, breakeven] scaled to each asset class.
  // Bonds/money-market earn far less than equities, so their "strong" bar is lower.
  const RET_BANDS = {
    equity:      [12, 8, 5, 0],
    allocation:  [8, 5.5, 3, 0],
    bond:        [5, 3, 1.5, 0],
    moneymarket: [3, 1.5, 0.5, 0]
  };
  const [bStrong, bSolid, bModest, bBreak] = RET_BANDS[fundClass];
  let retScore, retNote;
  if (ltRet == null)          { retScore = 7;  retNote = 'no long-term return'; }
  else if (ltRet >= bStrong)  { retScore = 15; retNote = `${ltLbl} ${ltRet}%/yr — strong`; }
  else if (ltRet >= bSolid)   { retScore = 12; retNote = `${ltLbl} ${ltRet}%/yr — solid`; }
  else if (ltRet >= bModest)  { retScore = 8;  retNote = `${ltLbl} ${ltRet}%/yr — modest`; }
  else if (ltRet >= bBreak)   { retScore = 4;  retNote = `${ltLbl} ${ltRet}%/yr — weak`; }
  else                        { retScore = 0;  retNote = `${ltLbl} ${ltRet}%/yr — negative`; }
  comps.push({ label: 'Track Record', score: longevity + retScore, max: 30, detail: `${longNote}; ${retNote}` });

  // ── 3. Diversification (20) = top-10 concentration (12) + sector spread (8)
  const top10 = (fs.holdings || []).reduce((s, h) => s + (h.pct || 0), 0);
  let concScore, concNote;
  if (!fs.holdings?.length) { concScore = 6; concNote = 'holdings n/a'; }
  else if (top10 < 25) { concScore = 12; concNote = `top-10 ${top10.toFixed(0)}% — broad`; }
  else if (top10 < 40) { concScore = 9;  concNote = `top-10 ${top10.toFixed(0)}% — diversified`; }
  else if (top10 < 55) { concScore = 6;  concNote = `top-10 ${top10.toFixed(0)}% — concentrated`; }
  else if (top10 < 70) { concScore = 3;  concNote = `top-10 ${top10.toFixed(0)}% — very concentrated`; }
  else                 { concScore = 1;  concNote = `top-10 ${top10.toFixed(0)}% — top-heavy`; }

  const sectorCount = (fs.sectors || []).filter(s => s.pct >= 1).length;
  let secScore;
  if (!fs.sectors?.length)   secScore = 4;
  else if (sectorCount >= 9) secScore = 8;
  else if (sectorCount >= 6) secScore = 6;
  else if (sectorCount >= 4) secScore = 3;
  else                       secScore = 1;
  comps.push({ label: 'Diversification', score: concScore + secScore, max: 20, detail: `${concNote}; ${sectorCount || '—'} sectors ≥1%` });

  // ── 4. Risk & size (20) = 3Y beta (10) + AUM (10)
  const beta = fs.beta3Year;
  let betaScore, betaNote;
  if (beta == null)      { betaScore = 6;  betaNote = 'beta n/a'; }
  else if (beta <= 1.0)  { betaScore = 10; betaNote = `β ${beta} — market/defensive`; }
  else if (beta <= 1.15) { betaScore = 8;  betaNote = `β ${beta} — near market`; }
  else if (beta <= 1.3)  { betaScore = 5;  betaNote = `β ${beta} — elevated`; }
  else if (beta <= 1.6)  { betaScore = 2;  betaNote = `β ${beta} — high`; }
  else                   { betaScore = 0;  betaNote = `β ${beta} — very high`; }

  const aum = fs.totalAssets;
  let aumScore, aumNote;
  if (aum == null)       { aumScore = 5;  aumNote = 'AUM n/a'; }
  else if (aum >= 1e10)  { aumScore = 10; aumNote = 'AUM ≥$10B — established'; }
  else if (aum >= 1e9)   { aumScore = 8;  aumNote = 'AUM ≥$1B — solid'; }
  else if (aum >= 2.5e8) { aumScore = 6;  aumNote = 'AUM ≥$250M'; }
  else if (aum >= 5e7)   { aumScore = 3;  aumNote = 'AUM <$250M — small'; }
  else                   { aumScore = 1;  aumNote = 'AUM <$50M — closure risk'; }
  comps.push({ label: 'Risk & Size', score: betaScore + aumScore, max: 20, detail: `${betaNote}; ${aumNote}` });

  const total = comps.reduce((s, c) => s + c.score, 0);
  const grade   = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';
  const verdict = total >= 85 ? 'Excellent core holding'
                : total >= 70 ? 'Solid, well-built fund'
                : total >= 55 ? 'Decent — mind the trade-offs'
                : total >= 40 ? 'Mediocre — proceed with care'
                : 'Weak on the fundamentals';

  return { score: total, grade, verdict, assetClass: fundClass, components: comps };
}

// Fund factsheet (ETFs / mutual funds only). Returns null for ordinary stocks,
// which lets the UI auto-hide the tab.
async function fetchFundFactsheet(symbol) {
  try {
    const modules = 'fundProfile,topHoldings,fundPerformance,defaultKeyStatistics,quoteType';
    const data = await fetchQuoteSummary(symbol, modules);
    const r = data.quoteSummary?.result?.[0];
    if (!r) return null;

    // Auto-detect: only ETFs/funds carry a fund profile or holdings list.
    const isFund = !!(r.fundProfile || r.topHoldings?.holdings?.length || r.topHoldings?.sectorWeightings?.length);
    if (!isFund) return null;

    const num = v => (v && typeof v === 'object' && 'raw' in v) ? v.raw : (typeof v === 'number' ? v : null);
    const pct = v => { const n = num(v); return n != null ? +(n * 100).toFixed(2) : null; };

    const th = r.topHoldings || {};
    const holdings = (th.holdings || []).slice(0, 10).map(h => ({
      symbol: h.symbol || null,
      name: h.holdingName || null,
      pct: pct(h.holdingPercent)
    }));

    // sectorWeightings is an array of single-key objects, e.g. { technology: { raw } }
    const sectors = (th.sectorWeightings || [])
      .map(s => { const k = Object.keys(s)[0]; return k ? { sector: k, pct: pct(s[k]) } : null; })
      .filter(s => s && s.pct);

    const assetAllocation = {
      stock: pct(th.stockPosition),
      bond:  pct(th.bondPosition),
      cash:  pct(th.cashPosition),
      other: pct(th.otherPosition)
    };

    const tr = r.fundPerformance?.trailingReturns || {};
    const performance = {
      ytd:       pct(tr.ytd),
      oneYear:   pct(tr.oneYear),
      threeYear: pct(tr.threeYear),
      fiveYear:  pct(tr.fiveYear),
      tenYear:   pct(tr.tenYear)
    };
    const perfAsOfMs = num(tr.asOfDate) ? num(tr.asOfDate) * 1000 : null;

    const prof = r.fundProfile || {};
    const ks = r.defaultKeyStatistics || {};
    const inception = num(ks.fundInceptionDate);

    const out = {
      isFund: true,
      type: r.quoteType?.quoteType || prof.legalType || null,
      category: prof.categoryName || ks.category || null,
      family: prof.family || null,
      expenseRatio: pct(prof.feesExpensesInvestment?.annualReportExpenseRatio),
      yield: pct(ks.yield),
      beta3Year: num(ks.beta3Year) != null ? +num(ks.beta3Year).toFixed(2) : null,
      totalAssets: num(ks.totalAssets),
      inceptionDate: inception ? new Date(inception * 1000).toISOString().split('T')[0] : null,
      holdings,
      sectors,
      assetAllocation,
      performance
    };
    out.fundQuality = scoreFundQuality(out);

    // Benchmark the fund's returns against the S&P 500 (does it beat the market?).
    // Prefer the true total-return index; fall back to SPY if it's unavailable.
    let benchReturns = await fetchBenchmarkReturns('^SP500TR', perfAsOfMs).catch(() => null);
    let benchSym = '^SP500TR';
    if (!benchReturns) { benchReturns = await fetchBenchmarkReturns('SPY', perfAsOfMs).catch(() => null); benchSym = 'SPY'; }
    out.benchmark = buildBenchmarkComparison(out.performance, benchReturns, 'S&P 500', benchSym);

    return out;
  } catch { return null; }
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

  if (signals.rsi?.score === 2) bullish.push(`RSI historically oversold (${signals.rsi.value}) — the recent selloff appears overdone relative to this stock's own history`);
  else if (signals.rsi?.score === 0) bearish.push(`RSI historically overbought (${signals.rsi.value}) — extended relative to its own history`);

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

  if (signals.vix?.score === 2) bullish.push(`elevated market fear (VIX ${signals.vix.value}) — in the upper quartile of recent history, historically a good DCA window`);
  else if (signals.vix?.score === 0) bearish.push(`low market fear (VIX ${signals.vix.value}) — in the bottom quartile of recent history, suggesting complacency`);

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
  const [stockResult, spyResult, vixResult, sectorResult, fundResult, earningsResult, factsheetResult] = await Promise.allSettled([
    fetchYahooChartData(symbol),
    fetchQuickChartData('SPY', '1y'),
    fetchQuickChartData('^VIX', '1y'),
    sectorEtf ? fetchQuickChartData(sectorEtf) : Promise.resolve(null),
    options.yahooOnly ? Promise.resolve(null) : fetchAlphaVantageFundamentals(symbol),
    options.yahooOnly ? Promise.resolve(null) : fetchEarningsDate(symbol),
    options.yahooOnly ? Promise.resolve(null) : fetchFundFactsheet(symbol)
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
  const earningsDate = earningsResult?.status === 'fulfilled' ? earningsResult.value : null;
  const factsheetData = factsheetResult?.status === 'fulfilled' ? factsheetResult.value : null;

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

  // RSI (0–2): percentile-based — how oversold is this stock vs its own history?
  const rsi = parseFloat(d.rsi);
  const rsiPct = d.rsiPercentile ?? 50;
  let rsiScore = 0, rsiLabel = 'Neutral';
  if (!isNaN(rsi)) {
    if (rsiPct <= 15) { rsiScore = cp > d.ma50Raw ? 2 : 1; rsiLabel = `Historically Oversold (${rsiPct}th pct)`; }
    else if (rsiPct <= 40) { rsiScore = 1; rsiLabel = `Below-avg RSI (${rsiPct}th pct)`; }
    else if (rsiPct >= 85) { rsiScore = 0; rsiLabel = `Historically Overbought (${rsiPct}th pct)`; }
    else { rsiScore = 1; rsiLabel = `Neutral (${rsiPct}th pct)`; }
  }
  signals.rsi = { score: rsiScore, max: 2, label: rsiLabel, value: `${rsi.toFixed(1)} (${rsiPct}th pct)` };
  technicalScore += rsiScore;

  // POC proximity (0–2)
  const pocScore = distToPOC < 5 ? 2 : distToPOC < 10 ? 1 : 0;
  signals.poc = { score: pocScore, max: 2, label: distToPOC < 5 ? 'At POC' : distToPOC < 10 ? 'Near POC' : 'Far from POC', value: `${distToPOC.toFixed(1)}%` };
  technicalScore += pocScore;

  // Order flow (0–2): magnitude percentile — strong net buying vs own history
  const flowPct = d.flowPercentile ?? 50;
  const flowM = Math.round(Math.abs(d.orderFlowDelta) / 1e6);
  const flowScore = flowPct >= 70 ? 2 : flowPct >= 40 ? 1 : 0;
  const flowLabel = flowPct >= 70 ? `Strong Buying (${flowPct}th pct)` : flowPct >= 40 ? `Mild Buying (${flowPct}th pct)` : `Selling Pressure (${flowPct}th pct)`;
  signals.orderFlow = { score: flowScore, max: 2, label: flowLabel, value: `${d.orderFlowDelta > 0 ? '+' : '-'}${flowM}M` };
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

  // Candlestick pattern (0–2): bullish patterns score 2, neutral 1, bearish 0
  const bullishCandles = ['bullish_engulfing', 'hammer', 'morning_star'];
  const bearishCandles = ['bearish_engulfing', 'shooting_star', 'evening_star'];
  const candleScore = bullishCandles.includes(d.candlestickPattern) ? 2
                    : d.candlestickPattern === 'doji' ? 1 : 0;
  signals.candle = { score: candleScore, max: 2, label: d.candlestickPattern ? d.candlestickPattern.replace(/_/g, ' ') : 'No pattern', value: '' };
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

  // VIX fear gauge (0–2): percentile-based — high fear relative to recent history = DCA opportunity
  let vixScore = 0, vixLabel = 'Unknown';
  const vixLevel = vixData?.currentPrice;
  const vixCloses = vixData?.closes || [];
  const vixPercentile = vixLevel && vixCloses.length > 20
    ? Math.round(vixCloses.filter(v => v <= vixLevel).length / vixCloses.length * 100)
    : 50;
  if (vixLevel) {
    if (vixPercentile >= 75) { vixScore = 2; vixLabel = `High Fear — ${vixPercentile}th pct (opportunity)`; }
    else if (vixPercentile >= 45) { vixScore = 1; vixLabel = `Elevated — ${vixPercentile}th pct`; }
    else { vixScore = 0; vixLabel = `Low Fear — ${vixPercentile}th pct (complacent)`; }
  }
  signals.vix = { score: vixScore, max: 2, label: vixLabel, value: vixLevel ? vixLevel.toFixed(1) : 'N/A' };
  marketContextScore += vixScore;

  // Sector relative strength (0–2): avg of 20-day and 60-day outperformance
  let sectorScore = 0, sectorLabel = 'No sector data';
  if (sectorData) {
    const diff20 = d.ret20 - sectorData.ret20;
    const diff60 = (d.ret60 || d.ret20) - (sectorData.ret60 || sectorData.ret20);
    const avgDiff = (diff20 + diff60) / 2;
    if (avgDiff > 0.02) { sectorScore = 2; sectorLabel = `Outperforming ${sectorEtf} (20d & 60d)`; }
    else if (avgDiff > -0.02) { sectorScore = 1; sectorLabel = `In-line with ${sectorEtf}`; }
    else { sectorScore = 0; sectorLabel = `Underperforming ${sectorEtf} (20d & 60d)`; }
  }
  signals.sectorStrength = {
    score: sectorScore, max: 2, label: sectorLabel,
    value: sectorData ? `20d: ${(d.ret20*100).toFixed(1)}% vs ${(sectorData.ret20*100).toFixed(1)}%` : 'N/A'
  };
  marketContextScore += sectorScore;

  // ── 3. PRICE ACTION SCORE (0–6) ───────────────────────────────────────────

  let priceActionScore = 0;

  // 52W position (0–2): lower range is better; reward recovery (uptrend from low), penalize continued fall
  const recovering = (d.ret10 || 0) > 0.01;
  const pos52Score = position52 < 0.33
    ? (recovering ? 2 : 1)     // Low range: recovering = 2, still falling = 1
    : position52 < 0.66
      ? (recovering ? 1 : 0)   // Mid range: recovering = 1, falling = 0
      : 0;                       // High range: always 0
  const pos52Label = position52 < 0.33
    ? (recovering ? 'Near Low + Recovering' : 'Near Low — Still Falling')
    : position52 < 0.66 ? 'Mid Range' : 'Near 52W High';
  signals.position52 = { score: pos52Score, max: 2, label: pos52Label, value: `${(position52*100).toFixed(0)}% of range` };
  priceActionScore += pos52Score;

  // Drawdown from 52-week high (0–2): deeper discount = more DCA value
  const drawdown = parseFloat(d.drawdownFromHigh);
  const drawdownScore = drawdown > 30 ? 2 : drawdown > 15 ? 1 : 0;
  signals.drawdown = { score: drawdownScore, max: 2, label: `${drawdown.toFixed(1)}% off 52W high`, value: `$${d.high52Week?.toFixed(2)} → $${cp?.toFixed(2)}` };
  priceActionScore += drawdownScore;

  // Support proximity (0–2): swing-low support OR MA200 acting as dynamic support
  let supportScore = 0, supportLabel = 'No clear support', bestSupportPrice = null;
  const supportCandidates = [];
  if (d.nearestSupport) supportCandidates.push({ price: parseFloat(d.nearestSupport), type: 'swing low' });
  if (d.ma200Raw && cp > d.ma200Raw) supportCandidates.push({ price: d.ma200Raw, type: 'MA200' });
  if (supportCandidates.length) {
    const best = supportCandidates.reduce((a, b) => Math.abs(cp - a.price) <= Math.abs(cp - b.price) ? a : b);
    const dist = Math.abs(cp - best.price) / cp * 100;
    bestSupportPrice = best.price;
    if (dist < 3) { supportScore = 2; supportLabel = `At ${best.type} support`; }
    else if (dist < 7) { supportScore = 1; supportLabel = `Near ${best.type} support`; }
    else { supportScore = 0; supportLabel = `Far from support`; }
  }
  signals.support = { score: supportScore, max: 2, label: supportLabel, value: bestSupportPrice ? `$${bestSupportPrice.toFixed(2)}` : 'N/A' };
  priceActionScore += supportScore;

  // ── 4. FUNDAMENTAL SCORE (0–8, if available) ──────────────────────────────

  let fundamentalScore = 0, fundamentalMax = 0;
  if (fundamentalData) {
    fundamentalMax = 9; // 8 base + 1 forward PE bonus
    // P/E: sector-relative (vs fixed threshold)
    const sectorPeMedian = SECTOR_PE_MEDIAN[sectorEtf] || 20;
    if (d.pe) {
      const peRatio = d.pe / sectorPeMedian;
      fundamentalScore += peRatio < 0.8 ? 2 : peRatio < 1.1 ? 1 : 0;
    }
    if (d.roe) fundamentalScore += d.roe > 0.15 ? 2 : d.roe > 0.08 ? 1 : 0;
    if (d.profitMargin) fundamentalScore += d.profitMargin > 0.20 ? 2 : d.profitMargin > 0.10 ? 1 : 0;
    if (d.revenueGrowthYOY != null) fundamentalScore += d.revenueGrowthYOY > 0.10 ? 2 : d.revenueGrowthYOY > 0 ? 1 : 0;
    // Forward P/E bonus: if forward P/E < trailing P/E, earnings expected to grow
    if (d.forwardPE && d.pe && d.forwardPE < d.pe * 0.95) fundamentalScore += 1;
    fundamentalScore = Math.min(fundamentalScore, fundamentalMax);
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
  if (d.ma50Raw && cp < d.ma50Raw && d.ma200Raw && cp < d.ma200Raw) {
    riskModifier *= 0.86; // confirmed downtrend on both timeframes — backtest showed this is the danger zone
    riskFlags.push(`Below MA50 & MA200 — confirmed downtrend on both timeframes`);
  } else if (d.ma200Raw && cp < d.ma200Raw) {
    riskModifier *= 0.93;
    riskFlags.push(`Below MA200 ($${d.ma200}) — long-term downtrend`);
  }
  if (d.candlestickPattern === 'bearish_engulfing') {
    riskModifier *= 0.95;
    riskFlags.push('Bearish engulfing candle — reversal signal');
  }
  if (d.candlestickPattern === 'shooting_star' || d.candlestickPattern === 'evening_star') {
    riskModifier *= 0.95;
    riskFlags.push(`${d.candlestickPattern.replace(/_/g, ' ')} candle — potential bearish reversal`);
  }
  if (earningsDate) {
    const daysToEarnings = Math.round((earningsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToEarnings >= 0 && daysToEarnings <= 7) {
      riskModifier *= 0.85;
      riskFlags.push(`Earnings in ${daysToEarnings} day${daysToEarnings === 1 ? '' : 's'} — high binary risk, consider waiting`);
    } else if (daysToEarnings > 7 && daysToEarnings <= 14) {
      riskModifier *= 0.93;
      riskFlags.push(`Earnings in ${daysToEarnings} days — elevated uncertainty`);
    }
  }

  // ── 6. FINAL SCORE + RECOMMENDATION ──────────────────────────────────────

  // Regime-adaptive axis weights: bear market → entry matters more; bull market → quality matters more
  let AXIS_WEIGHT_ENTRY, AXIS_WEIGHT_QUALITY;
  if (spyData && spyData.ma200 && spyData.currentPrice < spyData.ma200) {
    AXIS_WEIGHT_ENTRY = 0.65; AXIS_WEIGHT_QUALITY = 0.35; // Bear: buy cheap, quality less predictive
  } else if (spyData && spyData.currentPrice > spyData.ma50) {
    AXIS_WEIGHT_ENTRY = 0.40; AXIS_WEIGHT_QUALITY = 0.60; // Bull: momentum & quality lead
  } else {
    AXIS_WEIGHT_ENTRY = 0.50; AXIS_WEIGHT_QUALITY = 0.50; // Transitional
  }
  // Regime-adaptive tier thresholds: bull markets inflate quality signals, so raise the bar for "mid-entry"
  let TIER_HI, TIER_LO;
  if (spyData && spyData.ma200 && spyData.currentPrice < spyData.ma200) {
    TIER_HI = 54; TIER_LO = 38; // Bear: dips are genuine opportunities, lower bar to act
  } else if (spyData && spyData.currentPrice > spyData.ma50) {
    TIER_HI = 62; TIER_LO = 46; // Bull: quality signals inflate, require a real pullback to count as mid-entry
  } else {
    TIER_HI = 58; TIER_LO = 42; // Transitional: baseline
  }

  // Entry axis (max 16): timing / valuation signals
  const entryMax = 16;
  const entryRaw = signals.rsi.score + signals.poc.score + signals.bollingerBands.score
                 + signals.position52.score + signals.drawdown.score + signals.support.score
                 + signals.vix.score + signals.candle.score;
  const entryScore = Math.min(100, Math.max(0, Math.round(entryRaw / entryMax * 100)));

  // Quality axis (max 16 without fundamentals, 24 with)
  const qualityMax = 16 + fundamentalMax;
  const qualityRaw = signals.orderFlow.score + signals.maTrend.score + signals.volumeConfirm.score
                   + signals.macd.score + signals.adx.score + signals.obv.score
                   + signals.spyRegime.score + signals.sectorStrength.score + fundamentalScore;
  const qualityScore = Math.min(100, Math.max(0, Math.round((qualityRaw / qualityMax * 100) * riskModifier)));

  const blendedScore = Math.min(100, Math.max(0, Math.round(AXIS_WEIGHT_ENTRY * entryScore + AXIS_WEIGHT_QUALITY * qualityScore)));

  // Tier each axis
  const tier = s => s >= TIER_HI ? 'high' : s >= TIER_LO ? 'mid' : 'low';
  const entryTier   = tier(entryScore);
  const qualityTier = tier(qualityScore);

  // 3x3 quadrant lookup
  const QUADRANT = {
    high: {
      high: { recommendation: '✅ STRONG BUY',        allocationPct: 100, insight: 'Quality on sale' },
      mid:  { recommendation: '👍 BUY',               allocationPct: 75,  insight: 'On sale, solid quality' },
      low:  { recommendation: '⚠️ CAUTION',           allocationPct: 25,  insight: 'Cheap but weak — value-trap risk' }
    },
    mid: {
      high: { recommendation: '👍 BUY',               allocationPct: 75,  insight: 'Quality at a fair price' },
      mid:  { recommendation: '⚖️ HOLD',              allocationPct: 50,  insight: 'Neutral DCA' },
      low:  { recommendation: '⏸️ WAIT',              allocationPct: 25,  insight: 'Weak; only a fair price' }
    },
    low: {
      high: { recommendation: '⏳ ACCUMULATE SLOWLY', allocationPct: 50,  insight: 'Quality but expensive' },
      mid:  { recommendation: '⏸️ WAIT',              allocationPct: 25,  insight: 'Pricey, average quality' },
      low:  { recommendation: '⛔ AVOID',             allocationPct: 0,   insight: 'Expensive & weak' }
    }
  };

  const q = QUADRANT[entryTier][qualityTier];
  const recommendation = q.recommendation;
  let allocationPct  = q.allocationPct;
  const dcaScore       = blendedScore;

  // Quality gate: ACCUMULATE with borderline quality (58–69) is worse than WAIT per backtest.
  // Only deploy full 50% when quality is genuinely strong (≥70).
  if (recommendation.includes('ACCUMULATE') && qualityScore < 70) {
    allocationPct = 25;
  }

  // Portfolio weight cap: if this position is already concentrated, reduce new deployment
  const portfolioWeight = parseFloat(options.portfolioWeight) || 0;
  if (portfolioWeight > 30 && allocationPct > 25) {
    allocationPct = 25;
    riskFlags.push(`Position already ${portfolioWeight.toFixed(0)}% of portfolio — allocation capped to avoid over-concentration`);
  } else if (portfolioWeight > 20 && allocationPct > 50) {
    allocationPct = 50;
    riskFlags.push(`Position at ${portfolioWeight.toFixed(0)}% of portfolio — allocation reduced to manage concentration`);
  }

  // Legacy ratios kept for scoreBreakdown (UI reads these)
  const techRatio  = technicalScore / 20;
  const mktRatio   = marketContextScore / 6;
  const priceRatio = priceActionScore / 6;

  const marketForExplanation = {
    currentPrice: cp?.toFixed(2),
    high52Week: d.high52Week?.toFixed(2),
    low52Week: d.low52Week?.toFixed(2),
    position: (position52 * 100).toFixed(0),
    drawdownFromHigh: parseFloat(d.drawdownFromHigh)
  };

  const axisPrefix = `Entry ${entryScore}/100 · Business & Trend Quality ${qualityScore}/100 — ${q.insight}. `;
  const explanation = axisPrefix + generateExplanation(
    symbol.toUpperCase(), recommendation, String(dcaScore), allocationPct,
    signals, null, marketForExplanation, riskFlags, fundamentalData
  );

  return {
    symbol: symbol.toUpperCase(),
    analysis: {
      dcaScore,
      recommendation,
      allocationPct,
      entryScore,
      qualityScore,
      blendedScore,
      quadrant: { entryTier, qualityTier, label: q.insight },
      axes: {
        entry:   { score: entryRaw,   max: entryMax,   pct: entryScore },
        quality: { score: qualityRaw, max: qualityMax, pct: qualityScore }
      },
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
      streak: d.streak,
      ret10: d.ret10
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
    factsheet: factsheetData,
    chartData: d.chartData || null,
    errors: errors.length ? errors : null
  };
}

// ─── Scan Helpers ─────────────────────────────────────────────────────────────

function extractScanEntry(result) {
  return {
    symbol: result.symbol,
    dcaScore: parseFloat(result.analysis.dcaScore),
    entryScore: result.analysis.entryScore,
    qualityScore: result.analysis.qualityScore,
    quadrant: result.analysis.quadrant?.label ?? null,
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

// ─── Sector rotation snapshot ──────────────────────────────────────────────────

// Fetches SPY + the 11 sector ETFs and ranks each sector by trend (vs its 50/200-day
// MAs) and relative strength vs SPY, so the UI can show what's leading vs lagging now.
async function analyzeSectors(holdings = []) {
  const etfs = Object.keys(SECTOR_NAMES);
  const settled = await Promise.allSettled([
    fetchQuickChartData('SPY', '1y'),
    ...etfs.map(e => fetchQuickChartData(e, '1y'))
  ]);
  const spy = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const spyRet20 = spy?.ret20 ?? 0;
  const spyRet60 = spy?.ret60 ?? 0;
  const spyRegime = !spy ? 'Unknown'
    : spy.currentPrice > spy.ma50
      ? (spy.currentPrice > spy.ma200 ? 'Bull market' : 'Recovering')
      : (spy.currentPrice > spy.ma200 ? 'Choppy / pullback' : 'Bear market');

  const sectors = [];
  for (let i = 0; i < etfs.length; i++) {
    const r = settled[i + 1];
    if (r.status !== 'fulfilled' || !r.value) continue;
    const d = r.value;
    const aboveMA50 = d.currentPrice > d.ma50;
    const aboveMA200 = d.currentPrice > d.ma200;
    const rs20 = (d.ret20 - spyRet20) * 100;                       // pts vs SPY, 20d
    const rs60 = ((d.ret60 ?? d.ret20) - spyRet60) * 100;          // pts vs SPY, 60d
    const rs = +((rs20 + rs60) / 2).toFixed(1);

    let score = 0;
    score += aboveMA50 ? 2 : 0;
    score += aboveMA200 ? 2 : 0;
    score += d.ret20 > 0 ? 1 : 0;
    score += (d.ret60 ?? 0) > 0 ? 1 : 0;
    score += rs > 1 ? 2 : rs > -1 ? 1 : 0;

    let status;
    if (aboveMA50 && aboveMA200 && rs > 1) status = 'Leading';
    else if (aboveMA50 && rs > -1)         status = 'Bullish';
    else if (!aboveMA50 && !aboveMA200 && rs < -1) status = 'Lagging';
    else if (!aboveMA200)                  status = 'Caution';
    else                                   status = 'Neutral';

    sectors.push({
      etf: etfs[i], name: SECTOR_NAMES[etfs[i]],
      price: +d.currentPrice.toFixed(2),
      aboveMA50, aboveMA200,
      ret20: +(d.ret20 * 100).toFixed(1),
      ret60: +((d.ret60 ?? d.ret20) * 100).toFixed(1),
      relStrength: rs, score, status,
      examples: SECTOR_EXAMPLES[etfs[i]] || []
    });
  }
  sectors.sort((a, b) => b.score - a.score || b.relStrength - a.relStrength);

  // Map the user's holdings to sectors so the UI can spot dedicated-exposure gaps.
  // Broad funds count as baseline-everything, not a tilt; sector ETFs and individual
  // stocks count as dedicated exposure to their sector.
  const coverage = {};   // etf -> [symbols held in that sector]
  const broad = [], unmapped = [];
  for (const raw of holdings) {
    const sym = String(raw).toUpperCase().trim();
    if (!sym) continue;
    if (SECTOR_NAMES[sym]) { (coverage[sym] = coverage[sym] || []).push(sym); }      // holds the sector ETF itself
    else if (SECTOR_ETF[sym]) { const e = SECTOR_ETF[sym]; (coverage[e] = coverage[e] || []).push(sym); }
    else if (BROAD_FUNDS.has(sym)) broad.push(sym);
    else unmapped.push(sym);
  }

  return {
    spyRegime, spyPrice: spy ? +spy.currentPrice.toFixed(2) : null,
    asOf: new Date().toISOString(), sectors,
    coverage, broad, unmapped
  };
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
      const portfolioWeight = parsedUrl.query.portfolioWeight ? parseFloat(parsedUrl.query.portfolioWeight) : null;
      const result = await analyzeDCA(parsedUrl.query.symbol, { portfolioWeight });
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (parsedUrl.pathname === '/api/sectors' && req.method === 'GET') {
    try {
      const holdings = (parsedUrl.query.holdings || '')
        .split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
      const data = await analyzeSectors(holdings);
      res.writeHead(200);
      res.end(JSON.stringify(data, null, 2));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (parsedUrl.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', version: '3.0.0' }));
  } else if (parsedUrl.pathname === '/') {
    fs.readFile(path.join(__dirname, 'dca-assistant.html'), 'utf8', (err, html) => {
      if (err) {
        res.writeHead(200);
        res.end(JSON.stringify({ name: 'DCA Assistant API', version: '3.0.0', note: 'UI file not found.' }));
      } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200);
        res.end(html);
      }
    });
  } else if (parsedUrl.pathname === '/api' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'DCA Assistant API', version: '3.0.0',
      note: 'Technical data from Yahoo Finance (no key needed). Fundamental data requires ALPHA_VANTAGE_KEY.',
      endpoints: { analyze: '/api/analyze?symbol=AAPL', compare: '/api/compare?symbols=AAPL,MSFT,TSLA', scan: '/api/scan (POST {"symbols":[...]})', health: '/health' }
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
  } else if (parsedUrl.pathname === '/api/compare') {
    try {
      const raw = parsedUrl.query.symbols;
      if (!raw || !raw.trim()) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing symbols parameter. Example: /api/compare?symbols=AAPL,MSFT,TSLA' }));
        return;
      }
      const symbols = [...new Set(
        raw.split(',')
          .map(s => String(s).toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10))
          .filter(Boolean)
      )].slice(0, 10);
      if (symbols.length === 0) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No valid symbols provided.' }));
        return;
      }
      const settled = await Promise.allSettled(symbols.map(s => analyzeDCA(s)));
      const ranked = [];
      const errors = [];
      for (let i = 0; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === 'fulfilled') {
          ranked.push(extractScanEntry(r.value));
        } else {
          errors.push({ symbol: symbols[i], error: r.reason?.message || 'Failed' });
        }
      }
      ranked.sort((a, b) => b.dcaScore - a.dcaScore);
      res.writeHead(200);
      res.end(JSON.stringify({ count: ranked.length, ranked, errors: errors.length ? errors : null }, null, 2));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (parsedUrl.pathname === '/api/portfolio' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(readPortfolio()));
  } else if (parsedUrl.pathname === '/api/portfolio' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(portfolioDataPath, JSON.stringify(data, null, 2));
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (parsedUrl.pathname === '/api/portfolio/history' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(readPortfolioHistory()));
  } else if (parsedUrl.pathname === '/api/portfolio/snapshot' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const snapshot = JSON.parse(body);
        const history = readPortfolioHistory();
        const today = snapshot.date.slice(0, 10);
        const idx = history.findIndex(s => s.date.slice(0, 10) === today);
        if (idx >= 0) history[idx] = snapshot;
        else history.push(snapshot);
        history.sort((a, b) => a.date < b.date ? -1 : 1);
        fs.writeFileSync(portfolioHistoryPath, JSON.stringify(history, null, 2));
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
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

module.exports = { analyzeDCA, fetchYahooChartData, fetchAlphaVantageFundamentals, fetchFundFactsheet, scoreFundQuality, classifyFund, fetchBenchmarkReturns, buildBenchmarkComparison, analyzeSectors };
