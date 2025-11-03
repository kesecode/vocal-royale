<section class="section section-spacing">
	<div class="content-spacing">
		<h1 class="font-display text-3xl tracking-tight sm:text-4xl">{greeting}</h1>
		<p class="text-secondary">{subtitle}</p>
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
		<!-- Tab Navigation -->
		<div class="flex flex-wrap gap-3">
			<button
				class="btn-brand"
				style:background={activeTab === 'participants' ? 'var(--color-accent-500)' : ''}
				style:box-shadow={activeTab === 'participants' ? '4px 4px 0 var(--shadow-1)' : ''}
				style:color={activeTab === 'participants' ? 'white' : ''}
				onclick={() => {
					activeTab = 'participants'
					participantsPage = 1
				}}
			>
				Teilnehmer*innen
			</button>
			<button
				class="btn-brand"
				style:background={activeTab === 'jurors' ? 'var(--color-accent-500)' : ''}
				style:box-shadow={activeTab === 'jurors' ? '4px 4px 0 var(--shadow-1)' : ''}
				style:color={activeTab === 'jurors' ? 'white' : ''}
				onclick={() => {
					activeTab = 'jurors'
					jurorsPage = 1
				}}
			>
				Juror*innen
			</button>
			<button
				class="btn-brand"
				style:background={activeTab === 'spectators' ? 'var(--color-accent-500)' : ''}
				style:box-shadow={activeTab === 'spectators' ? '4px 4px 0 var(--shadow-1)' : ''}
				style:color={activeTab === 'spectators' ? 'white' : ''}
				onclick={() => {
					activeTab = 'spectators'
					spectatorsPage = 1
				}}
			>
				Zuschauer*innen
			</button>
		</div>

		<!-- Single table with tab-based content -->
		<div class="panel-table">
			<div class="table-header-border padding-responsive py-3">
				<div class="font-semibold">
					{#if activeTab === 'participants'}
						Alle Teilnehmer*innen
					{:else if activeTab === 'jurors'}
						Alle Juror*innen
					{:else}
						Alle Zuschauer*innen
					{/if}
				</div>
			</div>
			<div class="table-container">
				<table class="w-full text-sm">
					<thead>
						<tr class="table-header">
							<th class="table-cell">Name</th>
							{#if activeTab === 'participants'}
								<th class="table-cell">Künstlername</th>
								<th class="table-cell">Status</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#if activeTab === 'participants'}
							{#each paginatedParticipants as u (u.id || u.name)}
								<tr class="table-row-border">
									<td class="table-cell">{u.name}</td>
									<td class="table-cell">{u.artistName || '—'}</td>
									<td class="table-cell">{u.eliminated ? 'ausgeschieden' : 'aktiv'}</td>
								</tr>
							{/each}
						{:else if activeTab === 'jurors'}
							{#each paginatedJurors as u (u.id || u.name)}
								<tr class="table-row-border">
									<td class="table-cell">{u.name}</td>
								</tr>
							{/each}
						{:else}
							{#each paginatedSpectators as u (u.id || u.name)}
								<tr class="table-row-border">
									<td class="table-cell">{u.name}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
			{#if activeTab === 'participants' && participantsTotalPages > 1}
				<div class="border-t border-[#333]/60">
					<Pagination
						currentPage={participantsPage}
						totalPages={participantsTotalPages}
						onPageChange={goToParticipantsPage}
					/>
				</div>
			{:else if activeTab === 'jurors' && jurorsTotalPages > 1}
				<div class="border-t border-[#333]/60">
					<Pagination
						currentPage={jurorsPage}
						totalPages={jurorsTotalPages}
						onPageChange={goToJurorsPage}
					/>
				</div>
			{:else if activeTab === 'spectators' && spectatorsTotalPages > 1}
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
	import { interpolate } from '$lib/utils/interpolate'

	let { data }: PageProps = $props()

	const displayName =
		data.user?.firstName || data.user?.name || data.user?.username || data.user?.id || 'Freund'
	const competitionFinished = $derived(Boolean(data?.competitionFinished ?? false))

	// Dynamische UI-Texte mit Interpolation
	const greeting = interpolate(data.uiContent?.['home.greeting'] || 'Hallo {displayName}!', {
		displayName
	})
	const subtitle = data.uiContent?.['home.subtitle'] || 'Willkommen!'

	let showEmailVerification = $state(false)
	let showRoleSelection = $state(false)
	let roleSelectionLoading = $state(false)

	// Tab navigation state
	type TabType = 'participants' | 'jurors' | 'spectators'
	let activeTab = $state<TabType>('participants')

	// Pagination state with dynamic items per page
	let itemsPerPage = $state(5) // Initial fallback
	let participantsPage = $state(1)
	let jurorsPage = $state(1)
	let spectatorsPage = $state(1)

	// Computed pagination values
	const participantsTotalPages = $derived(
		Math.ceil((data.participants?.length || 0) / itemsPerPage)
	)
	const jurorsTotalPages = $derived(Math.ceil((data.jurors?.length || 0) / itemsPerPage))
	const spectatorsTotalPages = $derived(Math.ceil((data.spectators?.length || 0) / itemsPerPage))

	// Paginated data
	const paginatedParticipants = $derived(
		(data.participants || []).slice(
			(participantsPage - 1) * itemsPerPage,
			participantsPage * itemsPerPage
		)
	)
	const paginatedJurors = $derived(
		(data.jurors || []).slice((jurorsPage - 1) * itemsPerPage, jurorsPage * itemsPerPage)
	)
	const paginatedSpectators = $derived(
		(data.spectators || []).slice(
			(spectatorsPage - 1) * itemsPerPage,
			spectatorsPage * itemsPerPage
		)
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

	// Reset page numbers when items per page changes
	$effect(() => {
		// Reset to page 1 if current page is now out of bounds
		if (participantsPage > participantsTotalPages && participantsTotalPages > 0) {
			participantsPage = 1
		}
		if (jurorsPage > jurorsTotalPages && jurorsTotalPages > 0) {
			jurorsPage = 1
		}
		if (spectatorsPage > spectatorsTotalPages && spectatorsTotalPages > 0) {
			spectatorsPage = 1
		}
	})

	// Calculate dynamic items per page based on viewport height
	function calculateItemsPerPage() {
		if (typeof window === 'undefined') return

		// Get viewport height
		const viewportHeight = window.innerHeight

		// Measure fixed elements
		const header = document.querySelector('header') as HTMLElement | null
		const footer = document.querySelector('footer') as HTMLElement | null
		const greeting = document.querySelector('.section .content-spacing') as HTMLElement | null
		const tabButtons = document.querySelector('.flex.flex-wrap.gap-3') as HTMLElement | null
		const tableHeader = document.querySelector('.table-header-border') as HTMLElement | null

		const headerHeight = header?.offsetHeight || 0
		const footerHeight = footer?.offsetHeight || 0
		const greetingHeight = greeting?.offsetHeight || 0
		const tabButtonsHeight = tabButtons?.offsetHeight || 0
		const tableHeaderHeight = tableHeader?.offsetHeight || 0

		// Estimate row height (based on CSS: table-cell with padding)
		// table-cell has padding, text-sm, and border -> approximately 40-50px per row
		const estimatedRowHeight = 45

		// Buffer for spacing, margins, pagination controls
		const buffer = 100

		// Calculate available height for table rows
		const availableHeight =
			viewportHeight -
			headerHeight -
			footerHeight -
			greetingHeight -
			tabButtonsHeight -
			tableHeaderHeight -
			buffer

		// Calculate number of rows that fit
		const rows = Math.floor(availableHeight / estimatedRowHeight)

		// Ensure at least 1 row, and cap at reasonable maximum
		itemsPerPage = Math.max(1, rows)
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

		// Calculate initial items per page after DOM is ready
		requestAnimationFrame(() => {
			calculateItemsPerPage()
		})

		// Add resize listener for dynamic pagination
		window.addEventListener('resize', calculateItemsPerPage)

		// Cleanup
		return () => {
			window.removeEventListener('resize', calculateItemsPerPage)
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
