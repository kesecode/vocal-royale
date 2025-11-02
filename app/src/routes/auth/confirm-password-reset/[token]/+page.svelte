<svelte:head>
	<title>Passwort zurücksetzen - Vocal Royale</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
	<div class="panel panel-accent p-4 sm:p-6">
		<h2 class="font-semibold">Neues Passwort setzen</h2>

		{#if formData?.message}
			<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
		{/if}

		<form method="post" class="mt-4 space-y-4" use:enhance>
			<label class="block text-sm font-medium">
				Neues Passwort
				<input class="input mt-1" name="password" type="password" required minlength="8" />
			</label>

			<label class="block text-sm font-medium">
				Passwort bestätigen
				<input class="input mt-1" name="passwordConfirm" type="password" required minlength="8" />
			</label>

			<button type="submit" class="btn-brand">Passwort ändern</button>
		</form>
	</div>
</section>

<script lang="ts">
	import { enhance } from '$app/forms'

	let { form: formData }: { form?: { message?: string } } = $props()
</script>
