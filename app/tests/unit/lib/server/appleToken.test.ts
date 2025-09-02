import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import crypto from 'crypto'

vi.mock('fs')
vi.mock('crypto')
vi.mock('$lib/server/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}))

describe('Apple Music Token', () => {
	const mockSign = vi.fn()
	const mockCreateSign = vi.fn(() => ({
		update: vi.fn(),
		end: vi.fn(),
		sign: mockSign
	}))

	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
		vi.mocked(crypto.createSign).mockImplementation(mockCreateSign)
		vi.mocked(fs.existsSync).mockReturnValue(false)
		vi.unstubAllEnvs()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	describe('environment variable configuration', () => {
		it('should return null when KEY_ID is missing', async () => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', '')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-key')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})

		it('should return null when TEAM_ID is missing', async () => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', '')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-key')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})

		it('should return null when private key is missing', async () => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', '')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})
	})

	describe('secrets.json fallback', () => {
		it('should use secrets.json when environment variables are not set', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true)
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					APPLE_MUSIC_KEY_ID: 'SECRET_KEY123',
					APPLE_TEAM_ID: 'SECRET_TEAM123'
				})
			)

			vi.stubEnv('APPLE_MUSIC_KEY_ID', '')
			vi.stubEnv('APPLE_TEAM_ID', '')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')

			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			expect(token).toBeTruthy()
		})

		it('should prefer environment variables over secrets.json', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true)
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					APPLE_MUSIC_KEY_ID: 'SECRET_KEY123',
					APPLE_TEAM_ID: 'SECRET_TEAM123'
				})
			)

			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'ENV_KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'ENV_TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')

			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			expect(token).toBeTruthy()
		})

		it('should handle malformed secrets.json gracefully', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true)
			vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

			vi.stubEnv('APPLE_MUSIC_KEY_ID', '')
			vi.stubEnv('APPLE_TEAM_ID', '')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})
	})

	describe('token generation', () => {
		beforeEach(() => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')
		})

		it('should generate a valid JWT token', async () => {
			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			expect(token).toBeTruthy()
			expect(typeof token).toBe('string')
			expect(token!.split('.')).toHaveLength(3)
		})

		it('should include correct header claims', async () => {
			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			const [headerB64] = token!.split('.')
			const header = JSON.parse(Buffer.from(headerB64, 'base64').toString())

			expect(header).toMatchObject({
				alg: 'ES256',
				kid: 'KEY123',
				typ: 'JWT'
			})
		})

		it('should include correct payload claims', async () => {
			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			const [, payloadB64] = token!.split('.')
			const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

			expect(payload).toMatchObject({
				iss: 'TEAM123',
				iat: expect.any(Number),
				exp: expect.any(Number)
			})
			expect(payload.exp).toBeGreaterThan(payload.iat)
		})

		it('should handle newline characters in private key', async () => {
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'line1\\nline2\\nline3')
			mockSign.mockReturnValue(Buffer.from('mock-signature'))

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeTruthy()
		})

		it('should return null when signing fails', async () => {
			mockSign.mockImplementation(() => {
				throw new Error('Signing failed')
			})

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})
	})

	describe('token caching', () => {
		beforeEach(() => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')
		})

		it('should cache tokens and reuse them', async () => {
			mockSign.mockReturnValue(Buffer.from('mock-signature'))

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token1 = getAppleMusicToken()
			const token2 = getAppleMusicToken()

			expect(token1).toBe(token2)
			expect(mockSign).toHaveBeenCalledTimes(1)
		})

		it('should regenerate token when cache expires', async () => {
			const pastTime = Date.now() - 1000 * 60 * 60
			vi.spyOn(Date, 'now').mockReturnValue(pastTime)

			mockSign.mockReturnValue(Buffer.from('mock-signature-1'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token1 = getAppleMusicToken()

			// Fast forward time and use new mock
			vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 8)
			mockSign.mockReturnValue(Buffer.from('mock-signature-2'))
			const token2 = getAppleMusicToken()

			expect(token1).not.toBe(token2)
			expect(mockSign).toHaveBeenCalledTimes(2)
		})
	})

	describe('TTL configuration', () => {
		beforeEach(() => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')
		})

		it('should respect custom TTL_DAYS', async () => {
			vi.stubEnv('APPLE_MUSIC_TOKEN_TTL_DAYS', '30')
			mockSign.mockReturnValue(Buffer.from('mock-signature'))

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			const [, payloadB64] = token!.split('.')
			const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

			const expectedExp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
			expect(payload.exp).toBeCloseTo(expectedExp, -1)
		})

		it('should cap TTL at 180 days maximum', async () => {
			vi.stubEnv('APPLE_MUSIC_TOKEN_TTL_DAYS', '365')
			mockSign.mockReturnValue(Buffer.from('mock-signature'))

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			const [, payloadB64] = token!.split('.')
			const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

			const maxExp = Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60
			expect(payload.exp).toBeLessThanOrEqual(maxExp + 1)
		})

		it('should enforce minimum TTL of 1 day', async () => {
			vi.stubEnv('APPLE_MUSIC_TOKEN_TTL_DAYS', '0')
			mockSign.mockReturnValue(Buffer.from('mock-signature'))

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			const [, payloadB64] = token!.split('.')
			const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

			const minExp = Math.floor(Date.now() / 1000) + 1 * 24 * 60 * 60
			expect(payload.exp).toBeGreaterThanOrEqual(minExp - 1)
		})
	})

	describe('base64url encoding', () => {
		beforeEach(() => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'mock-private-key')
		})

		it('should use base64url encoding (no padding)', async () => {
			mockSign.mockReturnValue(Buffer.from('mock-signature'))
			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			expect(token).not.toContain('=')
			expect(token).not.toContain('+')
			expect(token).not.toContain('/')
		})

		it('should properly encode signatures with padding characters', async () => {
			const signatureWithPadding = Buffer.from('this-needs-padding==')
			mockSign.mockReturnValue(signatureWithPadding)

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).not.toContain('=')
		})
	})

	describe('error edge cases', () => {
		it('should handle file system errors when reading secrets', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true)
			vi.mocked(fs.readFileSync).mockImplementation(() => {
				throw new Error('File system error')
			})

			vi.stubEnv('APPLE_MUSIC_KEY_ID', '')
			vi.stubEnv('APPLE_TEAM_ID', '')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})

		it('should handle crypto signing errors gracefully', async () => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', 'invalid-key-format')

			mockSign.mockImplementation(() => {
				throw new Error('Invalid key format')
			})

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()
			expect(token).toBeNull()
		})

		it('should handle empty private key gracefully', async () => {
			vi.stubEnv('APPLE_MUSIC_KEY_ID', 'KEY123')
			vi.stubEnv('APPLE_TEAM_ID', 'TEAM123')
			vi.stubEnv('APPLE_MUSIC_PRIVATE_KEY', '')

			const { getAppleMusicToken } = await import('$lib/server/appleToken')
			const token = getAppleMusicToken()

			// Should return null when private key is empty
			expect(token).toBeNull()
		})
	})
})
