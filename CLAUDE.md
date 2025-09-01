# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

**Frontend (app/)**
- SvelteKit 2.22+ with TypeScript
- Svelte 5 (Runes mode)
- Tailwind CSS 4.0+ for styling
- Vite as build tool
- PocketBase client for API communication

**Backend**
- PocketBase (Go-based backend-as-a-service)
- Runs in Docker container
- SQLite database with real-time features

**Development Tools**
- ESLint + Prettier for code formatting
- Vitest for testing
- TypeScript with strict configuration
- Husky + lint-staged for git hooks

## Key Commands

### Development
```bash
cd app
npm ci                    # Install dependencies
npm run dev              # Start development server (default port)
npm run dv               # Start development server on port 5173
npm run build            # Build for production
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run lint             # Run linter and format check
npm run fmt              # Format code with prettier
npm run fmt:check        # Check formatting without changes
npm run check            # Type check with svelte-check
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
```

### Docker (Full Stack)
```bash
docker compose up        # Start frontend + backend
```
- Frontend: http://localhost:3000
- Backend Admin: http://localhost:8090/_/

## Application Architecture

### Core Concepts
**Vocal Royale** is a singing competition app with real-time features:
- **Users** have roles: participant, spectator, juror, admin
- **Competition** progresses through rounds with different phases
- **Song Selection** by participants per round
- **Rating System** where jurors rate performances
- **Real-time State** managed through PocketBase subscriptions

### Directory Structure
```
app/src/
├── lib/
│   ├── components/          # Svelte components
│   ├── server/             # Server-side utilities
│   └── pocketbase-types.ts # TypeScript types for backend
├── routes/                 # SvelteKit pages and API routes
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin functionality
│   ├── rating/            # Rating system
│   ├── song-choice/       # Song selection
│   └── profile/           # User profiles
└── hooks.server.ts        # Authentication & authorization
```

### Key Files
- `hooks.server.ts` - Authentication, role-based routing, PocketBase integration
- `lib/pocketbase-types.ts` - TypeScript definitions for all collections
- `routes/+layout.server.ts` - Global auth guard and user data loading
- `lib/server/bootstrap.ts` - Server initialization and setup

### Authentication & Authorization
- Cookie-based sessions with PocketBase
- Role-based access control in `hooks.server.ts`
- Routes are protected by user roles:
  - `/song-choice/*` - participants only
  - `/rating/*` - spectators and jurors only  
  - `/admin/*` - admin only
  - `/`, `/profile/*` - all authenticated users

### Environment Configuration
Key environment variables (see compose.env):
- `PB_URL` - PocketBase backend URL
- `APPLE_MUSIC_*` - Apple Music API integration
- `SESSION_MAX_AGE` - Session cookie duration
- Authentication and admin credentials

## Testing
- Tests use Vitest with Svelte testing utilities
- Mock implementations in `tests/utils/mocks/`
- Run tests before commits (enforced by CI)

## Deployment
- Dockerized with multi-stage builds
- GitHub Actions CI/CD pipeline
- Uses adapter-node for production builds
- PocketBase migrations in `backend/pb_migrations/`