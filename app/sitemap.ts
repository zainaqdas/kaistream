import type { MetadataRoute } from 'next';

const BASE_URL = 'https://kaistream.vercel.app';

// Pre-defined browse categories for the sitemap
const browseRoutes = [
  { category: 'popular', value: '' },
  { category: 'latest', value: '' },
  { category: 'new', value: '' },
  { category: 'type', value: 'tv' },
  { category: 'type', value: 'movie' },
  { category: 'type', value: 'ona' },
  { category: 'type', value: 'ova' },
  { category: 'status', value: 'ongoing' },
  { category: 'status', value: 'completed' },
  { category: 'status', value: 'upcoming' },
  // Top genres
  { category: 'genre', value: 'action' },
  { category: 'genre', value: 'adventure' },
  { category: 'genre', value: 'comedy' },
  { category: 'genre', value: 'drama' },
  { category: 'genre', value: 'fantasy' },
  { category: 'genre', value: 'horror' },
  { category: 'genre', value: 'romance' },
  { category: 'genre', value: 'sci-fi' },
  { category: 'genre', value: 'slice-of-life' },
  { category: 'genre', value: 'sports' },
  { category: 'genre', value: 'supernatural' },
  { category: 'genre', value: 'thriller' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];

  const browseRoutesSitemap: MetadataRoute.Sitemap = browseRoutes.map((route) => {
    const path = route.value
      ? `browse/${route.category}/${route.value}`
      : `browse/${route.category}`;
    return {
      url: `${BASE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...browseRoutesSitemap];
}
