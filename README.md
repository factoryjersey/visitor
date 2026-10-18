# Visitor

Listings and publication builder for the official Jersey visitor guide and
map: What's On and the venues that host it, drawn from Visit Jersey's
directory, chosen by a person, and printed.

Background on the source, and every trap found using it, is in
[docs/visit-jersey.md](docs/visit-jersey.md).

## Stack

Matches factoryOS so the two can be joined later:

- Next.js 15 (App Router), TypeScript strict
- Postgres via Drizzle ORM (Supabase in production, like factoryOS)
- Supabase Auth: Google or password, limited to allowed email domains
- Tailwind, Zod, Vitest
- Leaflet on OpenStreetMap tiles for the map

## Running it

```bash
pnpm install
cp .env.example .env              # database, Supabase keys, app URL
pnpm db:migrate
pnpm import:visit-jersey          # the whole directory, ~2 minutes, paced
pnpm dev
```

`pnpm seed:sample` imports the invented sample in `tests/fixtures/` instead,
for working without network access. It is not real data.

Behind a proxy, Node's `fetch` needs `NODE_USE_ENV_PROXY=1` to use
`HTTPS_PROXY`.

## Signing in

The same as factoryOS: every page needs a Supabase session, signed-out
requests go to `/login`, and only addresses in `ALLOWED_EMAIL_DOMAINS` are
admitted, checked at sign-in and again on every request. Each server action
checks for itself as well, since a form POST can be replayed from anywhere.

Point `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at
factoryOS's Supabase project and the same accounts work in both. On that
project:

- add `<NEXT_PUBLIC_APP_URL>/auth/callback` to Auth → URL Configuration →
  Redirect URLs, or Google sign-in returns to the wrong place;
- set `ALLOWED_EMAIL_DOMAINS=factory.je` in production. Unset, anyone with
  an account on the project gets in.

Google sign-in needs no setup per person. For a password account:

```bash
pnpm auth:create-user --email=someone@factory.je --password='...'
```

There are no roles: everyone signed in can include, leave out and edit.
Who included or left out each entry, and who last edited it, is recorded
and shown on its page.

## How it fits together

| | |
|---|---|
| `places` | The canonical record, one per front door. Every Visit Jersey place type is imported, not just venues, so an event can be linked to whichever listing hosts it. |
| `events` | What's On. Linked to a venue in `places` where one can be identified. |
| `source_records` | Every listing as Visit Jersey gave it, whole, with `modified_gmt` and `portal_last_synced`. A listing that disappears is flagged `present = false`, never deleted. |
| `inclusion` | `candidate` / `included` / `excluded`, on both places and events. Only a person sets it; an import never touches it. |
| `guide_copy`, `inclusion_note` | Ours. Survive every re-import. |
| `field_sources`, `locked_fields` | Where each field came from, and which a person has corrected. An import never writes a locked field. |

An event is linked to a venue only when the listing is within 250m **and**
the venue text begins with its name (`lib/domain/venue-match.ts`). The pin
alone links Hamptonne Museum's events to the holiday flat in its stable
block. Anything else is left for a person to set on the event page, and a
venue set by hand is locked.

## Pages

- `/whats-on` — every event, filter by month and status, include or leave out
- `/whats-on/[slug]` — details, venue, our copy, source freshness
- `/venues` — places hosting events (or every listing), include or leave out
- `/venues/[slug]` — contact, months open, rates, facilities, events held there
- `/guide` — what is selected, laid out for A4; print from the browser to proof
- `/map` — event venues, green for those in the guide

## Not built yet

- Editions: a dated, signed-off snapshot of the selection.
- factoryOS link: which venues are clients (`factoryos_contact_id`), and UPRNs.
- A scheduled import. Agree the schedule with Visit Jersey first.

## Checks

```bash
pnpm check    # typecheck + tests
pnpm build
```
