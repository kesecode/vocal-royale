<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoundState } from '$lib/pocketbase-types';

  type AdminState = {
    competitionStarted: boolean;
    roundState: RoundState;
    round: number;
    competitionFinished: boolean;
    activeParticipant: string | null;
  };
  type ActiveInfo = { id: string; name: string | null; artistName?: string; sangThisRound?: boolean } | null;

  let state: AdminState = { competitionStarted: false, roundState: 'result_locked', round: 1, competitionFinished: false, activeParticipant: null };
  let active: ActiveInfo = null;
  let loading = false;
  let errorMsg: string | null = null;
  let infoMsg: string | null = null;
  type ResultRow = { id: string; name: string | null; artistName?: string; avg: number; sum: number; count: number; eliminated: boolean };
  let results: ResultRow[] | null = null;
  let winner: ResultRow | null = null;

  async function refresh() {
    loading = true;
    errorMsg = null;
    try {
      const res = await fetch('/admin/api');
      if (!res.ok) throw new Error('Laden fehlgeschlagen');
      const data = await res.json();
      state = data?.state ?? state;
      active = data?.activeParticipant ?? null;
    } catch (e) {
      errorMsg = 'Fehler beim Laden.';
    } finally {
      loading = false;
    }
  }

  async function doAction(action: 'start_competition' | 'activate_rating_phase' | 'next_participant' | 'finalize_ratings' | 'reset_game') {
    errorMsg = null;
    infoMsg = null;
    try {
      const res = await fetch('/admin/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = String(data?.error || '');
        if (code === 'missing_ratings') {
          const missing = Number(data?.missingCount ?? 0);
          const expected = Number(data?.expectedCount ?? 0);
          errorMsg = `Es fehlen noch Bewertungen (${missing}/${expected}).`;
        } else if (code === 'no_active_participant') {
          errorMsg = 'Kein aktiver Teilnehmer gesetzt.';
        } else {
          errorMsg = 'Aktion fehlgeschlagen.';
        }
        return;
      }
      const data = await res.json();
      if (data?.state) state = data.state;
      if ('activeParticipant' in data) active = data.activeParticipant;
      // Reset visible results when leaving results phase
      if (state.roundState !== 'result_phase') {
        results = null;
        winner = null;
      }
      if (action === 'start_competition') infoMsg = 'Wettbewerb gestartet.';
      if (action === 'activate_rating_phase') infoMsg = 'Bewertungsphase aktiviert.';
      if (action === 'next_participant') infoMsg = 'Nächster Teilnehmer gesetzt.';
      if (action === 'finalize_ratings') infoMsg = 'Bewertungen abgeschlossen.';
      if (action === 'reset_game') infoMsg = 'Spiel zurückgesetzt.';
    } catch (e) {
      errorMsg = 'Netzwerkfehler.';
    }
  }

  async function showResults() {
    errorMsg = null;
    infoMsg = null;
    try {
      const res = await fetch('/admin/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'show_results' })
      });
      if (!res.ok) {
        errorMsg = 'Ergebnis anzeigen fehlgeschlagen.';
        return;
      }
      const data = await res.json();
      state = data?.state ?? state;
      results = Array.isArray(data?.results) ? data.results : null;
      winner = data?.winner ?? null;
    } catch {
      errorMsg = 'Netzwerkfehler.';
    }
  }

  async function startNextRound() {
    errorMsg = null;
    infoMsg = null;
    try {
      const res = await fetch('/admin/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start_next_round' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errorMsg = String(data?.error || 'Nächste Runde starten fehlgeschlagen.');
        return;
      }
      const data = await res.json();
      state = data?.state ?? state;
      active = data?.activeParticipant ?? null;
      results = null;
      winner = null;
      infoMsg = 'Nächste Runde gestartet.';
    } catch {
      errorMsg = 'Netzwerkfehler.';
    }
  }

  async function resetGame() {
    errorMsg = null;
    infoMsg = null;
    if (!confirm('Bist du sicher? Das Spiel wird vollständig zurückgesetzt.')) return;
    try {
      const res = await fetch('/admin/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'reset_game' })
      });
      if (!res.ok) {
        errorMsg = 'Zurücksetzen fehlgeschlagen.';
        return;
      }
      const data = await res.json();
      state = data?.state ?? state;
      active = null;
      results = null;
      winner = null;
      infoMsg = 'Spiel zurückgesetzt.';
    } catch {
      errorMsg = 'Netzwerkfehler.';
    }
  }

  onMount(refresh);
</script>

<section class="space-y-5">
  <h1 class="font-display text-2xl sm:text-3xl tracking-tight">Admin</h1>

  <div class="panel panel-brand p-0 overflow-hidden">
    <div class="px-4 sm:px-6 py-3 border-b border-[#333]/60 flex items-center justify-between">
      <div class="font-semibold">Competition Control</div>
      {#if loading}
        <div class="text-xs text-white/80">Laden…</div>
      {/if}
    </div>
    <div class="p-3 sm:p-4 space-y-3">
      {#if errorMsg}
        <div class="text-sm text-rose-200">{errorMsg}</div>
      {/if}
      {#if infoMsg}
        <div class="text-sm text-emerald-200">{infoMsg}</div>
      {/if}

      <div class="text-sm text-white/80">
        <div>Runde: <span class="font-semibold">{state.round}</span></div>
        <div>Phase: <span class="font-semibold">{state.roundState}</span></div>
        <div>Aktiver Teilnehmer: <span class="font-semibold">{active?.name ?? state.activeParticipant ?? '—'}</span></div>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        {#if !state.competitionStarted}
          <button class="btn-brand" on:click={() => doAction('start_competition')}>Starte Wettbewerb</button>
        {/if}

        {#if state.competitionStarted && state.roundState === 'singing_phase' && state.activeParticipant}
          <button class="btn-brand" on:click={() => doAction('activate_rating_phase')}>Aktiviere Bewertungsphase</button>
        {/if}

        {#if state.competitionStarted && state.roundState === 'rating_phase'}
          <button class="btn-brand" on:click={() => doAction('next_participant')}>Nächster Teilnehmer</button>
        {/if}

        {#if state.competitionStarted && state.roundState === 'break'}
          <button class="btn-brand" on:click={() => doAction('finalize_ratings')}>Bewertung abschließen</button>
        {/if}

        {#if state.competitionStarted && state.roundState === 'result_locked'}
          <button class="btn-brand" on:click={showResults}>{state.round === 5 ? 'Sieger anzeigen' : 'Ergebnis anzeigen'}</button>
        {/if}

        {#if state.roundState === 'result_phase' && state.round < 5}
          <button class="btn-brand" on:click={startNextRound}>Nächste Runde starten</button>
        {/if}

        <button class="btn-ghost" on:click={refresh}>Aktualisieren</button>
        <button class="btn-ghost" on:click={resetGame}>Spiel zurücksetzen</button>
      </div>
    </div>
  </div>

  {#if state.roundState === 'result_phase'}
    <div class="panel panel-accent p-0 overflow-hidden">
      <div class="px-4 sm:px-6 py-3 border-b border-[#333]/60 flex items-center justify-between">
        <div class="font-semibold">{state.round === 5 ? 'Finale' : 'Ergebnis'}</div>
      </div>
      <div class="p-3 sm:p-4">
        {#if state.round === 5}
          {#if winner}
            <div class="text-lg font-semibold">Sieger: {winner.name}</div>
            <div class="text-sm text-white/80">Ø Bewertung: {winner.avg.toFixed(2)} (Stimmen: {winner.count})</div>
          {:else}
            <div class="text-sm text-white/80">Ergebnis nicht geladen. Bitte "Sieger anzeigen" klicken.</div>
          {/if}
        {:else}
          {#if results}
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-white/90">
                    <th class="p-2 sm:p-3">Teilnehmer</th>
                    <th class="p-2 sm:p-3">Ø Bewertung</th>
                    <th class="p-2 sm:p-3">Stimmen</th>
                  </tr>
                </thead>
                <tbody>
                  {#each results.slice().sort((a, b) => b.avg - a.avg) as r}
                    <tr class={`align-middle border-t border-[#333]/40 ${r.eliminated ? 'opacity-70 line-through' : ''}`}>
                      <td class="p-2 sm:p-3">
                        <div class="font-medium">{r.name}</div>
                        {#if r.artistName}
                          <div class="text-xs text-white/70">a.k.a. {r.artistName}</div>
                        {/if}
                      </td>
                      <td class="p-2 sm:p-3">{r.avg.toFixed(2)}</td>
                      <td class="p-2 sm:p-3">{r.count}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="text-sm text-white/80">Ergebnis nicht geladen. Bitte "Ergebnis anzeigen" klicken.</div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .btn-brand {
    background: var(--color-brand-600, #9333ea);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 8px;
    color: #fff;
    padding: 6px 12px;
    font-weight: 600;
  }
  .btn-ghost {
    background: transparent;
    color: white;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 8px;
    padding: 6px 10px;
  }
</style>
