import configData from '$lib/config/config.json'
import { env } from '$env/dynamic/private'

type AppConfig = {
	LOG_LEVEL?: string
	LOG_FORMAT?: string
	LOG_COLOR?: string
}
const config: AppConfig = configData as AppConfig
import util from 'util'

type LevelName = 'error' | 'warn' | 'info' | 'debug'

const levelWeights: Record<LevelName, number> = {
	error: 50,
	warn: 40,
	info: 30,
	debug: 20
}

// LOG_LEVEL supports: error, warn, info, debug (default: info)
const currentLevel = ((env.LOG_LEVEL || config.LOG_LEVEL || 'info').toLowerCase() as LevelName) || 'info'
const threshold = levelWeights[currentLevel] ?? levelWeights.info

// LOG_FORMAT: 'pretty' | 'json' (default: pretty)
const format = (env.LOG_FORMAT || config.LOG_FORMAT || 'pretty').toLowerCase() === 'json' ? 'json' : 'pretty'
const colorEnabled = (env.LOG_COLOR ?? config.LOG_COLOR ?? 'true') !== 'false'

// ANSI helpers
const codes = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	green: '\x1b[32m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
	gray: '\x1b[90m'
} as const
const paint = (s: string, color: keyof typeof codes) =>
	colorEnabled ? codes[color] + s + codes.reset : s

function fmtLevel(level: LevelName): string {
	switch (level) {
		case 'error':
			return paint('✖ ERROR', 'red')
		case 'warn':
			return paint('⚠ WARN', 'yellow')
		case 'info':
			return paint('ℹ INFO', 'cyan')
		case 'debug':
			return paint('• DEBUG', 'magenta')
	}
}

function fmtTime(d = new Date()): string {
	const pad = (n: number, s = 2) => String(n).padStart(s, '0')
	const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
	return paint(t, 'gray')
}

function fmtMeta(meta?: Record<string, unknown>): string {
	if (!meta) return ''
	const { scope, ...rest } = meta as Record<string, unknown> & { scope?: string }
	const scopeTxt = scope ? ` ${paint(`[${String(scope)}]`, 'bold')}` : ''
	const keys = Object.keys(rest)
	if (!keys.length) return scopeTxt
	const parts = keys.sort().map((k) => {
		const v = rest[k]
		const rendered =
			typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v == null
				? String(v)
				: util.inspect(v, { depth: 2, colors: colorEnabled, maxArrayLength: 10 })
		return `${paint(k, 'gray')}=${rendered}`
	})
	return `${scopeTxt} ${parts.join(' ')}`.trim()
}

function emit(level: LevelName, msg: string, meta?: Record<string, unknown>) {
	if ((levelWeights[level] ?? 100) < threshold) return
	if (format === 'json') {
		const line = { level, time: new Date().toISOString(), msg, ...(meta || {}) }
		const text = JSON.stringify(line)
		if (level === 'error') console.error(text)
		else if (level === 'warn') console.warn(text)
		else console.log(text)
		return
	}
	const out = `${fmtTime()} ${fmtLevel(level)} ${msg}${meta ? ' — ' + fmtMeta(meta) : ''}`
	if (level === 'error') console.error(out)
	else if (level === 'warn') console.warn(out)
	else console.log(out)
}

export const logger = {
	error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
	warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
	info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
	debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta)
}
