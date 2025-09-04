# E2E Testing Guide

## 🎭 Mock Tests (Standard)

Verwende **Route Interception** für schnelle Tests ohne Backend:

```bash
cd app
npx playwright test
```

Diese Tests:

- ✅ Laufen ohne Docker/Backend
- ✅ Sind schnell und stabil
- ✅ Testen UI-Interaktionen
- ❌ Können keine echte Authentifizierung testen

## 🐳 Backend Tests (Mit Docker)

Teste gegen **echtes PocketBase Backend**:

### 1. Docker Backend starten

```bash
# Im Projekt-Root (nicht im app/ Verzeichnis)
docker compose up -d backend
```

### 2. E2E Tests mit Backend ausführen

```bash
cd app
npx playwright test --config=playwright.config.backend.ts
```

Diese Tests:

- ✅ Vollständige Authentifizierung
- ✅ Echte API-Kommunikation
- ✅ Realistische User Journeys
- ❌ Brauchen Docker
- ❌ Langsamere Ausführung

### 3. Backend stoppen (optional)

```bash
docker compose stop backend
```

## 📁 Test-Dateien

- **`basic.spec.ts`** - Grundlegende UI-Tests (Mock)
- **`backend.spec.ts`** - Komplexe Backend-Tests (Docker)

## 🔧 Konfiguration

- **`playwright.config.ts`** - Standard (Mock-Tests)
- **`playwright.config.backend.ts`** - Mit Docker Backend

## 🚀 CI/CD Integration

Für GitHub Actions:

```yaml
- name: Start Backend
  run: docker compose up -d backend

- name: Run E2E Tests
  run: npx playwright test --config=playwright.config.backend.ts
```
