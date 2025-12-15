import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type {
	SettingsResponse,
	TypedPocketBase,
	UserRole,
	UsersResponse
} from '$lib/pocketbase-types'
import { DEFAULT_SETTINGS, parseSettings } from '$lib/utils/competition-settings'
import { logger } from '$lib/server/logger'
import PocketBase from 'pocketbase'
import { env } from '$env/dynamic/private'

const TEST_PASSWORD = 'testtest'
const TEST_EMAIL_DOMAIN = 'vocal-royale.test'
const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090'

async function getAdminPb(): Promise<TypedPocketBase> {
	const pb = new PocketBase(BASE_URL) as TypedPocketBase
	// Use PocketBase superuser for full API access (not app admin user)
	const superuserEmail = env.PB_ADMIN_EMAIL || 'admin_db@vocal.royale'
	const superuserPassword = env.PB_ADMIN_PASSWORD || 'vocal_royale_2025'
	await pb.collection('_superusers').authWithPassword(superuserEmail, superuserPassword)
	return pb
}
const FIRST_NAMES = ['Alex', 'Jamie', 'Taylor', 'Riley', 'Sam', 'Casey', 'Jordan', 'Avery']
const LAST_NAMES = ['Morgen', 'Falke', 'Stein', 'Winter', 'Rivers', 'Berg', 'Stahl', 'Loft']
const ARTIST_POOL = [
	'Neon Echo',
	'Silver Horizon',
	'Velvet Nights',
	'Skyline Drive',
	'Echo Nova',
	'Golden Hour'
]
const SONG_POOL = [
	'Midnight Radio',
	'Electric Heart',
	'Gravity Games',
	'Lights Up',
	'Backstage Dreams',
	'Wildfire Call'
]

const isTestEnv = () => process.env.NODE_ENV === 'test'

async function loadSettings(pb: TypedPocketBase) {
	try {
		const settingsList = (await pb.collection('settings').getFullList()) as SettingsResponse[]
		if (settingsList.length > 0) {
			return parseSettings(settingsList[0])
		}
	} catch (error) {
		logger.warn('Test seed: failed to load settings, using defaults', { error })
	}
	return DEFAULT_SETTINGS
}

function buildTestProfile(role: UserRole, idx: number) {
	const firstName = FIRST_NAMES[idx % FIRST_NAMES.length] ?? `Test${idx + 1}`
	const lastName = LAST_NAMES[idx % LAST_NAMES.length] ?? 'User'
	const artistName = `${firstName} ${lastName}`
	const displayRole =
		role === 'participant' ? 'Teilnehmer' : role === 'juror' ? 'Juror' : 'Zuschauer'
	return {
		firstName,
		lastName,
		artistName: `${artistName} (${displayRole})`,
		name: `${firstName} ${lastName}`
	}
}

async function findUserByEmail(pb: TypedPocketBase, email: string): Promise<UsersResponse | null> {
	const safeEmail = email.replace(/"/g, '\\"')
	try {
		// Use getFirstListItem which is more reliable for single record lookups
		const user = (await pb.collection('users').getFirstListItem(`email = "${safeEmail}"`, {
			requestKey: null
		})) as UsersResponse
		return user
	} catch {
		return null
	}
}

async function createTestUsers(pb: TypedPocketBase, role: UserRole, count: number) {
	const created: UsersResponse[] = []
	// Preload existing seed users (any role) to avoid uniqueness errors and reuse them
	const existingSeeds = (await pb.collection('users').getFullList({
		filter: `email ~ "@${TEST_EMAIL_DOMAIN}"`,
		requestKey: null
	})) as UsersResponse[]
	const existingByEmail = new Map<string, UsersResponse>()
	for (const u of existingSeeds) {
		if (u.email) existingByEmail.set(u.email.toLowerCase(), u)
	}

	for (let i = 0; i < count; i++) {
		const email = `${role}-${String(i + 1).padStart(2, '0')}@${TEST_EMAIL_DOMAIN}`
		const emailKey = email.toLowerCase()
		const profile = buildTestProfile(role, i)

		// Check cache first
		const fromCache = existingByEmail.get(emailKey)
		if (fromCache) {
			// Ensure role and flags are aligned
			try {
				const updated = (await pb
					.collection('users')
					.update(
						fromCache.id,
						{ role, verified: true, emailVisibility: false, eliminated: false, ...profile },
						{ requestKey: null }
					)) as UsersResponse
				existingByEmail.set(emailKey, updated)
				created.push(updated)
			} catch {
				created.push(fromCache)
			}
			continue
		}

		// Not in cache - check DB directly
		const existing = await findUserByEmail(pb, email)
		if (existing) {
			try {
				const updated = (await pb.collection('users').update(
					existing.id,
					{
						role,
						verified: true,
						emailVisibility: false,
						eliminated: false,
						sangThisRound: false,
						...profile
					},
					{ requestKey: null }
				)) as UsersResponse
				created.push(updated)
				existingByEmail.set(emailKey, updated)
			} catch {
				// If update fails, still count the existing user
				created.push(existing)
				existingByEmail.set(emailKey, existing)
			}
			continue
		}

		// User doesn't exist - create new
		const payload = {
			email,
			password: TEST_PASSWORD,
			passwordConfirm: TEST_PASSWORD,
			verified: true,
			emailVisibility: false,
			role,
			eliminated: false,
			sangThisRound: false,
			...profile
		}

		try {
			const user = (await pb
				.collection('users')
				.create(payload, { requestKey: null })) as UsersResponse
			created.push(user)
			existingByEmail.set(emailKey, user)
		} catch (error) {
			const err = error as Error & { status?: number; message?: string; data?: unknown }
			const isDuplicate =
				err?.status === 400 &&
				typeof err?.data === 'object' &&
				(err as { data?: { email?: { code?: string } } })?.data?.email?.code ===
					'validation_not_unique'

			if (isDuplicate) {
				// Race condition: user was created between our check and create attempt
				const dupUser = await findUserByEmail(pb, email)
				if (dupUser) {
					created.push(dupUser)
					existingByEmail.set(emailKey, dupUser)
					continue
				}
			}

			// Only log warning for actual failures (not duplicate handling)
			logger.warn('Test seed: failed to create user', {
				email,
				role,
				status: err?.status,
				error: err?.message
			})
		}
	}
	return created
}

function pickFromPool(pool: string[], idx: number) {
	return pool[idx % pool.length] ?? pool[0] ?? 'Demo'
}

async function createSongChoicesForUser(
	pb: TypedPocketBase,
	userId: string,
	songsPerUser: number,
	userIndex: number
) {
	let created = 0
	for (let round = 1; round <= songsPerUser; round++) {
		const artist = pickFromPool(ARTIST_POOL, round + userIndex)
		const songTitle = `${pickFromPool(SONG_POOL, userIndex + round)} ${round}`
		// Generate a fake Apple Music song ID for test data
		const appleMusicSongId = `test-song-${userIndex}-${round}`
		try {
			await pb.collection('song_choices').create(
				{
					user: userId,
					round,
					artist,
					songTitle,
					appleMusicSongId,
					confirmed: true
				},
				{ requestKey: null }
			)
			created++
		} catch (error) {
			const err = error as Error & { status?: number; message?: string; data?: unknown }
			logger.warn('Test seed: failed to create song choice', {
				userId,
				round,
				artist,
				songTitle,
				status: err?.status,
				error: err?.message,
				data: err?.data
			})
		}
	}
	return created
}

async function cleanupAllSeedData(pb: TypedPocketBase) {
	// Get all seed users
	const seedUsers = (await pb.collection('users').getFullList({
		filter: `email ~ "@${TEST_EMAIL_DOMAIN}"`,
		requestKey: null
	})) as UsersResponse[]

	// Delete all song choices for seed users
	for (const user of seedUsers) {
		const choices = await pb.collection('song_choices').getFullList({
			filter: `user = "${user.id}"`,
			requestKey: null
		})
		for (const choice of choices) {
			await pb.collection('song_choices').delete(choice.id, { requestKey: null })
		}

		// Delete all ratings authored by or received by seed users
		const ratingsAuthored = await pb.collection('ratings').getFullList({
			filter: `author = "${user.id}"`,
			requestKey: null
		})
		const ratingsReceived = await pb.collection('ratings').getFullList({
			filter: `ratedUser = "${user.id}"`,
			requestKey: null
		})
		const ratingIds = new Set([
			...ratingsAuthored.map((r) => r.id),
			...ratingsReceived.map((r) => r.id)
		])
		for (const id of ratingIds) {
			try {
				await pb.collection('ratings').delete(id, { requestKey: null })
			} catch {
				// Ignore if already deleted
			}
		}
	}

	// Delete all seed users
	for (const user of seedUsers) {
		try {
			await pb.collection('users').delete(user.id, { requestKey: null })
		} catch {
			// Ignore if already deleted
		}
	}

	return seedUsers.length
}

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	if (!isTestEnv()) {
		return json({ error: 'not_test_env' }, { status: 403 })
	}

	// Get admin-authenticated PocketBase client for full API access
	const pb = await getAdminPb()

	try {
		const settings = await loadSettings(pb)
		const participantTarget = settings.maxParticipantCount ?? DEFAULT_SETTINGS.maxParticipantCount
		// Use totalRounds directly (DB validates round <= totalRounds)
		const songsPerParticipant = settings.totalRounds ?? DEFAULT_SETTINGS.totalRounds

		// Delete all existing seed users and their data first
		const deletedUsers = await cleanupAllSeedData(pb)
		logger.info('Test seed: cleaned up old data', { deletedUsers })

		// Create fresh users
		const participants = await createTestUsers(pb, 'participant', participantTarget)

		// Create song choices for all participants
		let songChoicesCreated = 0
		for (let i = 0; i < participants.length; i++) {
			const p = participants[i]
			if (!p?.id) continue
			songChoicesCreated += await createSongChoicesForUser(pb, p.id, songsPerParticipant, i)
		}

		const jurors = await createTestUsers(pb, 'juror', 2)
		const spectators = await createTestUsers(pb, 'spectator', 2)

		logger.info('Test seed: completed', {
			participants: participants.length,
			jurors: jurors.length,
			spectators: spectators.length,
			songsPerParticipant,
			songChoicesCreated
		})

		return json({
			ok: true,
			summary: {
				participants: participants.length,
				jurors: jurors.length,
				spectators: spectators.length,
				songsPerParticipant,
				songChoicesCreated
			}
		})
	} finally {
		pb.authStore.clear()
	}
}
