# Vocal Royale

[![CI](https://github.com/kesecode/vocal-royale/actions/workflows/ci.yml/badge.svg)](https://github.com/kesecode/vocal-royale/actions/workflows/ci.yml)
[![Build](https://github.com/kesecode/vocal-royale/actions/workflows/build.yml/badge.svg)](https://github.com/kesecode/vocal-royale/actions/workflows/build.yml)

Quick guide to start the app locally with Docker Compose – including Apple Music key, environment variables, URLs, and default login.

## Quick Start (docker compose)
- Prerequisites: Docker Desktop (or Docker + Compose).
- Ports: Frontend `http://localhost:3000`, Backend (PocketBase) `http://localhost:8080`.

1) Apple Music Key
- Provide the private key via the `APPLE_MUSIC_PRIVATE_KEY` environment variable in `compose.env`.
- Use a single line with literal \n newlines, e.g. `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`.

2) Set environment variables in compose.env file

```
# Copy this file to `compose.env` and adjust values.

# Ports (host mappings; reference from compose.yaml if needed)
APP_PORT=3000
BACKEND_PORT=8090

# Initial app admin credentials
ADMIN_EMAIL=admin@vocal.royale
ADMIN_PASSWORD=ChangeMeNow!

# DB credentials
PB_ADMIN_EMAIL=admin_db@vocal.royale
PB_ADMIN_PASSWORD=vocal_royale_2025

# Frontend public URL (set to your deployed domain in prod)
ORIGIN=http://localhost:${APP_PORT}

# Frontend runtime
NODE_ENV=production

# Service-to-service URL inside the compose network
PB_URL=http://backend:${BACKEND_PORT}

# Log settings
LOG_LEVEL=info
LOG_FORMAT=pretty
LOG_COLOR=true

# Session / auth
# Max cookie age in seconds (default 48h)
SESSION_MAX_AGE=172800

# Apple Music API configuration
SONG_CHOICE_VALIDATE=true
APPLE_MUSIC_KEY_ID=
APPLE_TEAM_ID=
APPLE_MUSIC_STOREFRONT=de
APPLE_MUSIC_TOKEN_TTL_DAYS=7

# Add key directly as a single-line env var with literal \n for newlines.
# Mandatory if SONG_CHOICE_VALIDATE is set to true
# APPLE_MUSIC_PRIVATE_KEY=

# Game options
PARTICIPANTS_TO_ELIMINATE=1,0,0,0
```


```
services:
  backend:
    image: kesecode/vocal-royale-backend:latest
    container_name: vocal-royale-backend
    env_file:
      - compose.env
    ports:
      - "${BACKEND_PORT:-8090}:8090"
    volumes:
      - pb_data:/pb/pb_data
    # IMPORTANT: $$ = Compose-Escape → Shell im Container sieht $VAR (aus env_file)
    command:
      - sh
      - -lc
      - |
          /pb/pocketbase --dir /pb/pb_data superuser upsert "$${PB_ADMIN_EMAIL}" "$${PB_ADMIN_PASSWORD}"
          exec /pb/pocketbase serve --http 0.0.0.0:$${BACKEND_PORT:-8090}
    restart: unless-stopped

  app:
    image: kesecode/vocal-royale-app:latest
    container_name: vocal-royale-app
    depends_on:
      - backend
    env_file:
      - compose.env
    ports:
      - "${APP_PORT:-3000}:3000"
    restart: unless-stopped

volumes:
  pb_data:
```

3) Start
```
docker compose up
```

4) Access
- Frontend: `http://localhost:3000`
- Backend Admin (PocketBase UI): `http://localhost:8080/_/`

## Default Credentials
- PocketBase Admin: `admin_db@vocal.royale` / `vocal_royale_2025`
- App Admin (created automatically on startup): `admin@vocal.royale` / `ChangeMeNow!`

Change these credentials for real deployments.

## Notes on Configuration and Deployment
- The compose file (`compose.yaml`) builds local images. For ready images use `compose.deploy.yaml` and set `DOCKERHUB_USERNAME` accordingly.
- The app reads the backend URL via `PB_URL` (already set to `http://backend:8080` in compose).
- Session cookies are limited by `SESSION_MAX_AGE` (default 48h). The server also validates
  the auth token on each request and clears it if invalid (e.g. after DB reset).
- Apple validation uses `APPLE_MUSIC_PRIVATE_KEY`. If unset, song validation is skipped gracefully even when `SONG_CHOICE_VALIDATE` is `true`.
