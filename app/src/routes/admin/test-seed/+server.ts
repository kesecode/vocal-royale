import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type {
	SettingsResponse,
	TypedPocketBase,
	UserRole,
	UsersResponse
} from '$lib/pocketbase-types'
import {
	DEFAULT_SETTINGS,
	parseSettings,
	calculateTotalSongs
} from '$lib/utils/competition-settings'
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

// Erweiterte Name-Pools für mehr Varianz
const FIRST_NAMES = [
	'Luna',
	'Finn',
	'Nova',
	'Milo',
	'Aria',
	'Leo',
	'Ivy',
	'Theo',
	'Zara',
	'Max',
	'Ruby',
	'Felix',
	'Stella',
	'Oscar',
	'Maya',
	'Jasper',
	'Cleo',
	'Hugo',
	'Lila',
	'Axel'
]

const LAST_NAMES = [
	'Sternfeld',
	'Mondlicht',
	'Feuerherz',
	'Silbermann',
	'Goldbach',
	'Wolkenstein',
	'Nachtschatten',
	'Sonnenblick',
	'Winterstein',
	'Sommerfeld',
	'Blütentraum',
	'Sturmwind',
	'Regenbogen',
	'Donnerberg',
	'Kristallklar',
	'Flammentanz',
	'Eisblume',
	'Morgentau',
	'Abendrot',
	'Himmelreich'
]

const ARTIST_NAME_STYLES = [
	'Velvet',
	'Golden',
	'Electric',
	'Cosmic',
	'Mystic',
	'Neon',
	'Silver',
	'Crystal'
]

// Echte Songs für Test-Daten
const REAL_SONGS = [
	{ artist: 'Adele', title: 'Rolling in the Deep' },
	{ artist: 'Ed Sheeran', title: 'Shape of You' },
	{ artist: 'Queen', title: 'Bohemian Rhapsody' },
	{ artist: 'Whitney Houston', title: 'I Will Always Love You' },
	{ artist: 'Bruno Mars', title: 'Uptown Funk' },
	{ artist: 'Beyoncé', title: 'Halo' },
	{ artist: 'Michael Jackson', title: 'Billie Jean' },
	{ artist: 'Lady Gaga', title: 'Bad Romance' },
	{ artist: 'The Weeknd', title: 'Blinding Lights' },
	{ artist: 'Dua Lipa', title: 'Levitating' },
	{ artist: 'Coldplay', title: 'Viva la Vida' },
	{ artist: 'Taylor Swift', title: 'Shake It Off' },
	{ artist: 'Rihanna', title: 'Umbrella' },
	{ artist: 'Maroon 5', title: 'Sugar' },
	{ artist: 'Justin Timberlake', title: 'Mirrors' },
	{ artist: 'Sia', title: 'Chandelier' },
	{ artist: 'Elton John', title: 'Rocket Man' },
	{ artist: 'Amy Winehouse', title: 'Rehab' },
	{ artist: 'Billie Eilish', title: 'Bad Guy' },
	{ artist: 'Post Malone', title: 'Circles' },
	{ artist: 'Ariana Grande', title: 'Thank U, Next' },
	{ artist: 'Sam Smith', title: 'Stay With Me' },
	{ artist: 'John Legend', title: 'All of Me' },
	{ artist: 'Katy Perry', title: 'Firework' },
	{ artist: 'Imagine Dragons', title: 'Believer' },
	{ artist: 'OneRepublic', title: 'Counting Stars' },
	{ artist: 'Pharrell Williams', title: 'Happy' },
	{ artist: 'Lewis Capaldi', title: 'Someone You Loved' },
	{ artist: 'Cardi B', title: 'I Like It' },
	{ artist: 'Harry Styles', title: 'Watermelon Sugar' }
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

function generateArtistName(firstName: string, lastName: string, idx: number): string {
	const style = ARTIST_NAME_STYLES[idx % ARTIST_NAME_STYLES.length] ?? 'Star'
	const variants = [
		`${firstName} "${style}" ${lastName}`,
		`${style} ${firstName}`,
		`The ${style} ${lastName}`,
		`${firstName} & The ${style}s`,
		`${lastName} ${style}`
	]
	return variants[idx % variants.length] ?? `${firstName} ${lastName}`
}

function buildTestProfile(role: UserRole, idx: number) {
	// Verwende verschiedene Indizes für Vor- und Nachnamen für mehr Varianz
	const firstNameIdx = idx
	const lastNameIdx = (idx * 3 + 7) % LAST_NAMES.length
	const firstName = FIRST_NAMES[firstNameIdx % FIRST_NAMES.length] ?? `Test${idx + 1}`
	const lastName = LAST_NAMES[lastNameIdx] ?? 'User'
	const artistName = generateArtistName(firstName, lastName, idx)
	return {
		firstName,
		lastName,
		artistName,
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

function getSongForUser(userIndex: number, round: number): { artist: string; title: string } {
	// Verwende unterschiedliche Kombination aus userIndex und round für Varianz
	const idx = (userIndex * 7 + round * 3) % REAL_SONGS.length
	return REAL_SONGS[idx] ?? { artist: 'Unknown Artist', title: 'Unknown Song' }
}

async function createSongChoicesForUser(
	pb: TypedPocketBase,
	userId: string,
	songsPerUser: number,
	userIndex: number
) {
	let created = 0
	for (let round = 1; round <= songsPerUser; round++) {
		const song = getSongForUser(userIndex, round)
		const artist = song.artist
		const songTitle = song.title
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

async function cleanupAllData(pb: TypedPocketBase) {
	// 1. ALLE Ratings löschen
	const allRatings = await pb.collection('ratings').getFullList({ requestKey: null })
	for (const rating of allRatings) {
		try {
			await pb.collection('ratings').delete(rating.id, { requestKey: null })
		} catch {
			// Ignore if already deleted
		}
	}

	// 2. ALLE Song Choices löschen
	const allChoices = await pb.collection('song_choices').getFullList({ requestKey: null })
	for (const choice of allChoices) {
		try {
			await pb.collection('song_choices').delete(choice.id, { requestKey: null })
		} catch {
			// Ignore if already deleted
		}
	}

	// 3. ALLE User löschen (außer Admins)
	const allUsers = (await pb.collection('users').getFullList({
		filter: 'role != "admin"',
		requestKey: null
	})) as UsersResponse[]
	for (const user of allUsers) {
		try {
			await pb.collection('users').delete(user.id, { requestKey: null })
		} catch {
			// Ignore if already deleted
		}
	}

	// 4. Competition State zurücksetzen
	const states = await pb.collection('competition_state').getFullList({ requestKey: null })
	if (states.length > 0 && states[0]) {
		try {
			await pb.collection('competition_state').update(
				states[0].id,
				{
					competitionStarted: false,
					round: 1,
					roundState: 'singing_phase',
					competitionFinished: false,
					activeParticipant: '',
					break: false
				},
				{ requestKey: null }
			)
		} catch (error) {
			logger.warn('Test seed: failed to reset competition state', { error })
		}
	}

	return {
		ratings: allRatings.length,
		choices: allChoices.length,
		users: allUsers.length
	}
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
		// Berechne korrekte Anzahl der Songs inklusive Finalrunden
		const totalRounds = settings.totalRounds ?? DEFAULT_SETTINGS.totalRounds
		const numberOfFinalSongs = settings.numberOfFinalSongs ?? DEFAULT_SETTINGS.numberOfFinalSongs
		const songsPerParticipant = calculateTotalSongs(totalRounds, numberOfFinalSongs)

		// Delete ALL data (users, song choices, ratings) and reset game
		const deletedData = await cleanupAllData(pb)
		logger.info('Test seed: cleaned up all data and reset game', { deletedData })

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
				deleted: {
					users: deletedData.users,
					songChoices: deletedData.choices,
					ratings: deletedData.ratings
				},
				created: {
					participants: participants.length,
					jurors: jurors.length,
					spectators: spectators.length,
					songsPerParticipant,
					songChoicesCreated
				},
				gameReset: true
			}
		})
	} finally {
		pb.authStore.clear()
	}
}
