export default async function handler(request, response) {
  const { url } = request.query;
  if (!url) {
    return response.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    // Mimic real browser headers to avoid getting blocked by Yahoo Finance
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const res = await fetch(decodedUrl, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Yahoo returned error status ${res.status}: ${errorText}`);
      return response.status(res.status).json({ error: `Yahoo returned status ${res.status}` });
    }

    const data = await res.json();
    return response.status(200).json(data);
  } catch (error) {
    console.error('Yahoo proxy error:', error);
    return response.status(500).json({ error: error.message });
  }
}
