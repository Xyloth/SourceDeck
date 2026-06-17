import { defineConfig, loadEnv } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Dev-only: serve a local case deck (which may embed real, private case data) at `/casedeck.json`.
// The path is supplied out-of-band via the `SOURCEDECK_DECK_PATH` env var (set it in a gitignored
// `app/.env.local`, e.g. `SOURCEDECK_DECK_PATH=C:\path\to\your-casedeck.json`). Nothing about any
// specific case is baked into the repo: the deck file lives wherever you point it, OUTSIDE the repo
// tree, so it can never be copied into `public/`, bundled into `dist/`, or deployed.
//
// If the env var is unset or the file is missing, the middleware 404s and the app falls back to its
// empty/demo state — which is exactly the generic, public experience. This plugin only runs in
// `serve` (dev) mode; production builds never see the deck at all.
function localCaseDeckDev(deckPath: string | undefined) {
  return {
    name: 'local-casedeck-dev',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const pathname = (req.url ?? '').split('?')[0]
          if (!pathname.endsWith('/casedeck.json')) return next()
          if (!deckPath || !fs.existsSync(deckPath)) {
            res.statusCode = 404
            res.end()
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          fs.createReadStream(deckPath).pipe(res)
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Pull SOURCEDECK_* from .env files too (loadEnv reads .env, .env.local, etc.), falling back to
  // any value already present in process.env. The '' prefix loads all keys regardless of VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const deckPath = process.env.SOURCEDECK_DECK_PATH || env.SOURCEDECK_DECK_PATH || undefined
  return {
    plugins: [react(), localCaseDeckDev(deckPath)],
  }
})
