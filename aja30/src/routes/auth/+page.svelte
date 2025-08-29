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
        <section class="panel panel-accent p-4 sm:p-6">
            <h2 class="font-semibold">Login</h2>
            <form method="post" action="?/login" class="mt-4 space-y-4">
                <label class="block text-sm font-medium">
                    E-Mail
                    <input class="mt-1 input" name="email" type="email" required />
                </label>
                <label class="block text-sm font-medium">
                    Passwort
                    <input class="mt-1 input" name="password" type="password" required minlength="8" />
                </label>
                <button type="submit" class="btn-brand">Login</button>
            </form>
        </section>
    {:else}
        <section id="signup" class="panel panel-brand p-4 sm:p-6">
            <h2 class="font-semibold">Sign up</h2>
            <form method="post" action="?/signup" class="mt-4 space-y-4">
                <label class="block text-sm font-medium">
                    E-Mail
                    <input class="mt-1 input" name="email" type="email" required />
                </label>
                <label class="block text-sm font-medium">
                    Passwort
                    <input class="mt-1 input" name="password" type="password" required minlength="8" />
                </label>
                <label class="block text-sm font-medium">
                    Passwort bestätigen
                    <input class="mt-1 input" name="passwordConfirm" type="password" required minlength="8" />
                </label>
                <button type="submit" class="btn-accent">Sign up</button>
            </form>
        </section>
    {/if}
    <div class="flex justify-center">
        <button
            type="button"
            class="text-sm text-accent hover:underline"
            on:click={toggle}
            aria-pressed={mode === 'signup'}
        >
            {mode === 'login' ? 'Noch nicht registriert?' : 'Schon registriert?'}
        </button>
    </div>
</section>
