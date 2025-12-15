<section class="section space-y-6">
	<h1 class="font-display text-2xl sm:text-3xl">Profil</h1>
	<div class="panel panel-accent space-y-4 p-4 sm:p-6">
		<p class="text-sm text-white/80">Hallo {user?.firstName || user?.name || user?.username}!</p>
		{#if user?.artistName}
			<p class="text-sm text-white/70">{user.artistName}</p>
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
						if (formData) {
							formData.message = undefined
							formData.variant = undefined
						}
					}}
				>
					Passwort ändern
				</button>
				{#if user?.role !== 'admin'}
					<button
						type="button"
						class="btn-accent"
						disabled={competitionStarted &&
							(user?.role === 'participant' || user?.role === 'juror')}
						onclick={() => {
							showArtist = true
							showPwd = false
							showRole = false
							if (formData) {
								formData.message = undefined
								formData.variant = undefined
							}
						}}
					>
						Künstlername ändern
					</button>
					<button
						type="button"
						class="btn-accent"
						disabled={deadlinePassed ||
							(competitionStarted && (user?.role === 'participant' || user?.role === 'juror'))}
						onclick={() => {
							showRole = true
							showPwd = false
							showArtist = false
							if (formData) {
								formData.message = undefined
								formData.variant = undefined
							}
						}}
					>
						Rolle ändern
					</button>
					{#if competitionStarted}
						<p class="text-xs text-amber-300 w-full">
							Teilnehmer- und Juror-Rollen sowie Künstlername sind während des laufenden Wettbewerbs
							gesperrt.
						</p>
					{/if}
					{#if deadlinePassed}
						<p class="text-xs text-rose-300 w-full">
							Rollenwechsel nach Deadline nicht mehr möglich
						</p>
					{/if}
				{/if}
			</div>
			<div class="flex gap-3 pt-2">
				<form method="post" action="?/logout">
					<button type="submit" class="btn-danger">Logout</button>
				</form>
				<form
					method="post"
					action="?/deleteAccount"
					class="flex items-center gap-2"
					onsubmit={(e) => {
						e.preventDefault()
						if (confirm('Bist du sicher? Dieser Vorgang kann nicht rückgängig gemacht werden.')) {
							;(e.currentTarget as HTMLFormElement).submit()
						}
					}}
				>
					{#if user?.role !== 'admin'}
						<button type="submit" class="btn-danger" disabled={competitionStarted}>
							Konto löschen
						</button>
						{#if competitionStarted}
							<span class="text-xs text-amber-300">Löschen während des Wettbewerbs gesperrt.</span>
						{/if}
					{/if}
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
						Zurück
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
						Zurück
					</button>
					<button type="submit" class="btn-brand">Speichern</button>
				</div>
			</form>
		{/if}

		{#if showRole}
			<form
				method="post"
				action="?/changeRole"
				onsubmit={(e) => {
					// Show warning if user is changing from participant role
					if (user?.role === 'participant' && selectedRole !== 'participant') {
						e.preventDefault()
						if (
							!confirm(
								'Achtung: Wenn du deine Rolle änderst, werden alle deine Song-Auswahlen gelöscht. Fortfahren?'
							)
						) {
							return
						}
						// User confirmed, submit the form
						;(e.currentTarget as HTMLFormElement).requestSubmit()
					}
				}}
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
									<Tooltip
										content="Du singst aktiv im Wettbewerb und wirst von Juroren bewertet. Du kannst Songs auswählen und auftreten."
										ariaLabel="Info zu Teilnehmer*in Rolle"
									/>
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
									<Tooltip
										content="Du bewertest die Auftritte der Teilnehmer*innen ausführlich – mit Sternen, Kommentaren und professioneller Einschätzung. Deine Bewertung hat mehr Gewicht und trägt maßgeblich dazu bei, den Sieger zu küren."
										ariaLabel="Info zu Juror*in Rolle"
									/>
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
									<Tooltip
										content="Du schaust dem Wettbewerb zu und erlebst alle Auftritte live. Du gibst deine Stimme in Form einer Bewertung ab und bestimmst so mit, wer weiterkommt."
										ariaLabel="Info zu Zuschauer*in Rolle"
									/>
								</div>
								<div class="choice-description">
									<span class="text-subtle">Immer verfügbar</span>
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
						Zurück
					</button>
					<button
						type="submit"
						class="btn-brand"
						disabled={!selectedRole ||
							deadlinePassed ||
							(competitionStarted &&
								(selectedRole === 'participant' || selectedRole === 'juror') &&
								selectedRole !== user?.role)}
					>
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
	import { onMount } from 'svelte'
	import { browser } from '$app/environment'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import { isDeadlinePassed } from '$lib/utils/competition-settings'

	const props = $props()
	let { data } = props as PageProps
	const user = data.user

	// Toggles for separate edit sections
	let showPwd = $state(false)
	let showArtist = $state(false)
	let showRole = $state(false)

	// Role selection state - pre-select current role
	let selectedRole: UserRole | null = $state(user?.role || null)

	// Check if deadline has passed for role changes
	const deadlinePassed = $derived(
		data.competitionSettings?.songChoiceDeadline
			? isDeadlinePassed(data.competitionSettings.songChoiceDeadline)
			: false
	)
	const competitionStarted = $derived(Boolean(data.competitionState?.competitionStarted))

	// Local reactive counters that won't be overwritten by server updates
	let localCurrentParticipants = $state(data.currentParticipants || 0)
	let localCurrentJurors = $state(data.currentJurors || 0)

	// Function to fetch current role counts
	async function fetchRoleCounts() {
		try {
			const response = await fetch('/api/role-counts')
			if (response.ok) {
				const counts = await response.json()
				localCurrentParticipants = counts.currentParticipants || 0
				localCurrentJurors = counts.currentJurors || 0
			}
		} catch (error) {
			console.error('Failed to fetch role counts:', error)
		}
	}

	// Update selectedRole when user role changes or when form is shown
	$effect(() => {
		if (showRole) {
			selectedRole = user?.role || null
		}
	})

	// Update local counters only when data changes (from server)
	$effect(() => {
		localCurrentParticipants = data.currentParticipants || 0
		localCurrentJurors = data.currentJurors || 0
	})

	// Computed values for role selection using local counters
	const remainingParticipants = $derived(
		Math.max(0, (data.maxParticipants || 0) - localCurrentParticipants)
	)
	const remainingJurors = $derived(Math.max(0, (data.maxJurors || 0) - localCurrentJurors))
	const canSelectParticipant = $derived(
		!competitionStarted && (remainingParticipants > 0 || user?.role === 'participant')
	)
	const canSelectJuror = $derived(
		!competitionStarted && (remainingJurors > 0 || user?.role === 'juror')
	)

	let formData = $derived(
		(props as { form?: { message?: string; variant?: 'success' | 'error' } }).form
	)

	// Role fetching interval
	let roleIntervalId: ReturnType<typeof setInterval> | null = null

	// Setup interval when role view is shown
	$effect(() => {
		if (showRole && browser) {
			// Clear any existing interval
			if (roleIntervalId) {
				clearInterval(roleIntervalId)
			}

			// Start new interval to fetch role data every 2 seconds
			roleIntervalId = setInterval(() => {
				fetchRoleCounts()
			}, 3000)
		} else {
			// Clear interval when role view is hidden
			if (roleIntervalId) {
				clearInterval(roleIntervalId)
				roleIntervalId = null
			}
		}
	})

	// Cleanup interval on component destroy
	onMount(() => {
		return () => {
			if (roleIntervalId) {
				clearInterval(roleIntervalId)
			}
		}
	})
</script>
