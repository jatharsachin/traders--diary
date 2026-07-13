const tickers = [
  'SGBJAN29X-GB.NS',
  'SGBJAN29-GB.NS',
  'SGBJAN29X.NS',
  'PSUBNKBEES.NS',
  'SILVERBEES.NS',
  'SILVERIETF.NS',
  'GOLDIETF.NS'
];

async function checkDirectChart() {
  for (const ticker of tickers) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const chartPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        const symbol = data?.chart?.result?.[0]?.meta?.symbol;
        console.log(`Ticker: ${ticker} => Price: ${chartPrice}, Symbol: ${symbol}`);
      } else {
        console.log(`Ticker: ${ticker} => Failed Status: ${response.status}`);
      }
    } catch (e) {
      console.log(`Ticker: ${ticker} => Error: ${e.message}`);
    }
  }
}

checkDirectChart();
