import PocketBase from 'pocketbase';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090';

export const handle: Handle = async ({ event, resolve }) => {
    const pb = new PocketBase(BASE_URL);

    // Load auth state from cookie (if present)
    const cookie = event.request.headers.get('cookie') ?? '';
    pb.authStore.loadFromCookie(cookie);

    // Expose on locals for load/functions
    event.locals.pb = pb;
    event.locals.user = pb.authStore.record;

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
