import Link from 'next/link';

export default function EpisodeGrid({ episodes = [], animeSlug, currentEpisode }) {
  if (!episodes.length) {
    return <div className="empty-state">No episodes available yet.</div>;
  }

  return (
    <div className="episode-grid">
      {episodes.map((ep) => {
        const epNum = ep.episode || ep.number;
        const isActive = currentEpisode && String(epNum) === String(currentEpisode);

        return (
          <Link
            key={ep.slug || epNum}
            href={`/watch/${animeSlug}/${epNum}`}
            className={`episode-btn ${isActive ? 'is-active' : ''}`}
          >
            <span className="ep-num">{epNum}</span>
            {ep.title && <span>{ep.title}</span>}
            <div className="ep-badges">
              {ep.hasSub && <span className="ep-badge sub">SUB</span>}
              {ep.hasDub && <span className="ep-badge dub">DUB</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
