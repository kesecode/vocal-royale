// Vitest-only stub for SvelteKit's $env/dynamic/private virtual module
// Used by server-only modules during tests where the SvelteKit plugin is not loaded.
export const env: Record<string, string | undefined> = {
	PB_URL: 'http://127.0.0.1:8090',
	ADMIN_EMAIL: 'admin@vocal.royale',
	ADMIN_PASSWORD: 'ChangeMeNow!'
}
