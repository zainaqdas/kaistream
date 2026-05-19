'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { FeaturedAnime } from '@/types';

interface HeroProps {
  items: FeaturedAnime[];
}

export default function Hero({ items = [] }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const len = items.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % len);
  }, [len]);

  useEffect(() => {
    if (len <= 1) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [len, next]);

  if (!items.length) return null;

  const item = items[current];

  return (
    <section className="hero">
      {items.map((slide, i) => (
        <div key={i} className={`hero-slide ${i === current ? 'active' : ''}`}>
          <div
            className="hero-bg"
            style={{
              backgroundImage: slide.thumbnail ? `url(${slide.thumbnail})` : 'none',
            }}
          />
        </div>
      ))}

      <div className="hero-content">
        <div className="container">
          <div className="hero-inner">
            <h1 className="hero-title">{item.title}</h1>
            {item.japaneseTitle && (
              <p className="hero-jp-title">{item.japaneseTitle}</p>
            )}

            <div className="hero-meta">
              {item.rating && (
                <span className="hero-meta-item rating">★ {item.rating}</span>
              )}
              {item.quality && (
                <span className="hero-meta-item quality">{item.quality}</span>
              )}
              {item.hasSub && <span className="hero-meta-item sub">SUB</span>}
              {item.hasDub && <span className="hero-meta-item dub">DUB</span>}
              {item.airedDate && (
                <span className="hero-meta-item">{item.airedDate}</span>
              )}
            </div>

            {item.synopsis && <p className="hero-synopsis">{item.synopsis}</p>}

            <div className="hero-actions">
              {item.slug && (
                <Link href={`/watch/${item.slug}/1`} className="btn btn-primary">
                  ▶ Watch Now
                </Link>
              )}
              {item.slug && (
                <Link href={`/anime/${item.slug}`} className="btn btn-secondary">
                  Details
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {len > 1 && (
        <div className="hero-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
