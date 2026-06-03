# ⚡ DCA Assistant - Quick Start (5 Minutes)

## 🎯 Goal
Get real-time stock analysis with **Yahoo Finance + Alpha Vantage APIs** running on your computer.

---

## 📋 Step-by-Step Setup

### 1️⃣ Get Free API Key (1 min)

Visit: **https://www.alphavantage.co/api/**
- Enter your email
- Copy the API key from the email

### 2️⃣ Download Files (1 min)

Download these 5 files to a folder:
- `dca-assistant-server.js` (Backend server)
- `dca-assistant.html` (Web interface)
- `package.json` (Dependencies)
- `README.md` (Documentation)

### 3️⃣ Install Node.js (if needed)

If you don't have Node.js:
- Download from: https://nodejs.org/
- Install (default settings)
- Open terminal/command prompt

### 4️⃣ Setup & Start Server (2 min)

**macOS/Linux:**
```bash
# Navigate to your folder
cd /path/to/dca-assistant

# Install dependencies
npm install

# Set API key
export ALPHA_VANTAGE_KEY=your_key_here

# Start server
npm start
```

**Windows (PowerShell):**
```powershell
cd C:\path\to\dca-assistant
npm install
$env:ALPHA_VANTAGE_KEY="your_key_here"
npm start
```

**Windows (Command Prompt):**
```cmd
cd C:\path\to\dca-assistant
npm install
set ALPHA_VANTAGE_KEY=your_key_here
npm start
```

You should see:
```
🚀 DCA ASSISTANT SERVER STARTED 🚀
Server: http://localhost:3000
```

### 5️⃣ Open in Browser (1 min)

- Open `dca-assistant.html` in your web browser
- OR go to: `http://localhost:3000`
- Enter a ticker: **AAPL**, **MSFT**, **TSLA**
- Click "Analyze"

> 💡 Enter an **ETF or fund** ticker (e.g. **VOO**, **BND**, **QQQ**) and a **📋 Factsheet** tab appears with holdings, sectors, fees, trailing returns, and an A–F fund-quality grade. The tab stays hidden for ordinary stocks.

---

## 🎓 Quick Examples

### Command Line (cURL)
```bash
curl "http://localhost:3000/api/analyze?symbol=AAPL"
curl "http://localhost:3000/api/analyze?symbol=MSFT"
curl "http://localhost:3000/api/analyze?symbol=TSLA"
```

### Web Browser
Just open `dca-assistant.html` and use the form.

---

## 📊 What You'll See

```
Current Price: $150.25
52-Week Range: $125.38 - $199.62
DCA Score: 75/100
Recommendation: ✅ STRONG BUY

Volume Profile POC: $147.80
Order Flow: Bullish 🟢
P/E Ratio: 28.34
```

---

## ⚠️ Troubleshooting

### ❌ "Cannot connect to server"
```bash
# Check if server is running
lsof -i :3000              # Mac/Linux
netstat -ano | grep 3000   # Windows

# Or start it again
npm start
```

### ❌ "API key error"
```bash
# Check API key is set
echo $ALPHA_VANTAGE_KEY    # Mac/Linux
echo %ALPHA_VANTAGE_KEY%   # Windows

# Reset it
export ALPHA_VANTAGE_KEY=your_key_here
npm start
```

### ❌ "Symbol not found"
- Check ticker spelling: **AAPL** (not Apple)
- Use major stocks: S&P 500 companies work best
- Verify on Google Finance first

### ❌ "npm command not found"
- Install Node.js from https://nodejs.org/
- Restart terminal/PowerShell
- Try again

---

## 🚀 What's Included

| File | Purpose |
|------|---------|
| `dca-assistant-server.js` | Backend API (connects to Yahoo Finance & Alpha Vantage) |
| `dca-assistant.html` | Standalone web interface (no build tools needed) |
| `DCAAssistant.jsx` | React component (advanced users) |
| `package.json` | Dependencies & config |
| `README.md` | Full documentation |

---

## 📱 How to Use Daily

**Option 1: Web Interface** (Easiest)
```
1. Terminal: npm start
2. Open dca-assistant.html in browser
3. Enter ticker → See recommendations
4. Check if DCA score > 70 before investing
```

**Option 2: Command Line** (Fastest)
```bash
curl "http://localhost:3000/api/analyze?symbol=AAPL"
# Get JSON response instantly
```

**Option 3: Set Reminders**
```bash
# Every Monday at 9 AM, analyze your watchlist
0 9 * * 1 curl "http://localhost:3000/api/analyze?symbol=AAPL" > ~/dca-report.json
```

---

## 💡 Pro Tips

1. **Check score before monthly DCA**: Only invest if score > 55
2. **Compare multiple stocks**: Run analysis on 5-10 stocks, pick top scorers
3. **Monitor volume POC**: Buy near Point of Control for best support
4. **Weekly check**: Re-analyze if major news hits your stock
5. **Set alerts**: DCA Score drops below 40? Pause and wait

---

## 📚 Learn More

- **DCA Strategy**: https://www.investopedia.com/terms/d/dollarcostaveraging.asp
- **Volume Profile**: https://www.investopedia.com/terms/v/volume-profile.asp
- **Technical Analysis**: https://www.investopedia.com/terms/t/technicalanalysis.asp
- **Alpha Vantage API**: https://www.alphavantage.co/documentation/
- **Yahoo Finance**: https://finance.yahoo.com/

---

## 🎉 You're Ready!

You now have a professional-grade DCA analysis tool. Use it to:
- ✅ Find optimal monthly DCA entry points
- ✅ Monitor order flow & volume profile
- ✅ Identify support/resistance levels
- ✅ Score stocks 0-100 for buying confidence
- ✅ Make data-driven investment decisions

**Happy investing! 🚀**

---

## 📞 Need Help?

1. Check server logs in terminal
2. Read the full README.md
3. Test API directly: http://localhost:3000/api/analyze?symbol=AAPL
4. Verify API key is set

Questions? Create an issue or check the documentation.
