import type { PageServerLoad } from './$types';
import type { UsersResponse } from '$lib/pocketbase-types';

export const load: PageServerLoad = async ({ locals }) => {
    let healthy = false;
    try {
        await locals.pb.health.check();
        healthy = true;
    } catch {
        healthy = false;
    }

    return {
        user: locals.user as UsersResponse | null,
        pb_healthy: healthy
    };
};