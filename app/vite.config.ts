import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig(({ command }) => {
	const isVitest = !!process.env.VITEST
	const isServe = command === 'serve' && !isVitest
	return {
		plugins: isVitest
			? []
			: [
					tailwindcss(),
					sveltekit(),
					// Ensure server bootstrap runs immediately in dev (before first request)
					{
						name: 'bootstrap-dev-init',
						apply: 'serve',
						configureServer(server) {
							if (!isServe) return
							;(async () => {
								try {
									const mod = await server.ssrLoadModule('/src/lib/server/bootstrap.ts')
									if (typeof mod?.initBootstrap === 'function') {
										mod.initBootstrap()
									}
								} catch (e) {
									console.warn('Bootstrap: dev init failed to schedule', e)
								}
							})()
						}
					}
				],
		resolve: isVitest
			? {
					alias: {
						$lib: path.resolve(rootDir, 'src/lib'),
						$src: path.resolve(rootDir, 'src'),
						// Mock SvelteKit virtual modules used in server code during tests
						'$app/environment': path.resolve(rootDir, 'tests/mocks/app-environment.ts')
					}
				}
			: undefined,
		test: {
			environment: 'node',
			globals: true,
			setupFiles: ['tests/utils/setup.ts'],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/cypress/**',
				'**/.{idea,git,cache,output,temp}/**',
				'**/e2e/**' // Exclude E2E tests from Vitest
			]
		}
	}
})
