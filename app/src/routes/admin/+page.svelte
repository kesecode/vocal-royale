<section class="section section-spacing">
	<h1 class="font-display heading-responsive">Admin</h1>

	<div class="panel-table">
		<div class="flex-between table-header-border padding-responsive py-3">
			<div class="font-semibold">Competition Control</div>
			{#if loading}
				<div class="text-xs text-muted">Laden…</div>
			{/if}
		</div>
		<div class="space-y-3 p-3 sm:p-4">
			{#if errorMsg}
				<div class="text-sm text-rose-200">{errorMsg}</div>
			{/if}
			{#if infoMsg}
				<div class="text-sm text-emerald-200">{infoMsg}</div>
			{/if}

			<div class="text-sm text-white/80 space-y-1">
				<div>
					{#if isFinaleRound}
						<span class="font-semibold">🏆 Finale</span>
					{:else}
						Runde: <span class="font-semibold">{competitionState?.round ?? '—'}</span>
					{/if}
				</div>
				<div>
					Phase: <span class="font-semibold">{translatePhase(competitionState?.roundState)}</span>
				</div>
				{#if competitionState?.roundState === 'singing_phase' || competitionState?.roundState === 'rating_phase'}
					<div>
						Aktiver Teilnehmer: <span class="font-semibold">
							{active?.firstName && active?.lastName
								? `${active.firstName} ${active.lastName}`
								: (active?.name ?? competitionState?.activeParticipant ?? '—')}
						</span>
						{#if active?.artistName}
							<span class="text-white/60">{active.artistName}</span>
						{/if}
					</div>
					{#if activeSongChoice}
						<div class="pt-2 border-t border-white/10">
							<div>
								Song: <span class="font-semibold">{activeSongChoice.songTitle}</span>
							</div>
							<div>
								Interpret: <span class="font-semibold">{activeSongChoice.artist}</span>
							</div>
							{#if activeSongChoice.appleMusicSongId}
								<button
									type="button"
									class="btn-apple mt-2"
									onclick={() => openAppleMusic(activeSongChoice?.appleMusicSongId)}
									aria-label="Bei Apple Music öffnen"
								>
									<span class="apple-mark" aria-hidden="true"></span>
									<span>Music</span>
								</button>
							{/if}
						</div>
					{/if}
				{/if}
			</div>

			<div class="flex flex-wrap gap-2 pt-1">
				{#if !competitionState?.competitionStarted}
					<button class="btn-brand" onclick={() => doAction('start_competition')}>
						Starte Wettbewerb
					</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'singing_phase' && competitionState?.activeParticipant}
					<button class="btn-brand" onclick={() => doAction('activate_rating_phase')}>
						Aktiviere Bewertungsphase
					</button>
					<button class="btn-accent" onclick={() => rerollParticipant()}>Neu auswürfeln</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'rating_phase'}
					<button class="btn-brand" onclick={() => doAction('next_participant')}>
						{remainingParticipantsCount === 0 ? 'Runde beenden' : 'Nächster Teilnehmer'}
					</button>
					<button class="btn-accent" onclick={openMissingRatingsModal}>Fehlende Bewertungen</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'break'}
					<button class="btn-brand" onclick={() => doAction('activate_rating_refinement')}>
						Bewertung überarbeiten
					</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'rating_refinement'}
					<button class="btn-brand" onclick={() => doAction('finalize_ratings')}>
						Bewertung abschließen
					</button>
				{/if}

				{#if competitionState?.roundState === 'result_locked'}
					<button
						class="btn-brand"
						onclick={() => doAction('publish_results')}
						disabled={hasTie}
						title={hasTie ? 'Erst Patt auflösen' : ''}
					>
						{isFinaleRound ? 'Sieger veröffentlichen' : 'Ergebnis veröffentlichen'}
					</button>
				{/if}

				{#if competitionState?.roundState === 'publish_result' && !isFinaleRound}
					<button class="btn-brand" onclick={startNextRound}>Nächste Runde starten</button>
				{/if}

				{#if competitionState?.competitionStarted && !competitionState?.competitionFinished}
					<button class="btn-accent" onclick={() => doAction('toggle_break')}>
						{competitionState?.break ? 'Pause beenden' : 'Pause'}
					</button>
				{/if}

				{#if !isProduction}
					<button class="btn-danger" onclick={resetGame}>Spiel zurücksetzen</button>
				{:else}
					<button
						class="btn-danger opacity-50 cursor-not-allowed"
						disabled
						title="In Production deaktiviert"
					>
						Spiel zurücksetzen
					</button>
				{/if}
			</div>

			<div class="pt-3 border-t border-white/10 flex flex-wrap gap-2">
				<a href="/admin/users" class="btn-purple">User-Verwaltung</a>
				{#if !competitionState?.competitionStarted}
					<a href="/admin/song-choices" class="btn-purple">Song-Auswahl</a>
					<a href="/admin/settings" class="btn-purple">Einstellungen</a>
					<a href="/admin/customization" class="btn-purple">Anpassung</a>
				{/if}
			</div>

			{#if isTestEnv}
				<div class="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
					<button
						class={`btn-brand ${seedingTestData ? 'opacity-60 cursor-not-allowed' : ''}`}
						disabled={seedingTestData}
						title="Erzeugt Testteilnehmer, Juroren, Zuschauer und Songwünsche"
						onclick={seedTestData}
					>
						{seedingTestData ? 'Wird angelegt…' : 'Testdaten erzeugen'}
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if competitionState?.roundState === 'result_locked' || competitionState?.roundState === 'publish_result'}
		<div class="panel panel-accent overflow-hidden p-0">
			<div class="flex-between table-header-border padding-responsive py-3">
				<div class="font-semibold">{isFinaleRound ? 'Finale' : 'Ergebnis'}</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if isFinaleRound}
					{#if winner}
						<div class="text-lg font-semibold mb-2">
							🏆 Sieger: {winner.name}
							{#if winner.artistName}
								<span class="text-white/70">{winner.artistName}</span>
							{/if}
						</div>
						<div class="text-sm text-white/80 mb-4">
							Gesamtdurchschnitt: Ø {winner.avg.toFixed(2)} ({winner.count} Stimmen)
						</div>
						{#if results && results.length > 1}
							<div class="border-t border-white/10 pt-3">
								<div class="text-sm font-semibold mb-2">Alle Platzierungen:</div>
								<div class="overflow-auto max-h-[50vh]">
									<table class="w-full text-sm">
										<thead class="sticky top-0">
											<tr class="text-left text-white/90">
												<th class="p-2 sm:p-3">Platz</th>
												<th class="p-2 sm:p-3">Teilnehmer</th>
												<th class="p-2 sm:p-3">Bewertung</th>
												<th class="p-2 sm:p-3">Stimmen</th>
											</tr>
										</thead>
										<tbody>
											{#each results.slice().sort((a, b) => b.avg - a.avg) as r, i (r.id)}
												<tr class="border-t border-[#333]/40 align-middle">
													<td class="p-2 sm:p-3 font-semibold">{i + 1}</td>
													<td class="p-2 sm:p-3">
														<div class="font-medium">{r.name}</div>
														{#if r.artistName}
															<div class="text-xs text-white/70">{r.artistName}</div>
														{/if}
													</td>
													<td class="p-2 sm:p-3">Ø {r.avg.toFixed(2)}</td>
													<td class="p-2 sm:p-3">{r.count}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-sm text-white/80">Ergebnis wird geladen...</div>
					{/if}
				{:else if results}
					{#if hasTie}
						<div class="mb-3 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-sm">
							<strong>Patt-Situation:</strong>
							Noch {remainingToEliminate} Teilnehmer eliminieren.
						</div>
					{/if}
					<div class="overflow-auto max-h-[50vh]">
						<table class="w-full text-sm">
							<thead class="sticky top-0">
								<tr class="text-left text-white/90">
									<th class="p-2 sm:p-3">Teilnehmer</th>
									<th class="p-2 sm:p-3">Bewertung</th>
									<th class="p-2 sm:p-3">Stimmen</th>
									{#if hasTie}
										<th class="p-2 sm:p-3">Status</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each results.slice().sort((a, b) => b.avg - a.avg) as r (r.id)}
									<tr
										class={`border-t border-[#333]/40 align-middle ${r.eliminated ? 'line-through opacity-70' : ''}`}
									>
										<td class="p-2 sm:p-3">
											<div class="font-medium">{r.name}</div>
											{#if r.artistName}
												<div class="text-xs text-white/70">{r.artistName}</div>
											{/if}
										</td>
										<td class="p-2 sm:p-3">Ø {r.avg.toFixed(2)}</td>
										<td class="p-2 sm:p-3">{r.count}</td>
										{#if hasTie}
											<td class="p-2 sm:p-3">
												{#if r.isTied && !r.eliminated}
													<button
														class="btn-danger text-xs"
														onclick={() => openEliminateModal(r.id)}
													>
														Eliminieren
													</button>
												{/if}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-sm text-white/80">Ergebnis wird geladen...</div>
				{/if}
			</div>
		</div>
	{/if}

	<Modal
		bind:open={missingRatingsModalOpen}
		title="Fehlende Bewertungen"
		onclose={closeMissingRatingsModal}
	>
		{#if missingRatingsLoading}
			<p class="text-sm text-white/80">Lade...</p>
		{:else if missingVoters.length === 0}
			<p class="text-sm text-emerald-200">Alle haben bewertet!</p>
		{:else}
			<p class="text-sm text-white/70 mb-3">
				{missingVoters.length === 1 ? 'Eine Person hat' : `${missingVoters.length} Personen haben`} noch
				nicht bewertet:
			</p>
			<ul class="space-y-2">
				{#each missingVoters as voter (voter.id)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-white">{voter.name}</span>
						<span class="text-white/60 text-xs">{roleLabels[voter.role] || voter.role}</span>
					</li>
				{/each}
			</ul>
		{/if}
		{#snippet footer()}
			<button class="btn-brand" onclick={closeMissingRatingsModal}>Schließen</button>
		{/snippet}
	</Modal>

	<Modal
		bind:open={showEliminateModal}
		title="Teilnehmer eliminieren"
		onclose={closeEliminateModal}
	>
		<div class="space-y-3">
			<p class="text-white/90">
				Möchtest du <strong class="text-white">{pendingParticipantName}</strong>
				eliminieren?
			</p>
			<p class="text-sm text-white/70">
				Noch {remainingToEliminate} Teilnehmer müssen eliminiert werden.
			</p>
		</div>
		{#snippet footer()}
			<button class="btn-accent" onclick={closeEliminateModal}>Abbrechen</button>
			<button class="btn-danger" onclick={confirmEliminate}>Eliminieren</button>
		{/snippet}
	</Modal>
</section>

<!-- styles removed; centralized in app.css -->

<script lang="ts">
	import type { CompetitionStateResponse, UsersResponse } from '$lib/pocketbase-types'
	import {
		parseSettings,
		DEFAULT_SETTINGS,
		type CompetitionSettings
	} from '$lib/utils/competition-settings'
	import { onMount } from 'svelte'
	import Modal from '$lib/components/Modal.svelte'

	let { data } = $props()

	let competitionState: CompetitionStateResponse | null = $state(data?.competitionState)
	let active: UsersResponse | null = $state(data?.activeUser)
	let activeSongChoice: { artist: string; songTitle: string; appleMusicSongId?: string } | null =
		$state(data?.activeSongChoice ?? null)
	let loading: boolean = $state(false)
	let errorMsg: string | null = $state(null)
	let infoMsg: string | null = $state(null)
	const isTestEnv: boolean = Boolean(data?.isTestEnv)
	const isProduction: boolean = Boolean(data?.isProduction)
	let seedingTestData: boolean = $state(false)
	let remainingParticipantsCount: number = $state(0)

	// Missing ratings modal
	type MissingVoter = { id: string; name: string; role: string }
	let missingRatingsModalOpen: boolean = $state(false)
	let missingVoters: MissingVoter[] = $state([])
	let missingRatingsLoading: boolean = $state(false)

	// Phasen-Übersetzung
	const phaseLabels: Record<string, string> = {
		singing_phase: 'Gesangsphase',
		rating_phase: 'Bewertungsphase',
		rating_refinement: 'Bewertung überarbeiten',
		result_locked: 'Ergebnis bereit',
		publish_result: 'Ergebnis veröffentlicht',
		break: 'Pause'
	}
	const translatePhase = (phase: string | undefined | null): string => {
		if (!phase) return '—'
		return phaseLabels[phase] || phase
	}

	let settings: CompetitionSettings = $state(DEFAULT_SETTINGS)

	// Computed value for finale round
	const isFinaleRound = $derived(competitionState?.round === settings.totalRounds)
	type ResultRow = {
		id: string
		name: string | null
		artistName?: string
		avg: number
		sum: number
		count: number
		eliminated: boolean
		isTied?: boolean
	}
	let results: ResultRow[] | null = $state(null)
	let winner: ResultRow | null = $state(null)
	let hasTie: boolean = $state(false)

	// Tie elimination state
	let showEliminateModal: boolean = $state(false)
	let pendingEliminateId: string | null = $state(null)
	let remainingToEliminate: number = $state(0)

	// Load settings and state on mount
	onMount(async () => {
		try {
			const settingsRes = await fetch('/admin/settings/api')
			if (settingsRes.ok) {
				const settingsData = await settingsRes.json()
				if (settingsData.settings) {
					settings = parseSettings(settingsData.settings)
				}
			}
		} catch (error) {
			console.error('Error loading competition settings:', error)
		}
		// Load current state (including results if in result_locked or publish_result)
		await reloadState()
	})

	async function doAction(
		action:
			| 'start_competition'
			| 'activate_rating_phase'
			| 'next_participant'
			| 'activate_rating_refinement'
			| 'finalize_ratings'
			| 'publish_results'
			| 'reset_game'
			| 'toggle_break'
	) {
		errorMsg = null
		infoMsg = null
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action })
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				const code = String(data?.error || '')
				if (code === 'missing_ratings') {
					const missing = Number(data?.missingCount ?? 0)
					errorMsg =
						missing === 1
							? 'Es fehlt noch eine Bewertung.'
							: `Es fehlen noch ${missing} Bewertungen.`
				} else if (code === 'no_active_participant') {
					errorMsg = 'Kein aktiver Teilnehmer gesetzt.'
				} else if (code === 'missing_song_choices') {
					const missing = Array.isArray(data?.missingParticipants)
						? data.missingParticipants.length
						: 0
					const required = Number(data?.requiredSongs ?? 0)
					errorMsg =
						missing > 0
							? `Wettbewerb kann nicht starten: ${missing} Teilnehmer ohne bestätigte Songs (${required} benötigt).`
							: 'Wettbewerb kann nicht starten: fehlende Song-Auswahlen.'
				} else if (code === 'missing_checkins') {
					const missingP = Array.isArray(data?.missingParticipants)
						? data.missingParticipants.length
						: 0
					const missingJ = Array.isArray(data?.missingJurors) ? data.missingJurors.length : 0
					errorMsg = 'Alle Teilnehmer und Juroren müssen eingecheckt sein.'
					if (missingP || missingJ) {
						errorMsg += ` (Fehlend: ${missingP} Teilnehmer, ${missingJ} Juroren)`
					}
				} else if (code === 'no_participants_available') {
					errorMsg = 'Keine teilnehmenden Sänger gefunden – Wettbewerb kann nicht starten.'
				} else if (code === 'competition_already_started') {
					errorMsg = 'Wettbewerb läuft bereits.'
				} else {
					errorMsg = 'Aktion fehlgeschlagen.'
				}
				return
			}
			const data = await res.json()
			if (data?.state) competitionState = data.state
			if ('activeParticipant' in data) active = data.activeParticipant
			// Reset visible results when leaving results phase
			if (
				competitionState?.roundState !== 'result_locked' &&
				competitionState?.roundState !== 'publish_result'
			) {
				results = null
				winner = null
				hasTie = false
			}
			if (action === 'start_competition') {
				infoMsg = 'Wettbewerb gestartet.'
				await reloadState()
			}
			if (action === 'activate_rating_phase') {
				infoMsg = 'Bewertungsphase aktiviert.'
				await reloadState()
			}
			if (action === 'next_participant') {
				infoMsg = 'Nächster Teilnehmer gesetzt.'
				await reloadState()
			}
			if (action === 'finalize_ratings') {
				// Load results from response
				results = Array.isArray(data?.results) ? data.results : null
				winner = data?.winner ?? null
				hasTie = Boolean(data?.hasTie)
				remainingToEliminate = Number(data?.remainingToEliminate ?? 0)
				if (hasTie) {
					infoMsg = `Patt-Situation! Bitte ${remainingToEliminate} Teilnehmer eliminieren.`
				} else {
					infoMsg = 'Bewertungen abgeschlossen.'
				}
			}
			if (action === 'reset_game') {
				infoMsg = 'Spiel zurückgesetzt.'
				activeSongChoice = null
			}
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	function openEliminateModal(eliminateId: string) {
		pendingEliminateId = eliminateId
		showEliminateModal = true
	}

	function closeEliminateModal() {
		showEliminateModal = false
		pendingEliminateId = null
	}

	// Get name of pending participant for modal display
	const pendingParticipantName = $derived.by(() => {
		if (!pendingEliminateId || !results) return '—'
		const found = results.find((r: ResultRow) => r.id === pendingEliminateId)
		return found?.name ?? '—'
	})

	async function confirmEliminate() {
		if (!pendingEliminateId) return
		const eliminateId = pendingEliminateId // Save before closing modal
		errorMsg = null
		infoMsg = null
		closeEliminateModal()
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'eliminate_from_tie',
					eliminateId
				})
			})
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}))
				console.error('eliminate_from_tie failed:', res.status, errData)
				errorMsg = `Eliminieren fehlgeschlagen: ${errData?.details || errData?.error || res.status}`
				return
			}
			const data = await res.json()
			results = Array.isArray(data?.results) ? data.results : null
			winner = data?.winner ?? null
			hasTie = Boolean(data?.hasTie)
			remainingToEliminate = Number(data?.remainingToEliminate ?? 0)

			if (hasTie) {
				infoMsg = `Noch ${remainingToEliminate} Teilnehmer eliminieren.`
			} else {
				infoMsg = 'Patt aufgelöst!'
			}
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	async function startNextRound() {
		errorMsg = null
		infoMsg = null
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'start_next_round' })
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = String(data?.error || 'Nächste Runde starten fehlgeschlagen.')
				return
			}
			const data = await res.json()
			competitionState = data?.state ?? competitionState
			active = data?.activeParticipant ?? null
			results = null
			winner = null
			hasTie = false
			remainingToEliminate = 0
			infoMsg = 'Nächste Runde gestartet.'
			// Reload to get updated song choice
			await reloadState()
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	async function rerollParticipant() {
		errorMsg = null
		infoMsg = null
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'reroll_participant' })
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				if (data?.error === 'no_participants_available') {
					errorMsg = 'Keine weiteren Teilnehmer verfügbar.'
				} else {
					errorMsg = 'Neu auswürfeln fehlgeschlagen.'
				}
				return
			}
			const data = await res.json()
			competitionState = data?.state ?? competitionState
			active = data?.activeParticipant ?? null
			infoMsg = 'Neuer Teilnehmer ausgewürfelt.'
			// Reload to get updated song choice
			await reloadState()
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	async function reloadState() {
		try {
			const res = await fetch('/admin/api')
			if (res.ok) {
				const data = await res.json()
				activeSongChoice = data?.activeSongChoice ?? null
				// Load results if in result_locked or publish_result
				if (data?.results) {
					results = data.results
					winner = data.winner ?? null
					hasTie = Boolean(data.hasTie)
					remainingToEliminate = Number(data?.remainingToEliminate ?? 0)
				}
				// Update state if provided
				if (data?.state) {
					competitionState = data.state
				}
				if (data?.activeParticipant) {
					active = data.activeParticipant
				}
				if (data?.remainingParticipantsCount !== undefined) {
					remainingParticipantsCount = data.remainingParticipantsCount
				}
			}
		} catch {
			// Ignore reload errors
		}
	}

	function openAppleMusic(songId: string | undefined) {
		if (!songId) return
		const storefront = 'de'
		const url = `https://music.apple.com/${storefront}/song/${songId}`
		try {
			window.open(url, '_blank', 'noopener,noreferrer')
		} catch {
			location.href = url
		}
	}

	async function resetGame() {
		errorMsg = null
		infoMsg = null
		if (!confirm('Bist du sicher? Das Spiel wird vollständig zurückgesetzt.')) return
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'reset_game' })
			})
			if (!res.ok) {
				errorMsg = 'Zurücksetzen fehlgeschlagen.'
				return
			}
			const data = await res.json()
			competitionState = data?.state ?? competitionState
			active = null
			results = null
			winner = null
			hasTie = false
			remainingToEliminate = 0
			infoMsg = 'Spiel zurückgesetzt.'
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	async function seedTestData() {
		errorMsg = null
		infoMsg = null
		if (!isTestEnv) return
		seedingTestData = true
		try {
			const res = await fetch('/admin/test-seed', { method: 'POST' })
			const body = await res.json().catch(() => ({}))
			if (!res.ok) {
				errorMsg =
					body?.error === 'not_test_env'
						? 'Testdaten sind nur in NODE_ENV=test verfügbar.'
						: 'Testdaten konnten nicht erstellt werden.'
				return
			}
			const summary = body?.summary
			if (summary) {
				infoMsg = `Testdaten erstellt: ${summary.participants} Teilnehmer, ${summary.jurors} Juroren, ${summary.spectators} Zuschauer, ${summary.songsPerParticipant} Songs je Teilnehmer.`
			} else {
				infoMsg = 'Testdaten erstellt.'
			}
		} catch (error) {
			console.error('Test seed failed', error)
			errorMsg = 'Testdaten konnten nicht erstellt werden.'
		} finally {
			seedingTestData = false
		}
	}

	async function openMissingRatingsModal() {
		missingRatingsLoading = true
		missingRatingsModalOpen = true
		try {
			const res = await fetch('/admin/api?missing_ratings=1')
			if (res.ok) {
				const data = await res.json()
				missingVoters = data?.missingVoters ?? []
			} else {
				missingVoters = []
			}
		} catch {
			missingVoters = []
		} finally {
			missingRatingsLoading = false
		}
	}

	function closeMissingRatingsModal() {
		missingRatingsModalOpen = false
		missingVoters = []
	}

	const roleLabels: Record<string, string> = {
		juror: 'Juror',
		spectator: 'Zuschauer'
	}
</script>
