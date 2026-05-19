import type { ApiResponse, HomeData, SearchData, AnimeDetail, EpisodeSources, BrowseResult, Filters } from '@/types';

const API_BASE = '';

async function fetchAPI<T>(endpoint: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getHome(): Promise<ApiResponse<HomeData>> {
  return fetchAPI<HomeData>('/api/home');
}

export async function searchAnime(q: string, page: number = 1): Promise<ApiResponse<SearchData>> {
  return fetchAPI<SearchData>(`/api/search?q=${encodeURIComponent(q)}&page=${page}`);
}

export async function getAnimeDetail(slug: string): Promise<ApiResponse<AnimeDetail>> {
  return fetchAPI<AnimeDetail>(`/api/anime/${slug}`);
}

export async function getEpisodeSources(slug: string, episode: string | number): Promise<ApiResponse<EpisodeSources>> {
  return fetchAPI<EpisodeSources>(`/api/episode/${slug}/${episode}`);
}

export async function browse(category: string, value: string = '', page: number = 1): Promise<ApiResponse<BrowseResult>> {
  const path = value ? `${category}/${value}` : category;
  return fetchAPI<BrowseResult>(`/api/browse/${path}?page=${page}`);
}

export async function getFilters(): Promise<ApiResponse<Filters>> {
  return fetchAPI<Filters>('/api/filters');
}
