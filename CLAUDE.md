# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jam Session Orchestrator - an app for coordinating live jam sessions between musicians.

**Core Features:**
- Input number of musicians (with optional names)
- Metronome playback
- Visual cue system showing when each musician should start jamming
- Solo/rhythm change indicators (active player solos while others maintain rhythm)

**UI Concept:**
- Circle divided into sectors (one per musician)
- Each sector has unique color
- Visual states: active (soloing), starting, maintaining rhythm

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

## Project Structure

- `src/app/` - App Router pages and layouts
- `src/components/` - Reusable React components
- `docs/MVP.md` - Full MVP specification

## Code Conventions

### File Size Limits
- MUST keep files under 300 lines (prefer under 200)
- Split large components into smaller focused components

### Commits
- Format: `<type>[scope]: <description>`
- Lowercase, imperative mood, under 50 chars, no period
- Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `perf`, `test`
- NEVER add Co-Authored-By or attribution lines
