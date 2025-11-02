import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import type { EmailTemplatesResponse, UiContentResponse } from '$lib/pocketbase-types'

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		redirect(303, '/')
	}

	const pb = locals.pb

	try {
		const [emailTemplates, uiContent] = await Promise.all([
			pb.collection('email_templates').getFullList<EmailTemplatesResponse>({
				sort: 'created'
			}),
			pb.collection('ui_content').getFullList<UiContentResponse>({
				sort: 'created'
			})
		])

		return {
			emailTemplates,
			uiContent
		}
	} catch (error) {
		console.error('[customization] Failed to load data:', error)
		return {
			emailTemplates: [],
			uiContent: []
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
	}
}
