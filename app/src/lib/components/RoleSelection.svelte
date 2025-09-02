{#if visible}
	<div class="space-y-4">
		<div class="space-y-1">
			<h2 class="font-display text-xl tracking-tight sm:text-2xl">Rolle auswählen</h2>
			<p class="text-sm text-white/80">
				Wähle deine Rolle im Wettbewerb. Diese Entscheidung bestimmt deine Teilnahmemöglichkeiten.
			</p>
		</div>

		<div class="space-y-3">
			<!-- Teilnehmer*in -->
			<div class="role-option">
				<label class="role-label" class:disabled={!canSelectParticipant}>
					<input
						type="radio"
						name="role"
						value="participant"
						bind:group={selectedRole}
						disabled={!canSelectParticipant}
						class="role-radio"
					/>
					<div class="role-content">
						<div class="role-title">
							<span class="font-semibold">Teilnehmer*in</span>
							<button
								type="button"
								class="info-tooltip"
								onmouseenter={() => setTooltip('participant', true)}
								onmouseleave={() => setTooltip('participant', false)}
								onfocus={() => setTooltip('participant', true)}
								onblur={() => setTooltip('participant', false)}
								aria-label="Info zu Teilnehmer*in Rolle"
							>
								?
							</button>
						</div>
						<div class="role-description">
							{#if canSelectParticipant}
								<span class="text-green-400">Noch {remainingParticipants} Plätze frei</span>
							{:else}
								<span class="text-red-400">Keine Plätze mehr frei</span>
							{/if}
						</div>
						{#if tooltips.participant}
							<div class="tooltip-content" transition:fade={{ duration: 200 }}>
								Du singst aktiv im Wettbewerb und wirst von Juroren bewertet. Du kannst Songs
								auswählen und auftreten.
							</div>
						{/if}
					</div>
				</label>
			</div>

			<!-- Zuschauer*in -->
			<div class="role-option">
				<label class="role-label">
					<input
						type="radio"
						name="role"
						value="spectator"
						bind:group={selectedRole}
						class="role-radio"
					/>
					<div class="role-content">
						<div class="role-title">
							<span class="font-semibold">Zuschauer*in</span>
							<button
								type="button"
								class="info-tooltip"
								onmouseenter={() => setTooltip('spectator', true)}
								onmouseleave={() => setTooltip('spectator', false)}
								onfocus={() => setTooltip('spectator', true)}
								onblur={() => setTooltip('spectator', false)}
								aria-label="Info zu Zuschauer*in Rolle"
							>
								?
							</button>
						</div>
						<div class="role-description">
							<span class="text-white/70">Immer verfügbar</span>
						</div>
						{#if tooltips.spectator}
							<div class="tooltip-content" transition:fade={{ duration: 200 }}>
								Du schaust dem Wettbewerb zu und erlebst alle Auftritte mit. Du kannst nicht
								bewerten, aber alle Inhalte sehen.
							</div>
						{/if}
					</div>
				</label>
			</div>

			<!-- Juror*in -->
			<div class="role-option">
				<label class="role-label" class:disabled={!canSelectJuror}>
					<input
						type="radio"
						name="role"
						value="juror"
						bind:group={selectedRole}
						disabled={!canSelectJuror}
						class="role-radio"
					/>
					<div class="role-content">
						<div class="role-title">
							<span class="font-semibold">Juror*in</span>
							<button
								type="button"
								class="info-tooltip"
								onmouseenter={() => setTooltip('juror', true)}
								onmouseleave={() => setTooltip('juror', false)}
								onfocus={() => setTooltip('juror', true)}
								onblur={() => setTooltip('juror', false)}
								aria-label="Info zu Juror*in Rolle"
							>
								?
							</button>
						</div>
						<div class="role-description">
							{#if canSelectJuror}
								<span class="text-green-400">Noch {remainingJurors} Plätze frei</span>
							{:else}
								<span class="text-red-400">Keine Plätze mehr frei</span>
							{/if}
						</div>
						{#if tooltips.juror}
							<div class="tooltip-content" transition:fade={{ duration: 200 }}>
								Du bewertest die Auftritte der Teilnehmer*innen mit Sternen und Kommentaren. Du
								hilfst dabei, den Sieger zu küren.
							</div>
						{/if}
					</div>
				</label>
			</div>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
			<button type="button" class="btn-ghost" onclick={onCancel}>Abbrechen</button>
			<button
				type="button"
				class="btn-brand"
				disabled={!selectedRole || isLoading}
				onclick={handleSubmit}
			>
				{isLoading ? 'Speichern...' : 'Rolle bestätigen'}
			</button>
		</div>
	</div>
{/if}

<script lang="ts">
	import { fade } from 'svelte/transition'
	import type { UserRole } from '$lib/pocketbase-types'

	interface Props {
		visible?: boolean
		maxParticipants?: number
		maxJurors?: number
		currentParticipants?: number
		currentJurors?: number
		isLoading?: boolean
		onCancel?: () => void
		onSubmit?: (role: UserRole) => void
	}

	let {
		visible = true,
		maxParticipants = 0,
		maxJurors = 0,
		currentParticipants = 0,
		currentJurors = 0,
		isLoading = false,
		onCancel,
		onSubmit
	}: Props = $props()

	let selectedRole: UserRole | null = $state(null)
	let tooltips = $state({
		participant: false,
		spectator: false,
		juror: false
	})

	const remainingParticipants = $derived(Math.max(0, maxParticipants - currentParticipants))
	const remainingJurors = $derived(Math.max(0, maxJurors - currentJurors))
	const canSelectParticipant = $derived(remainingParticipants > 0)
	const canSelectJuror = $derived(remainingJurors > 0)

	function setTooltip(role: keyof typeof tooltips, visible: boolean) {
		tooltips[role] = visible
	}

	function handleSubmit() {
		if (selectedRole && onSubmit) {
			onSubmit(selectedRole)
		}
	}
</script>

<style>
	.role-option {
		position: relative;
	}

	.role-label {
		display: flex;
		cursor: pointer;
		align-items: flex-start;
		background-color: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		transition: all 0.2s;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		gap: 0.75rem;
	}

	.role-label:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.role-label.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.role-label.disabled:hover {
		border-color: rgba(255, 255, 255, 0.1);
		background-color: rgba(255, 255, 255, 0.05);
	}

	.role-radio {
		margin-top: 0.25rem;
		height: 1rem;
		width: 1rem;
		cursor: pointer;
		accent-color: var(--color-brand);
	}

	.role-radio:disabled {
		cursor: not-allowed;
	}

	.role-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.role-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.role-description {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.info-tooltip {
		display: flex;
		height: 1.25rem;
		width: 1.25rem;
		cursor: help;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: var(--color-info-500);
		font-size: 0.75rem;
		line-height: 1rem;
		font-weight: 700;
		color: white;
		transition: all 0.2s;
	}

	.info-tooltip:hover {
		background-color: var(--color-info-400);
	}

	.tooltip-content {
		position: absolute;
		top: 100%;
		right: 0;
		left: 0;
		z-index: 10;
		margin-top: 0.5rem;
		background-color: var(--color-info-600);
		padding: 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: white;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(var(--color-info-500), 0.5);
		border-radius: 0.5rem;
	}

	.tooltip-content::before {
		content: '';
		position: absolute;
		top: -0.25rem;
		left: 1rem;
		height: 0.5rem;
		width: 0.5rem;
		transform: rotate(45deg);
		border-top: 1px solid rgba(var(--color-info-500), 0.5);
		border-left: 1px solid rgba(var(--color-info-500), 0.5);
		background-color: var(--color-info-600);
	}
</style>
