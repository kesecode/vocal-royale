// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TypedPocketBase } from '$lib/pocketbase-types';

declare global {
    namespace App {
        interface Locals {
            pb: TypedPocketBase;
            user: import('pocketbase').RecordModel | null;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
