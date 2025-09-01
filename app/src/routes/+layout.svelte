<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
	/>
	<!-- Safari iOS status bar color -->
	<meta name="theme-color" content="#b82015" />
	<meta name="msapplication-navbutton-color" content="#b82015" />
	<meta name="mobile-web-app-capable" content="yes" />
</svelte:head>

<div class="bg-halftone min-h-dvh bg-brand pt-3 text-white">
	<header class="header-float bg-accent text-white">
		<div class="flex items-center justify-between px-4 sm:px-6 lg:px-8">
			<!-- Logo ganz links -->
			<div class="logo mt-1.5 mb-1.5 flex items-center">
				<a href="/" class="font-display text-xl tracking-tight drop-shadow sm:text-2xl">Aja, 30!</a>
			</div>

			<!-- Right-Container (zentriert begrenzt) -->
			<div class="mx-auto flex max-w-5xl flex-1 items-center justify-end">
				<!-- Hamburger: sichtbar auf kleinen Screens ODER wenn erzwungen -->
				<button
					type="button"
					class="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
					aria-controls="main-nav"
					aria-expanded={menuOpen}
					onclick={toggleMenu}
				>
					<span class="sr-only">Menü öffnen</span>
					<div class="flex flex-col items-center justify-center gap-1.5">
						<!-- Linie 1: Basis -2deg (bleibt sichtbar) -->
						<span
							class="line block h-1 w-7 rounded-full border border-black bg-white will-change-transform"
							style="--base-rot:-2deg; animation-delay:0ms"
							class:animate-wiggle={wiggle}
						></span>

						<!-- Linie 2: Basis +1deg -->
						<span
							class="line block h-1 w-7 rounded-full border border-black bg-white will-change-transform"
							style="--base-rot:1deg; animation-delay:20ms"
							class:animate-wiggle={wiggle}
						></span>

						<!-- Linie 3: Basis -1deg -->
						<span
							class="line block h-1 w-7 rounded-full border border-black bg-white will-change-transform"
							style="--base-rot:-1deg; animation-delay:50ms"
							class:animate-wiggle={wiggle}
						></span>
					</div>
				</button>

				<!-- Desktop-Navigation (nur wenn nicht erzwungen) -->
				{#if isLoggedIn}
					<nav id="main-nav" class="hidden items-center gap-4 text-sm md:flex">
						{#each navLinks as link}
							<a
								href={link.href}
								class="font-display text-xl tracking-tight drop-shadow hover:underline sm:text-2xl"
							>
								{link.label}
							</a>
						{/each}
					</nav>
				{/if}
			</div>
		</div>

		<!-- Mobile/Erzwungenes Menü: Header wächst nach unten, vertikale Liste -->
		{#if isLoggedIn && menuOpen}
			<nav
				id="main-nav"
				in:slide={{ duration: 250 }}
				out:slide={{ duration: 200 }}
				class="px-4 pt-2 pb-3 sm:px-6 lg:px-8"
				style="overflow-anchor: none;"
			>
				<div class="space-y-3">
					<!-- Comic-Trennlinie -->
					<svg
						viewBox="0 0 300 10"
						xmlns="http://www.w3.org/2000/svg"
						class="h-2 w-full pr-1 pl-1"
						preserveAspectRatio="none"
						overflow="visible"
					>
						<path
							d="M -2 5 C 73 1.5, 227 8.5, 302 5"
							stroke="black"
							stroke-width="5"
							stroke-linecap="round"
							fill="none"
						></path>
						<path
							d="M -2 5 C 73 1.5, 227 8.5, 302 5"
							stroke="white"
							stroke-width="2.5"
							stroke-linecap="round"
							fill="none"
						></path>
					</svg>
					<ul class="flex flex-col gap-2">
						{#each navLinks as link}
							<li>
								<a
									href={link.href}
									class="block rounded-md px-2 py-2 text-base hover:underline"
									onclick={closeMenu}
								>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</nav>
		{/if}
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
	import favicon from '$lib/assets/favicon.png'
	import { slide } from 'svelte/transition'

	let { children, data } = $props()
	const isLoggedIn = $derived(!!data?.user)
	const role = $derived(data?.user?.role)
	let menuOpen = $state(false)
	let wiggle = $state(false)

	function closeMenu() {
		menuOpen = false
	}

	function toggleMenu() {
		menuOpen = !menuOpen
		wiggle = true
		// Animation nach Ende wieder entfernen, damit sie erneut triggert
		setTimeout(() => (wiggle = false), 450)
	}

	// Links aus Rolle ableiten (nur Beispiel wie bisher)
	const navLinks = $derived(
		[
			role === 'participant' && { href: '/song-choice', label: 'Songauswahl' },
			(role === 'spectator' || role === 'juror') && { href: '/rating', label: 'Bewertung' },
			role === 'admin' && { href: '/admin', label: 'Admin' },
			{ href: '/profile', label: 'Profil' }
		].filter(Boolean) as { href: string; label: string }[]
	)
</script>
