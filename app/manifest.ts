import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KaiStream - Watch Anime Online',
    short_name: 'KaiStream',
    description: 'Free anime streaming site. Watch anime online in HD quality with English sub or dub.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#10b981',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
