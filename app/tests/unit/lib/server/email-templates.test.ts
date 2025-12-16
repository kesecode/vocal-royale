import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Email Templates', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubEnv('APP_NAME', 'Test Vocal Royale')
		vi.stubEnv('ORIGIN', 'http://localhost:3000')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe('songConfirmationTemplate', () => {
		it('should generate confirmation email with correct subject', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Max',
				artist: 'Queen',
				songTitle: 'Bohemian Rhapsody',
				round: 2
			})

			expect(result.subject).toContain('Queen')
			expect(result.subject).toContain('Bohemian Rhapsody')
			expect(result.subject).toContain('bestätigt')
		})

		it('should include firstName and artistName in HTML body', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Max Mustermann',
				firstName: 'Max',
				artistName: 'DJ Maximus',
				artist: 'ABBA',
				songTitle: 'Dancing Queen',
				round: 1
			})

			expect(result.html).toContain('Ai Gude Max a.k.a. DJ Maximus,')
		})

		it('should include song details in HTML body', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Lisa',
				artist: 'Eagles',
				songTitle: 'Hotel California',
				round: 3
			})

			expect(result.html).toContain('Eagles')
			expect(result.html).toContain('Hotel California')
			expect(result.html).toContain('3. Runde')
		})

		it('should include app name from data in HTML body', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test Artist',
				songTitle: 'Test Song',
				round: 1,
				appName: 'Mein Vocal Royale'
			})

			expect(result.html).toContain('Mein Vocal Royale')
		})

		it('should use Comic design elements', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			// Check for Comic design colors
			expect(result.html).toContain('#b82015') // Red background
			expect(result.html).toContain('#5e0e79') // Purple content box
			expect(result.html).toContain('#ffcc00') // Yellow accent
			expect(result.html).toContain('Bangers') // Font
			expect(result.html).toContain('Fredoka') // Font
		})
	})

	describe('songRejectionTemplate', () => {
		it('should generate rejection email with correct subject', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Tom',
				artist: 'Beatles',
				songTitle: 'Yesterday',
				round: 2
			})

			expect(result.subject).toContain('Beatles')
			expect(result.subject).toContain('Yesterday')
			expect(result.subject).toContain('abgelehnt')
		})

		it('should include song details in HTML body', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Anna',
				artist: 'Adele',
				songTitle: 'Hello',
				round: 4
			})

			expect(result.html).toContain('Adele')
			expect(result.html).toContain('Hello')
			expect(result.html).toContain('4. Runde')
		})

		it('should NOT include comment section when no comment provided', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			expect(result.html).not.toContain('Anmerkung:')
		})

		it('should include comment section when comment is provided', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1,
				comment: 'Song wurde bereits vergeben'
			})

			expect(result.html).toContain('Anmerkung:')
			expect(result.html).toContain('Song wurde bereits vergeben')
		})

		it('should include link to choose new song', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			expect(result.html).toContain('http://localhost:3000/song-choice')
			expect(result.html).toContain('Neuen Song wählen')
		})

		it('should use Comic design elements', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			// Check for Comic design colors
			expect(result.html).toContain('#b82015') // Red background
			expect(result.html).toContain('#5e0e79') // Purple content box
			expect(result.html).toContain('#ffcc00') // Yellow button
			expect(result.html).toContain('Bangers') // Font
			expect(result.html).toContain('Fredoka') // Font
		})

		it('should show song details with line-through style', async () => {
			const { songRejectionTemplate } = await import('$lib/server/email-templates')

			const result = songRejectionTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test Artist',
				songTitle: 'Test Song',
				round: 1
			})

			expect(result.html).toContain('line-through')
		})
	})

	describe('certificateTemplate', () => {
		it('should generate certificate email with correct subject', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Max',
				artistName: 'DJ Maximus',
				placement: 1,
				totalParticipants: 10,
				totalScore: 8.75,
				personalizedText: 'Herzlichen Glueckwunsch!',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.subject).toContain('1. Platz')
			expect(result.subject).toContain('Sieger')
			expect(result.subject).toContain('Urkunde')
		})

		it('should use gold background for 1st place', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Winner',
				artistName: '',
				placement: 1,
				totalParticipants: 10,
				totalScore: 9.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('#d4af37') // Gold background
			expect(result.html).toContain('#ffd700') // Gold badge
		})

		it('should use silver background for 2nd place with yellow text', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Runner Up',
				artistName: '',
				placement: 2,
				totalParticipants: 10,
				totalScore: 8.5,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('#a8a8a8') // Silver background
			expect(result.html).toContain('#ffcc00') // Yellow badge (same as others)
		})

		it('should use bronze background for 3rd place with yellow text', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Third Place',
				artistName: '',
				placement: 3,
				totalParticipants: 10,
				totalScore: 8.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('#A84300') // Bronze background
			expect(result.html).toContain('#ffcc00') // Yellow badge (same as others)
		})

		it('should use red background for other placements', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Participant',
				artistName: '',
				placement: 5,
				totalParticipants: 10,
				totalScore: 7.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('#b82015') // Standard red background
		})

		it('should include personalized text', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const personalizedText = 'Deine Interpretation von Bohemian Rhapsody war atemberaubend!'
			const result = certificateTemplate({
				name: 'Test',
				artistName: '',
				placement: 3,
				totalParticipants: 10,
				totalScore: 8.0,
				personalizedText,
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain(personalizedText)
		})

		it('should display name and artistName correctly', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Max Mustermann',
				artistName: 'DJ Maximus',
				placement: 1,
				totalParticipants: 10,
				totalScore: 9.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('Max Mustermann a.k.a. DJ Maximus')
		})

		it('should display only name when artistName is empty', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Max Mustermann',
				artistName: '',
				placement: 1,
				totalParticipants: 10,
				totalScore: 9.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('Max Mustermann')
			expect(result.html).not.toContain('a.k.a.')
		})

		it('should use Comic design elements', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Test',
				artistName: '',
				placement: 3,
				totalParticipants: 10,
				totalScore: 8.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('#5e0e79') // Purple content box
			expect(result.html).toContain('Bangers') // Font
			expect(result.html).toContain('Fredoka') // Font
		})

		it('should display total score with 2 decimal places', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Test',
				artistName: '',
				placement: 1,
				totalParticipants: 10,
				totalScore: 8.75,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('8.75')
		})

		it('should display placement text for 3rd place', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Test',
				artistName: '',
				placement: 3,
				totalParticipants: 10,
				totalScore: 8.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('3. Platz')
		})

		it('should include participant count in display', async () => {
			const { certificateTemplate } = await import('$lib/server/email-templates')

			const result = certificateTemplate({
				name: 'Test',
				artistName: '',
				placement: 5,
				totalParticipants: 15,
				totalScore: 7.0,
				personalizedText: 'Test',
				totalVoters: 25,
				totalJurors: 3
			})

			expect(result.html).toContain('unter 15 Teilnehmern erreicht')
		})
	})

	describe('HTML structure', () => {
		it('should generate valid HTML document', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			expect(result.html).toContain('<!DOCTYPE html>')
			expect(result.html).toContain('<html lang="de">')
			expect(result.html).toContain('</html>')
		})

		it('should include copyright notice', async () => {
			const { songConfirmationTemplate } = await import('$lib/server/email-templates')

			const result = songConfirmationTemplate({
				recipientEmail: 'test@test.com',
				recipientName: 'Test',
				artist: 'Test',
				songTitle: 'Test',
				round: 1
			})

			expect(result.html).toContain('2025 David Weppler')
		})
	})
})
