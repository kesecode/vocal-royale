<section class="mx-auto max-w-md space-y-4">
	<div class="panel panel-accent p-4 sm:p-6">
		<h1 class="mb-2 font-display text-2xl tracking-tight sm:text-3xl">Fehler {status}</h1>
		<p class="text-white/90">Irgendwas ist schiefgelaufen.</p>
	</div>
</section>

<script lang="ts">
	let { status } = $props<{ status: number; error: unknown }>()
</script>
