import { describe, expect, it } from 'vitest';
import { updateBookScript } from '@/lib/idml/update-book';

describe('update-book.jsx', () => {
  const script = updateBookScript('26_4');
  it('names the edition’s documents and book', () => {
    expect(script).toContain("var ISSUE = '26_4';");
    expect(script).toContain("'whatson_events_' + ISSUE + '.idml'");
    expect(script).toContain("'vjvg_' + ISSUE + '.indb'");
  });
  it('replaces the merge files or its own earlier version', () => {
    const events = /^whatson_(merge_)?events_/i;
    expect(events.test('whatson_merge_events_26_3.indd')).toBe(true);
    expect(events.test('whatson_events_26_4.indd')).toBe(true);
    expect(script).toContain('replaces: /^whatson_(merge_)?tours_/i');
  });
  it('is plain ES3 for InDesign, and parses', () => {
    expect(script).not.toMatch(/=>|\blet |\bconst |`/);
    expect(() => new Function(script.replace(/^#target.*$/m, ''))).not.toThrow();
  });
});
