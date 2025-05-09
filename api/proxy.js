export default async function handler(req, res) {
  const { api, query, page, imageUrl } = req.query;

  // Handle preflight CORS request (for browsers)
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  // CORS headers to allow requests from the frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // If imageUrl is provided, directly fetch the image and return it
  if (imageUrl) {
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch image. Status: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }

      const contentType = imageResponse.headers.get("Content-Type");

      // Set Content-Type header from the original image response
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else {
        res.setHeader("Content-Type", "image/jpeg"); // Fallback content type if not provided
      }

      // Buffer the response and send it to the client
      const imageBuffer = await imageResponse.arrayBuffer(); // Use arrayBuffer for binary data
      res.status(200).send(Buffer.from(imageBuffer)); // Send as Buffer
    } catch (error) {
      console.error("Error fetching image for proxy:", error);
      return res.status(500).json({
        error: "Failed to fetch image from the source for proxy.",
        details: error.message,
      });
    }
    return;
  }

  // Check for required parameters
  if (!api || !query || !page) {
    return res
      .status(400)
      .json({ error: "Missing required parameters (api, query, page)" });
  }

  // Validate the 'api' parameter
  const validApis = ["rule34", "danbooru", "gelbooru"];
  if (!validApis.includes(api)) {
    return res.status(400).json({ error: "Invalid API selection" });
  }

  let url = "";

  // Construct the API URL based on the selected API
  if (api === "rule34") {
    url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(
      query
    )}&pid=${page - 1}`;
  } else if (api === "danbooru") {
    url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(
      query
    )}&page=${page}`;
  } else if (api === "gelbooru") {
    url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&pid=${page}&tags=${encodeURIComponent(
      query
    )}`; // pid for page
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from the API: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // If the data is not an array for expected APIs, return an error
    if (api !== "gelbooru" && !Array.isArray(data)) {
      // Adjust array check for APIs expecting arrays
      return res
        .status(500)
        .json({ error: `API response is not an array for ${api}` });
    }
    if (api === "gelbooru") {
      if (!data.post && !Array.isArray(data)) {
        // Check for 'post' array or fallback to array if API changes
        return res
          .status(500)
          .json({ error: `Gelbooru API response is not in expected format` });
      }
    }

    // Return the data back to the client
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error fetching from external API (${api}):`, error);
    if (error.message.startsWith("Failed to fetch data from the API")) {
      return res.status(502).json({
        error: `Bad Gateway: External API (${api}) is down or not responding. Details: ${error.message}`,
      });
    }
    res.status(500).json({
      error: `Error fetching data from the API (${api}).`,
      details: error.message,
    });
  }
}
