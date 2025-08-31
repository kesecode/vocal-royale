# Vocal Royale

[![CI](https://github.com/davidweppler/vocal-royale/actions/workflows/test.yml/badge.svg)](https://github.com/davidweppler/vocal-royale/actions/workflows/test.yml)
[![Build](https://github.com/davidweppler/vocal-royale/actions/workflows/build.yml/badge.svg)](https://github.com/davidweppler/vocal-royale/actions/workflows/build.yml)

Quick guide to start the app locally with Docker Compose – including Apple Music key, environment variables, URLs, and default login.

## Quick Start (docker compose)
- Prerequisites: Docker Desktop (or Docker + Compose).
- Ports: Frontend `http://localhost:3000`, Backend (PocketBase) `http://localhost:8080`.

1) Place Apple Music Key
- Place your private key `.p8` outside version control at `./.secrets/AppleMusicAuthKey.p8` (create folder if needed).
- Alternative: any path and set via `APPLE_MUSIC_KEY_FILE` (see below).

2) Set environment variables in compose file
- Required:
  - `APPLE_MUSIC_KEY_ID`: your Apple Music Key ID
  - `APPLE_TEAM_ID`: your Apple Team ID
- Optional (only if different):
  - `ORIGIN`: public URL of frontend (Default: `http://localhost:3000`)
  - `NODE_ENV`: node environment (Default: `production`)
  - `APPLE_MUSIC_STOREFRONT`: Apple-Music region (Default: `de`)


```
services:
  backend:
    image: kesecode/vocal-royale-backend:latest
    container_name: vocal-royale-backend
    ports:
      - "8080:8080"
    volumes:
      - pb_data:/pb/pb_data
    restart: unless-stopped

  app:
    image: kesecode/vocal-royale-app:latest
    container_name: vocal-royale-app
    environment:
      PB_URL: http://backend:8080
      NODE_ENV: production
      ORIGIN: ORIGIN:-http://localhost:3000
      APPLE_MUSIC_KEY_ID: ABC123XYZ9
      APPLE_TEAM_ID: 9XYZ123ABC
      APPLE_MUSIC_KEY_PATH: /run/secrets/AppleMusicAuthKey.p8:ro
      APPLE_MUSIC_STOREFRONT: de
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./.secrets/AppleMusicAuthKey.p8:/run/secrets/AppleMusicAuthKey.p8:ro
    restart: unless-stopped

volumes:
  pb_data:
```

3) Start
```
docker compose up -d --build
```

4) Access
- Frontend: `http://localhost:3000`
- Backend Admin (PocketBase UI): `http://localhost:8080/_/`

## Default Credentials
- PocketBase Admin: `admin@karaoke.championship` / `admin12345`
- App Admin (created automatically on startup): `admin@karaoke.championship` / `admin12345`

Change these credentials for real deployments.

## Notes on Configuration and Deployment
- The compose file (`compose.yaml`) builds local images. For ready images use `compose.deploy.yaml` and set `DOCKERHUB_USERNAME` accordingly.
- The app reads the backend URL via `PB_URL` (already set to `http://backend:8080` in compose).
- The Apple key is expected in the container at `/run/secrets/AppleMusicAuthKey.p8` (volume mount from `APPLE_MUSIC_KEY_FILE`).


