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
- Supabase Auth (Google or password); who may sign in, and as what, is a `users` table here
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

## Accounts and roles

Supabase proves who somebody is; the `users` table decides whether they get
in, and as what (`lib/auth/roles.ts`):

| Role | Can |
|---|---|
| superadmin | everything, and is the only one who makes staff |
| staff | the editing side under `/admin`: review, inclusion, the guide and its exports, provider accounts |
| provider | their own business's listings under `/account`, and its team |

Accounts are invite only. An invite (`/admin/people`, or a provider's
`/account/team`) makes the account and a link to set a password, shown once
to whoever made it to pass on; we send no email. Signing in with Google as
the invited address works without the link. The first superadmin is whoever
signs in as an address in `SUPERADMIN_EMAILS`, or
`pnpm auth:create-user --email=… --password='…'`.

Middleware sends anyone signed out of `/admin` or `/account` to `/login`.
Every page and server action checks the role for itself; a provider who
finds an `/admin` URL gets a 404. An address Supabase has not confirmed
never matches an account, so a self-made sign-up with somebody else's
address gets nothing. Forgotten passwords go by Supabase's own email.

Visitor has its own Supabase project, separate from factoryOS. On it:

- add `<NEXT_PUBLIC_APP_URL>/auth/callback` to Auth → URL Configuration →
  Redirect URLs, or Google sign-in and password reset return to the wrong place;
- for Google sign-in, enable Google under Auth → Providers.

Who included or left out each entry, and who last edited it, is recorded
and shown on its page.

## Providers' listings

A business (`businesses`) looks after listings: venues, events, tours. Its
people add them under `/account`, and staff can hand an imported listing to
a business on its admin page ("Looked after by").

- A new listing arrives as `review = pending`: hidden from the site, the
  guide and the admin lists, waiting in `/admin/review`. Its business can
  keep editing it until staff approve or turn it down (with a note they see).
- Once approved, a provider's edit no longer writes the listing. It waits in
  `listing_changes`, one open change per listing, and `/admin/review` shows
  it field by field against the live version.
- Whatever a provider wrote is locked, so the next import keeps their answer.
- Providers write only what the listing is (`PROVIDER_FIELDS` in
  `lib/domain/listing-form.ts`). Our copy, the guide section, inclusion,
  highlights and print overrides stay with staff.
- A business that lists a tour becomes a tour provider for the guide's key.
- "Copy as a new event" on a provider's event or tour opens the new form
  filled in from it, dates blank: the same thing again, on new dates.

## Claims

Venues, organisers and tour operators find their way in from the public
site: `/list` (linked in the footer) to search for their listing or ask for
an account, and the "Claim it" links on event and tour pages, shown while
nobody looks after the listing. A claim (`claims`) is a request, so
accounts stay invite only:

- A honeypot field and a minimum time to fill the form keep bots out; one
  address may have five open requests.
- Staff see them in `/admin/claims`, with any account the person already
  has and businesses their email or name suggests. Approving gives the
  listing (and, for a venue, its upcoming events nobody looks after) to the
  chosen business, or a new one named from the claim, and makes an invite
  for someone without an account: a link to copy, or send with the
  prefilled email. Someone already on that business's team needs nothing.

## Email

Through Resend (`lib/email`), when `RESEND_API_KEY` is set; without it
nothing is sent and invite links are shown to copy, as before. A failed
send never stops what caused it, and an invite link is always shown too.

- Invites, from People, a provider's team page and approved claims.
- A new claim: to staff (`STAFF_NOTIFY_EMAILS`, else every staff account),
  replying straight to the claimant; and a "we have your request" to them.
- A claim approved (for someone with an account; others get the invite)
  or turned down. Our note on a turned-down claim stays ours.

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

## Other event sources

Visit Jersey misses much of what is on, the smaller one-off nights above
all, so `pnpm import:events` adds events from elsewhere after it:

| Source | How | Goes on the site |
|---|---|---|
| Jersey Arts Centre | Ticketsolve's public feed, `artscentre.ticketsolve.com/shows.xml` | straight away |
| Jersey Opera House | the same, `jerseyoperahouse.ticketsolve.com/shows.xml` | straight away |
| Eventbrite | the schema.org Event data on its Jersey listing pages and each event's page | after review in `/admin/review` |
| Jersey Charities diary | its diary page, read as written, and each entry's page for the description | after review |
| Jersey Bulls | the fixtures page, `bulls.je/fixtures/?team=all`: home matches only (Jersey named first), men, women and U23 | straight away |
| Jersey RFC | the fixtures and results page, `jrfc.je/results/`: home matches still to be played | straight away |

Each match gets copy of its own from Claude (`lib/integrations/claude/fixture.ts`),
a line about the two clubs meeting and the card's sentence, written once
and kept until the opponent, competition or ground changes. Without a key,
a plain line naming both sides.

An event another source already gave us (a date in common and most of the
title, `lib/domain/event-match.ts`) is linked to it, not repeated, and the
second source only fills what the first left empty; Visit Jersey links an
event the same way when it lists one Eventbrite had first, and approves
it. Each source's own records are kept in `source_records`. Anybody can
post on Eventbrite, so its events wait for staff; `/admin/review` approves
them one by one or all at once.

Events that arrive without types, from Eventbrite and the charities' diary
above all, are typed from their own words (`lib/domain/categorise.ts`):
Visit Jersey's labels, plus Charity, Nightlife, Talks & learning, Markets &
fairs, and Business & networking, which marks what is not for visitors so
it is quick to turn down in review and never offered as a public filter.

Railway's `import` service runs `pnpm import:visit-jersey`, then
`pnpm seed:provider-codes`, then `pnpm import:events`, daily at 05:17 UTC.

## Public site

The site visitors see is at the root, with no sign-in:

- `/` — the lead highlight, what's coming up, tours on particular dates
- `/whats-on` — events: one-off and dated by default; the "Include ongoing
  events" tick adds exhibitions, daily attractions and weekly sessions
- `/tours` — tours on particular dates by default; the tick adds those
  bookable any day
- `/whats-on/[slug]`, `/tours/[slug]` — the listing, all its dates,
  booking and directions; events carry schema.org Event data

It shows everything not left out (the site is the whole picture; the guide
is the edited selection), only what is still to come, and highlights
always, whatever the tick. Filters are a GET form, so every view is a link
and works without JavaScript; the tick submits itself when it can.

## Pages (providers)

- `/account` — the business's listings and where each stands
- `/account/{venues,events,tours}/new`, `…/[slug]` — add and edit
- `/account/team` — colleagues, and inviting more
- `/account/password` — set a new one (staff use it too)

## Highlights

A highlight gets a full page in the guide (the extended listing and a large
image, exported separately for its own InDesign template) and leads the
public listings. Set it on the event or tour page in the admin.

## Pages (admin, staff)

- `/admin/review` — providers' new listings and changes, to approve or turn down
- `/admin/people` — invite providers and staff, businesses, switch accounts off

- `/admin/whats-on` — every event, filter by month and status, include or leave out
- `/admin/whats-on/[slug]` — details, venue, our copy, source freshness
- `/admin/venues` — places hosting events (or every listing), include or leave out
- `/admin/venues/[slug]` — contact, months open, rates, facilities, events held there
- `/admin/tours` — tours and experiences: dated ones by default, on-demand behind a tick; genre and provider
- `/admin/tours/providers` — provider codes for the guide's key
- `/admin/guide` — the selection for an edition's dates, set as the printed guide
  sets it (115 × 165mm pages, the printed field order), with the InDesign
  exports
- `/admin/map` — event venues, green for those in the guide

## Unique first: events and tours

Providers list everything the same way, so the dates decide what kind of
thing a listing is (`lib/domain/occurrence.ts`):

| Kind | Looks like | Events | Tours |
|---|---|---|---|
| One-off | 1–3 dates, or a run of up to a week | dated listings | dated listings |
| Specific dates | a handful of irregular dates (tide walks) | dated listings | dated listings |
| Regular | a weekly rhythm (parkrun), or the same few weekdays filled week after week (a castle's costumed guide every Tuesday and Thursday of half-term) | "On all season" block | on demand, by genre |
| Ongoing | most days for three weeks or more; every day for over a week in the daytime (a half-term trail); for a tour, a week of daily dates | "On all season" block | on demand, by genre |

What's On and Tours list the unique kinds by default, with ticks to show
regular and ongoing ones. A person can change a listing's kind and a
tour's genre; both are then locked against the next import.

Tour genres (On foot, Active, On the water, Motorised, Foodie, Classes &
crafts) are suggested from each listing's title first and its tags second.
Providers get the short codes the guide's key prints. Codes are ours:
`pnpm seed:provider-codes` fills empty ones from the autumn 2026 key
(`data/provider-codes-2026-3.json`), matching by website then name, and
`/admin/tours/providers` edits them.

## Into InDesign

The guide's What's On pages are already built by InDesign Data Merge
(`whatson_merge_events_*.indd`). `/admin/guide` exports the selection as that
merge source: one row per event, the fields in printed order.

| Column | Example |
|---|---|
| Dates | `1 SEP UNTIL 29 OCT`, `1 - 5 SEP`, `1 SEP & 15 SEP`, `4 SEP, 2 OCT, 6 NOV` |
| Times | `10:00-16:00`, `15:00, 19:30` |
| Title, Copy | our copy if written, otherwise the listing's summary |
| Price | `£11.45 - £24.50`, `Free entry` |
| Venue, Address | `Elizabeth Castle`, `St Aubin's Bay, St. Helier` |
| Contact | phone, or the email when there is no phone |
| Website | `JERSEYHERITAGE.ORG` |

The rules are in `lib/domain/house-style.ts`, each tested against an entry
from the printed autumn 2026 edition. Dates outside the edition are dropped
before formatting. Where the computed dates, times or price are wrong for
print, the event page takes an override, and the preview beside it shows
the entry as it will print.

The files are UTF-16 with a byte-order mark: from UTF-8, InDesign garbles
every curly apostrophe and accent. The venues export carries section, area,
label (`CASUAL`, `SPANISH`), listing size and copy, set on each venue page.

The proof page lays entries out in two columns but does not paginate them;
InDesign does that.

## Not built yet

- Editions: a dated, signed-off snapshot of the selection.
- factoryOS link: which venues are clients (`factoryos_contact_id`), and UPRNs.
- Emailing review outcomes on providers' listings.
- Images on providers' listings: they need somewhere to upload to.

## Checks

```bash
pnpm check    # typecheck + tests
pnpm build
```
