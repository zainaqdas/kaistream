import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getAnimeDetailGQL } from '@/lib/anilist';

const SITE_URL = 'https://kaistream.vercel.app';

type Props = {
  params: { slug: string; episode: string };
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, episode } = params;
  let animeTitle = 'Anime';
  let poster = '';

  // Fetch anime title for metadata from AniList (if slug is numeric ID)
  if (/^\d+$/.test(slug)) {
    try {
      const detail = await getAnimeDetailGQL(parseInt(slug));
      if (detail) {
        animeTitle = detail.title;
        poster = detail.poster;
      }
    } catch {
      // Fall back to defaults
    }
  }

  const title = `${animeTitle} — Episode ${episode}`;
  const description = `Watch ${animeTitle} Episode ${episode} online in HD. Free anime streaming with English sub and dub on KaiStream.`;
  const ogImages = poster
    ? [{ url: poster, width: 1200, height: 630, alt: animeTitle }]
    : [{ url: '/logo.svg', width: 512, height: 512, alt: animeTitle }];

  return {
    title,
    description,
    openGraph: {
      title: `${title} | KaiStream`,
      description,
      url: `${SITE_URL}/watch/${slug}/${episode}`,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | KaiStream`,
      description,
      images: poster ? [poster] : ['/logo.svg'],
    },
  };
}

export default function WatchLayout({ children }: Props) {
  return <>{children}</>;
}
