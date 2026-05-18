import * as cheerio from 'cheerio';
import { fetchHTML, fetchJSON, fetchExternalJSON, BASE_URL } from './client.js';

function extractEpisodeMeta($item) {
  const link = $item.find('a').first();
  const href = link.attr('href') || '';
  const poster = $item.find('.ani.poster');
  const img = poster.find('img').attr('src') || '';
  const metaDiv = poster.find('.meta .inner');
  
  const subEp = metaDiv.find('.ep-status.sub span').text().trim() || null;
  const dubEp = metaDiv.find('.ep-status.dub span').text().trim() || null;
  const totalEp = metaDiv.find('.ep-status.total span').text().trim() || null;
  const type = metaDiv.find('.right').text().trim() || null;

  const nameEl = $item.find('.info .name, .info a.name');
  const title = nameEl.text().trim();
  const jpTitle = nameEl.data('jp') || null;

  return {
    title,
    japaneseTitle: jpTitle,
    slug: extractSlug(href),
    episodeUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    thumbnail: img,
    episodes: {
      sub: subEp ? parseInt(subEp) : null,
      dub: dubEp ? parseInt(dubEp) : null,
      total: totalEp ? parseInt(totalEp) : null,
    },
    type,
  };
}

function extractSlug(url) {
  const match = url.match(/\/watch\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Parse episode link data attributes from an <a> element
 */
function parseEpisodeLink($el, slug) {
  const epSlug = $el.data('slug');
  const epNum = $el.data('num');
  const malId = $el.data('mal');
  const timestamp = $el.data('timestamp');
  const ids = $el.data('ids');
  const sub = $el.data('sub');
  const dub = $el.data('dub');
  const epTitleAttr = $el.data('title');
  
  if (!epSlug) return null;
  
  return {
    episode: epNum ? parseInt(epNum) : null,
    slug: epSlug,
    malId: malId || null,
    timestamp: timestamp || null,
    ids: ids ? String(ids) : null,
    hasSub: sub === '1',
    hasDub: dub === '1',
    title: epTitleAttr || null,
    url: `${BASE_URL}/watch/${slug}/ep-${epSlug}`,
  };
}

/**
 * Scrape the homepage
 */
export async function scrapeHome() {
  const html = await fetchHTML('/home');
  const $ = cheerio.load(html);
  const result = { featured: [], latestEpisodes: [], trending: [] };

  // Featured/trending anime from the carousel
  $('#hotest .swiper-slide.item').each((i, el) => {
    const $el = $(el);
    const titleEl = $el.find('.title.d-title');
    const title = titleEl.text().trim();
    const jpTitle = titleEl.data('jp') || null;
    const synopsis = $el.find('.synopsis').text().trim();
    const playLink = $el.find('.actions a.btn.play').attr('href') || '';
    const img = $el.find('.image div').css('background-image') || '';
    const bgUrl = img.replace(/^url\(['"]?|['"]?\)$/g, '');

    const metaEl = $el.find('.meta.icons');
    const rating = metaEl.find('.rating').text().trim();
    const quality = metaEl.find('.quality').text().trim();
    const date = metaEl.find('.date').text().trim();
    const hasSub = metaEl.find('.sub').length > 0;
    const hasDub = metaEl.find('.dub').length > 0;

    result.featured.push({
      title,
      japaneseTitle: jpTitle,
      slug: extractSlug(playLink),
      url: playLink.startsWith('http') ? playLink : `${BASE_URL}${playLink}`,
      synopsis,
      thumbnail: bgUrl || null,
      rating: rating || null,
      quality: quality || null,
      airedDate: date || null,
      hasSub,
      hasDub,
    });
  });

  // Latest episodes section
  $('#recent-update .ani.items .item').each((i, el) => {
    const $el = $(el);
    const item = extractEpisodeMeta($el);
    result.latestEpisodes.push(item);
  });

  // Trending sidebar
  $('.scaff.side.items.md .item').each((i, el) => {
    const $el = $(el);
    const link = $el.attr('href') || '';
    const img = $el.find('.poster img').attr('src') || '';
    const nameEl = $el.find('.info .name.d-title');
    const title = nameEl.text().trim();
    const jpTitle = nameEl.data('jp') || null;
    const score = $el.find('.info .meta .score').text().trim();

    result.trending.push({
      title,
      japaneseTitle: jpTitle,
      slug: extractSlug(link),
      url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
      thumbnail: img,
      score: score || null,
    });
  });

  return result;
}

/**
 * Search anime by keyword
 */
export async function searchAnime(keyword, page = 1) {
  const html = await fetchHTML('/filter', { keyword, page });
  const $ = cheerio.load(html);
  const results = [];

  // Main search results
  $('.ani.items .item, .listing .item').each((i, el) => {
    results.push(extractEpisodeMeta($(el)));
  });

  // Fallback: look for items in common containers
  if (results.length === 0) {
    $('.container .item, .content .item, main .item').each((i, el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href') || '';
      const title = $el.find('.name, .title, h2, h3').first().text().trim();
      const img = $el.find('img').first().attr('src') || '';
      if (title) {
        results.push({
          title,
          slug: extractSlug(link),
          episodeUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          thumbnail: img,
        });
      }
    });
  }

  return {
    query: keyword,
    page,
    results,
    totalResults: results.length,
  };
}

/**
 * Get anime detail and episode list
 */
export async function scrapeAnimeDetail(slug) {
  const html = await fetchHTML(`/watch/${slug}`);
  const $ = cheerio.load(html);

  const watchMain = $('#watch-main');
  const animeId = watchMain.data('id');
  const animeUrl = watchMain.data('url');

  // Info section
  const infoSection = $('#w-info');
  const titleEl = infoSection.find('h1.title');
  const title = titleEl.text().trim();
  const jpTitle = titleEl.data('jp') || null;
  const poster = infoSection.find('.binfo .poster img').attr('src') || '';
  const synopsis = infoSection.find('.synopsis .content').text().trim();
  const altNames = infoSection.find('.names').text().trim() || null;

  // Meta info
  const meta = {};
  infoSection.find('.bmeta .meta').each((i, section) => {
    $(section).find('div').each((j, div) => {
      const $div = $(div);
      const label = $div.clone().children().remove().end().text().trim().replace(':', '');
      const value = $div.find('span').text().trim();
      if (label && value) meta[label.toLowerCase()] = value;
    });
  });

  // Genres
  const genres = [];
  infoSection.find('.bmeta .meta a[href*="/genre/"]').each((i, el) => {
    genres.push($(el).text().trim());
  });

  // Rating
  const ratingScore = $('#w-rating').data('score') || null;

  // Icons (sub/dub/quality)
  const icons = {};
  const iconsEl = infoSection.find('.meta.icons');
  iconsEl.find('i').each((i, el) => {
    const $el = $(el);
    if ($el.hasClass('sub')) icons.sub = true;
    if ($el.hasClass('dub')) icons.dub = true;
    if ($el.hasClass('rating')) icons.rating = $el.text().trim();
    if ($el.hasClass('quality')) icons.quality = $el.text().trim();
  });

  // Load episodes via the AJAX endpoint (path-segment format)
  let episodes = [];
  if (animeId) {
    try {
      const epData = await fetchJSON(`ajax/episode/list/${animeId}`);
      if (epData && epData.status === 200 && epData.result) {
        const $ep = cheerio.load(epData.result);
        // Parse all episode ranges (including hidden ones)
        $ep('ul.ep-range li a[data-slug]').each((i, el) => {
          const parsed = parseEpisodeLink($ep(el), slug);
          if (parsed) episodes.push(parsed);
        });
      }
    } catch (e) {
      // Episode list could not be fetched via AJAX
    }
  }

  // Sort episodes by episode number
  episodes.sort((a, b) => (a.episode || 0) - (b.episode || 0));

  return {
    id: animeId ? parseInt(animeId) : null,
    title,
    japaneseTitle: jpTitle,
    slug,
    url: animeUrl || `${BASE_URL}/watch/${slug}`,
    poster,
    synopsis: synopsis || null,
    alternativeNames: altNames,
    meta,
    genres,
    rating: ratingScore ? parseFloat(ratingScore) : null,
    icons,
    episodes,
    totalEpisodes: episodes.length,
  };
}

/**
 * Get streaming sources for an episode
 * 
 * Flow:
 * 1. Get episode page HTML to find animeId
 * 2. Fetch episode list via /ajax/episode/list/{animeId} to find the target episode
 * 3. Extract `data-ids` from the episode link (the server list key)
 * 4. Call /ajax/server/list?servers={data-ids} to get ALL available server entries
 * 5. Resolve each server's data-link-id via /ajax/server?get={linkId} for embed URLs
 * 6. ALSO try the mapper API as an additional source for Kiwi-Stream servers
 */
export async function scrapeEpisodeSources(slug, episodeNum) {
  const html = await fetchHTML(`/watch/${slug}/ep-${episodeNum}`);
  const $ = cheerio.load(html);

  const watchMain = $('#watch-main');
  const animeId = watchMain.data('id');

  // Title info
  const title = $('#w-info h1.title').text().trim();
  const poster = $('#w-info .binfo .poster img').attr('src') || '';

  const servers = [];
  const downloadLinks = [];
  const foundLinkIds = new Set();
  let malId = null;
  let epSlug = String(episodeNum);
  let timestamp = null;
  let dataIds = null;

  // Step 1 & 2: Fetch episode list to find the target episode link
  if (animeId) {
    try {
      const epData = await fetchJSON(`ajax/episode/list/${animeId}`);
      if (epData && epData.status === 200 && epData.result) {
        const $ep = cheerio.load(epData.result);
        // Find the episode link matching our episode number
        let targetEp = $ep(`ul.ep-range li a[data-num="${episodeNum}"]`).first();
        if (!targetEp.length) {
          targetEp = $ep(`ul.ep-range li a[data-slug="${episodeNum}"]`).first();
        }
        if (targetEp.length) {
          malId = targetEp.data('mal') || null;
          epSlug = targetEp.data('slug') || String(episodeNum);
          timestamp = targetEp.data('timestamp') || null;
          dataIds = targetEp.data('ids') ? String(targetEp.data('ids')) : null;
        }
      }
    } catch (e) {
      // Could not fetch episode list
    }
  }

  // Step 3 & 4: Get the full server list via ajax/server/list with data-ids
  if (dataIds) {
    try {
      const serverListData = await fetchJSON('ajax/server/list', { servers: dataIds });
      if (serverListData && serverListData.status === 200 && serverListData.result) {
        const $srv = cheerio.load(serverListData.result);
        const serverEntries = [];
        $srv('.type').each((i, typeEl) => {
          const $type = $srv(typeEl);
          const type = $type.data('type') || 'sub';
          $type.find('li[data-link-id]').each((j, li) => {
            const $li = $srv(li);
            const linkId = $li.data('link-id');
            if (linkId && !foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              serverEntries.push({
                name: $li.text().trim() || 'Unknown',
                type,
                linkId,
              });
            }
          });
        });

        // Step 5: Resolve all server link IDs in parallel
        if (serverEntries.length > 0) {
          const results = await Promise.allSettled(
            serverEntries.map(async (entry) => {
              try {
                const sd = await fetchJSON('ajax/server', { get: entry.linkId });
                if (sd?.status === 200 && sd?.result?.url) {
                  return {
                    name: entry.name,
                    type: entry.type,
                    embedUrl: sd.result.url,
                    linkId: entry.linkId,
                    skipData: sd.result.skip_data || null,
                  };
                }
              } catch (e) {}
              return null;
            })
          );
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
              servers.push(r.value);
            }
          }
        }
      }
    } catch (e) {
      // Server list endpoint failed
    }
  }

  // Step 6: Also try the mapper API as an additional source (Kiwi-Stream servers)
  if (malId && epSlug && timestamp) {
    try {
      const mapperUrl = `https://mapper.mewcdn.online/api/mal/${malId}/${epSlug}/${timestamp}`;
      const mapperRes = await fetchExternalJSON(mapperUrl);
      
      if (mapperRes && typeof mapperRes === 'object') {
        const linkIdsToResolve = [];
        
        for (const [key, data] of Object.entries(mapperRes)) {
          if (key === 'status') continue;
          if (typeof data !== 'object' || data === null) continue;

          const serverName = key
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          
          // Sub sources
          if (data.sub && data.sub.url) {
            const linkId = data.sub.url;
            if (!foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              linkIdsToResolve.push({ name: serverName, type: 'sub', linkId });
            }
          }
          
          // Sub downloads
          if (data.sub && data.sub.download) {
            const dlData = data.sub.download;
            if (typeof dlData === 'object') {
              for (const [dlName, dlUrl] of Object.entries(dlData)) {
                downloadLinks.push({ name: dlName || serverName, url: dlUrl, type: 'sub' });
              }
            }
          }
          
          // Dub sources
          if (data.dub && data.dub.url) {
            const linkId = data.dub.url;
            if (!foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              linkIdsToResolve.push({ name: serverName, type: 'dub', linkId });
            }
          }
          
          // Dub downloads
          if (data.dub && data.dub.download) {
            const dlData = data.dub.download;
            if (typeof dlData === 'object') {
              for (const [dlName, dlUrl] of Object.entries(dlData)) {
                downloadLinks.push({ name: dlName || serverName, url: dlUrl, type: 'dub' });
              }
            }
          }
        }

        // Resolve mapper link IDs
        if (linkIdsToResolve.length > 0) {
          const results = await Promise.allSettled(
            linkIdsToResolve.map(async (entry) => {
              try {
                const serverData = await fetchJSON('ajax/server', { get: entry.linkId });
                if (serverData && serverData.status === 200 && serverData.result) {
                  return {
                    name: entry.name,
                    type: entry.type,
                    embedUrl: serverData.result.url,
                    linkId: entry.linkId,
                    skipData: serverData.result.skip_data || null,
                  };
                }
              } catch (e) {}
              return null;
            })
          );
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              servers.push(result.value);
            }
          }
        }
      }
    } catch (e) {
      // Mapper API unavailable
    }
  }

  return {
    animeId: animeId ? parseInt(animeId) : null,
    title,
    slug,
    poster: poster || null,
    episode: parseInt(episodeNum),
    episodeSlug: epSlug,
    url: `${BASE_URL}/watch/${slug}/ep-${episodeNum}`,
    servers,
    downloads: downloadLinks,
    totalServers: servers.length,
  };
}

/**
 * Browse anime by genre, type, status, or listing page
 */
export async function browseAnime(category, value, page = 1) {
  let path;
  switch (category) {
    case 'genre':
      path = `/genre/${value}`;
      break;
    case 'type':
      path = `/type/${value}`;
      break;
    case 'status':
      path = `/status/${value}`;
      break;
    case 'latest':
      path = '/latest-updated';
      break;
    case 'new':
      path = '/new-release';
      break;
    case 'popular':
      path = '/most-viewed';
      break;
    default:
      path = `/filter${value ? `/${value}` : ''}`;
  }

  const html = await fetchHTML(path, page > 1 ? { page } : {});
  const $ = cheerio.load(html);
  const results = [];

  $('.ani.items .item, .items .item, .listing .item').each((i, el) => {
    results.push(extractEpisodeMeta($(el)));
  });

  const pageTitle = $('title').text().trim();
  
  return {
    category,
    value,
    page,
    pageTitle,
    results,
    totalResults: results.length,
  };
}
