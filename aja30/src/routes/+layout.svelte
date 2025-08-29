<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-dvh bg-brand bg-halftone text-white pt-3">
    <header class="header-float bg-accent text-white">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" class="font-display text-xl sm:text-2xl tracking-tight drop-shadow">Aja 30!</a>
            <nav class="flex items-center gap-4 text-sm">
                <a href="/" class="text-white/90 hover:text-white link-fun">Home</a>
                <a href="/profile" class="text-white/90 hover:text-white link-fun">Profil</a>
            </nav>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {@render children?.()}
    </main>

    <footer class="mt-auto py-6 text-center text-xs text-white/80">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} David Weppler
        </div>
    </footer>
    
  </div>
