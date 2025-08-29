import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090';

export function createServerPB(cookie = '') {
    const pb = new PocketBase(BASE_URL);
    pb.authStore.loadFromCookie(cookie);
    return pb;
}
