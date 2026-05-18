'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getFilters } from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [filters, setFilters] = useState(null);
  const menuRef = useRef(null);
  const mobileBtnRef = useRef(null);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    getFilters()
      .then((res) => {
        if (res.success) setFilters(res.data);
      })
      .catch(() => {});
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      const isOutsideNav = menuRef.current && !menuRef.current.contains(e.target);
      const isOnMobileBtn = mobileBtnRef.current && mobileBtnRef.current.contains(e.target);
      if (isOutsideNav && !isOnMobileBtn) {
        setMenuOpen(false);
        setActiveSubmenu(null);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setActiveSubmenu(null);
      }
    }
    if (menuOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [menuOpen]);

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      const q = query.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    },
    [query, router]
  );

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        document.querySelector('.header-search input')?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
    setActiveSubmenu(null);
  }

  const genres = filters?.genres || [];
  const types = filters?.types || [];
  const statuses = filters?.statuses || [];

  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          <Link href="/" className="logo">
            Anikoto<span>TV</span>
          </Link>

          <nav className="header-nav" ref={menuRef}>
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/browse/popular" className="nav-link trending-link">
              <span className="trending-icon">📈</span> Trending
            </Link>

            <div className={`nav-dropdown ${menuOpen ? 'is-open' : ''}`}>
              <button
                className={`nav-link dropdown-toggle ${menuOpen ? 'is-active' : ''}`}
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  if (menuOpen) setActiveSubmenu(null);
                }}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                Browse ▾
              </button>

              <div className="dropdown-menu">
                <div className="dropdown-header">Browse Anime</div>
                <div className="dropdown-section">
                  <button
                    className={`dropdown-subtoggle ${activeSubmenu === 'genres' ? 'is-active' : ''}`}
                    onClick={() => setActiveSubmenu(activeSubmenu === 'genres' ? null : 'genres')}
                  >
                    <span className="d-icon">🏷️</span> By Genre
                    <span className="arrow">{activeSubmenu === 'genres' ? '▾' : '▸'}</span>
                  </button>
                  {activeSubmenu === 'genres' && (
                    <div className="dropdown-submenu">
                      {(genres.length > 0 ? genres : fallbackGenres).map((item) => (
                        <Link
                          key={item.slug}
                          href={`/browse/genre/${item.slug}`}
                          className="dropdown-item"
                          onClick={closeMenu}
                        >
                          {item.name || item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dropdown-section">
                  <button
                    className={`dropdown-subtoggle ${activeSubmenu === 'types' ? 'is-active' : ''}`}
                    onClick={() => setActiveSubmenu(activeSubmenu === 'types' ? null : 'types')}
                  >
                    <span className="d-icon">📺</span> By Type
                    <span className="arrow">{activeSubmenu === 'types' ? '▾' : '▸'}</span>
                  </button>
                  {activeSubmenu === 'types' && (
                    <div className="dropdown-submenu">
                      {(types.length > 0 ? types : fallbackTypes).map((item) => (
                        <Link
                          key={item.slug}
                          href={`/browse/type/${item.slug}`}
                          className="dropdown-item"
                          onClick={closeMenu}
                        >
                          {item.name || item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dropdown-section">
                  <button
                    className={`dropdown-subtoggle ${activeSubmenu === 'statuses' ? 'is-active' : ''}`}
                    onClick={() => setActiveSubmenu(activeSubmenu === 'statuses' ? null : 'statuses')}
                  >
                    <span className="d-icon">📋</span> By Status
                    <span className="arrow">{activeSubmenu === 'statuses' ? '▾' : '▸'}</span>
                  </button>
                  {activeSubmenu === 'statuses' && (
                    <div className="dropdown-submenu">
                      {(statuses.length > 0 ? statuses : fallbackStatuses).map((item) => (
                        <Link
                          key={item.slug}
                          href={`/browse/status/${item.slug}`}
                          className="dropdown-item"
                          onClick={closeMenu}
                        >
                          {item.name || item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dropdown-divider" />
                <Link href="/browse/latest" className="dropdown-item highlight" onClick={closeMenu}>
                  🔄 Latest Updated
                </Link>
                <Link href="/browse/new" className="dropdown-item highlight" onClick={closeMenu}>
                  🆕 New Releases
                </Link>
              </div>
            </div>
          </nav>

          <form className="header-search" onSubmit={handleSearch}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search anime titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="search-shortcut">/</span>
          </form>

          <button
            ref={mobileBtnRef}
            className={`mobile-menu-btn ${menuOpen ? 'is-active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

// Fallback data in case the filters API fails
const fallbackGenres = [
  { slug: 'action', label: 'Action' },
  { slug: 'adventure', label: 'Adventure' },
  { slug: 'comedy', label: 'Comedy' },
  { slug: 'drama', label: 'Drama' },
  { slug: 'fantasy', label: 'Fantasy' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'romance', label: 'Romance' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
  { slug: 'slice-of-life', label: 'Slice of Life' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'supernatural', label: 'Supernatural' },
  { slug: 'thriller', label: 'Thriller' },
];
const fallbackTypes = [
  { slug: 'tv', label: 'TV' },
  { slug: 'movie', label: 'Movie' },
  { slug: 'ova', label: 'OVA' },
  { slug: 'ona', label: 'ONA' },
  { slug: 'special', label: 'Special' },
];
const fallbackStatuses = [
  { slug: 'ongoing', label: 'Ongoing' },
  { slug: 'completed', label: 'Completed' },
  { slug: 'upcoming', label: 'Upcoming' },
];
