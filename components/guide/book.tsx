'use client';

import { BadgeCheck, Clock, MapPin } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { tourWhen, type GuideEvent, type GuideTour, type GuideVenue, type Layout } from '@/lib/domain/guide-entry';
import type { GuideProvider } from '@/lib/guide';

/**
 * The guide's pages as the 2026 editions print them, from the InDesign
 * merge files: 230 × 165mm spreads of two 115 × 165mm pages. Events on a
 * two-column grid, orange; walks and tours in one ruled
 * column, green, after the providers' key. A coloured tab and the folio
 * on each outer edge. Proxima Nova where the browser has it (Adobe
 * Fonts), Barlow Semi Condensed where it does not.
 *
 * Events six to a page, the pictured pair across the top and four
 * listings under them; or on a grid of six or eight boxes, one of them a
 * picture beside its listing. Event cells are fixed, as the merge frames are; tours and the key flow,
 * so they are measured here and poured page by page. What will not fit a
 * frame is outlined red on screen, as InDesign marks overset text.
 */

export type Section = { name: string; colour: string };
const EVENTS: Section = { name: 'Events this season', colour: '#f58353' };
const TOURS: Section = { name: 'Walks and tours', colour: '#add581' };

/** A page marker: a second tab under the section's, naming the part of the section the page is in. */
type Page = { section: Section; body: ReactNode; bleed?: boolean; marker?: string };

/** Content height of a flowing page, in mm: 8.5mm from the top to 150mm. */
const FLOW_MM = 141.5;
const MM = 96 / 25.4;

function Folio({ n, side }: { n: number; side: 'left' | 'right' }) {
  return <div className={`gp-folio gp-${side}`}><span>{n}</span></div>;
}

function Frame({ page, n }: { page: Page; n: number }) {
  const side = n % 2 === 0 ? 'left' : 'right';
  return (
    <div className={`gp-page gp-${side}${page.bleed ? ' gp-bleed' : ''}`}>
      <div className={`gp-tab gp-${side}`} style={{ background: page.section.colour }}><span>{page.section.name}</span></div>
      {page.marker && <div className={`gp-tab gp-marker gp-${side}`}><span>{page.marker}</span></div>}
      <Folio n={n} side={side} />
      {page.body}
    </div>
  );
}

/**
 * A fixed frame that fits its own copy: it tries the fullest version,
 * measures, and steps to the next shorter until one fits, again once the
 * typeface has loaded. A sentence matters more than the phone number, so
 * if none fits with the phone line, it tries again without it. Overset
 * only if even the dates, title and venue will not fit.
 */
function EventCell({ e }: { e: GuideEvent }) {
  if (e.frame === 'image') return <PictureBox e={e} />;
  return <ListingCell e={e} />;
}

/** A grid's picture box: the whole cell, cropped to fill. */
function PictureBox({ e }: { e: { title: string; preview: string } }) {
  return (
    <figure className="gp-event gp-image" title={e.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={e.preview.replace(/w_520,h_182/, 'w_520,h_520')} alt="" />
    </figure>
  );
}

/**
 * A fixed frame's copy, measured: the fullest version first, then each
 * shorter one, then all of them again without the droppable line.
 */
function useFit(copies: string[], droppable: boolean) {
  const ref = useRef<HTMLElement>(null);
  const said = copies.filter(Boolean);
  const options: [string, boolean][] = [...said.map((c): [string, boolean] => [c, true]), ...(droppable ? said.map((c): [string, boolean] => [c, false]) : []), ['', true]];
  const [pick, setPick] = useState(0);
  const [fonts, setFonts] = useState(false);
  const [overset, setOverset] = useState(false);
  useEffect(() => {
    void document.fonts.ready.then(() => {
      setPick(0);
      setFonts(true);
    });
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const over = el.scrollHeight > el.clientHeight + 1;
    if (over && pick < options.length - 1) setPick(pick + 1);
    else setOverset(over);
  }, [pick, fonts, options.length]);
  const [copy, keep] = options[pick] ?? ['', true];
  return { ref, copy, keep, overset };
}

const OVERSET = 'Overset: this entry will not fit its frame';

function ListingCell({ e }: { e: GuideEvent }) {
  const { ref, copy, keep: withContact, overset } = useFit(e.options.length ? e.options : [e.copy], !!e.contact);
  return (
    <article ref={ref} className={`gp-event gp-${e.frame}${overset ? ' gp-overset' : ''}`} title={overset ? OVERSET : undefined}>
      {e.frame === 'picture' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.preview} alt="" className="gp-event-image" />
      )}
      <p className="gp-event-when">{e.dates}{e.times && <em>{e.times}</em>}</p>
      <h4 className="gp-event-title">{e.title}</h4>
      <p className="gp-event-copy">{copy} {e.price && <span className="gp-price">{e.price}</span>}</p>
      {e.venue && <p className="gp-event-venue"><MapPin aria-hidden="true" />{e.venue}</p>}
      {e.address && <p className="gp-event-address">{e.address}</p>}
      {e.contact && withContact && <p className="gp-event-contact">{e.contact}</p>}
      {e.website && <p className="gp-event-web">{e.website}</p>}
    </article>
  );
}

/** A tour on the grid: when, or its genre on the on-demand pages; the title; the copy; the provider's code, found in the key, and the duration. */
function TourBox({ t }: { t: GuideTour }) {
  const { ref, copy, overset } = useFit(t.options.length ? t.options : [t.copy], false);
  if (t.frame === 'image') return <PictureBox e={t} />;
  return (
    <article ref={ref} className={`gp-event gp-listing gp-tour-box${overset ? ' gp-overset' : ''}`} title={overset ? OVERSET : t.provider}>
      <p className="gp-event-when">{tourWhen(t)}{t.times && <em>{t.times}</em>}</p>
      <h4 className="gp-event-title">{t.title}</h4>
      <p className="gp-event-copy">{copy}</p>
      <p className="gp-tour-meta">
        {t.code ? <span className="gp-code"><BadgeCheck aria-hidden="true" />{t.code}</span> : <span className="gp-code">{t.provider}</span>}
        {t.duration && <span className="gp-duration"><Clock aria-hidden="true" />{t.duration}</span>}
      </p>
    </article>
  );
}

/** The section's first page: a picture across it and the section's name. */
function Opener({ e }: { e: GuideEvent | undefined }) {
  return (
    <div className="gp-opener">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e?.preview && <img src={e.preview.replace(/w_520,h_182/, 'w_1000,h_1440')} alt="" />}
      <h2>Events<br />this season</h2>
      {e && <p className="gp-caption">{e.dates} : &lsquo;{e.title}&rsquo;</p>}
    </div>
  );
}

function HighlightBody({ e }: { e: GuideEvent }) {
  return (
    <div className="gp-content gp-highlight">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.preview && <img src={e.preview.replace(/w_520,h_182/, 'w_1000,h_700')} alt="" className="gp-highlight-image" />}
      <p className="gp-event-when">{e.dates}{e.times && <em>{e.times}</em>}</p>
      <h3 className="gp-highlight-title">{e.title}</h3>
      <div className="gp-highlight-copy">{e.extendedCopy.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
      {e.price && <p className="gp-price">{e.price}</p>}
      {e.venue && <p className="gp-event-venue"><MapPin aria-hidden="true" />{e.venue}</p>}
      {e.address && <p className="gp-event-address">{e.address}</p>}
      {e.website && <p className="gp-event-web">{e.website}</p>}
    </div>
  );
}

function TourEntry({ t }: { t: GuideTour }) {
  return (
    <article className="gp-tour">
      <p className="gp-tour-head">
        {t.dates && <b>{t.dates}</b>} <span className="gp-tour-title">{t.title}</span>
        {t.code && <span className="gp-code"><BadgeCheck aria-hidden="true" />{t.code}</span>}
        {t.duration && <span className="gp-duration"><Clock aria-hidden="true" />{t.duration}</span>}
        {t.times && <span className="gp-duration">{t.times}</span>}
      </p>
      <p className="gp-tour-copy">{t.copy}</p>
    </article>
  );
}

function ProviderRow({ p }: { p: GuideProvider }) {
  return (
    <p className="gp-provider">
      <BadgeCheck aria-hidden="true" /><b>{p.code || '??'}</b> {p.name} <strong>{p.contact}</strong> <em>{p.website}</em>
    </p>
  );
}

function TourHeading({ over, title, rest }: { over: string; title: string; rest: string }) {
  return (
    <div className="gp-tour-heading">
      <p>{over}</p>
      <h3><b>{title}</b> {rest}</h3>
    </div>
  );
}

type Flow = { key: string; node: ReactNode; heading?: boolean };

/**
 * Pours flowing items into pages of FLOW_MM: each is measured at the
 * page's width, and a heading is never left at the foot of a page.
 */
function usePoured(items: Flow[]): [Flow[][] | null, ReactNode] {
  const ref = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Flow[][] | null>(null);
  useLayoutEffect(() => {
    let cancelled = false;
    const pour = () => {
      const el = ref.current;
      if (!el || cancelled) return;
      const heights = [...el.children].map((c) => (c as HTMLElement).offsetHeight);
      const max = FLOW_MM * MM;
      const out: Flow[][] = [[]];
      let used = 0;
      items.forEach((item, i) => {
        const h = heights[i] ?? 0;
        const next = items[i + 1];
        const needed = item.heading && next ? h + (heights[i + 1] ?? 0) : h;
        if (used > 0 && used + needed > max) {
          out.push([]);
          used = 0;
        }
        out.at(-1)!.push(item);
        used += h;
      });
      setPages(out.filter((p) => p.length));
    };
    // Measure once the type is in, or the pages are cut for the wrong font.
    void document.fonts.ready.then(pour);
    return () => {
      cancelled = true;
    };
  }, [items]);
  const measure = (
    <div ref={ref} className="gp-measure" aria-hidden="true">
      {items.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
    </div>
  );
  return [pages, pages ? null : measure];
}

export function GuideBook(props: {
  highlights: GuideEvent[];
  events: GuideEvent[];
  pages: GuideEvent[][];
  layout: Layout;
  tours: GuideTour[];
  /** On a grid layout, the tours a page at a time after the key; otherwise they flow. */
  tourGrid: GuideTour[][] | null;
  providers: GuideProvider[];
  venues: GuideVenue[];
  firstPage: number;
}) {
  const { highlights, events, tours, providers, layout, tourGrid } = props;

  // Walks and tours flow: the key, then dated tours, then on-demand ones by genre.
  const [flow] = useState<Flow[]>(() => {
    const items: Flow[] = [];
    if (providers.length) {
      items.push({ key: 'key-h', heading: true, node: <h3 className="gp-key-heading">Tour Guides &amp; Providers</h3> });
      providers.forEach((p) => items.push({ key: `p-${p.code}-${p.name}`, node: <ProviderRow p={p} /> }));
      items.push({ key: 'key-end', node: <div className="gp-break" /> });
    }
    // On the grid, the tours have pages of their own after the key, and each box says when or what kind.
    if (tourGrid) return items;
    const dated = tours.filter((t) => t.kind === 'dated');
    if (dated.length) {
      items.push({ key: 'dated-h', heading: true, node: <TourHeading over="Tours & Experiences" title="On" rest="these dates" /> });
      dated.forEach((t, i) => items.push({ key: `d-${i}-${t.title}`, node: <TourEntry t={t} /> }));
    }
    const genres = [...new Set(tours.filter((t) => t.kind === 'on demand').map((t) => t.genre || 'Other'))];
    for (const g of genres) {
      items.push({ key: `g-${g}`, heading: true, node: <TourHeading over="Tours & Experiences" title="On demand" rest={g.toLowerCase()} /> });
      tours.filter((t) => t.kind === 'on demand' && (t.genre || 'Other') === g).forEach((t, i) => items.push({ key: `o-${g}-${i}-${t.title}`, node: <TourEntry t={t} /> }));
    }
    return items;
  });
  const [tourPages, measuring] = usePoured(flow);

  // The opener's picture: the first highlight's, else the first event with its own picture.
  const lead = highlights.find((e) => e.preview) ?? events.find((e) => e.preview);
  const pages: Page[] = [];
  if (events.length || highlights.length) pages.push({ section: EVENTS, bleed: true, body: <Opener e={lead} /> });
  for (const h of highlights) pages.push({ section: EVENTS, body: <HighlightBody e={h} /> });
  for (const cells of props.pages) {
    pages.push({
      section: EVENTS,
      body: (
        <div className={`gp-content gp-grid gp-${layout}`}>
          {cells.map((e) => <EventCell key={e.frame + e.title + e.sortKey} e={e} />)}
        </div>
      ),
    });
  }
  // Tours start on a left-hand page, as a section does in the guide.
  if (tourPages && (tourPages.length || tourGrid?.length)) {
    if ((props.firstPage + pages.length) % 2 === 1) pages.push({ section: EVENTS, body: <div className="gp-content" /> });
    for (const items of tourPages) pages.push({ section: TOURS, body: <div className="gp-content gp-flow">{items.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}</div> });
    // The key opens the section: every tour page sends the reader back to it.
    const keyPage = props.firstPage + pages.length - tourPages.length;
    for (const cells of tourGrid ?? []) {
      pages.push({
        section: TOURS,
        marker: cells[0]?.kind === 'dated' ? 'On these dates' : 'On demand',
        body: (
          <>
            <div className="gp-content gp-grid gp-grid8 gp-tour-grid">
              {cells.map((t) => <TourBox key={t.frame + t.title + t.sortKey + t.dates} t={t} />)}
            </div>
            {providers.length > 0 && <p className="gp-tour-footer"><BadgeCheck aria-hidden="true" />Locate guide on index page {keyPage}</p>}
          </>
        ),
      });
    }
  }

  // Into spreads: the first page faces left or right by its number.
  const numbered = pages.map((p, i) => ({ page: p, n: props.firstPage + i }));
  const spreads: (typeof numbered[number] | null)[][] = [];
  let k = 0;
  if (numbered[0] && numbered[0].n % 2 === 1) spreads.push([null, numbered[k++]!]);
  for (; k < numbered.length; k += 2) spreads.push([numbered[k]!, numbered[k + 1] ?? null]);

  return (
    <div className="gp-book">
      {measuring}
      {!tourPages && tours.length > 0 && <p className="no-print text-sm text-stone-500">Laying out the tours…</p>}
      {spreads.map((pair, i) => (
        <div key={i} className="gp-spread">
          {pair.map((x, j) => (x ? <Frame key={x.n} page={x.page} n={x.n} /> : <div key={`blank-${j}`} className="gp-page gp-blank" />))}
        </div>
      ))}
    </div>
  );
}
