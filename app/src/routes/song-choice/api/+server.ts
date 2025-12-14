import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { getAppleMusicToken } from '$lib/server/appleToken'
import type { ListResult } from 'pocketbase'
import type {
	SongChoicesRecord,
	SongChoicesResponse,
	SettingsResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'
import {
	calculateTotalSongs,
	parseSettings,
	isDeadlinePassed
} from '$lib/utils/competition-settings'

const COLLECTION = 'song_choices' as const
const VALIDATE = (env.SONG_CHOICE_VALIDATE ?? 'true') === 'true'

type SongChoice = {
	artist: string
	songTitle: string
	confirmed?: boolean
	appleMusicSongId?: string
	userId?: string
}

interface SongChoicePayload {
	round?: number
	artist?: string
	songTitle?: string
	confirmed?: boolean
	appleMusicSongId?: string
}

function normalize(str: string) {
	return (str || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
}

type VerifyOk = { ok: true; appleMusicSongId: string }
type VerifyErrCode = 'apple_token_missing' | 'apple_request_failed' | 'song_not_found' | 'no_lyrics'
type VerifyErr = { ok: false; code: VerifyErrCode }

async function verifyWithApple(
	artist: string,
	songTitle: string,
	fetchImpl: typeof fetch
): Promise<VerifyOk | VerifyErr> {
	const token = getAppleMusicToken()
	const storefront = env.APPLE_MUSIC_STOREFRONT || 'de'
	if (!token) {
		return { ok: false, code: 'apple_token_missing' }
	}
	logger.debug('Apple verify: querying', { artist, songTitle, storefront })
	const term = encodeURIComponent(`${artist} ${songTitle}`)
	const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=${term}&types=songs&limit=5`
	const res = await fetchImpl(url, {
		headers: { Authorization: `Bearer ${token}` }
	})
	if (!res.ok) {
		logger.warn('Apple verify: request failed', { status: res.status })
		return { ok: false, code: 'apple_request_failed' }
	}
	const data = await res.json()
	type AppleSong = {
		attributes?: {
			artistName?: string
			name?: string
			hasLyrics?: boolean
			hasTimeSyncedLyrics?: boolean
		}
		id?: string
	}
	const items = (data?.results?.songs?.data ?? []) as AppleSong[]
	logger.debug('Apple verify: results', { count: items.length })
	if (!items.length) {
		return { ok: false, code: 'song_not_found' }
	}
	const nArtist = normalize(artist)
	const nTitle = normalize(songTitle)
	const candidate =
		items.find((it) => {
			const a = normalize(it?.attributes?.artistName ?? '')
			const t = normalize(it?.attributes?.name ?? '')
			return a.includes(nArtist) && t.includes(nTitle)
		}) || items[0]

	// Use hasTimeSyncedLyrics if available, fallback to hasLyrics
	const attrs = candidate?.attributes
	const hasTimeSyncedLyrics = attrs?.hasTimeSyncedLyrics
	const hasLyrics = hasTimeSyncedLyrics !== undefined ? hasTimeSyncedLyrics : !!attrs?.hasLyrics
	logger.debug('Apple verify: lyrics check', {
		hasTimeSyncedLyrics,
		hasLyricsFallback: attrs?.hasLyrics,
		result: hasLyrics
	})
	if (!hasLyrics) {
		return { ok: false, code: 'no_lyrics' }
	}
	const appleMusicSongId = String(candidate?.id ?? '')
	logger.debug('Apple verify: match', { appleMusicSongId, hasLyrics })
	return { ok: true, appleMusicSongId }
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'participant') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	try {
		logger.info('SongChoices GET', { userId: locals.user.id })

		// Get competition settings to determine song count
		let totalSongs = 5 // Default fallback
		try {
			const settingsList = (await locals.pb
				.collection('settings')
				.getFullList()) as SettingsResponse[]
			if (settingsList.length > 0) {
				const settings = parseSettings(settingsList[0])
				totalSongs = calculateTotalSongs(settings.totalRounds, settings.numberOfFinalSongs)
				logger.info('SongChoices: using dynamic song count', {
					totalSongs,
					totalRounds: settings.totalRounds,
					numberOfFinalSongs: settings.numberOfFinalSongs
				})
			}
		} catch (settingsError) {
			logger.warn('SongChoices: failed to load settings, using default', { error: settingsError })
		}

		const list = (await locals.pb.collection(COLLECTION).getFullList({
			filter: `user = "${locals.user.id}"`,
			sort: 'round'
		})) as SongChoicesResponse[]

		const songs: SongChoice[] = Array.from({ length: totalSongs }, () => ({
			artist: '',
			songTitle: ''
		}))
		for (const rec of list) {
			const r = Number(rec.round) || 0
			if (r >= 1 && r <= totalSongs) {
				songs[r - 1] = {
					artist: rec.artist ?? '',
					songTitle: rec.songTitle ?? '',
					confirmed: Boolean(rec.confirmed ?? false),
					appleMusicSongId: rec.appleMusicSongId ?? undefined
				}
			}
		}

		const present = songs.filter((s) => s.artist || s.songTitle).length
		logger.info('SongChoices GET success', { fetched: list.length, present, totalSongs })
		return json({ songs })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown }
		logger.error('SongChoices GET failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'fetch_failed' }, { status: 500 })
	}
}

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'participant') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	let payload: SongChoicePayload
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const round = Number(payload?.round)
	const artist = String(payload?.artist ?? '').trim()
	const songTitle = String(payload?.songTitle ?? '').trim()
	const confirmed = Boolean(payload?.confirmed ?? false)
	logger.info('SongChoices POST', { userId: locals.user.id, round, validate: VALIDATE })

	// Get max allowed rounds and deadline from settings
	let maxRounds = 5 // Default fallback
	let deadline: string | null = null
	try {
		const settingsList = (await locals.pb
			.collection('settings')
			.getFullList()) as SettingsResponse[]
		if (settingsList.length > 0) {
			const settings = parseSettings(settingsList[0])
			maxRounds = calculateTotalSongs(settings.totalRounds, settings.numberOfFinalSongs)
			deadline = settings.songChoiceDeadline
		}
	} catch {
		// Use default if settings unavailable
	}

	if (!Number.isFinite(round) || round < 1 || round > maxRounds) {
		logger.warn('SongChoices invalid round', { round, maxRounds })
		return json({ error: 'invalid_round' }, { status: 400 })
	}

	// Check if deadline has passed
	if (isDeadlinePassed(deadline)) {
		logger.warn('SongChoices update prevented: deadline passed', { deadline })
		return json(
			{
				error: 'deadline_exceeded',
				details: 'Die Deadline für die Song-Auswahl ist abgelaufen.'
			},
			{ status: 403 }
		)
	}
	if (!artist || !songTitle) {
		logger.warn('SongChoices missing fields', { artistEmpty: !artist, songTitleEmpty: !songTitle })
		return json(
			{ error: 'invalid_fields', details: 'interpret_and_title_required' },
			{ status: 400 }
		)
	}

	// Check for duplicate song (same artist + title by another user)
	try {
		const allChoices = (await locals.pb.collection(COLLECTION).getFullList({
			filter: `user != "${locals.user.id}"`
		})) as SongChoicesResponse[]

		const normalizedArtist = normalize(artist)
		const normalizedTitle = normalize(songTitle)

		const duplicate = allChoices.find((choice) => {
			const choiceArtist = normalize(choice.artist ?? '')
			const choiceTitle = normalize(choice.songTitle ?? '')
			return choiceArtist === normalizedArtist && choiceTitle === normalizedTitle
		})

		if (duplicate) {
			logger.warn('SongChoices duplicate detected', {
				artist,
				songTitle,
				existingUserId: duplicate.user
			})
			return json(
				{
					error: 'song_already_taken',
					details: 'Dieser Song wurde bereits von einem anderen Teilnehmer gewählt.'
				},
				{ status: 409 }
			)
		}
	} catch (err) {
		logger.warn('SongChoices duplicate check failed', { error: (err as Error)?.message })
		// Continue anyway - don't block on failed duplicate check
	}

	if (VALIDATE) {
		const verified = await verifyWithApple(artist, songTitle, fetch)
		if (!verified.ok) {
			// If key/token is missing, skip validation gracefully
			if (verified.code === 'apple_token_missing') {
				logger.warn('Apple verify skipped: token missing')
				// Ensure required backend field is populated when skipping validation
				if (!payload.appleMusicSongId) {
					;(payload as SongChoicePayload).appleMusicSongId = 'null'
				}
			} else {
				logger.info('Apple verify failed', { code: verified.code })
				const map: Record<string, { status: number; error: string }> = {
					apple_request_failed: { status: 502, error: 'apple_request_failed' },
					song_not_found: { status: 422, error: 'song_not_available' },
					no_lyrics: { status: 422, error: 'no_lyrics' }
				} as const
				const m = map[verified.code] ?? { status: 500, error: 'verification_failed' }
				return json({ error: m.error }, { status: m.status })
			}
		} else {
			// Attach Apple Song ID from verification
			;(payload as SongChoicePayload).appleMusicSongId = verified.appleMusicSongId
			logger.debug('Apple verify ok', { appleMusicSongId: verified.appleMusicSongId })
		}
	} else {
		// Validation disabled by env flag; populate required field with placeholder
		if (!payload.appleMusicSongId) {
			;(payload as SongChoicePayload).appleMusicSongId = 'null'
		}
	}

	try {
		// Try to find existing record for this user+round
		const list = (await locals.pb.collection(COLLECTION).getList(1, 1, {
			filter: `user = "${locals.user.id}" && round = ${round}`
		})) as ListResult<SongChoicesResponse>

		if (list.items.length > 0) {
			const rec = list.items[0]
			// Prevent updating confirmed song choices
			if (rec.confirmed) {
				logger.warn('SongChoices update prevented: already confirmed', { id: rec.id, round })
				return json(
					{
						error: 'song_choice_confirmed',
						details:
							'Diese Song-Auswahl wurde bereits bestätigt und kann nicht mehr geändert werden.'
					},
					{ status: 403 }
				)
			}
			const updateData: Partial<SongChoicesRecord> = { artist, songTitle: songTitle, confirmed }
			if (payload.appleMusicSongId) updateData.appleMusicSongId = payload.appleMusicSongId
			logger.info('SongChoices update', { id: rec.id, round })
			const updated = await locals.pb.collection(COLLECTION).update(rec.id, updateData)
			return json({ ok: true, id: updated.id })
		}

		const createData: SongChoicesRecord = {
			user: locals.user.id,
			round,
			artist,
			songTitle: songTitle,
			confirmed,
			appleMusicSongId: payload.appleMusicSongId
		}
		logger.info('SongChoices create', { round })
		const created = await locals.pb.collection(COLLECTION).create(createData)
		return json({ ok: true, id: created.id })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; url?: string; data?: unknown }
		logger.error('SongChoices save failed', {
			status: err?.status,
			message: err?.message,
			url: err?.url,
			data: err?.data
		})
		return json({ error: 'save_failed' }, { status: 500 })
	}
}
