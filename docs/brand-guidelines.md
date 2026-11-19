# The Visitor Guide: brand guidelines

How the printed Visitor Guide and guide.je follow the **Jersey Brand Guidelines** (Visit Jersey, 2026).
Theirs set the brand; this sets how the guide applies it. Where the two differ, the guide's format
(a 115 × 165mm pocket book full of small listings) is the reason, and the difference is noted.

The code follows this file: `lib/domain/guide-colours.ts` (colours), `app/globals.css` (print
and site type), `tailwind.config.ts` (site type), `components/guide/maps.tsx` (maps).

## Type

| Use | Jersey | The guide, print | guide.je |
|---|---|---|---|
| Headlines, section and index headings | GT Flaire Extra Regular | GT Flaire Extra Regular | GT Flaire Extra Regular |
| Taglines (opener pages) | GT Flaire Extra, uppercase | the same | the same |
| Body copy | Google Sans Flex Light | Google Sans Flex Light, 87.5% width | Google Sans Flex Light |
| Picking things out (names, dates, labels) | Google Sans Flex Medium | Medium; event and tour dates bold | Medium |

- **GT Flaire never sets body copy**, and only comes in Regular: never bold, never faked bold.
- Headline line height 110%, letter spacing 0. Body line height 140% on the site and in longer copy
  (highlights, full-page venues). **Print exception:** listing boxes and directory lines are set at
  104–120% to fit the grid, as the guide always has been.
- **Print exception:** the guide's copy is Google Sans Flex at 87.5% width (its width axis), which
  keeps a listing box's words in its box the way the old condensed face did. Headlines stay normal width.
- **Licences:** Google Sans Flex is free (SIL Open Font License); the site serves it itself.
  GT Flaire Extra is Grilli Type's and needs a desktop licence for InDesign and a web licence for
  guide.je. Until the web files are in `public/fonts` (see `app/globals.css`), guide.je and the
  proofs set headings in Google Sans Flex. They use GT Flaire wherever it is installed.

## Colour

The Jersey palette, as the guidelines give it. CMYK is converted from RGB: **confirm it with Visit
Jersey or the printer before press.**

| Colour | Hex | RGB | CMYK (converted) | In the guide |
|---|---|---|---|---|
| Sand | `#F4F2DC` | 244 242 220 | 0 1 10 4 | Map land; panels behind text |
| Light blue | `#A4FEFF` | 164 254 255 | 36 0 0 0 | Map pages' tab; the sea, tinted |
| Green | `#A4C43C` | 164 196 60 | 16 0 69 23 | **Eat**; tour markers; map green spaces |
| Orange | `#F64E16` | 246 78 22 | 0 68 91 4 | **What's On**, **New this season**; main roads |
| Deep blue | `#022E3C` | 2 46 60 | 97 23 0 76 | **All text**; **Do**; folios |
| Blue | `#2A55EB` | 42 85 235 | 82 64 0 8 | **Visit** |
| Dark green | `#1D521E` | 29 82 30 | 65 0 63 68 | **Tours and experiences** |
| Maroon | `#61140C` | 97 20 12 | 0 79 88 62 | **Buy** |

**Primary pairings** (Jersey's two lead combinations, for covers, openers and adverts): blue with
light blue; green with dark green.

### Rules for colour

1. **Text is deep blue, or white on a dark colour**, with one exception the guide makes on purpose:
   in What's On and tours, an event's or tour's **title is in the section's colour** and its **date in
   bold at 50% of the section's colour**, with the times on their own line under the title. Everything
   else (venue names, copy, prices, contacts) stays deep blue; section colour otherwise goes on the
   tab, the rules, the chips and the markers.
2. Type on the page markers (the edge tabs), chips, folios and numbered map markers is **white**, on
   every colour but light blue and sand, where it is deep blue (`markerText` in the code).
3. Light blue and sand are backgrounds only: as rules or type on white paper they disappear.
4. Tints (for chips and second tabs) are the section colour at 20% and 60%, as before.

## The guide's sections

| Section | Colour | Tab type |
|---|---|---|
| What's On (events) | Orange | White |
| Tours and experiences | Dark green (rules), green (markers) | White |
| New this season | Orange | White |
| Visit | Blue | White |
| Eat | Green | White |
| Do | Deep blue | White |
| Buy | Maroon | White |
| Beaches (after See; by coast) | Blue; the Beachlife page on sand | White |
| Pubs & bars (last; St Helier, East, West; grid of 16) | Blue | White |
| Maps | Light blue | Deep blue |

## Maps

Drawn from OpenStreetMap on a quiet, neutral base so the markers are what you see: off-white land,
a pale grey-blue sea, roads in white cased in grey and graded by width (the island leaves out its
lanes), green spaces and the National Park only faintly tinted, place and street names in soft grey.
**Colour belongs to the markers**: by category, Attractions orange, Heritage & culture maroon,
Shopping blue, Restaurants dark green, Activity deep blue, Pubs green (St Helier: Bars orange,
Coffee & cakes green, Activity & travel deep blue), with white numbers. Index headings in GT Flaire
with a rule in the category's colour. Credit: "Map data © OpenStreetMap contributors".

## Layout and imagery

- The Beaches section opens on the Beachlife spread: a beach full bleed under BEACHLIFE (as What's On's
  opener), then the introduction on sand, edge to edge, with four beaches pictured and the tides, safe
  swimming and BeachAbility notes. Jersey's palette has no yellow; sand is the nearest, and a
  background colour by its rules, so type on it stays deep blue.
- Section tabs run down the outer edge of the page, as in the 2026 editions (tabs across the top
  were tried and not taken). Tabs, folios, chips and pictures have slightly rounded corners (1mm;
  0.6mm on the chips); a tab's outer edge, at the trim, stays square.

- Keep each page to a few things, with room around them; let headlines be large.
- Photography shows the experience: close, bright, candid ("proximity over observation").
- Illustration (Jersey's library) adds personality on openers and covers; never as icons for
  activities. The guide's small key icons are UI icons, kept for function only.
- The Jersey logo: top left, or bottom left when it is the only brand; top left with partners.
  Minimum 30mm wide in print, clear space of two "J"s.

## What changed from the 2026 editions

- Type: Proxima Nova and Proxima Nova Condensed become Google Sans Flex and GT Flaire Extra.
- Bold becomes Medium throughout.
- Venue names and prices are no longer printed in the section colour, but in deep blue; event and
  tour titles stay in it, with their dates in bold at 50%, and the times beside the dates (the editor's
  winter 2026 proofs moved them up from under the title, to give the copy room).
- Section colours: Visit teal becomes blue; Eat field green becomes Jersey green; Do midnight blue
  becomes deep blue; Buy plum becomes maroon; events orange becomes Jersey orange; tours green
  becomes dark green.
- Black (folios, captions) becomes deep blue.

## The editor's house style (winter 2026 proofs)

Elliott's marks on the first winter 2026 proofs, made rules so every proof keeps to them
(lib/domain/house-style.ts, lib/domain/event-tours.ts, components/guide/book.tsx):

- Dates: the days of a month with commas, then the month: "5, 6, 20 DEC", "4, 11, 18 DEC", "19, 20 DEC";
  across months "12 DEC, 16 JAN". A run with a hyphen: "8-13 DEC", "1-31 DEC", "18 DEC - 3 JAN"
  (no more "UNTIL", "&" or "6/20").
- Times on the date's line. More than two different times (a show's matinees and evenings) print
  none: they confused more than they told. A time typed into the listing's print field still prints.
- Addresses print each part once: no repeated parish or postcode, no "Jersey", no stray "-JE2".
- Phone numbers carry the trunk 0 once: "+44 (0) 1534", never "+44 (0) 01534".
- Titles: "St." with its stop ("St. Lawrence"); La, Le and Les capitalised as the start of a Jersey
  place name ("La Hougue Bie"); a booking site's date on the end of a title ("Walk 3 4/12/26") goes.
- A tour guide's walks listed as events (a title opening with the name of a provider who has tours in
  the guide, "Stroll In Jersey Twilight Walk…") print with the tours, not in What's On, and not at all
  when the guide's own tour that day is already printed.
- No box goes without copy: at worst its shortest sentence, flagged overset in the proof.
- On-demand tours sit on the grid of six as the dated ones do, so their copy runs to its full
  length; their side marker is deep blue, apart from On specific dates' green.
- The provider key: websites a size down so the whole address shows; a social page prints as its
  address ("facebook.com"); each tour page's foot reads "Tour Guide & Activity Provider Index on
  Pages 18-19", with the key's real pages.
