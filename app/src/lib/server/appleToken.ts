import crypto from 'crypto'
import { logger } from '$lib/server/logger'
import { env } from '$env/dynamic/private'
import fs from 'fs'
import path from 'path'

// Load secrets.json lazily and only if present to avoid Vite build-time failures
type Secrets = Partial<{
    APPLE_MUSIC_KEY_ID: string
    APPLE_TEAM_ID: string
}>

function loadSecrets(): Secrets {
    try {
        const secretsPath = path.resolve(process.cwd(), 'src/lib/config/secrets/secrets.json')
        if (fs.existsSync(secretsPath)) {
            const raw = fs.readFileSync(secretsPath, 'utf8')
            return JSON.parse(raw)
        }
    } catch {
        // noop – absence or parse error falls back to env-only
    }
    return {}
}

const secrets = loadSecrets()

let cached: { token: string; exp: number } | null = null

function b64url(input: Buffer | string) {
	const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
	return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function getAppleMusicToken(): string | null {
	// If a token is provided directly, prefer it
	logger.debug('getAppleMusicToken called')
    const KEY_ID = env.APPLE_MUSIC_KEY_ID || secrets.APPLE_MUSIC_KEY_ID
    const TEAM_ID = env.APPLE_TEAM_ID || secrets.APPLE_TEAM_ID
    if (!KEY_ID || !TEAM_ID) {
        logger.warn('Apple Music token: missing key id or team id', {
            hasKeyId: Boolean(KEY_ID),
            hasTeamId: Boolean(TEAM_ID)
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

    const ttlDays = Number(env.APPLE_MUSIC_TOKEN_TTL_DAYS || '7')
    const exp = now + Math.max(1, Math.min(ttlDays, 180)) * 24 * 60 * 60 // cap at 180 days

    const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' } as const
    const payload = { iss: TEAM_ID, iat: now, exp } as const

    const privateKeyPem = env.APPLE_MUSIC_PRIVATE_KEY
        ? String(env.APPLE_MUSIC_PRIVATE_KEY).replace(/\\n/g, '\n')
        : ''
    if (!privateKeyPem) {
        logger.warn('Apple Music private key missing; validation disabled')
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
            kid: KEY_ID
        })
        return token
    } catch {
        logger.error('Failed to sign Apple Music token')
        return null
    }
}
