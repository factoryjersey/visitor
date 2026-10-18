# Deploying on Railway

One Railway project, `visitor`, with:

| Service | What | Notes |
|---|---|---|
| `web` | this repo, `main` branch | builds with `pnpm build`; runs migrations before each deploy (`preDeployCommand` in `railway.json`), then `pnpm start` |
| `import` | this repo, cron | `pnpm import:visit-jersey`, daily (e.g. `17 5 * * *`). Agree the schedule with Visit Jersey first. |
| Postgres | Railway's Postgres plugin, or Supabase | `DATABASE_URL` |

## Variables on `web` (and `DATABASE_URL` on `import`)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, or the Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | factoryOS's Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | its anon key |
| `NEXT_PUBLIC_APP_URL` | the public URL, e.g. `https://visitor-production.up.railway.app` or the custom domain |
| `ALLOWED_EMAIL_DOMAINS` | `factory.je` |

`NEXT_PUBLIC_*` values are read at build time, so a change to one needs a
redeploy, not just a restart.

## After the first deploy

1. In the Supabase project, add `<NEXT_PUBLIC_APP_URL>/auth/callback` to
   Auth → URL Configuration → Redirect URLs.
2. Run the first import from the `import` service (or locally against the
   production `DATABASE_URL`): `pnpm import:visit-jersey`, then
   `pnpm seed:provider-codes`.
3. Sign in at `/admin` and check the guide.

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
  --set ALLOWED_EMAIL_DOMAINS=factory.je
railway domain --service web
```
