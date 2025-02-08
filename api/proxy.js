export default async function handler(req, res) {
    const { api, query, page } = req.query; // Expect 'api', 'query', and 'page' parameters
  
    // Handle preflight CORS request (for browsers)
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }
  
    // CORS headers to allow requests from the frontend
    res.setHeader('Access-Control-Allow-Origin', '*'); // You can specify your frontend URL here instead of '*'
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    // Check for required parameters
    if (!api || !query || !page) {
      return res.status(400).json({ error: 'Missing required parameters (api, query, page)' });
    }
  
    // Validate the 'api' parameter
    const validApis = ['rule34', 'danbooru', 'yande', 'gelbooru', 'konachan'];
    if (!validApis.includes(api)) {
      return res.status(400).json({ error: 'Invalid API selection' });
    }
  
    let url = '';
  
    // Construct the API URL based on the selected API
    if (api === 'rule34') {
      url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&pid=${page - 1}`;
    } else if (api === 'danbooru') {
      url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(query)}&page=${page}`;
    } else if (api === 'yande') {
      url = `https://yande.re/post.json?tags=${encodeURIComponent(query)}&page=${page}`;
    } else if (api === 'gelbooru') {
      url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&page=${page}&tags=${encodeURIComponent(query)}`;
    } else if (api === 'konachan') {
      url = `https://konachan.com/post.json?tags=${encodeURIComponent(query)}&page=${page}`;
    }
  
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch data from the API');
      }
  
      const data = await response.json();
  
      // If the data is not an array, return a suitable error
      if (!Array.isArray(data)) {
        return res.status(500).json({ error: 'API response is not an array' });
      }
  
      // Return the data back to the client
      res.status(200).json(data);
  
    } catch (error) {
      console.error("Error fetching from external API", error);
      // Handle specific error cases
      if (error.message === 'Failed to fetch data from the API') {
        return res.status(502).json({ error: 'Bad Gateway: External API is down' });
      }
  
      res.status(500).json({ error: 'Error fetching data from the API' });
    }
  }
  