{#if open}
	<div class="overlay" onkeydown={onKey} tabindex="-1" role="presentation">
		<div class="overlay-backdrop" onclick={close} aria-hidden="true"></div>
		<div class="overlay-card" role="dialog" aria-modal="true" aria-label={title}>
			<div class="overlay-body">
				{@render children?.()}
			</div>
			{#if footer}
				<div class="overlay-foot">
					{@render footer?.()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		open?: boolean
		title?: string
		onclose?: () => void
		children?: Snippet
		footer?: Snippet
	}

	let { open = $bindable(false), title = '', onclose, children, footer }: Props = $props()

	function close() {
		onclose?.()
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close()
	}
</script>

<style>
	/* Styling provided by global utilities in app.css */
</style>
