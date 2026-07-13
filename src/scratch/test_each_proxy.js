const ticker = 'SILVERBEES.NS';
const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;

const proxies = [
  { name: 'Codetabs', fn: (targetUrl) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}` },
  { name: 'Corsproxy.io', fn: (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` },
  { name: 'AllOrigins', fn: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` }
];

async function run() {
  for (const proxy of proxies) {
    const proxyUrl = proxy.fn(url);
    console.log(`Testing proxy: ${proxy.name} with URL: ${proxyUrl}`);
    try {
      const response = await fetch(proxyUrl);
      console.log(`  Response Status: ${response.status}`);
      if (response.ok) {
        const json = await response.json();
        let data = json;
        if (json && json.contents) {
          data = JSON.parse(json.contents);
        }
        const quotePrice = data?.quoteResponse?.result?.[0]?.regularMarketPrice;
        console.log(`  Fetched Price: ${quotePrice}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

run();
