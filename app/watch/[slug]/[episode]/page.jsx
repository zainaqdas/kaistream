'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getEpisodeSources, getAnimeDetail } from '@/lib/api';
import Player from '@/components/Player';

export default function WatchPage() {
  const params = useParams();
  const slug = params.slug;
  const episode = params.episode;

  const [data, setData] = useState(null);
  const [animeData, setAnimeData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug || !episode) return;
    setData(null);
    setError(null);

    Promise.all([
      getEpisodeSources(slug, episode),
      getAnimeDetail(slug),
    ])
      .then(([epRes, animeRes]) => {
        if (epRes.success) setData(epRes.data);
        else setError(epRes.error);
        if (animeRes.success) setAnimeData(animeRes.data);
      })
      .catch((err) => setError(err.message));
  }, [slug, episode]);

  if (error) {
    return (
      <div className="error-state" style={{ paddingTop: 80 }}>
        <h3>Failed to load episode</h3>
        <p>{error}</p>
        <Link href={`/anime/${slug}`} className="btn btn-primary">
          Back to Anime
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading" style={{ paddingTop: 80 }}>
        <div className="spinner" />
        <span className="loading-text">Loading player...</span>
      </div>
    );
  }

  const epNum = parseInt(episode);
  const prevEp = epNum > 1 ? epNum - 1 : null;
  const nextEp =
    animeData && animeData.totalEpisodes > epNum ? epNum + 1 : null;

  return (
    <div className="player-page">
      <Player
        servers={data.servers || []}
        title={data.title || animeData?.title || ''}
        episode={episode}
      />

      <div className="container">
        <div className="player-nav">
          <div className="player-info">
            <h2>
              {data.title || animeData?.title || 'Unknown'} — Episode {episode}
            </h2>
            {animeData?.japaneseTitle && (
              <p>{animeData.japaneseTitle}</p>
            )}
          </div>
          <div className="player-nav-buttons">
            {prevEp && (
              <Link
                href={`/watch/${slug}/${prevEp}`}
                className="btn btn-secondary btn-sm"
              >
                ← Prev
              </Link>
            )}
            <Link href={`/anime/${slug}`} className="btn btn-secondary btn-sm">
              All Episodes
            </Link>
            {nextEp && (
              <Link
                href={`/watch/${slug}/${nextEp}`}
                className="btn btn-primary btn-sm"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
