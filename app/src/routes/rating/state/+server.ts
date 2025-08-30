import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { CompetitionStateResponse } from '$lib/pocketbase-types';

const COLLECTION = 'competition_state' as const;

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: 'not_authenticated' }, { status: 401 });
  }

  try {
    const list = (await locals.pb.collection(COLLECTION).getList(1, 1, {
      sort: '-updated'
    })) as import('pocketbase').ListResult<CompetitionStateResponse>;
    const rec = list.items[0];
    if (!rec) {
      logger.warn('CompetitionState not found, returning defaults');
      return json({
        competitionStarted: false,
        roundState: 'break',
        round: 1
      });
    }
    logger.info('CompetitionState GET', { round: rec.round, state: rec.roundState, started: rec.competitionStarted });
    return json({
      competitionStarted: !!rec.competitionStarted,
      roundState: rec.roundState,
      round: Number(rec.round) || 1
    });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; url?: string; data?: unknown; message?: string };
    // If the collection doesn't exist yet, return safe defaults without error noise
    if (err?.status === 404) {
      logger.info('CompetitionState collection missing, returning defaults');
      return json({ competitionStarted: false, roundState: 'break', round: 1 });
    }
    logger.error('CompetitionState GET failed', {
      status: err?.status,
      message: err?.message,
      url: err?.url,
      data: err?.data
    });
    return json({ error: 'fetch_failed' }, { status: 500 });
  }
};
