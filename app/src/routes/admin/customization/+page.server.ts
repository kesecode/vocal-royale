import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import type {
	EmailTemplatesResponse,
	UiContentResponse,
	AppSettingsResponse,
	AppAssetsResponse
} from '$lib/pocketbase-types'

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
		const value = formData.get('value') as string

		if (!id || !key || !value) {
			return fail(400, { message: 'Key und Value sind erforderlich' })
		}

		try {
			await pb.collection('app_settings').update(id, {
				key,
				value
			})

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
	}
}
