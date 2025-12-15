import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import type { SongChoicesResponse, UsersResponse, AppSettingsResponse } from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'
import { sendEmail, isEmailConfigured, type SongEmailData } from '$lib/server/email'
import { songConfirmationTemplate, songRejectionTemplate } from '$lib/server/email-templates'
import { getLatestCompetitionState, isCompetitionStarted } from '$lib/server/competition-state'

const COLLECTION = 'song_choices' as const
const PER_PAGE = 10

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	try {
		const page = Number(url.searchParams.get('page')) || 1
		logger.info('Admin SongChoices GET', { page, perPage: PER_PAGE })

		const result = await locals.pb.collection(COLLECTION).getList(page, PER_PAGE, {
			expand: 'user',
			sort: 'round,-updated'
		})

		logger.info('Admin SongChoices GET success', {
			page: result.page,
			totalPages: result.totalPages,
			totalItems: result.totalItems
		})

		return json({
			items: result.items,
			page: result.page,
			perPage: result.perPage,
			totalItems: result.totalItems,
			totalPages: result.totalPages
		})
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin SongChoices GET failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'fetch_failed' }, { status: 500 })
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	try {
		const state = await getLatestCompetitionState(locals.pb)
		if (isCompetitionStarted(state)) {
			return json({ error: 'competition_started' }, { status: 400 })
		}
	} catch (error) {
		logger.error('Admin SongChoices POST state check failed', {
			message: (error as Error)?.message
		})
		return json({ error: 'state_check_failed' }, { status: 500 })
	}

	let payload: { choiceId?: string; confirmed?: boolean }
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const { choiceId, confirmed } = payload
	if (!choiceId || typeof confirmed !== 'boolean') {
		logger.warn('Admin SongChoices invalid payload', { choiceId, confirmed })
		return json({ error: 'invalid_payload' }, { status: 400 })
	}

	try {
		logger.info('Admin SongChoices POST', { choiceId, confirmed })

		// Song-Choice mit User-Expand laden (für E-Mail-Daten)
		const choice = (await locals.pb.collection(COLLECTION).getOne(choiceId, {
			expand: 'user'
		})) as SongChoicesResponse & { expand?: { user?: UsersResponse } }

		// Update durchführen
		const updated = (await locals.pb.collection(COLLECTION).update(choiceId, {
			confirmed
		})) as SongChoicesResponse

		logger.info('Admin SongChoices POST success', { id: updated.id, confirmed: updated.confirmed })

		// E-Mail senden (nur bei Bestätigung und wenn konfiguriert)
		let emailSent = false
		if (confirmed && isEmailConfigured() && choice.expand?.user) {
			// app_name und app_url aus DB laden
			let appName: string | undefined
			let appUrl: string | undefined
			try {
				const appSettings = await locals.pb
					.collection('app_settings')
					.getFullList<AppSettingsResponse>()
				appName = appSettings.find((s) => s.key === 'app_name')?.value
				appUrl = appSettings.find((s) => s.key === 'app_url')?.value
			} catch {
				logger.warn('Could not load app_settings')
			}

			const user = choice.expand.user
			const emailData: SongEmailData = {
				recipientEmail: user.email,
				recipientName: user.firstName || user.artistName || 'Teilnehmer',
				firstName: user.firstName || undefined,
				artistName: user.artistName || undefined,
				artist: choice.artist,
				songTitle: choice.songTitle,
				round: choice.round,
				appName,
				appUrl
			}

			const template = songConfirmationTemplate(emailData)
			emailSent = await sendEmail({
				to: emailData.recipientEmail,
				subject: template.subject,
				html: template.html,
				appName
			})
		}

		return json({ ok: true, choice: updated, emailSent })
	} catch (e: unknown) {
		const err = e as Error & { status?: number; message?: string }
		logger.error('Admin SongChoices POST failed', {
			status: err?.status,
			message: err?.message
		})
		return json({ error: 'update_failed' }, { status: 500 })
	}
}

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'not_authenticated' }, { status: 401 })
	}
	if (locals.user.role !== 'admin') {
		return json({ error: 'forbidden' }, { status: 403 })
	}

	try {
		const state = await getLatestCompetitionState(locals.pb)
		if (isCompetitionStarted(state)) {
			return json({ error: 'competition_started' }, { status: 400 })
		}
	} catch (error) {
		logger.error('Admin SongChoices DELETE state check failed', {
			message: (error as Error)?.message
		})
		return json({ error: 'state_check_failed' }, { status: 500 })
	}

	let payload: { choiceId?: string; comment?: string; skipEmail?: boolean }
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 })
	}

	const { choiceId, comment, skipEmail } = payload
	if (!choiceId) {
		logger.warn('Admin SongChoices DELETE invalid payload', { choiceId })
		return json({ error: 'invalid_payload' }, { status: 400 })
	}

	try {
		logger.info('Admin SongChoices DELETE', { choiceId, hasComment: Boolean(comment) })

		// Song-Choice mit User-Expand laden (für E-Mail-Daten)
		const choice = (await locals.pb.collection(COLLECTION).getOne(choiceId, {
			expand: 'user'
		})) as SongChoicesResponse & { expand?: { user?: UsersResponse } }

		// app_name und app_url aus DB laden für E-Mail
		let appName: string | undefined
		let appUrl: string | undefined
		try {
			const appSettings = await locals.pb
				.collection('app_settings')
				.getFullList<AppSettingsResponse>()
			appName = appSettings.find((s) => s.key === 'app_name')?.value
			appUrl = appSettings.find((s) => s.key === 'app_url')?.value
		} catch {
			logger.warn('Could not load app_settings')
		}

		// E-Mail-Daten vor dem Löschen speichern
		const emailData: SongEmailData | null = choice.expand?.user
			? {
					recipientEmail: choice.expand.user.email,
					recipientName:
						choice.expand.user.firstName || choice.expand.user.artistName || 'Teilnehmer',
					firstName: choice.expand.user.firstName || undefined,
					artistName: choice.expand.user.artistName || undefined,
					artist: choice.artist,
					songTitle: choice.songTitle,
					round: choice.round,
					comment: comment?.trim() || undefined,
					appName,
					appUrl
				}
			: null

		// Song-Choice löschen
		await locals.pb.collection(COLLECTION).delete(choiceId)

		logger.info('Admin SongChoices DELETE success', { id: choiceId })

		// E-Mail senden (wenn konfiguriert, User vorhanden und nicht übersprungen)
		let emailSent = false
		logger.info('Admin SongChoices DELETE email check', {
			skipEmail,
			isConfigured: isEmailConfigured(),
			hasEmailData: !!emailData,
			recipientEmail: emailData?.recipientEmail
		})
		if (!skipEmail && isEmailConfigured() && emailData) {
			const template = songRejectionTemplate(emailData)
			logger.info('Admin SongChoices DELETE sending rejection email', {
				to: emailData.recipientEmail,
				subject: template.subject
			})
			emailSent = await sendEmail({
				to: emailData.recipientEmail,
				subject: template.subject,
				html: template.html,
				appName
			})
			logger.info('Admin SongChoices DELETE email result', { emailSent })
		}

		return json({ ok: true, deleted: choiceId, emailSent, skippedEmail: !!skipEmail })
	} catch (e: unknown) {
		// PocketBase ClientResponseError hat 'status' direkt am Objekt
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const err = e as any
		const status = err?.status ?? err?.response?.status ?? err?.code
		const message = err?.message ?? err?.response?.message ?? String(err)

		logger.warn('Admin SongChoices DELETE catch', {
			choiceId,
			status,
			message,
			errorType: err?.constructor?.name,
			hasStatus: 'status' in (err || {}),
			rawError: JSON.stringify(err, Object.getOwnPropertyNames(err || {}))
		})

		// 404 = Record existiert nicht mehr (bereits gelöscht)
		if (status === 404) {
			logger.info('Admin SongChoices DELETE - record already deleted', { choiceId })
			return json({ ok: true, deleted: choiceId, alreadyDeleted: true })
		}
		logger.error('Admin SongChoices DELETE failed', { status, message })
		return json({ error: 'delete_failed' }, { status: 500 })
	}
}
