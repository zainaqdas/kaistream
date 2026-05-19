import type {
  FeaturedAnime,
  AnimeCardItem,
  AnimeDetail,
  SearchData,
  BrowseResult,
  Filters,
  FilterOption,
} from '@/types';

import { getCached, setCached } from './cache';

const ANILIST_URL = 'https://graphql.anilist.co';

const USER_AGENT = 'KaiStream/1.0 (anime streaming app)';

const MEDIA_CARD_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  genres
  averageScore
  episodes
  format
  status
  seasonYear
  season
  nextAiringEpisode { episode airingAt }
  isAdult
`;

const MEDIA_DETAIL_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description (asHtml: false)
  genres
  averageScore
  meanScore
  episodes
  duration
  format
  status
  seasonYear
  season
  source
  synonyms
  nextAiringEpisode { episode airingAt }
  startDate { year month day }
  endDate { year month day }
  studios(isMain: true) { nodes { name } }
  trailer { id site }
  isAdult
`;

interface GQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface PageResult<T> {
  Page?: {
    pageInfo?: { hasNextPage: boolean };
    media?: T[];
  };
}

// ===== Cache TTLs for AniList responses =====
const CACHE_TTLS: Record<string, number> = {
  home: 5 * 60 * 1000,      // 5 min — trending/popular/airing changes slowly
  search: 5 * 60 * 1000,     // 5 min — same query returns stable results
  browse: 10 * 60 * 1000,    // 10 min — genre/type/status lists
  filters: 24 * 60 * 60 * 1000, // 24h — GenreCollection rarely changes
  detail: 30 * 60 * 1000,    // 30 min — anime metadata is static
}

// Helper to map AniList format to our type string
function mapFormat(format: string): string {
  const formatMap: Record<string, string> = {
    TV: 'TV',
    TV_SHORT: 'TV Short',
    MOVIE: 'Movie',
    SPECIAL: 'Special',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Music',
  };
  return formatMap[format] || format;
}

// Helper to map AniList status to our status string
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    FINISHED: 'Completed',
    RELEASING: 'Ongoing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'Hiatus',
  };
  return statusMap[status] || status;
}

// Map AniList media to AnimeCardItem
function toAnimeCardItem(media: Record<string, unknown>): AnimeCardItem {
  const title = media.title as Record<string, string> || {};
  return {
    title: title.english || title.romaji || title.native || 'Unknown',
    japaneseTitle: title.native || null,
    slug: String(media.id),
    thumbnail: (media.coverImage as Record<string, string>)?.large || '',
    type: mapFormat(media.format as string),
    episodes: {
      sub: null,
      dub: null,
      total: (media.episodes as number) || null,
    },
    score: media.averageScore != null ? ((media.averageScore as number) / 10).toFixed(1) : undefined,
    rating: media.averageScore != null ? ((media.averageScore as number) / 10).toFixed(1) : undefined,
  };
}

// Map AniList media to FeaturedAnime (for hero carousel)
function toFeaturedAnime(media: Record<string, unknown>): FeaturedAnime {
  const title = media.title as Record<string, string> || {};
  const season = media.season as string;
  const seasonYear = media.seasonYear as number;
  const airedParts: string[] = [];
  if (season) airedParts.push(season.charAt(0) + season.slice(1).toLowerCase());
  if (seasonYear) airedParts.push(String(seasonYear));

  const description = (media.description as string) || '';
  // Strip HTML tags from description
  const cleanSynopsis = description.replace(/<[^>]*>/g, '').slice(0, 500);

  return {
    title: title.english || title.romaji || title.native || 'Unknown',
    japaneseTitle: title.native || null,
    slug: String(media.id),
    url: `/anime/${media.id}`,
    synopsis: cleanSynopsis || '',
    thumbnail: (media.bannerImage as string) || (media.coverImage as Record<string, string>)?.extraLarge || null,
    rating: media.averageScore != null ? ((media.averageScore as number) / 10).toFixed(1) : null,
    quality: null,
    airedDate: airedParts.join(' ') || null,
    hasSub: false,
    hasDub: false,
  };
}

// Generic GraphQL query helper with retry logic and timeout
async function gqlQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 15000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`AniList API error: ${res.status}`);
      }

      const json = (await res.json()) as GQLResponse<T>;
      if (json.errors) {
        throw new Error(`AniList: ${json.errors[0]?.message || 'Unknown error'}`);
      }
      return json.data as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's an abort/timeout on the last attempt
      if (attempt < MAX_RETRIES && (error as Error).name !== 'AbortError') {
        // Exponential backoff: 500ms, 1000ms, then throw
        const delay = 500 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('AniList request failed after retries');
}

// ===== Home Page =====
// Returns trending anime (for hero) + popular (for trending grid) + latest aired episodes (for latest)
export async function getHomeData(): Promise<{
  featured: FeaturedAnime[];
  trending: AnimeCardItem[];
  latestEpisodes: AnimeCardItem[];
}> {
  const cacheVars = { _nowBucket: Math.floor(Date.now() / (5 * 60 * 1000)) };
  const cached = await getCached<{
    featured: FeaturedAnime[];
    trending: AnimeCardItem[];
    latestEpisodes: AnimeCardItem[];
  }>('anilist.home', cacheVars, CACHE_TTLS.home);
  if (cached.found) return cached.data;
  const query = `
    query Home($trendingPage: Int, $popularPage: Int, $latestPage: Int, $now: Int) {
      trending: Page(page: $trendingPage, perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FIELDS}
        }
      }
      popular: Page(page: $popularPage, perPage: 12) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FIELDS}
        }
      }
      latest: Page(page: $latestPage, perPage: 50) {
        airingSchedules(sort: TIME_DESC, airingAt_lesser: $now) {
          id
          episode
          airingAt
          media {
            ${MEDIA_CARD_FIELDS}
          }
        }
      }
    }
  `;

  const now = Math.floor(Date.now() / 1000);

  const data = await gqlQuery<{
    trending: { media: Record<string, unknown>[] };
    popular: { media: Record<string, unknown>[] };
    latest: { airingSchedules: Array<{ media: Record<string, unknown> }> };
  }>(query, {
    trendingPage: 1,
    popularPage: 1,
    latestPage: 1,
    now,
  });

  // Deduplicate latest episodes by media ID (same anime may appear for multiple episodes)
  const seenIds = new Set<string>();
  const latest: AnimeCardItem[] = [];
  for (const entry of data.latest?.airingSchedules || []) {
    const mediaId = String(entry.media.id);
    if (!seenIds.has(mediaId) && !entry.media.isAdult) {
      seenIds.add(mediaId);
      latest.push(toAnimeCardItem(entry.media));
      if (latest.length >= 30) break;
    }
  }

  const result = {
    featured: (data.trending?.media || []).map(toFeaturedAnime),
    trending: (data.popular?.media || []).map(toAnimeCardItem),
    latestEpisodes: latest,
  };

  await setCached('anilist.home', cacheVars, result, CACHE_TTLS.home);
  return result;
}

// ===== Search =====
export async function searchAnimeGQL(keyword: string, page: number = 1): Promise<SearchData> {
  const cacheVars = { keyword: keyword.toLowerCase().trim(), page };
  const cached = await getCached<SearchData>('anilist.search', cacheVars, CACHE_TTLS.search);
  if (cached.found) return cached.data;
  const query = `
    query Search($search: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        pageInfo { hasNextPage }
        media(search: $search, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }
  `;

  const data = await gqlQuery<PageResult<Record<string, unknown>>>(query, {
    search: keyword,
    page,
  });

  const results = (data.Page?.media || []).map(toAnimeCardItem);

  const result: SearchData = {
    query: keyword,
    page,
    results,
    totalResults: results.length,
  };

  await setCached('anilist.search', cacheVars, result, CACHE_TTLS.search);
  return result;
}

// ===== Browse =====
// Maps our category slugs to AniList filter params
function mapBrowseVariables(category: string, value: string) {
  const vars: Record<string, string> = { type: 'ANIME', isAdult: 'false' };

  switch (category) {
    case 'genre':
      vars.genre = value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    case 'type': {
      const formatMap: Record<string, string> = {
        tv: 'TV',
        movie: 'MOVIE',
        ova: 'OVA',
        ona: 'ONA',
        special: 'SPECIAL',
        'tv-short': 'TV_SHORT',
        music: 'MUSIC',
      };
      vars.format = formatMap[value] || value.toUpperCase();
      break;
    }
    case 'status': {
      const statusMap: Record<string, string> = {
        ongoing: 'RELEASING',
        completed: 'FINISHED',
        upcoming: 'NOT_YET_RELEASED',
        cancelled: 'CANCELLED',
        hiatus: 'HIATUS',
      };
      vars.status = statusMap[value] || value.toUpperCase();
      break;
    }
  }
  return vars;
}

function buildBrowseWhereClause(vars: Record<string, string>): string {
  const parts: string[] = [];
  if (vars.genre) parts.push('genre: $genre');
  if (vars.format) parts.push('format: $format');
  if (vars.status) parts.push('status: $status');
  parts.push('type: ANIME', 'isAdult: false');
  return parts.join(', ');
}

export async function browseAnimeGQL(
  category: string,
  value: string = '',
  page: number = 1
): Promise<BrowseResult> {
  const cacheVars = { category, value: value.toLowerCase(), page };
  const cached = await getCached<BrowseResult>('anilist.browse', cacheVars, CACHE_TTLS.browse);
  if (cached.found) return cached.data;
  // Determine sort order
  let sort = 'POPULARITY_DESC';
  if (category === 'latest' || category === 'new') {
    sort = 'START_DATE_DESC';
  }

  const vars = mapBrowseVariables(category, value);
  const whereClause = buildBrowseWhereClause(vars);

  // Build the GQL variable declarations dynamically based on which filters are active
  const varDecls: string[] = ['$page: Int'];
  const varValues: Record<string, unknown> = { page };
  if (vars.genre) { varDecls.push('$genre: String'); varValues.genre = vars.genre; }
  if (vars.format) { varDecls.push('$format: MediaFormat'); varValues.format = vars.format; }
  if (vars.status) { varDecls.push('$status: MediaStatus'); varValues.status = vars.status; }

  const query = `
    query Browse(${varDecls.join(', ')}) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage }
        media(${whereClause}, sort: [${sort}]) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }
  `;

  const data = await gqlQuery<PageResult<Record<string, unknown>>>(query, varValues);

  const results = (data.Page?.media || []).map(toAnimeCardItem);

  const result: BrowseResult = {
    category,
    value,
    page,
    pageTitle: `${category}: ${value}`,
    results,
    totalResults: results.length,
  };

  await setCached('anilist.browse', cacheVars, result, CACHE_TTLS.browse);
  return result;
}

// ===== Filters (genres list) =====
export async function getFiltersGQL(): Promise<Filters> {
  const cacheVars = { _static: '1' };
  const cached = await getCached<Filters>('anilist.filters', cacheVars, CACHE_TTLS.filters);
  if (cached.found) return cached.data;

  const query = `
    query {
      GenreCollection
    }
  `;

  const data = (await gqlQuery<{ GenreCollection: string[] }>(query));

  const genres: FilterOption[] = data.GenreCollection.map((g: string) => ({
    name: g,
    slug: g.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }));

  const types: FilterOption[] = [
    { name: 'TV', slug: 'tv' },
    { name: 'Movie', slug: 'movie' },
    { name: 'OVA', slug: 'ova' },
    { name: 'ONA', slug: 'ona' },
    { name: 'Special', slug: 'special' },
  ];

  const statuses: FilterOption[] = [
    { name: 'Ongoing', slug: 'ongoing' },
    { name: 'Completed', slug: 'completed' },
    { name: 'Upcoming', slug: 'upcoming' },
  ];

  const result: Filters = { genres, types, statuses };
  await setCached('anilist.filters', cacheVars, result, CACHE_TTLS.filters);
  return result;
}

// ===== Anime Detail =====
export async function getAnimeDetailGQL(id: number): Promise<AnimeDetail | null> {
  const cacheVars = { id };
  const cached = await getCached<AnimeDetail | null>('anilist.detail', cacheVars, CACHE_TTLS.detail);
  if (cached.found) return cached.data;

  const query = `
    query Detail($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  `;

  const data = await gqlQuery<{ Media: Record<string, unknown> | null }>(query, { id });
  const media = data.Media;
  if (!media) {
    // Cache null results to avoid hammering on missing IDs (TTL still applies)
    await setCached('anilist.detail', cacheVars, null, CACHE_TTLS.detail);
    return null;
  }

  const title = media.title as Record<string, string> || {};
  const synonyms = media.synonyms as string[] || [];

  const detail: AnimeDetail = {
    id: media.id as number,
    title: title.english || title.romaji || title.native || 'Unknown',
    japaneseTitle: title.native || null,
    slug: String(media.id),
    url: `/anime/${media.id}`,
    poster: (media.coverImage as Record<string, string>)?.extraLarge || '',
    synopsis: ((media.description as string) || '').replace(/<[^>]*>/g, '').slice(0, 2000) || null,
    alternativeNames: synonyms.length > 0 ? synonyms.join(', ') : null,
    meta: {
      type: mapFormat(media.format as string),
      status: mapStatus(media.status as string),
      season: media.season ? String(media.season) : '',
      year: media.seasonYear ? String(media.seasonYear) : '',
      duration: media.duration ? `${media.duration} min` : '',
      source: (media.source as string) || '',
      studio: ((media.studios as { nodes?: Array<{ name?: string }> })?.nodes?.[0]?.name as string) || '',
    },
    genres: (media.genres as string[]) || [],
    rating: media.averageScore != null ? parseFloat(((media.averageScore as number) / 10).toFixed(1)) : null,
    icons: {
      rating: media.averageScore != null ? `${((media.averageScore as number) / 10).toFixed(1)}/10` : undefined,
    },
    episodes: [], // Will be populated by the scraper in the API route
    totalEpisodes: (media.episodes as number) || 0,
  };

  await setCached('anilist.detail', cacheVars, detail, CACHE_TTLS.detail);
  return detail;
}
