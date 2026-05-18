const API_BASE = '';

export async function fetchAPI(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getHome() {
  return fetchAPI('/api/home');
}

export async function searchAnime(q, page = 1) {
  return fetchAPI(`/api/search?q=${encodeURIComponent(q)}&page=${page}`);
}

export async function getAnimeDetail(slug) {
  return fetchAPI(`/api/anime/${slug}`);
}

export async function getEpisodeSources(slug, episode) {
  return fetchAPI(`/api/episode/${slug}/${episode}`);
}

export async function browse(category, value = '', page = 1) {
  const path = value ? `${category}/${value}` : category;
  return fetchAPI(`/api/browse/${path}?page=${page}`);
}

export async function getFilters() {
  return fetchAPI('/api/filters');
}
