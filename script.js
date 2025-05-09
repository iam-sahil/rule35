// Danbooru API key
const DANBOORU_KEY = "uerqPatsej3oeAX1qsRAJr1Y";

// --- Global Variables ---
let selectedApi = "rule34"; // default API is Rule34
let currentPage = 1;
let currentQuery = "";
let isFetching = false;
let pinnedImageData = null;
let currentImageIndex = 0;

const loader = document.getElementById("loader");
const grid = document.getElementById("imageGrid");
const searchInput = document.getElementById("searchTerm");
const searchBtn = document.getElementById("searchBtn");

// --- Set up the API dropdown selector ---
const apiSelect = document.getElementById("apiSelect");
if (apiSelect) {
  apiSelect.addEventListener("change", function () {
    selectedApi = apiSelect.value;
    let lower = selectedApi.charAt(0).toUpperCase() + selectedApi.slice(1);
    showToast(`Switched to ${lower} API`); // Disable search for APIs other than Rule34, Danbooru, and Gelbooru

    if (selectedApi == "waifu") {
      searchInput.disabled = true;
      searchBtn.disabled = true;
      searchInput.placeholder = `Search disabled for ${lower} API`; // Dynamic placeholder
      searchInput.style.opacity = "0.25";
      searchBtn.style.opacity = "0.25";
    } else {
      searchInput.disabled = false;
      searchBtn.disabled = false;
      searchInput.placeholder = "Searching for something new..."; // Default placeholder
      searchInput.style.opacity = "1";
      searchBtn.style.opacity = "1";
    } // Clear and refresh images when API selection changes.

    currentPage = 1;
    grid.innerHTML = "";
    fetchImages(currentPage, currentQuery);
    autocompleteList.style.display = "none"; // **Point 3 Fix**: Hide autocomplete on API switch
  });
}
async function fetchAutocompleteSuggestions(api, queryPrefix) {
  if (api !== "rule34") return []; // Autocomplete only for Rule34 API

  let autocompleteUrl = "";
  if (api === "rule34") {
    autocompleteUrl = `https://api.rule34.xxx/autocomplete.php?q=${encodeURIComponent(
      queryPrefix
    )}`;
  } else {
    return []; // API doesn't support autocomplete
  }

  try {
    const response = await fetch(autocompleteUrl);
    if (!response.ok) {
      throw new Error(`Autocomplete HTTP error! status: ${response.status}`);
    }

    if (api === "rule34") {
      const jsonData = await response.json();
      return jsonData; // Rule34 returns array of tag strings directly
    }
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", error);
    return []; // Return empty array on error
  }
  return [];
}

searchInput.addEventListener("input", async function () {
  if (selectedApi !== "rule34") {
    // Autocomplete only for Rule34
    autocompleteList.style.display = "none";
    return;
  }

  const queryPrefix = this.value.trim();
  if (queryPrefix.length < 1) {
    // Start suggesting after 2 characters
    autocompleteList.style.display = "none";
    return;
  }

  const suggestions = await fetchAutocompleteSuggestions(
    selectedApi,
    queryPrefix
  );
  autocompleteList.innerHTML = ""; // Clear previous suggestions

  if (suggestions && suggestions.length > 0) {
    suggestions.forEach((suggestion) => {
      const li = document.createElement("li");
      li.textContent = suggestion.label; // Use suggestion.label to display the text
      li.addEventListener("click", function () {
        searchInput.value = suggestion.value; // Use suggestion.value to set search input
        doSearch(); // Or just fill and wait for search button/enter
        autocompleteList.style.display = "none";
      });
      autocompleteList.appendChild(li);
    });
    autocompleteList.style.display = "block";
  } else {
    autocompleteList.style.display = "none"; // Hide if no suggestions
  }
});
function showLoader(show) {
  loader.style.display = show ? "block" : "none";
}

function showToast(message) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  gsap.to(toast, { opacity: 1, duration: 0.5 });
  setTimeout(function () {
    gsap.to(toast, {
      opacity: 0,
      duration: 0.5,
      onComplete: function () {
        toastContainer.removeChild(toast);
      },
    });
  }, 2000);
}

function processTags(tags) {
  if (selectedApi === "rule34") {
    let tagsArray = tags.split(" ");
    return tagsArray.slice(0, 4).join(" ");
  } else {
    const uniqueTags = [
      ...new Set(
        tags.split(",").map(function (tag) {
          return tag.trim();
        })
      ),
    ];
    return uniqueTags.join(" ");
  }
}

function enforceQueryLimit(query) {
  if (query.length <= 100) return query;
  let truncatedQuery = query.substring(0, 100);
  const lastSpaceIndex = truncatedQuery.lastIndexOf(" ");
  if (lastSpaceIndex !== -1) {
    truncatedQuery = truncatedQuery.substring(0, lastSpaceIndex);
  }
  return truncatedQuery;
}

function normalizeImage(image) {
  if (selectedApi === "rule34") {
    return {
      id: image.id,
      thumb: image.preview_url || image.file_url,
      full: image.file_url,
      tags: image.tags,
    };
  } else if (selectedApi === "danbooru") {
    return {
      id: image.id,
      thumb: image.preview_file_url,
      full: image.file_url || image.preview_file_url, // fallback if file_url is undefined
      tags: image.tag_string,
    };
  } else if (selectedApi === "yande") {
    console.log("Yande.re normalizeImage input:", image); // <--- VERY IMPORTANT: IS THIS LINE PRESENT?
    return {
      id: image.id,
      thumb: image.preview_url, // yande.re returns preview_url
      full: image.file_url,
      tags: image.tags,
    };
  } else if (selectedApi === "konachan") {
    return {
      id: image.id,
      thumb: image.preview_url, // konachan returns preview_url
      full: image.file_url,
      tags: image.tags,
    };
  } else if (selectedApi === "waifu") {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      thumb: image.url,
      full: image.url,
      tags: "",
    };
  } else if (selectedApi === "gelbooru") {
    // For Gelbooru, use preview_url and file_url; tags are returned as a space-delimited string.
    return {
      id: image.id,
      thumb: image.preview_url,
      full: image.file_url,
      tags: image.tags,
    };
  } else {
    return image;
  }
}

async function fetchImages(page = 1, query = "") {
  isFetching = true;
  showLoader(true);
  let images = []; // If Waifu.pics is selected, ignore query and fetch random images

  if (selectedApi === "waifu") {
    const waifuEndpoints = [
      "https://api.waifu.pics/nsfw/waifu",
      "https://api.waifu.pics/nsfw/blowjob",
      "https://api.waifu.pics/nsfw/neko",
    ];
    const count = 10;
    const promises = [];
    for (let i = 0; i < count; i++) {
      const randomEndpoint =
        waifuEndpoints[Math.floor(Math.random() * waifuEndpoints.length)];
      promises.push(
        fetch(randomEndpoint).then(function (res) {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
      );
    }
    try {
      const results = await Promise.all(promises);
      images = results.map(function (data) {
        return normalizeImage(data);
      });
      await displayImages(images);
    } catch (error) {
      console.error("Error fetching images from waifu.pics:", error);
      showToast("Unable to load images right now. Please try again.");
    } finally {
      isFetching = false;
      showLoader(false);
    }
    return;
  } // For other APIs (Rule34, Danbooru, Yande.re, Gelbooru, Konachan):

  const encodedQuery = encodeURIComponent(enforceQueryLimit(query));
  let url = "";
  let apiKey = selectedApi === "danbooru" ? DANBOORU_KEY : ""; // API key only needed for Danbooru // Modify the URL as needed for the APIs

  if (selectedApi === "rule34") {
    url = query
      ? `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodedQuery}&pid=${
          page - 1
        }`
      : `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&pid=${
          page - 1
        }`;
  } else if (selectedApi === "danbooru") {
    url = query
      ? `https://danbooru.donmai.us/posts.json?tags=${encodedQuery}&page=${page}`
      : `https://danbooru.donmai.us/posts.json?page=${page}`;
  } else if (selectedApi === "yande") {
    url = query
      ? `https://yande.re/post.json?tags=${encodedQuery}&page=${page}`
      : `https://yande.re/post.json?page=${page}`;
  } else if (selectedApi === "gelbooru") {
    url = query
      ? `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&pid=${page}&tags=${encodedQuery}`
      : `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&pid=${page}`;
  } else if (selectedApi === "konachan") {
    url = query
      ? `https://konachan.com/post.json?tags=${encodedQuery}&page=${page}`
      : `https://konachan.com/post.json?page=${page}`;
  } // --- Use proxy for APIs that may need it ---

  const useProxy = ["yande", "gelbooru", "konachan"].includes(selectedApi);
  const proxiedUrl = useProxy
    ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    : url;

  try {
    const response = await fetch(proxiedUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    let data = await response.json();

    if (useProxy) {
      try {
        data = JSON.parse(data.contents); // Parse content from proxy
      } catch (e) {
        console.error("Error parsing proxied JSON content:", e);
        showToast("Failed to parse API response.");
        return;
      }
    } // Handle Konachan API (since it returns the JSON string inside the 'contents' field)

    if (selectedApi === "konachan" && typeof data === "string") {
      // Corrected condition
      try {
        const parsedContents = JSON.parse(data);
        images = parsedContents.map(function (img) {
          return normalizeImage(img);
        });
      } catch (e) {
        console.error("Error parsing Konachan JSON:", e);
        showToast("Failed to parse Konachan API response.");
        return;
      }
    } else if (selectedApi === "gelbooru") {
      if (data && data.post) {
        // Gelbooru wraps images in a 'post' array
        images = data.post.map(function (img) {
          return normalizeImage(img);
        });
      } else if (Array.isArray(data)) {
        // Fallback in case API changes structure
        images = data.map(function (img) {
          return normalizeImage(img);
        });
      } else {
        images = []; // No images found or unexpected structure
      }
    } else if (Array.isArray(data)) {
      images = data.map(function (img) {
        return normalizeImage(img);
      });
    } else if (data && Array.isArray(data.post)) {
      // For APIs like Gelbooru that might wrap in 'post'
      images = data.post.map(function (img) {
        return normalizeImage(img);
      });
    } else if (
      selectedApi !== "waifu" &&
      (!Array.isArray(data) || data.length === 0)
    ) {
      // Check for empty array for non-waifu APIs
      showToast("No images found for your search.");
      images = []; // Ensure images is empty array to prevent further issues
    }

    await displayImages(images);
  } catch (error) {
    console.error("Error fetching images from external API:", error);
    showToast("Unable to load images right now. Please try again.");
  } finally {
    isFetching = false;
    showLoader(false);
  }
}

function doSearch() {
  if (selectedApi === "waifu") {
    showToast(
      "Search is disabled for Waifu.pics – fetching random images instead."
    );
    currentQuery = "";
  } else {
    currentQuery = document.getElementById("searchTerm").value.trim();
  }
  currentPage = 1;
  pinnedImageData = null;
  grid.innerHTML = "";
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  fetchImages(currentPage, currentQuery);
}

async function handleDownload(e, image) {
  e.stopPropagation();
  e.preventDefault();
  const imageUrl = image.full;

  try {
    const response = await fetch(
      `/api/proxy?imageUrl=${encodeURIComponent(imageUrl)}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = objectURL; // Extract filename from URL or default to image ID

    let filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
    if (!filename) {
      filename = `${image.id}.jpeg`; // Default filename
    } // Ensure extension is present and reasonable, fallback to .jpeg if needed
    if (!filename.includes(".")) {
      filename += ".jpeg";
    } else if (filename.split(".").pop().length > 4) {
      // Very long extension is suspicious
      filename = `${image.id}.jpeg`;
    }

    tempLink.download = filename;

    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(objectURL);
    showToast("Thank you for downloading!");
  } catch (error) {
    console.error("Error downloading image:", error);
    showToast("Unable to download the image.");
  }
}

function handleImageClick(e, imageData, container) {
  if (e.target.closest(".download-btn")) return;
  pinnedImageData = imageData;
  let query = "";
  let numTags = 2; // Default number of tags for Danbooru and Yandere

  if (selectedApi === "rule34") {
    numTags = 5; // Use 5 tags for Rule34
  } else if (selectedApi === "danbooru" || "gelbooru") {
    numTags = 2;
  } else if (selectedApi === "yande" || selectedApi === "konachan") {
    numTags = 4;
  }
  // For Rule34, Danbooru, and Yandere, take the specified number of tags
  // and filter out any tag that contains a colon (or any unwanted character)
  if (
    selectedApi === "rule34" ||
    selectedApi === "danbooru" ||
    selectedApi === "konachan" ||
    selectedApi === "gelbooru" ||
    selectedApi === "yande"
  ) {
    let tagsArray = imageData.tags
      .split(" ")
      .filter((tag) => !tag.includes(":"));
    query = tagsArray.slice(0, numTags).join(" ");
  } else {
    query = processTags(imageData.tags); // For other APIs, use existing processTags
  }

  if (!query && selectedApi !== "waifu") {
    showToast("No valid tags available for search.");
    return;
  }
  currentPage = 1;
  grid.innerHTML = "";
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  displayPinnedImage(imageData);
  showToast("Searching for similar images...");
  if (selectedApi === "waifu") {
    fetchImages(currentPage, "");
  } else {
    fetchImages(currentPage, query);
  }
}
function displayPinnedImage(image) {
  const container = document.createElement("div");
  container.classList.add("img-container");
  container.setAttribute("role", "button");
  container.setAttribute("tabindex", "0");
  container.setAttribute("aria-label", "Click to search for similar images");
  container.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  const img = document.createElement("img");
  img.src = image.full;
  img.alt = image.tags;
  container.appendChild(img);

  const downloadLink = document.createElement("a");
  downloadLink.classList.add("download-btn");
  downloadLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
        <path d="m17 22 3-3"/>
        <circle cx="9" cy="9" r="2"/></svg>`;
  downloadLink.href = image.full;
  downloadLink.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(e, image);
  });
  container.appendChild(downloadLink);
  gsap.from(container, {
    duration: 0.5,
    opacity: 0,
    scale: 0.95,
    ease: "back.out(1.7)",
  });
}

async function displayImages(images) {
  const imagesToDisplay = images; // Keep limit for now
  imagesToDisplay.forEach(function (image) {
    if (pinnedImageData && image.id === pinnedImageData.id) return;
    const container = document.createElement("div");
    container.classList.add("img-container");
    container.setAttribute("role", "button");
    container.setAttribute("tabindex", "0");
    container.setAttribute("aria-label", "Click to search for similar images");

    const img = document.createElement("img");
    img.src = selectedApi === "yande" ? image.thumb : image.full || image.thumb;
    img.alt = image.tags;
    container.appendChild(img);

    const downloadLink = document.createElement("a");
    downloadLink.classList.add("download-btn");
    downloadLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
        <path d="m17 22 3-3"/>
        <circle cx="9" cy="9" r="2"/></svg>`;
    downloadLink.href = image.full; // Keep full image for download
    downloadLink.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleDownload(e, image);
    });
    container.appendChild(downloadLink);
    container.addEventListener("click", function (e) {
      handleImageClick(e, image, container);
    });

    grid.appendChild(container);
    gsap.from(container, {
      duration: 0.5,
      opacity: 0,
      scale: 0.95,
      ease: "back.out(1.7)",
    });
  });
  if (grid.offsetHeight < window.innerHeight * 2 && !isFetching) {
    currentPage++;
    fetchImages(currentPage, currentQuery);
  }
}

function typeWriter() {
  if (selectedApi === "waifu") {
    let placeholderText = "Search disabled for Waifu.pics";
    if (placeholderIndex <= placeholderText.length) {
      searchInput.setAttribute(
        "placeholder",
        placeholderText.substring(0, placeholderIndex)
      );
      placeholderIndex++;
      setTimeout(typeWriter, 150);
    } else {
      setTimeout(() => {
        placeholderIndex = 0;
        typeWriter();
      }, 2000);
    }
  } else {
    let placeholderText = "Searching for something new...";
    if (placeholderIndex <= placeholderText.length) {
      searchInput.setAttribute(
        "placeholder",
        placeholderText.substring(0, placeholderIndex)
      );
      placeholderIndex++;
      setTimeout(typeWriter, 150);
    } else {
      setTimeout(() => {
        placeholderIndex = 0;
        typeWriter();
      }, 2000);
    }
  }
}

let placeholderIndex = 0;

const observerOptions = { rootMargin: "0px 0px 1000px 0px" };
const observer = new IntersectionObserver(function (entries) {
  if (entries[0].isIntersecting && !isFetching) {
    currentPage++;
    fetchImages(currentPage, currentQuery);
  }
}, observerOptions);
observer.observe(document.getElementById("sentinel"));

document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("searchTerm").addEventListener("keydown", function (e) {
  if (e.key === "Enter") doSearch();
});
// --- Custom Dropdown Functionality (in script.js) ---
const apiDropdownContainer = document.getElementById("apiDropdownContainer");
const apiDropdownButton = document.getElementById("apiDropdownButton");
const apiDropdownList = document.getElementById("apiDropdownList");
const dropdownItems = document.querySelectorAll(".dropdown-item"); // Select all dropdown items

apiDropdownButton.addEventListener("click", function () {
  apiDropdownList.classList.toggle("show"); // Toggle 'show' class to display/hide list
});

dropdownItems.forEach((item) => {
  item.addEventListener("click", function () {
    const apiValue = this.dataset.value; // Get API value from data-value attribute
    const apiName = this.querySelector(".item-title").textContent; // Get API name from item-title

    selectedApi = apiValue; // Update global selectedApi variable
    apiDropdownButton.firstChild.textContent = apiName; // Update button text

    apiDropdownList.classList.remove("show"); // Hide dropdown list after selection

    let lower = selectedApi.charAt(0).toUpperCase() + selectedApi.slice(1);
    showToast(`Switched to ${lower} API`); // <--- showToast is called HERE, in script.js scope

    // --- Disable/Enable Search Input (like before) ---
    if (selectedApi === "waifu") {
      searchInput.disabled = true;
      searchBtn.disabled = true;
      searchInput.placeholder = "Search disabled for Waifu.pics";
      searchInput.style.opacity = "0.25";
      searchBtn.style.opacity = "0.25";
    } else {
      searchInput.disabled = false;
      searchBtn.disabled = false;
      searchInput.placeholder = "";
      searchInput.style.opacity = "1";
      searchBtn.style.opacity = "1";
    }

    // --- Clear and refresh images (like before) ---
    currentPage = 1;
    grid.innerHTML = "";
    fetchImages(currentPage, currentQuery);
  });
});

// Close dropdown when clicking outside of it
window.addEventListener("click", function (event) {
  if (!apiDropdownContainer.contains(event.target)) {
    apiDropdownList.classList.remove("show");
  }
});
const initialTags = [
  "ass",
  "artwork",
  "original",
  "tagme",
  "solo",
  "1girl",
  "cum",
  "breasts",
  "cleavage",
  "nude",
  "panties",
  "pussy",
  "barefoot",
  "cameltoe",
  "pantyhose",
  "spread_legs",
  "uncensored",
  "dark_skin",
  "stockings",
  "pussy_juice",
  "kneehighs",
  "topless",
  "anus",
  "ahegao",
  "feet",
];

function getRandomTag() {
  const randomIndex = Math.floor(Math.random() * initialTags.length);
  return initialTags[randomIndex];
}
document.addEventListener("DOMContentLoaded", function () {
  gsap.from(".title-box", {
    duration: 1,
    opacity: 0,
    y: -50,
    ease: "power2.out",
  });
  gsap.from(".image-grid", {
    duration: 1,
    opacity: 0,
    y: -20,
    ease: "power2.out",
    delay: 0.5,
  });
  gsap.from(".search-container", {
    duration: 1,
    opacity: 0,
    y: -20,
    ease: "power2.out",
    delay: 0.5,
  });
  typeWriter();
  const initialQueryTag = getRandomTag();
  fetchImages(currentPage, initialQueryTag);
  showToast(`Loading initial images for tag: "${initialQueryTag}"`); // Optional toast to show initial tag
});
