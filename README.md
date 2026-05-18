# Anikoto Scraper API

A Node.js API that scrapes anime data (details, episodes, streaming links) from anikototv.to.

## Features

- 🏠 **Homepage** — Featured anime, latest episodes, trending
- 🔍 **Search** — Search anime by keyword
- 📺 **Anime Detail** — Full anime info, synopsis, genres, episode list
- 🎬 **Episode Sources** — Streaming server URLs (Vidstream, VidCloud, Kiwi Stream)
- 📂 **Browse** — Filter by genre, type, status
- 🏷️ **Filters** — Available genres, types, and statuses

## Installation

```bash
# Clone the repo
git clone https://github.com/zainaqdas/anikoto.git
cd anikoto

# Install dependencies
npm install

# Start the server
node server.js
```

The server runs on **http://localhost:3000**.

## API Endpoints

### Get Homepage

Fetches featured anime, latest episodes, and trending anime.

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

Search anime by keyword.

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

Get full anime details including episode list.

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

Get streaming server URLs for a specific episode.

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

Browse anime by genre, type, or status.

```
GET /api/browse/:category/:value
```

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | `genre`, `type`, `status`, `latest`, `new`, `popular` |
| `value` | string | The category value (e.g., `action`, `tv`, `ongoing`) |
| `page` | int | Page number |

**Examples:**
```bash
# Browse by genre
curl "http://localhost:3000/api/browse/genre/action"

# Browse by type
curl "http://localhost:3000/api/browse/type/tv"

# Browse by status
curl "http://localhost:3000/api/browse/status/ongoing"

# Latest updates
curl "http://localhost:3000/api/browse/latest"

# New releases
curl "http://localhost:3000/api/browse/new"

# Most popular
curl "http://localhost:3000/api/browse/popular"
```

### Get Filters

Get available genres, types, and statuses for browsing.

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

## Embedding in an iframe

To use the streaming URLs in an HTML video player, you can embed them in iframes:

```html
<iframe
  src="https://megaplay.buzz/stream/s-2/128368/sub"
  allowfullscreen
  frameborder="0"
  width="100%"
  height="100%"
></iframe>
```

## Tech Stack

- **Node.js** — Runtime
- **Express** — HTTP server
- **Axios** — HTTP client for scraping
- **Cheerio** — HTML parsing & DOM traversal

## Project Structure

```
anikoto/
├── server.js          # Express server & API routes
├── scraper/
│   ├── client.js      # HTTP client helpers (fetchHTML, fetchJSON)
│   └── scraper.js     # Scraping logic (home, search, detail, sources)
├── package.json
└── README.md
```
