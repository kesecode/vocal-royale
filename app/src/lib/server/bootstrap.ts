import PocketBase from 'pocketbase'
import type { TypedPocketBase } from '$lib/pocketbase-types'
import { env } from '$env/dynamic/private'
import { logger } from '$lib/server/logger'
import { building } from '$app/environment'

declare global {
	interface ImportMeta {
		vitest?: boolean
	}
}

const BASE_URL = env.PB_URL || 'http://127.0.0.1:8090'

let started = false

async function ensureInitialData(pb: TypedPocketBase) {
	// 1) Ensure Admin user exists (auth first to avoid listRule restrictions)
	try {
		const email = env.ADMIN_EMAIL || 'admin@vocal.royale'
		const password = env.ADMIN_PASSWORD || 'ChangeMeNow!'
		const firstName = 'Admin'
		const lastName = 'User'
		let exists = false
		try {
			await pb.collection('users').authWithPassword(email, password)
			exists = true
		} catch {
			exists = false
		} finally {
			pb.authStore.clear()
		}

		if (!exists) {
			try {
				await pb.collection('users').create({
					email,
					firstName,
					lastName,
					password,
					passwordConfirm: password,
					role: 'admin'
				})
				logger.info('Bootstrap: created admin app user')
				// authenticate to allow protected writes if needed
				try {
					await pb.collection('users').authWithPassword(email, password)
				} catch {
					// Authentication failed after user creation
				}
			} catch (e) {
				// Likely already exists due to race or manual seed
				logger.warn('Bootstrap: create admin user failed (may already exist)', {
					error: String((e as Error)?.message || e)
				})
			}
		}
	} catch (e) {
		logger.warn('Bootstrap: admin user ensure failed', {
			error: String((e as Error)?.message || e)
		})
	}

	// 2) Ensure competition_state exists (round: 1)
	try {
		// Auth as admin first to check competition_state (collection might have auth rules)
		if (!pb.authStore.isValid) {
			try {
				await pb
					.collection('users')
					.authWithPassword(
						env.ADMIN_EMAIL || 'admin@vocal.royale',
						env.ADMIN_PASSWORD || 'ChangeMeNow!'
					)
			} catch {
				// If admin auth fails, continue without auth (for fresh setups)
			}
		}

		const list = await pb.collection('competition_state').getList(1, 1)
		logger.info('Bootstrap: competition_state check', { totalItems: list?.totalItems })
		if (!list || list.totalItems === 0) {
			const createBody = { round: 1, competitionStarted: false }
			let created = false
			try {
				await pb.collection('competition_state').create(createBody)
				created = true
			} catch (e) {
				// If forbidden, try as admin (if we can auth)
				const msg = String((e as Error)?.message || e)
				if (!created) {
					try {
						// auth may already be active from above; if not, attempt
						// (note: we rely on default admin credentials only in fresh setups)
						if (!pb.authStore.isValid) {
							await pb
								.collection('users')
								.authWithPassword(
									env.ADMIN_EMAIL || 'admin@vocal.royale',
									env.ADMIN_PASSWORD || 'ChangeMeNow!'
								)
						}
						await pb.collection('competition_state').create(createBody)
						created = true
					} catch (e2) {
						logger.warn('Bootstrap: failed to create competition_state', {
							error: String((e2 as Error)?.message || e2),
							firstError: msg
						})
					} finally {
						pb.authStore.clear()
					}
				}
			}
			if (created) logger.info('Bootstrap: created initial competition_state')
		}
	} catch (e) {
		logger.warn('Bootstrap: competition_state ensure failed', {
			error: String((e as Error)?.message || e)
		})
	} finally {
		pb.authStore.clear()
	}

	// 3) Ensure settings exists with default values
	try {
		// Auth as admin first to check settings (collection might have auth rules)
		if (!pb.authStore.isValid) {
			try {
				await pb
					.collection('users')
					.authWithPassword(
						env.ADMIN_EMAIL || 'admin@vocal.royale',
						env.ADMIN_PASSWORD || 'ChangeMeNow!'
					)
			} catch {
				// If admin auth fails, continue without auth (for fresh setups)
			}
		}

		const list = await pb.collection('settings').getList(1, 1)
		logger.info('Bootstrap: settings check', { totalItems: list?.totalItems })
		if (!list || list.totalItems === 0) {
			const createBody = {
				maxParticipantCount: 15,
				maxJurorCount: 3,
				totalRounds: 5,
				numberOfFinalSongs: 2,
				songChoiceDeadline: null,
				roundEliminationPattern: '5,3,3,2'
			}
			let created = false
			try {
				await pb.collection('settings').create(createBody)
				created = true
			} catch (e) {
				// If forbidden, try as admin (if we can auth)
				const msg = String((e as Error)?.message || e)
				if (!created) {
					try {
						// auth may already be active from above; if not, attempt
						if (!pb.authStore.isValid) {
							await pb
								.collection('users')
								.authWithPassword(
									env.ADMIN_EMAIL || 'admin@vocal.royale',
									env.ADMIN_PASSWORD || 'ChangeMeNow!'
								)
						}
						await pb.collection('settings').create(createBody)
						created = true
					} catch (e2) {
						logger.warn('Bootstrap: failed to create settings', {
							error: String((e2 as Error)?.message || e2),
							firstError: msg
						})
					} finally {
						pb.authStore.clear()
					}
				}
			}
			if (created) logger.info('Bootstrap: created initial settings')
		}
	} catch (e) {
		logger.warn('Bootstrap: settings ensure failed', {
			error: String((e as Error)?.message || e)
		})
	} finally {
		pb.authStore.clear()
	}

	// 4) Ensure email_templates exist
	try {
		// Auth as admin first
		if (!pb.authStore.isValid) {
			try {
				await pb
					.collection('users')
					.authWithPassword(
						env.ADMIN_EMAIL || 'admin@vocal.royale',
						env.ADMIN_PASSWORD || 'ChangeMeNow!'
					)
			} catch {
				// If admin auth fails, continue without auth
			}
		}

		const list = await pb.collection('email_templates').getList(1, 1)
		logger.info('Bootstrap: email_templates check', { totalItems: list?.totalItems })
		if (!list || list.totalItems === 0) {
			const templates = [
				{
					template_type: 'verification',
					collection_ref: 'users',
					subject: 'E-Mail verifizieren - {app_name}',
					body: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail verifizieren - {app_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;">{app_name}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;">
              <h2 style="font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;">Willkommen bei {app_name}</h2>
              <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">Ai Gude,</p>
              <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">Vielen Dank, dass du dich bei {app_name} angemeldet hast! Klicke auf den Button unten, um deine E-Mail-Adresse zu verifizieren:</p>
              <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;">
                    <a href="{app_url}/auth/confirm-verification/{TOKEN}" style="display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;">E-Mail verifizieren</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;">Der Link ist 72 Stunden gültig.</p>
              <p style="font-size: 16px; line-height: 1.5; margin-top: 25px;">Wir freuen uns auf deine Teilnahme!<br/>Dein {app_name} Team</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 30px; color: #b3b3b3; font-size: 12px;">
              © 2025 David Weppler
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
					is_active: true
				},
				{
					template_type: 'password_reset',
					collection_ref: 'users',
					subject: 'Passwort zurücksetzen - {app_name}',
					body: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen - {app_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #b82015; font-family: 'Fredoka', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-image: radial-gradient(#a11b11 1.2px, transparent 1.2px); background-size: 12px 12px;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="font-family: 'Bangers', Arial, sans-serif; font-size: 48px; color: #ffcc00; margin: 0; text-shadow: 3px 3px 0 #000;">{app_name}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #5e0e79; border: 2px solid #333; border-radius: 10px; box-shadow: 4px 4px 0 #2a0436; padding: 30px; color: white;">
              <h2 style="font-family: 'Fredoka', Arial, sans-serif; font-size: 24px; margin-top: 0; color: #ffcc00;">Passwort zurücksetzen</h2>
              <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">Ai Gude,</p>
              <p style="font-size: 16px; line-height: 1.5; margin: 15px 0;">Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort festzulegen:</p>
              <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background-color: #ffcc00; border: 2px solid #333; border-radius: 12px; box-shadow: 4px 4px 0 #cc9900;">
                    <a href="{app_url}/auth/confirm-password-reset/{TOKEN}" style="display: inline-block; padding: 12px 24px; color: #161616; text-decoration: none; font-weight: 600; font-size: 16px;">Passwort zurücksetzen</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; line-height: 1.5; margin: 15px 0; color: #e6e6e6;"><i>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren.</i></p>
              <p style="font-size: 14px; line-height: 1.5; margin: 15px 0; color: #cccccc;">Der Link ist 30 Minuten gültig.</p>
              <p style="font-size: 16px; line-height: 1.5; margin-top: 25px;">Viel Spaß beim Singen!<br/>Dein {app_name} Team</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 30px; color: #b3b3b3; font-size: 12px;">
              © 2025 David Weppler
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
					is_active: true
				},
				{
					template_type: 'email_change',
					collection_ref: 'users',
					subject: 'Bestätige deine neue E-Mail-Adresse für {app_name}',
					body: `<p>Hallo,</p>
<p>Klicke auf die Schaltfläche unten, um deine neue E-Mail-Adresse zu bestätigen.</p>
<p>
  <a class="btn" href="{app_url}/_/#/auth/confirm-email-change/{TOKEN}" target="_blank" rel="noopener">Neue E-Mail bestätigen</a>
</p>
<p><i>Wenn du keine Änderung deiner E-Mail-Adresse angefordert hast, kannst du diese Nachricht ignorieren.</i></p>
<p>
  Vielen Dank,<br/>
  dein {app_name}-Team
</p>`,
					is_active: true
				}
			]

			for (const template of templates) {
				try {
					await pb.collection('email_templates').create(template)
				} catch (e) {
					logger.warn('Bootstrap: failed to create email template', {
						error: String((e as Error)?.message || e),
						template: template.template_type
					})
				}
			}
			logger.info('Bootstrap: created email templates')
		}
	} catch (e) {
		logger.warn('Bootstrap: email_templates ensure failed', {
			error: String((e as Error)?.message || e)
		})
	} finally {
		pb.authStore.clear()
	}

	// 5) Ensure ui_content exists (home page)
	try {
		// Auth as admin first
		if (!pb.authStore.isValid) {
			try {
				await pb
					.collection('users')
					.authWithPassword(
						env.ADMIN_EMAIL || 'admin@vocal.royale',
						env.ADMIN_PASSWORD || 'ChangeMeNow!'
					)
			} catch {
				// If admin auth fails, continue without auth
			}
		}

		const list = await pb.collection('ui_content').getList(1, 1)
		logger.info('Bootstrap: ui_content check', { totalItems: list?.totalItems })
		if (!list || list.totalItems === 0) {
			const uiContent = [
				{
					key: 'home.greeting',
					value: 'Ai Gude {displayName}, wie!?',
					category: 'home',
					description: 'Hauptüberschrift auf der Startseite',
					variables: ['displayName'],
					is_active: true
				},
				{
					key: 'home.subtitle',
					value: 'Schön, dass du da bist!',
					category: 'home',
					description: 'Untertitel auf der Startseite',
					variables: [],
					is_active: true
				}
			]

			for (const content of uiContent) {
				try {
					await pb.collection('ui_content').create(content)
				} catch (e) {
					logger.warn('Bootstrap: failed to create ui content', {
						error: String((e as Error)?.message || e),
						key: content.key
					})
				}
			}
			logger.info('Bootstrap: created UI content')
		}
	} catch (e) {
		logger.warn('Bootstrap: ui_content ensure failed', {
			error: String((e as Error)?.message || e)
		})
	} finally {
		pb.authStore.clear()
	}

	// 6) Ensure app_settings exist
	try {
		// Auth as admin first
		if (!pb.authStore.isValid) {
			try {
				await pb
					.collection('users')
					.authWithPassword(
						env.ADMIN_EMAIL || 'admin@vocal.royale',
						env.ADMIN_PASSWORD || 'ChangeMeNow!'
					)
			} catch {
				// If admin auth fails, continue without auth
			}
		}

		const list = await pb.collection('app_settings').getList(1, 1)
		logger.info('Bootstrap: app_settings check', { totalItems: list?.totalItems })
		if (!list || list.totalItems === 0) {
			// Use ENV values if available, otherwise use hardcoded defaults
			const appName = env.APP_NAME || 'Vocal Royale'
			const appUrl = env.APP_URL || 'https://app.example.com'

			const settings = [
				{
					key: 'app_name',
					value: appName,
					description: 'Name der Anwendung (wird in E-Mails und UI angezeigt)'
				},
				{
					key: 'app_url',
					value: appUrl,
					description: 'Basis-URL der Anwendung (für E-Mail-Links)'
				}
			]

			for (const setting of settings) {
				try {
					await pb.collection('app_settings').create(setting)
				} catch (e) {
					logger.warn('Bootstrap: failed to create app setting', {
						error: String((e as Error)?.message || e),
						key: setting.key
					})
				}
			}
			logger.info('Bootstrap: created app settings')
		}
	} catch (e) {
		logger.warn('Bootstrap: app_settings ensure failed', {
			error: String((e as Error)?.message || e)
		})
	} finally {
		pb.authStore.clear()
	}
}

export function initBootstrap() {
	if (started) return
	// Skip only in Vitest runs (robust check that won't affect dev/prod)
	if (typeof import.meta !== 'undefined' && import.meta.vitest) return
	// Skip during SvelteKit build
	if (building) return
	started = true
	const pb = new PocketBase(BASE_URL) as TypedPocketBase

	// Retry up to ~100s while PocketBase may still be starting
	const maxRetries = 100
	const delayMs = 1000

	logger.info('Bootstrap: init start', { baseUrl: BASE_URL, maxRetries, delayMs })

	const attempt = async (n: number) => {
		try {
			await pb.health.check()
			await ensureInitialData(pb)
			logger.info('Bootstrap: init done')
		} catch (e) {
			if (n >= maxRetries) {
				logger.warn('Bootstrap: giving up after retries', {
					error: String((e as Error)?.message || e)
				})
				return
			}
			setTimeout(() => attempt(n + 1), delayMs)
		}
	}

	// fire and forget
	void attempt(0)
}
