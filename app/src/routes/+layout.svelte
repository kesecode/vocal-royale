<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
	<!-- Safari iOS Statusbar Farbe -->
	<meta name="theme-color" content="#b82015">
	<meta name="msapplication-navbutton-color" content="#b82015">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-title" content="Aja, 30!">
</svelte:head>

<div class="bg-halftone min-h-dvh bg-brand pt-3 text-white">
	<header class="header-float bg-accent text-white">
		<div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
			<a href="/" class="font-display text-xl tracking-tight drop-shadow sm:text-2xl">Aja, 30!</a>
			<nav class="flex items-center gap-4 text-sm">
				{#if isLoggedIn}
					{#if role === 'participant'}
						<a
							href="/song-choice"
							class="font-display text-xl tracking-tight drop-shadow hover:underline sm:text-2xl"
						>
							Songauswahl
						</a>
					{:else if role === 'spectator' || role === 'juror'}
						<a
							href="/rating"
							class="font-display text-xl tracking-tight drop-shadow hover:underline sm:text-2xl"
						>
							Bewertung
						</a>
					{:else if role === 'admin'}
						<a
							href="/admin"
							class="font-display text-xl tracking-tight drop-shadow hover:underline sm:text-2xl"
						>
							Admin
						</a>
					{/if}
				{/if}
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
		{#if data?.reason === 'forbidden'}
			<div class="panel panel-accent mb-4 p-3 text-sm">Hier hast du nichts zu suchen!</div>
		{/if}
		{@render children?.()}
	</main>

	<footer class="mt-auto py-6 text-center text-xs text-white/80">
		<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
			© {new Date().getFullYear()} David Weppler
		</div>
	</footer>
</div>

<script lang="ts">
	import '../app.css'
	import favicon from '$lib/assets/favicon.svg'

	let { children, data } = $props()
	const isLoggedIn = $derived(!!data?.user)
	const role = $derived(data?.user?.role)
</script>
