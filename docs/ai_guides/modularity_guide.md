# JS Modularity Guide

Rules for keeping JavaScript files small and maintainable.

## File Size Limits

- MUST keep files under 300 lines
- PREFER files under 200 lines
- Split immediately when approaching 300 lines

## Directory Structure

- `components/` - Reusable UI components (factory pattern)
- `{page}/` - Page-specific modules split by concern (e.g., `planning/`)
- `services/` - Backend services and API clients
- `services/routes/` - Express route handlers (server-side)
- `{page}.js` - Page entry point (orchestration only)

## Splitting Page JS Files

- MUST split when file exceeds 300 lines
- Create `{page}/` folder at project root (e.g., `planning/`)
- Extract by concern:
  - `data-loader.js` - API calls and data fetching
  - `state.js` - State management and updates
  - `render.js` - DOM rendering functions
  - `events.js` - Event handlers and user interactions
  - `modals.js` - Modal-related CRUD operations

## Splitting Server Files

- MUST split when `server.js` exceeds 500 lines
- Extract routes to `services/routes/{resource}.js`
- Keep `server.js` as entry point with middleware setup only
- One route file per resource (tax, income, transactions, assets)

## Module Patterns

- PREFER ES modules (`import`/`export`) for frontend
- MUST use CommonJS (`require`/`module.exports`) for Node.js backend
- MUST export named functions, not default objects
- ALWAYS document exported functions with JSDoc

## Entry Point Pattern

- Page entry files (`{page}.js`) MUST only:
  - Import modules
  - Initialize state
  - Call `loadData()` and `render()`
  - Set up `DOMContentLoaded` listener

## When to Extract

- Extract when a function group exceeds 100 lines
- Extract when functionality is reusable across pages
- Extract when file becomes hard to navigate
- NEVER extract single functions into separate files
