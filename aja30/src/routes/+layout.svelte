<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-dvh bg-gray-50 text-gray-900">
    <header class="border-b bg-white/80 backdrop-blur">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" class="font-semibold tracking-tight">Aja 30!</a>
            <nav class="flex items-center gap-4 text-sm">
                <a href="/" class="hover:text-gray-700">Home</a>
                <a href="/profile" class="hover:text-gray-700">Profil</a>
            </nav>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {@render children?.()}
    </main>

    <footer class="mt-auto py-6 text-center text-xs text-gray-500">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} David Weppler
        </div>
    </footer>
  </div>
