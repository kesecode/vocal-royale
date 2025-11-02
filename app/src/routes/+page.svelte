<section class="section section-spacing">
	<div class="content-spacing">
		<h1 class="font-display text-3xl tracking-tight sm:text-4xl">Ai Gude {displayName} wie!?</h1>
		<p class="text-secondary">Der Bre wird 30, singt für mich!</p>
	</div>

	<div class="panel-content">
		<p class="text-muted">Hallo {displayName}!</p>
		<p class="mt-1 text-sm text-subtle">Schön, dass du da bist.</p>
		<div class="mt-4 flex flex-wrap gap-3">
			<a href="/profile" class="btn-brand">Profil-Einstellungen</a>
		</div>
	</div>

	{#if competitionFinished}
		<div class="panel-table">
			<div class="table-header-border padding-responsive py-3">
				<div class="font-semibold">Wettbewerb beendet</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if data?.winner}
					<div class="text-lg font-semibold">Sieger: {data.winner.name}</div>
					{#if data.winner.avg !== undefined}
						<div class="text-sm text-white/80">
							Ø Bewertung: {data.winner.avg.toFixed(2)}{#if data.winner.count}
								(Stimmen: {data.winner.count}){/if}
						</div>
					{/if}
				{:else}
					<div class="text-sm text-white/80">Der Sieger wird geladen…</div>
				{/if}
			</div>
		</div>
	{:else if showRoleSelection === false}
		<div class="panel-table">
			<div class="table-header-border padding-responsive py-3">
				<div class="font-semibold">Alle Teilnehmer*innen</div>
			</div>
			<div class="table-container">
				<table class="w-full text-sm">
					<thead>
						<tr class="table-header">
							<th class="table-cell">Name</th>
							<th class="table-cell">Künstlername</th>
							<th class="table-cell">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedParticipants as u (u.id || u.name)}
							<tr class="table-row-border">
								<td class="table-cell">{u.name}</td>
								<td class="table-cell">{u.artistName || '—'}</td>
								<td class="table-cell">{u.eliminated ? 'ausgeschieden' : 'aktiv'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if participantsTotalPages > 1}
				<div class="border-t border-[#333]/60">
					<Pagination
						currentPage={participantsPage}
						totalPages={participantsTotalPages}
						onPageChange={goToParticipantsPage}
					/>
				</div>
			{/if}
		</div>
		<div class="panel panel-accent overflow-hidden p-0">
			<div class="table-header-border padding-responsive py-3">
				<div class="font-semibold">Alle Juror*innen</div>
			</div>
			<div class="table-container">
				<table class="w-full text-sm">
					<thead>
						<tr class="table-header">
							<th class="table-cell">Name</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedJurors as u (u.id || u.name)}
							<tr class="table-row-border">
								<td class="table-cell">{u.name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if jurorsTotalPages > 1}
				<div class="border-t border-[#333]/60">
					<Pagination
						currentPage={jurorsPage}
						totalPages={jurorsTotalPages}
						onPageChange={goToJurorsPage}
					/>
				</div>
			{/if}
		</div>
		<div class="panel panel-accent overflow-hidden p-0">
			<div class="table-header-border padding-responsive py-3">
				<div class="font-semibold">Alle Zuschauer*innen</div>
			</div>
			<div class="table-container">
				<table class="w-full text-sm">
					<thead>
						<tr class="table-header">
							<th class="table-cell">Name</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedSpectators as u (u.id || u.name)}
							<tr class="table-row-border">
								<td class="table-cell">{u.name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if spectatorsTotalPages > 1}
				<div class="border-t border-[#333]/60">
					<Pagination
						currentPage={spectatorsPage}
						totalPages={spectatorsTotalPages}
						onPageChange={goToSpectatorsPage}
					/>
				</div>
			{/if}
		</div>
	{/if}
</section>

<!-- Email Verification Modal - shown first if email not verified -->
<EmailVerificationModal visible={showEmailVerification} email={data.userEmail} />

<!-- Role Selection Modal - shown after email is verified -->
<RoleSelection
	visible={showRoleSelection}
	maxParticipants={data.maxParticipants}
	maxJurors={data.maxJurors}
	currentParticipants={data.currentParticipants}
	currentJurors={data.currentJurors}
	isLoading={roleSelectionLoading}
	onSubmit={handleRoleSubmit}
/>

<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageProps } from './$types'
	import type { UserRole } from '$lib/pocketbase-types'
	import EmailVerificationModal from '$lib/components/EmailVerificationModal.svelte'
	import RoleSelection from '$lib/components/RoleSelection.svelte'
	import Pagination from '$lib/components/Pagination.svelte'

	let { data }: PageProps = $props()

	const displayName =
		data.user?.firstName || data.user?.name || data.user?.username || data.user?.id
	const competitionFinished = $derived(Boolean(data?.competitionFinished ?? false))

	let showEmailVerification = $state(false)
	let showRoleSelection = $state(false)
	let roleSelectionLoading = $state(false)

	// Pagination state
	const PER_PAGE = 5
	let participantsPage = $state(1)
	let jurorsPage = $state(1)
	let spectatorsPage = $state(1)

	// Computed pagination values
	const participantsTotalPages = $derived(Math.ceil((data.participants?.length || 0) / PER_PAGE))
	const jurorsTotalPages = $derived(Math.ceil((data.jurors?.length || 0) / PER_PAGE))
	const spectatorsTotalPages = $derived(Math.ceil((data.spectators?.length || 0) / PER_PAGE))

	// Paginated data
	const paginatedParticipants = $derived(
		(data.participants || []).slice((participantsPage - 1) * PER_PAGE, participantsPage * PER_PAGE)
	)
	const paginatedJurors = $derived(
		(data.jurors || []).slice((jurorsPage - 1) * PER_PAGE, jurorsPage * PER_PAGE)
	)
	const paginatedSpectators = $derived(
		(data.spectators || []).slice((spectatorsPage - 1) * PER_PAGE, spectatorsPage * PER_PAGE)
	)

	// Page change handlers
	function goToParticipantsPage(page: number) {
		participantsPage = page
	}

	function goToJurorsPage(page: number) {
		jurorsPage = page
	}

	function goToSpectatorsPage(page: number) {
		spectatorsPage = page
	}

	onMount(() => {
		// Priority 1: Email verification (must come before role selection)
		if (data.needsEmailVerification) {
			showEmailVerification = true
			showRoleSelection = false
		}
		// Priority 2: Role selection (only if email is verified)
		else if (data.needsRoleSelection) {
			showEmailVerification = false
			showRoleSelection = true
		}
	})

	async function handleRoleSubmit(role: UserRole) {
		if (roleSelectionLoading) return

		roleSelectionLoading = true
		try {
			const response = await fetch('/api/role', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ role })
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }))
				alert(`Fehler: ${errorData.error || 'Konnte Rolle nicht speichern'}`)
				return
			}

			// Success - close modal and reload page to reflect new role
			showRoleSelection = false
			goto('/', { invalidateAll: true })
		} catch (error) {
			console.error('Error saving role:', error)
			alert('Netzwerkfehler beim Speichern der Rolle')
		} finally {
			roleSelectionLoading = false
		}
	}
</script>
