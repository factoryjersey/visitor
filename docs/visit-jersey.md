# Visit Jersey as a data source

Notes on what `www.jersey.com` publishes, what we already draw from it, and what
a print-guide production system would and would not get from it. Written
2026-10-18; the counts are live as of that date and the field list is from a
real listing, not from documentation — there is none.

> Paths in this note (`lib/…`, `scripts/…`, `DECISIONS.md`, migration `0150`)
> refer to the existing Factory app repository, where the Visit Jersey client
> and scripts already live. This repository starts empty.

## What it is

Visit Jersey's directory is a WordPress site with its REST API left open.
Every listing type is readable at `/wp-json/wp/v2/<type>`, and every listing
carries an ACF block holding a structured address, a map pin, editorial copy,
rates, facilities and images.

The pin is the thing that makes it valuable. It was placed by the business
itself through Visit Jersey's partner portal, which is why it finds places a
general geocoder cannot: Nominatim has never heard of The Potato Shack or the
Breakwater Café because nobody has mapped them, and Visit Jersey has because
the owner filled a form in.

Our client is `lib/integrations/jersey-com/directory.ts`.

```
GET https://www.jersey.com/wp-json/wp/v2/accommodation?lang=en&per_page=100&page=1
```

Read-only, no key, no account. Page count comes back in `x-wp-totalpages` and
the total in `x-wp-total`. We send a real User-Agent with Ben's address on it
and wait 300ms between pages, because it is somebody else's server and there is
no reason to hurry it.

### `lang=en` is not optional

Listings exist in several languages as separate posts sharing one pin. The
difference is not small:

| Type | English | All languages |
|---|---|---|
| accommodation | **219** | 562 |
| food-and-drink | **232** | 599 |
| activities | **114** | 270 |
| shopping-and-markets | **115** | 297 |
| tours-and-activities | **113** | 123 |
| attractions | **62** | 172 |
| points-of-interest | **51** | 146 |
| tour-operators | **41** | 76 |
| events | **109** | 109 |

Without `lang=en` every place arrives two or three times with different ids and
the same coordinates, and any name match becomes ambiguous. Polylang exposes
`lang` and `translations` on each post if the other languages are ever wanted.

`events` is **not** in our `PLACE_TYPES` today, because that list was built for
"somewhere a van can deliver". A print guide wants it.

## What a listing holds

54 ACF fields on an accommodation listing. Grouped by what they are for:

**Identity and place**
`title`, `address` (`place_name`, `address_line_1`, `address_line_2`,
`postcode`), `parish` (as `{value, label}`), `map_location`
(`address`, `lat`, `lng`, `zoom`, `place_id`, plus Google-style components),
`map_location_lat` / `map_location_lng` as strings.

**Contact**
`telephone_number` (`area_code`, `prefix`, `number`, `formatted`),
`email_address`, `website`, `social_media` (`facebook`, `instagram`, `twitter`),
`tripadvisor` (their listing id).

**Editorial**
`short_description` and `long_description`, both HTML. `featured_video`.

**Classification**
`type`, `style`, `location` (setting — coastal, town…), `key_facilities`,
`accessibility` plus `accessibility_additional_info` and `accessibility_url`,
`seasonality` (one entry per month it is open), `bus_routes` (with route
numbers and the stop name in HTML), `aa_rating`, `geopark` on events.
All of these are `[{value, label}]` arrays — the label is the words.

**Commercial**
`low_season_rate`, `high_season_rate` (bare numbers: 135, 295),
`from_price` / `price_to` on events, `booking_information`
(e.g. "Free cancellation").

**Images** — see below. `header_image_data`, `gallery_images_data`, `logo_data`,
each a **JSON string** that has to be parsed again, holding
`{url, public_id, alt_text, original_filename}`.

**Links** `link` (the page), `shortened_url` plus per-channel variants
(`go.jersey.com/acom/old-bank-house`, `…/fb`, `…/ig`, `…/ta`).

**Provenance** `portal_post_owner_name`, `portal_post_owner_id`,
`portal_partner_tier`, `portal_last_synced`, `portal_post_id`, `last_updated`,
`submitted_by`, `owned_by`, `featured`.

**Events specifically** `event_dates` — an array of
`{date: "20261231", start_time: "19:00", end_time: "01:00"}` — plus
`event_dates_start` and `event_dates_end`, and the venue through
`map_location.address`.

## Images: print resolution is actually there

This is the finding that matters most for a print guide, and it surprised me.

Images are on Cloudinary at `cdn.jersey.com/image/upload/...`. The URL in
`header_image_data` carries **no transformation segment**, so it is the original
upload, not a web derivative. The one I checked:

```
2286 × 3500 px, 772 KB   →  7.6in × 11.7in at 300 dpi
```

A full-bleed A4 page. `original_filename` was `DSC05503-scaled`, so these are
camera files. A typical accommodation listing had one header image and **ten**
gallery images. Because Cloudinary takes transformations in the path, any size
or crop can be requested without asking anyone.

Two caveats, and the second is the serious one:

- `alt_text` was empty on both images I looked at. Not a problem for print.
- **Technically available is not the same as licensed.** These photographs
  belong to the businesses or to the photographers they commissioned, and were
  supplied to Visit Jersey for Visit Jersey's purposes. Using them in a Factory
  publication we sell advertising in is a permissions question to settle in
  writing before a single page is designed — per business, or once with Visit
  Jersey if they hold a broad enough licence to sublicense. Worth asking early,
  because the answer changes the production model: with images, the guide can
  be built from the data; without them, every page needs a photo request.

## What we already do with it

| | |
|---|---|
| `scripts/geocode-from-jersey-com.ts` | Locate delivery stops from the directory where Nominatim failed. **141 of our points independently confirmed, 22 sharpened from a street to a building, 6 filled.** |
| `scripts/export-jersey-com.ts` | One type → a 26-column CSV. The flattened view, for having the list in front of you. |
| `scripts/fill-contacts-from-jersey-com.ts` | Fill missing client addresses. Exact name tiers only — see the trap below. |
| `scripts/delivery-coverage.ts` | Their listings against our rounds: who we deliver to, who we miss. |
| `delivery_stops.directory_listing` / `_url` / `_match` | The directory listing a stop corresponds to, and whether it **is** that listing (`name`) or merely has one within 60m (`nearby`). |
| `geocode_source = 'jersey_com'` | Added in migration `0150`, so a point's origin is recorded. |

The decision record is in `DECISIONS.md` under *2026-10-17 — Visit Jersey as a
second source, and where it stops*.

## Traps, all of them learned the hard way

**A listing is not a location.** Some carry no pin at all. `toPlace` returns
null for those rather than defaulting to a parish centroid, and pins outside
Jersey's bounding box are rejected as entered wrong at their end.

**One business, several listings.** A hotel with a restaurant appears under both
`accommodation` and `food-and-drink`. `fetchDirectory` dedupes on lower-cased
name, which is crude but right for one front door.

**Names disagree with ours on principle.** Matching is tiered by what it costs
to be wrong (`lib/domain/stop-name-match.ts`). A delivery pin may be matched on
a name prefix because it lands on a map where somebody can see it. A client
address may not: the first run gave "The Victoria" the address of Victoria
Liddell Jewellery and "St Helier Ironworks" the parish of St Helier.

**Proximity is not identity.** Big J Takeaway was reported as "Jersey Oak"
because a listing stood 60m away. That is why `directory_match` distinguishes
`name` from `nearby`.

**`email_address` is a reservations inbox.** All 219 accommodation listings have
one and it is tempting, but on a company row our `contacts.email` is where
invoices go. A blank field beats an invoice sent somewhere plausible. We never
write it.

**Parish spellings vary.** "St. Saviour", "Saint Saviour" and "St Saviour" are
one parish; `tidyParish` normalises to ours. An `address_line_2` that just
repeats the parish is dropped, or FLOUR ends up at "6a Colomberie, St Helier,
St Helier". A line reading only "Jersey" is dropped too.

**A big disagreement is never resolved by rule.** Where our point and theirs are
kilometres apart it is usually the names that disagree, not the coordinates —
but not always and not predictably. Our Marks & Spencer is a vague point and
their King Street pin is right; our National Trust is 16 New Street, which is
correct, and their listing is the headquarters at The Elms. Both are printed and
a person decides.

**It is somebody else's schema and it will change without telling us.**
`RawItem.acf` is deliberately typed loosely. A rename of `high_season_rate`
breaks a column silently, and nothing will announce it.

**Freshness is per business, not per site.** Listings come from a partner portal
the businesses maintain themselves; `portal_last_synced` and `modified_gmt` are
per listing. Some will be years stale. For a dated print guide that is the
thing most likely to embarrass us — a hotel's rate or opening months carried
over from a listing nobody has touched since 2023.

## Change detection

Each post has `modified_gmt`, each listing an ACF `portal_last_synced`. Both are
cheap to store alongside whatever we import, which makes "what changed since the
last edition?" answerable without diffing the whole directory — the question any
annual guide asks first.

## The other sources we already hold

A print guide drawn only from Visit Jersey would be a reprint of their website.
What we have that they do not:

| Source | What it is good for |
|---|---|
| **Our own contacts and bookings** | Who is a client. Earns inclusion, a larger entry, or a sales call — and is the one fact Visit Jersey cannot supply. |
| **`delivery_stops`** | Where we already go, with coordinates and parishes, 300+ of them. The venues that actually stock us. |
| **ViaEuropa** (`lib/integrations/viaeuropa/client.ts`) | The Jersey address gazetteer with UPRNs, indexed by occupier name as well as street. The authoritative address, and a stable key to join on — better than a name. |
| **Freedom Holidays' property list** | 139 Jersey self-catering properties, 62 of which appear on no round of ours. A whole category of accommodation Visit Jersey lists thinly. |
| **The Jersey Insight directory** | Via Emma's prospect list: 658 businesses with spend tiers. Commercial intelligence, not visitor information. |
| **OpenStreetMap / Nominatim** (`lib/integrations/osm/geocode.ts`) | A fallback for places with no listing at all, with `geocode_precision` recording how far to trust each point. |
| **today.je** (`lib/integrations/todayje.ts`) | News, not listings. Mentioned only so nobody mistakes it for a venue source. |

## What a print-guide system would need beyond this

Not a design — the shape of the decisions, so they are taken on purpose.

1. **A canonical place record**, separate from every source. Visit Jersey's id,
   our stop, our contact and a UPRN are four keys for one front door; the guide
   needs one row they all hang off, with a recorded provenance per field so
   "where did this address come from?" is answerable. The precedent is
   `import_provenance` and the `xero_staging_contacts` → propose → review →
   apply pattern.
2. **Editorial copy kept apart from source copy.** Their `long_description` is
   their voice and their length. A guide needs ours, and needs to survive a
   re-import — the same rule that already protects a coordinate somebody
   corrected by hand.
3. **Inclusion rules somebody can state.** Ben's existing rule for distribution
   is a good model: *not on the Visit Jersey site is probably not right for the
   visitor guide, and peripheral for Gallery unless they are a client.* For the
   guide the rule has a commercial half too, and it should be a field, not a
   habit.
4. **A pagination and proofing step.** The data can fill a page; it cannot
   decide that the page is right. Whatever gets built should end in something a
   person signs off, and the A4 output in `scripts/plot-delivery-routes.ts` is
   the precedent for print-first HTML.
5. **Attribution and permission settled first.** Both the data and the images.
   Our export already carries their page URL on every row, which is the minimum;
   the licensing conversation is the blocker to start now rather than later.

## Etiquette

Public, unauthenticated and undocumented is not the same as unlimited. We send a
real contact in the User-Agent, pace the paging, cache every result in our own
rows so an address is asked about once ever, and credit the source in anything we
export. If a system is going to pull the whole directory on a schedule, that is
the point to tell Visit Jersey we are doing it — they have been a straightforward
organisation to deal with and an email costs nothing.
