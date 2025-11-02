<svelte:head>
	<title>Passwort zurücksetzen - {PUBLIC_APP_NAME}</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
	<div class="panel panel-accent p-4 sm:p-6">
		<h2 class="font-semibold">Neues Passwort setzen</h2>

		{#if formData?.message}
			<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
		{/if}

		<form
			method="post"
			class="mt-4 space-y-4"
			use:enhance={() => {
				isSubmitting = true
				return async ({ update }) => {
					await update()
					isSubmitting = false
				}
			}}
		>
			<label class="block text-sm font-medium">
				Neues Passwort
				<input
					class="input mt-1"
					name="password"
					type="password"
					required
					minlength="8"
					disabled={isSubmitting}
				/>
			</label>

			<label class="block text-sm font-medium">
				Passwort bestätigen
				<input
					class="input mt-1"
					name="passwordConfirm"
					type="password"
					required
					minlength="8"
					disabled={isSubmitting}
				/>
			</label>

			<button type="submit" class="btn-brand" disabled={isSubmitting}>
				{isSubmitting ? 'Wird geändert...' : 'Passwort ändern'}
			</button>
		</form>
	</div>
</section>

<script lang="ts">
	import { enhance } from '$app/forms'
	import { PUBLIC_APP_NAME } from '$env/static/public'

	let { form: formData }: { form?: { message?: string } } = $props()
	let isSubmitting = $state(false)
</script>
