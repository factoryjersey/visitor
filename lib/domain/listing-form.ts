import { z } from 'zod';
import { CATEGORIES, type EventDate, type ListingKind } from '@/lib/db/schema';
import { classifyOccurrence, type Occurrence } from './occurrence';

/**
 * What a provider may write on their own listings, and how a form reads.
 *
 * Only source-like fields: what the place or event is. Our side — our
 * copy, the guide section, inclusion, highlights, print overrides — stays
 * with staff. Pure, so the shape of a submission is tested.
 */

const text = (max: number) => z.string().trim().max(max).transform((s) => s || null);
const required = (max: number) => z.string().trim().min(1, 'Required').max(max);
const url = z
  .string()
  .trim()
  .max(300)
  .transform((s) => (s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : null))
  .refine((s) => s === null || URL.canParse(s), 'Not a web address');
const email = z.string().trim().toLowerCase().max(200).refine((s) => !s || z.string().email().safeParse(s).success, 'Not an email address').transform((s) => s || null);

/** "£12.50", "12.5", "12" to pence; blank to null. */
export function parsePence(raw: string): number | null | 'invalid' {
  const s = raw.trim().replace(/^£/, '').replace(/,/g, '');
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return 'invalid';
  return Math.round(Number(s) * 100);
}

const pence = z.string().transform((s, ctx) => {
  const v = parsePence(s);
  if (v === 'invalid') {
    ctx.addIssue({ code: 'custom', message: 'A price like 12.50' });
    return z.NEVER;
  }
  return v;
});

const LINE = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}[:.]\d{2})(?:\s*[-–]\s*(\d{1,2}[:.]\d{2}))?)?$/;
/** Date.parse calls 2026-02-30 the 2nd of March; this does not. */
const isRealDay = (iso: string) => {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === iso;
};
const isTime = (t: string | undefined) => {
  if (!t) return true;
  const [h, m] = t.split(/[:.]/).map(Number);
  return h! <= 23 && m! <= 59;
};
const hhmm = (t: string | undefined) => (t ? t.replace('.', ':').padStart(5, '0') : null);

/**
 * One date a line, optionally with times: "2026-11-14", "2026-11-14 19:30",
 * "2026-11-14 19:30-22:00". Sorted, one entry a day and time.
 */
export function parseDates(raw: string): { dates: EventDate[]; bad: string[] } {
  const dates: EventDate[] = [];
  const bad: string[] = [];
  for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = LINE.exec(line);
    if (!m || !isRealDay(m[1]!) || !isTime(m[2]) || !isTime(m[3])) {
      bad.push(line);
      continue;
    }
    dates.push({ date: m[1]!, start: hhmm(m[2]), end: hhmm(m[3]) });
  }
  const seen = new Set<string>();
  const unique = dates.filter((d) => {
    const k = `${d.date} ${d.start}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  unique.sort((a, b) => `${a.date} ${a.start ?? ''}`.localeCompare(`${b.date} ${b.start ?? ''}`));
  return { dates: unique, bad };
}

/** The inverse of parseDates, for the form. */
export function datesText(dates: readonly EventDate[]): string {
  return dates.map((d) => [d.date, d.start && (d.end ? `${d.start}-${d.end}` : d.start)].filter(Boolean).join(' ')).join('\n');
}

const dates = z.string().max(20_000).transform((s, ctx) => {
  const { dates, bad } = parseDates(s);
  if (bad.length) ctx.addIssue({ code: 'custom', message: `Not a date: ${bad.slice(0, 3).join(', ')}` });
  if (!dates.length) ctx.addIssue({ code: 'custom', message: 'At least one date' });
  return dates;
});

const venue = z.object({
  name: required(200),
  category: z.enum(CATEGORIES),
  addressLine1: text(200),
  addressLine2: text(200),
  parish: text(60),
  postcode: text(12),
  phone: text(40),
  email,
  website: url,
  summary: text(600),
  description: text(6000),
});

const event = z.object({
  title: required(200),
  summary: text(600),
  description: text(6000),
  placeId: z.union([z.string().uuid(), z.literal('')]).transform((s) => s || null),
  venueName: text(200),
  addressLine1: text(200),
  parish: text(60),
  postcode: text(12),
  phone: text(40),
  email,
  website: url,
  dates,
  fromPricePence: pence,
  toPricePence: pence,
  free: z.string().optional().transform((s) => s === 'on' || s === 'true'),
});

const experience = z.object({
  title: required(200),
  summary: text(600),
  description: text(6000),
  duration: text(80),
  meetingPoint: text(200),
  parish: text(60),
  phone: text(40),
  email,
  website: url,
  dates,
  fromPricePence: pence,
  toPricePence: pence,
});

export const LISTING_SCHEMAS = { venue, event, experience } as const;
export type ListingValues = {
  venue: z.infer<typeof venue>;
  event: z.infer<typeof event>;
  experience: z.infer<typeof experience>;
};

/** The fields a provider writes, by kind. Everything else on the row is ours or derived. */
export const PROVIDER_FIELDS = {
  venue: Object.keys(venue.shape),
  event: Object.keys(event.shape),
  experience: Object.keys(experience.shape),
} as Record<ListingKind, string[]>;

export type ParseResult<K extends ListingKind> =
  | { ok: true; values: ListingValues[K] }
  | { ok: false; errors: Record<string, string> };

/** Read a submitted form. Unknown fields are dropped, so a form cannot reach our columns. */
export function parseListingForm<K extends ListingKind>(kind: K, form: Record<string, FormDataEntryValue | undefined>): ParseResult<K> {
  const schema = LISTING_SCHEMAS[kind] as z.ZodTypeAny;
  const input: Record<string, string> = {};
  for (const k of PROVIDER_FIELDS[kind]) {
    const v = form[k];
    if (typeof v === 'string') input[k] = v;
    else if (k !== 'free') input[k] = '';
  }
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    const values = parsed.data as ListingValues[K] & { fromPricePence?: number | null; toPricePence?: number | null };
    if (values.fromPricePence != null && values.toPricePence != null && values.toPricePence < values.fromPricePence) {
      return { ok: false, errors: { toPricePence: 'Lower than the from price' } };
    }
    return { ok: true, values };
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? 'form');
    errors[k] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Columns that follow from the dates: the range, and which kind of listing it is. */
export function derivedFromDates(kind: 'event' | 'experience', dates: readonly EventDate[], locked: readonly string[]) {
  const days = dates.map((d) => d.date);
  const derived: { startsOn?: string | null; endsOn?: string | null; occurrence?: Occurrence } = {};
  if (kind === 'event') {
    derived.startsOn = days[0] ?? null;
    derived.endsOn = days.at(-1) ?? null;
  }
  if (!locked.includes('occurrence')) derived.occurrence = classifyOccurrence(days, { tour: kind === 'experience', starts: dates.map((d) => d.start) });
  return derived;
}

/** Canonical JSON, so a jsonb round trip compares equal. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** The submitted fields that differ from the listing as it stands. */
export function changedFields(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (canonical(current[k]) !== canonical(v)) out[k] = v;
  }
  return out;
}
