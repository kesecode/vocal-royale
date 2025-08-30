<script lang="ts">
    import type { PageProps } from './$types';
    import type { UsersResponse } from '$lib/pocketbase-types';
    
    let { data }: PageProps = $props();
    const user = data.user as UsersResponse | null;
</script>

<section class="mx-auto max-w-sm space-y-6">
    <h1 class="font-display text-2xl sm:text-3xl">Profil</h1>
    <div class="panel panel-accent p-4 sm:p-6 space-y-4">
        <p class="text-sm text-white/80">Hallo {user?.firstName || user?.name || user?.username}!</p>
        {#if user?.artistName}
            <p class="text-sm text-white/70">a.k.a. {user.artistName}</p>
        {/if}
        <form method="post" action="?/logout">
            <button type="submit" class="btn-brand">Logout</button>
        </form>
    </div>
</section>
