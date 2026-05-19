import { flushNamespace } from '@/lib/cache';

export const revalidate = 0;

/**
 * DELETE /api/cache/[namespace]?confirm=true
 *
 * Flushes all cached entries under a given namespace.
 * Requires `confirm=true` query parameter to prevent accidental clears.
 *
 * Example: DELETE /api/cache/scraper.sources?confirm=true
 *          → clears all cached episode sources
 *
 * Example: DELETE /api/cache/scraper.detail?confirm=true
 *          → clears all cached anime detail scrapes
 *
 * Example: DELETE /api/cache/anilist?confirm=true
 *          → clears all cached AniList data
 */
export async function DELETE(
  request: Request,
  { params }: { params: { namespace: string } }
): Promise<Response> {
  const { namespace } = params;

  // Sanitise — only allow alphanumeric and dots (namespace format)
  if (!/^[a-zA-Z0-9._-]+$/.test(namespace)) {
    return Response.json(
      { success: false, error: 'Invalid namespace. Use alphanumeric characters, dots, hyphens, or underscores.' } as { success: false; error: string },
      { status: 400 }
    );
  }

  // Require confirmation to prevent accidental cache flushes
  const { searchParams } = new URL(request.url);
  const confirmed = searchParams.get('confirm');
  if (confirmed !== 'true') {
    return Response.json(
      {
        success: false,
        error: 'Confirmation required. Add ?confirm=true to flush this namespace.',
      } as { success: false; error: string },
      { status: 400 }
    );
  }

  try {
    const deleted = await flushNamespace(namespace);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          namespace,
          deleted,
          timestamp: new Date().toISOString(),
        },
      } as { success: true; data: { namespace: string; deleted: number; timestamp: string } }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
