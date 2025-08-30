import { env } from '$env/dynamic/private';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '$lib/server/logger';
import path from 'path';
import secrets from '$lib/secrets/secrets.json';

let cached: { token: string; exp: number } | null = null;

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function getAppleMusicToken(): string | null {
  // If a token is provided directly, prefer it
  logger.debug('getAppleMusicToken called');
  const direct = env.APPLE_MUSIC_TOKEN;
  if (direct) {
    logger.info('Using APPLE_MUSIC_TOKEN from env');
    return direct;
  }

  const keyId = env.APPLE_MUSIC_KEY_ID || secrets.appleMusicKeyId;
  const teamId = env.APPLE_TEAM_ID || secrets.appleTeamId;
  const configuredPath = env.APPLE_MUSIC_PRIVATE_KEY_PATH || '$lib/secrets/AppleMusicAuthKey.p8';
  if (!keyId || !teamId) {
    logger.warn('Apple Music token: missing key id or team id', {
      hasKeyId: Boolean(keyId),
      hasTeamId: Boolean(teamId)
    });
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cached && now < cached.exp - 60) {
    logger.debug('Returning cached Apple Music token', { expiresAt: new Date(cached.exp * 1000).toISOString() });
    return cached.token;
  }

  const ttlDays = Number(env.APPLE_MUSIC_TOKEN_TTL_DAYS || '7');
  const exp = now + Math.max(1, Math.min(ttlDays, 180)) * 24 * 60 * 60; // cap at 180 days

  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' } as const;
  const payload = { iss: teamId, iat: now, exp } as const;

  // Try resolve private key from configured path and common fallbacks
  const candidates: string[] = [];
  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) candidates.push(configuredPath);
    else candidates.push(path.resolve(process.cwd(), configuredPath));
  }
  // Back-compat fallback if dev server runs from repo root
  candidates.push(path.resolve(process.cwd(), 'aja30/secrets/AppleMusicAuthKey.p8'));
  logger.debug('Resolving Apple Music private key', { cwd: process.cwd(), candidates });

  let privateKeyPem = '';
  let resolvedPath: string | null = null;
  for (const p of candidates) {
    try {
      privateKeyPem = fs.readFileSync(p, 'utf8');
      resolvedPath = p;
      break;
    } catch {
      continue;
    }
  }
  if (!resolvedPath) {
    logger.error('Failed to read Apple Music private key', { tried: candidates });
    return null;
  }
  logger.debug('Apple Music private key read', { keyPath: resolvedPath });

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sign = crypto.createSign('sha256');
  sign.update(unsigned);
  sign.end();
  try {
    const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
    const token = `${unsigned}.${b64url(signature)}`;
    cached = { token, exp };
    logger.info('Apple Music token generated', { expiresAt: new Date(exp * 1000).toISOString(), kid: keyId });
    return token;
  } catch {
    logger.error('Failed to sign Apple Music token');
    return null;
  }
}
