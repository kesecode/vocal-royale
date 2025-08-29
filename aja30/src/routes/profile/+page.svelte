<script lang="ts">
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>

<section class="mx-auto max-w-sm space-y-6">
    <h1 class="text-xl sm:text-2xl font-semibold">Profil</h1>
    <div class="rounded-lg border bg-white p-4 sm:p-6 space-y-4">
        <p class="text-sm text-gray-700">Eingeloggt als:</p>
        <p class="font-medium">{data.user.email ?? data.user.username ?? data.user.id}</p>
        <form method="post" action="?/logout">
            <button type="submit" class="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
                Logout
            </button>
        </form>
    </div>
</section>

