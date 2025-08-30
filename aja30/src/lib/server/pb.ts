import PocketBase from 'pocketbase';
import type { TypedPocketBase } from '$lib/pocketbase-types';
import { env } from '$env/dynamic/private';

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090';

export function createServerPB(cookie = ''): TypedPocketBase {
    const pb = new PocketBase(BASE_URL) as TypedPocketBase;
    pb.authStore.loadFromCookie(cookie);
    return pb;
}
