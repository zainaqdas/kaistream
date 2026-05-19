'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { browse } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import type { BrowseResult } from '@/types';

const categoryLabels: Record<string, string> = {
  genre: 'Genre',
  type: 'Type',
  status: 'Status',
  popular: 'Trending',
  latest: 'Latest Updated',
  new: 'New Releases',
};

export default function BrowsePage() {
  const params = useParams();
  const pathParams = (params.params as string[]) || [];
  const [category, value] = pathParams;

  const [data, setData] = useState<BrowseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setData(null);
    setError(null);
    pageRef.current = 1;
    setHasMore(true);
    browse(category, value || '', 1)
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.error ?? 'Unknown error');
      })
      .catch((err: Error) => setError(err.message));
  }, [category, value]);

  function loadMore() {
    const nextPage = pageRef.current + 1;
    browse(category, value || '', nextPage)
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => ({
            ...prev!,
            results: [...(prev?.results || []), ...(res.data!.results || [])],
            totalResults: res.data!.totalResults,
          }));
          pageRef.current = nextPage;
          if (!res.data.results || res.data.results.length < 24) {
            setHasMore(false);
          }
        }
      })
      .catch(() => {});
  }

  const label = categoryLabels[category] || category;
  const title = value
    ? `${label}: ${value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`
    : label;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {data && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {data.totalResults || data?.results?.length || 0} results
            </p>
          )}
        </div>
        <Link href="/" className="btn btn-sm btn-secondary">
          ← Home
        </Link>
      </div>

      {error && (
        <div className="error-state">
          <h3>Failed to load results</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {!data && !error && (
        <div className="loading">
          <div className="spinner" />
          <span className="loading-text">Loading...</span>
        </div>
      )}

      {data && data.results && data.results.length > 0 && (
        <>
          <div className="anime-grid">
            {data.results.map((item, i) => (
              <AnimeCard key={item.slug || String(i)} item={item} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn btn-primary" onClick={loadMore}>
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {data && data.results && data.results.length === 0 && (
        <div className="empty-state">
          <p style={{ fontSize: 16 }}>No anime found in this category.</p>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
            ← Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
