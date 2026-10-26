import { describe, expect, it } from 'vitest';
import { pickLead } from '@/lib/domain/lead';

const row = (title: string, next: string, eventTypes: string[], extra: Partial<{ highlight: boolean; headerImage: unknown; occurrence: string }> = {}) => ({
  title,
  next,
  event: { highlight: false, headerImage: { url: 'x' }, occurrence: 'one-off', eventTypes, ...extra },
});

// As on 18 October: the sausages came first by date.
const rows = [
  row('Bohemia Bar’s Oktoberfest', '2026-10-18', ['Arts & cultural', 'Food & drink', 'Seasonal'], { occurrence: 'dates' }),
  row('G&S Festival: a talk', '2026-10-18', ['Music', 'Talks & learning', 'Festivals']),
  row('Motorcycle Trials', '2026-10-18', ['Sports', 'Outdoor', 'Spectator'], { occurrence: 'dates' }),
  row('Beast of The East Half Marathon', '2026-10-25', ['Health & wellbeing', 'Sports', 'Outdoor', 'Spectator', 'Participant']),
  row('Far-off festival', '2026-12-20', ['Festivals', 'Participant', 'Spectator', 'Family friendly']),
];

describe('pickLead', () => {
  it('leads with the event that draws a crowd, not the next one', () => {
    expect(pickLead(rows, '2026-10-18')?.title).toBe('Beast of The East Half Marathon');
  });
  it('a staff highlight with a picture always wins', () => {
    const h = [...rows, row('Battle of Flowers', '2026-11-30', ['Food & drink'], { highlight: true })];
    expect(pickLead(h, '2026-10-18')?.title).toBe('Battle of Flowers');
  });
  it('needs a picture', () => {
    const noPic = rows.map((r) => (r.title.startsWith('Beast') ? { ...r, event: { ...r.event, headerImage: null } } : r));
    expect(pickLead(noPic, '2026-10-18')?.title).toBe('Motorcycle Trials');
  });
  it('falls back to the soonest when nothing scores', () => {
    // Rows come sorted by their next date, as publicEvents gives them.
    expect(pickLead([row('Wine tasting', '2026-10-19', ['Food & drink']), row('A talk', '2026-10-20', ['Talks & learning'])], '2026-10-18')?.title).toBe('Wine tasting');
  });
});
