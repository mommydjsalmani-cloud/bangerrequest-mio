import { NextResponse } from 'next/server';
import {
  withErrorHandler,
  ValidationError,
  ExternalServiceError,
  withTimeout,
  logger,
} from '@/lib/errorHandler';
import { config } from '@/lib/config';
import { searchDeezer, normalizeDeezerTrack } from '@/lib/deezer';

async function searchHandler(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  // Validazione input
  if (!query) {
    throw new ValidationError('Search query is required', 'q');
  }

  if (query.length < 2) {
    throw new ValidationError('Search query must be at least 2 characters', 'q');
  }

  if (query.length > 100) {
    throw new ValidationError('Search query too long (max 100 characters)', 'q');
  }

  try {
    const data = await withTimeout(
      searchDeezer(query, limit, offset),
      config.deezer.searchTimeout,
      'deezer_search_request'
    );

    const tracks = (data.data || []).map(normalizeDeezerTrack);

    return NextResponse.json({
      ok: true,
      tracks,
      total: data.total || 0,
      limit,
      offset,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      operation: 'deezer_search',
      endpoint: req.url,
    });

    if (error instanceof Error && error.message.includes('Deezer API error')) {
      throw new ExternalServiceError('Deezer', error.message);
    }
    throw error;
  }
}

export const GET = withErrorHandler(searchHandler);
