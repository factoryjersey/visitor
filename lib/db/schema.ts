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
  placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),

  dates: jsonb('dates').$type<EventDate[]>().notNull().default([]),
  startsOn: date('starts_on'),
  endsOn: date('ends_on'),
  fromPricePence: integer('from_price_pence'),
  toPricePence: integer('to_price_pence'),

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

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
