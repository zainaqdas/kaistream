'use client';

import { useState } from 'react';

export default function Player({ servers = [], title, episode }) {
  const [currentServer, setCurrentServer] = useState(0);
  const serversList = servers.filter((s) => s.embedUrl);

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

  const active = serversList[currentServer];
  const src = active.embedUrl;

  return (
    <>
      <div className="player-container">
        <iframe
          className="player-iframe"
          src={src}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          title={`${title} - Episode ${episode}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <div className="server-section container">
        <h3>Streaming Servers</h3>
        <div className="server-tabs">
          {serversList.map((s, i) => (
            <button
              key={s.linkId || i}
              className={`server-tab ${i === currentServer ? 'is-active' : ''}`}
              onClick={() => setCurrentServer(i)}
            >
              {s.name}
              {s.type === 'dub' ? ' (Dub)' : ''}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
