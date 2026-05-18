'use client';

import { useState, useMemo } from 'react';

export default function Player({ servers = [], title, episode }) {
  const [currentServer, setCurrentServer] = useState(0);
  const [serverGroup, setServerGroup] = useState('sub');

  const serversList = servers.filter((s) => s.embedUrl);

  // Group servers by sub/dub
  const grouped = useMemo(() => {
    const sub = [];
    const dub = [];
    serversList.forEach((s) => {
      if (s.type === 'dub') dub.push(s);
      else sub.push(s);
    });
    return { sub, dub };
  }, [serversList]);

  const activeGroup = grouped[serverGroup] || [];
  const hasSub = grouped.sub.length > 0;
  const hasDub = grouped.dub.length > 0;

  // Reset currentServer if switching groups
  const handleGroupChange = (group) => {
    setServerGroup(group);
    setCurrentServer(0);
  };

  const activeServer = activeGroup[currentServer];

  if (!serversList.length) {
    return (
      <div className="player-container" style={{ background: '#0b1421' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '16/9',
            color: '#5a6a82',
            fontSize: '14px',
          }}
        >
          No streaming sources available for this episode.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="player-container">
        {activeServer && (
          <iframe
            className="player-iframe"
            src={activeServer.embedUrl}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            title={`${title} - Episode ${episode}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>

      <div className="server-section container">
        <h3>Streaming Servers</h3>

        {(hasSub || hasDub) && (
          <div className="server-type-tabs">
            {hasSub && (
              <button
                className={`server-type-tab ${serverGroup === 'sub' ? 'is-active' : ''}`}
                onClick={() => handleGroupChange('sub')}
              >
                <span className="server-type-badge sub-badge">SUB</span>
                Sub ({grouped.sub.length})
              </button>
            )}
            {hasDub && (
              <button
                className={`server-type-tab ${serverGroup === 'dub' ? 'is-active' : ''}`}
                onClick={() => handleGroupChange('dub')}
              >
                <span className="server-type-badge dub-badge">DUB</span>
                Dub ({grouped.dub.length})
              </button>
            )}
          </div>
        )}

        {activeGroup.length > 0 ? (
          <div className="server-tabs">
            {activeGroup.map((s, i) => (
              <button
                key={s.linkId || i}
                className={`server-tab ${i === currentServer ? 'is-active' : ''}`}
                onClick={() => setCurrentServer(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="server-empty">
            No {serverGroup === 'sub' ? 'subbed' : 'dubbed'} servers available.
          </p>
        )}
      </div>
    </>
  );
}
