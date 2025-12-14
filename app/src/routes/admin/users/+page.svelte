<section class="section section-spacing">
	<h1 class="font-display heading-responsive">User-Verwaltung</h1>

	<div class="panel-table">
		<div class="flex-between table-header-border padding-responsive py-3">
			<div class="font-semibold">Alle Benutzer</div>
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
						<th class="table-cell">Name</th>
						<th class="table-cell">Rolle</th>
						<th class="table-cell">Status</th>
						<th class="table-cell">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#if users.length === 0}
						<tr class="table-row-border">
							<td colspan="4" class="table-cell text-center text-muted">
								Keine Benutzer vorhanden
							</td>
						</tr>
					{:else}
						{#each users as user (user.id)}
							<tr class="table-row-border">
								<td class="table-cell">
									<div class="font-medium">{user.name || 'Unbekannt'}</div>
									{#if user.artistName}
										<div class="text-xs text-white/70">
											a.k.a. {user.artistName}
										</div>
									{/if}
								</td>
								<td class="table-cell">
									<span class={getRoleBadgeClass(user.role)}>
										{getRoleLabel(user.role)}
									</span>
								</td>
								<td class="table-cell">
									{#if user.checkedIn}
										<span class="text-emerald-200">✓ Eingecheckt</span>
									{:else}
										<span class="text-muted">Nicht eingecheckt</span>
									{/if}
								</td>
								<td class="table-cell">
									<div class="flex gap-2">
										<button
											class="btn-brand text-xs px-3 py-1.5"
											class:bg-emerald-600={user.checkedIn}
											class:hover:bg-emerald-700={user.checkedIn}
											onclick={() => toggleCheckIn(user.id, !user.checkedIn)}
										>
											{user.checkedIn ? 'Auschecken' : 'Einchecken'}
										</button>
										<button
											class="btn-purple text-xs px-3 py-1.5"
											onclick={() => openRoleChangeModal(user)}
										>
											Rolle ändern
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

<!-- Role Change Modal -->
{#if showRoleModal && selectedUser}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
		<div class="bg-[#1a1a1a] rounded-lg border border-[#333]/60 p-6 max-w-md w-full">
			<h2 class="text-xl font-display mb-4">Rolle ändern</h2>
			<div class="mb-4">
				<p class="text-sm text-white/70 mb-2">
					Benutzer: <span class="font-medium text-white">{selectedUser.name}</span>
				</p>
				<p class="text-sm text-white/70">
					Aktuelle Rolle: <span class="font-medium text-white">
						{getRoleLabel(selectedUser.role)}
					</span>
				</p>
			</div>

			<div class="mb-6">
				<label for="role-select" class="block text-sm font-medium mb-2">Neue Rolle:</label>
				<select
					id="role-select"
					bind:value={newRole}
					class="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333]/60 rounded focus:outline-none focus:border-brand"
				>
					<option value="default">Standard</option>
					<option value="participant">Teilnehmer</option>
					<option value="spectator">Zuschauer</option>
					<option value="juror">Juror</option>
				</select>
			</div>

			<div class="bg-blue-600/20 border border-blue-600/40 rounded p-3 mb-6">
				<p class="text-sm text-blue-200">
					<strong>Hinweis:</strong>
					Song-Auswahlen werden bei Admin-Änderungen NICHT gelöscht.
				</p>
			</div>

			<div class="flex gap-3 justify-end">
				<button class="btn-purple" onclick={closeRoleChangeModal}>Abbrechen</button>
				<button class="btn-brand" disabled={newRole === selectedUser.role} onclick={changeUserRole}>
					Rolle ändern
				</button>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { onMount } from 'svelte'
	import Pagination from '$lib/components/Pagination.svelte'
	import type { UsersResponse, UserRole } from '$lib/pocketbase-types'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let users: UsersResponse[] = $state(data.users || [])
	let currentPage = $state(data.page || 1)
	let totalPages = $state(data.totalPages || 1)
	let loading = $state(false)
	let errorMsg: string | null = $state(null)
	let infoMsg: string | null = $state(null)
	let showRoleModal = $state(false)
	let selectedUser: UsersResponse | null = $state(null)
	let newRole: UserRole = $state('default')

	onMount(() => {
		// Initial data already loaded from server
	})

	async function loadUsers() {
		loading = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch(`/admin/users/api?page=${currentPage}`)
			if (!res.ok) {
				errorMsg = 'Fehler beim Laden der Benutzer'
				return
			}

			const apiData = await res.json()
			users = apiData.items || []
			currentPage = apiData.page || 1
			totalPages = apiData.totalPages || 1
		} catch {
			errorMsg = 'Netzwerkfehler beim Laden'
		} finally {
			loading = false
		}
	}

	async function toggleCheckIn(userId: string, checkedIn: boolean) {
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/users/api', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, checkedIn: checkedIn })
			})

			if (!res.ok) {
				const apiData = await res.json().catch(() => ({}))
				errorMsg = apiData.error || 'Aktion fehlgeschlagen'
				return
			}

			infoMsg = checkedIn ? 'Benutzer eingecheckt' : 'Benutzer ausgecheckt'
			setTimeout(() => (infoMsg = null), 3000)

			// Reload current page
			await loadUsers()
		} catch {
			errorMsg = 'Netzwerkfehler'
		}
	}

	function openRoleChangeModal(user: UsersResponse) {
		selectedUser = user
		newRole = user.role
		showRoleModal = true
	}

	function closeRoleChangeModal() {
		showRoleModal = false
		selectedUser = null
		newRole = 'default'
	}

	async function changeUserRole() {
		if (!selectedUser) return

		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/users/api', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId: selectedUser.id, role: newRole })
			})

			if (!res.ok) {
				const apiData = await res.json().catch(() => ({}))
				errorMsg = apiData.error || 'Rollenänderung fehlgeschlagen'
				return
			}

			infoMsg = `Rolle erfolgreich geändert zu ${getRoleLabel(newRole)}`
			setTimeout(() => (infoMsg = null), 3000)

			closeRoleChangeModal()

			// Reload current page
			await loadUsers()
		} catch {
			errorMsg = 'Netzwerkfehler'
		}
	}

	function getRoleLabel(role: UserRole): string {
		const labels: Record<UserRole, string> = {
			default: 'Standard',
			participant: 'Teilnehmer',
			spectator: 'Zuschauer',
			juror: 'Juror',
			admin: 'Admin'
		}
		return labels[role] || role
	}

	function getRoleBadgeClass(role: UserRole): string {
		const baseClass = 'inline-block px-2 py-0.5 rounded text-xs font-medium'
		const colorClasses: Record<UserRole, string> = {
			admin: 'bg-purple-600/30',
			participant: 'bg-blue-600/30',
			juror: 'bg-green-600/30',
			spectator: 'bg-yellow-600/30',
			default: 'bg-gray-600/30'
		}
		return `${baseClass} ${colorClasses[role] || colorClasses.default}`
	}

	function goToPage(page: number) {
		currentPage = page
		loadUsers()
	}
</script>
