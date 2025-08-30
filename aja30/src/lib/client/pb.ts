import PocketBase from 'pocketbase';
import type { TypedPocketBase } from '$lib/pocketbase-types';
import { env } from '$env/dynamic/public';

const BASE_URL = env.PUBLIC_PB_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(BASE_URL) as TypedPocketBase;
