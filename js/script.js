import { getNextApiKey } from './apikeys.js';

// --- Global Variables ---
let selectedApi = 'rule34'; // default API is Rule34
let currentPage = 1;
let currentQuery = '';
let isFetching = false;
let pinnedImageData = null;

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

// --- Autocomplete Setup ---
const autoCompleteList = document.createElement('ul');
autoCompleteList.id = "autocompleteList";
autoCompleteList.style.position = "absolute";
autoCompleteList.style.zIndex = "1000";
autoCompleteList.style.listStyleType = "none";
autoCompleteList.style.margin = "0";
autoCompleteList.style.padding = "0";
autoCompleteList.style.background = "#333";
autoCompleteList.style.color = "#fff";
document.body.appendChild(autoCompleteList);

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => { func.apply(this, args); }, delay);
  };
}

async function autocompleteHandler(query) {
  if (!query) {
    autoCompleteList.innerHTML = "";
    return;
  }
  let url = "";
  // Build URL for APIs that support tag search (Rule34, Danbooru, Yande.re, Gelbooru)
  if (selectedApi === "rule34") {
    url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${encodeURIComponent(query)}`;
  } else if (selectedApi === "danbooru") {
    url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(query)}&limit=10&page=1`;
  } else if (selectedApi === "yande") {
    url = `https://yande.re/post.json?tags=${encodeURIComponent(query)}&limit=10&page=1`;
  } else {
    autoCompleteList.innerHTML = "";
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const posts = await response.json();
    let suggestionsSet = new Set();
    posts.forEach(function(post) {
      let tagsStr = "";
      if (selectedApi === "danbooru") {
        tagsStr = post.tag_string || "";
      } else if (selectedApi === "yande") {
        tagsStr = post.tags || "";
      } else {
        tagsStr = post.tags || "";
      }
      tagsStr.split(" ").forEach(function(tag) {
        if (tag.toLowerCase().startsWith(query.toLowerCase())) {
          suggestionsSet.add(tag);
        }
      });
    });
    const suggestions = Array.from(suggestionsSet);
    showAutocompleteSuggestions(suggestions);
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", error);
  }
}

function showAutocompleteSuggestions(suggestions) {
  const rect = searchInput.getBoundingClientRect();
  autoCompleteList.style.top = `${rect.bottom + window.scrollY}px`;
  autoCompleteList.style.left = `${rect.left + window.scrollX}px`;
  autoCompleteList.style.width = `${rect.width}px`;
  
  autoCompleteList.innerHTML = "";
  suggestions.forEach(function(suggestion) {
    const li = document.createElement("li");
    li.style.padding = "5px";
    li.style.cursor = "pointer";
    li.textContent = suggestion;
    li.addEventListener("mousedown", function(e) {
      e.preventDefault();
      searchInput.value = suggestion;
      autoCompleteList.innerHTML = "";
    });
    autoCompleteList.appendChild(li);
  });
}

// Attach autocomplete event listener for APIs that support tag search
searchInput.addEventListener("input", debounce(function(e) {
  if (selectedApi === "rule34" || selectedApi === "danbooru" || selectedApi === "yande") {
    autocompleteHandler(e.target.value.trim());
  } else {
    autoCompleteList.innerHTML = "";
  }
}, 300));

searchInput.addEventListener("blur", function() {
  setTimeout(function() { autoCompleteList.innerHTML = ""; }, 200);
});

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
  
  // If Waifu.pics is selected, ignore query and fetch multiple random images.
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
  
  // For Rule34, Danbooru, Yande.re, Gelbooru:
  const encodedQuery = encodeURIComponent(enforceQueryLimit(query));
  let url = "";
  let apiKey = getNextApiKey(selectedApi); // may be empty
  
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
  }
  
  console.log(`Fetching ${selectedApi} URL:`, url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (selectedApi === 'danbooru' || selectedApi === 'yande' || selectedApi === 'gelbooru') {
      if (data.length === 0) {
        showToast('No images found for your search.');
      } else {
        images = data.map(function(img) { return normalizeImage(img); });
      }
    } else if (selectedApi === 'rule34') {
      if (!data || data.length === 0) {
        showToast('No images found for your search.');
      } else {
        images = data.map(function(img) { return normalizeImage(img); });
      }
    }
    
    await displayImages(images);
  } catch (error) {
    console.error(`Error fetching images from ${selectedApi}:`, error);
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
async function handleDownload(e, image) {
  e.stopPropagation();
  e.preventDefault();
  const imageUrl = image.full;
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = objectURL;
    
    let extension = "jpg";
    const urlParts = imageUrl.split(".");
    if (urlParts.length > 1) {
      extension = urlParts[urlParts.length - 1].split("?")[0];
    }
    
    tempLink.download = `${selectedApi}-${image.id}.${extension}`;
    
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

// --- HYBRID FAVOURITES FUNCTIONALITY ---
// (Note: When saving favorites from the main page, ensure each favorite includes a property "api" with the current selectedApi.)
function handleFavourite(imageData) {
  let favourites = JSON.parse(localStorage.getItem('favourites') || '[]');
  const exists = favourites.some(function(fav) {
    return fav.isFull ? fav.data.id === imageData.id : fav.id === imageData.id;
  });
  if (exists) {
    showToast('Image is already in favourites.');
    return;
  }
  let newFavourite;
  if (favourites.length < 25) {
    newFavourite = {
      api: selectedApi,
      isFull: true,
      data: imageData
    };
  } else {
    newFavourite = {
      api: selectedApi,
      isFull: false,
      id: imageData.id,
      thumb: imageData.thumb
    };
  }
  favourites.push(newFavourite);
  localStorage.setItem('favourites', JSON.stringify(favourites));
  showToast('Image added to favourites!');
}

function handleImageClick(e, imageData, container) {
  if (e.target.closest('.download-btn') || e.target.closest('.favourite-btn')) return;
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
  
  const favouriteBtn = document.createElement('button');
  favouriteBtn.classList.add('favourite-btn');
  favouriteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
    </svg>`;
  favouriteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    handleFavourite(image);
  });
  container.appendChild(favouriteBtn);
  
  grid.appendChild(container);
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
    
    const favouriteBtn = document.createElement('button');
    favouriteBtn.classList.add('favourite-btn');
    favouriteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>`;
    favouriteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      handleFavourite(image);
    });
    container.appendChild(favouriteBtn);
    
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
