# Kaistream — Anime Streaming App

A **Next.js 14** anime streaming application that scrapes data from anikototv.to and serves it through a clean UI with API endpoints.

Built with the Next.js App Router, React components, and a scraper layer using Axios + Cheerio.

## Features

- 🏠 **Homepage** — Featured anime hero carousel, latest episodes grid, trending
- 🔍 **Search** — Search anime by keyword
- 📺 **Anime Detail** — Full info, synopsis, genres, episode list
- 🎬 **Watch / Player** — Iframe video player with server selector (Vidstream, VidCloud, Kiwi Stream)
- 📂 **API** — 7 endpoints for programmatic access

## Tech Stack

- **Next.js 14** — React framework with App Router
- **React** — Client & server components
- **Axios** — HTTP client for scraping
- **Cheerio** — HTML parsing & DOM traversal
- **Vercel** — Deploy for free (optimized with ISR caching)

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repo
git clone https://github.com/zainaqdas/kaistream.git
cd kaistream

# Install dependencies
npm install
```

### Development

Start the development server with hot-reload:

```bash
npm run dev
```

The app runs on **http://localhost:3000**.

### Production Build

```bash
# Build for production
npm run build

# Start the production server
npm start
```

## Project Structure

```
kaistream/
├── app/
│   ├── layout.jsx              # Root layout (Header + Footer + global styles)
│   ├── page.jsx                # Home page (hero + latest + trending)
│   ├── globals.css             # Global styles (dark theme, responsive)
│   ├── anime/
│   │   └── [slug]/
│   │       └── page.jsx        # Anime detail page (poster, info, episodes)
│   ├── watch/
│   │   └── [slug]/
│   │       └── [episode]/
│   │           └── page.jsx    # Player page (iframe + server selector)
│   ├── search/
│   │   └── page.jsx            # Search results page
│   └── api/
│       ├── health/route.js     # Health check
│       ├── home/route.js       # Homepage data (cached 5 min)
│       ├── search/route.js     # Search anime (cached 1 min)
│       ├── anime/[slug]/route.js   # Anime detail (cached 10 min)
│       ├── episode/[slug]/[episode]/route.js  # Episode sources (cached 5 min)
│       ├── browse/[...params]/route.js        # Browse by genre/type/status (cached 10 min)
│       └── filters/route.js    # Available filters (cached 1 hour)
├── components/
│   ├── Header.jsx              # Navigation + search bar
│   ├── Hero.jsx                # Hero carousel with auto-slide
│   ├── AnimeCard.jsx           # Anime card with thumbnail + badges
│   ├── EpisodeGrid.jsx         # Episode number grid
│   ├── Player.jsx              # Iframe video player + server tabs
│   └── Footer.jsx              # Footer with attribution
├── lib/
│   └── api.js                  # Client-side API helper functions
├── scraper/
│   ├── client.js               # HTTP client (fetchHTML, fetchJSON, fetchExternalJSON)
│   └── scraper.js              # Scraping logic (home, search, detail, sources, browse)
├── next.config.js              # Next.js configuration
├── jsconfig.json               # Path alias (@/ → project root)
└── package.json
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zainaqdas/kaistream)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects Next.js — no configuration needed
4. Click **Deploy**

The app will be live at `https://kaistream.vercel.app` (or your custom domain).

> **Note:** Vercel's free tier has a 10-second serverless function timeout. API routes have ISR caching enabled to minimize scraping calls:
> - Home: cached for 5 minutes
> - Search: cached for 1 minute
> - Anime Detail / Browse: cached for 10 minutes
> - Filters: cached for 1 hour

## API Endpoints

All API routes are available at `/api/*` — same as the frontend origin (no CORS needed).

### Get Homepage

Fetches featured anime, latest episodes, and trending.

```
GET /api/home
```

**Response:**
```json
{
  "success": true,
  "data": {
    "featured": [
      {
        "title": "Solo Leveling",
        "slug": "solo-leveling-ilh08",
        "synopsis": "Ten years ago...",
        "thumbnail": "https://cdn.anipixcdn.co/...",
        "rating": "4.0",
        "quality": "HD",
        "hasSub": true,
        "hasDub": true
      }
    ],
    "latestEpisodes": [...],
    "trending": [...]
  }
}
```

### Search Anime

```
GET /api/search?q={keyword}&page={page}
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Search keyword |
| `page` | int | 1 | Page number |

**Example:**
```bash
curl "http://localhost:3000/api/search?q=naruto"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "naruto",
    "page": 1,
    "results": [
      {
        "title": "Naruto Shippuden",
        "slug": "naruto-shippuden-c8gov",
        "episodeUrl": "https://anikototv.to/watch/naruto-shippuden-c8gov",
        "thumbnail": "https://cdn.anipixcdn.co/...",
        "episodes": { "sub": 500, "dub": 500, "total": 500 },
        "type": "TV"
      }
    ],
    "totalResults": 26
  }
}
```

### Anime Detail

```
GET /api/anime/:slug
```

| Param | Type | Description |
|-------|------|-------------|
| `slug` | string | Anime slug from URL |

**Example:**
```bash
curl "http://localhost:3000/api/anime/solo-leveling-ilh08"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 32567,
    "title": "Solo Leveling",
    "japaneseTitle": "俺だけレベルアップな件",
    "slug": "solo-leveling-ilh08",
    "poster": "https://cdn.anipixcdn.co/...",
    "synopsis": "Ten years ago...",
    "genres": ["Action", "Adventure", "Fantasy"],
    "rating": 4.0,
    "episodes": [
      {
        "episode": 1,
        "slug": "1",
        "malId": "21",
        "timestamp": "1704067200",
        "ids": "V2U2akpZ...",
        "hasSub": true,
        "hasDub": true,
        "url": "https://anikototv.to/watch/solo-leveling-ilh08/ep-1"
      }
    ],
    "totalEpisodes": 12
  }
}
```

### Episode Sources

```
GET /api/episode/:slug/:episode
```

| Param | Type | Description |
|-------|------|-------------|
| `slug` | string | Anime slug |
| `episode` | int | Episode number |

**Example:**
```bash
curl "http://localhost:3000/api/episode/dandadan-lzcmw/1"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "animeId": 4,
    "title": "Dandadan",
    "slug": "dandadan-lzcmw",
    "episode": 1,
    "servers": [
      {
        "name": "Vidstream-2",
        "type": "sub",
        "embedUrl": "https://megaplay.buzz/stream/s-2/128368/sub",
        "skipData": { "intro": [0, 90], "outro": [1380, 1440] }
      },
      {
        "name": "VidCloud-1",
        "type": "sub",
        "embedUrl": "https://vidwish.live/stream/s-2/128368/sub"
      },
      {
        "name": "Kiwi Stream 720p",
        "type": "sub",
        "embedUrl": "https://kwik.cx/e/..."
      }
    ],
    "downloads": [
      { "name": "mp4", "url": "https://...", "type": "sub" }
    ],
    "totalServers": 10
  }
}
```

### Browse Anime

```
GET /api/browse/:category/:value?page={page}
```

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | `genre`, `type`, `status`, `latest`, `new`, `popular` |
| `value` | string | The category value (e.g., `action`, `tv`, `ongoing`) |
| `page` | int | Page number (query param) |

**Examples:**
```bash
curl "http://localhost:3000/api/browse/genre/action"
curl "http://localhost:3000/api/browse/type/tv"
curl "http://localhost:3000/api/browse/status/ongoing"
curl "http://localhost:3000/api/browse/latest"
curl "http://localhost:3000/api/browse/new"
curl "http://localhost:3000/api/browse/popular"
```

### Get Filters

```
GET /api/filters
```

**Response:**
```json
{
  "success": true,
  "data": {
    "genres": [
      { "name": "Action", "slug": "action" },
      { "name": "Adventure", "slug": "adventure" }
    ],
    "types": [
      { "name": "TV", "slug": "tv" },
      { "name": "Movie", "slug": "movie" }
    ],
    "statuses": [
      { "name": "Ongoing", "slug": "ongoing" },
      { "name": "Completed", "slug": "completed" }
    ]
  }
}
```

### Health Check

```
GET /api/health
```

## License

This project is for educational purposes only. All content is sourced from anikototv.to.
