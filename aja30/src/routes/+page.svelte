<script lang="ts">
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    const displayName = data.user?.email ?? data.user?.username ?? data.user?.id;
    const healthyText = data.pb_healthy ? 'online' : 'offline';
    const healthyColor = data.pb_healthy ? 'text-emerald-600' : 'text-rose-600';
 </script>

<section class="space-y-5 sm:space-y-8">
    <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Willkommen bei Aja 30!</h1>
        <p class="text-gray-600">Ein schlanker Start mit SvelteKit + PocketBase.</p>
    </div>

    <div class="rounded-lg border bg-white p-4 sm:p-6">
        {#if data.user}
            <p class="text-gray-700">Eingeloggt als</p>
            <p class="mt-1 text-lg font-semibold">{displayName}</p>
            <div class="mt-4 flex flex-wrap gap-3">
                <a href="/profile" class="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">Profil</a>
            </div>
        {:else}
            <p class="text-gray-700">Du bist nicht eingeloggt.</p>
            <div class="mt-4 flex flex-wrap gap-3">
                <a href="/auth" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Anmelden</a>
                <a href="/auth#signup" class="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50">Konto erstellen</a>
            </div>
        {/if}
        <p class="mt-6 text-sm">PocketBase Status: <span class={healthyColor}>{healthyText}</span></p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <a href="/auth" class="block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
            <h2 class="font-semibold">Authentifizierung</h2>
            <p class="text-sm text-gray-600">Login, Sign-up und Logout.</p>
        </a>
        <a href="https://svelte.dev/docs/kit" target="_blank" class="block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
            <h2 class="font-semibold">SvelteKit Doku</h2>
            <p class="text-sm text-gray-600">Alles was du brauchst, um loszulegen.</p>
        </a>
    </div>
</section>
