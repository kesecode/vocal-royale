<script lang="ts">
  import { onMount } from 'svelte';

  type Participant = { id: string; name: string; firstName?: string; artistName?: string };
  type Rating = { rating: number; comment: string; saving?: boolean; saved?: boolean; error?: string };

  let currentRound = 1;
  let participants: Participant[] = [];
  let ratings: Record<string, Rating> = {};
  let loading = false;
  let loadError: string | null = null;
  let selected: Participant | null = null;

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
      const existing = Array.isArray(data?.ratings) ? data.ratings : [];
      for (const r of existing) {
        const id = r.ratedUser ?? r.target; // backward-compat
        const value = Number((r as any).rating ?? (r as any).stars) || 0;
        if (ratings[id]) {
          ratings[id].rating = value;
          ratings[id].comment = String(r.comment ?? '');
        }
      }
    } catch (e) {
      loadError = 'Netzwerkfehler beim Laden.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchRound(currentRound);
  });

  function setRound(r: number) {
    if (r < 1 || r > 5 || r === currentRound) return;
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
          : 'Konnte nicht speichern.';
        return;
      }
      entry.saved = true;
      setTimeout(() => (entry.saved = false), 1500);
    } catch (e) {
      entry.error = 'Netzwerkfehler beim Speichern.';
    } finally {
      entry.saving = false;
    }
  }

  function openOverlay(p: Participant) {
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
</script>

<section class="space-y-5">
  <h1 class="font-display text-2xl sm:text-3xl tracking-tight">Bewertung</h1>

  <!-- Progress with 5 rounds -->
  <div class="panel panel-accent p-3 sm:p-4">
    <div class="flex items-center justify-between gap-2">
      {#each Array.from({ length: 5 }) as _, i}
        <button
          type="button"
          class={`progress-dot ${currentRound === i + 1 ? 'is-active' : ''}`}
          on:click={() => setRound(i + 1)}
          aria-current={currentRound === i + 1}
          aria-label={`Runde ${i + 1}`}
        >{i + 1}</button>
      {/each}
    </div>
  </div>

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
      {#if participants.length === 0}
        <p class="text-sm text-white/80 px-2 py-3">Keine Nutzer gefunden.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-white/90">
                <th class="p-2 sm:p-3">Teilnehmer</th>
                <th class="p-2 sm:p-3">Bewertung</th>
                <th class="p-2 sm:p-3">Aktion</th>
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
                  <td class="p-2 sm:p-3">
                    <button type="button" class="btn-ghost" on:click={() => openOverlay(p)} aria-label={`Bewerten: ${p.name}`}>
                      Bewerten
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

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
                  on:click={() => selected && setRating(selected.id, s)}
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
          <button class="btn-brand" disabled={ratings[selected.id]?.saving} on:click={saveSelected}>
            {ratings[selected.id]?.saving ? 'Speichern…' : 'Speichern'}
          </button>
          {#if ratings[selected.id]?.saved}
            <span class="ml-2 text-xs">Gespeichert!</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .progress-dot {
    width: 2.25rem;
    height: 2.25rem;
    border: 2px solid #333;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: var(--color-ink);
    background: var(--color-gold-500);
    box-shadow: 3px 3px 0 var(--shadow-gold);
    transition: transform 0.05s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .progress-dot:hover { box-shadow: 4px 4px 0 var(--shadow-gold); filter: brightness(1.04); }
  .progress-dot:active { transform: translateY(2px); }
  .progress-dot.is-active { background: var(--color-gold-600); box-shadow: 5px 5px 0 var(--shadow-gold); }

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
