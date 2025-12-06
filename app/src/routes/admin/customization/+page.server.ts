import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type {
	EmailTemplatesResponse,
	UiContentResponse,
	AppSettingsResponse,
	AppAssetsResponse
} from '$lib/pocketbase-types'
import type PocketBase from 'pocketbase'

const PB_URL = env.PB_URL || 'http://127.0.0.1:8090'

/**
 * Replace template placeholders with actual values
 */
function replacePlaceholders(text: string, appName: string, appUrl: string): string {
	return text.replace(/{app_name}/g, appName).replace(/{app_url}/g, appUrl)
}

/**
 * Sync email templates from database to PocketBase collection settings.
 * This replaces {app_name} and {app_url} placeholders with actual values.
 * IMPORTANT: Requires Superuser authentication - normal admin tokens cannot modify collection settings!
 */
async function syncEmailTemplatesToCollections(pb: PocketBase): Promise<void> {
	// 1. Authenticate as Superuser (only superusers can modify collection settings!)
	const superuserEmail = env.PB_ADMIN_EMAIL
	const superuserPassword = env.PB_ADMIN_PASSWORD

	if (!superuserEmail || !superuserPassword) {
		console.error('[customization] PB_ADMIN_EMAIL/PASSWORD not set - cannot sync templates')
		return
	}

	const authResponse = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ identity: superuserEmail, password: superuserPassword })
	})

	if (!authResponse.ok) {
		console.error('[customization] Superuser auth failed:', await authResponse.text())
		return
	}

	const { token: superuserToken } = await authResponse.json()

	// 2. Get current app_settings (app_name, app_url)
	const settings = await pb.collection('app_settings').getFullList<AppSettingsResponse>()
	const appName = settings.find((s) => s.key === 'app_name')?.value || 'Vocal Royale'
	const appUrl = settings.find((s) => s.key === 'app_url')?.value || 'https://app.example.com'

	// 3. Get active email_templates
	const templates = await pb.collection('email_templates').getFullList<EmailTemplatesResponse>({
		filter: 'is_active = true'
	})

	// 4. Replace placeholders and update PocketBase collection settings
	for (const collectionName of ['users', '_superusers']) {
		const verification = templates.find(
			(t) => t.template_type === 'verification' && t.collection_ref === collectionName
		)
		const passwordReset = templates.find(
			(t) => t.template_type === 'password_reset' && t.collection_ref === collectionName
		)

		if (verification || passwordReset) {
			const options: Record<string, { subject: string; body: string }> = {}

			if (verification) {
				options.verificationTemplate = {
					subject: replacePlaceholders(verification.subject, appName, appUrl),
					body: replacePlaceholders(verification.body, appName, appUrl)
				}
			}

			if (passwordReset) {
				options.resetPasswordTemplate = {
					subject: replacePlaceholders(passwordReset.subject, appName, appUrl),
					body: replacePlaceholders(passwordReset.body, appName, appUrl)
				}
			}

			// Update PocketBase collection settings via API (using Superuser token!)
			// Note: Templates must be at the top level, NOT nested in "options"
			const response = await fetch(`${PB_URL}/api/collections/${collectionName}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: superuserToken
				},
				body: JSON.stringify(options)
			})

			if (!response.ok) {
				console.error(
					`[customization] Failed to sync templates to ${collectionName}:`,
					await response.text()
				)
			}
		}
	}
}

// Default values (matching bootstrap.ts)
const DEFAULT_APP_SETTINGS = [
	{
		key: 'app_name',
		value: 'Vocal Royale',
		description: 'Name der Anwendung (wird in E-Mails und UI angezeigt)'
	},
	{
		key: 'app_url',
		value: 'https://app.example.com',
		description: 'Basis-URL der Anwendung (für E-Mail-Links)'
	}
] as const

const DEFAULT_EMAIL_TEMPLATES = [
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
] as const

const DEFAULT_UI_CONTENT = [
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
		variables: [] as string[],
		is_active: true
	}
] as const

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		redirect(303, '/')
	}

	const pb = locals.pb

	try {
		// Load email templates and UI content in parallel (page-specific data)
		const [emailTemplates, uiContent] = await Promise.all([
			pb.collection('email_templates').getFullList<EmailTemplatesResponse>({
				sort: 'created'
			}),
			pb.collection('ui_content').getFullList<UiContentResponse>({
				sort: 'created'
			})
		])

		// Load app_settings sequentially to avoid race condition with +layout.server.ts
		const appSettings = await pb.collection('app_settings').getFullList<AppSettingsResponse>({
			sort: 'created'
		})

		// Load app_assets sequentially to avoid race condition with +layout.server.ts
		const appAssetsList = await pb.collection('app_assets').getFullList<AppAssetsResponse>({
			filter: 'asset_type = "favicon" && is_active = true',
			sort: '-created',
			limit: 1
		})

		// Generate favicon URL before returning (pb instance cannot be serialized)
		const favicon = appAssetsList.length > 0 ? appAssetsList[0] : null
		const faviconData = favicon
			? {
					id: favicon.id,
					file: favicon.file,
					url: pb.files.getURL(favicon, favicon.file),
					is_active: favicon.is_active
				}
			: null

		return {
			emailTemplates,
			uiContent,
			appSettings,
			favicon: faviconData
		}
	} catch (error) {
		console.error('[customization] Failed to load data:', error)
		return {
			emailTemplates: [],
			uiContent: [],
			appSettings: [],
			favicon: null
		}
	}
}

export const actions: Actions = {
	updateEmailTemplate: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb
		const formData = await request.formData()

		const id = formData.get('id') as string
		const template_type = formData.get('template_type') as string
		const collection_ref = formData.get('collection_ref') as string
		const subject = formData.get('subject') as string
		const body = formData.get('body') as string
		// Checkbox: true if present and === 'true', false otherwise (unchecked checkboxes don't send values)
		const is_active = formData.has('is_active') && formData.get('is_active') === 'true'

		if (!id || !template_type || !collection_ref || !subject || !body) {
			return fail(400, { message: 'Alle Felder sind erforderlich' })
		}

		try {
			await pb.collection('email_templates').update(id, {
				template_type,
				collection_ref,
				subject,
				body,
				is_active
			})

			// Sync templates to PocketBase collections
			await syncEmailTemplatesToCollections(pb)

			return { success: true, message: 'Email-Template erfolgreich aktualisiert' }
		} catch (error) {
			console.error('[customization] Failed to update email template:', error)
			return fail(500, { message: 'Fehler beim Aktualisieren des Email-Templates' })
		}
	},

	updateUiContent: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb
		const formData = await request.formData()

		const id = formData.get('id') as string
		const key = formData.get('key') as string
		const value = formData.get('value') as string
		const category = formData.get('category') as string
		const description = formData.get('description') as string
		// Checkbox: true if present and === 'true', false otherwise (unchecked checkboxes don't send values)
		const is_active = formData.has('is_active') && formData.get('is_active') === 'true'

		if (!id || !key || !value || !category) {
			return fail(400, { message: 'Key, Value und Category sind erforderlich' })
		}

		try {
			await pb.collection('ui_content').update(id, {
				key,
				value,
				category,
				description,
				is_active
			})

			return { success: true, message: 'UI-Text erfolgreich aktualisiert' }
		} catch (error) {
			console.error('[customization] Failed to update UI content:', error)
			return fail(500, { message: 'Fehler beim Aktualisieren des UI-Textes' })
		}
	},

	syncTemplates: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		// Template sync happens at container startup
		return {
			success: true,
			message: 'Template-Sync wird beim nächsten Container-Start durchgeführt'
		}
	},

	updateAppSetting: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb
		const formData = await request.formData()

		const id = formData.get('id') as string
		const key = formData.get('key') as string
		let value = formData.get('value') as string

		if (!id || !key || !value) {
			return fail(400, { message: 'Key und Value sind erforderlich' })
		}

		// Remove trailing slash from app_url
		if (key === 'app_url') {
			value = value.replace(/\/+$/, '')
		}

		try {
			await pb.collection('app_settings').update(id, {
				key,
				value
			})

			// Sync email templates if app_name or app_url changed
			if (key === 'app_name' || key === 'app_url') {
				await syncEmailTemplatesToCollections(pb)
			}

			return { success: true, message: 'App-Einstellung erfolgreich aktualisiert' }
		} catch (error) {
			console.error('[customization] Failed to update app setting:', error)
			return fail(500, { message: 'Fehler beim Aktualisieren der Einstellung' })
		}
	},

	uploadFavicon: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb
		const formData = await request.formData()

		const file = formData.get('file') as File
		const is_active = formData.has('is_active') && formData.get('is_active') === 'true'

		if (!file || file.size === 0) {
			return fail(400, { message: 'Bitte wähle eine Datei aus' })
		}

		// Check file size (5 MB max)
		if (file.size > 5 * 1024 * 1024) {
			return fail(400, { message: 'Datei ist zu groß (max. 5 MB)' })
		}

		try {
			// If is_active, deactivate all other favicons
			if (is_active) {
				const allFavicons = await pb.collection('app_assets').getFullList<AppAssetsResponse>({
					filter: 'asset_type = "favicon"'
				})

				for (const favicon of allFavicons) {
					await pb.collection('app_assets').update(favicon.id, { is_active: false })
				}
			}

			// Create new favicon
			const createFormData = new FormData()
			createFormData.append('asset_type', 'favicon')
			createFormData.append('file', file)
			createFormData.append('is_active', is_active.toString())

			await pb.collection('app_assets').create(createFormData)

			return { success: true, message: 'Favicon erfolgreich hochgeladen' }
		} catch (error) {
			console.error('[customization] Failed to upload favicon:', error)
			return fail(500, { message: 'Fehler beim Hochladen des Favicons' })
		}
	},

	resetAppSettings: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb

		try {
			// Get all existing app_settings
			const existing = await pb.collection('app_settings').getFullList<AppSettingsResponse>()

			// Update each setting to default value
			for (const defaultSetting of DEFAULT_APP_SETTINGS) {
				const existingItem = existing.find((s) => s.key === defaultSetting.key)

				if (existingItem) {
					await pb.collection('app_settings').update(existingItem.id, {
						value: defaultSetting.value,
						description: defaultSetting.description
					})
				}
			}

			// Sync email templates with new default values
			await syncEmailTemplatesToCollections(pb)

			return { success: true, message: 'App-Einstellungen auf Standardwerte zurückgesetzt' }
		} catch (error) {
			console.error('[customization] Failed to reset app settings:', error)
			return fail(500, { message: 'Fehler beim Zurücksetzen der Einstellungen' })
		}
	},

	resetFavicon: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb

		try {
			// Delete all custom favicons
			const allFavicons = await pb.collection('app_assets').getFullList<AppAssetsResponse>({
				filter: 'asset_type = "favicon"'
			})

			for (const favicon of allFavicons) {
				await pb.collection('app_assets').delete(favicon.id)
			}

			return {
				success: true,
				message: 'Favicon zurückgesetzt (Standard-Favicon wird verwendet)'
			}
		} catch (error) {
			console.error('[customization] Failed to reset favicon:', error)
			return fail(500, { message: 'Fehler beim Zurücksetzen des Favicons' })
		}
	},

	resetEmailTemplates: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb

		try {
			// Get all existing email templates
			const existing = await pb.collection('email_templates').getFullList<EmailTemplatesResponse>()

			// Update each template to default values
			for (const defaultTemplate of DEFAULT_EMAIL_TEMPLATES) {
				const existingItem = existing.find(
					(t) =>
						t.template_type === defaultTemplate.template_type &&
						t.collection_ref === defaultTemplate.collection_ref
				)

				if (existingItem) {
					await pb.collection('email_templates').update(existingItem.id, {
						subject: defaultTemplate.subject,
						body: defaultTemplate.body,
						is_active: defaultTemplate.is_active
					})
				}
			}

			// Sync templates to PocketBase collections
			await syncEmailTemplatesToCollections(pb)

			return { success: true, message: 'Email-Templates auf Standardwerte zurückgesetzt' }
		} catch (error) {
			console.error('[customization] Failed to reset email templates:', error)
			return fail(500, { message: 'Fehler beim Zurücksetzen der Email-Templates' })
		}
	},

	resetUiContent: async ({ locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { message: 'Unauthorized' })
		}

		const pb = locals.pb

		try {
			// Get all existing UI content
			const existing = await pb.collection('ui_content').getFullList<UiContentResponse>()

			// Update each UI content to default values
			for (const defaultContent of DEFAULT_UI_CONTENT) {
				const existingItem = existing.find((c) => c.key === defaultContent.key)

				if (existingItem) {
					await pb.collection('ui_content').update(existingItem.id, {
						value: defaultContent.value,
						category: defaultContent.category,
						description: defaultContent.description,
						variables: defaultContent.variables,
						is_active: defaultContent.is_active
					})
				}
			}

			return { success: true, message: 'UI-Texte auf Standardwerte zurückgesetzt' }
		} catch (error) {
			console.error('[customization] Failed to reset UI content:', error)
			return fail(500, { message: 'Fehler beim Zurücksetzen der UI-Texte' })
		}
	}
}
