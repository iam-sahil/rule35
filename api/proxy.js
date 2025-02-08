// api/proxy.js
export default async function handler(req, res) {
    const { api, query, page } = req.query; // Expect 'api', 'query', and 'page' parameters
  
    // Construct the API URL based on the selected API
    let url = '';
    if (api === 'rule34') {
      url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&pid=${page - 1}`;
    } else if (api === 'danbooru') {
      url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(query)}&page=${page}`;
    } else if (api === 'yande') {
      url = `https://yande.re/post.json?tags=${encodeURIComponent(query)}&page=${page}`;
    } else if (api === 'gelbooru') {
      url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&page=${page}&tags=${encodeURIComponent(query)}`;
    }
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.status(200).json(data);  // Return the data back to the client
    } catch (error) {
      console.error("Error fetching from external API", error);
      res.status(500).json({ error: 'Error fetching data from the API' });
    }
  }
  