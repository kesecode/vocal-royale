import type { PageServerLoad } from './$types';
import type { CompetitionStateResponse, UsersResponse } from '$lib/pocketbase-types'

type AdminResponse = {
    state: CompetitionStateResponse | null,
    activeParticipant: UsersResponse | null
};

export const load = (async ({fetch}) => {
    const res = await fetch('/admin/api');
    if (!res.ok) {
        throw new Error('Failed to fetch admin state');
    }
    const data: AdminResponse = await res.json();
    return {
        competitionState: data.state,
        activeUser: data.activeParticipant
    };
}) satisfies PageServerLoad;