import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { actions, load } from '../../../src/routes/admin/customization/+page.server'

interface MockCollection {
	getFullList: ReturnType<typeof vi.fn>
	update: ReturnType<typeof vi.fn>
	create: ReturnType<typeof vi.fn>
	delete: ReturnType<typeof vi.fn>
	getList: ReturnType<typeof vi.fn>
}

interface MockPB {
	collection: ReturnType<typeof vi.fn>
	files: {
		getURL: ReturnType<typeof vi.fn>
	}
}

interface MockLocals {
	pb: MockPB
	user: { role: string; id: string }
}

describe('Admin Customization', () => {
	let mockPB: MockPB
	let mockLocals: MockLocals
	let mockCollections: Map<string, MockCollection>

	beforeEach(() => {
		// Create separate mock collections
		mockCollections = new Map()

		const createCollectionMock = () => ({
			getFullList: vi.fn().mockResolvedValue([]),
			update: vi.fn().mockResolvedValue({}),
			create: vi.fn().mockResolvedValue({}),
			delete: vi.fn().mockResolvedValue({}),
			getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 })
		})

		// Initialize mocks for each collection
		mockCollections.set('email_templates', createCollectionMock())
		mockCollections.set('ui_content', createCollectionMock())
		mockCollections.set('app_settings', createCollectionMock())
		mockCollections.set('app_assets', createCollectionMock())

		mockPB = {
			collection: vi.fn((name: string) => {
				if (!mockCollections.has(name)) {
					mockCollections.set(name, createCollectionMock())
				}
				return mockCollections.get(name)
			}),
			files: {
				getURL: vi.fn((record: { id: string }, filename: string) => {
					return `http://localhost/api/files/${record.id}/${filename}`
				})
			}
		}

		mockLocals = {
			pb: mockPB,
			user: { role: 'admin', id: 'admin123' }
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
		mockCollections.clear()
	})

	describe('load', () => {
		it('should load app settings and favicon data', async () => {
			const mockAppSettings = [
				{ id: '1', key: 'app_name', value: 'Test App', description: 'App Name' },
				{ id: '2', key: 'app_url', value: 'https://test.com', description: 'App URL' }
			]
			const mockFavicon = {
				id: 'fav1',
				file: 'favicon.ico',
				asset_type: 'favicon',
				is_active: true
			}

			mockCollections.get('email_templates')!.getFullList.mockResolvedValue([])
			mockCollections.get('ui_content')!.getFullList.mockResolvedValue([])
			mockCollections.get('app_settings')!.getFullList.mockResolvedValue(mockAppSettings)
			mockCollections.get('app_assets')!.getFullList.mockResolvedValue([mockFavicon])

			const result = await load({ locals: mockLocals } as never)

			expect(result).toBeDefined()
			expect(result).toHaveProperty('appSettings')
			expect(result).toHaveProperty('favicon')
			expect((result as { appSettings: unknown[] }).appSettings).toEqual(mockAppSettings)
			expect((result as { favicon: unknown }).favicon).toMatchObject({
				id: 'fav1',
				file: 'favicon.ico',
				is_active: true,
				url: expect.stringContaining('favicon.ico')
			})
		})

		it('should redirect non-admin users', async () => {
			mockLocals.user.role = 'participant'

			await expect(load({ locals: mockLocals } as never)).rejects.toThrow()
		})

		it('should return empty arrays on error', async () => {
			mockCollections.get('email_templates')!.getFullList.mockRejectedValue(new Error('DB Error'))
			mockCollections.get('ui_content')!.getFullList.mockRejectedValue(new Error('DB Error'))
			mockCollections.get('app_settings')!.getFullList.mockRejectedValue(new Error('DB Error'))
			mockCollections.get('app_assets')!.getFullList.mockRejectedValue(new Error('DB Error'))

			const result = await load({ locals: mockLocals } as never)

			expect(result).toBeDefined()
			expect(result).toHaveProperty('appSettings')
			expect(result).toHaveProperty('favicon')
			expect((result as { appSettings: unknown[] }).appSettings).toEqual([])
			expect((result as { favicon: unknown }).favicon).toBeNull()
		})
	})

	describe('updateAppSetting action', () => {
		it('should update app setting successfully', async () => {
			const formData = new FormData()
			formData.append('id', '1')
			formData.append('key', 'app_name')
			formData.append('value', 'New App Name')

			const request = { formData: async () => formData } as never
			const result = await actions.updateAppSetting({ request, locals: mockLocals } as never)

			expect(result).toMatchObject({ success: true })
			expect(mockPB.collection).toHaveBeenCalledWith('app_settings')
			expect(mockCollections.get('app_settings')!.update).toHaveBeenCalledWith('1', {
				key: 'app_name',
				value: 'New App Name'
			})
		})

		it('should fail for non-admin users', async () => {
			mockLocals.user.role = 'participant'

			const formData = new FormData()
			formData.append('id', '1')
			formData.append('key', 'app_name')
			formData.append('value', 'New App Name')

			const request = { formData: async () => formData } as never
			const result = await actions.updateAppSetting({ request, locals: mockLocals } as never)

			expect(result?.status).toBe(403)
		})

		it('should validate required fields', async () => {
			const formData = new FormData()
			formData.append('id', '1')
			// Missing key and value

			const request = { formData: async () => formData } as never
			const result = await actions.updateAppSetting({ request, locals: mockLocals } as never)

			expect(result?.status).toBe(400)
		})
	})

	describe('resetAppSettings action', () => {
		it('should reset app settings to defaults', async () => {
			const existingSettings = [
				{ id: '1', key: 'app_name', value: 'Custom Name' },
				{ id: '2', key: 'app_url', value: 'https://custom.com' }
			]

			mockCollections.get('app_settings')!.getFullList.mockResolvedValue(existingSettings)

			const result = await actions.resetAppSettings({ locals: mockLocals } as never)

			expect(result).toMatchObject({ success: true })
			expect(mockCollections.get('app_settings')!.update).toHaveBeenCalledTimes(2)
			expect(mockCollections.get('app_settings')!.update).toHaveBeenCalledWith('1', {
				value: 'Vocal Royale',
				description: expect.any(String)
			})
			expect(mockCollections.get('app_settings')!.update).toHaveBeenCalledWith('2', {
				value: 'https://app.example.com',
				description: expect.any(String)
			})
		})

		it('should fail for non-admin users', async () => {
			mockLocals.user.role = 'participant'

			const result = await actions.resetAppSettings({ locals: mockLocals } as never)

			expect(result?.status).toBe(403)
		})
	})

	describe('uploadFavicon action', () => {
		it('should upload favicon successfully', async () => {
			const file = new File(['favicon content'], 'favicon.ico', { type: 'image/x-icon' })
			const formData = new FormData()
			formData.append('file', file)
			formData.append('is_active', 'true')

			mockCollections.get('app_assets')!.getFullList.mockResolvedValue([])

			const request = { formData: async () => formData } as never
			const result = await actions.uploadFavicon({ request, locals: mockLocals } as never)

			expect(result).toMatchObject({ success: true })
			expect(mockCollections.get('app_assets')!.create).toHaveBeenCalled()
		})

		it('should deactivate other favicons when uploading new active favicon', async () => {
			const file = new File(['favicon content'], 'favicon.ico', { type: 'image/x-icon' })
			const formData = new FormData()
			formData.append('file', file)
			formData.append('is_active', 'true')

			const existingFavicons = [
				{ id: 'fav1', is_active: true },
				{ id: 'fav2', is_active: true }
			]

			mockCollections.get('app_assets')!.getFullList.mockResolvedValue(existingFavicons)

			const request = { formData: async () => formData } as never
			await actions.uploadFavicon({ request, locals: mockLocals } as never)

			expect(mockCollections.get('app_assets')!.update).toHaveBeenCalledTimes(2)
			expect(mockCollections.get('app_assets')!.update).toHaveBeenCalledWith('fav1', {
				is_active: false
			})
			expect(mockCollections.get('app_assets')!.update).toHaveBeenCalledWith('fav2', {
				is_active: false
			})
		})

		it('should reject files larger than 5 MB', async () => {
			const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large-favicon.ico', {
				type: 'image/x-icon'
			})
			const formData = new FormData()
			formData.append('file', largeFile)
			formData.append('is_active', 'true')

			const request = { formData: async () => formData } as never
			const result = await actions.uploadFavicon({ request, locals: mockLocals } as never)

			expect(result?.status).toBe(400)
			expect(result?.data?.message).toContain('zu groß')
		})

		it('should reject empty file', async () => {
			const emptyFile = new File([], 'favicon.ico', { type: 'image/x-icon' })
			const formData = new FormData()
			formData.append('file', emptyFile)

			const request = { formData: async () => formData } as never
			const result = await actions.uploadFavicon({ request, locals: mockLocals } as never)

			expect(result?.status).toBe(400)
		})

		it('should fail for non-admin users', async () => {
			mockLocals.user.role = 'participant'

			const file = new File(['favicon content'], 'favicon.ico', { type: 'image/x-icon' })
			const formData = new FormData()
			formData.append('file', file)

			const request = { formData: async () => formData } as never
			const result = await actions.uploadFavicon({ request, locals: mockLocals } as never)

			expect(result?.status).toBe(403)
		})
	})

	describe('resetFavicon action', () => {
		it('should delete all custom favicons', async () => {
			const existingFavicons = [
				{ id: 'fav1', asset_type: 'favicon' },
				{ id: 'fav2', asset_type: 'favicon' }
			]

			mockCollections.get('app_assets')!.getFullList.mockResolvedValue(existingFavicons)

			const result = await actions.resetFavicon({ locals: mockLocals } as never)

			expect(result).toMatchObject({ success: true })
			expect(mockCollections.get('app_assets')!.delete).toHaveBeenCalledTimes(2)
			expect(mockCollections.get('app_assets')!.delete).toHaveBeenCalledWith('fav1')
			expect(mockCollections.get('app_assets')!.delete).toHaveBeenCalledWith('fav2')
		})

		it('should fail for non-admin users', async () => {
			mockLocals.user.role = 'participant'

			const result = await actions.resetFavicon({ locals: mockLocals } as never)

			expect(result?.status).toBe(403)
		})
	})
})
