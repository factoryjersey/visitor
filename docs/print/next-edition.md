# Next edition: what we learnt from vjvg_26_4

Winter 2026/27 went to print on 27 November 2026. This is what to carry into the spring guide.

## Workflow that worked
1. **guide.je builds the listing sections as IDML:** What's On, Tours, Visit, Beaches, Do, Pubs & bars and New this season. Export one section at a time from the admin guide page, with its start page; Send to Drive writes it into vjvg_working.
2. **update-book.jsx** saves each IDML as .indd and swaps it into the book in place of last edition's. Run it from InDesign's **Scripts panel** (Window > Utilities > Scripts, then User). Double-clicking a .jsx in Finder opens After Effects.
3. **After swapping documents in,** use Book panel menu > **Update Numbering > Update All Numbers** before exporting. Draft4 printed each section's own page numbers from 1 because this was skipped.
4. **Proofread from the IDML text** and against guide.je's data, then check each draft PDF against the list. A PDF **under 10 MB**, or attached directly, can be read; bigger ones can't through Drive.
5. **Fix listing errors in guide.je, not the IDML.** Events, tours and venues are re-exported every edition, so a fix made only in the file is lost next time. Lock the corrected field so the nightly import keeps it.

## Mistakes not to repeat
- **IDML text tools:** InDesign keeps special characters (page numbers, right-indent tabs) as `<?ACE n?>` inside the text. Anything that edits story text must leave them alone; escaping them printed `<?ACE 8?>` in draft4.
- **Find-and-replace on a phone number:** check whether two entries share it. Jersey Surf School and Bunker Yoga did; Grosnez and Mont Orgueil did.
- **A correction that ends with text the original already has** can double it ("JE2 3RR 3RR").
- **Advertisers' copy** (first person, "a la carte", "E-Bikes") is theirs to change, not ours.

## Carried over: not fixed in 26_4
- **Island Rib Voyages:** booked a double banner that didn't run. Last edition it was at the foot of "On demand on the water" (Summer 2026, p115). Make good next time.
- **Grosnez Castle** prints Mont Orgueil's number (853292). Use Jersey Heritage's 633300 or none.
- **NYE Gala Dinner:** the copy was about The Savoy but the venue block said Pomme d'Or. Check that the listing's venue is right in guide.je.
- **Jersey Heritage prices** on the Visit pages were last year's; guide.je takes prices from Visit Jersey. Add a price override if they stay wrong.
- **Facts on Be a Local:** Jersey a "member of the EEC" (it never was); "Prince of Orange William V" for the 1779 attempt (it was Nassau-Siegen, at St. Ouen's Bay); the population figure is the 2021 census.
- **Get Set:** the ports phone 446000 is the airport's; the taxi URL ends ".co"; the Ryde box is printed twice.
- **Eat:** The Loft, Cultura and Tallow each appear twice; Casa Paco printed Tavola's number; Botana has two different phones; Cafe Spice is tagged PORTUGUESE.
- **Stale copy** carried over from 26_1: Phire NEW, "this new Spanish", Salty Dog "New… last year", Locke's "just increased in size", Hettich "recently opened", Genuine Jersey "This year…", "during lockdown", "new skatepark".
- **Maps:** "Groznez", "Jersey Sea Sports Centre" (Sport), Valley Adventure Centre named two ways, "Quétival" (Quétivel), "Corbiere" without its accent; restaurant callout 1 is Indigo's but key 1 is Azure.
- **Tours index and Do directory** give different numbers for the same providers (AA 881111 / 881113, LQ, LMGC, AquaSplash, LJ). Both should come from guide.je.
- **Page count:** 134 pages isn't a multiple of 4. Check the imposition.
- **Do activities:** none has a picture in guide.je yet.
- **New this season:** no places were marked new this season in guide.je, so the section was empty.

Full detail: `docs/print/outstanding_draft5.md`, `docs/print/changes_vjvg_26_4.md`, `docs/print/vjvg_26_4_fixes.pdf`.
