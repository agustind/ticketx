# ticketex frontend

React + Vite + Tailwind v4 + shadcn/ui. Talks to the Masonite JSON API described in `../docs/api.md`.

```sh
npm install
npm run dev        # http://localhost:5173, proxies /api and /health to Masonite on :8000
npm run build      # typecheck + build into ../storage/compiled/app (served at /static/app/)
npm run lint
npm run typecheck
```

Add shadcn components with `npx shadcn@4.21.4 add <name>`.
