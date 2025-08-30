import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { logger } from '$lib/server/logger';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const isAuthRoute = url.pathname === '/auth' || url.pathname.startsWith('/auth/');
  const isLoggedIn = Boolean(locals.user);

  if (!isLoggedIn && !isAuthRoute) {
    const next = encodeURIComponent(url.pathname + url.search);
    logger.debug('Layout guard redirect to /auth', { pathname: url.pathname });
    throw redirect(303, `/auth?reason=auth_required&next=${next}`);
  }

  if (isLoggedIn && isAuthRoute) {
    logger.debug('Layout guard redirect to / (already logged in)', { pathname: url.pathname });
    throw redirect(303, '/');
  }

  return { user: locals.user };
};

