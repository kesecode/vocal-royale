<section class="mx-auto max-w-fit space-y-6">
	<h1 class="font-display text-2xl sm:text-3xl">Profil</h1>
	<div class="panel panel-accent space-y-4 p-4 sm:p-6">
		<p class="text-sm text-white/80">Hallo {user?.firstName || user?.name || user?.username}!</p>
		{#if user?.artistName}
			<p class="text-sm text-white/70">a.k.a. {user.artistName}</p>
		{/if}

		{#if formData?.message}
			<div
				class={`text-sm ${formData.variant === 'success' ? 'text-emerald-200' : 'text-rose-200'}`}
			>
				{formData.message}
			</div>
		{/if}

		{#if !showPwd && !showArtist}
			<div class="flex gap-3">
				<button
					type="button"
					class="btn-brand"
					onclick={() => {
						showPwd = true
						showArtist = false
					}}
				>
					Passwort ändern
				</button>
				<button
					type="button"
					class="btn-accent"
					onclick={() => {
						showArtist = true
						showPwd = false
					}}
				>
					Künstlername ändern
				</button>
			</div>
			<div class="flex gap-3 pt-2">
				<form method="post" action="?/logout">
					<button type="submit" class="btn-danger">Logout</button>
				</form>
				<form
					method="post"
					action="?/deleteAccount"
					onsubmit={(e) => {
						e.preventDefault()
						if (confirm('Bist du sicher? Dieser Vorgang kann nicht rückgängig gemacht werden.')) {
							;(e.currentTarget as HTMLFormElement).submit()
						}
					}}
				>
					<button type="submit" class="btn-danger">Konto löschen</button>
				</form>
			</div>
		{/if}

		{#if showPwd}
			<form
				method="post"
				action="?/changePassword"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							// Erfolg: Meldung anzeigen (kommt über formData), zurück zur Standardansicht
							showPwd = false
							showArtist = false
							await update({ reset: true, invalidateAll: true })
						} else if (result.type === 'failure') {
							// Bei Passwort ungleich: Formular leeren
							const msg =
								typeof result.data === 'object' && result.data && 'message' in result.data
									? String((result.data as { message?: unknown }).message ?? '')
									: ''
							if (msg === 'Passwörter stimmen nicht überein.') {
								await update({ reset: true })
							} else {
								// Standard-Update, um Fehlermeldung anzuzeigen
								await update({})
							}
						}
					}
				}}
				class="mt-4 space-y-3"
			>
				<label class="block text-sm font-medium">
					Aktuelles Passwort
					<input class="input mt-1" name="oldPassword" type="password" required minlength="8" />
				</label>
				<label class="block text-sm font-medium">
					Neues Passwort
					<input class="input mt-1" name="password" type="password" required minlength="8" />
				</label>
				<label class="block text-sm font-medium">
					Passwort bestätigen
					<input class="input mt-1" name="passwordConfirm" type="password" required minlength="8" />
				</label>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn-danger"
						onclick={() => {
							showPwd = false
						}}
					>
						Abbrechen
					</button>
					<button type="submit" class="btn-brand">Speichern</button>
				</div>
			</form>
		{/if}

		{#if showArtist}
			<form
				method="post"
				action="?/changeArtist"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							// Erfolg: Meldung anzeigen und zurück zur Standardansicht
							showArtist = false
							showPwd = false
							await update({ reset: true, invalidateAll: true })
						} else {
							// Standard-Update, um Fehlermeldungen anzuzeigen
							await update({})
						}
					}
				}}
				class="mt-4 space-y-3"
			>
				<label class="block text-sm font-medium">
					Künstlername
					<input
						class="input mt-1"
						name="artistName"
						type="text"
						required
						value={user?.artistName || ''}
					/>
				</label>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn-danger"
						onclick={() => {
							showArtist = false
						}}
					>
						Abbrechen
					</button>
					<button type="submit" class="btn-brand">Speichern</button>
				</div>
			</form>
		{/if}
	</div>
</section>

<script lang="ts">
	import type { PageProps } from './$types'
	import { enhance } from '$app/forms'

	const props = $props()
	let { data } = props as PageProps
	const user = data.user

	// Toggles for separate edit sections
	let showPwd = $state(false)
	let showArtist = $state(false)

	let formData = (props as { form?: { message?: string; variant?: 'success' | 'error' } }).form
</script>
