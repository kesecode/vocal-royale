<section class="section section-spacing">
	<h1 class="font-display heading-responsive">Song-Auswahl Verwaltung</h1>

	<div class="panel-table">
		<div class="flex-between table-header-border padding-responsive py-3">
			<div class="font-semibold">Song-Auswahl aller Teilnehmer</div>
			{#if loading}
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

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="table-header table-header-border">
						<th class="table-cell">User</th>
						<th class="table-cell">Song</th>
						<th class="table-cell">Runde</th>
						<th class="table-cell">Status</th>
						<th class="table-cell">Aktion</th>
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
												a.k.a. {choice.expand.user.artistName}
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
									<button
										class="btn-brand text-xs px-3 py-1.5"
										disabled={!choice.artist || !choice.songTitle}
										onclick={() => toggleConfirm(choice.id, !choice.confirmed)}
									>
										{choice.confirmed ? 'Freigeben' : 'Bestätigen'}
									</button>
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
		<a href="/admin" class="btn-ghost">← Zurück zum Admin</a>
	</div>
</section>

<script lang="ts">
	import { onMount } from 'svelte'
	import Pagination from '$lib/components/Pagination.svelte'
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

	onMount(() => {
		loadSongChoices()
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

	async function toggleConfirm(choiceId: string, confirmed: boolean) {
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/song-choices/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ choiceId, confirmed })
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = data.error || 'Aktion fehlgeschlagen'
				return
			}

			infoMsg = confirmed ? 'Song-Auswahl bestätigt' : 'Bestätigung aufgehoben'
			setTimeout(() => (infoMsg = null), 3000)

			// Reload current page
			await loadSongChoices()
		} catch {
			errorMsg = 'Netzwerkfehler'
		}
	}

	function goToPage(page: number) {
		currentPage = page
		loadSongChoices()
	}
</script>
