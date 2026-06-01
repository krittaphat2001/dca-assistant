/**
 * backtest.js — DCA Scoring Engine Historical Backtest
 *
 * Fetches 2Y of daily OHLCV data for each portfolio stock + SPY + VIX,
 * simulates the scoring engine at each weekly interval (no look-ahead),
 * and measures actual forward returns at 30 / 60 / 90 trading days.
 *
 * Skips: Alpha Vantage fundamentals (no historical API), earnings dates.
 * Includes: all technical, market context, and price action signals.
 *
 * Usage: node backtest.js
 */

const https = require('https');
const url   = require('url');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SYMBOLS   = ['QQQ', 'VOO', 'MSFT', 'RBRK', 'SCHD', 'O', 'NVDA', 'GOOGL'];
const EVAL_STEP = 5;   // evaluate every 5 trading days (≈ weekly)
const WARMUP    = 252; // days of history needed before first eval (RSI percentile window)
const FWD_DAYS  = [21, 42, 63]; // forward-return horizons (≈ 1mo, 2mo, 3mo in trading days)

// ── HTTP helper ───────────────────────────────────────────────────────────────

function makeRequest(urlString) {
  return new Promise((resolve, reject) => {
    const u = new url.URL(urlString);
    const req = https.get({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      maxHeaderSize: 32768
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
      });
    });
    req.setTimeout(20000, () => req.destroy(new Error('Timeout')));
    req.on('error', reject);
  });
}

// ── Fetch 2Y daily OHLCV ─────────────────────────────────────────────────────

async function fetchHistory(symbol) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 5 * 365 * 24 * 3600;
  const encoded = symbol.startsWith('^') ? encodeURIComponent(symbol) : symbol;
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
  const data = await makeRequest(u);
  if (!data.chart?.result?.length) throw new Error(`No data for ${symbol}`);
  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];
  const bars = (result.timestamp || [])
    .map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   quotes.open[i],
      high:   quotes.high[i],
      low:    quotes.low[i],
      close:  quotes.close[i],
      volume: quotes.volume[i]
    }))
    .filter(d => d.close != null && d.volume != null);
  if (bars.length < WARMUP + Math.max(...FWD_DAYS) + 10)
    throw new Error(`${symbol}: not enough history (${bars.length} bars)`);
  return bars;
}

// ── Indicators (only using slice up to index i — no look-ahead) ───────────────

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const ch = closes.slice(1).map((p, i) => p - closes[i]);
  let g = 0, l = 0;
  for (let i = 0; i < period; i++) { if (ch[i] > 0) g += ch[i]; else l += Math.abs(ch[i]); }
  g /= period; l /= period;
  for (let i = period; i < ch.length; i++) {
    g = (g * (period - 1) + Math.max(0, ch[i])) / period;
    l = (l * (period - 1) + Math.max(0, -ch[i])) / period;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function ma(arr, n) {
  const s = arr.slice(-n);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

function emaSeq(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const res = [];
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  res.push(e);
  for (let i = period; i < values.length; i++) { e = values[i] * k + e * (1 - k); res.push(e); }
  return res;
}

function macd(closes) {
  const e12 = emaSeq(closes, 12), e26 = emaSeq(closes, 26);
  if (e12.length < 15 || e26.length < 2) return null;
  const line = e26.map((v, i) => e12[i + 14] - v);
  const sig  = emaSeq(line, 9);
  if (!sig.length) return null;
  const m = line[line.length - 1], s = sig[sig.length - 1];
  const prevH = sig.length >= 2 ? line[line.length - 2] - sig[sig.length - 2] : 0;
  const h = m - s;
  return { macd: m, signal: s, histogram: h, expanding: h > 0 && Math.abs(h) > Math.abs(prevH) };
}

function bollingerBands(closes, period = 20) {
  if (closes.length < period) return null;
  const r = closes.slice(-period);
  const m_ = r.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(r.reduce((s, c) => s + (c - m_) ** 2, 0) / period);
  return { upper: m_ + 2 * std, middle: m_, lower: m_ - 2 * std };
}

function adx(bars, period = 14) {
  if (bars.length < period * 2 + 1) return null;
  const b = bars.slice(-(period * 3 + 1));
  const tr = [], pDM = [], mDM = [];
  for (let i = 1; i < b.length; i++) {
    const { high, low } = b[i], pc = b[i-1].close;
    tr.push(Math.max(high - low, Math.abs(high - pc), Math.abs(low - pc)));
    const up = high - b[i-1].high, dn = b[i-1].low - low;
    pDM.push(up > dn && up > 0 ? up : 0);
    mDM.push(dn > up && dn > 0 ? dn : 0);
  }
  if (tr.length < period) return null;
  let sTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let sPDM = pDM.slice(0, period).reduce((a, b) => a + b, 0);
  let sMDM = mDM.slice(0, period).reduce((a, b) => a + b, 0);
  const dxArr = []; let latestP = 0, latestM = 0;
  for (let i = period; i < tr.length; i++) {
    sTR = sTR - sTR / period + tr[i];
    sPDM = sPDM - sPDM / period + pDM[i];
    sMDM = sMDM - sMDM / period + mDM[i];
    if (sTR === 0) continue;
    latestP = sPDM / sTR * 100; latestM = sMDM / sTR * 100;
    const s = latestP + latestM;
    if (s > 0) dxArr.push(Math.abs(latestP - latestM) / s * 100);
  }
  if (dxArr.length < period) return null;
  const adxVal = dxArr.slice(-period).reduce((a, b) => a + b, 0) / period;
  return { adx: adxVal, plusDI: latestP, minusDI: latestM };
}

function obvTrend(bars) {
  if (bars.length < 21) return null;
  const b = bars.slice(-21);
  let obv = 0; const arr = [0];
  for (let i = 1; i < b.length; i++) {
    if (b[i].close > b[i-1].close) obv += b[i].volume;
    else if (b[i].close < b[i-1].close) obv -= b[i].volume;
    arr.push(obv);
  }
  const latest = arr[arr.length - 1], mid = arr[Math.floor(arr.length / 2)], earliest = arr[0];
  return { trendUp: latest > earliest, strongUp: latest > mid && mid > earliest };
}

function candlestick(bars) {
  if (bars.length < 2) return null;
  const c0 = bars[bars.length - 1], c1 = bars[bars.length - 2];
  const c2 = bars.length >= 3 ? bars[bars.length - 3] : null;
  const body0 = Math.abs(c0.close - c0.open), range0 = c0.high - c0.low;
  if (range0 === 0) return null;
  const lo0 = Math.min(c0.open, c0.close) - c0.low;
  const hi0 = c0.high - Math.max(c0.open, c0.close);
  if (body0 / range0 < 0.1) return 'doji';
  if (c0.close > c0.open && c1.close < c1.open && c0.open < c1.close && c0.close > c1.open) return 'bullish_engulfing';
  if (c0.close < c0.open && c1.close > c1.open && c0.open > c1.close && c0.close < c1.open) return 'bearish_engulfing';
  if (lo0 > 2 * body0 && hi0 < body0 * 0.5 && c0.close > c0.open) return 'hammer';
  if (hi0 > 2 * body0 && lo0 < body0 * 0.5 && c0.close < c0.open) return 'shooting_star';
  if (c2 && c2.close < c2.open && body0 > range0 * 0.5 && c0.close > c0.open && c0.close > (c2.open + c2.close) / 2) return 'morning_star';
  if (c2 && c2.close > c2.open && body0 > range0 * 0.5 && c0.close < c0.open && c0.close < (c2.open + c2.close) / 2) return 'evening_star';
  return null;
}

function swingLowSupport(bars, cp) {
  if (bars.length < 5) return null;
  const lows = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const lo = bars[i].low;
    if (lo < bars[i-1].low && lo < bars[i-2].low && lo < bars[i+1].low && lo < bars[i+2].low) lows.push(lo);
  }
  const below = lows.filter(l => l <= cp);
  return below.length ? Math.max(...below) : null;
}

// ── Score a single point in history (index i = current day, data[0..i]) ────────

function scorePoint(bars, spyBars, vixBars) {
  const cp = bars[bars.length - 1].close;
  const closes = bars.map(d => d.close);
  const n = closes.length;

  // MAs
  const ma20v  = ma(closes, Math.min(20, n));
  const ma50v  = ma(closes, Math.min(50, n));
  const ma200v = ma(closes, Math.min(200, n));

  // RSI + percentile (within this window)
  const rsiNow = rsi(closes, 14);
  const rsiHist = [];
  for (let i = 28; i < n; i++) rsiHist.push(rsi(closes.slice(0, i + 1), 14));
  const rsiPct = rsiHist.length > 5 ? Math.round(rsiHist.filter(r => r <= rsiNow).length / rsiHist.length * 100) : 50;

  // Order flow
  const last20 = bars.slice(-20);
  let buyVol = 0, sellVol = 0;
  for (const d of last20) { if (d.close > d.open) buyVol += d.volume; else sellVol += d.volume; }
  const avgVol = last20.reduce((s, d) => s + d.volume, 0) / last20.length;
  const flowNow = avgVol > 0 ? (buyVol - sellVol) / avgVol : 0;
  const flowHist = [];
  for (let i = 20; i <= n; i++) {
    const w = bars.slice(i - 20, i);
    const wAvg = w.reduce((s, d) => s + d.volume, 0) / 20;
    if (wAvg === 0) continue;
    const bv = w.filter(d => d.close > d.open).reduce((s, d) => s + d.volume, 0);
    const sv = w.filter(d => d.close <= d.open).reduce((s, d) => s + d.volume, 0);
    flowHist.push((bv - sv) / wAvg);
  }
  const flowPct = flowHist.length > 5 ? Math.round(flowHist.filter(f => f <= flowNow).length / flowHist.length * 100) : 50;

  // 52W range
  const yr = bars.slice(-Math.min(252, n));
  const high52 = Math.max(...yr.map(d => d.high));
  const low52  = Math.min(...yr.map(d => d.low));
  const range52 = high52 - low52;
  const pos52   = range52 > 0 ? (cp - low52) / range52 : 0.5;
  const drawdown = (high52 - cp) / high52 * 100;

  // POC (last 20 days)
  const pocBar = [...last20].sort((a, b) => b.volume - a.volume)[0];
  const distToPOC = pocBar ? Math.abs(cp - pocBar.close) / cp * 100 : 99;

  // Candle, volume confirm
  const pat = candlestick(bars.slice(-3));
  const upVol10 = bars.slice(-10).filter(d => d.close >= d.open).reduce((s, d) => s + d.volume, 0);
  const tot10   = bars.slice(-10).reduce((s, d) => s + d.volume, 0);
  const volConf = tot10 > 0 ? (upVol10 / tot10 > 0.65 ? 2 : upVol10 / tot10 > 0.50 ? 1 : 0) : 0;

  // 10-day return (for recovery detection)
  const ret10 = n >= 11 ? (cp - bars[n - 11].close) / bars[n - 11].close : 0;
  const ret20 = n >= 21 ? (cp - bars[n - 21].close) / bars[n - 21].close : 0;
  const ret60 = n >= 61 ? (cp - bars[n - 61].close) / bars[n - 61].close : ret20;

  // MACD, BB, ADX, OBV
  const macdD = macd(closes);
  const bbD   = bollingerBands(closes);
  const adxD  = adx(bars);
  const obvD  = obvTrend(bars);

  // Support
  const swingSupp = swingLowSupport(bars, cp);
  const suppCands = [];
  if (swingSupp) suppCands.push({ price: swingSupp });
  if (cp > ma200v) suppCands.push({ price: ma200v });
  let supportScore = 0;
  if (suppCands.length) {
    const best = suppCands.reduce((a, b) => Math.abs(cp - a.price) <= Math.abs(cp - b.price) ? a : b);
    const dist = Math.abs(cp - best.price) / cp * 100;
    supportScore = dist < 3 ? 2 : dist < 7 ? 1 : 0;
  }

  // SPY
  let spyScore = 0;
  if (spyBars && spyBars.length >= 50) {
    const spyClose = spyBars[spyBars.length - 1].close;
    const spyMA50  = ma(spyBars.map(d => d.close), Math.min(50, spyBars.length));
    const spyMA200 = ma(spyBars.map(d => d.close), Math.min(200, spyBars.length));
    if (spyClose > spyMA50) spyScore = 2;
    else if (spyClose > spyMA200) spyScore = 1;
    else spyScore = 0;
  }

  // VIX percentile
  let vixScore = 0;
  if (vixBars && vixBars.length > 20) {
    const vixClose = vixBars[vixBars.length - 1].close;
    const vixClosesArr = vixBars.map(d => d.close);
    const vixPct = Math.round(vixClosesArr.filter(v => v <= vixClose).length / vixClosesArr.length * 100);
    vixScore = vixPct >= 75 ? 2 : vixPct >= 45 ? 1 : 0;
  }

  // Sector (not available per-ticker in backtest — skip, set to neutral 1)
  const sectorScore = 1;

  // ── Score components ──────────────────────────────────────────────────────

  // RSI (0-2)
  const rsiScore = rsiPct <= 15 ? (cp > ma50v ? 2 : 1) : rsiPct <= 40 ? 1 : rsiPct >= 85 ? 0 : 1;
  // POC (0-2)
  const pocScore = distToPOC < 5 ? 2 : distToPOC < 10 ? 1 : 0;
  // Flow (0-2)
  const flowScore = flowPct >= 70 ? 2 : flowPct >= 40 ? 1 : 0;
  // MA trend (0-2)
  const maScore = (cp > ma20v && ma20v > ma50v) ? 2 : (cp > ma20v || ma20v > ma50v) ? 1 : 0;
  // Volume confirm (0-2)
  // Candle (0-2)
  const bullCandles = ['bullish_engulfing', 'hammer', 'morning_star'];
  const candleScore = bullCandles.includes(pat) ? 2 : pat === 'doji' ? 1 : 0;
  // MACD (0-2)
  let macdScore = 0;
  if (macdD) { if (macdD.macd > macdD.signal && macdD.expanding) macdScore = 2; else if (macdD.macd > macdD.signal) macdScore = 1; }
  // BB (0-2)
  let bbScore = 0;
  if (bbD) { if (cp <= bbD.lower) bbScore = 2; else if (cp < bbD.middle) bbScore = 1; }
  // ADX (0-2)
  let adxScore = 0;
  if (adxD) { if (adxD.adx > 25 && adxD.plusDI > adxD.minusDI) adxScore = 2; else if (adxD.plusDI > adxD.minusDI) adxScore = 1; }
  // OBV (0-2)
  let obvScore = 0;
  if (obvD) { if (obvD.strongUp) obvScore = 2; else if (obvD.trendUp) obvScore = 1; }
  // 52W position (0-2)
  const recovering = ret10 > 0.01;
  const pos52Score = pos52 < 0.33 ? (recovering ? 2 : 1) : pos52 < 0.66 ? (recovering ? 1 : 0) : 0;
  // Drawdown (0-2)
  const drawdownScore = drawdown > 30 ? 2 : drawdown > 15 ? 1 : 0;

  // Risk modifier
  let riskMod = 1.0;
  const bearCandles = ['bearish_engulfing', 'shooting_star', 'evening_star'];
  if (bearCandles.includes(pat)) riskMod *= 0.95;
  if (cp < ma50v && cp < ma200v) riskMod *= 0.86; // confirmed downtrend both timeframes
  else if (cp < ma200v)          riskMod *= 0.93; // long-term downtrend only

  // Axis scores (match engine exactly)
  const entryRaw   = rsiScore + pocScore + bbScore + pos52Score + drawdownScore + supportScore + vixScore + candleScore;
  const entryMax   = 16;
  const qualityRaw = flowScore + maScore + volConf + macdScore + adxScore + obvScore + spyScore + sectorScore;
  const qualityMax = 16;

  const entryScore_   = Math.min(100, Math.max(0, Math.round(entryRaw / entryMax * 100)));
  const qualityScore_ = Math.min(100, Math.max(0, Math.round((qualityRaw / qualityMax * 100) * riskMod)));

  // Regime-adaptive weights + tier thresholds
  let wEntry, wQuality, TIER_HI, TIER_LO;
  if (spyBars && spyBars.length >= 200) {
    const spyClose  = spyBars[spyBars.length - 1].close;
    const spyMA200_ = ma(spyBars.map(d => d.close), Math.min(200, spyBars.length));
    const spyMA50_  = ma(spyBars.map(d => d.close), Math.min(50, spyBars.length));
    if (spyClose < spyMA200_)     { wEntry = 0.65; wQuality = 0.35; TIER_HI = 54; TIER_LO = 38; }
    else if (spyClose > spyMA50_) { wEntry = 0.40; wQuality = 0.60; TIER_HI = 62; TIER_LO = 46; }
    else                          { wEntry = 0.50; wQuality = 0.50; TIER_HI = 58; TIER_LO = 42; }
  } else { wEntry = 0.50; wQuality = 0.50; TIER_HI = 58; TIER_LO = 42; }

  const blended = Math.round(wEntry * entryScore_ + wQuality * qualityScore_);

  // Quadrant
  const tier = s => s >= TIER_HI ? 'high' : s >= TIER_LO ? 'mid' : 'low';
  const QUADRANT = {
    high: { high: 100, mid: 75, low: 25 },
    mid:  { high: 75,  mid: 50, low: 25 },
    low:  { high: 50,  mid: 25, low: 0  }
  };
  let alloc = QUADRANT[tier(entryScore_)][tier(qualityScore_)];

  const REC = {
    high: { high: 'STRONG_BUY', mid: 'BUY',      low: 'CAUTION' },
    mid:  { high: 'BUY',        mid: 'HOLD',      low: 'WAIT'    },
    low:  { high: 'ACCUMULATE', mid: 'WAIT',      low: 'AVOID'   }
  };
  const rec = REC[tier(entryScore_)][tier(qualityScore_)];

  // Quality gate: ACCUMULATE capped at 25% unless quality is genuinely strong (≥70)
  if (rec === 'ACCUMULATE' && qualityScore_ < 70) alloc = 25;

  return { entryScore: entryScore_, qualityScore: qualityScore_, blended, alloc, rec };
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function stats(arr) {
  if (!arr.length) return { n: 0, mean: null, median: null, winRate: null, p10: null, p90: null };
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const winRate = arr.filter(v => v > 0).length / arr.length;
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return { n: arr.length, mean: mean * 100, median: median * 100, winRate: winRate * 100, p10: p10 * 100, p90: p90 * 100 };
}

function fmt(v, dec = 1) { return v == null ? '  —  ' : (v >= 0 ? '+' : '') + v.toFixed(dec) + '%'; }
function fmtN(n) { return String(n).padStart(4); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📊 DCA SCORING ENGINE — HISTORICAL BACKTEST');
  console.log('='.repeat(70));
  console.log('Fetching 2Y of daily data from Yahoo Finance...\n');

  // Fetch SPY and VIX once (shared across all symbols)
  let spyBars, vixBars;
  try {
    spyBars = await fetchHistory('SPY');
    console.log(`✅ SPY: ${spyBars.length} trading days`);
  } catch (e) { console.error('❌ SPY:', e.message); spyBars = null; }
  try {
    vixBars = await fetchHistory('^VIX');
    console.log(`✅ VIX: ${vixBars.length} trading days`);
  } catch (e) { console.error('❌ VIX:', e.message); vixBars = null; }

  // Accumulate results across all symbols
  const globalByRec  = {};
  const globalByTier = { '0-25': [], '26-40': [], '41-55': [], '56-70': [], '71-85': [], '86-100': [] };

  for (const sym of SYMBOLS) {
    let bars;
    try {
      bars = await fetchHistory(sym);
      console.log(`\n✅ ${sym}: ${bars.length} trading days`);
    } catch (e) {
      console.error(`❌ ${sym}: ${e.message}`);
      continue;
    }

    // Evaluation loop: every EVAL_STEP days after WARMUP, stop before max(FWD_DAYS) from end
    const maxFwd = Math.max(...FWD_DAYS);
    const results = [];

    for (let i = WARMUP; i <= bars.length - maxFwd - 1; i += EVAL_STEP) {
      const slice   = bars.slice(0, i + 1);
      const spySlice = spyBars ? spyBars.slice(0, i + 1) : null;
      const vixSlice = vixBars ? vixBars.slice(0, i + 1) : null;

      let scored;
      try { scored = scorePoint(slice, spySlice, vixSlice); }
      catch { continue; }

      const fwdReturns = {};
      for (const fd of FWD_DAYS) {
        if (i + fd < bars.length) {
          fwdReturns[fd] = (bars[i + fd].close - bars[i].close) / bars[i].close;
        }
      }
      results.push({ ...scored, fwd: fwdReturns, date: bars[i].date });
    }

    if (!results.length) { console.log(`  ⚠ No evaluation points for ${sym}`); continue; }

    // Per-symbol output
    console.log(`\n  ${sym} — ${results.length} evaluation points (${results[0].date} → ${results[results.length-1].date})`);

    const byRec = {};
    for (const r of results) {
      const k = r.rec;
      if (!byRec[k]) byRec[k] = [];
      byRec[k].push(r.fwd);

      // Accumulate global
      if (!globalByRec[k]) globalByRec[k] = [];
      globalByRec[k].push(r.fwd);
    }

    // Score tier grouping
    for (const r of results) {
      const s = r.blended;
      const bucket = s <= 25 ? '0-25' : s <= 40 ? '26-40' : s <= 55 ? '41-55' : s <= 70 ? '56-70' : s <= 85 ? '71-85' : '86-100';
      globalByTier[bucket].push(r.fwd);
    }

    console.log(`  ${'Signal'.padEnd(14)} ${'N'.padEnd(5)} ${'21d mean'.padEnd(10)} ${'42d mean'.padEnd(10)} ${'63d mean'.padEnd(10)} ${'Win% 63d'}`);
    console.log('  ' + '-'.repeat(65));
    const recOrder = ['STRONG_BUY', 'BUY', 'ACCUMULATE', 'HOLD', 'WAIT', 'CAUTION', 'AVOID'];
    for (const rec of recOrder) {
      const rows = byRec[rec];
      if (!rows) continue;
      const get = fd => stats(rows.filter(r => r[fd] != null).map(r => r[fd]));
      const s21 = get(21), s42 = get(42), s63 = get(63);
      console.log(`  ${rec.padEnd(14)} ${fmtN(s21.n)}   ${fmt(s21.mean).padEnd(10)} ${fmt(s42.mean).padEnd(10)} ${fmt(s63.mean).padEnd(10)} ${s63.winRate != null ? s63.winRate.toFixed(0) + '%' : '—'}`);
    }
  }

  // ── GLOBAL SUMMARY ───────────────────────────────────────────────────────────
  console.log('\n\n' + '='.repeat(70));
  console.log('📈  ALL SYMBOLS COMBINED — Score Tier vs Forward Returns');
  console.log('='.repeat(70));
  console.log(`${'Score Tier'.padEnd(12)} ${'N'.padEnd(5)} ${'21d mean'.padEnd(10)} ${'42d mean'.padEnd(10)} ${'63d mean'.padEnd(10)} ${'Win%63d'.padEnd(9)} ${'P10'.padEnd(8)} ${'P90'}`);
  console.log('-'.repeat(75));
  for (const [bucket, rows] of Object.entries(globalByTier)) {
    const get = fd => stats(rows.filter(r => r[fd] != null).map(r => r[fd]));
    const s21 = get(21), s42 = get(42), s63 = get(63);
    console.log(`${bucket.padEnd(12)} ${fmtN(s63.n)}   ${fmt(s21.mean).padEnd(10)} ${fmt(s42.mean).padEnd(10)} ${fmt(s63.mean).padEnd(10)} ${s63.winRate != null ? s63.winRate.toFixed(0).padEnd(9) : '—'.padEnd(9)} ${fmt(s63.p10).padEnd(8)} ${fmt(s63.p90)}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋  ALL SYMBOLS COMBINED — Recommendation vs Forward Returns');
  console.log('='.repeat(70));
  console.log(`${'Signal'.padEnd(14)} ${'N'.padEnd(5)} ${'21d mean'.padEnd(10)} ${'42d mean'.padEnd(10)} ${'63d mean'.padEnd(10)} ${'Win%63d'.padEnd(9)} ${'P10'.padEnd(8)} ${'P90'}`);
  console.log('-'.repeat(75));
  const recOrder = ['STRONG_BUY', 'BUY', 'ACCUMULATE', 'HOLD', 'WAIT', 'CAUTION', 'AVOID'];
  for (const rec of recOrder) {
    const rows = globalByRec[rec];
    if (!rows) continue;
    const get = fd => stats(rows.filter(r => r[fd] != null).map(r => r[fd]));
    const s21 = get(21), s42 = get(42), s63 = get(63);
    console.log(`${rec.padEnd(14)} ${fmtN(s63.n)}   ${fmt(s21.mean).padEnd(10)} ${fmt(s42.mean).padEnd(10)} ${fmt(s63.mean).padEnd(10)} ${s63.winRate != null ? s63.winRate.toFixed(0).padEnd(9) : '—'.padEnd(9)} ${fmt(s63.p10).padEnd(8)} ${fmt(s63.p90)}`);
  }

  console.log('\n⚡ Key: mean/median forward return, win% = % of periods with positive return');
  console.log('   P10/P90 = 10th/90th percentile of 63d returns (downside/upside range)\n');
}

main().catch(console.error);
