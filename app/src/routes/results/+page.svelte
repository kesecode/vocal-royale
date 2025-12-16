<section class="section space-y-5">
	<h1 class="font-display text-2xl tracking-tight sm:text-3xl">Ergebnisse</h1>

	<!-- Progress with dynamic rounds -->
	<div class="panel panel-accent p-3 sm:p-4">
		<ProgressRounds
			onSelect={handleRoundSelect}
			activeRound={competitionStarted ? activeRound : 0}
			currentRound={competitionStarted ? currentRound : 0}
			total={totalRounds}
			labels={roundLabels}
			disabled={!competitionFinished}
		/>
	</div>

	{#if !competitionStarted}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Wettbewerb</div>
			</div>
			<div class="p-3 sm:p-4">
				<p class="text-lg font-semibold">Noch ist nichts los hier!</p>
				<p class="text-sm text-white/80 mt-2">
					Die Veranstaltung hat noch nicht begonnen - lehn dich zuruck und warte auf den Start!
				</p>
			</div>
		</div>
	{:else if competitionFinished}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">
					{isFinaleRound ? 'Wettbewerb beendet' : `Ergebnisse Runde ${currentRound}`}
				</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if isFinaleRound && finalRankings.length > 0}
					{#if finalRankings[0]}
						{@const winner = finalRankings[0]}
						<div class="p-3 border border-amber-500/40 rounded bg-amber-500/10 mb-4">
							<div class="text-lg font-semibold">
								🏆 Sieger: {winner.artistName || winner.name}
							</div>
							{#if winner.artistName && winner.name}
								<div class="text-sm text-white/70">{winner.name}</div>
							{/if}
							{#if winner.avg !== undefined}
								<div class="text-sm text-white/80 mt-1">
									Gesamtdurchschnitt: Ø {winner.avg.toFixed(2)} ({winner.count} Stimmen)
								</div>
							{/if}
						</div>
					{/if}
					<div class="overflow-auto max-h-[50vh]">
						<table class="w-full text-sm">
							<thead class="sticky top-0">
								<tr class="text-left text-white/90">
									<th class="p-2 sm:p-3">#</th>
									<th class="p-2 sm:p-3">Teilnehmer</th>
									<th class="p-2 sm:p-3">Runde</th>
									<th class="p-2 sm:p-3">Bewertung</th>
								</tr>
							</thead>
							<tbody>
								{#each finalRankings as r (r.id)}
									<tr class="border-t border-[#333]/40 align-middle">
										<td class="p-2 sm:p-3 font-bold">
											{#if r.rank === 1}
												<span title="1. Platz">&#x1F947;</span>
											{:else if r.rank === 2}
												<span title="2. Platz">&#x1F948;</span>
											{:else if r.rank === 3}
												<span title="3. Platz">&#x1F949;</span>
											{:else}
												{r.rank}
											{/if}
										</td>
										<td class="p-2 sm:p-3">
											{#if r.artistName}
												<div class="font-medium">{r.artistName}</div>
												<div class="text-xs text-white/70">{r.name}</div>
											{:else}
												<div class="font-medium">{r.name}</div>
											{/if}
										</td>
										<td class="p-2 sm:p-3 text-white/80">
											{#if r.eliminatedInRound === null}
												<span class="text-amber-400 font-medium">Finale</span>
											{:else}
												Runde {r.eliminatedInRound}
											{/if}
										</td>
										<td class="p-2 sm:p-3 font-semibold">
											{r.avg !== undefined ? `Ø ${r.avg.toFixed(2)}` : '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if results.length > 0}
					<div class="overflow-auto max-h-[50vh]">
						<table class="w-full text-sm">
							<thead class="sticky top-0">
								<tr class="text-left text-white/90">
									<th class="p-2 sm:p-3">Teilnehmer</th>
									<th class="p-2 sm:p-3">Bewertung</th>
									<th class="p-2 sm:p-3">Stimmen</th>
								</tr>
							</thead>
							<tbody>
								{#each results as r (r.id)}
									<tr
										class={`border-t border-[#333]/40 align-middle ${r.eliminated ? 'line-through opacity-70' : ''}`}
									>
										<td class="p-2 sm:p-3">
											<div class="font-medium">{r.artistName || r.name}</div>
											{#if r.artistName && r.name}
												<div class="text-xs text-white/70">{r.name}</div>
											{/if}
										</td>
										<td class="p-2 sm:p-3">Ø {r.avg?.toFixed(2) ?? '-'}</td>
										<td class="p-2 sm:p-3">{r.count ?? 0}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if loading}
					<p class="text-sm text-white/80">Ergebnisse werden geladen...</p>
				{:else}
					<p class="text-lg font-semibold">Das Ergebnis steht fest!</p>
					<p class="text-sm text-white/80">Du wirst es gleich hier sehen - stay tuned!</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="flex items-center justify-between border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="flex items-center gap-4">
					<span class="font-semibold">{isFinaleRound ? 'Finale' : `Runde ${currentRound}`}</span>
				</div>
				{#if loading}
					<div class="text-xs text-white/80">Laden...</div>
				{/if}
			</div>

			<div class="p-2 sm:p-4">
				{#if isBreak}
					<div class="px-2 py-3 space-y-2">
						<p class="text-lg font-semibold">Kurze Pause!</p>
						<p class="text-sm text-white/80">Zeit zum Durchatmen - gleich geht's weiter!</p>
					</div>
				{:else if roundState === 'break'}
					<div class="px-2 py-3 space-y-2">
						<p class="text-lg font-semibold">Kurze Pause!</p>
						<p class="text-sm text-white/80">Zeit zum Durchatmen - gleich geht's weiter!</p>
					</div>
				{:else if roundState === 'result_locked'}
					<div class="px-2 py-3 space-y-2">
						<p class="text-lg font-semibold">Das Ergebnis steht fest!</p>
						<p class="text-sm text-white/80">Du wirst es gleich hier sehen - stay tuned!</p>
					</div>
				{:else if roundState === 'singing_phase'}
					<div class="px-2 py-3 space-y-2">
						{#if activeParticipantInfo}
							<p class="text-sm text-white/60 mb-2">Jetzt auf der Bühne:</p>
							<div>
								<div class="text-lg font-semibold">
									{activeParticipantInfo.artistName ||
										activeParticipantInfo.firstName ||
										activeParticipantInfo.name}
								</div>
								{#if activeParticipantInfo.artistName && (activeParticipantInfo.firstName || activeParticipantInfo.name)}
									<div class="text-sm text-white/70">
										{activeParticipantInfo.firstName || activeParticipantInfo.name}
									</div>
								{/if}
							</div>
							{#if activeSongChoice}
								<div class="text-sm text-white/80 mt-2">
									<span class="text-white/60">singt:</span>
									<span class="font-medium">{activeSongChoice.songTitle}</span>
									<span class="text-white/60">von</span>
									<span>{activeSongChoice.artist}</span>
								</div>
							{/if}
						{:else}
							<p class="text-sm text-white/80">Warten auf den nachsten Auftritt...</p>
						{/if}
						<p class="text-sm text-white/60 italic mt-3">Enjoy the show!</p>
					</div>
				{:else if roundState === 'rating_phase'}
					<div class="px-2 py-3 space-y-2">
						<p class="text-lg font-semibold">Es wird gerade bewertet!</p>
						<p class="text-sm text-white/80">Das Publikum und die Jury geben ihre Stimmen ab.</p>
					</div>
				{:else if roundState === 'rating_refinement'}
					<div class="px-2 py-3 space-y-2">
						<p class="text-lg font-semibold">Die Bewertungen werden uberarbeitet!</p>
						<p class="text-sm text-white/80">Die Jury macht letzte Anpassungen.</p>
					</div>
				{:else if roundState === 'publish_result'}
					<div class="px-2 py-3 space-y-4">
						{#if isFinaleRound && finalRankings.length > 0}
							<div class="text-lg font-semibold">Die Gesamtplatzierung steht fest!</div>
							<div class="overflow-auto max-h-[50vh]">
								<table class="w-full text-sm">
									<thead class="sticky top-0">
										<tr class="text-left text-white/90">
											<th class="p-2 sm:p-3">#</th>
											<th class="p-2 sm:p-3">Teilnehmer</th>
											<th class="p-2 sm:p-3">Runde</th>
											<th class="p-2 sm:p-3">Bewertung</th>
										</tr>
									</thead>
									<tbody>
										{#each finalRankings as r (r.id)}
											<tr class="border-t border-[#333]/40 align-middle">
												<td class="p-2 sm:p-3 font-bold">
													{#if r.rank === 1}
														<span title="1. Platz">&#x1F947;</span>
													{:else if r.rank === 2}
														<span title="2. Platz">&#x1F948;</span>
													{:else if r.rank === 3}
														<span title="3. Platz">&#x1F949;</span>
													{:else}
														{r.rank}
													{/if}
												</td>
												<td class="p-2 sm:p-3">
													<div class="font-medium">{r.artistName || r.name}</div>
													{#if r.artistName && r.name}
														<div class="text-xs text-white/70">{r.name}</div>
													{/if}
												</td>
												<td class="p-2 sm:p-3 text-white/80">
													{#if r.eliminatedInRound === null}
														<span class="text-amber-400 font-medium">Finale</span>
													{:else}
														Runde {r.eliminatedInRound}
													{/if}
												</td>
												<td class="p-2 sm:p-3 font-semibold">
													{r.avg !== undefined ? `Ø ${r.avg.toFixed(2)}` : '-'}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else if results.length > 0}
							<div class="text-lg font-semibold">Ergebnisse Runde {currentRound}</div>
							<div class="overflow-auto max-h-[50vh]">
								<table class="w-full text-sm">
									<thead class="sticky top-0">
										<tr class="text-left text-white/90">
											<th class="p-2 sm:p-3">#</th>
											<th class="p-2 sm:p-3">Teilnehmer</th>
											<th class="p-2 sm:p-3">Bewertung</th>
										</tr>
									</thead>
									<tbody>
										{#each results as r, i (r.id)}
											<tr
												class={`border-t border-[#333]/40 align-middle ${r.eliminated ? 'line-through opacity-70' : ''}`}
											>
												<td class="p-2 sm:p-3 font-bold">{i + 1}</td>
												<td class="p-2 sm:p-3">
													<div class="font-medium">{r.artistName || r.name}</div>
													{#if r.artistName && r.name}
														<div class="text-xs text-white/70">{r.name}</div>
													{/if}
												</td>
												<td class="p-2 sm:p-3 font-semibold">
													{r.avg !== undefined ? `Ø ${r.avg.toFixed(2)}` : '-'}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-sm text-white/80">Ergebnisse werden geladen...</p>
						{/if}
					</div>
				{:else}
					<div class="px-2 py-3 space-y-2">
						<p class="text-sm text-white/80">Warten auf Updates...</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { RoundState } from '$lib/pocketbase-types'
	import ProgressRounds from '$lib/components/ProgressRounds.svelte'
	import { getSongLabels, parseSettings, DEFAULT_SETTINGS } from '$lib/utils/competition-settings'

	export let data

	// Competition settings
	const settings = parseSettings(data.competitionSettings) || DEFAULT_SETTINGS
	const totalRounds = settings.totalRounds
	const roundLabels = getSongLabels(settings.totalRounds, settings.numberOfFinalSongs)

	// Computed value for finale round
	$: isFinaleRound = currentRound === totalRounds

	let activeRound = 1
	let currentRound = 1
	let loading = false
	let roundState: RoundState = 'result_locked'
	let competitionStarted = false
	let competitionFinished = false
	let isBreak = false

	let activeParticipantInfo: {
		id: string
		name: string
		firstName?: string
		artistName?: string
	} | null = null
	let activeSongChoice: { artist: string; songTitle: string; appleMusicSongId?: string } | null =
		null

	type ResultRow = {
		id: string
		name: string | null
		artistName?: string
		avg?: number
		count?: number
		eliminated?: boolean
	}
	let results: ResultRow[] = []
	type FinalRankingRow = {
		rank: number
		id: string
		name: string | null
		artistName?: string
		eliminatedInRound: number | null
		avg: number
		count: number
	}
	let finalRankings: FinalRankingRow[] = []

	let pollingInterval: ReturnType<typeof setInterval> | null = null
	const POLLING_INTERVAL_MS = 2000

	async function handleRoundSelect(round: number) {
		if (!competitionFinished) return
		currentRound = round
		await fetchHistoricalResults(round)
	}

	async function fetchHistoricalResults(round: number) {
		loading = true
		try {
			const res = await fetch(`/results/state?round=${round}`)
			if (!res.ok) return
			const data = await res.json()
			results = Array.isArray(data?.results) ? data.results : []
			finalRankings = Array.isArray(data?.finalRankings) ? data.finalRankings : []
		} catch {
			// ignore
		} finally {
			loading = false
		}
	}

	async function fetchCompetitionState() {
		loading = true
		try {
			const res = await fetch('/results/state')
			if (!res.ok) return
			const data = await res.json()
			const r = Number(data?.round) || 1
			activeRound = Math.min(Math.max(r, 1), totalRounds)
			currentRound = activeRound
			competitionStarted = Boolean(data?.competitionStarted ?? false)
			competitionFinished = Boolean(data?.competitionFinished ?? false)
			isBreak = Boolean(data?.break ?? false)
			const rs = data?.roundState as RoundState | undefined
			if (
				rs === 'singing_phase' ||
				rs === 'rating_phase' ||
				rs === 'rating_refinement' ||
				rs === 'publish_result' ||
				rs === 'result_locked' ||
				rs === 'break'
			) {
				roundState = rs
			}
			// Ergebnisse bei publish_result oder wenn Wettbewerb beendet setzen
			if (rs === 'publish_result' || Boolean(data?.competitionFinished)) {
				results = Array.isArray(data?.results) ? data.results : []
				finalRankings = Array.isArray(data?.finalRankings) ? data.finalRankings : []
			} else {
				results = []
				finalRankings = []
			}
			activeParticipantInfo = data?.activeParticipantInfo ?? null
			activeSongChoice = data?.activeSongChoice ?? null
		} catch {
			// ignore; keep defaults
		} finally {
			loading = false
		}
	}

	async function pollForChanges() {
		try {
			const res = await fetch('/results/state')
			if (!res.ok) return

			const data = await res.json()
			const newRound = Number(data?.round) || 1
			const newRoundState = data?.roundState as RoundState | undefined
			const newCompetitionStarted = Boolean(data?.competitionStarted ?? false)
			const newCompetitionFinished = Boolean(data?.competitionFinished ?? false)
			const newIsBreak = Boolean(data?.break ?? false)
			const newActiveParticipantId = data?.activeParticipantInfo?.id ?? null
			const currentActiveParticipantId = activeParticipantInfo?.id ?? null

			const roundChanged = newRound !== activeRound
			const stateChanged =
				newRoundState &&
				newRoundState !== roundState &&
				[
					'singing_phase',
					'rating_phase',
					'rating_refinement',
					'result_phase',
					'publish_result',
					'result_locked',
					'break'
				].includes(newRoundState)
			const startedChanged = newCompetitionStarted !== competitionStarted
			const finishedChanged = newCompetitionFinished !== competitionFinished
			const breakChanged = newIsBreak !== isBreak
			const participantChanged = newActiveParticipantId !== currentActiveParticipantId

			if (
				roundChanged ||
				stateChanged ||
				startedChanged ||
				finishedChanged ||
				breakChanged ||
				participantChanged
			) {
				if (roundChanged) {
					activeRound = Math.min(Math.max(newRound, 1), totalRounds)
					currentRound = activeRound
				}
				if (stateChanged && newRoundState) {
					roundState = newRoundState
				}
				if (startedChanged) {
					competitionStarted = newCompetitionStarted
				}
				if (finishedChanged) {
					competitionFinished = newCompetitionFinished
				}
				if (breakChanged) {
					isBreak = newIsBreak
				}
				// Ergebnisse NUR bei publish_result setzen
				if (newRoundState === 'publish_result') {
					results = Array.isArray(data?.results) ? data.results : []
					finalRankings = Array.isArray(data?.finalRankings) ? data.finalRankings : []
				} else if (stateChanged) {
					results = []
					finalRankings = []
				}
				// Update active participant info
				activeParticipantInfo = data?.activeParticipantInfo ?? null
				activeSongChoice = data?.activeSongChoice ?? null
			}
		} catch {
			// Silently ignore polling errors
		}
	}

	function startPolling() {
		if (pollingInterval) return
		pollingInterval = setInterval(pollForChanges, POLLING_INTERVAL_MS)
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval)
			pollingInterval = null
		}
	}

	onMount(async () => {
		await fetchCompetitionState()
		startPolling()
	})

	onDestroy(() => {
		stopPolling()
	})
</script>
