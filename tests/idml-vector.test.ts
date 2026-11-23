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
