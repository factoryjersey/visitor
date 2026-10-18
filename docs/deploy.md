# Deploying on Railway

One Railway project, `visitor`, with:

| Service | What | Notes |
|---|---|---|
| `web` | this repo, `main` branch | builds with `pnpm build`; runs migrations before each deploy (pre-deploy command `pnpm db:migrate`), then `pnpm start`; healthcheck `/` |
| `import` | this repo, cron | `pnpm import:visit-jersey`, daily (e.g. `17 5 * * *`). Agree the schedule with Visit Jersey first. |
| Postgres | Railway's Postgres plugin, or Supabase | `DATABASE_URL` |

## Variables on `web` (and `DATABASE_URL` on `import`)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, or the Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | visitor's own Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | its anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | its service role key; needed to accept an invite with a password. Secret. |
| `NEXT_PUBLIC_APP_URL` | the public URL: `https://visitor.je` (www.visitor.je redirects there) |
| `SUPERADMIN_EMAILS` | e.g. `ben@factory.je`: becomes superadmin on first sign-in. Everyone else is invited. |

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
  --set SUPERADMIN_EMAILS=ben@factory.je
railway domain --service web
```
