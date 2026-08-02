# Vercel deployment runbook

## Deployment architecture

Deploy only `frontend/` as the Vercel project. It is a Next.js 16 App Router
application. Browser requests use the same-origin `/api/backend/*` path, and the
Next.js rewrite proxies those requests to the separately hosted NestJS API.

The following services must remain external to this Vercel project:

- NestJS backend: an always-running Node.js service that handles API requests,
  PDF uploads, synchronous AI grading, and Prisma access.
- Supabase PostgreSQL: persistent application data. Use a pooled connection for
  `DATABASE_URL` and a direct connection only for migrations.
- Supabase Storage: persistent PDF storage. The backend currently generates
  public object URLs, so do not upload sensitive documents until access control
  is implemented.
- An LLM provider: OpenRouter, Google Gemini, or OpenAI.

There are no WebSockets, scheduled jobs, continuously running frontend jobs, or
application caches in the current codebase. AI grading runs synchronously in the
external backend request and may need timeout/queue work as usage grows.

## Render backend preview

Create a **Web Service** in the Render dashboard with these settings:

| Setting | Value |
| --- | --- |
| Repository branch | `vercel-migration` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Node.js version | `22.x` (declared in `backend/package.json`; leave `NODE_VERSION` unset) |
| Region | The Render region closest to the Supabase project; use `Singapore` when Supabase is in Southeast Asia |
| Instance Type | `Free` (preview only) |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/` |
| Auto-Deploy | `No` while validating the preview |
| Pre-Deploy Command | Leave blank |
| Persistent Disk | None |

Do not set `PORT`; Render supplies it. The backend listens on that port at
`0.0.0.0`. `GET /` is the health check and returns only a static response. Free
services spin down when idle and can have a cold-start delay, so this plan is
appropriate for a preview rather than reliable production traffic.

No `render.yaml` is included intentionally. The dashboard configuration is
short, and the application needs a choice of LLM provider and manually supplied
secrets. A Blueprint would not remove that manual work and could create
infrastructure before those choices are reviewed.

### Render environment variables

Add these as secret environment variables in Render. Never commit their values.

Required for every deployment:

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL runtime connection; prefer the Supabase pooler URL for server workloads |
| `DIRECT_URL` | Direct/session database URL loaded by Prisma CLI during generation and used for controlled migrations |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET` | Server-only Supabase service key used for the `pdfs` storage bucket |

At least one supported LLM key is also required:

- `OPENROUTER_API_KEY`
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

Optional LLM selection and endpoint variables:

- `LLM_PROVIDER` (`openrouter`, `google`, or `openai`; defaults to the first
  configured provider)
- `LLM_MODEL`
- `OPENAI_API_URL`

`POSTGRES_PASSWORD` belongs only to the retained Docker Compose fallback and is
not needed on Render. Do not add any backend secret as a `NEXT_PUBLIC_*`
variable: variables with that prefix are exposed to browser code.

### Prisma migrations

`npx prisma generate` is safe in the Render build command: it generates the
client and does not alter the database. Do **not** put `prisma migrate deploy` in
the build or start command. Builds can be retried, and the free Render plan does
not provide a pre-deploy command.

Before a schema-changing release, review and commit the generated migration,
back up the Supabase database, and run the following once from a trusted
workstation or a controlled CI job with the production `DIRECT_URL`:

```bash
cd backend
npx prisma migrate deploy
```

Only run that command after confirming it targets the intended database. This
repository preparation does not run a production migration.

### Preview security warning

The backend currently has **no authentication or authorization**. Its project,
upload, delete, and grading endpoints become publicly callable as soon as the
Render URL is public. CORS is also permissive; CORS is not an authentication
control. Use the Render service only for a controlled preview, avoid sensitive
data, monitor LLM and Supabase usage, and add authentication, authorization,
rate limiting, and a restricted CORS origin before treating it as a public
production service.

The upload controller accepts PDF files in memory up to 10 MB and then writes
them to Supabase Storage. The application does not depend on Render's ephemeral
filesystem. The tracked `backend/uploads/` content and Docker/DigitalOcean files
are legacy/fallback artifacts and are not used for new runtime uploads.

## Vercel environment variable

Configure this in Production, Preview, and Development:

| Name | Required | Scope | Description |
| --- | --- | --- | --- |
| `BACKEND_URL` | Yes | Server/build | Public HTTPS origin of the NestJS backend, without `/api/backend`, a query string, fragment, or trailing slash. Example shape: `https://api.example.com`. |

Do not add backend database, Supabase service-role, or LLM secrets to the Vercel
frontend project. `NEXT_PUBLIC_BACKEND_URL` remains only as a compatibility
fallback for the Docker/DigitalOcean build and is not required on Vercel.

The backend host separately requires the variables documented in
`backend/.env.example`: `DATABASE_URL`, `DIRECT_URL` for migrations,
`SUPABASE_URL`, `SUPABASE_SECRET`, and at least one of `OPENROUTER_API_KEY`,
`GOOGLE_API_KEY`/`GEMINI_API_KEY`, or `OPENAI_API_KEY`. `LLM_PROVIDER`,
`LLM_MODEL`, and `OPENAI_API_URL` are optional. `POSTGRES_PASSWORD` is only for
the fallback Docker Compose PostgreSQL service.

## Recommended Vercel project settings

- Framework preset: Next.js (auto-detected)
- Root Directory: `frontend`
- Node.js version: 22.x (also pinned in `frontend/package.json`)
- Install command: default (`npm install`/`npm ci` as selected by Vercel)
- Build command: default (`npm run build`)
- Output directory: default; leave blank
- Development command: default (`npm run dev`)
- Production branch: `main`
- Deployment regions: Vercel default; the frontend does not connect directly to
  the database
- Environment variable: `BACKEND_URL` in Production, Preview, and Development

No `vercel.json` is needed. Next.js already defines the external rewrite and the
root redirect. Keep `output: "standalone"` because the Docker fallback uses it;
Vercel can still detect and deploy the Next.js application normally.

## First deployment

1. Confirm the NestJS backend is reachable at a stable HTTPS URL and that its
   Supabase database, Storage bucket, and LLM credentials work.
2. In Vercel, choose **Add New > Project** and import this GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Keep the detected Next.js framework and default install/build/output commands.
5. Select Node.js 22.x.
6. Add `BACKEND_URL` to Production, Preview, and Development. Use the backend
   origin only, for example `https://api.example.com`.
7. Deploy to the generated `*.vercel.app` preview/production URL.
8. Before adding the custom domain, test `/create`, project CRUD, a small PDF
   upload, analysis, human review, PDF viewing, and delete. Also test a PDF above
   4.5 MB because the 10 MB upload path depends on the external rewrite remaining
   a direct proxy rather than becoming a Vercel Function.
9. Review Vercel build/runtime logs and the external backend logs. Do not attach
   `tygrade.me` until the preview is accepted and the production security risks
   below are addressed.

## GitHub Actions and DigitalOcean

`.github/workflows/deploy.yml` is CI-only. On every push to `main`, it installs
dependencies, generates the Prisma client, type-checks, lints, tests, and builds
the backend, while independently installing, type-checking, linting, and building
the frontend. It no longer contains DigitalOcean or SSH deployment steps.

Use Vercel's GitHub integration for frontend deployments. The retained Docker and
DigitalOcean configuration files are fallback references only and are not invoked
by GitHub Actions.

## Known incompatibilities and production risks

- `frontend/app/api/projects-gpt/route.ts` and
  `frontend/app/api/projects-gemini/route.ts` are unused legacy endpoints that
  write to repository JSON files. Vercel Functions do not provide durable local
  storage, so POST requests to these endpoints are not supported reliably on
  Vercel. Migrate them to PostgreSQL/object storage or remove them after confirming
  no external clients use them. The active UI uses the NestJS `/projects` API and
  is not affected.
- The application has no authentication or authorization. Anyone who can reach it
  can currently create/delete projects, upload/delete reports, trigger paid LLM
  analysis, and submit human reviews.
- Supabase PDF URLs are currently public. Use a private bucket and signed URLs
  before storing confidential or student documents.
- The browser loads the PDF.js worker from the hard-coded unpkg CDN URL
  `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`. A CDN outage or
  restrictive Content Security Policy will break PDF viewing; self-host the worker
  as part of the future PDF viewer migration.
- `frontend/public/uploads/report-1.pdf` is tracked and is publicly served by the
  frontend. Confirm it is intentional demo data; otherwise remove it and assess
  whether repository history must be cleaned.
- The former Docker Compose development password was removed from the current
  source, but the literal remains visible in earlier Git commits. Rotate it
  anywhere it was reused; cleaning history is optional only if it was never a real
  credential.
- AI grading is a synchronous backend operation. It does not require a Vercel
  background worker today, but backend request timeouts and LLM latency remain an
  operational risk.
- The dependency audit still reports frontend production advisories through the
  current PDF viewer stack (`pdfjs-dist` 3.x), plus transitive `postcss`, `sharp`,
  and `tar` versions for which npm cannot currently produce a compatible fix.
  In particular, the PDF.js advisory concerns JavaScript execution when viewing a
  malicious PDF. Treat uploads as untrusted and plan a tested PDF viewer migration
  before unrestricted production use. The NestJS dependency audit is clean after
  patch-level updates.

## DNS plan for `tygrade.me`

Read-only DNS checks on 2026-08-01 showed DigitalOcean nameservers
(`ns1.digitalocean.com`, `ns2.digitalocean.com`, and `ns3.digitalocean.com`) and no
published apex A/AAAA, `www` CNAME/A, MX, or TXT records.

After the Vercel deployment is verified:

1. Add `tygrade.me` and `www.tygrade.me` to the Vercel project. Choose one as the
   primary domain and redirect the other in Vercel.
2. Run Vercel's domain inspection in the dashboard (or `vercel domains inspect
   tygrade.me`) and use the project-specific values it reports when present.
3. At DigitalOcean DNS, add/replace the apex record with `A @ 76.76.21.21` and add
   `CNAME www cname.vercel-dns-0.com.`. These are Vercel's current general-purpose
   values; project-specific inspection takes precedence.
4. Remove only conflicting apex A/AAAA records and conflicting `www` A/AAAA/CNAME
   records. Preserve nameservers and any unrelated MX, TXT, CAA, or service records.
5. Wait for DNS/SSL validation, verify both hostnames, and only then select the
   production primary domain. Do not change registrar nameservers unless choosing
   a deliberate full DNS migration to Vercel.

References: [Vercel monorepos](https://vercel.com/docs/monorepos),
[external rewrites](https://vercel.com/docs/routing/rewrites),
[custom domains](https://vercel.com/docs/domains/set-up-custom-domain), and
[Vercel file storage guidance](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).
