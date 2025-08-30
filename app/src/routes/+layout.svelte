<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

		let { children, data } = $props();
    const isLoggedIn = $derived(!!data?.user);
    const role = $derived(data?.user?.role as ('participant'|'spectator'|'juror'|'admin'|undefined));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-dvh bg-brand bg-halftone text-white pt-3">
    <header class="header-float bg-accent text-white">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" class="font-display text-xl sm:text-2xl tracking-tight drop-shadow">Aja, 30!</a>
            <nav class="flex items-center gap-4 text-sm">
                {#if isLoggedIn}
                    {#if role === 'participant'}
                        <a href="/song-choice" class="font-display text-xl sm:text-2xl tracking-tight drop-shadow hover:underline">Songauswahl</a>
                    {:else if role === 'spectator' || role === 'juror'}
                        <a href="/rating" class="font-display text-xl sm:text-2xl tracking-tight drop-shadow hover:underline">Bewertung</a>
                    {:else if role === 'admin'}
                        <a href="/admin" class="font-display text-xl sm:text-2xl tracking-tight drop-shadow hover:underline">Admin</a>
                    {/if}
                {/if}
            </nav>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {#if data?.reason === 'forbidden'}
            <div class="panel panel-accent p-3 mb-4 text-sm">Hier hast du nichts zu suchen!</div>
        {/if}
        {@render children?.()}
    </main>

    <footer class="mt-auto py-6 text-center text-xs text-white/80">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} David Weppler
        </div>
    </footer>
    
  </div>
