'use client';

import { useState, useEffect } from 'react';
import { getHome } from '@/lib/api';
import Hero from '@/components/Hero';
import AnimeCard from '@/components/AnimeCard';
import type { HomeData } from '@/types';

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHome()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.error ?? 'Unknown error');
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="error-state">
        <h3>Failed to load content</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span className="loading-text">Loading anime...</span>
      </div>
    );
  }

  return (
    <>
      <Hero items={data.featured || []} />

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Latest <span className="accent">Episodes</span>
            </h2>
          </div>
          <div className="anime-grid">
            {(data.latestEpisodes || []).map((item, i) => (
              <AnimeCard key={item.slug || String(i)} item={item} />
            ))}
          </div>
        </div>
      </section>

      {data.trending && data.trending.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">
                Trending <span className="accent">Now</span>
              </h2>
            </div>
            <div className="anime-grid">
              {(data.trending || []).map((item, i) => (
                <AnimeCard key={item.slug || String(i)} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
