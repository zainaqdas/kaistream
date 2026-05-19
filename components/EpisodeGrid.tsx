import Link from 'next/link';
import type { Episode } from '@/types';

interface EpisodeGridProps {
  episodes: Episode[];
  animeSlug: string;
  currentEpisode?: string | number;
}

export default function EpisodeGrid({ episodes = [], animeSlug, currentEpisode }: EpisodeGridProps) {
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
          </Link>
        );
      })}
    </div>
  );
}
