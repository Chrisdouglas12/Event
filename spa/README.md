# Event SPA

A true single-page application (Vite + React + React Router) for the public
site. This workspace is additive: the existing Next.js app in `../frontend`
keeps working untouched, so admin and the remaining pages can be migrated
separately.

## Why this shape

- **Non-destructive** — nothing in `frontend/` or `backend/` was changed to
  start the SPA migration.
- **Reuses the components** — the Vite config aliases `@/` to
  `../frontend/src`, so existing landing components are imported directly
  rather than copied.
- **Next.js-free at runtime** — tiny shims in `src/shims` map `next/link`,
  `next/image` and `next/navigation` onto React Router / plain `<img>`. No
  server rendering, no hydration mismatch, no Next runtime.
- **Same styling** — `src/styles.css` imports the existing `globals.css` and
  points Tailwind's scanner at `frontend/src`.

## Landing page aliases

All of these render the same landing page (client-side, no reload between
them):

- `/`
- `/home`
- `/index`
- `/landing`

Unknown paths show a small 404 with a link back to `/`.

To add another alias, add a path to `LANDING_ALIASES` in `src/app.tsx`.

## Commands

```bash
cd spa
npm install
npm run dev        # http://localhost:3001
npm run typecheck
npm run build      # -> spa/dist
npm run preview
```

The dev server proxies `/api/*` to `VITE_API_TARGET` (default
`http://localhost:3000`). Copy `.env.example` to `.env` to override it.

## Deployment

Deploy with the Vercel **Root Directory** set to `spa`. `vercel.json`:

- rewrites `/api/:path*` to the Render backend, so the SPA keeps using
  same-origin relative `/api/...` URLs (no CORS changes needed);
- rewrites all other paths to `/index.html` so React Router handles them;
- static files (`/images`, `/models`, `/textures`, etc.) are copied from
  `frontend/public` via Vite's `publicDir` and are served before the rewrites.

## Migrating the next page

1. Add the page component to `src/app.tsx` and register its route/aliases.
2. If it uses a Next API that has no shim yet, add a small shim under
   `src/shims` and register it in both `vite.config.ts` and `tsconfig.json`.
3. Server-only helpers (`cookies()`, `revalidatePath()`, `redirect()` in server
   components) must be replaced with client-side token reads and API calls —
   do this when the admin pages are migrated.
