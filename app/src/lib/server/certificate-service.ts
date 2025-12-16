import { env } from '$env/dynamic/private'
import type { TypedPocketBase } from '$lib/pocketbase-types'
import type {
	UsersResponse,
	RatingsResponse,
	SongChoicesResponse,
	AppSettingsResponse
} from '$lib/pocketbase-types'
import { logger } from '$lib/server/logger'
import { sendEmail, isEmailConfigured } from '$lib/server/email'
import { certificateTemplate } from '$lib/server/email-templates'

// Types for certificate data aggregation
interface ParticipantSongData {
	round: number
	songTitle: string
	artist: string
	totalRating: number
	jurorAverages: {
		performance: number | null
		vocal: number | null
		difficulty: number | null
	}
	spectatorComments: string[]
	jurorComments: string[]
}

interface ParticipantCertificateData {
	id: string
	email: string
	name: string
	artistName: string
	placement: number
	totalScore: number
	songs: ParticipantSongData[]
}

interface CertificateResult {
	participantId: string
	email: string
	success: boolean
	error?: string
	chatGptGenerated: boolean
}

interface ChatGPTResponse {
	text: string
	success: boolean
	error?: string
}

// ============================================================================
// Configuration Check
// ============================================================================

/**
 * Check if certificate service is fully configured
 * All three must be set: OPENAI_API_KEY, CERTIFICATE_PROMPT, and SMTP
 */
export function isCertificateServiceConfigured(): boolean {
	return Boolean(env.OPENAI_API_KEY) && Boolean(env.CERTIFICATE_PROMPT) && isEmailConfigured()
}

// ============================================================================
// OpenAI API Functions
// ============================================================================

/**
 * Get the system prompt from environment variable
 * Converts escaped \n to actual newlines
 */
function getSystemPrompt(): string {
	const template = env.CERTIFICATE_PROMPT || ''
	return template.replace(/\\n/g, '\n')
}

/**
 * Default system prompt if CERTIFICATE_PROMPT is not set
 */
const DEFAULT_SYSTEM_PROMPT =
	'Du bist ein freundlicher Moderator eines Gesangswettbewerbs. ' +
	'Schreibe einen persoenlichen, motivierenden Text (max 500 Zeichen) basierend auf den Teilnehmerdaten. ' +
	'Antworte immer auf Deutsch.'

/**
 * Call OpenAI API to generate personalized certificate text
 * @param userData - The participant's song data and ratings as user message
 */
async function generateCertificateText(userData: string): Promise<ChatGPTResponse> {
	const apiKey = env.OPENAI_API_KEY

	if (!apiKey) {
		return { text: '', success: false, error: 'api_key_missing' }
	}

	const systemPrompt = getSystemPrompt() || DEFAULT_SYSTEM_PROMPT

	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-5.2-2025-12-11',
				messages: [
					{
						role: 'system',
						content: systemPrompt
					},
					{
						role: 'user',
						content: userData
					}
				],
				max_completion_tokens: 3000,
				temperature: 0.8
			})
		})

		if (!response.ok) {
			const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
			logger.error('OpenAI API error', {
				status: response.status,
				error: errorData
			})
			return {
				text: '',
				success: false,
				error: `api_error_${response.status}`
			}
		}

		const data = (await response.json()) as {
			choices?: { message?: { content?: string } }[]
		}
		const text = data.choices?.[0]?.message?.content?.trim() || ''

		// Truncate to 500 chars if needed
		const truncatedText = text.length > 800 ? text.substring(0, 797) + '...' : text

		logger.info('OpenAI certificate text generated', {
			charCount: truncatedText.length
		})

		return { text: truncatedText, success: true }
	} catch (error) {
		logger.error('OpenAI API call failed', {
			error: String((error as Error)?.message || error)
		})
		return {
			text: '',
			success: false,
			error: 'network_error'
		}
	}
}

// ============================================================================
// Data Aggregation Functions
// ============================================================================

/**
 * Build the user data string for ChatGPT based on participant data
 * This will be sent as the user message, while CERTIFICATE_PROMPT is the system message
 */
function buildUserData(data: ParticipantCertificateData, totalParticipants: number): string {
	// Build header with participant info
	const headerLines: string[] = [
		`Anzahl der Teilnehmer: ${totalParticipants}`,
		`Platzierung: ${data.placement}`,
		`Name: ${data.name}`,
		`Kuenstlername: ${data.artistName || data.name}`
	]

	// Build songs data string in compact format
	const songBlocks = data.songs.map((song) => {
		const lines: string[] = []
		lines.push(`Song ${song.round}:`)
		lines.push(`- Songname: ${song.songTitle}`)
		lines.push(`- Interpret: ${song.artist}`)
		lines.push(`- Gesamtwertung fuer diesen Auftritt: ${song.totalRating.toFixed(2)}`)

		// Juror average ratings in one line (compact format)
		const jurorParts: string[] = []
		if (song.jurorAverages.performance !== null) {
			jurorParts.push(`Performance ${song.jurorAverages.performance.toFixed(1)}`)
		}
		if (song.jurorAverages.vocal !== null) {
			jurorParts.push(`Gesang ${song.jurorAverages.vocal.toFixed(1)}`)
		}
		if (song.jurorAverages.difficulty !== null) {
			jurorParts.push(`Schwierigkeit ${song.jurorAverages.difficulty.toFixed(1)}`)
		}
		if (jurorParts.length > 0) {
			lines.push(`- Jurorenwertung fuer diesen Auftritt: ${jurorParts.join(', ')}`)
		}

		// Comments without quotes (compact format)
		if (song.spectatorComments.length > 0) {
			lines.push(`- Zuschauerkommentare: ${song.spectatorComments.join(', ')}`)
		}
		if (song.jurorComments.length > 0) {
			lines.push(`- Jurorenkommentare: ${song.jurorComments.join(', ')}`)
		}

		return lines.join('\n')
	})

	// Combine header and songs into user data
	return [...headerLines, '', ...songBlocks].join('\n')
}

/**
 * Aggregate all data needed for a participant's certificate
 */
function aggregateParticipantData(
	participant: UsersResponse,
	placement: number,
	totalScore: number,
	allRatings: (RatingsResponse & { expand?: { author?: UsersResponse } })[],
	allSongChoices: SongChoicesResponse[]
): ParticipantCertificateData {
	// Get songs for this participant
	const participantSongs = allSongChoices
		.filter((sc) => sc.user === participant.id)
		.sort((a, b) => a.round - b.round)

	// Get ratings for this participant
	const participantRatings = allRatings.filter((r) => r.ratedUser === participant.id)

	const songs: ParticipantSongData[] = participantSongs.map((song) => {
		const roundRatings = participantRatings.filter((r) => r.round === song.round)

		// Separate juror and spectator ratings
		const jurorRatings = roundRatings.filter((r) => r.expand?.author?.role === 'juror')
		const spectatorRatings = roundRatings.filter((r) => r.expand?.author?.role === 'spectator')

		// Calculate average juror ratings per category
		const jurorAverages = {
			performance: null as number | null,
			vocal: null as number | null,
			difficulty: null as number | null
		}

		if (jurorRatings.length > 0) {
			const perfSum = jurorRatings.reduce((sum, r) => sum + (r.performanceRating || 0), 0)
			const vocalSum = jurorRatings.reduce((sum, r) => sum + (r.vocalRating || 0), 0)
			const diffSum = jurorRatings.reduce((sum, r) => sum + (r.difficultyRating || 0), 0)

			const perfCount = jurorRatings.filter((r) => r.performanceRating).length
			const vocalCount = jurorRatings.filter((r) => r.vocalRating).length
			const diffCount = jurorRatings.filter((r) => r.difficultyRating).length

			if (perfCount > 0) jurorAverages.performance = perfSum / perfCount
			if (vocalCount > 0) jurorAverages.vocal = vocalSum / vocalCount
			if (diffCount > 0) jurorAverages.difficulty = diffSum / diffCount
		}

		// Extract comments
		const spectatorComments = spectatorRatings
			.filter((r) => r.comment && r.comment.trim())
			.map((r) => r.comment!.trim())

		const jurorComments = jurorRatings
			.filter((r) => r.comment && r.comment.trim())
			.map((r) => r.comment!.trim())

		// Calculate total rating for this round (weighted: juror = 2x)
		let totalRating = 0
		let weightSum = 0
		for (const r of roundRatings) {
			const weight = r.expand?.author?.role === 'juror' ? 2 : 1
			totalRating += (r.rating || 0) * weight
			weightSum += weight
		}
		const avgRating = weightSum > 0 ? totalRating / weightSum : 0

		return {
			round: song.round,
			songTitle: song.songTitle,
			artist: song.artist,
			totalRating: Math.round(avgRating * 100) / 100,
			jurorAverages,
			spectatorComments,
			jurorComments
		}
	})

	return {
		id: participant.id,
		email: participant.email || '',
		name: participant.firstName || participant.name || 'Teilnehmer',
		artistName: participant.artistName || '',
		placement,
		totalScore: Math.round(totalScore * 100) / 100,
		songs
	}
}

// ============================================================================
// Email Sending Functions
// ============================================================================

/**
 * Send certificate email to a single participant
 */
async function sendCertificateEmail(
	data: ParticipantCertificateData,
	totalParticipants: number,
	totalVoters: number,
	totalJurors: number,
	appName?: string,
	appUrl?: string
): Promise<CertificateResult> {
	let personalizedText = ''
	let chatGptGenerated = false

	// Generate personalized text with ChatGPT
	// System prompt comes from CERTIFICATE_PROMPT env var, user data contains participant info
	const userData = buildUserData(data, totalParticipants)
	const result = await generateCertificateText(userData)

	if (result.success) {
		personalizedText = result.text
		chatGptGenerated = true
	} else {
		logger.warn('ChatGPT text generation failed, using fallback', {
			participantId: data.id,
			error: result.error
		})
		// Fallback text
		personalizedText =
			`Herzlichen Glueckwunsch zu Platz ${data.placement}! ` +
			`Deine Auftritte haben das Publikum begeistert. Danke fuer deine Teilnahme!`
	}

	// Generate email template
	const template = certificateTemplate({
		name: data.name,
		artistName: data.artistName,
		placement: data.placement,
		totalParticipants,
		totalScore: data.totalScore,
		personalizedText,
		totalVoters,
		totalJurors,
		appName,
		appUrl
	})

	// Send email
	const sent = await sendEmail({
		to: data.email,
		subject: template.subject,
		html: template.html,
		appName
	})

	return {
		participantId: data.id,
		email: data.email,
		success: sent,
		chatGptGenerated,
		error: sent ? undefined : 'email_send_failed'
	}
}

// ============================================================================
// Main Export Function
// ============================================================================

interface FinalRanking {
	id: string
	avg: number
	rank: number
}

/**
 * Main function to send all certificate emails
 * Called after publish_results action in the finale
 */
export async function sendAllCertificateEmails(
	pb: TypedPocketBase,
	rankings: FinalRanking[]
): Promise<{ sent: number; failed: number; results: CertificateResult[] }> {
	if (!isCertificateServiceConfigured()) {
		logger.warn('Certificate service not fully configured, skipping certificate emails')
		return { sent: 0, failed: 0, results: [] }
	}

	logger.info('Starting certificate email process', {
		participantCount: rankings.length
	})

	// Load all participants
	const allParticipants = (await pb.collection('users').getFullList({
		filter: 'role = "participant"'
	})) as UsersResponse[]

	// Load all ratings with author expand
	const allRatings = (await pb.collection('ratings').getFullList({
		expand: 'author'
	})) as (RatingsResponse & { expand?: { author?: UsersResponse } })[]

	// Load all song choices
	const allSongChoices = (await pb
		.collection('song_choices')
		.getFullList()) as SongChoicesResponse[]

	// Load app settings
	let appName: string | undefined
	let appUrl: string | undefined
	try {
		const appSettings = (await pb.collection('app_settings').getFullList()) as AppSettingsResponse[]
		appName = appSettings.find((s) => s.key === 'app_name')?.value
		appUrl = appSettings.find((s) => s.key === 'app_url')?.value
	} catch {
		logger.warn('Could not load app_settings for certificates')
	}

	const totalParticipants = rankings.length
	const results: CertificateResult[] = []

	// Calculate distinct voters (spectators) and jurors who voted
	const distinctVoterIds = new Set<string>()
	const distinctJurorIds = new Set<string>()
	for (const rating of allRatings) {
		const authorRole = rating.expand?.author?.role
		const authorId = rating.author
		if (authorId) {
			if (authorRole === 'spectator') {
				distinctVoterIds.add(authorId)
			} else if (authorRole === 'juror') {
				distinctJurorIds.add(authorId)
			}
		}
	}
	const totalVoters = distinctVoterIds.size
	const totalJurors = distinctJurorIds.size

	// Process each participant sequentially (to avoid rate limits)
	for (const ranking of rankings) {
		const participant = allParticipants.find((p) => p.id === ranking.id)
		if (!participant) {
			logger.warn('Participant not found for certificate', { id: ranking.id })
			results.push({
				participantId: ranking.id,
				email: '',
				success: false,
				error: 'participant_not_found',
				chatGptGenerated: false
			})
			continue
		}

		if (!participant.email) {
			logger.warn('Participant has no email for certificate', { id: ranking.id })
			results.push({
				participantId: ranking.id,
				email: '',
				success: false,
				error: 'no_email',
				chatGptGenerated: false
			})
			continue
		}

		try {
			const data = aggregateParticipantData(
				participant,
				ranking.rank,
				ranking.avg,
				allRatings,
				allSongChoices
			)

			const result = await sendCertificateEmail(
				data,
				totalParticipants,
				totalVoters,
				totalJurors,
				appName,
				appUrl
			)
			results.push(result)

			logger.info('Certificate email processed', {
				participantId: data.id,
				placement: data.placement,
				success: result.success,
				chatGptGenerated: result.chatGptGenerated
			})

			// Small delay between emails to avoid rate limits
			await new Promise((resolve) => setTimeout(resolve, 500))
		} catch (error) {
			logger.error('Certificate email failed', {
				participantId: ranking.id,
				error: String((error as Error)?.message || error)
			})
			results.push({
				participantId: ranking.id,
				email: participant.email || '',
				success: false,
				error: String((error as Error)?.message || error),
				chatGptGenerated: false
			})
		}
	}

	const sent = results.filter((r) => r.success).length
	const failed = results.filter((r) => !r.success).length

	logger.info('Certificate email process completed', { sent, failed })

	return { sent, failed, results }
}
