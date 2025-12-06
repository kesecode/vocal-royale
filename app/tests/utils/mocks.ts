import { vi } from 'vitest'
import type { UserRole } from '$lib/pocketbase-types'

type CollectionMock = {
	getFullList?: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>[]>
	getList?: (
		page?: number,
		perPage?: number,
		opts?: Record<string, unknown>
	) => Promise<{ items: Record<string, unknown>[] }>
	getOne?: (id: string) => Promise<Record<string, unknown>>
	create?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
	update?: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
	delete?: (id: string) => Promise<void>
	// auth methods for users service
	authWithPassword?: (email: string, password: string) => Promise<Record<string, unknown>>
	authRefresh?: () => Promise<Record<string, unknown>>
	// email verification methods
	requestVerification?: (email: string) => Promise<void>
	confirmVerification?: (token: string) => Promise<void>
	// password reset methods
	requestPasswordReset?: (email: string) => Promise<void>
	confirmPasswordReset?: (token: string, password: string, passwordConfirm: string) => Promise<void>
}

export function createPBMock(collections: Record<string, CollectionMock> = {}) {
	const services = new Map<string, CollectionMock>()
	for (const [name, mock] of Object.entries(collections)) services.set(name, mock)

	return {
		collection: vi.fn((name: string) => {
			if (!services.has(name)) services.set(name, {})
			const svc = services.get(name)!
			return {
				getFullList: vi.fn((opts?: Record<string, unknown>) =>
					svc.getFullList ? svc.getFullList(opts) : Promise.resolve([])
				),
				getList: vi.fn((page?: number, perPage?: number, opts?: Record<string, unknown>) =>
					svc.getList ? svc.getList(page, perPage, opts) : Promise.resolve({ items: [] })
				),
				getOne: vi.fn((id: string) =>
					svc.getOne
						? svc.getOne(id)
						: Promise.reject(Object.assign(new Error('not found'), { status: 404 }))
				),
				create: vi.fn((data: Record<string, unknown>) =>
					svc.create ? svc.create(data) : Promise.resolve({ id: 'new-id', ...data })
				),
				update: vi.fn((id: string, data: Record<string, unknown>) =>
					svc.update ? svc.update(id, data) : Promise.resolve({ id, ...data })
				),
				delete: vi.fn((id: string) => (svc.delete ? svc.delete(id) : Promise.resolve())),
				authWithPassword: vi.fn((email: string, password: string) =>
					svc.authWithPassword ? svc.authWithPassword(email, password) : Promise.resolve({})
				),
				authRefresh: vi.fn(() => (svc.authRefresh ? svc.authRefresh() : Promise.resolve({}))),
				requestVerification: vi.fn((email: string) =>
					svc.requestVerification ? svc.requestVerification(email) : Promise.resolve()
				),
				confirmVerification: vi.fn((token: string) =>
					svc.confirmVerification ? svc.confirmVerification(token) : Promise.resolve()
				),
				requestPasswordReset: vi.fn((email: string) =>
					svc.requestPasswordReset ? svc.requestPasswordReset(email) : Promise.resolve()
				),
				confirmPasswordReset: vi.fn((token: string, password: string, passwordConfirm: string) =>
					svc.confirmPasswordReset
						? svc.confirmPasswordReset(token, password, passwordConfirm)
						: Promise.resolve()
				)
			}
		}),
		authStore: {
			record: null as Record<string, unknown> | null,
			isValid: false,
			loadFromCookie: vi.fn(),
			exportToCookie: vi.fn(() => 'pb_auth=stub; Path=/; HttpOnly'),
			clear: vi.fn()
		}
	}
}

export function makeUser(
	partial: Partial<Record<string, unknown>> & {
		role: UserRole
	}
) {
	return {
		id: 'u_' + (partial.id ?? '1'),
		email: 'u@example.com',
		emailVisibility: false,
		verified: true,
		username: 'user',
		name: 'User',
		firstName: 'User',
		lastName: 'Test',
		artistName: 'Artist',
		eliminated: false,
		sangThisRound: false,
		...partial,
		role: partial.role
	}
}

export function jsonOf(resp: Response) {
	return resp.json() as Promise<unknown>
}

export function makeURL(pathname: string, search = '') {
	const base = 'http://localhost'
	return new URL(pathname + (search ? (search.startsWith('?') ? search : '?' + search) : ''), base)
}

export function makeSettings(
	partial: Partial<{
		maxParticipantCount?: number
		maxJurorCount?: number
		totalRounds?: number
		numberOfFinalSongs?: number
		songChoiceDeadline?: string
		roundEliminationPattern?: string
	}> = {}
) {
	return {
		id: 'settings_record_1',
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		collectionId: 'settings_collection_id',
		collectionName: 'settings',
		maxParticipantCount: 15,
		maxJurorCount: 3,
		totalRounds: 5,
		numberOfFinalSongs: 2,
		songChoiceDeadline: null,
		roundEliminationPattern: '5,3,3,2',
		...partial
	}
}

// Default settings for testing
export const mockSettings = makeSettings({
	maxParticipantCount: 8,
	maxJurorCount: 5
})

export function createRequestEvent<T = Record<string, unknown>>(
	locals: T,
	request: Request,
	params: Record<string, string> = {}
) {
	return {
		locals,
		request,
		params,
		cookies: {
			get: vi.fn(),
			getAll: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn()
		},
		fetch: vi.fn(fetch),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		platform: undefined,
		route: { id: null },
		setHeaders: vi.fn(),
		url: new URL(request.url),
		isDataRequest: false,
		isSubRequest: false,
		tracing: undefined,
		isRemoteRequest: false
	}
}
