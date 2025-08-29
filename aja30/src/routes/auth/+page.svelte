<script lang="ts">
    import { onMount } from 'svelte';
    let mode: 'login' | 'signup' = 'login';

    onMount(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#signup') {
            mode = 'signup';
        }
    });
    const toggle = () => (mode = mode === 'login' ? 'signup' : 'login');
</script>

<section class="mx-auto max-w-sm space-y-6">
    
    {#if mode === 'login'}
        <section class="rounded-lg border bg-white p-4 sm:p-6">
            <h2 class="font-semibold">Login</h2>
            <form method="post" action="?/login" class="mt-4 space-y-4">
                <label class="block text-sm font-medium">
                    E-Mail
                    <input class="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" name="email" type="email" required />
                </label>
                <label class="block text-sm font-medium">
                    Passwort
                    <input class="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" name="password" type="password" required minlength="8" />
                </label>
                <button type="submit" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Login
                </button>
            </form>
        </section>
    {:else}
        <section id="signup" class="rounded-lg border bg-white p-4 sm:p-6">
            <h2 class="font-semibold">Sign up</h2>
            <form method="post" action="?/signup" class="mt-4 space-y-4">
                <label class="block text-sm font-medium">
                    E-Mail
                    <input class="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" name="email" type="email" required />
                </label>
                <label class="block text-sm font-medium">
                    Passwort
                    <input class="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" name="password" type="password" required minlength="8" />
                </label>
                <label class="block text-sm font-medium">
                    Passwort bestätigen
                    <input class="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" name="passwordConfirm" type="password" required minlength="8" />
                </label>
                <button type="submit" class="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
                    Sign up
                </button>
            </form>
        </section>
    {/if}
    <div class="flex justify-center">
        <button
            type="button"
            class="text-sm text-blue-700 hover:underline"
            on:click={toggle}
            aria-pressed={mode === 'signup'}
        >
            {mode === 'login' ? 'Noch nicht registriert?' : 'Schon registriert?'}
        </button>
    </div>
</section>
