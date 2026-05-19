// ===== Episode Types =====
export interface EpisodeMeta {
  sub: number | null;
  dub: number | null;
  total: number | null;
}

export interface Episode {
  episode: number | null;
  slug: string;
  malId: string | null;
  timestamp: string | null;
  ids: string | null;
  hasSub: boolean;
  hasDub: boolean;
  title: string | null;
  url: string;
  number?: number;
}

// ===== Anime Types =====
export interface FeaturedAnime {
  title: string;
  japaneseTitle: string | null;
  slug: string;
  url: string;
  synopsis: string;
  thumbnail: string | null;
  rating: string | null;
  quality: string | null;
  airedDate: string | null;
  hasSub: boolean;
  hasDub: boolean;
}

export interface HomeData {
  featured: FeaturedAnime[];
  latestEpisodes: AnimeCardItem[];
  trending: AnimeCardItem[];
}

export interface AnimeCardItem {
  title: string;
  japaneseTitle?: string | null;
  slug: string;
  episodeUrl?: string;
  thumbnail: string;
  episodes?: EpisodeMeta;
  type?: string;
  score?: string;
  rating?: string;
  hasSub?: boolean;
  hasDub?: boolean;
}

export interface AnimeDetail {
  id: number | null;
  title: string;
  japaneseTitle: string | null;
  slug: string;
  url: string;
  poster: string;
  synopsis: string | null;
  alternativeNames: string | null;
  meta: Record<string, string>;
  genres: string[];
  rating: number | null;
  icons: {
    sub?: boolean;
    dub?: boolean;
    rating?: string;
    quality?: string;
  };
  episodes: Episode[];
  totalEpisodes: number;
}

// ===== Server/Source Types =====
export interface ServerItem {
  name: string;
  type: string;
  embedUrl: string;
  linkId: string;
  skipData: Record<string, number[]> | null;
}

export interface DownloadLink {
  name: string;
  url: string;
  type: string;
}

export interface EpisodeSources {
  animeId: number | null;
  title: string;
  slug: string;
  poster: string | null;
  episode: number;
  episodeSlug: string;
  url: string;
  servers: ServerItem[];
  downloads: DownloadLink[];
  totalServers: number;
}

// ===== Browse Types =====
export interface BrowseResult {
  category: string;
  value: string;
  page: number;
  pageTitle: string;
  results: AnimeCardItem[];
  totalResults: number;
}

// ===== Filter Types =====
export interface FilterOption {
  name: string;
  slug: string;
  label?: string;
}

export interface Filters {
  genres: FilterOption[];
  types: FilterOption[];
  statuses: FilterOption[];
}

// ===== API Response Wrapper =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== Search Types =====
export interface SearchData {
  query: string;
  page: number;
  results: AnimeCardItem[];
  totalResults: number;
}

// ===== Cache Types =====
export interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}
