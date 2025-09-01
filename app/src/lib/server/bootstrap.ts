import PocketBase from 'pocketbase'
import type { TypedPocketBase } from '$lib/pocketbase-types'
import { env } from '$env/dynamic/private'
import { logger } from '$lib/server/logger'
import { building } from '$app/environment'

declare global {
	interface ImportMeta {
		vitest?: boolean
	}
}

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090'

let started = false

async function ensureInitialData(pb: TypedPocketBase) {
	// 1) Ensure Admin user exists (auth first to avoid listRule restrictions)
	try {
		const email = env.ADMIN_EMAIL || 'admin@vocal.royale'
		const password = env.ADMIN_PASSWORD || 'ChangeMeNow!'
		const firstName = 'Admin'
		const lastName = 'User'
		let exists = false
		try {
			await pb.collection('users').authWithPassword(email, password)
			exists = true
		} catch {
			exists = false
		} finally {
			pb.authStore.clear()
		}

		if (!exists) {
			try {
				await pb.collection('users').create({
					email,
					firstName,
					lastName,
					password,
					passwordConfirm: password,
					role: 'admin'
				})
				logger.info('Bootstrap: created admin app user')
				// authenticate to allow protected writes if needed
				try {
					await pb.collection('users').authWithPassword(email, password)
				} catch {
					// Authentication failed after user creation
				}
			} catch (e) {
				// Likely already exists due to race or manual seed
				logger.warn('Bootstrap: create admin user failed (may already exist)', {
					error: String((e as Error)?.message || e)
				})
			}
		}
	} catch (e) {
		logger.warn('Bootstrap: admin user ensure failed', {
			error: String((e as Error)?.message || e)
		})
	}

	// 2) Ensure competition_state exists (round: 1)
	try {
		const list = await pb.collection('competition_state').getList(1, 1)
		if (!list || list.totalItems === 0) {
			const createBody = { round: 1, competitionStarted: false }
			let created = false
			try {
				await pb.collection('competition_state').create(createBody)
				created = true
			} catch (e) {
				// If forbidden, try as admin (if we can auth)
				const msg = String((e as Error)?.message || e)
				if (!created) {
					try {
						// auth may already be active from above; if not, attempt
						// (note: we rely on default admin credentials only in fresh setups)
						if (!pb.authStore.isValid) {
							await pb
								.collection('users')
								.authWithPassword(
									env.ADMIN_PASSWORD || 'admin@vocal.royale',
									env.ADMIN_PASSWORD || 'ChangeMeNow!'
								)
						}
						await pb.collection('competition_state').create(createBody)
						created = true
					} catch (e2) {
						logger.warn('Bootstrap: failed to create competition_state', {
							error: String((e2 as Error)?.message || e2),
							firstError: msg
						})
					} finally {
						pb.authStore.clear()
					}
				}
			}
			if (created) logger.info('Bootstrap: created initial competition_state')
		}
	} catch (e) {
		logger.warn('Bootstrap: competition_state ensure failed', {
			error: String((e as Error)?.message || e)
		})
	}
}

export function initBootstrap() {
	if (started) return
	// Skip only in Vitest runs (robust check that won't affect dev/prod)
	if (typeof import.meta !== 'undefined' && import.meta.vitest) return
	// Skip during SvelteKit build
	if (building) return
	started = true
	const pb = new PocketBase(BASE_URL) as TypedPocketBase

	// Retry up to ~100s while PocketBase may still be starting
	const maxRetries = 100
	const delayMs = 1000

	logger.info('Bootstrap: init start', { baseUrl: BASE_URL, maxRetries, delayMs })

	const attempt = async (n: number) => {
		try {
			await pb.health.check()
			await ensureInitialData(pb)
			logger.info('Bootstrap: init done')
		} catch (e) {
			if (n >= maxRetries) {
				logger.warn('Bootstrap: giving up after retries', {
					error: String((e as Error)?.message || e)
				})
				return
			}
			setTimeout(() => attempt(n + 1), delayMs)
		}
	}

	// fire and forget
	void attempt(0)
}
