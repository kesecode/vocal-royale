<script lang="ts">
  let { status } = $props<{ status: number; error: unknown }>();
</script>

<section class="mx-auto max-w-md space-y-4">
  <div class="panel panel-accent p-4 sm:p-6">
    <h1 class="font-display text-2xl sm:text-3xl tracking-tight mb-2">Fehler {status}</h1>
    <p class="text-white/90">Irgendwas ist schiefgelaufen.</p>
  </div>
</section>

