<script lang="ts">
  let { value = 0, max = 5, editable = false, ariaLabelPrefix = 'Stern', children = null, onchange = undefined } = $props();

  function handleClick(v: number) {
    if (!editable) return;
    const val = Math.max(1, Math.min(max, v));
    value = val;
    onchange?.(val);
  }

  const items = $derived(Array.from({ length: max }, (_, i) => i + 1));
</script>

<div class="stars" aria-label={editable ? 'Sterne vergeben' : 'Sterne'}>
  {#each items as s}
    {#if editable}
      <button
        type="button"
        class={`star ${value >= s ? 'on' : ''}`}
        aria-label={`${s} ${ariaLabelPrefix}${s>1?'e':''}`}
        onclick={() => handleClick(s)}
      >★</button>
    {:else}
      <span class={`star ${value >= s ? 'on' : ''}`}>★</span>
    {/if}
  {/each}
  {@render children?.()}
</div>
