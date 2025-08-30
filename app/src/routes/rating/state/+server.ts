import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { CompetitionStateResponse, RatingsResponse, UsersResponse } from '$lib/pocketbase-types';

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
        roundState: 'result_locked',
        round: 1,
        competitionFinished: false,
        activeParticipant: null
      });
    }
    const round = Number(rec.round) || 1;
    const finished = Boolean((rec as any).competitionFinished ?? false);

    let winner: { id: string; name: string | null; artistName?: string; avg: number; sum: number; count: number } | null = null;

    if (finished) {
      try {
        // Participants still in competition
        const participants = (await locals.pb.collection('users').getFullList({
          filter: 'role = "participant" && eliminated != true'
        })) as UsersResponse[];
        const participantIds = new Set(participants.map((p) => p.id));

        // All ratings of the final round
        const allRatings = (await locals.pb.collection('ratings').getFullList({
          filter: `round = ${round}`
        })) as RatingsResponse[];
        const grouped = new Map<string, { sum: number; count: number }>();
        for (const r of allRatings) {
          if (!participantIds.has(r.ratedUser)) continue;
          const g = grouped.get(r.ratedUser) || { sum: 0, count: 0 };
          g.sum += Number(r.rating) || 0;
          g.count += 1;
          grouped.set(r.ratedUser, g);
        }
        const rows = participants.map((p) => {
          const g = grouped.get(p.id) || { sum: 0, count: 0 };
          const avg = g.count > 0 ? g.sum / g.count : 0;
          const name = p.firstName || p.name || p.username || p.email || p.id;
          return { id: p.id, name, artistName: p.artistName, avg, sum: g.sum, count: g.count };
        });
        winner = rows
          .slice()
          .sort((a, b) => (b.avg - a.avg) || (b.count - a.count) || (a.name?.localeCompare(b.name || '') || 0))[0] ?? null;
      } catch (e) {
        logger.warn('Failed computing winner', e as any);
      }
    }

    logger.info('CompetitionState GET', { round: rec.round, state: rec.roundState, started: rec.competitionStarted, finished });
    return json({
      competitionStarted: !!rec.competitionStarted,
      roundState: rec.roundState,
      round,
      competitionFinished: finished,
      activeParticipant: rec.activeParticipant,
      winner
    });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; url?: string; data?: unknown; message?: string };
    // If the collection doesn't exist yet, return safe defaults without error noise
    if (err?.status === 404) {
      logger.info('CompetitionState collection missing, returning defaults');
      return json({ competitionStarted: false, roundState: 'result_locked', round: 1, competitionFinished: false, activeParticipant: null });
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
