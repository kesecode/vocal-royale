import { env } from '$env/dynamic/private'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { logger } from '$lib/server/logger'

export interface EmailOptions {
	to: string
	subject: string
	html: string
	appName?: string
}

export interface SongEmailData {
	recipientEmail: string
	recipientName: string
	firstName?: string
	artistName?: string
	artist: string
	songTitle: string
	round: number
	comment?: string
	appUrl?: string
	appName?: string
}

let transporter: Transporter | null = null

function getTransporter(): Transporter {
	if (transporter) return transporter

	const host = env.SMTP_HOST
	const port = Number(env.SMTP_PORT) || 587
	const user = env.SMTP_USER
	const pass = env.SMTP_PASSWORD

	if (!host || !user || !pass) {
		throw new Error('SMTP configuration incomplete')
	}

	transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass }
	})

	return transporter
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
	try {
		const transport = getTransporter()
		const fromEmail = env.SMTP_FROM || 'noreply@vocal-royale.de'
		const fromName = options.appName || 'Vocal Royale'
		const from = `"${fromName}" <${fromEmail}>`

		await transport.sendMail({
			from,
			to: options.to,
			subject: options.subject,
			html: options.html
		})

		logger.info('Email sent successfully', { to: options.to, subject: options.subject })
		return true
	} catch (error) {
		logger.error('Failed to send email', {
			error: String((error as Error)?.message || error),
			to: options.to
		})
		return false
	}
}

export function isEmailConfigured(): boolean {
	return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)
}
