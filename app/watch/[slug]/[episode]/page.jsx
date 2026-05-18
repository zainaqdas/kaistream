'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const [sortAsc, setSortAsc] = useState(false);
  const [epSearch, setEpSearch] = useState('');

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

  // When data loads, jump to the page containing the current episode
  const epNum = parseInt(episode);

  const episodes = useMemo(() => {
    if (!animeData?.episodes?.length) return [];
    const sorted = [...animeData.episodes];
    // Sort by episode number asc/desc
    sorted.sort((a, b) => {
      const aNum = a.episode || a.number || 0;
      const bNum = b.episode || b.number || 0;
      return sortAsc ? aNum - bNum : bNum - aNum;
    });
    return sorted;
  }, [animeData, sortAsc]);


  // Filter episodes by search query
  const filteredEpisodes = useMemo(() => {
    if (!epSearch.trim()) return episodes;
    const query = epSearch.trim();
    return episodes.filter((ep) => {
      const eNum = String(ep.episode || ep.number || '');
      return eNum.includes(query);
    });
  }, [episodes, epSearch]);

  const visibleEpisodes = epSearch.trim() ? filteredEpisodes : episodes;

  const prevEp =
    epNum > 1 ? epNum - 1 : null;
  const nextEp =
    animeData && animeData.totalEpisodes > epNum ? epNum + 1 : null;

  const router = useRouter();

  // Clear search and jump to target episode
  const handleEpSearchSubmit = (e) => {
    e.preventDefault();
    const val = epSearch.trim();
    if (!val) return;
    const targetNum = parseInt(val, 10);
    if (!isNaN(targetNum)) {
      const idx = episodes.findIndex(
        (ep) => String(ep.episode || ep.number) === String(targetNum)
      );
      if (idx !== -1) {
        setEpSearch('');
        router.push(`/watch/${slug}/${targetNum}`);
      }
    }
  };

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

  return (
    <div className="watch-page">
      {/* Main content: player + sidebar */}
      <div className="watch-layout">
        {/* Left: Player */}
        <div className="watch-main">
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

        {/* Right: Episode sidebar */}
        <aside className="watch-sidebar">
          <div className="watch-sidebar-header">
            <div className="watch-sidebar-header-top">
              <h3>
                Episodes <span className="text-muted">({animeData?.totalEpisodes || '...'})</span>
              </h3>
              <button
                className="watch-sidebar-sort"
                onClick={() => setSortAsc(!sortAsc)}
                title={sortAsc ? 'Oldest first' : 'Newest first'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5h10M11 9h7M11 13h4" />
                  <path d="M3 4l4 4-4 4" />
                </svg>
                {sortAsc ? 'Oldest' : 'Newest'}
              </button>
            </div>
            <form className="watch-sidebar-search" onSubmit={handleEpSearchSubmit}>
              <svg className="watch-sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>                <input
                type="text"
                placeholder="Search episode #..."
                value={epSearch}
                onChange={(e) => setEpSearch(e.target.value)}
              />
              {epSearch && (
                <button
                  type="button"
                  className="watch-sidebar-search-clear"
                  onClick={() => setEpSearch('')}
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          <div className="watch-sidebar-list">
            {visibleEpisodes.length > 0 ? (
              visibleEpisodes.map((ep) => {
                const eNum = ep.episode || ep.number;
                const isActive = String(eNum) === String(episode);

                return (
                  <Link
                    key={ep.slug || eNum}
                    href={`/watch/${slug}/${eNum}`}
                    className={`watch-sidebar-ep ${isActive ? 'is-active' : ''}`}
                  >
                    <span className="watch-sidebar-ep-num">
                      {String(eNum).padStart(2, '0')}
                    </span>
                    <div className="watch-sidebar-ep-info">
                      <span className="watch-sidebar-ep-title">
                        {ep.title || `Episode ${eNum}`}
                      </span>
                      <div className="watch-sidebar-ep-badges">
                        {ep.hasSub && <span className="ep-badge sub">SUB</span>}
                        {ep.hasDub && <span className="ep-badge dub">DUB</span>}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                {epSearch.trim() ? 'No episodes match your search.' : 'No episodes available.'}
              </div>
            )}
          </div>

          {epSearch.trim() && filteredEpisodes.length > 0 && (
            <div className="watch-sidebar-search-count">
              {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? 's' : ''} found
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}
