# AGENTS.md

Dieses Dokument richtet sich an Coding-Agents (z. B. Codex) für die Arbeit an diesem Repository. Die Leitlinien spiegeln CLAUDE.md wider und ergänzen sie um verbindliche Schritte für Code-Änderungen.

---

## 🗣️ Arbeits- und Kommunikationsregeln
- Antworte auf Deutsch und bestätige Verständnis bei unklaren Anforderungen.
- Stelle Rückfragen, bevor du komplexe Features implementierst.
- Respektiere bestehende Patterns, Tailwind-Design und Svelte 5 (Runes).

---

## ⚙️ Technologie-Stack (Kurzfassung)
- Frontend: SvelteKit 2.22+, Svelte 5 (Runes), Tailwind CSS 4, Vite.
- Backend: PocketBase (Docker), SQLite, Realtime Subscriptions.
- Tooling: ESLint + Prettier, Vitest, TypeScript (strict), Husky + lint-staged.

---

## ✅ Code Quality Workflow (verbindlich)
**Nach JEDER Code-Änderung** sind folgende Kommandos in dieser Reihenfolge auszuführen und müssen alle erfolgreich sein:

```bash
cd app
npm run fmt      # 1. Code mit Prettier formatieren
npm run lint     # 2. Linting und Code-Style prüfen
npx svelte-check # 3. TypeScript Type-Checking
npm test         # 4. Alle Tests ausführen
```

### Quality-Anforderungen
| Gate | Anforderung | Status |
|------|-------------|--------|
| **🎨 Formatting** | Prettier ohne Formatierungs-Verletzungen | ✅ Muss passen |
| **📏 Linting** | ESLint ohne Errors/Warnings | ✅ Exit Code 0 |
| **🔍 Type Checking** | Svelte-Check ohne TypeScript Errors | ✅ 0 Errors |
| **🧪 Testing** | Alle Tests bestanden | ✅ 0 Failed Tests |

### Entwicklungs- und Fix-Cycle
1. 🏗️ Feature implementieren.
2. 🧪 Tests schreiben (Unit: `app/tests/unit/`, Integration: `app/tests/integration/`).
3. ✅ Quality Cycle oben vollständig durchlaufen.
4. 🔧 Falls ein Kommando fehlschlägt: Issues beheben und **alle vier** Schritte erneut ausführen.
5. 🚫 Keine Ausnahmen: Jede Code-Änderung benötigt Tests und den vollständigen Quality Cycle.
6. ZERO WARNING STRATEGY - auch Warnings müssen behoben werden

**Nur wenn alle vier Kommandos erfolgreich waren, gelten Änderungen als vollständig.**

---

## 🔑 Architektur-Kurznotizen
- Rollenbasiert (`participant`, `spectator`, `juror`, `admin`); Guards in `app/src/hooks.server.ts`.
- Wichtige Pfade: `app/src/lib/pocketbase-types.ts`, `app/src/routes/+layout.server.ts`, `app/src/lib/server/bootstrap.ts`.
- Design: Comic-artig, verspielt, mobile-first; Tailwind nutzen, an bestehende Farbwelt halten.

---

## 🚀 Nützliche Kommandos
- Setup/Dev: `cd app && npm ci`, `npm run dev` (Standard) oder `npm run dv` (Port 5173).
- Build/Preview: `npm run build`, `npm run preview`.
- Full Stack: `docker compose up` (Frontend: http://localhost:3000, Backend Admin: http://localhost:8090/_/).
