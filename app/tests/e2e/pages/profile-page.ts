import type { Page } from '@playwright/test'
import { BasePage } from './base-page'
import type { UserRole } from '../../../src/lib/pocketbase-types'

/**
 * Profile Page Object Model
 */
export class ProfilePage extends BasePage {
	// Page elements
	private pageTitle = this.page.locator('h1:has-text("Profil")')
	private welcomeMessage = this.page.locator('text=Hallo')

	// Action buttons
	private changePasswordBtn = this.page.locator('button:has-text("Passwort ändern")')
	private changeArtistBtn = this.page.locator('button:has-text("Künstlername ändern")')
	private changeRoleBtn = this.page.locator('button:has-text("Rolle ändern")')
	private logoutBtn = this.page.locator('button:has-text("Logout")')
	private deleteAccountBtn = this.page.locator('button:has-text("Konto löschen")')

	// Forms
	private passwordForm = this.page.locator('form[action*="changePassword"]')
	private artistForm = this.page.locator('form[action*="changeArtist"]')
	private roleForm = this.page.locator('form[action*="changeRole"]')

	// Form inputs
	private oldPasswordInput = this.page.locator('input[name="oldPassword"]')
	private newPasswordInput = this.page.locator('input[name="password"]')
	private confirmPasswordInput = this.page.locator('input[name="passwordConfirm"]')
	private artistNameInput = this.page.locator('input[name="artistName"]')

	// Role selection
	private participantRoleRadio = this.page.locator('input[value="participant"]')
	private spectatorRoleRadio = this.page.locator('input[value="spectator"]')
	private jurorRoleRadio = this.page.locator('input[value="juror"]')

	// Back buttons
	private backButtons = this.page.locator('button:has-text("Zurück")')

	constructor(page: Page) {
		super(page)
	}

	async goto(): Promise<void> {
		await this.page.goto('/profile')
	}

	async isLoaded(): Promise<boolean> {
		return await this.pageTitle.isVisible()
	}

	// Profile Information
	async getWelcomeMessage(): Promise<string> {
		return (await this.welcomeMessage.textContent()) || ''
	}

	async getArtistName(): Promise<string> {
		const artistElement = this.page.locator('text=a.k.a.')
		if (await artistElement.isVisible()) {
			const text = await artistElement.textContent()
			return text?.replace('a.k.a. ', '') || ''
		}
		return ''
	}

	// Password Change
	async openPasswordChange(): Promise<void> {
		await this.changePasswordBtn.click()
		await this.passwordForm.waitFor({ state: 'visible' })
	}

	async changePassword(
		oldPassword: string,
		newPassword: string,
		confirmPassword: string
	): Promise<void> {
		await this.openPasswordChange()
		await this.oldPasswordInput.fill(oldPassword)
		await this.newPasswordInput.fill(newPassword)
		await this.confirmPasswordInput.fill(confirmPassword)
		await this.passwordForm.locator('button[type="submit"]').click()
	}

	async cancelPasswordChange(): Promise<void> {
		await this.backButtons.first().click()
		await this.passwordForm.waitFor({ state: 'hidden' })
	}

	// Artist Name Change
	async openArtistChange(): Promise<void> {
		await this.changeArtistBtn.click()
		await this.artistForm.waitFor({ state: 'visible' })
	}

	async changeArtistName(artistName: string): Promise<void> {
		await this.openArtistChange()
		await this.artistNameInput.fill(artistName)
		await this.artistForm.locator('button[type="submit"]').click()
		await this.waitForSuccessMessage()
	}

	async cancelArtistChange(): Promise<void> {
		await this.backButtons.first().click()
		await this.artistForm.waitFor({ state: 'hidden' })
	}

	// Role Change
	async openRoleChange(): Promise<void> {
		await this.changeRoleBtn.click()
		await this.roleForm.waitFor({ state: 'visible' })
	}

	async changeRole(role: UserRole): Promise<void> {
		await this.openRoleChange()

		switch (role) {
			case 'participant':
				await this.participantRoleRadio.check()
				break
			case 'spectator':
				await this.spectatorRoleRadio.check()
				break
			case 'juror':
				await this.jurorRoleRadio.check()
				break
		}

		await this.roleForm.locator('button[type="submit"]').click()
		await this.waitForSuccessMessage()
	}

	async getRoleAvailability(): Promise<{
		participant: { available: boolean; remaining: number }
		juror: { available: boolean; remaining: number }
		spectator: { available: boolean }
	}> {
		await this.openRoleChange()

		const participantLabel = this.participantRoleRadio.locator('..').locator('..')
		const jurorLabel = this.jurorRoleRadio.locator('..').locator('..')

		const participantText = await participantLabel.textContent()
		const jurorText = await jurorLabel.textContent()

		// Parse availability info
		const participantMatch = participantText?.match(/Noch (\d+) Plätze frei/)
		const jurorMatch = jurorText?.match(/Noch (\d+) Plätze frei/)

		return {
			participant: {
				available: !!participantMatch,
				remaining: participantMatch ? parseInt(participantMatch[1]) : 0
			},
			juror: {
				available: !!jurorMatch,
				remaining: jurorMatch ? parseInt(jurorMatch[1]) : 0
			},
			spectator: {
				available: true // Always available
			}
		}
	}

	async cancelRoleChange(): Promise<void> {
		await this.backButtons.first().click()
		await this.roleForm.waitFor({ state: 'hidden' })
	}

	// Account Actions
	async logout(): Promise<void> {
		await this.logoutBtn.click()
		await this.page.waitForURL('/auth')
	}

	async deleteAccount(): Promise<void> {
		// Handle confirmation dialog
		this.page.on('dialog', (dialog) => dialog.accept())
		await this.deleteAccountBtn.click()
		await this.page.waitForURL('/auth?reason=account_deleted')
	}

	// Visibility Checks
	async canChangePassword(): Promise<boolean> {
		return await this.changePasswordBtn.isVisible()
	}

	async canChangeArtist(): Promise<boolean> {
		return await this.changeArtistBtn.isVisible()
	}

	async canChangeRole(): Promise<boolean> {
		return await this.changeRoleBtn.isVisible()
	}

	async canDeleteAccount(): Promise<boolean> {
		return await this.deleteAccountBtn.isVisible()
	}

	// Form State Checks
	async isPasswordFormVisible(): Promise<boolean> {
		return await this.passwordForm.isVisible()
	}

	async isArtistFormVisible(): Promise<boolean> {
		return await this.artistForm.isVisible()
	}

	async isRoleFormVisible(): Promise<boolean> {
		return await this.roleForm.isVisible()
	}

	async isInDefaultView(): Promise<boolean> {
		return (
			(await this.changePasswordBtn.isVisible()) &&
			!(await this.isPasswordFormVisible()) &&
			!(await this.isArtistFormVisible()) &&
			!(await this.isRoleFormVisible())
		)
	}

	// Message Helpers (inherited from BasePage)
	async getFormMessage(): Promise<string> {
		const successMessage = this.page.locator('.text-emerald-200')
		const errorMessage = this.page.locator('.text-rose-200')

		if (await successMessage.isVisible()) {
			return (await successMessage.textContent()) || ''
		}
		if (await errorMessage.isVisible()) {
			return (await errorMessage.textContent()) || ''
		}
		return ''
	}

	// Admin-specific checks
	async isAdmin(): Promise<boolean> {
		// Admin users cannot change role or delete account
		return !(await this.canChangeRole()) && !(await this.canDeleteAccount())
	}
}
