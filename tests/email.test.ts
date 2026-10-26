import { afterEach, describe, expect, it, vi } from 'vitest';

const env = { RESEND_API_KEY: undefined as string | undefined, EMAIL_FROM: 'Visitor <hello@visitor.je>', NEXT_PUBLIC_APP_URL: 'https://visitor.je' };
vi.mock('@/lib/env', () => ({ env }));

afterEach(() => {
  env.RESEND_API_KEY = undefined;
  vi.unstubAllGlobals();
});

describe('emails', () => {
  it('escapes what people typed, and keeps it whole in the text', async () => {
    const { claimStaffEmail } = await import('@/lib/email/templates');
    const e = claimStaffEmail({
      name: 'Sam <script>',
      email: 'sam@example.com',
      phone: null,
      businessName: 'Arts & Co',
      relationship: null,
      message: '<img src=x onerror=alert(1)>',
      listing: { kind: 'venue', title: 'Jersey Arts Centre\nBcc: x@y.z' },
    });
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('<img');
    expect(e.html).toContain('Arts &amp; Co');
    expect(e.text).toContain('<img src=x onerror=alert(1)>');
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.replyTo).toBe('sam@example.com');
    expect(e.html).toContain('https://visitor.je/admin/claims');
  });

  it('puts the invite link behind the button and in the text', async () => {
    const { inviteEmail } = await import('@/lib/email/templates');
    const e = inviteEmail({ name: 'Sam Le Brun', businessName: 'Jersey Arts Centre', staff: false, link: 'https://visitor.je/invite/abc', reason: 'Your claim for Jersey Arts Centre is approved.' });
    expect(e.subject).toBe('Look after Jersey Arts Centre on Visitor');
    expect(e.text).toContain('Hello Sam,');
    expect(e.text).toContain('https://visitor.je/invite/abc');
    expect(e.html).toContain('href="https://visitor.je/invite/abc"');
  });

  it('sends nothing without a key', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { sendEmail } = await import('@/lib/email/send');
    expect(await sendEmail({ to: 'a@b.c', subject: 's', text: 't', html: 'h' })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts to Resend with the key, and reports a refusal as not sent', async () => {
    env.RESEND_API_KEY = 're_test';
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"id":"1"}', { status: 200 })).mockResolvedValueOnce(new Response('bad domain', { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    const { sendEmail } = await import('@/lib/email/send');
    expect(await sendEmail({ to: ['a@b.c'], subject: 's', text: 't', html: 'h', replyTo: 'r@b.c' })).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toMatchObject({ from: 'Visitor <hello@visitor.je>', to: ['a@b.c'], reply_to: 'r@b.c' });
    expect(await sendEmail({ to: 'a@b.c', subject: 's', text: 't', html: 'h' })).toBe(false);
  });
});
