import axios from 'axios';

const BASE_URL = 'https://anikototv.to';

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://anikototv.to/',
  'Origin': 'https://anikototv.to',
};

// For full page HTML (no baseURL needed since paths may point to different domains)
async function fetchHTML(path, queryParams = {}) {
  const fullPath = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const { data } = await axios.get(fullPath, {
    params: queryParams,
    headers: defaultHeaders,
    timeout: 15000,
    maxRedirects: 5,
  });
  return data;
}

// For JSON API endpoints on anikototv.to
async function fetchJSON(path, params = {}) {
  const { data } = await axios.get(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    params,
    headers: {
      ...defaultHeaders,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/plain, */*',
    },
    timeout: 15000,
  });
  return data;
}

// For external JSON APIs (like the mapper)
async function fetchExternalJSON(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': defaultHeaders['User-Agent'],
      'Accept': 'application/json, text/plain, */*',
    },
    timeout: 15000,
  });
  return data;
}

export { fetchHTML, fetchJSON, fetchExternalJSON, BASE_URL };
