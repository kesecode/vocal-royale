<svelte:head>
	<title>Passwort vergessen - Vocal Royale</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
	<div class="panel panel-accent p-4 sm:p-6">
		<h2 class="font-semibold">Passwort vergessen?</h2>

		{#if formData?.success}
			<div class="mt-4 panel panel-brand p-3 text-sm">
				{formData.message}
			</div>
		{:else}
			<p class="mt-2 text-sm">
				Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen deines Passworts.
			</p>

			{#if formData?.message && !formData.success}
				<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
			{/if}

			<form method="post" class="mt-4 space-y-4" use:enhance>
				<label class="block text-sm font-medium">
					E-Mail
					<input class="input mt-1" name="email" type="email" required />
				</label>
				<button type="submit" class="btn-brand">Passwort zurücksetzen</button>
			</form>
		{/if}

		<div class="mt-4 text-center">
			<a href="/auth" class="text-sm hover:underline" style="color: var(--color-gold-500)">
				Zurück zum Login
			</a>
		</div>
	</div>
</section>

<script lang="ts">
	import { enhance } from '$app/forms'

	let { form: formData }: { form?: { success?: boolean; message?: string } } = $props()
</script>
