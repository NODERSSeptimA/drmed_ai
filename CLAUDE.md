# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Medical AI assistant ("MedAI") for psychiatrists at clinic "Династия-18". Russian-language UI for managing patients, conducting AI-guided voice examinations via OpenAI Realtime API, filling structured medical forms, and exporting DOCX reports.

## Commands

```bash
npm run dev          # Start dev server (Next.js 16)
npm run build        # Production build (requires env vars — see CI for placeholders)
npm run lint         # ESLint (no flags needed — flat config)
npx prisma db push   # Apply schema changes to DB
npx prisma generate  # Regenerate Prisma client after schema changes
npx tsx prisma/seed.ts  # Seed database
```

No test runner is configured. Playwright is installed but no tests exist yet.

## Environment Setup

- PostgreSQL 16 via Docker: `docker run -d --name medai-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medai -p 5432:5432 postgres:16-alpine`
- **Two env files required**: `.env` (Prisma CLI reads this) and `.env.local` (Next.js reads this). Both need `DATABASE_URL`.
- `.env.local` also needs: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`

## Architecture

### Stack
Next.js 16 (App Router, RSC) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui (new-york style) · Prisma 6 · PostgreSQL 16 · NextAuth v5 (JWT strategy, credentials provider) · OpenAI SDK (GPT-4o-mini, Whisper, Realtime API) · docx/docxtemplater for DOCX export

### Route Groups
- `app/(auth)/` — Login page, no navigation layout
- `app/(dashboard)/` — Main dashboard with nav, wrapped in `SessionProvider`
- `app/medical-history/[id]/` — Form editor with dynamic sections rendered from JSON template schema
- `app/voice-session/[id]/` — Real-time voice examination using OpenAI Realtime API via WebSocket

### API Routes (`app/api/`)
- `patients/` — CRUD
- `medical-history/` — CRUD + `[id]/export` for DOCX generation
- `voice-session/` — Create/update voice sessions
- `ai/fill-sections` — GPT-4o-mini extracts structured data from free text into template sections
- `ai/speech-to-text` — Whisper transcription (multipart/form-data)
- `ai/realtime-session` — Ephemeral token for OpenAI Realtime API
- `ai/conversation` — General AI chat
- `templates/` — List available examination templates

All API routes use `auth()` from `lib/auth.ts` for authentication and the Prisma singleton from `lib/prisma.ts`.

### Key Modules in `lib/`
- `ai/prompts.ts` + `ai/realtime-prompts.ts` — System prompts for all AI interactions
- `hooks/use-realtime-voice-session.ts` — Complex hook (~900 lines): WebSocket to Realtime API, Web Audio API for mic/playback, function calling (`save_section_data`, `complete_session`), echo prevention, auto-reconnect
- `docx/generator.ts` — DOCX report generation with clinic branding, two-page layout, header tables
- `templates/loader.ts` — Loads JSON examination templates from `templates/` directory
- `validations/patient.ts` — Zod schemas for patient forms

### Database Models (Prisma)
`User` → `Clinic`, `Patient` → `Clinic`, `MedicalHistory` → (Patient, Template, User), `VoiceSession` → (MedicalHistory, User), `Template` → Clinic. Medical history `data` and voice session `conversationLog` are stored as JSON fields.

### Template System
`templates/psychiatry-examination.json` defines 12 sections with fields, types, AI prompts, and follow-up questions. This JSON schema drives the medical history form UI (`components/medical-history/section-renderer.tsx`), AI fill extraction, and voice session flow.

## Tech Gotchas

- **Prisma v6 only** — v7 breaks datasource config. Keep `prisma@^6` and `@prisma/client@^6`.
- **Zod v4 breaking changes** — `z.enum()` uses `{ error: "..." }` not `{ required_error: "..." }`. Avoid `.default()` on array fields with react-hook-form; set defaults in form's `defaultValues` instead.
- **NextAuth v5 JWT** — Module augmentation for `next-auth/jwt` doesn't resolve; custom props work via indexing since JWT extends `Record<string, unknown>`.
- **Next.js 16** — `Buffer` not accepted as `BodyInit` in `NextResponse`; use `new Uint8Array(buffer)`. `middleware.ts` still works but is deprecated in favor of `proxy`.
- **React 19 + strict TS** — `unknown` not assignable to `ReactNode`; use `!!` to coerce unknown values in JSX conditionals. Functions in `.map()` inside JSX need explicit `ReactNode` return type.
- **Tailwind v4** — Config is in `app/globals.css` via CSS `@theme`, not `tailwind.config.js`. Custom colors: medgreen (#7C9082), warm (#C9A87C), blue (#4A90A4).

## Deployment

Docker multi-stage build → GitHub Container Registry → production server via GitHub Actions. Tag `v*` triggers deploy. `docker-compose.yml` runs app + nginx (reverse proxy with SSL) + certbot + postgres. Entrypoint runs `prisma db push` + seed before starting the server.

## Directory Notes

- `web/` — Legacy HTML prototype, reference only, not used in production
- `templates/` — JSON examination templates + DOCX template files for export
- `scripts/` — Docker entrypoint and init scripts
