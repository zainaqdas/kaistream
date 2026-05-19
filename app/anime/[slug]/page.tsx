'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAnimeDetail } from '@/lib/api';
import EpisodeGrid from '@/components/EpisodeGrid';
import type { AnimeDetail } from '@/types';

export default function AnimeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<AnimeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setData(null);
    setError(null);
    getAnimeDetail(slug)
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.error ?? 'Unknown error');
      })
      .catch((err: Error) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div className="error-state" style={{ paddingTop: 80 }}>
        <h3>Anime not found</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading" style={{ paddingTop: 80 }}>
        <div className="spinner" />
        <span className="loading-text">Loading anime details...</span>
      </div>
    );
  }

  const bgImage = data.poster || null;

  return (
    <>
      <section className="anime-detail-header" style={bgImage ? {} : undefined}>
        {bgImage && (
          <div
            className="anime-detail-bg"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}
        <div className="container">
          <div className="anime-detail-content">
            <div className="anime-detail-poster">
              {bgImage ? (
                <img src={bgImage} alt={data.title} fetchPriority="high" />
              ) : (
                <div
                  style={{
                    aspectRatio: '3/4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    fontSize: 48,
                  }}
                >
                  🎬
                </div>
              )}
            </div>
            <div className="anime-detail-info">
              <h1 className="anime-detail-title">{data.title}</h1>
              {data.japaneseTitle && (
                <p className="anime-detail-jp">{data.japaneseTitle}</p>
              )}

              <div className="anime-detail-meta">
                {data.rating && <span>★ {data.rating}</span>}
                {data.rating && data.meta?.type && <span className="sep" />}
                {data.meta?.type && <span>{data.meta.type}</span>}
                {data.meta?.type && data.meta?.status && <span className="sep" />}
                {data.meta?.status && <span>{data.meta.status}</span>}
                {data.totalEpisodes > 0 && (
                  <>
                    <span className="sep" />
                    <span>{data.totalEpisodes} episodes</span>
                  </>
                )}
                {data.icons?.quality && (
                  <>
                    <span className="sep" />
                    <span>{data.icons.quality}</span>
                  </>
                )}
              </div>

              {data.genres && data.genres.length > 0 && (
                <div className="anime-detail-genres">
                  {data.genres.map((g) => (
                    <span key={g} className="genre-tag">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {data.synopsis && (
                <p className="anime-detail-synopsis">{data.synopsis}</p>
              )}

              {data.alternativeNames && (
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Also known as: {data.alternativeNames}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Episodes <span className="accent">({data.totalEpisodes})</span>
            </h2>
          </div>
          <EpisodeGrid
            episodes={data.episodes || []}
            animeSlug={slug}
          />
        </div>
      </section>
    </>
  );
}
