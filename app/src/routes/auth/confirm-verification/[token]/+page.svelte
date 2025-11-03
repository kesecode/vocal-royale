<svelte:head>
	<title>Email-Verifizierung - Vocal Royale</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
	<div class="panel panel-accent p-6">
		{#if data.success}
			<div class="text-center space-y-4">
				<div class="text-4xl">✓</div>
				<h2 class="font-semibold text-lg">Email verifiziert</h2>
				<p class="text-sm">{data.message}</p>
				<button type="button" class="btn-brand" onclick={handleContinue}>Zum Login</button>
			</div>
		{:else}
			<div class="text-center space-y-4">
				<div class="text-4xl">✗</div>
				<h2 class="font-semibold text-lg">Verifizierung fehlgeschlagen</h2>
				<p class="text-sm text-rose-200">{data.message}</p>
				<button type="button" class="btn-purple" onclick={() => goto('/auth')}>
					Zurück zum Login
				</button>
			</div>
		{/if}
	</div>
</section>

<script lang="ts">
	import { goto } from '$app/navigation'

	let { data } = $props()

	const handleContinue = () => {
		if (data.success) {
			goto('/auth')
		}
	}
</script>
