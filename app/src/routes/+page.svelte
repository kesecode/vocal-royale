<script lang="ts">
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    const displayName = data.user?.firstName || data.user?.name || data.user?.username || data.user?.id;
    const healthyText = data.pb_healthy ? 'online' : 'offline';
    const healthyColor = data.pb_healthy ? 'text-emerald-600' : 'text-rose-600';
 </script>

<section class="space-y-5 sm:space-y-8">
    <div class="space-y-2">
        <h1 class="font-display text-3xl sm:text-4xl tracking-tight">Ai Gude {displayName} wie!?</h1>
        <p class="text-white/90">Der Bre wird 30, singt für mich!</p>
    </div>

    <div class="panel panel-accent p-4 sm:p-6">
        {#if data.user}
            <p class="text-white/80">Hallo {displayName}!</p>
            <p class="mt-1 text-sm text-white/70">Schön, dass du da bist.</p>
            <div class="mt-4 flex flex-wrap gap-3">
                <a href="/profile" class="btn-brand">Profil</a>
            </div>
        {:else}
            <p class="text-white/80">Du bist nicht eingeloggt.</p>
            <div class="mt-4 flex flex-wrap gap-3">
                <a href="/auth" class="btn-brand">Anmelden</a>
                <a href="/auth#signup" class="btn-accent">Konto erstellen</a>
            </div>
        {/if}
        <p class="mt-6 text-sm">PocketBase Status: <span class={healthyColor}>{healthyText}</span></p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <a href="/auth" class="block panel panel-accent p-4 transition-transform">
            <h2 class="font-semibold">Authentifizierung</h2>
            <p class="text-sm text-white/80">Login, Sign-up und Logout.</p>
        </a>
        <a href="https://svelte.dev/docs/kit" target="_blank" class="block panel panel-brand p-4 transition-transform">
            <h2 class="font-semibold">SvelteKit Doku</h2>
            <p class="text-sm text-white/80">Alles was du brauchst, um loszulegen.</p>
        </a>
    </div>
</section>
