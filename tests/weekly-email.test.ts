import { afterEach, describe, expect, it, vi } from 'vitest';

const env = { RESEND_API_KEY: undefined as string | undefined, EMAIL_FROM: 'Visitor <hello@visitor.je>', NEXT_PUBLIC_APP_URL: 'https://visitor.je' };
vi.mock('@/lib/env', () => ({ env }));

afterEach(() => {
  env.RESEND_API_KEY = undefined;
  vi.unstubAllGlobals();
});

const item = (over: Partial<import('@/lib/email/weekly').WeeklyItem> = {}): import('@/lib/email/weekly').WeeklyItem => ({
  title: 'Legally Blonde',
  href: 'https://visitor.je/whats-on/legally-blonde',
  image: 'https://img.example/lb.jpg',
  alt: '',
  day: '2026-10-29',
  time: '19:30',
  where: 'Jersey Opera House, St. Helier',
  price: '£18.00 - £32.00',
  summary: null,
  highlight: false,
  ...over,
});

const links = { leave: 'https://visitor.je/subscribe/leave/tok', oneClick: 'https://visitor.je/api/unsubscribe?t=tok' };

describe('the weekly email', () => {
  it('names the week, within a month and across two', async () => {
    const { weekLabel, longDay } = await import('@/lib/email/weekly');
    expect(weekLabel('2026-10-29', '2026-11-04')).toBe('29 October – 4 November');
    expect(weekLabel('2026-11-05', '2026-11-11')).toBe('5 – 11 November');
    expect(longDay('2026-10-29')).toBe('Thursday 29 October');
  });

  it('puts highlights with pictures first, then the rest by day and time', async () => {
    const { arrange } = await import('@/lib/email/weekly');
    const a = arrange([
      item({ title: 'Late show', day: '2026-10-30', time: '21:00' }),
      item({ title: 'Big festival', highlight: true, day: '2026-10-31' }),
      item({ title: 'Early show', day: '2026-10-30', time: '10:00' }),
      item({ title: 'No picture highlight', highlight: true, image: null, day: '2026-10-29' }),
    ]);
    expect(a.highlights.map((i) => i.title)).toEqual(['Big festival']);
    expect(a.days.map(([d, items]) => [d, items.map((i) => i.title)])).toEqual([
      ['2026-10-29', ['No picture highlight']],
      ['2026-10-30', ['Early show', 'Late show']],
    ]);
    expect(a.more).toBe(0);
  });

  it('counts what is left for the website past forty', async () => {
    const { arrange, MAX_LISTED } = await import('@/lib/email/weekly');
    const a = arrange(Array.from({ length: MAX_LISTED + 5 }, (_, n) => item({ title: `Event ${n}` })));
    expect(a.days.flatMap(([, i]) => i)).toHaveLength(MAX_LISTED);
    expect(a.more).toBe(5);
  });

  it('escapes listings, links to the week, and carries one-click unsubscribe', async () => {
    const { weeklyEmail } = await import('@/lib/email/weekly');
    const e = weeklyEmail({ from: '2026-10-29', to: '2026-11-04', items: [item({ title: 'Rock & <Roll>' })] }, links);
    expect(e.subject).toBe('What’s on in Jersey, 29 October – 4 November');
    expect(e.html).toContain('Rock &amp; &lt;Roll&gt;');
    expect(e.html).not.toContain('<Roll>');
    expect(e.text).toContain('Rock & <Roll>');
    expect(e.html).toContain('https://visitor.je/whats-on?from=2026-10-29&amp;to=2026-11-04');
    expect(e.html).toContain('href="https://visitor.je/subscribe/leave/tok"');
    expect(e.text).toContain('https://visitor.je/subscribe/leave/tok');
    expect(e.headers).toEqual({ 'List-Unsubscribe': '<https://visitor.je/api/unsubscribe?t=tok>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
  });

  it('asks a new subscriber to confirm, with the link behind the button and in the text', async () => {
    const { subscribeConfirmEmail } = await import('@/lib/email/templates');
    const e = subscribeConfirmEmail({ link: 'https://visitor.je/subscribe/confirm/abc' });
    expect(e.html).toContain('href="https://visitor.je/subscribe/confirm/abc"');
    expect(e.text).toContain('https://visitor.je/subscribe/confirm/abc');
  });

  it('sends a batch in one request, each email with its own headers', async () => {
    env.RESEND_API_KEY = 're_test';
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const { sendBatch } = await import('@/lib/email/send');
    const ok = await sendBatch([
      { to: 'a@b.c', subject: 's', text: 't', html: 'h', headers: { 'List-Unsubscribe': '<x>' } },
      { to: 'd@e.f', subject: 's', text: 't', html: 'h' },
    ]);
    expect(ok).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails/batch');
    const sent = JSON.parse(init.body);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ to: ['a@b.c'], headers: { 'List-Unsubscribe': '<x>' } });
    expect(sent[1].to).toEqual(['d@e.f']);
  });

  it('refuses a batch over a hundred rather than splitting it quietly', async () => {
    env.RESEND_API_KEY = 're_test';
    const { sendBatch } = await import('@/lib/email/send');
    await expect(sendBatch(Array.from({ length: 101 }, () => ({ to: 'a@b.c', subject: 's', text: 't', html: 'h' })))).rejects.toThrow();
  });
});
