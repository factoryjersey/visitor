import { describe, expect, it } from 'vitest';
import { Bike, Heart } from 'lucide-react';
import { iconNode, pathSubpaths, subpathsOf } from '@/lib/idml/vector';

describe('IDML vectors', () => {
  it('reads an icon’s drawing from Lucide', () => {
    const node = iconNode(Bike);
    expect(node.map(([tag]) => tag)).toEqual(['circle', 'circle', 'circle', 'path']);
    expect(subpathsOf(node)).toHaveLength(4);
  });

  it('turns lines, relative moves and closes into anchors', () => {
    const [a, b] = pathSubpaths('M2 2h4v4H2z m10 0 l2 2');
    expect(a!.open).toBe(false);
    expect(a!.points.map((p) => p.anchor)).toEqual([[2, 2], [6, 2], [6, 6], [2, 6]]);
    expect(b!.open).toBe(true);
    expect(b!.points.map((p) => p.anchor)).toEqual([[12, 2], [14, 4]]);
  });

  it('draws an arc as cubics that end where the arc does', () => {
    const [s] = pathSubpaths('M0 0 A 5 5 0 0 1 10 0');
    const end = s!.points.at(-1)!.anchor;
    expect(end[0]).toBeCloseTo(10);
    expect(end[1]).toBeCloseTo(0);
    // Half a circle of radius 5 sweeps up to y = -5 at its middle.
    const ys = s!.points.map((p) => p.anchor[1]);
    expect(Math.min(...ys)).toBeCloseTo(-5, 1);
  });

  it('closes a curved shape back to its start', () => {
    const subs = subpathsOf(iconNode(Heart));
    expect(subs.every((s) => s.points.length > 1)).toBe(true);
  });
});

describe('IDML copy fitting', async () => {
  const { parasHeight, styles } = await import('@/lib/idml/pages');
  const style = new Map(styles('classic').paraStyles.map((p) => [p.name, p]));
  it('grows with the words, a line at a time', () => {
    const one = parasHeight([{ style: 'listing body', runs: [{ text: 'A short line.' }] }], 45.5, style, 1);
    const more = parasHeight([{ style: 'listing body', runs: [{ text: 'A festive literary salon pairing a Christmas story with seasonal fare. Expect a cosy evening in the heart of St Helier.' }] }], 45.5, style, 1);
    expect(one).toBeCloseTo(8 * 25.4 / 72, 1);
    expect(more).toBeGreaterThan(2.5 * one);
  });
});

describe('IDML venue entries as the 2026 Visit pages', async () => {
  const { venueParas } = await import('@/lib/idml/pages');
  const v = { section: 'Visit', area: 'St. Lawrence', name: 'Jersey War Tunnels', label: '', size: 'full', isNew: false, copy: 'Jersey War Tunnels tells the true story of wartime Jersey. The hardship, the heartache and the heroism.', address: 'Les Charrières Malorey, JE3 1FU', phone: '+44 (0) 1534 860808', email: 'info@jerseywartunnels.com', website: 'JERSEYWARTUNNELS.COM', imageUrl: '', preview: '', options: [], featured: false, printed: false, opening: 'Daily 10:00–17:00', bus: '8, 28' } as never;
  it('leads with the name, a bold first sentence, then hours, buses, address, phone and website', () => {
    const paras = venueParas(v, 'full', { when: 9, title: 9, copy: 8.5, small: 7.5 }, 'plum', 'Black');
    expect(paras.map((p) => p.style)).toEqual(['Venue title', 'Venue copy', 'Venue info', 'Venue info', 'Venue info', 'Venue phone', 'Venue web']);
    expect(paras[0]!.size).toBe(14);
    expect(paras[1]!.runs[0]).toMatchObject({ text: 'Jersey War Tunnels tells the true story of wartime Jersey. ', char: 'Standfirst' });
    expect(paras.at(-1)!.runs[0]!.text).toBe('jerseywartunnels.com');
  });
});
