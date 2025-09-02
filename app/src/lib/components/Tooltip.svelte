<div class="tooltip-container">
	<button
		type="button"
		class="tooltip-trigger"
		onmouseenter={() => setVisible(true)}
		onmouseleave={() => setVisible(false)}
		onfocus={() => setVisible(true)}
		onblur={() => setVisible(false)}
		aria-label={ariaLabel}
	>
		{triggerText}
	</button>
	{#if visible}
		<div class="tooltip-content" transition:fade={{ duration: 200 }}>
			{content}
		</div>
	{/if}
</div>

<script lang="ts">
	import { fade } from 'svelte/transition'

	interface Props {
		content: string
		triggerText?: string
		ariaLabel?: string
	}

	let { content, triggerText = '?', ariaLabel }: Props = $props()

	let visible = $state(false)

	function setVisible(value: boolean) {
		visible = value
	}
</script>

<style>
	.tooltip-container {
		position: relative;
		display: inline-block;
	}

	.tooltip-trigger {
		display: flex;
		height: 1.25rem;
		width: 1.25rem;
		cursor: help;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: var(--color-info-500);
		font-size: 0.75rem;
		line-height: 1rem;
		font-weight: 700;
		color: white;
		transition: all 0.2s;
		border: none;
	}

	.tooltip-trigger:hover {
		background-color: var(--color-info-400);
	}

	.tooltip-content {
		position: absolute;
		top: 100%;
		right: 0;
		left: 0;
		z-index: 10;
		margin-top: 0.5rem;
		background-color: var(--color-info-600);
		padding: 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: white;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid var(--color-info-500);
		border-radius: 0.5rem;
		white-space: nowrap;
		min-width: max-content;
	}

	.tooltip-content::before {
		content: '';
		position: absolute;
		top: -0.25rem;
		left: 1rem;
		height: 0.5rem;
		width: 0.5rem;
		transform: rotate(45deg);
		border-top: 1px solid var(--color-info-500);
		border-left: 1px solid var(--color-info-500);
		background-color: var(--color-info-600);
	}
</style>
