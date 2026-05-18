import Link from 'next/link';

export default function AnimeCard({ item, href }) {
  const linkHref = href || (item.slug ? `/anime/${item.slug}` : '#');
  const hasSub = item.episodes?.sub || item.hasSub;
  const hasDub = item.episodes?.dub || item.hasDub;
  const totalEp = item.episodes?.total || item.episodes?.sub || null;
  const rating = item.rating || item.score || null;

  return (
    <Link href={linkHref} className="anime-card">
      <div className="anime-card-thumb">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" />
        ) : (
          <div className="fallback">🎬</div>
        )}
        {totalEp && <span className="anime-card-badge episode">{totalEp} eps</span>}
        {hasSub && !totalEp && <span className="anime-card-badge sub">SUB</span>}
        {hasDub && !totalEp && <span className="anime-card-badge dub">DUB</span>}
        {rating && <span className="anime-card-badge rating">★ {rating}</span>}
      </div>
      <div className="anime-card-body">
        <div className="anime-card-title">{item.title}</div>
        <div className="anime-card-meta">
          {item.type && <span>{item.type}</span>}
          {item.type && (hasSub || hasDub) && <span className="dot" />}
          {hasSub && <span>Sub</span>}
          {hasDub && <span>Dub</span>}
        </div>
      </div>
    </Link>
  );
}
