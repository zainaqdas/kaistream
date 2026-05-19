import * as cheerio from 'cheerio';
import { fetchHTML, fetchJSON, fetchExternalJSON, BASE_URL } from './client';
import type { FeaturedAnime, AnimeCardItem, AnimeDetail, Episode, EpisodeSources, ServerItem, DownloadLink, BrowseResult, HomeData, SearchData } from '@/types';

function extractEpisodeMeta($item: cheerio.Cheerio<any>): Partial<AnimeCardItem> {
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
  const jpTitle = nameEl.data('jp') as string | undefined || null;

  return {
    title,
    japaneseTitle: jpTitle,
    slug: extractSlug(href) || undefined,
    episodeUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    thumbnail: img,
    episodes: {
      sub: subEp ? parseInt(subEp) : null,
      dub: dubEp ? parseInt(dubEp) : null,
      total: totalEp ? parseInt(totalEp) : null,
    },
    type: type || undefined,
  };
}

function extractSlug(url: string): string | null {
  const match = url.match(/\/watch\/([^/]+)/);
  return match ? match[1] : null;
}

interface EpisodeLinkData {
  slug?: string;
  num?: string;
  mal?: string;
  timestamp?: string;
  ids?: string;
  sub?: string;
  dub?: string;
  title?: string;
}

/**
 * Parse episode link data attributes from an <a> element
 */
function parseEpisodeLink($el: cheerio.Cheerio<any>, slug: string): Episode | null {
  const epSlug = $el.attr('data-slug');
  const epNum = $el.attr('data-num');
  const malId = $el.attr('data-mal');
  const timestamp = $el.attr('data-timestamp');
  const ids = $el.attr('data-ids');
  const sub = $el.attr('data-sub');
  const dub = $el.attr('data-dub');
  const epTitleAttr = $el.attr('data-title');

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
export async function scrapeHome(): Promise<HomeData> {
  const html = await fetchHTML('/home');
  const $ = cheerio.load(html);
  const result: HomeData = { featured: [], latestEpisodes: [], trending: [] };

  // Featured/trending anime from the carousel
  $('#hotest .swiper-slide.item').each((_i, el) => {
    const $el = $(el);
    const titleEl = $el.find('.title.d-title');
    const title = titleEl.text().trim();
    const jpTitle = titleEl.data('jp') as string | undefined || null;
    const synopsis = $el.find('.synopsis').text().trim();
    const playLink = $el.find('.actions a.btn.play').attr('href') || '';
    const img = $el.find('.image div').css('background-image') || '';
    const bgUrl = img.replace(/^url\(['\"]?|['\"]?\)$/g, '');

    const metaEl = $el.find('.meta.icons');
    const rating = metaEl.find('.rating').text().trim();
    const quality = metaEl.find('.quality').text().trim();
    const date = metaEl.find('.date').text().trim();
    const hasSub = metaEl.find('.sub').length > 0;
    const hasDub = metaEl.find('.dub').length > 0;

    result.featured.push({
      title,
      japaneseTitle: jpTitle,
      slug: extractSlug(playLink) || '',
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
  $('#recent-update .ani.items .item').each((_i, el) => {
    const $el = $(el);
    const item = extractEpisodeMeta($el);
    result.latestEpisodes.push(item as AnimeCardItem);
  });

  // Trending sidebar
  $('.scaff.side.items.md .item').each((_i, el) => {
    const $el = $(el);
    const link = $el.attr('href') || '';
    const img = $el.find('.poster img').attr('src') || '';
    const nameEl = $el.find('.info .name.d-title');
    const title = nameEl.text().trim();
    const jpTitle = nameEl.data('jp') as string | undefined || null;
    const score = $el.find('.info .meta .score').text().trim();

    result.trending.push({
      title,
      japaneseTitle: jpTitle,
      slug: extractSlug(link) || '',
      url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
      thumbnail: img,
      score: score || null,
    } as AnimeCardItem);
  });

  return result;
}

/**
 * Search anime by keyword
 */
export async function searchAnime(keyword: string, page: number = 1): Promise<SearchData> {
  const html = await fetchHTML('/filter', { keyword, page });
  const $ = cheerio.load(html);
  const results: AnimeCardItem[] = [];

  // Main search results
  $('.ani.items .item, .listing .item').each((_i, el) => {
    results.push(extractEpisodeMeta($(el)) as AnimeCardItem);
  });

  // Fallback: look for items in common containers
  if (results.length === 0) {
    $('.container .item, .content .item, main .item').each((_i, el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href') || '';
      const title = $el.find('.name, .title, h2, h3').first().text().trim();
      const img = $el.find('img').first().attr('src') || '';
      if (title) {
        results.push({
          title,
          slug: extractSlug(link) || '',
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
export async function scrapeAnimeDetail(slug: string): Promise<AnimeDetail> {
  const html = await fetchHTML(`/watch/${slug}`);
  const $ = cheerio.load(html);

  const watchMain = $('#watch-main');
  const animeId = watchMain.data('id') as string | undefined;

  // Info section
  const infoSection = $('#w-info');
  const titleEl = infoSection.find('h1.title');
  const title = titleEl.text().trim();
  const jpTitle = titleEl.data('jp') as string | undefined || null;
  const poster = infoSection.find('.binfo .poster img').attr('src') || '';
  const synopsis = infoSection.find('.synopsis .content').text().trim();
  const altNames = infoSection.find('.names').text().trim() || null;

  // Meta info
  const meta: Record<string, string> = {};
  infoSection.find('.bmeta .meta').each((_i, section) => {
    $(section).find('div').each((_j, div) => {
      const $div = $(div);
      const label = $div.clone().children().remove().end().text().trim().replace(':', '');
      const value = $div.find('span').text().trim();
      if (label && value) meta[label.toLowerCase()] = value;
    });
  });

  // Genres
  const genres: string[] = [];
  infoSection.find('.bmeta .meta a[href*="/genre/"]').each((_i, el) => {
    genres.push($(el).text().trim());
  });

  // Rating
  const ratingScore = $('#w-rating').data('score') as string | undefined || null;

  // Icons (sub/dub/quality)
  const icons: { sub?: boolean; dub?: boolean; rating?: string; quality?: string } = {};
  const iconsEl = infoSection.find('.meta.icons');
  iconsEl.find('i').each((_i, el) => {
    const $el = $(el);
    if ($el.hasClass('sub')) icons.sub = true;
    if ($el.hasClass('dub')) icons.dub = true;
    if ($el.hasClass('rating')) icons.rating = $el.text().trim();
    if ($el.hasClass('quality')) icons.quality = $el.text().trim();
  });

  // Load episodes via the AJAX endpoint (path-segment format)
  let episodes: Episode[] = [];
  if (animeId) {
    try {
      const epData = await fetchJSON<{ status: number; result?: string }>(`ajax/episode/list/${animeId}`);
      if (epData && epData.status === 200 && epData.result) {
        const $ep = cheerio.load(epData.result);
        $ep('ul.ep-range li a[data-slug]').each((_i, el) => {
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
    url: `${BASE_URL}/watch/${slug}`,
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
 */
export async function scrapeEpisodeSources(slug: string, episodeNum: string | number): Promise<EpisodeSources> {
  const html = await fetchHTML(`/watch/${slug}/ep-${episodeNum}`);
  const $ = cheerio.load(html);

  const watchMain = $('#watch-main');
  const animeId = watchMain.data('id') as string | undefined;

  // Title info
  const title = $('#w-info h1.title').text().trim();
  const poster = $('#w-info .binfo .poster img').attr('src') || '';

  const servers: ServerItem[] = [];
  const downloadLinks: DownloadLink[] = [];
  const foundLinkIds = new Set<string>();
  let malId: string | null = null;
  let epSlug = String(episodeNum);
  let timestamp: string | null = null;
  let dataIds: string | null = null;

  // Step 1 & 2: Fetch episode list to find the target episode link
  if (animeId) {
    try {
      const epData = await fetchJSON<{ status: number; result?: string }>(`ajax/episode/list/${animeId}`);
      if (epData && epData.status === 200 && epData.result) {
        const $ep = cheerio.load(epData.result);
        // Find the episode link matching our episode number
        let targetEp = $ep(`ul.ep-range li a[data-num="${episodeNum}"]`).first();
        if (!targetEp.length) {
          targetEp = $ep(`ul.ep-range li a[data-slug="${episodeNum}"]`).first();
        }
        if (targetEp.length) {
          malId = targetEp.attr('data-mal') || null;
          epSlug = targetEp.attr('data-slug') || String(episodeNum);
          timestamp = targetEp.attr('data-timestamp') || null;
          dataIds = targetEp.attr('data-ids') ? String(targetEp.attr('data-ids')) : null;
        }
      }
    } catch (e) {
      // Could not fetch episode list
    }
  }

  // Step 3 & 4: Get the full server list via ajax/server/list with data-ids
  if (dataIds) {
    try {
      const serverListData = await fetchJSON<{ status: number; result?: string }>('ajax/server/list', { servers: dataIds });
      if (serverListData && serverListData.status === 200 && serverListData.result) {
        const $srv = cheerio.load(serverListData.result);
        const serverEntries: { name: string; type: string; linkId: string }[] = [];
        $srv('.type').each((_i, typeEl) => {
          const $type = $srv(typeEl);
          const type = $type.data('type') || 'sub';
          $type.find('li[data-link-id]').each((_j, li) => {
            const $li = $srv(li);
            const linkId = $li.data('link-id') as string | undefined;
            if (linkId && !foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              serverEntries.push({
                name: $li.text().trim() || 'Unknown',
                type: String(type),
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
                const sd = await fetchJSON<{ status: number; result?: { url: string; skip_data?: Record<string, number[]> } }>('ajax/server', { get: entry.linkId });
                if (sd?.status === 200 && sd?.result?.url) {
                  return {
                    name: entry.name,
                    type: entry.type,
                    embedUrl: sd.result.url,
                    linkId: entry.linkId,
                    skipData: sd.result.skip_data || null,
                  } as ServerItem;
                }
              } catch (e) { /* ignore */ }
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
      const mapperRes = await fetchExternalJSON<Record<string, unknown>>(mapperUrl);

      if (mapperRes && typeof mapperRes === 'object') {
        const linkIdsToResolve: { name: string; type: string; linkId: string }[] = [];

        for (const [key, data] of Object.entries(mapperRes)) {
          if (key === 'status') continue;
          if (typeof data !== 'object' || data === null) continue;

          const entry = data as Record<string, { url?: string; download?: Record<string, string> }>;
          const serverName = key
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

          // Sub sources
          if (entry.sub?.url) {
            const linkId = entry.sub.url;
            if (!foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              linkIdsToResolve.push({ name: serverName, type: 'sub', linkId });
            }
          }

          // Sub downloads
          if (entry.sub?.download) {
            for (const [dlName, dlUrl] of Object.entries(entry.sub.download)) {
              downloadLinks.push({ name: dlName || serverName, url: dlUrl, type: 'sub' });
            }
          }

          // Dub sources
          if (entry.dub?.url) {
            const linkId = entry.dub.url;
            if (!foundLinkIds.has(linkId)) {
              foundLinkIds.add(linkId);
              linkIdsToResolve.push({ name: serverName, type: 'dub', linkId });
            }
          }

          // Dub downloads
          if (entry.dub?.download) {
            for (const [dlName, dlUrl] of Object.entries(entry.dub.download)) {
              downloadLinks.push({ name: dlName || serverName, url: dlUrl, type: 'dub' });
            }
          }
        }

        // Resolve mapper link IDs
        if (linkIdsToResolve.length > 0) {
          const results = await Promise.allSettled(
            linkIdsToResolve.map(async (entry) => {
              try {
                const serverData = await fetchJSON<{ status: number; result?: { url: string; skip_data?: Record<string, number[]> } }>('ajax/server', { get: entry.linkId });
                if (serverData && serverData.status === 200 && serverData.result) {
                  return {
                    name: entry.name,
                    type: entry.type,
                    embedUrl: serverData.result.url,
                    linkId: entry.linkId,
                    skipData: serverData.result.skip_data || null,
                  } as ServerItem;
                }
              } catch (e) { /* ignore */ }
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
    episode: parseInt(String(episodeNum)),
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
export async function browseAnime(category: string, value: string, page: number = 1): Promise<BrowseResult> {
  let path: string;
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
  const results: AnimeCardItem[] = [];

  $('.ani.items .item, .items .item, .listing .item').each((_i, el) => {
    results.push(extractEpisodeMeta($(el)) as AnimeCardItem);
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
