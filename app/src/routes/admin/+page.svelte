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

			<div class="text-sm text-white/80">
				<div>
					Runde: <span class="font-semibold">{competitionState?.round ?? '—'}</span>
				</div>
				<div>
					Phase: <span class="font-semibold">{competitionState?.roundState ?? '—'}</span>
				</div>
				<div>
					Aktiver Teilnehmer: <span class="font-semibold">
						{active?.name ?? competitionState?.activeParticipant ?? '—'}
					</span>
				</div>
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
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'rating_phase'}
					<button class="btn-brand" onclick={() => doAction('next_participant')}>
						Nächster Teilnehmer
					</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'break'}
					<button class="btn-brand" onclick={() => doAction('finalize_ratings')}>
						Bewertung abschließen
					</button>
				{/if}

				{#if competitionState?.competitionStarted && competitionState?.roundState === 'result_locked'}
					<button class="btn-brand" onclick={showResults}>
						{isFinaleRound ? 'Sieger anzeigen' : 'Ergebnis anzeigen'}
					</button>
				{/if}

				{#if competitionState?.roundState === 'result_phase' && !isFinaleRound}
					<button class="btn-brand" onclick={startNextRound}>Nächste Runde starten</button>
				{/if}

				<button class="btn-danger" onclick={resetGame}>Spiel zurücksetzen</button>
			</div>

			<div class="pt-3 border-t border-white/10 flex flex-wrap gap-2">
				<a href="/admin/users" class="btn-ghost">User-Verwaltung</a>
				<a href="/admin/song-choices" class="btn-ghost">Song-Auswahl</a>
				<a href="/admin/settings" class="btn-ghost">Einstellungen</a>
			</div>
		</div>
	</div>

	{#if competitionState?.roundState === 'result_phase'}
		<div class="panel panel-accent overflow-hidden p-0">
			<div class="flex-between table-header-border padding-responsive py-3">
				<div class="font-semibold">{isFinaleRound ? 'Finale' : 'Ergebnis'}</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if isFinaleRound}
					{#if winner}
						<div class="text-lg font-semibold">Sieger: {winner.name}</div>
						<div class="text-sm text-white/80">
							Ø Bewertung: {winner.avg.toFixed(2)} (Stimmen: {winner.count})
						</div>
					{:else}
						<div class="text-sm text-white/80">
							Ergebnis nicht geladen. Bitte "Sieger anzeigen" klicken.
						</div>
					{/if}
				{:else if results}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="text-left text-white/90">
									<th class="p-2 sm:p-3">Teilnehmer</th>
									<th class="p-2 sm:p-3">Ø Bewertung</th>
									<th class="p-2 sm:p-3">Stimmen</th>
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
												<div class="text-xs text-white/70">a.k.a. {r.artistName}</div>
											{/if}
										</td>
										<td class="p-2 sm:p-3">{r.avg.toFixed(2)}</td>
										<td class="p-2 sm:p-3">{r.count}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-sm text-white/80">
						Ergebnis nicht geladen. Bitte "Ergebnis anzeigen" klicken.
					</div>
				{/if}
			</div>
		</div>
	{/if}
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

	let { data } = $props()

	let competitionState: CompetitionStateResponse | null = $state(data?.competitionState)
	let active: UsersResponse | null = $state(data?.activeUser)
	let loading: boolean = $state(false)
	let errorMsg: string | null = $state(null)
	let infoMsg: string | null = $state(null)

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
	}
	let results: ResultRow[] | null = $state(null)
	let winner: ResultRow | null = $state(null)

	// Load settings on mount
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
	})

	async function doAction(
		action:
			| 'start_competition'
			| 'activate_rating_phase'
			| 'next_participant'
			| 'finalize_ratings'
			| 'reset_game'
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
					const expected = Number(data?.expectedCount ?? 0)
					errorMsg = `Es fehlen noch Bewertungen (${missing}/${expected}).`
				} else if (code === 'no_active_participant') {
					errorMsg = 'Kein aktiver Teilnehmer gesetzt.'
				} else {
					errorMsg = 'Aktion fehlgeschlagen.'
				}
				return
			}
			const data = await res.json()
			if (data?.state) competitionState = data.state
			if ('activeParticipant' in data) active = data.activeParticipant
			// Reset visible results when leaving results phase
			if (competitionState?.roundState !== 'result_phase') {
				results = null
				winner = null
			}
			if (action === 'start_competition') infoMsg = 'Wettbewerb gestartet.'
			if (action === 'activate_rating_phase') infoMsg = 'Bewertungsphase aktiviert.'
			if (action === 'next_participant') infoMsg = 'Nächster Teilnehmer gesetzt.'
			if (action === 'finalize_ratings') infoMsg = 'Bewertungen abgeschlossen.'
			if (action === 'reset_game') infoMsg = 'Spiel zurückgesetzt.'
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}

	async function showResults() {
		errorMsg = null
		infoMsg = null
		try {
			const res = await fetch('/admin/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'show_results' })
			})
			if (!res.ok) {
				errorMsg = 'Ergebnis anzeigen fehlgeschlagen.'
				return
			}
			const data = await res.json()
			competitionState = data?.state ?? competitionState
			results = Array.isArray(data?.results) ? data.results : null
			winner = data?.winner ?? null
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
			infoMsg = 'Nächste Runde gestartet.'
		} catch {
			errorMsg = 'Netzwerkfehler.'
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
			infoMsg = 'Spiel zurückgesetzt.'
		} catch {
			errorMsg = 'Netzwerkfehler.'
		}
	}
</script>
