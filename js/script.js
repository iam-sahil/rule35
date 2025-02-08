import { getNextApiKey } from './apikeys.js';

// --- Global Variables ---
let selectedApi = 'rule34'; // default API is Rule34
let currentPage = 1;
let currentQuery = '';
let isFetching = false;
let pinnedImageData = null;
let currentImageIndex = 0;

const loader = document.getElementById('loader');
const grid = document.getElementById('imageGrid');
const searchInput = document.getElementById("searchTerm");
const searchBtn = document.getElementById("searchBtn");

// --- Set up the API dropdown selector ---
const apiSelect = document.getElementById("apiSelect");
if (apiSelect) {
  apiSelect.addEventListener("change", function() {
    selectedApi = apiSelect.value;
    let lower = selectedApi.charAt(0).toUpperCase() + selectedApi.slice(1);
    showToast(`Switched to ${lower} API`);
    // If Waifu.pics is selected, disable the search input and button
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
    // Clear and refresh images when the API selection changes.
    currentPage = 1;
    grid.innerHTML = "";
    fetchImages(currentPage, currentQuery);
  });
}

// --- Helper Functions (unchanged) ---
function showLoader(show) {
  loader.style.display = show ? 'block' : 'none';
}

function showToast(message) {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  gsap.to(toast, { opacity: 1, duration: 0.5 });
  setTimeout(function() {
    gsap.to(toast, {
      opacity: 0,
      duration: 0.5,
      onComplete: function() { toastContainer.removeChild(toast); },
    });
  }, 2000);
}

function processTags(tags) {
  // For Rule34, use only the first 1-2 tags to avoid overly long queries.
  if (selectedApi === "rule34") {
    let tagsArray = tags.split(" ");
    return tagsArray.slice(0, 2).join(" ");
  } else {
    const uniqueTags = [...new Set(tags.split(',').map(function(tag) { return tag.trim(); }))];
    return uniqueTags.join(' ');
  }
}

function enforceQueryLimit(query) {
  if (query.length <= 100) return query;
  let truncatedQuery = query.substring(0, 100);
  const lastSpaceIndex = truncatedQuery.lastIndexOf(' ');
  if (lastSpaceIndex !== -1) {
    truncatedQuery = truncatedQuery.substring(0, lastSpaceIndex);
  }
  return truncatedQuery;
}

/**
 * normalizeImage:
 * Converts a raw API image object into a unified object with properties:
 * id, thumb, full, and tags.
 */
function normalizeImage(image) {
  if (selectedApi === 'rule34') {
    return {
      id: image.id,
      thumb: image.preview_url || image.file_url,
      full: image.file_url,
      tags: image.tags
    };
  } else if (selectedApi === 'danbooru') {
    return {
      id: image.id,
      thumb: image.preview_file_url,
      full: image.file_url || image.preview_file_url, // fallback if file_url is undefined
      tags: image.tag_string
    };  
  } else if (selectedApi === 'yande') {
    return {
      id: image.id,
      thumb: image.preview_url, // yande.re returns preview_url
      full: image.file_url,
      tags: image.tags
    };
  } else if (selectedApi === 'konachan') {
    return {
      id: image.id,
      thumb: image.preview_url, // konachan returns preview_url
      full: image.file_url,
      tags: image.tags
    };
  } else if (selectedApi === 'waifu') {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      thumb: image.url,
      full: image.url,
      tags: ""
    };
  } else if (selectedApi === 'gelbooru') {
    // For Gelbooru, use preview_url and file_url; tags are returned as a space-delimited string.
    return {
      id: image.id,
      thumb: image.preview_url,
      full: image.file_url,
      tags: image.tags
    };
  } else {
    return image;
  }
}

// --- API FETCHING ---
async function fetchImages(page = 1, query = '') {
  isFetching = true;
  showLoader(true);
  let images = [];
  
  // If Waifu.pics is selected, ignore query and fetch random images
  if (selectedApi === 'waifu') {
    const waifuEndpoints = [
      "https://api.waifu.pics/nsfw/waifu",
      "https://api.waifu.pics/nsfw/blowjob",
      "https://api.waifu.pics/nsfw/neko"
    ];
    const count = 10;
    const promises = [];
    for (let i = 0; i < count; i++) {
      const randomEndpoint = waifuEndpoints[Math.floor(Math.random() * waifuEndpoints.length)];
      promises.push(
        fetch(randomEndpoint).then(function(res) {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
      );
    }
    try {
      const results = await Promise.all(promises);
      images = results.map(function(data) {
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
  }
  
  // For other APIs (Rule34, Danbooru, Yande.re, Gelbooru, Konachan):
  const encodedQuery = encodeURIComponent(enforceQueryLimit(query));
  let url = "";
  let apiKey = getNextApiKey(selectedApi); // may be empty
  
  // Modify the URL as needed for the APIs
  if (selectedApi === 'rule34') {
    url = query
      ? `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodedQuery}&pid=${page - 1}`
      : `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&pid=${page - 1}`;
  } else if (selectedApi === 'danbooru') {
    url = query
    ? `https://danbooru.donmai.us/posts.json?tags=${encodedQuery}&page=${page}`
    : `https://danbooru.donmai.us/posts.json?page=${page}`;  
  } else if (selectedApi === 'yande') {
    url = query
      ? `https://yande.re/post.json?tags=${encodedQuery}&page=${page}`
      : `https://yande.re/post.json?page=${page}`;
  } else if (selectedApi === 'gelbooru') {
    url = query
      ? `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&page=${page}&tags=${encodedQuery}`
      : `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&page=${page}`;
  } else if (selectedApi === 'konachan') {
    url = query
      ? `https://konachan.com/post.json?tags=${encodedQuery}&page=${page}`
      : `https://konachan.com/post.json?page=${page}`;
  }
    
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      images = data.map(function(img) { return normalizeImage(img); });
    } else {
      console.error(`Expected an array, but received: ${typeof data}`);
      showToast('No images found for your search.');
    }
    
    await displayImages(images);
  } catch (error) {
    console.error("Error fetching images from external API:", error);
    showToast('Unable to load images right now. Please try again.');
  } finally {
    isFetching = false;
    showLoader(false);
  }
}

// --- SEARCH HANDLER ---
function doSearch() {
  if (selectedApi === "waifu") {
    showToast("Search is disabled for Waifu.pics – fetching random images instead.");
    currentQuery = "";
  } else {
    currentQuery = document.getElementById('searchTerm').value.trim();
  }
  currentPage = 1;
  pinnedImageData = null;
  grid.innerHTML = '';
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  fetchImages(currentPage, currentQuery);
}

// --- IMAGE DOWNLOAD ---
// (Handle download functionality for images from all APIs)

async function handleDownload(e, image) {
  e.stopPropagation();
  e.preventDefault();
  const imageUrl = image.full;
  
  try {
    const response = await fetch(`/api/proxy?imageUrl=${encodeURIComponent(imageUrl)}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = objectURL;
    tempLink.download = `${image.id}.jpeg`;

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
  if (e.target.closest('.download-btn')) return;
  pinnedImageData = imageData;
  let query = "";
  if (selectedApi === "rule34" || selectedApi === "danbooru" || selectedApi === "yande") {
    // For Danbooru (and Rule34), take only the first 1-2 tags
    // and filter out any tag that contains a colon (or any unwanted character)
    let tagsArray = imageData.tags.split(" ").filter(tag => !tag.includes(":"));
    query = tagsArray.slice(0, 2).join(" ");
  } else {
    query = processTags(imageData.tags);
  }
  if (!query && selectedApi !== "waifu") {
    showToast('No valid tags available for search.');
    return;
  }
  currentPage = 1;
  grid.innerHTML = '';
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  displayPinnedImage(imageData);
  showToast('Searching for similar images...');
  if (selectedApi === "waifu") {
    fetchImages(currentPage, "");
  } else {
    fetchImages(currentPage, query);
  }
}


// --- RENDERING FUNCTIONS ---
function displayPinnedImage(image) {
  const container = document.createElement('div');
  container.classList.add('img-container');
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', 'Click to search for similar images');
  container.addEventListener('click', function(e) { e.stopPropagation(); });
  
  const img = document.createElement('img');
  img.src = image.full || image.thumb;
  img.alt = image.tags;
  container.appendChild(img);
  
  const downloadLink = document.createElement('a');
  downloadLink.classList.add('download-btn');
  downloadLink.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
         fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
      <path d="m14 19 3 3v-5.5"/>
      <path d="m17 22 3-3"/>
      <circle cx="9" cy="9" r="2"/>
    </svg>`;
  downloadLink.href = image.full;
  downloadLink.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(e, image);
  });
  container.appendChild(downloadLink);
  gsap.from(container, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
}

async function displayImages(images) {
  images.forEach(function(image) {
    if (pinnedImageData && image.id === pinnedImageData.id) return;
    const container = document.createElement('div');
    container.classList.add('img-container');
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', 'Click to search for similar images');
    
    const img = document.createElement('img');
    img.src = image.full || image.thumb;
    img.alt = image.tags;
    container.appendChild(img);
    
    const downloadLink = document.createElement('a');
    downloadLink.classList.add('download-btn');
    downloadLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
        <path d="m14 19 3 3v-5.5"/>
        <path d="m17 22 3-3"/>
        <circle cx="9" cy="9" r="2"/>
      </svg>`;
    downloadLink.href = image.full;
    downloadLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleDownload(e, image);
    });
    container.appendChild(downloadLink);
    container.addEventListener('click', function(e) {
      handleImageClick(e, image, container);
    });
    
    grid.appendChild(container);
    gsap.from(container, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
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
      searchInput.setAttribute("placeholder", placeholderText.substring(0, placeholderIndex));
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
      searchInput.setAttribute("placeholder", placeholderText.substring(0, placeholderIndex));
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
const observer = new IntersectionObserver(function(entries) {
  if (entries[0].isIntersecting && !isFetching) {
    currentPage++;
    fetchImages(currentPage, currentQuery);
  }
}, observerOptions);
observer.observe(document.getElementById("sentinel"));

document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("searchTerm").addEventListener("keydown", function(e) {
  if (e.key === "Enter") doSearch();
});

document.addEventListener("DOMContentLoaded", function() {
  gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
  gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  gsap.from(".search-container", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  typeWriter();
  fetchImages(currentPage, "aesthetic pussy");
});
