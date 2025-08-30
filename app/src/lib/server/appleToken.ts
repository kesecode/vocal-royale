import fs from 'fs'
import crypto from 'crypto'
import { logger } from '$lib/server/logger'
import path from 'path'
import secrets from '$lib/config/secrets/secrets.json'
import config from '$lib/config/config.json'

let cached: { token: string; exp: number } | null = null

function b64url(input: Buffer | string) {
	const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
	return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function getAppleMusicToken(): string | null {
	// If a token is provided directly, prefer it
	logger.debug('getAppleMusicToken called')
	if (!secrets.APPLE_MUSIC_KEY_ID || !secrets.APPLE_TEAM_ID) {
		logger.warn('Apple Music token: missing key id or team id', {
			hasKeyId: Boolean(secrets.APPLE_MUSIC_KEY_ID),
			hasTeamId: Boolean(secrets.APPLE_TEAM_ID)
		})
		return null
	}

	const now = Math.floor(Date.now() / 1000)
	if (cached && now < cached.exp - 60) {
		logger.debug('Returning cached Apple Music token', {
			expiresAt: new Date(cached.exp * 1000).toISOString()
		})
		return cached.token
	}

	const ttlDays = Number(config.APPLE_MUSIC_TOKEN_TTL_DAYS || '7')
	const exp = now + Math.max(1, Math.min(ttlDays, 180)) * 24 * 60 * 60 // cap at 180 days

	const header = { alg: 'ES256', kid: secrets.APPLE_MUSIC_KEY_ID, typ: 'JWT' } as const
	const payload = { iss: secrets.APPLE_TEAM_ID, iat: now, exp } as const

	let privateKeyPem = ''
	const resolvedPath: string | null = path.resolve(process.cwd(), config.APPLE_MUSIC_KEY_PATH)
	try {
		privateKeyPem = fs.readFileSync(resolvedPath, 'utf8')
		logger.debug('Apple Music private key read', { keyPath: resolvedPath })
	} catch {
		logger.warn('Failed to read Apple Music private key from configured path', {
			path: resolvedPath
		})
	}

	const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
	const sign = crypto.createSign('sha256')
	sign.update(unsigned)
	sign.end()
	try {
		const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' })
		const token = `${unsigned}.${b64url(signature)}`
		cached = { token, exp }
		logger.info('Apple Music token generated', {
			expiresAt: new Date(exp * 1000).toISOString(),
			kid: secrets.APPLE_MUSIC_KEY_ID
		})
		return token
	} catch {
		logger.error('Failed to sign Apple Music token')
		return null
	}
}
