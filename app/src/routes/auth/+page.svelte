<section class="mx-auto max-w-sm space-y-6">
	{#if banner}
		<div class="panel panel-accent p-3 text-sm">{banner}</div>
	{/if}

	<Modal
		bind:open={showPasswordModal}
		title="Registrierung freischalten"
		onclose={closePasswordModal}
	>
		<div class="space-y-4">
			<p class="text-sm">Bitte gib das Registrierungs-Passwort ein, um dich zu registrieren.</p>
			{#if passwordError}
				<div class="text-sm text-rose-200">{passwordError}</div>
			{/if}
			<form
				onsubmit={(e) => {
					e.preventDefault()
					validatePassword()
				}}
			>
				<label class="block text-sm font-medium">
					Passwort
					<input
						class="input mt-1"
						type="password"
						bind:value={passwordInput}
						disabled={validatingPassword || remainingAttempts <= 0}
						required
					/>
				</label>
				<div class="mt-4 flex gap-2">
					<button
						type="submit"
						class="btn-brand"
						disabled={validatingPassword || remainingAttempts <= 0}
					>
						{validatingPassword ? 'Prüfe...' : 'Bestätigen'}
					</button>
					<button type="button" class="btn-purple" onclick={closePasswordModal}>Abbrechen</button>
				</div>
			</form>
		</div>
	</Modal>

	{#if mode === 'login'}
		<section class="panel panel-accent p-4 sm:p-6">
			<h2 class="font-semibold">Login</h2>
			{#if formData?.message}
				<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
			{/if}
			<form method="post" action="?/login" class="mt-4 space-y-4" use:enhance>
				<input type="hidden" name="next" value={next} />
				<label class="block text-sm font-medium">
					E-Mail
					<input class="input mt-1" name="email" type="email" required />
				</label>
				<label class="block text-sm font-medium">
					Passwort
					<input class="input mt-1" name="password" type="password" required minlength="8" />
				</label>
				<div class="mt-2 text-right">
					<a
						href="/auth/forgot-password"
						class="text-sm hover:underline"
						style="color: var(--color-gold-500)"
					>
						Passwort vergessen?
					</a>
				</div>
				<button type="submit" class="btn-brand">Login</button>
			</form>
		</section>
	{:else}
		<section id="signup" class="panel panel-brand p-4 sm:p-6">
			<h2 class="font-semibold">Sign up</h2>
			{#if formData?.message}
				<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
			{/if}
			<form method="post" action="?/signup" class="mt-4 space-y-4" use:enhance>
				<input type="hidden" name="next" value={next} />
				<label class="block text-sm font-medium">
					E-Mail
					<input class="input mt-1" name="email" type="email" required />
				</label>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="block text-sm font-medium">
						Vorname
						<input class="input mt-1" name="firstName" type="text" required />
					</label>
					<label class="block text-sm font-medium">
						Nachname
						<input class="input mt-1" name="lastName" type="text" required />
					</label>
				</div>
				<label class="block text-sm font-medium">
					Künstlername
					<input class="input mt-1" name="artistName" type="text" required />
				</label>
				<label class="block text-sm font-medium">
					Passwort
					<input class="input mt-1" name="password" type="password" required minlength="8" />
				</label>
				<label class="block text-sm font-medium">
					Passwort bestätigen
					<input class="input mt-1" name="passwordConfirm" type="password" required minlength="8" />
				</label>
				<button type="submit" class="btn-accent">Sign up</button>
			</form>
		</section>
	{/if}
	<div class="flex justify-center">
		<button
			type="button"
			class="text-sm hover:underline"
			style="color: var(--color-gold-500)"
			onclick={toggle}
			aria-pressed={mode === 'signup'}
		>
			{mode === 'login' ? 'Noch nicht registriert?' : 'Schon registriert?'}
		</button>
	</div>
</section>

<script lang="ts">
	import { onMount } from 'svelte'
	import { enhance } from '$app/forms'
	import Modal from '$lib/components/Modal.svelte'

	let mode = $state<'login' | 'signup'>('login')
	let banner = $state<string | null>(null)
	let next = $state('')
	let showPasswordModal = $state(false)
	let registrationUnlocked = $state(false)
	let passwordInput = $state('')
	let passwordError = $state<string | null>(null)
	let remainingAttempts = $state(3)
	let validatingPassword = $state(false)

	let { form: formData }: { form?: { message?: string } } = $props()

	onMount(() => {
		if (typeof window !== 'undefined' && window.location.hash === '#signup') {
			mode = 'signup'
		}
		if (typeof window !== 'undefined') {
			const q = new URLSearchParams(window.location.search)
			const reason = q.get('reason')
			if (reason === 'auth_required') {
				banner = 'Bitte melde dich an, um fortzufahren.'
			} else if (reason === 'account_deleted') {
				banner = 'Dein Konto wurde gelöscht. Du kannst dich neu registrieren.'
			} else if (reason === 'password_reset_success') {
				banner = 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.'
			}
			next = q.get('next') ?? ''

			// Check if registration is already unlocked in session
			if (sessionStorage.getItem('registrationUnlocked') === 'true') {
				registrationUnlocked = true
			}
		}
	})

	const toggle = () => {
		if (mode === 'login') {
			if (!registrationUnlocked) {
				showPasswordModal = true
				passwordInput = ''
				passwordError = null
			} else {
				mode = 'signup'
			}
		} else {
			mode = 'login'
		}
	}

	async function validatePassword() {
		if (!passwordInput.trim()) {
			passwordError = 'Bitte Passwort eingeben'
			return
		}

		validatingPassword = true
		passwordError = null

		try {
			const response = await fetch('/auth/validate-registration-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: passwordInput })
			})

			const result = await response.json()

			if (result.valid) {
				registrationUnlocked = true
				sessionStorage.setItem('registrationUnlocked', 'true')
				showPasswordModal = false
				mode = 'signup'
			} else {
				remainingAttempts--
				if (remainingAttempts <= 0) {
					passwordError = 'Keine Versuche mehr. Bitte lade die Seite neu.'
					setTimeout(() => {
						showPasswordModal = false
					}, 3000)
				} else {
					passwordError = `Falsches Passwort. ${remainingAttempts} ${remainingAttempts === 1 ? 'Versuch' : 'Versuche'} verbleibend.`
				}
				passwordInput = ''
			}
		} catch {
			passwordError = 'Fehler bei der Überprüfung. Bitte versuche es erneut.'
		} finally {
			validatingPassword = false
		}
	}

	function closePasswordModal() {
		showPasswordModal = false
		passwordInput = ''
		passwordError = null
	}
</script>
