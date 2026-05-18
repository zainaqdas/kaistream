export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <p>AnikotoTV — Free Anime Streaming</p>
          <p>
            Powered by{' '}
            <a
              href="https://anikototv.to"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              anikototv.to
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
