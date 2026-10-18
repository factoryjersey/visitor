import type { Genre } from '@/lib/domain/genre';
import type { Occurrence } from '@/lib/domain/occurrence';
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * The canonical record. One row per front door, separate from every
 * source: a Visit Jersey listing, a factoryOS contact, a delivery stop
 * and a UPRN are four keys for the same place, and they all hang off
 * this row rather than any one of them being the place.
 */

export type Image = {
  url: string;
  publicId: string | null;
  alt: string | null;
  originalFilename: string | null;
};

/** Where one field's current value came from. */
export type FieldSource = { source: string; ref: string; at: string };
export type FieldSources = Record<string, FieldSource>;

export type EventDate = { date: string; start: string | null; end: string | null };

export const CATEGORIES = ['stay', 'eat-drink', 'see', 'do', 'shop'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Whether a place goes in the guide. A person sets it; an import never does. */
export const INCLUSIONS = ['candidate', 'included', 'excluded'] as const;

/**
 * How much room a venue gets, as the guide sells it: a line in the
 * area directory, a listing with its category label, or a 2/3 or full
 * entry with copy and a photo.
 */
export const LISTING_SIZES = ['directory', 'listing', 'two-thirds', 'full'] as const;
export type ListingSize = (typeof LISTING_SIZES)[number];
export type Inclusion = (typeof INCLUSIONS)[number];

export const places = pgTable('places', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').$type<Category>().notNull(),

  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  postcode: text('postcode'),
  parish: text('parish'),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),

  phone: text('phone'),
  website: text('website'),
  /** The public enquiries address. Fine in a visitor guide; never an invoice address. */
  email: text('email'),

  /** Source copy, as text. Their voice and their length. */
  summary: text('summary'),
  description: text('description'),
  /** Our copy. Never touched by an import. */
  guideCopy: text('guide_copy'),
  /** Where it sits in the guide: section "Eat", area "West", label "CASUAL". Ours. */
  guideSection: text('guide_section'),
  guideArea: text('guide_area'),
  guideLabel: text('guide_label'),
  listingSize: text('listing_size').$type<ListingSize>().notNull().default('listing'),

  facilities: text('facilities').array().notNull().default([]),
  accessibility: text('accessibility').array().notNull().default([]),
  /** Months open, 1–12. Empty means the source did not say. */
  openMonths: integer('open_months').array().notNull().default([]),
  lowRatePence: integer('low_rate_pence'),
  highRatePence: integer('high_rate_pence'),
  aaRating: text('aa_rating'),

  headerImage: jsonb('header_image').$type<Image | null>(),
  gallery: jsonb('gallery').$type<Image[]>().notNull().default([]),
  sourceLink: text('source_link'),

  inclusion: text('inclusion').$type<Inclusion>().notNull().default('candidate'),
  inclusionNote: text('inclusion_note'),
  /** Who decided, and when. The signed-in email. */
  inclusionSetBy: text('inclusion_set_by'),
  inclusionSetAt: timestamp('inclusion_set_at', { withTimezone: true }),
  /** Who last changed our copy, note or a locked field. */
  editedBy: text('edited_by'),
  editedAt: timestamp('edited_at', { withTimezone: true }),

  /** Join keys to systems this one does not own. */
  uprn: text('uprn'),
  factoryosContactId: text('factoryos_contact_id'),

  fieldSources: jsonb('field_sources').$type<FieldSources>().notNull().default({}),
  /** Fields a person has corrected. An import reads them and leaves them alone. */
  lockedFields: text('locked_fields').array().notNull().default([]),
  /** The newest modification any source reports for this place. */
  sourceModifiedAt: timestamp('source_modified_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary'),
  description: text('description'),
  guideCopy: text('guide_copy'),

  venue: text('venue'),
  venueName: text('venue_name'),
  addressLine1: text('address_line_1'),
  parish: text('parish'),
  postcode: text('postcode'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  eventTypes: text('event_types').array().notNull().default([]),
  free: boolean('free').notNull().default(false),
  /** One-off, specific dates, regular or ongoing: computed from the dates, lockable. See lib/domain/occurrence.ts. */
  occurrence: text('occurrence').$type<Occurrence>().notNull().default('one-off'),
  placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),

  dates: jsonb('dates').$type<EventDate[]>().notNull().default([]),
  startsOn: date('starts_on'),
  endsOn: date('ends_on'),
  fromPricePence: integer('from_price_pence'),
  toPricePence: integer('to_price_pence'),

  /**
   * What the guide prints instead of the computed dates, times or price,
   * when the computed one is wrong for print ("Every Saturday"). Ours;
   * an import never writes them.
   */
  printDates: text('print_dates'),
  printTimes: text('print_times'),
  printPrice: text('print_price'),

  headerImage: jsonb('header_image').$type<Image | null>(),
  sourceLink: text('source_link'),

  inclusion: text('inclusion').$type<Inclusion>().notNull().default('candidate'),
  inclusionNote: text('inclusion_note'),
  /** Who decided, and when. The signed-in email. */
  inclusionSetBy: text('inclusion_set_by'),
  inclusionSetAt: timestamp('inclusion_set_at', { withTimezone: true }),
  /** Who last changed our copy, note or a locked field. */
  editedBy: text('edited_by'),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  fieldSources: jsonb('field_sources').$type<FieldSources>().notNull().default({}),
  lockedFields: text('locked_fields').array().notNull().default([]),
  sourceModifiedAt: timestamp('source_modified_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every record a source has given us, kept whole. The raw payload is
 * the answer to "what did they say?" after we have changed our mind
 * about how to read it, and `modified_gmt` / `portal_last_synced` make
 * "what changed since the last edition?" a query rather than a diff.
 */
export const sourceRecords = pgTable(
  'source_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source').notNull(),
    externalType: text('external_type').notNull(),
    externalId: text('external_id').notNull(),
    placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    experienceId: uuid('experience_id').references(() => experiences.id, { onDelete: 'set null' }),
    payload: jsonb('payload').notNull(),
    modifiedAt: timestamp('modified_at', { withTimezone: true }),
    portalSyncedAt: timestamp('portal_synced_at', { withTimezone: true }),
    /** False once a source stops returning the record. Kept, not deleted. */
    present: boolean('present').notNull().default(true),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bySourceKey: uniqueIndex('source_records_source_key').on(t.source, t.externalType, t.externalId),
  }),
);

/**
 * Whoever runs a tour. The guide prints them once, in a key, with the
 * short code each tour entry refers to ("AA Absolute Adventures"). Codes
 * are ours and kept between editions.
 */
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  code: text('code').unique(),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  /** Their own directory listing, when there is one. */
  placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A tour or experience. Providers list everything they offer the same
 * way, so `occurrence` separates the ones on particular dates (printed
 * as dated listings) from the ones bookable any day (printed under
 * their genre, "on demand").
 */
export const experiences = pgTable('experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
  summary: text('summary'),
  description: text('description'),
  guideCopy: text('guide_copy'),

  duration: text('duration'),
  tags: text('tags').array().notNull().default([]),
  genre: text('genre').$type<Genre>(),
  dates: jsonb('dates').$type<EventDate[]>().notNull().default([]),
  occurrence: text('occurrence').$type<Occurrence>().notNull().default('ongoing'),
  fromPricePence: integer('from_price_pence'),
  toPricePence: integer('to_price_pence'),
  meetingPoint: text('meeting_point'),
  parish: text('parish'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),

  printDates: text('print_dates'),
  printTimes: text('print_times'),
  headerImage: jsonb('header_image').$type<Image | null>(),
  sourceLink: text('source_link'),

  inclusion: text('inclusion').$type<Inclusion>().notNull().default('candidate'),
  inclusionNote: text('inclusion_note'),
  inclusionSetBy: text('inclusion_set_by'),
  inclusionSetAt: timestamp('inclusion_set_at', { withTimezone: true }),
  editedBy: text('edited_by'),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  fieldSources: jsonb('field_sources').$type<FieldSources>().notNull().default({}),
  lockedFields: text('locked_fields').array().notNull().default([]),
  sourceModifiedAt: timestamp('source_modified_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
