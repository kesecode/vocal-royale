<Modal open={visible} title="Rolle auswählen" onclose={() => {}}>
	<div class="form-spacing">
		<div class="content-spacing">
			<h2 class="font-display text-responsive">Rolle auswählen</h2>
			<p class="text-sm text-muted">
				Wähle deine Rolle im Wettbewerb. Diese Entscheidung bestimmt deine Teilnahmemöglichkeiten.
			</p>
		</div>

		<div class="content-spacing">
			<!-- Teilnehmer*in -->
			<div class="choice-option">
				<label class="choice-label" class:disabled={!canSelectParticipant}>
					<input
						type="radio"
						name="role"
						value="participant"
						bind:group={selectedRole}
						disabled={!canSelectParticipant}
						class="choice-radio"
					/>
					<div class="choice-content">
						<div class="choice-title">
							<span class="font-semibold">Teilnehmer*in</span>
							<Tooltip
								content="Du singst aktiv im Wettbewerb und wirst von Juroren bewertet. Du kannst Songs auswählen und auftreten."
								ariaLabel="Info zu Teilnehmer*in Rolle"
							/>
						</div>
						<div class="choice-description">
							{#if canSelectParticipant}
								<span class="text-green-400">Noch {remainingParticipants} Plätze frei</span>
							{:else}
								<span class="text-red-400">Keine Plätze mehr frei</span>
							{/if}
						</div>
					</div>
				</label>
			</div>

			<!-- Zuschauer*in -->
			<div class="choice-option">
				<label class="choice-label">
					<input
						type="radio"
						name="role"
						value="spectator"
						bind:group={selectedRole}
						class="choice-radio"
					/>
					<div class="choice-content">
						<div class="choice-title">
							<span class="font-semibold">Zuschauer*in</span>
							<Tooltip
								content="Du schaust dem Wettbewerb zu und erlebst alle Auftritte live. Du gibst deine Stimme in Form einer Bewertung ab und bestimmst so mit, wer weiterkommt."
								ariaLabel="Info zu Zuschauer*in Rolle"
							/>
						</div>
						<div class="choice-description">
							<span class="text-subtle">Immer verfügbar</span>
						</div>
					</div>
				</label>
			</div>

			<!-- Juror*in -->
			<div class="choice-option">
				<label class="choice-label" class:disabled={!canSelectJuror}>
					<input
						type="radio"
						name="role"
						value="juror"
						bind:group={selectedRole}
						disabled={!canSelectJuror}
						class="choice-radio"
					/>
					<div class="choice-content">
						<div class="choice-title">
							<span class="font-semibold">Juror*in</span>
							<Tooltip
								content="Du bewertest die Auftritte der Teilnehmer*innen ausführlich – mit Sternen, Kommentaren und professioneller Einschätzung. Deine Bewertung hat mehr Gewicht und trägt maßgeblich dazu bei, den Sieger zu küren."
								ariaLabel="Info zu Juror*in Rolle"
							/>
						</div>
						<div class="choice-description">
							{#if canSelectJuror}
								<span class="text-green-400">Noch {remainingJurors} Plätze frei</span>
							{:else}
								<span class="text-red-400">Keine Plätze mehr frei</span>
							{/if}
						</div>
					</div>
				</label>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="btn-brand"
			disabled={!selectedRole || isLoading}
			onclick={handleSubmit}
		>
			{isLoading ? 'Speichern...' : 'Rolle bestätigen'}
		</button>
	{/snippet}
</Modal>

<script lang="ts">
	import type { UserRole } from '$lib/pocketbase-types'
	import Modal from './Modal.svelte'
	import Tooltip from './Tooltip.svelte'

	interface Props {
		visible?: boolean
		maxParticipants?: number
		maxJurors?: number
		currentParticipants?: number
		currentJurors?: number
		isLoading?: boolean
		onSubmit?: (role: UserRole) => void
	}

	let {
		visible = true,
		maxParticipants = 0,
		maxJurors = 0,
		currentParticipants = 0,
		currentJurors = 0,
		isLoading = false,
		onSubmit
	}: Props = $props()

	let selectedRole: UserRole | null = $state(null)

	const remainingParticipants = $derived(Math.max(0, maxParticipants - currentParticipants))
	const remainingJurors = $derived(Math.max(0, maxJurors - currentJurors))
	const canSelectParticipant = $derived(remainingParticipants > 0)
	const canSelectJuror = $derived(remainingJurors > 0)

	function handleSubmit() {
		if (selectedRole && onSubmit) {
			onSubmit(selectedRole)
		}
	}
</script>
