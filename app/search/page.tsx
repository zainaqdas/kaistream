'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchAnime } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import type { SearchData } from '@/types';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="loading">
        <div className="spinner" />
        <span className="loading-text">Loading search...</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const [data, setData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) return;
    setData(null);
    setError(null);
    searchAnime(q)
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.error ?? 'Unknown error');
      })
      .catch((err: Error) => setError(err.message));
  }, [q]);

  return (
    <div className="search-page">
      <div className="container">
        <h2>
          Search results for: <span>&ldquo;{q}&rdquo;</span>
        </h2>

        {error && (
          <div className="error-state">
            <p>{error}</p>
          </div>
        )}

        {!data && !error && (
          <div className="loading">
            <div className="spinner" />
            <span className="loading-text">Searching...</span>
          </div>
        )}

        {data && data.results && data.results.length > 0 && (
          <>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              Found {data.totalResults} result{data.totalResults !== 1 ? 's' : ''}
            </p>
            <div className="anime-grid">
              {data.results.map((item, i) => (
                <AnimeCard key={item.slug || String(i)} item={item} />
              ))}
            </div>
          </>
        )}

        {data && data.results && data.results.length === 0 && (
          <div className="empty-state">
            <p style={{ fontSize: 16 }}>No results found for &ldquo;{q}&rdquo;</p>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              Try different keywords or check the spelling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
