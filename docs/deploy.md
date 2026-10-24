# Deploying on Railway

One Railway project, `visitor`, with:

| Service | What | Notes |
|---|---|---|
| `web` | this repo, `main` branch | builds with `pnpm build`; runs migrations before each deploy (pre-deploy command `pnpm db:migrate`), then `pnpm start`; healthcheck `/` |
| `import` | this repo, cron | `sh -c "pnpm import:visit-jersey; pnpm seed:provider-codes; pnpm import:events"`, daily at `17 5 * * *`. It runs on its schedule; a redeploy rebuilds it but does not reliably run it. |
| Postgres | Railway's Postgres plugin, or Supabase | `DATABASE_URL` |

## Variables on `web` (and on `import`: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as `${{visitor.SUPABASE_SERVICE_ROLE_KEY}}` so it can copy fallback pictures into storage)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, or the Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | visitor's own Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | its anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | its service role key; needed to accept an invite with a password, and for picture uploads to the `listing-images` storage bucket. Secret. |
| `NEXT_PUBLIC_APP_URL` | the public URL: `https://visitor.je` (www.visitor.je redirects there) |
| `SUPERADMIN_EMAILS` | e.g. `ben@factory.je`: becomes superadmin on first sign-in. Everyone else is invited. |
| `ANTHROPIC_API_KEY` | optional: puts providers' and imported copy in the third person; on `import`, also writes the guide snippets, the club fixtures' copy, and checks event pictures for text |
| `RESEND_API_KEY` | optional: sends invites and claim emails (Resend, with visitor.je verified) |
| `PEXELS_API_KEY` | optional, on `import`: stock pictures for listings with none come from Pexels; without it, Openverse public-domain photos |
| `EMAIL_FROM` | optional, default `Visitor <hello@visitor.je>` |
| `STAFF_NOTIFY_EMAILS` | optional, comma-separated: who hears about new claims (default every staff account) |

Railway no longer reads `railway.json` (config as code is deprecated), so
the build, pre-deploy, start and healthcheck settings above are set on the
service itself. Without the pre-deploy command the tables are never made
and every page fails with `relation "events" does not exist`.

`NEXT_PUBLIC_*` values are read at build time, so a change to one needs a
redeploy, not just a restart.

## After the first deploy

1. In the Supabase project, add `<NEXT_PUBLIC_APP_URL>/auth/callback` to
   Auth → URL Configuration → Redirect URLs, and enable Google under Auth →
   Providers if wanted.
2. Run the first import from the `import` service (or locally against the
   production `DATABASE_URL`): `pnpm import:visit-jersey`, then
   `pnpm seed:provider-codes`.
3. Sign in at `/login` as an address in `SUPERADMIN_EMAILS`, then invite
   staff and providers from `/admin/people`.

## Creating it with the CLI

With a Railway API token in `RAILWAY_API_TOKEN`:

```bash
railway init --name visitor
railway add --database postgres
railway add --service web --repo basicmammal/visitor
railway variables --service web \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set NEXT_PUBLIC_SUPABASE_URL=... \
  --set NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --set NEXT_PUBLIC_APP_URL=... \
  --set SUPABASE_SERVICE_ROLE_KEY=... \
  --set SUPERADMIN_EMAILS=ben@factory.je \
  --set ANTHROPIC_API_KEY=...
railway domain --service web
```
