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

		{#if !showPwd && !showArtist && !showRole}
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					class="btn-brand"
					onclick={() => {
						showPwd = true
						showArtist = false
						showRole = false
					}}
				>
					Passwort ändern
				</button>
				{#if user?.role !== 'admin'}
					<button
						type="button"
						class="btn-accent"
						onclick={() => {
							showArtist = true
							showPwd = false
							showRole = false
						}}
					>
						Künstlername ändern
					</button>
					<button
						type="button"
						class="btn-accent"
						onclick={() => {
							showRole = true
							showPwd = false
							showArtist = false
						}}
					>
						Rolle ändern
					</button>
				{/if}
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

		{#if showRole}
			<form
				method="post"
				action="?/changeRole"
				use:enhance={() => {
					const oldRole = user?.role
					const newRole = selectedRole
					return async ({ result, update }) => {
						if (result.type === 'success') {
							// Update local user object first
							if (user && newRole) {
								user.role = newRole
							}
							
							// Update local counters optimistically
							if (oldRole && newRole && oldRole !== newRole) {
								// Decrease counter for old role
								if (oldRole === 'participant') {
									localCurrentParticipants = Math.max(0, localCurrentParticipants - 1)
								} else if (oldRole === 'juror') {
									localCurrentJurors = Math.max(0, localCurrentJurors - 1)
								}
								
								// Increase counter for new role
								if (newRole === 'participant') {
									localCurrentParticipants = localCurrentParticipants + 1
								} else if (newRole === 'juror') {
									localCurrentJurors = localCurrentJurors + 1
								}
							}

							// Erfolg: Standard-Update um formData zu erhalten
							await update({ reset: true })
							
							// Erst nach UI-Update verstecken
							showRole = false
							showPwd = false
							showArtist = false
						} else {
							// Standard-Update, um Fehlermeldungen anzuzeigen
							await update({})
						}
					}
				}}
				class="mt-4 space-y-3"
			>
				<div class="space-y-3">
					<!-- Teilnehmer*in -->
					<div class="choice-option">
						<label class="choice-label" class:disabled={!canSelectParticipant}>
							<input
								type="radio"
								name="role"
								value="participant"
								bind:group={selectedRole}
								disabled={!canSelectParticipant}
								class="choice-radio"
							/>
							<div class="choice-content">
								<div class="choice-title">
									<span class="font-semibold">Teilnehmer*in</span>
								</div>
								<div class="choice-description">
									{#if canSelectParticipant}
										<span class="text-green-400">Noch {remainingParticipants} Plätze frei</span>
									{:else}
										<span class="text-red-400">Keine Plätze mehr frei</span>
									{/if}
								</div>
							</div>
						</label>
					</div>

					<!-- Zuschauer*in -->
					<div class="choice-option">
						<label class="choice-label">
							<input
								type="radio"
								name="role"
								value="spectator"
								bind:group={selectedRole}
								class="choice-radio"
							/>
							<div class="choice-content">
								<div class="choice-title">
									<span class="font-semibold">Zuschauer*in</span>
								</div>
								<div class="choice-description">
									<span class="text-subtle">Immer verfügbar</span>
								</div>
							</div>
						</label>
					</div>

					<!-- Juror*in -->
					<div class="choice-option">
						<label class="choice-label" class:disabled={!canSelectJuror}>
							<input
								type="radio"
								name="role"
								value="juror"
								bind:group={selectedRole}
								disabled={!canSelectJuror}
								class="choice-radio"
							/>
							<div class="choice-content">
								<div class="choice-title">
									<span class="font-semibold">Juror*in</span>
								</div>
								<div class="choice-description">
									{#if canSelectJuror}
										<span class="text-green-400">Noch {remainingJurors} Plätze frei</span>
									{:else}
										<span class="text-red-400">Keine Plätze mehr frei</span>
									{/if}
								</div>
							</div>
						</label>
					</div>
				</div>

				<div class="flex gap-2 pt-2">
					<button
						type="button"
						class="btn-danger"
						onclick={() => {
							showRole = false
						}}
					>
						Abbrechen
					</button>
					<button type="submit" class="btn-brand" disabled={!selectedRole}>
						Rolle ändern
					</button>
				</div>
			</form>
		{/if}
	</div>
</section>

<script lang="ts">
	import type { PageProps } from './$types'
	import { enhance } from '$app/forms'
	import type { UserRole } from '$lib/pocketbase-types'
	import { onMount, onDestroy } from 'svelte'

	const props = $props()
	let { data } = props as PageProps
	const user = data.user

	// Toggles for separate edit sections
	let showPwd = $state(false)
	let showArtist = $state(false)
	let showRole = $state(false)

	// Role selection state - pre-select current role
	let selectedRole: UserRole | null = $state(user?.role || null)
	
	// Local reactive counters that won't be overwritten by server updates
	let localCurrentParticipants = $state(data.currentParticipants || 0)
	let localCurrentJurors = $state(data.currentJurors || 0)
	
	// Update local counters when data changes (from polling or initial load)
	$effect(() => {
		localCurrentParticipants = data.currentParticipants || 0
		localCurrentJurors = data.currentJurors || 0
	})
	
	// Update selectedRole when user role changes or when form is shown
	$effect(() => {
		if (showRole) {
			selectedRole = user?.role || null
		}
	})

	// Polling state
	let pollingInterval: any = $state(null)

	// Computed values for role selection using local counters
	const remainingParticipants = $derived(Math.max(0, (data.maxParticipants || 0) - localCurrentParticipants))
	const remainingJurors = $derived(Math.max(0, (data.maxJurors || 0) - localCurrentJurors))
	const canSelectParticipant = $derived(remainingParticipants > 0 || user?.role === 'participant')
	const canSelectJuror = $derived(remainingJurors > 0 || user?.role === 'juror')

	function roleDisplayName(role: string): string {
		switch (role) {
			case 'participant': return 'Teilnehmer*in'
			case 'spectator': return 'Zuschauer*in'
			case 'juror': return 'Juror*in'
			case 'admin': return 'Administrator*in'
			default: return 'Keine Rolle'
		}
	}

	async function updateRoleCounts() {
		try {
			const response = await fetch('/api/role-counts')
			if (response.ok) {
				const counts = await response.json()
				// Update data object so $effect can sync to local counters
				data.currentParticipants = counts.currentParticipants
				data.currentJurors = counts.currentJurors
			}
		} catch (error) {
			console.error('Error updating role counts:', error)
		}
	}

	function startPolling() {
		if (pollingInterval) return
		pollingInterval = setInterval(updateRoleCounts, 5000) // Poll every 5 seconds
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval)
			pollingInterval = null
		}
	}

	// Start polling when role selection is shown, stop when hidden
	$effect(() => {
		if (showRole) {
			startPolling()
		} else {
			stopPolling()
		}
	})

	onDestroy(() => {
		stopPolling()
	})

	let formData = (props as { form?: { message?: string; variant?: 'success' | 'error' } }).form
</script>
