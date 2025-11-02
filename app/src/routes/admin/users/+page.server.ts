import type { PageServerLoad } from './$types'
import type { UsersResponse } from '$lib/pocketbase-types'

type UsersListResponse = {
	items: UsersResponse[]
	page: number
	perPage: number
	totalItems: number
	totalPages: number
}

export const load = (async ({ fetch }) => {
	const res = await fetch('/admin/users/api?page=1')
	if (!res.ok) {
		throw new Error('Failed to fetch users')
	}
	const data: UsersListResponse = await res.json()
	return {
		users: data.items,
		page: data.page,
		perPage: data.perPage,
		totalItems: data.totalItems,
		totalPages: data.totalPages
	}
}) satisfies PageServerLoad
