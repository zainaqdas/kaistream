'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFilters } from '@/lib/api';
import type { FilterOption } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ genres: FilterOption[]; types: FilterOption[]; statuses: FilterOption[] } | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getFilters()
      .then((res) => {
        if (res.success) setFilters(res.data ?? null);
      })
      .catch(() => {});
  }, []);

  // Use ref to avoid stale closure for onClose
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close sidebar when route changes (for mobile) — only triggers on pathname change
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      onCloseRef.current?.();
    }
    prevPathname.current = pathname;
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, onClose]);

  // Close on outside click (mobile)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        isOpen &&
        onClose &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.menu-btn')
      ) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, onClose]);

  const genres = filters?.genres || [];
  const types = filters?.types || [];
  const statuses = filters?.statuses || [];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside ref={sidebarRef} className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-inner">
          <nav className="sidebar-nav">
            <Link
              href="/"
              className={`sidebar-link ${pathname === '/' ? 'is-active' : ''}`}
            >
              <span className="sidebar-link-icon">🏠</span>
              Home
            </Link>

            <Link
              href="/browse/popular"
              className={`sidebar-link sidebar-link--trending ${pathname.includes('/browse/popular') ? 'is-active' : ''}`}
            >
              <span className="sidebar-link-icon">📈</span>
              Trending
            </Link>
          </nav>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <div
              className={`sidebar-section-toggle ${activeSection === 'genres' ? 'is-active' : ''}`}
              onClick={() => setActiveSection(activeSection === 'genres' ? null : 'genres')}
            >
              <span className="sidebar-link-icon">🏷️</span>
              Browse by Genre
              <span className="sidebar-arrow">{activeSection === 'genres' ? '▾' : '▸'}</span>
            </div>
            {activeSection === 'genres' && (
              <div className="sidebar-submenu">
                {(genres.length > 0 ? genres : fallbackGenres).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/browse/genre/${item.slug}`}
                    className={`sidebar-sub-link ${pathname.includes(`/browse/genre/${item.slug}`) ? 'is-active' : ''}`}
                  >
                    {item.name || item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div
              className={`sidebar-section-toggle ${activeSection === 'types' ? 'is-active' : ''}`}
              onClick={() => setActiveSection(activeSection === 'types' ? null : 'types')}
            >
              <span className="sidebar-link-icon">📺</span>
              Browse by Type
              <span className="sidebar-arrow">{activeSection === 'types' ? '▾' : '▸'}</span>
            </div>
            {activeSection === 'types' && (
              <div className="sidebar-submenu">
                {(types.length > 0 ? types : fallbackTypes).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/browse/type/${item.slug}`}
                    className={`sidebar-sub-link ${pathname.includes(`/browse/type/${item.slug}`) ? 'is-active' : ''}`}
                  >
                    {item.name || item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div
              className={`sidebar-section-toggle ${activeSection === 'statuses' ? 'is-active' : ''}`}
              onClick={() => setActiveSection(activeSection === 'statuses' ? null : 'statuses')}
            >
              <span className="sidebar-link-icon">📋</span>
              Browse by Status
              <span className="sidebar-arrow">{activeSection === 'statuses' ? '▾' : '▸'}</span>
            </div>
            {activeSection === 'statuses' && (
              <div className="sidebar-submenu">
                {(statuses.length > 0 ? statuses : fallbackStatuses).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/browse/status/${item.slug}`}
                    className={`sidebar-sub-link ${pathname.includes(`/browse/status/${item.slug}`) ? 'is-active' : ''}`}
                  >
                    {item.name || item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-bottom-links">
            <Link
              href="/browse/latest"
              className={`sidebar-link ${pathname.includes('/browse/latest') ? 'is-active' : ''}`}
            >
              <span className="sidebar-link-icon">🔄</span>
              Latest Updated
            </Link>
            <Link
              href="/browse/new"
              className={`sidebar-link ${pathname.includes('/browse/new') ? 'is-active' : ''}`}
            >
              <span className="sidebar-link-icon">🆕</span>
              New Releases
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

// Fallback data in case the filters API fails
const fallbackGenres: FilterOption[] = [
  { name: 'Action', slug: 'action' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Horror', slug: 'horror' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'Slice of Life', slug: 'slice-of-life' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Supernatural', slug: 'supernatural' },
  { name: 'Thriller', slug: 'thriller' },
];
const fallbackTypes: FilterOption[] = [
  { name: 'TV', slug: 'tv' },
  { name: 'Movie', slug: 'movie' },
  { name: 'OVA', slug: 'ova' },
  { name: 'ONA', slug: 'ona' },
  { name: 'Special', slug: 'special' },
];
const fallbackStatuses: FilterOption[] = [
  { name: 'Ongoing', slug: 'ongoing' },
  { name: 'Completed', slug: 'completed' },
  { name: 'Upcoming', slug: 'upcoming' },
];
