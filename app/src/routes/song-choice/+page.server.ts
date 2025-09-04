import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const pb = locals.pb

	try {
		// Load competition settings server-side
		const list = await pb.collection('settings').getList(1, 1)
		const settings = list.totalItems > 0 ? list.items[0] : null

		return {
			competitionSettings: settings
		}
	} catch (error) {
		console.error('Error loading settings:', error)
		return {
			competitionSettings: null
		}
	}
}
