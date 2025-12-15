<section class="section section-spacing">
	<h1 class="font-display heading-responsive">Song-Auswahl Verwaltung</h1>

	<div class="panel-table">
		<div class="flex-between table-header-border padding-responsive py-3">
			<div class="font-semibold">Song-Auswahl aller Teilnehmer</div>
			{#if loading || stateLoading}
				<div class="text-xs text-muted">Laden…</div>
			{/if}
		</div>

		{#if errorMsg}
			<div class="p-3 sm:p-4">
				<div class="text-sm text-rose-200">{errorMsg}</div>
			</div>
		{/if}

		{#if infoMsg}
			<div class="p-3 sm:p-4">
				<div class="text-sm text-emerald-200">{infoMsg}</div>
			</div>
		{/if}
		{#if competitionStarted}
			<div class="p-3 sm:p-4">
				<div class="text-sm text-amber-200">
					Wettbewerb läuft – Song-Änderungen und Freigaben sind gesperrt.
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="table-header table-header-border">
						<th class="table-cell">User</th>
						<th class="table-cell">Song</th>
						<th class="table-cell">Runde</th>
						<th class="table-cell">Status</th>
						<th class="table-cell">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#if songChoices.length === 0}
						<tr class="table-row-border">
							<td colspan="5" class="table-cell text-center text-muted">
								Keine Song-Auswahlen vorhanden
							</td>
						</tr>
					{:else}
						{#each songChoices as choice (choice.id)}
							<tr class="table-row-border">
								<td class="table-cell">
									{#if choice.expand?.user}
										<div class="font-medium">{choice.expand.user.name || 'Unbekannt'}</div>
										{#if choice.expand.user.artistName}
											<div class="text-xs text-white/70">
												{choice.expand.user.artistName}
											</div>
										{/if}
									{:else}
										<span class="text-muted">Unbekannt</span>
									{/if}
								</td>
								<td class="table-cell">
									{#if choice.artist && choice.songTitle}
										<div>{choice.artist} - {choice.songTitle}</div>
									{:else}
										<span class="text-muted">Nicht ausgefüllt</span>
									{/if}
								</td>
								<td class="table-cell">{choice.round}</td>
								<td class="table-cell">
									{#if choice.confirmed}
										<span class="text-emerald-200">✓ Bestätigt</span>
									{:else}
										<span class="text-muted">Offen</span>
									{/if}
								</td>
								<td class="table-cell">
									<div class="flex gap-2">
										{#if choice.confirmed}
											<button
												class="btn-purple text-xs px-3 py-1.5"
												disabled={actionsDisabled}
												onclick={() => openReleaseModal(choice)}
											>
												Freigeben
											</button>
										{:else}
											<button
												class="btn-brand text-xs px-3 py-1.5"
												disabled={!choice.artist || !choice.songTitle || actionsDisabled}
												onclick={() => openConfirmModal(choice)}
											>
												Bestätigen
											</button>
										{/if}
										<button
											class="btn-danger text-xs px-3 py-1.5"
											disabled={!choice.artist || !choice.songTitle || actionsDisabled}
											onclick={() => openRejectModal(choice)}
										>
											Ablehnen
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="border-t border-[#333]/60">
				<Pagination {currentPage} {totalPages} onPageChange={goToPage} />
			</div>
		{/if}
	</div>

	<div class="mt-4">
		<a href="/admin" class="btn-purple">← Zurück</a>
	</div>
</section>

<!-- Bestätigen Modal -->
<Modal bind:open={showConfirmModal} title="Song bestätigen" onclose={closeConfirmModal}>
	{#if confirmChoice}
		<div class="space-y-4">
			<p class="text-white/90">Möchtest du folgenden Song bestätigen?</p>

			<div class="rounded-lg border border-white/10 bg-white/5 p-4">
				<div class="text-sm text-white/70">
					{confirmChoice.expand?.user?.name || 'Unbekannt'}
					{#if confirmChoice.expand?.user?.artistName}
						<span class="text-white/50">
							({confirmChoice.expand.user.artistName})
						</span>
					{/if}
				</div>
				<div class="font-medium text-white">
					{confirmChoice.artist} - {confirmChoice.songTitle}
				</div>
				<div class="mt-1 text-sm text-white/70">Runde {confirmChoice.round}</div>
			</div>

			<div class="rounded border border-emerald-600/40 bg-emerald-600/20 p-3">
				<p class="text-sm text-emerald-200">
					<strong>Info:</strong>
					Der Teilnehmer erhält eine Bestätigungs-E-Mail und kann den Song nicht mehr ändern.
				</p>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn-purple" onclick={closeConfirmModal}>Abbrechen</button>
		<button class="btn-brand" onclick={executeConfirm} disabled={confirming || competitionStarted}>
			{confirming ? 'Wird bestätigt…' : 'Bestätigen'}
		</button>
	{/snippet}
</Modal>

<!-- Freigeben Modal -->
<Modal bind:open={showReleaseModal} title="Song freigeben" onclose={closeReleaseModal}>
	{#if releaseChoice}
		<div class="space-y-4">
			<p class="text-white/90">Möchtest du folgenden Song zur Neuauswahl freigeben?</p>

			<div class="rounded-lg border border-white/10 bg-white/5 p-4">
				<div class="text-sm text-white/70">
					{releaseChoice.expand?.user?.name || 'Unbekannt'}
					{#if releaseChoice.expand?.user?.artistName}
						<span class="text-white/50">
							({releaseChoice.expand.user.artistName})
						</span>
					{/if}
				</div>
				<div class="font-medium text-white">
					{releaseChoice.artist} - {releaseChoice.songTitle}
				</div>
				<div class="mt-1 text-sm text-white/70">Runde {releaseChoice.round}</div>
			</div>

			<div class="rounded border border-amber-600/40 bg-amber-600/20 p-3">
				<p class="text-sm text-amber-200">
					<strong>Hinweis:</strong>
					Der Song wird gelöscht und der Teilnehmer kann einen neuen Song wählen (auch nach Deadline).
					Es wird keine E-Mail gesendet.
				</p>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn-purple" onclick={closeReleaseModal}>Abbrechen</button>
		<button class="btn-brand" onclick={executeRelease} disabled={releasing || competitionStarted}>
			{releasing ? 'Wird freigegeben…' : 'Freigeben'}
		</button>
	{/snippet}
</Modal>

<!-- Ablehnen Modal -->
<Modal bind:open={showRejectModal} title="Song ablehnen" onclose={closeRejectModal}>
	{#if selectedChoice}
		<div class="space-y-4">
			<p class="text-white/90">Möchtest du folgenden Song ablehnen?</p>

			<div class="rounded-lg border border-white/10 bg-white/5 p-4">
				<div class="text-sm text-white/70">
					{selectedChoice.expand?.user?.name || 'Unbekannt'}
					{#if selectedChoice.expand?.user?.artistName}
						<span class="text-white/50">
							({selectedChoice.expand.user.artistName})
						</span>
					{/if}
				</div>
				<div class="font-medium text-white">
					{selectedChoice.artist} - {selectedChoice.songTitle}
				</div>
				<div class="mt-1 text-sm text-white/70">Runde {selectedChoice.round}</div>
			</div>

			<div>
				<label for="reject-comment" class="mb-2 block text-sm font-medium text-white/90">
					Anmerkung (optional)
				</label>
				<textarea
					id="reject-comment"
					bind:value={rejectComment}
					rows="3"
					class="input"
					placeholder="Z.B. 'Song wurde bereits von einem anderen Teilnehmer gewählt'"
				></textarea>
				<p class="mt-1 text-xs text-white/60">
					Diese Anmerkung wird in der E-Mail an den Teilnehmer angezeigt.
				</p>
			</div>

			<div class="rounded border border-rose-600/40 bg-rose-600/20 p-3">
				<p class="text-sm text-rose-200">
					<strong>Achtung:</strong>
					Der Song wird unwiderruflich gelöscht. Der Teilnehmer erhält eine E-Mail und muss einen neuen
					Song wählen.
				</p>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn-purple" onclick={closeRejectModal}>Abbrechen</button>
		<button class="btn-danger" onclick={rejectSong} disabled={rejecting || competitionStarted}>
			{rejecting ? 'Wird abgelehnt…' : 'Ablehnen'}
		</button>
	{/snippet}
</Modal>

<script lang="ts">
	import { onMount } from 'svelte'
	import Pagination from '$lib/components/Pagination.svelte'
	import Modal from '$lib/components/Modal.svelte'
	import type { SongChoicesResponse, UsersResponse } from '$lib/pocketbase-types'

	type SongChoiceWithUser = SongChoicesResponse & {
		expand?: {
			user?: UsersResponse
		}
	}

	let songChoices: SongChoiceWithUser[] = $state([])
	let currentPage = $state(1)
	let totalPages = $state(1)
	let loading = $state(false)
	let errorMsg: string | null = $state(null)
	let infoMsg: string | null = $state(null)
	let competitionStarted = $state(false)
	let stateLoading = $state(false)
	const actionsDisabled = $derived(competitionStarted)

	// Confirm Modal State
	let showConfirmModal = $state(false)
	let confirmChoice: SongChoiceWithUser | null = $state(null)
	let confirming = $state(false)

	// Release Modal State
	let showReleaseModal = $state(false)
	let releaseChoice: SongChoiceWithUser | null = $state(null)
	let releasing = $state(false)

	// Reject Modal State
	let showRejectModal = $state(false)
	let selectedChoice: SongChoiceWithUser | null = $state(null)
	let rejectComment = $state('')
	let rejecting = $state(false)

	onMount(() => {
		loadSongChoices()
		loadCompetitionState()
	})

	async function loadSongChoices() {
		loading = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch(`/admin/song-choices/api?page=${currentPage}`)
			if (!res.ok) {
				errorMsg = 'Fehler beim Laden der Song-Auswahlen'
				return
			}

			const data = await res.json()
			songChoices = data.items || []
			currentPage = data.page || 1
			totalPages = data.totalPages || 1
		} catch {
			errorMsg = 'Netzwerkfehler beim Laden'
		} finally {
			loading = false
		}
	}

	async function loadCompetitionState() {
		stateLoading = true
		try {
			const res = await fetch('/admin/api')
			if (!res.ok) return
			const data = await res.json()
			competitionStarted = Boolean(data?.state?.competitionStarted)
		} catch (error) {
			console.error('Competition state fetch failed', error)
		} finally {
			stateLoading = false
		}
	}

	// Confirm Modal Functions
	function openConfirmModal(choice: SongChoiceWithUser) {
		confirmChoice = choice
		showConfirmModal = true
	}

	function closeConfirmModal() {
		showConfirmModal = false
		confirmChoice = null
	}

	async function executeConfirm() {
		if (!confirmChoice) return

		if (competitionStarted) {
			errorMsg = 'Wettbewerb läuft – Änderungen gesperrt.'
			return
		}

		confirming = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/song-choices/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ choiceId: confirmChoice.id, confirmed: true })
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = data.error || 'Bestätigung fehlgeschlagen'
				return
			}

			const result = await res.json()
			infoMsg = result.emailSent
				? 'Song bestätigt und E-Mail gesendet'
				: 'Song bestätigt (E-Mail nicht konfiguriert)'
			setTimeout(() => (infoMsg = null), 4000)

			closeConfirmModal()
			await loadSongChoices()
		} catch {
			errorMsg = 'Netzwerkfehler'
		} finally {
			confirming = false
		}
	}

	// Release Modal Functions
	function openReleaseModal(choice: SongChoiceWithUser) {
		releaseChoice = choice
		showReleaseModal = true
	}

	function closeReleaseModal() {
		showReleaseModal = false
		releaseChoice = null
	}

	async function executeRelease() {
		if (!releaseChoice) return

		if (competitionStarted) {
			errorMsg = 'Wettbewerb läuft – Änderungen gesperrt.'
			return
		}

		releasing = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/song-choices/api', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ choiceId: releaseChoice.id, skipEmail: true })
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = data.error || 'Freigabe fehlgeschlagen'
				return
			}

			infoMsg = 'Song zur Neuauswahl freigegeben'
			setTimeout(() => (infoMsg = null), 4000)

			closeReleaseModal()
			await loadSongChoices()
		} catch {
			errorMsg = 'Netzwerkfehler'
		} finally {
			releasing = false
		}
	}

	function openRejectModal(choice: SongChoiceWithUser) {
		selectedChoice = choice
		rejectComment = ''
		showRejectModal = true
	}

	function closeRejectModal() {
		showRejectModal = false
		selectedChoice = null
		rejectComment = ''
	}

	async function rejectSong() {
		if (!selectedChoice) return

		if (competitionStarted) {
			errorMsg = 'Wettbewerb läuft – Änderungen gesperrt.'
			return
		}

		rejecting = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/song-choices/api', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					choiceId: selectedChoice.id,
					comment: rejectComment.trim() || undefined
				})
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = data.error || 'Ablehnung fehlgeschlagen'
				return
			}

			const result = await res.json()
			infoMsg = result.emailSent
				? 'Song abgelehnt und E-Mail gesendet'
				: 'Song abgelehnt (E-Mail nicht konfiguriert)'
			setTimeout(() => (infoMsg = null), 4000)

			closeRejectModal()
			await loadSongChoices()
		} catch {
			errorMsg = 'Netzwerkfehler'
		} finally {
			rejecting = false
		}
	}

	function goToPage(page: number) {
		currentPage = page
		loadSongChoices()
	}
</script>
