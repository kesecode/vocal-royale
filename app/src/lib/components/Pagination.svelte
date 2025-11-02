<div class="flex items-center justify-between gap-3 px-4 py-3">
	<button
		class="btn-ghost"
		disabled={currentPage === 1}
		onclick={() => onPageChange(currentPage - 1)}
	>
		← Zurück
	</button>

	<div class="text-sm text-white/80">
		Seite {currentPage} von {totalPages}
	</div>

	<button
		class="btn-ghost"
		disabled={currentPage === totalPages}
		onclick={() => onPageChange(currentPage + 1)}
	>
		Weiter →
	</button>
</div>

<script lang="ts">
	type Props = {
		currentPage: number
		totalPages: number
		onPageChange: (page: number) => void
	}

	let { currentPage, totalPages, onPageChange }: Props = $props()
</script>
