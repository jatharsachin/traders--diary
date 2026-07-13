const tickers = [
  'SGBJAN29X-GB.NS',
  'PSUBNKBEES.NS',
  'SILVERBEES.NS',
  'SILVERIETF.NS',
  'GOLDIETF.NS'
];

const proxies = [
  (targetUrl) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`,
  (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
];

async function checkTickers() {
  for (const ticker of tickers) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
    let success = false;
    let price = null;
    
    for (const getProxyUrl of proxies) {
      try {
        const proxyUrl = getProxyUrl(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) continue;
        const json = await response.json();
        
        let data;
        if (json && json.contents) {
          data = JSON.parse(json.contents);
        } else {
          data = json;
        }

        const quotePrice = data?.quoteResponse?.result?.[0]?.regularMarketPrice;
        if (quotePrice && typeof quotePrice === 'number') {
          success = true;
          price = quotePrice;
          break;
        }
      } catch (e) {
        // ignore
      }
    }
    console.log(`Ticker: ${ticker} => Success: ${success}, Price: ${price}`);
  }
}

checkTickers();
