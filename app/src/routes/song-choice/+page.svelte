<script lang="ts">
  import { onMount } from 'svelte';

  type Song = { artist: string; songTitle: string; appleMusicSongId?: string };

  let songs: Song[] = Array.from({ length: 5 }, () => ({ artist: '', songTitle: '' }));
  let openStates: boolean[] = [false, false, false, false, false];
  let savedStates: boolean[] = [false, false, false, false, false];
  let errors: (string | null)[] = [null, null, null, null, null];

  const STORAGE_KEY = 'song-choice.songs.v1';

  onMount(async () => {
    // Load existing choices from server (guard ensures auth)
    try {
      const res = await fetch('/song-choice/api');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.songs) && data.songs.length === 5) {
          songs = data.songs.map((s: any) => ({
            artist: s?.artist ?? '',
            songTitle: s?.songTitle ?? s?.song_title ?? '',
            appleMusicSongId: s?.appleMusicSongId ?? s?.apple_music_song_id ?? undefined
          }));
        }
      }
    } catch {}
  });

  function toggle(i: number) {
    openStates[i] = !openStates[i];
  }

  async function save(i: number) {
    errors[i] = null;
    // Client-side required validation
    if (!songs[i].artist.trim() || !songs[i].songTitle.trim()) {
      errors[i] = 'Bitte Interpret und Titel ausfüllen.';
      return;
    }
    // Try saving to PocketBase; fall back to localStorage
    try {
      const body = {
        round: i + 1,
        artist: songs[i].artist,
        songTitle: songs[i].songTitle
      };
      const res = await fetch('/song-choice/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          // Not logged in → fallback local so der Nutzer nicht alles verliert
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); } catch {}
          errors[i] = 'Nicht eingeloggt. Lokal gespeichert.';
          return;
        }
        const err = data?.error ?? 'Fehler beim Speichern';
        if (err === 'song_not_available') {
          errors[i] = 'Song nicht verfügbar.';
        } else if (err === 'no_lyrics') {
          errors[i] = 'Keine Lyrics verfügbar.';
        } else if (err === 'invalid_fields') {
          errors[i] = 'Bitte Interpret und Titel ausfüllen.';
        } else if (err === 'apple_token_missing') {
          errors[i] = 'Server-Konfiguration fehlt (Apple Music Token).';
        } else {
          errors[i] = 'Konnte nicht speichern.';
        }
        return;
      }
      // ok
      savedStates[i] = true;
      setTimeout(() => (savedStates[i] = false), 1500);
      // Refresh from server to receive appleMusicSongId
      try {
        const ref = await fetch('/song-choice/api');
        if (ref.ok) {
          const data = await ref.json();
          if (Array.isArray(data?.songs) && data.songs.length === 5) {
            songs = data.songs.map((s: any) => ({
              artist: s?.artist ?? '',
              songTitle: s?.songTitle ?? s?.song_title ?? '',
              appleMusicSongId: s?.appleMusicSongId ?? s?.apple_music_song_id ?? undefined
            }));
          }
        }
      } catch {}
      return;
    } catch (e) {
      errors[i] = 'Netzwerkfehler beim Speichern.';
    }
  }

  function openApple(i: number) {
    const id = songs[i]?.appleMusicSongId?.trim();
    if (!id) return;
    const storefront = 'de';
    const url = `https://music.apple.com/${storefront}/song/${id}`;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      location.href = url;
    }
  }
</script>

<h1 class="font-display text-2xl sm:text-3xl tracking-tight mb-4">Songauswahl</h1>

<p class="mb-4 text-white/80">Trage bis zu 5 Songs ein — je Runde einen (Interpret und Titel). Jeder Eintrag lässt sich auf- und zuklappen.</p>

<div class="space-y-4">
  {#each songs as song, i}
    <section class={`panel ${i % 2 === 0 ? 'panel-accent' : 'panel-brand'} p-0 overflow-hidden`}>
      <div class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#333]/60">
        <div class="font-semibold">Runde {i + 1}</div>
        <button
          type="button"
          class="btn arrow-btn"
          aria-expanded={openStates[i]}
          aria-controls={`panel-${i}`}
          on:click={() => toggle(i)}
          title={openStates[i] ? 'Zuklappen' : 'Öffnen'}
        >
          {openStates[i] ? '▼' : '▶'}
        </button>
      </div>

      <div id={`panel-${i}`} class:hidden={!openStates[i]}>
        <div class="p-4 sm:p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1 text-white/90" for={`artist-${i}`}>Interpret</label>
              <input id={`artist-${i}`} class="input" type="text" bind:value={songs[i].artist} placeholder="z. B. Queen" />
            </div>
            <div>
              <label class="block text-sm mb-1 text-white/90" for={`songTitle-${i}`}>Titel</label>
              <input id={`songTitle-${i}`} class="input" type="text" bind:value={songs[i].songTitle} placeholder="z. B. Bohemian Rhapsody" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button type="button" class="btn-brand" on:click={() => save(i)}>Speichern</button>
            {#if songs[i]?.appleMusicSongId}
              <button
                type="button"
                class="btn-apple"
                data-tooltip="Schaue nach ob du den richtigen Song verlinkt hast."
                on:click={() => openApple(i)}
                aria-label="Bei Apple Music öffnen"
              >
                <span class="apple-mark" aria-hidden="true"></span>
                <span>Music</span>
              </button>
            {/if}
            {#if savedStates[i]}
              <span class="text-xs text-white/90">Gespeichert!</span>
            {/if}
            {#if errors[i]}
              <span class="text-xs text-rose-200">{errors[i]}</span>
            {/if}
          </div>
        </div>
      </div>
    </section>
  {/each}
</div>

<style>
  /* Small comic arrow button */
  .arrow-btn {
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    line-height: 1;
    font-weight: 800;
  }

  /* Apple Music button (solid pink, no gradients) */
  .btn-apple {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    font-weight: 700;
    border: 2px solid #333;
    border-radius: 12px 10px 14px 10px/10px 14px 10px 12px;
    color: #fff;
    background: #ff2d55; /* Apple Music pink */
    box-shadow: 4px 4px 0 rgba(255, 45, 85, 0.35);
    transition: transform 0.05s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .btn-apple:hover { box-shadow: 5px 5px 0 rgba(255, 45, 85, 0.45); filter: brightness(1.04); }
  .btn-apple:active { transform: translateY(2px); }
  .btn-apple .apple-mark { font-size: 1rem; line-height: 1; margin-right: 2px; }
</style>
