/**
 * The front page's lead picture: a staff highlight when there is one,
 * otherwise the coming event that draws a crowd. A half marathon, a
 * festival or a family day out, not the next talk or a bar's sausage
 * night: types for many people score, types for a few count against.
 * Within the next three weeks, so it is not something far off, the
 * soonest of the best.
 */

const CROWD: Record<string, number> = {
  Festivals: 3,
  Participant: 2,
  Spectator: 2,
  Sports: 2,
  'Family friendly': 1,
  Music: 1,
  Outdoor: 1,
  Seasonal: 1,
  Charity: 1,
};
const FEW: Record<string, number> = {
  'Food & drink': -2,
  'Talks & learning': -2,
  'Business & networking': -5,
  Nightlife: -1,
  'Health & wellbeing': -1,
};

export const crowdScore = (types: readonly string[]) => types.reduce((s, t) => s + (CROWD[t] ?? 0) + (FEW[t] ?? 0), 0);

const WINDOW_DAYS = 21;

export function pickLead<T extends { next: string; event: { highlight: boolean; headerImage: unknown; eventTypes: string[]; occurrence: string } }>(
  rows: readonly T[],
  today: string,
): T | undefined {
  const pictured = rows.filter((r) => r.event.headerImage);
  const highlight = pictured.find((r) => r.event.highlight);
  if (highlight) return highlight;
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const soon = pictured.filter((r) => r.next <= until && (r.event.occurrence === 'one-off' || r.event.occurrence === 'dates'));
  const best = [...soon].sort((a, b) => crowdScore(b.event.eventTypes) - crowdScore(a.event.eventTypes) || a.next.localeCompare(b.next))[0];
  return best && crowdScore(best.event.eventTypes) > 0 ? best : (soon[0] ?? pictured[0]);
}
