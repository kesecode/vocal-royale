<Modal open={visible} title="Email bestätigen" onclose={() => {}}>
	<div class="form-spacing">
		<div class="content-spacing">
			<h2 class="font-display text-responsive">Bitte Email Adresse bestätigen!</h2>
			<p class="text-sm text-muted">
				Um dein Passwort zurücksetzen zu können musst du deine Email-Adresse bestätigen. Dir wurde
				eine Bestätigungs-Email an <strong class="text-brand">
					{email}
				</strong>
				gesendet.
			</p>
			<p class="text-sm text-muted mt-4">
				Bitte überprüfe dein Postfach (auch den Spam-Ordner) und klicke auf den Bestätigungslink.
			</p>

			{#if successMessage}
				<div class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
					<p class="text-sm text-green-400">{successMessage}</p>
				</div>
			{/if}

			{#if errorMessage}
				<div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
					<p class="text-sm text-red-400">{errorMessage}</p>
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<form method="POST" action="/auth?/logout" class="contents">
			<button type="submit" class="btn-secondary">Abmelden</button>
		</form>
		<button
			type="button"
			class="btn-brand"
			disabled={isLoading || cooldownRemaining > 0}
			onclick={handleResend}
		>
			{#if isLoading}
				Sende...
			{:else if cooldownRemaining > 0}
				Erneut senden ({cooldownRemaining}s)
			{:else}
				Bestätigung erneut senden
			{/if}
		</button>
	{/snippet}
</Modal>

<script lang="ts">
	import Modal from './Modal.svelte'
	import { invalidateAll } from '$app/navigation'

	interface Props {
		visible?: boolean
		email: string
	}

	let { visible = true, email }: Props = $props()

	let isLoading = $state(false)
	let successMessage = $state('')
	let errorMessage = $state('')
	let cooldownRemaining = $state(0)
	let cooldownInterval: ReturnType<typeof setInterval> | null = null

	async function handleResend() {
		if (isLoading || cooldownRemaining > 0) return

		isLoading = true
		successMessage = ''
		errorMessage = ''

		try {
			const response = await fetch('/api/resend-verification', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			})

			const data = await response.json()

			if (response.ok) {
				successMessage =
					'Bestätigungs-Email wurde erfolgreich gesendet! Bitte überprüfe dein Postfach.'
				startCooldown(120) // 2 Minuten Cooldown
			} else {
				errorMessage =
					data.error || 'Fehler beim Senden der Email. Bitte versuche es später erneut.'
			}
		} catch {
			errorMessage = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.'
		} finally {
			isLoading = false
		}
	}

	function startCooldown(seconds: number) {
		cooldownRemaining = seconds

		if (cooldownInterval) {
			clearInterval(cooldownInterval)
		}

		cooldownInterval = setInterval(() => {
			cooldownRemaining--
			if (cooldownRemaining <= 0 && cooldownInterval) {
				clearInterval(cooldownInterval)
				cooldownInterval = null
			}
		}, 1000)
	}

	// Check if user becomes verified (through email link)
	// Poll every 5 seconds
	let pollInterval: ReturnType<typeof setInterval> | null = null

	$effect(() => {
		if (visible) {
			pollInterval = setInterval(async () => {
				// Invalidate to check if user is now verified
				await invalidateAll()
			}, 5000)
		}

		return () => {
			if (pollInterval) {
				clearInterval(pollInterval)
			}
			if (cooldownInterval) {
				clearInterval(cooldownInterval)
			}
		}
	})
</script>
