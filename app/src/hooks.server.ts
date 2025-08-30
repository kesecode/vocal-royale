import PocketBase from 'pocketbase';
import type { TypedPocketBase } from '$lib/pocketbase-types';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { env } from '$env/dynamic/private';

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090';

export const handle: Handle = async ({ event, resolve }) => {
    const pb = new PocketBase(BASE_URL) as TypedPocketBase;

    // Load auth state from cookie (if present)
    const cookie = event.request.headers.get('cookie') ?? '';
    pb.authStore.loadFromCookie(cookie);

    // Expose on locals for load/functions
    event.locals.pb = pb;
    event.locals.user = pb.authStore.record;

    // Guard: only '/auth' is public; redirect others if not logged-in.
    const pathname = event.url.pathname;
    const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/');
    const isLoggedIn = Boolean(event.locals.user);
    const isAsset = pathname.startsWith('/_app/') || pathname.startsWith('/build/') || pathname.startsWith('/assets/') || pathname === '/favicon.ico';
    const nextParam = encodeURIComponent(event.url.pathname + event.url.search);

    if (!isLoggedIn && !isAuthRoute && !isAsset) {
        logger.debug('Guard redirect to /auth', { pathname });
        throw redirect(303, `/auth?reason=auth_required&next=${nextParam}`);
    }
    if (isLoggedIn && isAuthRoute) {
        logger.debug('Guard redirect to / (already logged in)', { pathname });
        throw redirect(303, '/');
    }

    const response = await resolve(event);

    // Sync auth cookie back to client
    response.headers.append(
        'set-cookie',
        pb.authStore.exportToCookie({
            secure: event.url.protocol === 'https:',
            httpOnly: true,
            sameSite: 'Lax',
            path: '/'
        })
    );

    return response;
};
