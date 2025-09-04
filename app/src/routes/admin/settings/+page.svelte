<section class="section section-spacing">
	<h1 class="font-display heading-responsive">Einstellungen</h1>

	<div class="panel-table">
		<div class="flex-between table-header-border padding-responsive py-3">
			<div class="font-semibold">Competition Settings</div>
			{#if loading}
				<div class="text-xs text-muted">Laden…</div>
			{/if}
		</div>
		<div class="space-y-4 p-3 sm:p-4">
			{#if errorMsg}
				<div class="text-sm text-rose-200">{errorMsg}</div>
			{/if}
			{#if infoMsg}
				<div class="text-sm text-emerald-200">{infoMsg}</div>
			{/if}

			<form onsubmit={handleSubmit}>
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-white/90 mb-1" for="maxParticipantCount">
							Maximale Teilnehmer
						</label>
						<input
							id="maxParticipantCount"
							type="number"
							min="1"
							max="50"
							bind:value={settings.maxParticipantCount}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-white/90 mb-1" for="maxJurorCount">
							Maximale Juroren
						</label>
						<input
							id="maxJurorCount"
							type="number"
							min="1"
							max="20"
							bind:value={settings.maxJurorCount}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-white/90 mb-1" for="totalRounds">
							Anzahl Runden
						</label>
						<input
							id="totalRounds"
							type="number"
							min="1"
							max="10"
							bind:value={settings.totalRounds}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-white/90 mb-1" for="numberOfFinalSongs">
							Anzahl Songs im Finale
						</label>
						<input
							id="numberOfFinalSongs"
							type="number"
							min="1"
							max="10"
							bind:value={settings.numberOfFinalSongs}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-white/90 mb-1" for="songChoiceDeadline">
							Song-Auswahl Deadline
						</label>
						<input
							id="songChoiceDeadline"
							type="datetime-local"
							bind:value={settings.songChoiceDeadline}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
					</div>

					<div>
						<label
							class="block text-sm font-medium text-white/90 mb-1"
							for="roundEliminationPattern"
						>
							Ausscheidungsmuster
						</label>
						<input
							id="roundEliminationPattern"
							type="text"
							bind:value={settings.roundEliminationPattern}
							placeholder="z.B. 5,3,3,2"
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
						/>
						<div class="text-xs text-white/70 mt-1">
							Komma-separierte Zahlen für Eliminierungen pro Runde
						</div>
						{#if validationError}
							<div class="text-xs text-rose-300 mt-1">{validationError}</div>
						{/if}
					</div>
				</div>

				<div class="flex gap-2 pt-4">
					<button type="submit" class="btn-brand" disabled={loading || !!validationError}>
						Speichern
					</button>
					<button type="button" class="btn-secondary" onclick={resetToDefaults}>
						Zurücksetzen
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="mt-4">
		<a href="/admin" class="btn-secondary">← Zurück zum Admin</a>
	</div>
</section>

<script lang="ts">
	import type { SettingsRecord } from '$lib/pocketbase-types'

	let settings: Required<SettingsRecord> = {
		maxParticipantCount: 15,
		maxJurorCount: 3,
		totalRounds: 5,
		numberOfFinalSongs: 2,
		songChoiceDeadline: '',
		roundEliminationPattern: '5,3,3,2'
	}

	let loading = false
	let errorMsg: string | null = null
	let infoMsg: string | null = null
	let validationError: string | null = null

	async function loadSettings() {
		loading = true
		errorMsg = null
		try {
			const res = await fetch('/admin/settings/api')
			if (!res.ok) {
				errorMsg = 'Einstellungen laden fehlgeschlagen'
				return
			}
			const data = await res.json()
			if (data.settings) {
				settings = {
					...settings,
					...data.settings,
					songChoiceDeadline: data.settings.songChoiceDeadline || ''
				}
			}
		} catch {
			errorMsg = 'Netzwerkfehler beim Laden'
		} finally {
			loading = false
		}
	}

	function validateEliminationPattern(
		pattern: string,
		totalRounds: number,
		maxParticipants: number
	): string | null {
		if (!pattern.trim()) return 'Ausscheidungsmuster darf nicht leer sein'

		const parts = pattern.split(',').map((s) => s.trim())
		const expectedParts = totalRounds - 1

		if (parts.length !== expectedParts) {
			return `Für ${totalRounds} Runden werden ${expectedParts} komma-separierte Werte erwartet`
		}

		const numbers = parts.map((p) => parseInt(p, 10))
		if (numbers.some((n) => isNaN(n) || n < 0)) {
			return 'Alle Werte müssen nicht-negative Zahlen sein'
		}

		const totalEliminations = numbers.reduce((sum, n) => sum + n, 0)
		const remaining = maxParticipants - totalEliminations

		if (remaining !== 2) {
			return `Bei ${maxParticipants} Teilnehmern und ${totalEliminations} Eliminierungen bleiben ${remaining} für das Finale, erwartet werden 2`
		}

		return null
	}

	$: {
		validationError = validateEliminationPattern(
			settings.roundEliminationPattern,
			settings.totalRounds,
			settings.maxParticipantCount
		)
	}

	async function handleSubmit(e: Event) {
		e.preventDefault()
		if (validationError) return

		loading = true
		errorMsg = null
		infoMsg = null

		try {
			const res = await fetch('/admin/settings/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'update',
					settings: {
						...settings,
						songChoiceDeadline: settings.songChoiceDeadline || null
					}
				})
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				errorMsg = data.error || 'Speichern fehlgeschlagen'
				return
			}

			infoMsg = 'Einstellungen erfolgreich gespeichert'
		} catch {
			errorMsg = 'Netzwerkfehler beim Speichern'
		} finally {
			loading = false
		}
	}

	function resetToDefaults() {
		if (confirm('Einstellungen auf Standardwerte zurücksetzen?')) {
			settings = {
				maxParticipantCount: 15,
				maxJurorCount: 3,
				totalRounds: 5,
				numberOfFinalSongs: 2,
				songChoiceDeadline: '',
				roundEliminationPattern: '5,3,3,2'
			}
			validationError = null
		}
	}

	// Load settings on mount
	loadSettings()
</script>
