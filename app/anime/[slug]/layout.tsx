import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getAnimeDetailGQL } from '@/lib/anilist';

const SITE_URL = 'https://kaistream.vercel.app';

type Props = {
  params: { slug: string };
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
  let title = 'Anime';
  let description = 'View anime details, episodes, and streaming links on KaiStream.';
  let poster = '';

  // If slug is a numeric AniList ID, fetch metadata directly
  if (/^\d+$/.test(slug)) {
    try {
      const detail = await getAnimeDetailGQL(parseInt(slug));
      if (detail) {
        title = detail.title;
        description = detail.synopsis
          ? detail.synopsis.slice(0, 300)
          : `Watch ${detail.title} online. ${detail.totalEpisodes} episodes available.`;
        poster = detail.poster;
      }
    } catch {
      // Fall back to defaults
    }
  }

  const ogImages = poster
    ? [{ url: poster, width: 1200, height: 630, alt: title }]
    : [{ url: '/logo.svg', width: 512, height: 512, alt: title }];

  return {
    title,
    description,
    openGraph: {
      title: `${title} | KaiStream`,
      description,
      url: `${SITE_URL}/anime/${slug}`,
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

export default function AnimeLayout({ children }: Props) {
  return <>{children}</>;
}
