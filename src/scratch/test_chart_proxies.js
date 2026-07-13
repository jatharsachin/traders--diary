const ticker = 'SILVERBEES.NS';
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;

const proxies = [
  { name: 'AllOrigins', fn: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` },
  { name: 'ThingProxy', fn: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}` },
  { name: 'Corsproxy.io', fn: (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` },
  { name: 'Codetabs', fn: (targetUrl) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}` }
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
        const chartPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        console.log(`  Fetched Price: ${chartPrice}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

run();
