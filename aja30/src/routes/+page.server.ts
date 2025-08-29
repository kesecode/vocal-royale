import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    let healthy = false;
    try {
        await locals.pb.health.check();
        healthy = true;
    } catch {
        healthy = false;
    }

    return {
        user: locals.user,
        pb_healthy: healthy
    };
};

