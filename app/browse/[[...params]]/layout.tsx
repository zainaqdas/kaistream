import { ReactNode } from 'react';
import type { Metadata } from 'next';

const SITE_URL = 'https://kaistream.vercel.app';

const categoryLabels: Record<string, string> = {
  genre: 'Genre',
  type: 'Type',
  status: 'Status',
  popular: 'Trending',
  latest: 'Latest Updated',
  new: 'New Releases',
};

type Props = {
  params: { params?: string[] };
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pathParams = params.params || [];
  const [category = 'popular', value = ''] = pathParams.length > 0 ? pathParams : ['popular', ''];

  const label = categoryLabels[category] || category;
  const formattedValue = value
    ? value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const title = formattedValue
    ? `${formattedValue} ${label} Anime`
    : `${label} Anime`;

  const description = formattedValue
    ? `Browse ${formattedValue.toLowerCase()} ${label.toLowerCase()} anime. Watch and stream the best ${formattedValue.toLowerCase()} anime online in HD on KaiStream.`
    : `Browse ${label.toLowerCase()} anime. Watch and stream popular anime online in HD on KaiStream.`;

  const path = value
    ? `browse/${category}/${value}`
    : `browse/${category}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | KaiStream`,
      description,
      url: `${SITE_URL}/${path}`,
      images: [{ url: '/logo.svg', width: 512, height: 512, alt: 'KaiStream' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | KaiStream`,
      description,
      images: ['/logo.svg'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function BrowseLayout({ children }: Props) {
  return <>{children}</>;
}
