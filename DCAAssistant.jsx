import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DCAAssistant() {
  const [ticker, setTicker] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:3000');

  const analyzeStock = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/api/analyze?symbol=${ticker}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(`Failed to connect to API. Make sure server is running at ${apiEndpoint}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') analyzeStock();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>📊 DCA Assistant with Real-Time Data</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Integrated with Yahoo Finance & Alpha Vantage APIs
      </p>

      {/* Input Section */}
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stock Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="e.g., AAPL, MSFT, TSLA"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>API Endpoint</label>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://localhost:3000"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={analyzeStock}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              alignSelf: 'flex-end',
              marginTop: '25px'
            }}
          >
            {loading ? '⏳ Analyzing...' : '📈 Analyze'}
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666' }}>
          💡 <strong>Tips:</strong> Enter ticker symbol (AAPL, MSFT, TSLA, SPY). Server must be running locally.
          Get free API key at <a href="https://www.alphavantage.co/api/" target="_blank" rel="noreferrer">alphavantage.co</a>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#ffe6e6',
          border: '1px solid #cc0000',
          color: '#660000',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          ⏳ Fetching real-time data from Yahoo Finance & Alpha Vantage...
        </div>
      )}

      {/* Results */}
      {data && !error && (
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '2px solid #ddd',
            marginBottom: '20px',
            overflowX: 'auto'
          }}>
            {['overview', 'market', 'technical', 'fundamental'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 15px',
                  background: activeTab === tab ? '#007bff' : 'transparent',
                  color: activeTab === tab ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  borderRadius: activeTab === tab ? '4px 4px 0 0' : '0'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div style={{
                background: data.analysis.recommendation.includes('STRONG') ? '#e6ffe6' : 
                            data.analysis.recommendation.includes('BUY') ? '#e6f3ff' :
                            data.analysis.recommendation.includes('HOLD') ? '#fff9e6' : '#ffe6e6',
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
                  {data.analysis.recommendation}
                </h2>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>DCA Score:</strong> {data.analysis.dcaScore}/100
                </p>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>
                  Last updated: {new Date(data.analysis.timestamp).toLocaleString()}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {[
                  { label: 'Current Price', value: `$${data.market.currentPrice}`, icon: '💵' },
                  { label: 'Position', value: `${data.market.position}% of range`, icon: '📍' },
                  { label: 'Volume Strength', value: data.market.avgVolume > 40000000 ? 'Strong' : 'Moderate', icon: '📊' },
                  { label: 'Order Flow', value: data.technical.orderFlowDelta > 0 ? 'Bullish 🟢' : 'Bearish 🔴', icon: '⚡' }
                ].map((metric, i) => (
                  <div key={i} style={{
                    background: '#f9f9f9',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                      {metric.icon} {metric.label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>

              {data.errors && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#fff9e6', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                  ⚠️ <strong>Partial Data:</strong> {data.errors.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Market Tab */}
          {activeTab === 'market' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                {[
                  { label: 'Current Price', value: `$${data.market.currentPrice}` },
                  { label: '52-Week High', value: `$${data.market.high52Week}` },
                  { label: '52-Week Low', value: `$${data.market.low52Week}` },
                  { label: 'Avg Daily Volume', value: `${(data.market.avgVolume / 1000000).toFixed(1)}M` }
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{m.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Tab */}
          {activeTab === 'technical' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                {[
                  { label: 'RSI (14)', value: data.technical.rsi, signal: parseFloat(data.technical.rsi) < 30 ? '🟢 Oversold' : parseFloat(data.technical.rsi) > 70 ? '🔴 Overbought' : '⚖️ Neutral' },
                  { label: 'MA 20', value: `$${data.technical.ma20}`, signal: '→' },
                  { label: 'MA 50', value: `$${data.technical.ma50}`, signal: '→' },
                  { label: 'POC Price', value: `$${data.technical.pocPrice}`, signal: 'Volume Peak' }
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{m.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>{m.value}</div>
                    <div style={{ fontSize: '12px', color: '#0066cc' }}>{m.signal}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#e6f3ff', padding: '15px', borderRadius: '8px' }}>
                <strong>Order Flow Analysis:</strong>
                <p>Buy Volume: {data.technical.buyPressure} | Sell Volume: {data.technical.sellPressure}</p>
                <p>Delta: {data.technical.orderFlowDelta > 0 ? '🟢 +' : '🔴 '}{data.technical.orderFlowDelta}</p>
              </div>
            </div>
          )}

          {/* Fundamental Tab */}
          {activeTab === 'fundamental' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                {[
                  { label: 'P/E Ratio', value: data.fundamental.pe || 'N/A', grade: data.fundamental.pe < 20 ? '✅ Good' : 'ℹ️ Monitor' },
                  { label: 'ROE', value: data.fundamental.roe ? `${(parseFloat(data.fundamental.roe) * 100).toFixed(1)}%` : 'N/A', grade: data.fundamental.roe > 0.12 ? '✅ Strong' : 'ℹ️ Check' },
                  { label: 'Debt/Equity', value: data.fundamental.debtToEquity || 'N/A', grade: data.fundamental.debtToEquity < 1.2 ? '✅ Healthy' : '⚠️ Watch' },
                  { label: 'Dividend Yield', value: `${data.fundamental.dividendYield || '0'}%`, grade: parseFloat(data.fundamental.dividendYield) > 0 ? '💰 Income' : 'Growth' }
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{m.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>{m.value}</div>
                    <div style={{ fontSize: '12px', color: '#0066cc' }}>{m.grade}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No Data State */}
      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          👆 Enter a ticker symbol and click "Analyze" to get started
        </div>
      )}
    </div>
  );
}
