<section class="mx-auto max-w-sm space-y-6">
	{#if banner}
		<div class="panel panel-accent p-3 text-sm">{banner}</div>
	{/if}

	{#if mode === 'login'}
		<section class="panel panel-accent p-4 sm:p-6">
			<h2 class="font-semibold">Login</h2>
			{#if formData?.message}
				<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
			{/if}
			<form method="post" action="?/login" class="mt-4 space-y-4" use:enhance>
				<input type="hidden" name="next" value={next} />
				<label class="block text-sm font-medium">
					E-Mail
					<input class="input mt-1" name="email" type="email" required />
				</label>
				<label class="block text-sm font-medium">
					Passwort
					<input class="input mt-1" name="password" type="password" required minlength="8" />
				</label>
				<button type="submit" class="btn-brand">Login</button>
			</form>
		</section>
	{:else}
		<section id="signup" class="panel panel-brand p-4 sm:p-6">
			<h2 class="font-semibold">Sign up</h2>
			{#if formData?.message}
				<div class="mt-2 text-sm text-rose-200">{formData.message}</div>
			{/if}
			<form method="post" action="?/signup" class="mt-4 space-y-4" use:enhance>
				<input type="hidden" name="next" value={next} />
				<label class="block text-sm font-medium">
					E-Mail
					<input class="input mt-1" name="email" type="email" required />
				</label>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="block text-sm font-medium">
						Vorname
						<input class="input mt-1" name="firstName" type="text" required />
					</label>
					<label class="block text-sm font-medium">
						Nachname
						<input class="input mt-1" name="lastName" type="text" required />
					</label>
				</div>
				<label class="block text-sm font-medium">
					Künstlername
					<input class="input mt-1" name="artistName" type="text" required />
				</label>
				<label class="block text-sm font-medium">
					Passwort
					<input class="input mt-1" name="password" type="password" required minlength="8" />
				</label>
				<label class="block text-sm font-medium">
					Passwort bestätigen
					<input class="input mt-1" name="passwordConfirm" type="password" required minlength="8" />
				</label>
				<button type="submit" class="btn-accent">Sign up</button>
			</form>
		</section>
	{/if}
	<div class="flex justify-center">
		<button
			type="button"
			class="text-sm hover:underline"
			style="color: var(--color-gold-500)"
			onclick={toggle}
			aria-pressed={mode === 'signup'}
		>
			{mode === 'login' ? 'Noch nicht registriert?' : 'Schon registriert?'}
		</button>
	</div>
</section>

<script lang="ts">
	import { onMount } from 'svelte'
	import { enhance } from '$app/forms'
	let mode = $state<'login' | 'signup'>('login')
	let banner = $state<string | null>(null)
	let next = $state('')

	let { form: formData }: { form?: { message?: string } } = $props()

	onMount(() => {
		if (typeof window !== 'undefined' && window.location.hash === '#signup') {
			mode = 'signup'
		}
		if (typeof window !== 'undefined') {
			const q = new URLSearchParams(window.location.search)
			if (q.get('reason') === 'auth_required') {
				banner = 'Bitte melde dich an, um fortzufahren.'
			}
			next = q.get('next') ?? ''
		}
	})
	const toggle = () => (mode = mode === 'login' ? 'signup' : 'login')
</script>
