<div class="progress">
	{#each items as r (r)}
		<button
			type="button"
			class={`progress-btn ${r < activeRound ? 'is-past' : r === activeRound ? 'is-current' : 'is-future'} ${currentRound === r ? 'is-selected' : ''}`}
			onclick={() => selectRound(r)}
			disabled={r > activeRound}
			aria-current={r === activeRound}
			aria-disabled={r > activeRound}
			aria-label={`Runde ${r}`}
		>
			{r}
		</button>
		{#if r < total}
			<span class={`progress-conn ${r < activeRound ? 'is-on' : ''}`} aria-hidden="true"></span>
		{/if}
	{/each}
</div>

<script lang="ts">
	const {
		onSelect,
		activeRound = 1,
		currentRound: initialRound = 1,
		total = 5
	} = $props<{
		onSelect?: (round: number) => void
		activeRound?: number
		currentRound?: number
		total?: number
	}>()

	let currentRound = $state(initialRound)

	function selectRound(r: number) {
		if (r > activeRound || r < 1 || r > total || r === currentRound) return
		currentRound = r
		onSelect?.(r)
	}

	const items = $derived(Array.from({ length: total }, (_, i) => i + 1))
</script>
