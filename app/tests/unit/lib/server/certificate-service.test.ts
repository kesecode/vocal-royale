import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock logger
vi.mock('$lib/server/logger', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}))

// Mock email module
vi.mock('$lib/server/email', () => ({
	sendEmail: vi.fn().mockResolvedValue(true),
	isEmailConfigured: vi.fn().mockReturnValue(true)
}))

// Mock email-templates module
vi.mock('$lib/server/email-templates', () => ({
	certificateTemplate: vi.fn().mockReturnValue({
		subject: 'Test Subject',
		html: '<html>Test</html>'
	})
}))

describe('Certificate Service', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe('isCertificateServiceConfigured', () => {
		it('should return true when all config is present', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)

			const { isCertificateServiceConfigured } = await import('$lib/server/certificate-service')
			expect(isCertificateServiceConfigured()).toBe(true)
		})

		it('should return false when OPENAI_API_KEY is missing', async () => {
			vi.stubEnv('OPENAI_API_KEY', '')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)

			const { isCertificateServiceConfigured } = await import('$lib/server/certificate-service')
			expect(isCertificateServiceConfigured()).toBe(false)
		})

		it('should return false when CERTIFICATE_PROMPT is missing', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', '')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)

			const { isCertificateServiceConfigured } = await import('$lib/server/certificate-service')
			expect(isCertificateServiceConfigured()).toBe(false)
		})

		it('should return false when email is not configured', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(false)

			const { isCertificateServiceConfigured } = await import('$lib/server/certificate-service')
			expect(isCertificateServiceConfigured()).toBe(false)
		})
	})

	describe('sendAllCertificateEmails', () => {
		it('should skip when not configured', async () => {
			vi.stubEnv('OPENAI_API_KEY', '')
			vi.stubEnv('CERTIFICATE_PROMPT', '')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(false)

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockPb = {
				collection: vi.fn()
			}

			const result = await sendAllCertificateEmails(mockPb as never, [])

			expect(result.sent).toBe(0)
			expect(result.failed).toBe(0)
			expect(result.results).toEqual([])
		})

		it('should process participants when configured', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt with {name}')

			const { isEmailConfigured, sendEmail } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)
			vi.mocked(sendEmail).mockResolvedValue(true)

			// Mock OpenAI API response
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'Generated text for participant' } }]
				})
			})

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockParticipant = {
				id: 'user1',
				email: 'test@test.com',
				name: 'Test User',
				firstName: 'Test',
				artistName: 'DJ Test',
				role: 'participant',
				eliminated: false
			}

			const mockPb = {
				collection: vi.fn().mockImplementation((name: string) => ({
					getFullList: vi.fn().mockImplementation(() => {
						if (name === 'users') return Promise.resolve([mockParticipant])
						if (name === 'ratings') return Promise.resolve([])
						if (name === 'song_choices') return Promise.resolve([])
						if (name === 'app_settings') return Promise.resolve([])
						return Promise.resolve([])
					})
				}))
			}

			const rankings = [{ id: 'user1', avg: 8.5, rank: 1 }]

			const result = await sendAllCertificateEmails(mockPb as never, rankings)

			expect(result.sent).toBe(1)
			expect(result.failed).toBe(0)
			expect(result.results).toHaveLength(1)
			expect(result.results[0].success).toBe(true)
		})

		it('should handle participant without email', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockParticipant = {
				id: 'user1',
				email: '', // No email
				name: 'Test User',
				firstName: 'Test',
				role: 'participant'
			}

			const mockPb = {
				collection: vi.fn().mockImplementation((name: string) => ({
					getFullList: vi.fn().mockImplementation(() => {
						if (name === 'users') return Promise.resolve([mockParticipant])
						if (name === 'ratings') return Promise.resolve([])
						if (name === 'song_choices') return Promise.resolve([])
						if (name === 'app_settings') return Promise.resolve([])
						return Promise.resolve([])
					})
				}))
			}

			const rankings = [{ id: 'user1', avg: 8.5, rank: 1 }]

			const result = await sendAllCertificateEmails(mockPb as never, rankings)

			expect(result.failed).toBe(1)
			expect(result.results[0].error).toBe('no_email')
		})

		it('should handle participant not found', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockPb = {
				collection: vi.fn().mockImplementation((name: string) => ({
					getFullList: vi.fn().mockImplementation(() => {
						if (name === 'users') return Promise.resolve([]) // No participants
						if (name === 'ratings') return Promise.resolve([])
						if (name === 'song_choices') return Promise.resolve([])
						if (name === 'app_settings') return Promise.resolve([])
						return Promise.resolve([])
					})
				}))
			}

			const rankings = [{ id: 'unknown-user', avg: 8.5, rank: 1 }]

			const result = await sendAllCertificateEmails(mockPb as never, rankings)

			expect(result.failed).toBe(1)
			expect(result.results[0].error).toBe('participant_not_found')
		})

		it('should use fallback text when OpenAI fails', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test prompt')

			const { isEmailConfigured, sendEmail } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)
			vi.mocked(sendEmail).mockResolvedValue(true)

			// Mock OpenAI API failure
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => ({ error: 'Internal error' })
			})

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockParticipant = {
				id: 'user1',
				email: 'test@test.com',
				name: 'Test User',
				firstName: 'Test',
				role: 'participant'
			}

			const mockPb = {
				collection: vi.fn().mockImplementation((name: string) => ({
					getFullList: vi.fn().mockImplementation(() => {
						if (name === 'users') return Promise.resolve([mockParticipant])
						if (name === 'ratings') return Promise.resolve([])
						if (name === 'song_choices') return Promise.resolve([])
						if (name === 'app_settings') return Promise.resolve([])
						return Promise.resolve([])
					})
				}))
			}

			const rankings = [{ id: 'user1', avg: 8.5, rank: 1 }]

			const result = await sendAllCertificateEmails(mockPb as never, rankings)

			// Should still succeed with fallback text
			expect(result.sent).toBe(1)
			expect(result.results[0].chatGptGenerated).toBe(false)
		})

		it('should aggregate song data with ratings correctly', async () => {
			vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
			vi.stubEnv('CERTIFICATE_PROMPT', 'Test {songsData}')

			const { isEmailConfigured, sendEmail } = await import('$lib/server/email')
			vi.mocked(isEmailConfigured).mockReturnValue(true)
			vi.mocked(sendEmail).mockResolvedValue(true)

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'Great performance!' } }]
				})
			})

			const { sendAllCertificateEmails } = await import('$lib/server/certificate-service')

			const mockParticipant = {
				id: 'user1',
				email: 'test@test.com',
				name: 'Test User',
				firstName: 'Test',
				artistName: 'DJ Test',
				role: 'participant'
			}

			const mockSongChoice = {
				id: 'song1',
				user: 'user1',
				round: 1,
				artist: 'Queen',
				songTitle: 'Bohemian Rhapsody',
				confirmed: true
			}

			const mockJurorRating = {
				id: 'rating1',
				author: 'juror1',
				ratedUser: 'user1',
				round: 1,
				rating: 4.5,
				performanceRating: 5,
				vocalRating: 4,
				difficultyRating: 4,
				comment: 'Great performance!',
				expand: {
					author: { id: 'juror1', role: 'juror', name: 'Juror 1' }
				}
			}

			const mockSpectatorRating = {
				id: 'rating2',
				author: 'spectator1',
				ratedUser: 'user1',
				round: 1,
				rating: 5,
				comment: 'Amazing!',
				expand: {
					author: { id: 'spectator1', role: 'spectator', name: 'Fan 1' }
				}
			}

			const mockPb = {
				collection: vi.fn().mockImplementation((name: string) => ({
					getFullList: vi.fn().mockImplementation(() => {
						if (name === 'users') return Promise.resolve([mockParticipant])
						if (name === 'ratings') return Promise.resolve([mockJurorRating, mockSpectatorRating])
						if (name === 'song_choices') return Promise.resolve([mockSongChoice])
						if (name === 'app_settings') return Promise.resolve([])
						return Promise.resolve([])
					})
				}))
			}

			const rankings = [{ id: 'user1', avg: 4.67, rank: 1 }]

			const result = await sendAllCertificateEmails(mockPb as never, rankings)

			expect(result.sent).toBe(1)
			expect(result.results[0].success).toBe(true)
			// The prompt should have been built with song data
			expect(mockFetch).toHaveBeenCalled()
		})
	})
})
