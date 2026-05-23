import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  green: '#16a34a', lightGreen: '#dcfce7', borderGreen: '#86efac',
  blue: '#2563eb', lightBlue: '#dbeafe', borderBlue: '#93c5fd',
  yellow: '#ca8a04', lightYellow: '#fef9c3', borderYellow: '#fde047',
  red: '#dc2626', lightRed: '#fee2e2', borderRed: '#fca5a5',
  gray: '#6b7280', lightGray: '#f9fafb', borderGray: '#e5e7eb'
};

function scoreColor(pct) {
  if (pct >= 67) return COLORS.green;
  if (pct >= 34) return COLORS.yellow;
  return COLORS.red;
}

function ScoreBar({ label, score, max, pct }) {
  const color = scoreColor(pct);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontWeight: 'bold' }}>{score}/{max} ({pct}%)</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: '4px', height: '8px', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function SignalRow({ label, signal }) {
  const pct = Math.round((signal.score / signal.max) * 100);
  const color = scoreColor(pct);
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: '#374151' }}>{label}</td>
      <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 500, color }}>{signal.label}</td>
      <td style={{ padding: '8px 10px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{signal.value}</td>
      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
        <span style={{ background: color, color: 'white', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 'bold' }}>
          {signal.score}/{signal.max}
        </span>
      </td>
    </tr>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: highlight ? COLORS.lightBlue : COLORS.lightGray,
      border: `1px solid ${highlight ? COLORS.borderBlue : COLORS.borderGray}`,
      borderRadius: '8px', padding: '14px'
    }}>
      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

export default function DCAAssistant() {
  const [ticker, setTicker] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:3000');

  const analyzeStock = async () => {
    if (!ticker.trim()) { setError('Please enter a ticker symbol'); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${apiEndpoint}/api/analyze?symbol=${ticker}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.error) { setError(result.error); setData(null); }
      else setData(result);
    } catch (err) {
      setError(`Failed to connect to API. Make sure server is running at ${apiEndpoint}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') analyzeStock(); };

  const recColor = data?.analysis?.recommendation?.includes('STRONG') ? COLORS.lightGreen
                 : data?.analysis?.recommendation?.includes('BUY') ? COLORS.lightBlue
                 : data?.analysis?.recommendation?.includes('HOLD') ? COLORS.lightYellow
                 : COLORS.lightRed;
  const recBorder = data?.analysis?.recommendation?.includes('STRONG') ? COLORS.borderGreen
                  : data?.analysis?.recommendation?.includes('BUY') ? COLORS.borderBlue
                  : data?.analysis?.recommendation?.includes('HOLD') ? COLORS.borderYellow
                  : COLORS.borderRed;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: "'Inter', Arial, sans-serif" }}>
      <h1 style={{ color: '#111827', marginBottom: '4px', fontSize: '22px' }}>DCA Assistant</h1>
      <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '13px' }}>
        Multi-factor DCA scoring · Yahoo Finance + Alpha Vantage
      </p>

      {/* Input */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Ticker</label>
            <input type="text" value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="AAPL"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>API Endpoint</label>
            <input type="text" value={apiEndpoint}
              onChange={e => setApiEndpoint(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={analyzeStock} disabled={loading}
            style={{
              padding: '8px 20px', background: loading ? '#9ca3af' : COLORS.blue,
              color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '14px', alignSelf: 'flex-end'
            }}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {!data && (
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '10px' }}>
            💡 Tip: get a free Alpha Vantage key at alphavantage.co for fundamental scoring
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: COLORS.lightRed, border: `1px solid ${COLORS.borderRed}`, color: '#991b1b', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
          Fetching market data, SPY, VIX, sector ETF…
        </div>
      )}

      {data && !error && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '20px', overflowX: 'auto' }}>
            {['overview', 'signals', 'market', 'technical', 'fundamental'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 14px', background: activeTab === tab ? COLORS.blue : 'transparent',
                  color: activeTab === tab ? 'white' : '#6b7280',
                  border: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400,
                  borderRadius: '6px 6px 0 0', fontSize: '13px', whiteSpace: 'nowrap'
                }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div>
              {/* Recommendation banner */}
              <div style={{ background: recColor, border: `2px solid ${recBorder}`, borderRadius: '10px', padding: '20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>{data.analysis.recommendation}</div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>DCA Score: <strong>{data.analysis.dcaScore}/100</strong></div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {new Date(data.analysis.timestamp).toLocaleString()}
                  </div>
                </div>
                {/* Position sizing */}
                <div style={{ textAlign: 'center', background: 'white', borderRadius: '8px', padding: '14px 24px', border: `1px solid ${recBorder}` }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deploy this week</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: scoreColor(data.analysis.allocationPct) }}>
                    {data.analysis.allocationPct}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>of planned amount</div>
                </div>
              </div>

              {/* Score breakdown bars */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Score Breakdown</div>
                <ScoreBar label="Technical (RSI, MA, POC, order flow, volume, candle)" {...data.analysis.scoreBreakdown.technical} />
                <ScoreBar label="Market Context (SPY regime, VIX, sector strength)" {...data.analysis.scoreBreakdown.marketContext} />
                <ScoreBar label="Price Action (52W position, drawdown, support)" {...data.analysis.scoreBreakdown.priceAction} />
                {data.analysis.scoreBreakdown.fundamental && (
                  <ScoreBar label="Fundamentals (P/E, ROE, margins, revenue growth)" {...data.analysis.scoreBreakdown.fundamental} />
                )}
                {!data.analysis.scoreBreakdown.fundamental && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Fundamental score not included — set ALPHA_VANTAGE_KEY for +20% weight
                  </div>
                )}
              </div>

              {/* Explanation paragraph */}
              {data.analysis.explanation && (
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px 18px',
                  marginBottom: '16px',
                  lineHeight: '1.65',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {data.analysis.explanation}
                </div>
              )}

              {/* Risk flags */}
              {data.analysis.riskFlags?.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>⚠️ Risk Modifiers Applied (score × {data.analysis.riskModifier})</div>
                  {data.analysis.riskFlags.map((f, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>• {f}</div>
                  ))}
                </div>
              )}

              {/* Quick metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <MetricCard label="Current Price" value={`$${data.market.currentPrice}`} />
                <MetricCard label="SPY Regime" value={data.market.spyRegime} sub={data.market.spyPrice ? `SPY $${data.market.spyPrice}` : null} />
                <MetricCard label="VIX" value={data.market.vixLevel || 'N/A'} sub={data.analysis.signals?.vix?.label} />
                <MetricCard label="Drawdown" value={`-${data.market.drawdownFromHigh}%`} sub="from 52W high" />
                <MetricCard label="52W Position" value={`${data.market.position}%`} sub="of annual range" />
                <MetricCard label="Order Flow" value={data.analysis.signals?.orderFlow?.label} sub={data.analysis.signals?.orderFlow?.value} />
              </div>

              {data.errors && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef9c3', borderRadius: '6px', fontSize: '11px', color: '#713f12' }}>
                  ⚠️ <strong>Partial data:</strong> {data.errors.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* ── SIGNALS TAB ── */}
          {activeTab === 'signals' && (
            <div>
              {/* Technical signals */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Technical Signals (max 12 pts)</div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', fontSize: '11px', color: '#6b7280' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Signal</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reading</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Value</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analysis.signals?.rsi && <SignalRow label="RSI (14)" signal={data.analysis.signals.rsi} />}
                      {data.analysis.signals?.maTrend && <SignalRow label="MA Trend" signal={data.analysis.signals.maTrend} />}
                      {data.analysis.signals?.poc && <SignalRow label="POC Proximity" signal={data.analysis.signals.poc} />}
                      {data.analysis.signals?.orderFlow && <SignalRow label="Order Flow" signal={data.analysis.signals.orderFlow} />}
                      {data.analysis.signals?.volumeConfirm && <SignalRow label="Volume Confirm" signal={data.analysis.signals.volumeConfirm} />}
                      {data.analysis.signals?.candle && <SignalRow label="Candlestick" signal={data.analysis.signals.candle} />}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Market context signals */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Market Context Signals (max 6 pts)</div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', fontSize: '11px', color: '#6b7280' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Signal</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reading</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Value</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analysis.signals?.spyRegime && <SignalRow label="SPY Regime" signal={data.analysis.signals.spyRegime} />}
                      {data.analysis.signals?.vix && <SignalRow label="VIX (Fear)" signal={data.analysis.signals.vix} />}
                      {data.analysis.signals?.sectorStrength && <SignalRow label="Sector Strength" signal={data.analysis.signals.sectorStrength} />}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price action signals */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Price Action Signals (max 6 pts)</div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', fontSize: '11px', color: '#6b7280' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Signal</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reading</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Value</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analysis.signals?.position52 && <SignalRow label="52W Position" signal={data.analysis.signals.position52} />}
                      {data.analysis.signals?.drawdown && <SignalRow label="Drawdown" signal={data.analysis.signals.drawdown} />}
                      {data.analysis.signals?.support && <SignalRow label="Support Level" signal={data.analysis.signals.support} />}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── MARKET TAB ── */}
          {activeTab === 'market' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <MetricCard label="Current Price" value={`$${data.market.currentPrice}`} />
                <MetricCard label="52W High" value={`$${data.market.high52Week}`} />
                <MetricCard label="52W Low" value={`$${data.market.low52Week}`} />
                <MetricCard label="52W Position" value={`${data.market.position}%`} sub="of annual range" />
                <MetricCard label="Drawdown" value={`-${data.market.drawdownFromHigh}%`} sub="from 52W high" />
                <MetricCard label="Avg Daily Volume" value={`${(data.market.avgVolume / 1e6).toFixed(1)}M`} />
                <MetricCard label="MA 200" value={`$${data.market.ma200}`} sub={parseFloat(data.market.currentPrice) > parseFloat(data.market.ma200) ? '↑ Price above' : '↓ Price below'} />
                <MetricCard label="SPY Regime" value={data.market.spyRegime} sub={data.market.spyPrice ? `SPY $${data.market.spyPrice}` : null} />
                <MetricCard label="VIX" value={data.market.vixLevel || 'N/A'} sub="Fear index" />
                {data.market.sectorEtf && <MetricCard label="Sector ETF" value={data.market.sectorEtf} sub={data.analysis.signals?.sectorStrength?.label} />}
                {data.market.streak && (
                  <MetricCard label="Day Streak"
                    value={`${data.market.streak.streak} ${data.market.streak.direction === 'up' ? '↑' : '↓'} days`}
                    sub={data.market.streak.direction === 'up' ? 'consecutive up' : 'consecutive down'}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── TECHNICAL TAB ── */}
          {activeTab === 'technical' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <MetricCard label="RSI (14)" value={data.technical.rsi}
                  sub={parseFloat(data.technical.rsi) < 30 ? 'Oversold' : parseFloat(data.technical.rsi) > 70 ? 'Overbought' : 'Neutral'} />
                <MetricCard label="MA 20" value={`$${data.technical.ma20}`}
                  sub={parseFloat(data.market.currentPrice) > parseFloat(data.technical.ma20) ? '↑ Price above' : '↓ Price below'} />
                <MetricCard label="MA 50" value={`$${data.technical.ma50}`}
                  sub={parseFloat(data.market.currentPrice) > parseFloat(data.technical.ma50) ? '↑ Price above' : '↓ Price below'} />
                <MetricCard label="MA 200" value={`$${data.technical.ma200}`}
                  sub={parseFloat(data.market.currentPrice) > parseFloat(data.technical.ma200) ? '↑ Price above' : '↓ Price below'} />
                <MetricCard label="POC Price" value={`$${data.technical.pocPrice}`} sub={`${data.technical.distToPOC}% away`} />
                {data.technical.nearestSupport && (
                  <MetricCard label="Nearest Support" value={`$${data.technical.nearestSupport}`}
                    sub={data.analysis.signals?.support?.label} />
                )}
                {data.technical.candlestickPattern && (
                  <MetricCard label="Candlestick" value={data.technical.candlestickPattern.replace('_', ' ')} highlight />
                )}
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Order Flow (last 20 days)</div>
                <div style={{ fontSize: '13px' }}>
                  Buy pressure: <strong>{(data.technical.buyPressure / 1e6).toFixed(1)}M</strong> &nbsp;|&nbsp;
                  Sell pressure: <strong>{(data.technical.sellPressure / 1e6).toFixed(1)}M</strong>
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Net delta:{' '}
                  <strong style={{ color: data.technical.orderFlowDelta > 0 ? COLORS.green : COLORS.red }}>
                    {data.technical.orderFlowDelta > 0 ? '+' : ''}{(data.technical.orderFlowDelta / 1e6).toFixed(1)}M
                  </strong>
                </div>
              </div>

              {/* Price chart */}
              {data.chartData?.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Price + MA (last 60 days)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="close" stroke={COLORS.blue} dot={false} strokeWidth={1.5} name="Price" />
                      <Line type="monotone" dataKey="ma20" stroke={COLORS.yellow} dot={false} strokeWidth={1} name="MA20" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="ma50" stroke={COLORS.red} dot={false} strokeWidth={1} name="MA50" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── FUNDAMENTAL TAB ── */}
          {activeTab === 'fundamental' && (
            <div>
              {data.fundamental ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <MetricCard label="Sector" value={data.fundamental.sector || 'N/A'} />
                    <MetricCard label="P/E Ratio" value={data.fundamental.pe}
                      sub={parseFloat(data.fundamental.pe) < 20 ? 'Attractive' : parseFloat(data.fundamental.pe) < 25 ? 'Fair' : 'Elevated'} />
                    <MetricCard label="Forward P/E" value={data.fundamental.forwardPE} />
                    <MetricCard label="EPS" value={`$${data.fundamental.eps}`} />
                    <MetricCard label="ROE" value={data.fundamental.roe}
                      sub={parseFloat(data.fundamental.roe) > 15 ? 'Strong' : 'Moderate'} />
                    <MetricCard label="Profit Margin" value={data.fundamental.profitMargin} />
                    <MetricCard label="Revenue Growth YOY" value={data.fundamental.revenueGrowthYOY} highlight />
                    <MetricCard label="Earnings Growth YOY" value={data.fundamental.earningsGrowthYOY} highlight />
                    <MetricCard label="Beta" value={data.fundamental.beta}
                      sub={parseFloat(data.fundamental.beta) > 1.5 ? 'High volatility' : 'Normal'} />
                    <MetricCard label="Dividend Yield" value={data.fundamental.dividendYield} />
                    <MetricCard label="Price/Book" value={data.fundamental.priceToBook} />
                    <MetricCard label="Market Cap" value={data.fundamental.marketCap > 1e9 ? `$${(data.fundamental.marketCap / 1e9).toFixed(1)}B` : `$${(data.fundamental.marketCap / 1e6).toFixed(0)}M`} />
                  </div>
                  {data.analysis.scoreBreakdown.fundamental && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                      <ScoreBar label="Fundamental Score" {...data.analysis.scoreBreakdown.fundamental} />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No fundamental data</div>
                  <div style={{ fontSize: '13px' }}>Set the <code>ALPHA_VANTAGE_KEY</code> environment variable to enable P/E, ROE, revenue growth scoring</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
          Enter a ticker and click Analyze to get started
        </div>
      )}
    </div>
  );
}
