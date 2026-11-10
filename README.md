# Content Viewer

Internal HTML gallery: **Express** + static UI, deployed on **Vercel**.

## Architecture

| Layer | Role |
|-------|------|
| `public/` | Catalog, upload, preview in `iframe` |
| `server.js` | REST API + HTML delivery |
| **Local** | `data/uploads/` + `data/catalog.json` |
| **Vercel** | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — files and catalog |

Vercel serverless functions have no persistent disk, so production uses Blob instead of `data/`. Locally it works like the original setup — no token required.

## Local development

```bash
npm install
npm run dev
```

http://localhost:3000 — try uploading `samples/hello.html`

## Deploy on Vercel

1. Import the repository on [Vercel](https://vercel.com).
2. **Storage → Create → Blob** on the project (`BLOB_READ_WRITE_TOKEN` is set automatically).
3. Deploy. Routing in `vercel.json` sends all traffic to one `@vercel/node` handler (`server.js`).
4. Share the public URL Vercel provides with stakeholders.

Check: `GET /api/health` → `"storage": "vercel-blob"`.

### Restricting uploads (recommended on Vercel)

Set **`UPLOAD_SECRET`** in the project environment. Then only requests with matching header **`X-Upload-Token`** can publish (`POST /api/items`). Browsing and viewing stay public.

The upload dialog shows an **Upload token** field when the server reports `uploadAuthRequired: true` (also stored in `sessionStorage` for convenience). Share the secret only with creators — it is still visible in DevTools during upload, so this is for light internal gating, not strong security.

## API

- `GET /api/items` — list all items
- `POST /api/items` — `multipart/form-data`: `file`, optional `title`, `description`
- `GET /api/items/:id` — metadata
- `GET /raw/:id` — HTML for `iframe`

Link to a piece of content: `?view=<id>`.

## Demo talking points

- Single Node app: Express API + static UI in `public/`.
- Local: files on disk; cloud: Blob (serverless has no disk).
- Failed catalog writes roll back the uploaded HTML file (no orphan blobs).
- Preview uses `sandbox` on the `iframe`.
