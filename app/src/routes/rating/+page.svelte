<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoundState } from '$lib/pocketbase-types';

  type Participant = { id: string; name: string; firstName?: string; artistName?: string; eliminated?: boolean; sangThisRound?: boolean };
  type Rating = { rating: number; comment: string; saving?: boolean; saved?: boolean; error?: string };

  // activeRound controls progressbar state from global competition state
  let activeRound = 1;
  let currentRound = 1;
  let participants: Participant[] = [];
  let ratings: Record<string, Rating> = {};
  let loading = false;
  let loadError: string | null = null;
  let selected: Participant | null = null;
  let roundState: RoundState = 'result_locked';
  let activeParticipantId: string | null = null;
  let activeParticipant: Participant | null = null;
  let canRate = false;
  let competitionFinished = false;
  type Winner = { id: string; name: string | null; artistName?: string; avg?: number; sum?: number; count?: number } | null;
  let winner: Winner = null;
  $: canRate = roundState === 'rating_phase' || roundState === 'break';
  $: activeParticipant = participants.find((p) => p.id === activeParticipantId) ?? null;
  let showActions = false;
  $: showActions = canRate && roundState !== 'rating_phase';
  $: if (activeParticipant && !ratings[activeParticipant.id]) {
    ratings[activeParticipant.id] = { rating: 0, comment: '' };
  }

  async function fetchRound(round: number) {
    loading = true;
    loadError = null;
    try {
      const res = await fetch(`/rating/api?round=${round}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        loadError = data?.error ?? 'Fehler beim Laden';
        return;
      }
      const data = await res.json();
      participants = Array.isArray(data?.participants) ? data.participants : [];
      // prime rating map with existing values
      ratings = {};
      for (const p of participants) {
        ratings[p.id] = { rating: 0, comment: '' };
      }
      type ServerRating = { ratedUser?: string; target?: string; rating?: number | string; stars?: number | string; comment?: string };
      const existing = Array.isArray(data?.ratings) ? (data.ratings as ServerRating[]) : [];
      for (const r of existing) {
        const id = r.ratedUser ?? r.target; // backward-compat
        if (id) {
          const raw = r.rating ?? r.stars;
          const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : 0;
          if (ratings[id]) {
            ratings[id].rating = value;
            ratings[id].comment = String(r.comment ?? '');
          }
        }
      }
    } catch {
      loadError = 'Netzwerkfehler beim Laden.';
    } finally {
      loading = false;
    }
  }

  async function fetchCompetitionState() {
    try {
      const res = await fetch('/rating/state');
      if (!res.ok) return;
      const data = await res.json();
      const r = Number(data?.round) || 1;
      activeRound = Math.min(Math.max(r, 1), 5);
      currentRound = activeRound;
      competitionFinished = Boolean(data?.competitionFinished ?? false);
      winner = data?.winner ?? null;
      const rs = data?.roundState as RoundState | undefined;
      if (
        rs === 'singing_phase' ||
        rs === 'rating_phase' ||
        rs === 'result_phase' ||
        rs === 'result_locked' ||
        rs === 'break'
      ) {
        roundState = rs;
      }
      const ap = data?.activeParticipant;
      activeParticipantId = typeof ap === 'string' && ap ? ap : null;
    } catch {
      // ignore; keep defaults
    }
  }

  onMount(async () => {
    await fetchCompetitionState();
    if (!competitionFinished) {
      await fetchRound(currentRound);
    }
  });

  function setRound(r: number) {
    if (r < 1 || r > 5 || r === currentRound) return;
    if (r > activeRound) return; // future rounds disabled
    currentRound = r;
    fetchRound(currentRound);
  }

  function setRating(userId: string, value: number) {
    if (!ratings[userId]) ratings[userId] = { rating: 0, comment: '' };
    ratings[userId].rating = value;
  }

  async function save(ratedUserId: string) {
    const entry = ratings[ratedUserId];
    if (!entry) return;
    entry.error = undefined;
    entry.saved = false;
    if (!canRate) {
      entry.error = 'Bewertungen sind derzeit geschlossen.';
      return;
    }
    if (entry.rating < 1 || entry.rating > 5) {
      entry.error = 'Bitte 1-5 Sterne wählen.';
      return;
    }
    try {
      entry.saving = true;
      const payload = { round: currentRound, ratedUser: ratedUserId, rating: entry.rating, comment: (entry.comment ?? '').slice(0, 100) };
      const res = await fetch('/rating/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data?.error ?? '';
        entry.error = code === 'self_rating_not_allowed'
          ? 'Selbstbewertung ist nicht erlaubt.'
          : code === 'invalid_rating'
          ? 'Bitte 1-5 Sterne wählen.'
          : code === 'rating_closed'
          ? 'Bewertungen sind derzeit geschlossen.'
          : 'Konnte nicht speichern.';
        return;
      }
      entry.saved = true;
      setTimeout(() => (entry.saved = false), 1500);
    } catch {
      entry.error = 'Netzwerkfehler beim Speichern.';
    } finally {
      entry.saving = false;
    }
  }

  function openOverlay(p: Participant) {
    if (!canRate) return;
    selected = p;
  }

  function closeOverlay() {
    selected = null;
  }

  function saveSelected() {
    if (selected) {
      save(selected.id);
    }
  }

  function saveActive() {
    if (activeParticipantId) {
      save(activeParticipantId);
    }
  }
</script>

<section class="space-y-5">
  <h1 class="font-display text-2xl sm:text-3xl tracking-tight">Bewertung</h1>

  <!-- Progress with 5 rounds: past = yellow, current = green, future = black (disabled) -->
  <div class="panel panel-accent p-3 sm:p-4">
    <div class="progress">
      {#each [1,2,3,4,5] as r}
        <button
          type="button"
          class={`progress-btn ${r < activeRound ? 'is-past' : r === activeRound ? 'is-current' : 'is-future'} ${currentRound === r ? 'is-selected' : ''}`}
          on:click={() => setRound(r)}
          disabled={r > activeRound}
          aria-current={r === activeRound}
          aria-disabled={r > activeRound}
          aria-label={`Runde ${r}`}
        >
          {r}
        </button>
        {#if r < 5}
          <span class={`progress-conn ${r < activeRound ? 'is-on' : ''}`} aria-hidden="true"></span>
        {/if}
      {/each}
    </div>
  </div>

  {#if competitionFinished}
    <div class="panel panel-brand p-0 overflow-hidden">
      <div class="px-4 sm:px-6 py-3 border-b border-[#333]/60">
        <div class="font-semibold">Wettbewerb beendet</div>
      </div>
      <div class="p-3 sm:p-4">
        {#if winner}
          <div class="text-lg font-semibold">Sieger: {winner.name}</div>
          {#if winner.avg !== undefined}
            <div class="text-sm text-white/80">Ø Bewertung: {winner.avg.toFixed(2)}{#if winner.count} (Stimmen: {winner.count}){/if}</div>
          {/if}
        {:else}
          <div class="text-sm text-white/80">Der Sieger wird geladen…</div>
        {/if}
      </div>
    </div>
  {:else}
  <div class="panel panel-brand p-0 overflow-hidden">
    <div class="px-4 sm:px-6 py-3 border-b border-[#333]/60 flex items-center justify-between">
      <div class="font-semibold">Runde {currentRound}</div>
      {#if loading}
        <div class="text-xs text-white/80">Laden…</div>
      {/if}
      {#if loadError}
        <div class="text-xs text-rose-200">{loadError}</div>
      {/if}
    </div>

    <div class="p-2 sm:p-4">
      {#if roundState === 'singing_phase'}
        <p class="text-sm text-white/80 px-2 py-3">Enjoy the show!</p>
      {:else if roundState === 'rating_phase'}
        {#if activeParticipant}
          <div class="space-y-3">
            <div>
              <div class="text-sm text-white/60">Runde {currentRound}</div>
              <div class="text-lg font-semibold">{activeParticipant.firstName || activeParticipant.name}</div>
              {#if activeParticipant.artistName}
                <div class="text-xs text-white/70">a.k.a. {activeParticipant.artistName}</div>
              {/if}
            </div>
            <div>
              <div class="mb-1 text-sm text-white/80">Sterne</div>
              <div class="stars" aria-label="Sterne vergeben">
                {#each [1,2,3,4,5] as s}
                  <button
                    type="button"
                    class={`star ${ratings[activeParticipant.id]?.rating >= s ? 'on' : ''}`}
                    on:click={() => setRating(activeParticipant.id, s)}
                    aria-label={`${s} Stern${s>1?'e':''}`}
                  >★</button>
                {/each}
              </div>
              {#if ratings[activeParticipant.id]?.error}
                <div class="text-xs text-rose-200 mt-1">{ratings[activeParticipant.id].error}</div>
              {/if}
            </div>
            <div>
              <div class="mb-1 text-sm text-white/80">Kommentar (optional)</div>
              <input
                class="input w-full"
                type="text"
                bind:value={ratings[activeParticipant.id].comment}
                maxlength="100"
                placeholder="(max. 100 Zeichen)"
              />
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-brand" disabled={ratings[activeParticipant.id]?.saving} on:click={saveActive}>
                {ratings[activeParticipant.id]?.saving ? 'Speichern…' : 'Speichern'}
              </button>
              {#if ratings[activeParticipant.id]?.saved}
                <span class="text-xs">Gespeichert!</span>
              {/if}
            </div>
          </div>
        {:else}
          <p class="text-sm text-white/80 px-2 py-3">Aktiver Teilnehmer ist nicht gesetzt.</p>
        {/if}
      {:else if participants.length === 0}
        <p class="text-sm text-white/80 px-2 py-3">Keine Nutzer gefunden.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-white/90">
                <th class="p-2 sm:p-3">Teilnehmer</th>
                <th class="p-2 sm:p-3">Bewertung</th>
                {#if showActions}
                  <th class="p-2 sm:p-3">Aktion</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each participants as p}
                <tr class="align-middle border-t border-[#333]/40 hover:bg-white/5">
                  <td class="p-2 sm:p-3">
                    <div class="font-medium">{p.firstName || p.name}</div>
                    {#if p.artistName}
                      <div class="text-xs text-white/70">a.k.a. {p.artistName}</div>
                    {/if}
                  </td>
                  <td class="p-2 sm:p-3">
                    <div class="stars" aria-label="Aktuelle Bewertung">
                      {#each [1,2,3,4,5] as s}
                        <span class={`star ${ratings[p.id]?.rating >= s ? 'on' : ''}`}>★</span>
                      {/each}
                    </div>
                  </td>
                  {#if showActions}
                    <td class="p-2 sm:p-3">
                      <button
                        type="button"
                        class="btn-ghost"
                        on:click={() => openOverlay(p)}
                        aria-label={`Bewerten: ${p.name}`}
                        disabled={!canRate}
                        aria-disabled={!canRate}
                      >
                        Bewerten
                      </button>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
  {/if}

  {#if selected}
    <div class="overlay">
      <div
        class="overlay-backdrop"
        role="button"
        tabindex="0"
        aria-label="Overlay schließen"
        on:click={closeOverlay}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeOverlay()}
      ></div>
      <div
        class="overlay-card"
        role="dialog"
        aria-modal="true"
        aria-label="Bewertung"
        tabindex="-1"
        on:keydown={(e) => e.key === 'Escape' && closeOverlay()}
      >
        <div class="overlay-head">
          <div>
            <div class="text-sm text-white/60">Runde {currentRound}</div>
            <div class="text-lg font-semibold">{selected.firstName || selected.name}</div>
            {#if selected.artistName}
              <div class="text-xs text-white/70">a.k.a. {selected.artistName}</div>
            {/if}
          </div>
          <button class="btn-ghost" on:click={closeOverlay} aria-label="Schließen">✕</button>
        </div>
        <div class="overlay-body">
          <div class="mb-4">
            <div class="mb-1 text-sm text-white/80">Sterne</div>
            <div class="stars" aria-label="Sterne vergeben">
              {#each [1,2,3,4,5] as s}
                <button
                  type="button"
                  class={`star ${ratings[selected.id]?.rating >= s ? 'on' : ''}`}
                  disabled={!canRate}
                  on:click={() => canRate && selected && setRating(selected.id, s)}
                  aria-label={`${s} Stern${s>1?'e':''}`}
                >★</button>
              {/each}
            </div>
            {#if ratings[selected.id]?.error}
              <div class="text-xs text-rose-200 mt-1">{ratings[selected.id].error}</div>
            {/if}
          </div>
          <div>
            <div class="mb-1 text-sm text-white/80">Kommentar (optional)</div>
            <input
              class="input w-full"
              type="text"
              bind:value={ratings[selected.id].comment}
              maxlength="100"
              placeholder="(max. 100 Zeichen)"
            />
          </div>
        </div>
        <div class="overlay-foot">
          <button class="btn-ghost" on:click={closeOverlay}>Abbrechen</button>
          <button class="btn-brand" disabled={!canRate || ratings[selected.id]?.saving} on:click={saveSelected}>
            {ratings[selected.id]?.saving ? 'Speichern…' : 'Speichern'}
          </button>
          {#if !canRate}
            <span class="ml-2 text-xs text-white/80">Bewertungen sind derzeit geschlossen.</span>
          {/if}
          {#if ratings[selected.id]?.saved}
            <span class="ml-2 text-xs">Gespeichert!</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .progress { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .progress-btn {
    width: 2.25rem;
    height: 2.25rem;
    border: 2px solid #333;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    transition: transform 0.05s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .progress-btn.is-past {
    color: var(--color-ink);
    background: var(--color-gold-500);
    box-shadow: 3px 3px 0 var(--shadow-gold);
  }
  .progress-btn.is-past:hover { box-shadow: 4px 4px 0 var(--shadow-gold); filter: brightness(1.04); }
  .progress-btn.is-current {
    color: #0b1e0f;
    background: #16a34a; /* green-600 */
    box-shadow: 4px 4px 0 rgba(7, 42, 18, 0.55);
  }
  .progress-btn.is-future {
    color: #fff;
    background: #000;
    box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
    opacity: 0.95;
  }
  .progress-btn.is-future[disabled] { cursor: not-allowed; filter: grayscale(0.1); }
  .progress-btn:active { transform: translateY(2px); }
  .progress-btn.is-selected { outline: 2px solid rgba(255,255,255,0.3); outline-offset: 2px; }

  .progress-conn {
    flex: 1 1 0%;
    height: 6px;
    border: 2px solid #333;
    border-left-width: 0;
    border-right-width: 0;
    border-radius: 4px;
    background: #000; /* default off */
    box-shadow: 2px 2px 0 rgba(0,0,0,0.5) inset;
  }
  .progress-conn.is-on { background: var(--color-gold-500); box-shadow: 2px 2px 0 var(--shadow-gold) inset; }

  

  .stars { display: inline-flex; gap: 6px; }
  .star {
    font-size: 1.25rem;
    line-height: 1;
    color: rgba(255,255,255,0.5);
    transition: transform 0.05s ease, filter 0.15s ease;
    border: none;
    background: transparent;
    padding: 2px;
  }
  .star.on { color: var(--color-gold-500); filter: drop-shadow(2px 2px 0 var(--shadow-gold)); }
  .star:hover { transform: translateY(1px); }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
  }
  .overlay-backdrop {
    position: absolute;
    inset: 0;
    background: var(--color-accent-900); /* lila wie Progress-Bar */
    opacity: 0.82;
    backdrop-filter: blur(2px);
  }
  .overlay-card {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(640px, 94vw);
    background: var(--color-accent-900);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    box-shadow: 10px 10px 0 rgba(0,0,0,0.5);
    outline: none;
  }
  .overlay-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .overlay-body { padding: 16px; }
  .overlay-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .btn-ghost {
    background: transparent;
    color: white;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 8px;
    padding: 6px 10px;
  }
</style>
