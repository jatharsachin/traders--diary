async function testSearch(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
  try {
    console.log(`Searching: ${url}`);
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      console.log(`Search Results for "${query}":`);
      if (json.quotes) {
        json.quotes.slice(0, 15).forEach(q => {
          console.log(`- Ticker: ${q.symbol} | Name: ${q.shortname} | Exchange: ${q.exchange}`);
        });
      }
    }
  } catch (e) {
    console.log(`Error:`, e.message);
  }
}

async function run() {
  await testSearch("MCX");
}

run();
