import axios from 'axios';
import { scraperCache } from './cache';

export const BASE_URL = 'https://anikototv.to';

const defaultHeaders: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://anikototv.to/',
  'Origin': 'https://anikototv.to',
};

// For full page HTML (no baseURL needed since paths may point to different domains)
export async function fetchHTML(path: string, queryParams: Record<string, string | number> = {}): Promise<string> {
  return scraperCache.getOrFetch('html', path, queryParams, async () => {
    const fullPath = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const { data } = await axios.get<string>(fullPath, {
      params: queryParams,
      headers: defaultHeaders,
      timeout: 15000,
      maxRedirects: 5,
    });
    return data;
  });
}

// For JSON API endpoints on anikototv.to
export async function fetchJSON<T = unknown>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  return scraperCache.getOrFetch('json', path, params, async () => {
    const { data } = await axios.get<T>(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      params,
      headers: {
        ...defaultHeaders,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 15000,
    });
    return data;
  });
}

// For external JSON APIs (like the mapper)
export async function fetchExternalJSON<T = unknown>(url: string): Promise<T> {
  return scraperCache.getOrFetch('external', url, {}, async () => {
    const { data } = await axios.get<T>(url, {
      headers: {
        'User-Agent': defaultHeaders['User-Agent'],
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 15000,
    });
    return data;
  });
}
