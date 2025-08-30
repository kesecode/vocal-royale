<section class="space-y-5 sm:space-y-8">
	<div class="space-y-2">
		<h1 class="font-display text-3xl tracking-tight sm:text-4xl">Ai Gude {displayName} wie!?</h1>
		<p class="text-white/90">Der Bre wird 30, singt für mich!</p>
	</div>

	<div class="panel panel-accent p-4 sm:p-6">
		<p class="text-white/80">Hallo {displayName}!</p>
		<p class="mt-1 text-sm text-white/70">Schön, dass du da bist.</p>
		<div class="mt-4 flex flex-wrap gap-3">
			<a href="/profile" class="btn-brand">Profil</a>
		</div>
	</div>

	{#if competitionFinished}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Wettbewerb beendet</div>
			</div>
			<div class="p-3 sm:p-4">
				{#if data?.winner}
					<div class="text-lg font-semibold">Sieger: {data.winner.name}</div>
					{#if data.winner.avg !== undefined}
						<div class="text-sm text-white/80">
							Ø Bewertung: {data.winner.avg.toFixed(2)}{#if data.winner.count}
								(Stimmen: {data.winner.count}){/if}
						</div>
					{/if}
				{:else}
					<div class="text-sm text-white/80">Der Sieger wird geladen…</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="panel panel-brand overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Alle Teilnehmer</div>
			</div>
			<div class="overflow-x-auto p-3 sm:p-4">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-white/90">
							<th class="p-2 sm:p-3">Name</th>
							<th class="p-2 sm:p-3">Künstlername</th>
							<th class="p-2 sm:p-3">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.participants as u}
							<tr class="border-t border-[#333]/40 align-middle">
								<td class="p-2 sm:p-3">{u.name}</td>
								<td class="p-2 sm:p-3">{u.artistName || '—'}</td>
								<td class="p-2 sm:p-3">{u.eliminated ? 'ausgeschieden' : 'aktiv'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="panel panel-accent overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Alle Spectators</div>
			</div>
			<div class="overflow-x-auto p-3 sm:p-4">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-white/90">
							<th class="p-2 sm:p-3">Name</th>
						</tr>
					</thead>
					<tbody>
						{#each data.spectators as u}
							<tr class="border-t border-[#333]/40 align-middle">
								<td class="p-2 sm:p-3">{u.name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="panel panel-accent overflow-hidden p-0">
			<div class="border-b border-[#333]/60 px-4 py-3 sm:px-6">
				<div class="font-semibold">Alle Juroren</div>
			</div>
			<div class="overflow-x-auto p-3 sm:p-4">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-white/90">
							<th class="p-2 sm:p-3">Name</th>
						</tr>
					</thead>
					<tbody>
						{#each data.jurors as u}
							<tr class="border-t border-[#333]/40 align-middle">
								<td class="p-2 sm:p-3">{u.name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>

<script lang="ts">
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
	const displayName =
		data.user?.firstName || data.user?.name || data.user?.username || data.user?.id
	const competitionFinished = $derived(Boolean(data?.competitionFinished ?? false))
</script>
