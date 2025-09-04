<section class="section space-y-5">
	<h1 class="font-display text-2xl tracking-tight sm:text-3xl">Bewertung</h1>

	<!-- Progress with 5 rounds: past = yellow, current = green, future = black (disabled) -->
	<div class="panel panel-accent p-3 sm:p-4">
		<ProgressRounds onSelect={setRound} {activeRound} {currentRound} total={5} />
	</div>

	{#if competitionFinished}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Wettbewerb beendet</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if winner}
					<div class="text-lg font-semibold">Sieger: {winner.name}</div>
					{#if winner.avg !== undefined}
						<div class="text-sm text-white/80">
							Ø Bewertung: {winner.avg.toFixed(2)}{#if winner.count}
								(Stimmen: {winner.count}){/if}
						</div>
					{/if}
				{:else}
					<div class="text-sm text-white/80">Der Sieger wird geladen…</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="flex items-center justify-between border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Runde {currentRound}</div>
				{#if loading}
					<div class="text-xs text-white/80">Laden…</div>
				{/if}
				{#if loadError}
					<div class="text-xs text-rose-200">{loadError}</div>
				{/if}
			</div>

			<div class="p-2 sm:p-4">
				{#if roundState === 'singing_phase'}
					<p class="px-2 py-3 text-sm text-white/80">Enjoy the show!</p>
				{:else if roundState === 'rating_phase'}
					{#if activeParticipant}
						<div class="space-y-3">
							<div>
								<div class="text-sm text-white/60">Runde {currentRound}</div>
								<div class="text-lg font-semibold">
									{activeParticipant.firstName || activeParticipant.name}
								</div>
								{#if activeParticipant.artistName}
									<div class="text-xs text-white/70">a.k.a. {activeParticipant.artistName}</div>
								{/if}
							</div>
							{#if userRole === 'juror'}
								<div>
									<div class="mb-1 text-sm text-white/80">Performance</div>
									<StarRating
										editable
										value={ratings[activeParticipant.id]?.performanceRating ?? 0}
										onchange={(val: number) =>
											setJurorRating(activeParticipant.id, 'performanceRating', val)}
									/>
								</div>
								<div>
									<div class="mb-1 text-sm text-white/80">Gesang</div>
									<StarRating
										editable
										value={ratings[activeParticipant.id]?.vocalRating ?? 0}
										onchange={(val: number) =>
											setJurorRating(activeParticipant.id, 'vocalRating', val)}
									/>
								</div>
								<div>
									<div class="mb-1 text-sm text-white/80">Schwierigkeit</div>
									<StarRating
										editable
										value={ratings[activeParticipant.id]?.difficultyRating ?? 0}
										onchange={(val: number) =>
											setJurorRating(activeParticipant.id, 'difficultyRating', val)}
									/>
								</div>
								{#if ratings[activeParticipant.id]?.error}
									<div class="mt-1 text-xs text-rose-200">
										{ratings[activeParticipant.id].error}
									</div>
								{/if}
							{:else}
								<div>
									<div class="mb-1 text-sm text-white/80">Sterne</div>
									<StarRating
										editable
										value={ratings[activeParticipant.id]?.rating ?? 0}
										onchange={(val: number) => setRating(activeParticipant.id, val)}
									/>
									{#if ratings[activeParticipant.id]?.error}
										<div class="mt-1 text-xs text-rose-200">
											{ratings[activeParticipant.id].error}
										</div>
									{/if}
								</div>
							{/if}
							<div>
								<div class="mb-1 text-sm text-white/80">Kommentar (optional)</div>
								<input
									class="input w-full"
									type="text"
									bind:value={ratings[activeParticipant.id].comment}
									maxlength="100"
									placeholder="(max. 100 Zeichen)"
								/>
							</div>
							<div class="flex items-center gap-2">
								<button
									class="btn-brand"
									disabled={ratings[activeParticipant.id]?.saving}
									on:click={saveActive}
								>
									{ratings[activeParticipant.id]?.saving ? 'Speichern…' : 'Speichern'}
								</button>
								{#if ratings[activeParticipant.id]?.saved}
									<span class="text-xs">Gespeichert!</span>
								{/if}
							</div>
						</div>
					{:else}
						<p class="px-2 py-3 text-sm text-white/80">Aktiver Teilnehmer ist nicht gesetzt.</p>
					{/if}
				{:else if participants.length === 0}
					<p class="px-2 py-3 text-sm text-white/80">Keine Nutzer gefunden.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="text-left text-white/90">
									<th class="p-2 sm:p-3">Teilnehmer</th>
									<th class="p-2 sm:p-3">Bewertung</th>
									{#if showActions}
										<th class="hidden sm:table-cell p-2 sm:p-3">Aktion</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each participants as p (p.id)}
									<tr
										class="border-t border-[#333]/40 align-middle hover:bg-white/5 sm:cursor-default cursor-pointer"
										on:click={() => canRate && openOverlay(p)}
										class:cursor-not-allowed={!canRate}
									>
										<td class="p-2 sm:p-3">
											<div class="font-medium">{p.firstName || p.name}</div>
											{#if p.artistName}
												<div class="text-xs text-white/70">a.k.a. {p.artistName}</div>
											{/if}
										</td>
										<td class="p-2 sm:p-3">
											<StarRating editable={false} value={getDisplayRating(p.id)} />
										</td>
										{#if showActions}
											<td class="hidden sm:table-cell p-2 sm:p-3">
												<button
													type="button"
													class="btn-brand"
													on:click|stopPropagation={() => openOverlay(p)}
													aria-label={`Bewerten: ${p.name}`}
													disabled={!canRate}
													aria-disabled={!canRate}
												>
													Bewerten
												</button>
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<Modal
		open={!!selected}
		title={selected ? selected.firstName || selected.name : ''}
		onclose={closeOverlay}
	>
		{#if selected}
			<div class="space-y-3">
				<div>
					<div class="text-sm text-white/60">Runde {currentRound}</div>
					<div class="text-lg font-semibold">{selected.firstName || selected.name}</div>
					{#if selected.artistName}
						<div class="text-xs text-white/70">a.k.a. {selected.artistName}</div>
					{/if}
				</div>
				{#if userRole === 'juror'}
					<div>
						<div class="mb-1 text-sm text-white/80">Performance</div>
						<StarRating
							editable={canRate}
							value={ratings[selected.id]?.performanceRating ?? 0}
							onchange={(val: number) =>
								selected && setJurorRating(selected.id, 'performanceRating', val)}
						/>
					</div>
					<div>
						<div class="mb-1 text-sm text-white/80">Gesang</div>
						<StarRating
							editable={canRate}
							value={ratings[selected.id]?.vocalRating ?? 0}
							onchange={(val: number) =>
								selected && setJurorRating(selected.id, 'vocalRating', val)}
						/>
					</div>
					<div>
						<div class="mb-1 text-sm text-white/80">Schwierigkeit</div>
						<StarRating
							editable={canRate}
							value={ratings[selected.id]?.difficultyRating ?? 0}
							onchange={(val: number) =>
								selected && setJurorRating(selected.id, 'difficultyRating', val)}
						/>
					</div>
					{#if ratings[selected.id]?.error}
						<div class="mt-1 text-xs text-rose-200">{ratings[selected.id].error}</div>
					{/if}
				{:else}
					<div>
						<div class="mb-1 text-sm text-white/80">Sterne</div>
						<StarRating
							editable={canRate}
							value={ratings[selected.id]?.rating ?? 0}
							onchange={(val: number) => selected && setRating(selected.id, val)}
						/>
						{#if ratings[selected.id]?.error}
							<div class="mt-1 text-xs text-rose-200">{ratings[selected.id].error}</div>
						{/if}
					</div>
				{/if}
				<div>
					<div class="mb-1 text-sm text-white/80">Kommentar (optional)</div>
					<input
						class="input w-full"
						type="text"
						bind:value={ratings[selected.id].comment}
						maxlength="100"
						placeholder="(max. 100 Zeichen)"
					/>
				</div>
			</div>
		{/if}

		{#snippet footer()}
			{#if selected}
				<button class="btn-danger" on:click={closeOverlay}>Abbrechen</button>
				<button
					class="btn-brand"
					disabled={!canRate || ratings[selected.id]?.saving}
					on:click={saveSelected}
				>
					{ratings[selected.id]?.saving ? 'Speichern…' : 'Speichern'}
				</button>
				{#if !canRate}
					<span class="ml-2 text-xs text-white/80">Bewertungen sind derzeit geschlossen.</span>
				{/if}
				{#if ratings[selected.id]?.saved}
					<span class="ml-2 text-xs">Gespeichert!</span>
				{/if}
			{/if}
		{/snippet}
	</Modal>
</section>

<!-- styles removed; centralized in app.css -->

<script lang="ts">
	import { onMount } from 'svelte'
	import type { RoundState } from '$lib/pocketbase-types'
	import ProgressRounds from '$lib/components/ProgressRounds.svelte'
	import StarRating from '$lib/components/StarRating.svelte'
	import Modal from '$lib/components/Modal.svelte'

	type Participant = {
		id: string
		name: string
		firstName?: string
		artistName?: string
		eliminated?: boolean
		sangThisRound?: boolean
	}
	type Rating = {
		rating: number
		comment: string
		saving?: boolean
		saved?: boolean
		error?: string
		performanceRating?: number
		vocalRating?: number
		difficultyRating?: number
	}

	// activeRound controls progressbar state from global competition state
	let activeRound = 1
	let currentRound = 1
	let participants: Participant[] = []
	let ratings: Record<string, Rating> = {}
	let loading = false
	let loadError: string | null = null
	let selected: Participant | null = null
	let roundState: RoundState = 'result_locked'
	let activeParticipantId: string | null = null
	let activeParticipant: Participant | null = null
	let canRate = false
	let competitionFinished = false
	type Winner = {
		id: string
		name: string | null
		artistName?: string
		avg?: number
		sum?: number
		count?: number
	} | null
	let winner: Winner = null
	let userRole: string = 'spectator'
	$: canRate = roundState === 'rating_phase' || roundState === 'break'
	$: activeParticipant = participants.find((p) => p.id === activeParticipantId) ?? null
	let showActions = false
	$: showActions = canRate && roundState !== 'rating_phase'
	$: if (activeParticipant && !ratings[activeParticipant.id]) {
		ratings[activeParticipant.id] = {
			rating: 0,
			comment: '',
			performanceRating: userRole === 'juror' ? 0 : undefined,
			vocalRating: userRole === 'juror' ? 0 : undefined,
			difficultyRating: userRole === 'juror' ? 0 : undefined
		}
	}

	async function fetchRound(round: number) {
		loading = true
		loadError = null
		try {
			const res = await fetch(`/rating/api?round=${round}`)
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				loadError = data?.error ?? 'Fehler beim Laden'
				return
			}
			const data = await res.json()
			participants = Array.isArray(data?.participants) ? data.participants : []
			userRole = data?.userRole || 'spectator'
			// prime rating map with existing values
			ratings = {}
			for (const p of participants) {
				ratings[p.id] = {
					rating: 0,
					comment: '',
					performanceRating: userRole === 'juror' ? 0 : undefined,
					vocalRating: userRole === 'juror' ? 0 : undefined,
					difficultyRating: userRole === 'juror' ? 0 : undefined
				}
			}
			type ServerRating = {
				ratedUser?: string
				target?: string
				rating?: number | string
				stars?: number | string
				comment?: string
				performanceRating?: number | string
				vocalRating?: number | string
				difficultyRating?: number | string
			}
			const existing = Array.isArray(data?.ratings) ? (data.ratings as ServerRating[]) : []
			for (const r of existing) {
				const id = r.ratedUser ?? r.target // backward-compat
				if (id) {
					const raw = r.rating ?? r.stars
					const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : 0
					if (ratings[id]) {
						ratings[id].rating = value
						ratings[id].comment = String(r.comment ?? '')
						ratings[id].performanceRating = r.performanceRating
							? Number(r.performanceRating)
							: undefined
						ratings[id].vocalRating = r.vocalRating ? Number(r.vocalRating) : undefined
						ratings[id].difficultyRating = r.difficultyRating
							? Number(r.difficultyRating)
							: undefined
					}
				}
			}
		} catch {
			loadError = 'Netzwerkfehler beim Laden.'
		} finally {
			loading = false
		}
	}

	async function fetchCompetitionState() {
		try {
			const res = await fetch('/rating/state')
			if (!res.ok) return
			const data = await res.json()
			const r = Number(data?.round) || 1
			activeRound = Math.min(Math.max(r, 1), 5)
			currentRound = activeRound
			competitionFinished = Boolean(data?.competitionFinished ?? false)
			winner = data?.winner ?? null
			const rs = data?.roundState as RoundState | undefined
			if (
				rs === 'singing_phase' ||
				rs === 'rating_phase' ||
				rs === 'result_phase' ||
				rs === 'result_locked' ||
				rs === 'break'
			) {
				roundState = rs
			}
			const ap = data?.activeParticipant
			activeParticipantId = typeof ap === 'string' && ap ? ap : null
		} catch {
			// ignore; keep defaults
		}
	}

	onMount(async () => {
		await fetchCompetitionState()
		if (!competitionFinished) {
			await fetchRound(currentRound)
		}
	})

	function setRound(r: number) {
		if (r < 1 || r > 5 || r === currentRound) return
		if (r > activeRound) return // future rounds disabled
		currentRound = r
		fetchRound(currentRound)
	}

	function setRating(userId: string, value: number) {
		if (!ratings[userId]) {
			ratings[userId] = {
				rating: 0,
				comment: '',
				performanceRating: userRole === 'juror' ? 0 : undefined,
				vocalRating: userRole === 'juror' ? 0 : undefined,
				difficultyRating: userRole === 'juror' ? 0 : undefined
			}
		}
		ratings[userId].rating = value
		// Reaktive Aktualisierung
		ratings = { ...ratings }
	}

	function setJurorRating(
		userId: string,
		category: 'performanceRating' | 'vocalRating' | 'difficultyRating',
		value: number
	) {
		if (!ratings[userId]) {
			ratings[userId] = {
				rating: 0,
				comment: '',
				performanceRating: 0,
				vocalRating: 0,
				difficultyRating: 0
			}
		}
		ratings[userId][category] = value
		// Berechne automatisch das Gesamt-Rating als Durchschnitt
		const avg = calculateJurorAverage(userId)
		ratings[userId].rating = avg
		// Reaktive Aktualisierung
		ratings = { ...ratings }
	}

	function calculateJurorAverage(userId: string): number {
		const entry = ratings[userId]
		if (!entry || !entry.performanceRating || !entry.vocalRating || !entry.difficultyRating) {
			return 0
		}
		const avg = (entry.performanceRating + entry.vocalRating + entry.difficultyRating) / 3
		return Math.round(avg * 2) / 2 // Runde auf halbe Sterne
	}

	function getDisplayRating(userId: string): number {
		const entry = ratings[userId]
		if (!entry) return 0

		// Für Juroren: Zeige Durchschnitt aus den 3 Ratings, falls verfügbar
		if (
			userRole === 'juror' &&
			entry.performanceRating &&
			entry.vocalRating &&
			entry.difficultyRating
		) {
			return calculateJurorAverage(userId)
		}

		// Für Spectators oder wenn kein Juroren-Rating: Zeige normales Rating
		return entry.rating || 0
	}

	async function save(ratedUserId: string) {
		const entry = ratings[ratedUserId]
		if (!entry) return
		entry.error = undefined
		entry.saved = false
		if (!canRate) {
			entry.error = 'Bewertungen sind derzeit geschlossen.'
			return
		}

		// Validierung abhängig von der Benutzerrolle
		if (userRole === 'juror') {
			if (
				!entry.performanceRating ||
				entry.performanceRating === 0 ||
				entry.performanceRating < 1 ||
				entry.performanceRating > 5
			) {
				entry.error = 'Bitte Performance-Bewertung von 1-5 Sternen wählen.'
				return
			}
			if (
				!entry.vocalRating ||
				entry.vocalRating === 0 ||
				entry.vocalRating < 1 ||
				entry.vocalRating > 5
			) {
				entry.error = 'Bitte Gesangs-Bewertung von 1-5 Sternen wählen.'
				return
			}
			if (
				!entry.difficultyRating ||
				entry.difficultyRating === 0 ||
				entry.difficultyRating < 1 ||
				entry.difficultyRating > 5
			) {
				entry.error = 'Bitte Schwierigkeits-Bewertung von 1-5 Sternen wählen.'
				return
			}
		} else {
			if (!entry.rating || entry.rating === 0 || entry.rating < 1 || entry.rating > 5) {
				entry.error = 'Bitte 1-5 Sterne wählen.'
				return
			}
		}
		try {
			entry.saving = true
			const payload =
				userRole === 'juror'
					? {
							round: currentRound,
							ratedUser: ratedUserId,
							rating: entry.rating,
							comment: (entry.comment ?? '').slice(0, 100),
							performanceRating: entry.performanceRating,
							vocalRating: entry.vocalRating,
							difficultyRating: entry.difficultyRating
						}
					: {
							round: currentRound,
							ratedUser: ratedUserId,
							rating: entry.rating,
							comment: (entry.comment ?? '').slice(0, 100)
						}
			const res = await fetch('/rating/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				const code = data?.error ?? ''
				entry.error =
					code === 'self_rating_not_allowed'
						? 'Selbstbewertung ist nicht erlaubt.'
						: code === 'invalid_rating'
							? 'Bitte 1-5 Sterne wählen.'
							: code === 'rating_closed'
								? 'Bewertungen sind derzeit geschlossen.'
								: 'Konnte nicht speichern.'
				return
			}
			entry.saved = true

			// Tabelle aktualisieren durch reaktive Zustandsänderung
			ratings = { ...ratings }

			// Modal schließen bei erfolgreichem Speichern
			if (selected && selected.id === ratedUserId) {
				setTimeout(() => {
					closeOverlay()
				}, 500) // Kurz warten damit der User das "Gespeichert!" sieht
			}

			setTimeout(() => (entry.saved = false), 1500)
		} catch {
			entry.error = 'Netzwerkfehler beim Speichern.'
		} finally {
			entry.saving = false
		}
	}

	function openOverlay(p: Participant) {
		if (!canRate) return
		if (!ratings[p.id]) {
			ratings[p.id] = {
				rating: 0,
				comment: '',
				performanceRating: userRole === 'juror' ? 0 : undefined,
				vocalRating: userRole === 'juror' ? 0 : undefined,
				difficultyRating: userRole === 'juror' ? 0 : undefined
			}
		}
		selected = p
	}

	function closeOverlay() {
		selected = null
	}

	function saveSelected() {
		if (selected) {
			save(selected.id)
		}
	}

	function saveActive() {
		if (activeParticipantId) {
			save(activeParticipantId)
		}
	}
</script>
