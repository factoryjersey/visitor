/**
 * Vector shapes for InDesign, from the website's icons: an SVG icon (the
 * Lucide icons the guide prints beside listings) as bezier subpaths, the
 * way IDML draws a path, each anchor with its incoming and outgoing
 * handles. Inline in the text, as the book's own icons are, so they move
 * with the words and stay sharp and recolourable.
 */
import type { LucideIcon } from 'lucide-react';

export type Pt = [number, number];
export type Anchor = { anchor: Pt; left: Pt; right: Pt };
export type Subpath = { points: Anchor[]; open: boolean };

type Seg = { from: Pt; c1: Pt; c2: Pt; to: Pt };

const num = (s: string | number | undefined) => Number(s ?? 0);

/** The icon's drawing: its SVG elements, as Lucide keeps them, on its 24-unit grid. */
export function iconNode(Icon: LucideIcon): [string, Record<string, string>][] {
  const render = (Icon as unknown as { render?: (p: object, r: null) => { props?: { icon?: { node?: [string, Record<string, string>][] }; iconNode?: [string, Record<string, string>][] } } }).render;
  const el = render?.({}, null);
  return el?.props?.icon?.node ?? el?.props?.iconNode ?? [];
}

/** An SVG drawing's elements as subpaths, in its own units. */
export function subpathsOf(node: [string, Record<string, string>][]): Subpath[] {
  const out: Subpath[] = [];
  for (const [tag, a] of node) {
    if (tag === 'path') out.push(...pathSubpaths(a.d ?? ''));
    else if (tag === 'circle') out.push(ellipse(num(a.cx), num(a.cy), num(a.r), num(a.r)));
    else if (tag === 'ellipse') out.push(ellipse(num(a.cx), num(a.cy), num(a.rx), num(a.ry)));
    else if (tag === 'line') out.push(lines([[num(a.x1), num(a.y1)], [num(a.x2), num(a.y2)]], true));
    else if (tag === 'polyline' || tag === 'polygon') {
      const v = (a.points ?? '').trim().split(/[\s,]+/).map(Number);
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i]!, v[i + 1]!]);
      out.push(lines(pts, tag === 'polyline'));
    } else if (tag === 'rect') out.push(rect(num(a.x), num(a.y), num(a.width), num(a.height), num(a.rx ?? a.ry)));
  }
  return out.filter((s) => s.points.length > 0);
}

const K = 0.5522847498;

export function ellipse(cx: number, cy: number, rx: number, ry: number): Subpath {
  const kx = rx * K, ky = ry * K;
  return {
    open: false,
    points: [
      { anchor: [cx, cy - ry], left: [cx - kx, cy - ry], right: [cx + kx, cy - ry] },
      { anchor: [cx + rx, cy], left: [cx + rx, cy - ky], right: [cx + rx, cy + ky] },
      { anchor: [cx, cy + ry], left: [cx + kx, cy + ry], right: [cx - kx, cy + ry] },
      { anchor: [cx - rx, cy], left: [cx - rx, cy + ky], right: [cx - rx, cy - ky] },
    ],
  };
}

function lines(pts: Pt[], open: boolean): Subpath {
  return { open, points: pts.map((p) => ({ anchor: p, left: p, right: p })) };
}

function rect(x: number, y: number, w: number, h: number, r: number): Subpath {
  if (!r) return lines([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], false);
  r = Math.min(r, w / 2, h / 2);
  const k = r * (1 - K);
  return {
    open: false,
    points: [
      { anchor: [x + r, y], left: [x + k, y], right: [x + r, y] },
      { anchor: [x + w - r, y], left: [x + w - r, y], right: [x + w - k, y] },
      { anchor: [x + w, y + r], left: [x + w, y + k], right: [x + w, y + r] },
      { anchor: [x + w, y + h - r], left: [x + w, y + h - r], right: [x + w, y + h - k] },
      { anchor: [x + w - r, y + h], left: [x + w - k, y + h], right: [x + w - r, y + h] },
      { anchor: [x + r, y + h], left: [x + r, y + h], right: [x + k, y + h] },
      { anchor: [x, y + h - r], left: [x, y + h - k], right: [x, y + h - r] },
      { anchor: [x, y + r], left: [x, y + r], right: [x, y + k] },
    ],
  };
}

/** An SVG path's d as subpaths: every command, absolute or relative, arcs as cubics. */
export function pathSubpaths(d: string): Subpath[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) ?? [];
  const subpaths: { segs: Seg[]; start: Pt; closed: boolean }[] = [];
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let segs: Seg[] = [];
  let lastCtrl: Pt | null = null;
  let lastQuad: Pt | null = null;
  let cmd = '';
  let i = 0;
  const more = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]!);
  const n = () => Number(tokens[i++]);
  const flush = (closed: boolean) => {
    if (segs.length) subpaths.push({ segs, start, closed });
    segs = [];
  };
  const line = (to: Pt) => segs.push({ from: cur, c1: cur, c2: to, to });
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const base = (p: Pt): Pt => (rel ? [cur[0] + p[0], cur[1] + p[1]] : p);
    switch (cmd.toUpperCase()) {
      case 'M': {
        flush(false);
        cur = base([n(), n()]);
        start = cur;
        // Further pairs after a move are lines.
        cmd = rel ? 'l' : 'L';
        lastCtrl = lastQuad = null;
        break;
      }
      case 'L': { const to = base([n(), n()]); line(to); cur = to; lastCtrl = lastQuad = null; break; }
      case 'H': { const x = n(); const to: Pt = [rel ? cur[0] + x : x, cur[1]]; line(to); cur = to; lastCtrl = lastQuad = null; break; }
      case 'V': { const y = n(); const to: Pt = [cur[0], rel ? cur[1] + y : y]; line(to); cur = to; lastCtrl = lastQuad = null; break; }
      case 'C': {
        const c1 = base([n(), n()]), c2 = base([n(), n()]), to = base([n(), n()]);
        segs.push({ from: cur, c1, c2, to });
        lastCtrl = c2; lastQuad = null; cur = to;
        break;
      }
      case 'S': {
        const c1: Pt = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        const c2 = base([n(), n()]), to = base([n(), n()]);
        segs.push({ from: cur, c1, c2, to });
        lastCtrl = c2; lastQuad = null; cur = to;
        break;
      }
      case 'Q': {
        const q = base([n(), n()]), to = base([n(), n()]);
        segs.push(quad(cur, q, to));
        lastQuad = q; lastCtrl = null; cur = to;
        break;
      }
      case 'T': {
        const q: Pt = lastQuad ? [2 * cur[0] - lastQuad[0], 2 * cur[1] - lastQuad[1]] : cur;
        const to = base([n(), n()]);
        segs.push(quad(cur, q, to));
        lastQuad = q; lastCtrl = null; cur = to;
        break;
      }
      case 'A': {
        const rx = n(), ry = n(), rot = n(), large = n(), sweep = n();
        const to = base([n(), n()]);
        segs.push(...arc(cur, rx, ry, rot, large !== 0, sweep !== 0, to));
        cur = to; lastCtrl = lastQuad = null;
        break;
      }
      case 'Z': {
        if (cur[0] !== start[0] || cur[1] !== start[1]) line(start);
        cur = start;
        flush(true);
        lastCtrl = lastQuad = null;
        break;
      }
      default:
        i += 1;
    }
    // A command's further parameters repeat it, until the next letter.
    if (!more()) continue;
  }
  flush(false);
  return subpaths.map(({ segs, closed }) => toSubpath(segs, closed));
}

function quad(p0: Pt, q: Pt, p: Pt): Seg {
  return { from: p0, c1: [p0[0] + (2 / 3) * (q[0] - p0[0]), p0[1] + (2 / 3) * (q[1] - p0[1])], c2: [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])], to: p };
}

/** An elliptical arc as cubic segments of a quarter turn or less (the SVG spec's endpoint-to-centre conversion). */
function arc(p0: Pt, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, p: Pt): Seg[] {
  if (!rx || !ry) return [{ from: p0, c1: p0, c2: p, to: p }];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (p0[0] - p[0]) / 2, dy = (p0[1] - p[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let co = Math.sqrt(Math.max(0, num2 / den));
  if (large === sweep) co = -co;
  const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const parts = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)));
  const step = dt / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  const at = (t: number): Pt => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const deriv = (t: number): Pt => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  const segs: Seg[] = [];
  let from = p0;
  for (let j = 0; j < parts; j += 1) {
    const a = t1 + j * step, b = a + step;
    const da = deriv(a), db = deriv(b);
    const to = j === parts - 1 ? p : at(b);
    segs.push({ from, c1: [from[0] + k * da[0], from[1] + k * da[1]], c2: [to[0] - k * db[0], to[1] - k * db[1]], to });
    from = to;
  }
  return segs;
}

/** Cubic segments as IDML anchors: each point with the handle coming in (left) and going out (right). */
function toSubpath(segs: Seg[], closed: boolean): Subpath {
  const points: Anchor[] = [];
  const first = segs[0]!;
  points.push({ anchor: first.from, left: first.from, right: first.c1 });
  for (let j = 0; j < segs.length; j += 1) {
    const s = segs[j]!;
    const next = segs[j + 1];
    points.push({ anchor: s.to, left: s.c2, right: next ? next.c1 : s.to });
  }
  // Closed: the last point is the first again; its incoming handle goes to the first.
  if (closed && points.length > 1) {
    const last = points.pop()!;
    points[0]!.left = last.left;
  }
  return { points, open: !closed };
}

/** Subpaths scaled and moved: from the icon's units to points, placed with its top left at (x, y). */
export function placed(subpaths: Subpath[], scale: number, x: number, y: number): Subpath[] {
  const f = (p: Pt): Pt => [x + p[0] * scale, y + p[1] * scale];
  return subpaths.map((s) => ({ open: s.open, points: s.points.map((a) => ({ anchor: f(a.anchor), left: f(a.left), right: f(a.right) })) }));
}

/** Half a disc, its flat side down the middle: the half bubble of a rating. */
export function leftHalfDisc(cx: number, cy: number, r: number): Subpath {
  const k = r * K;
  return {
    open: false,
    points: [
      { anchor: [cx, cy - r], left: [cx, cy - r], right: [cx - k, cy - r] },
      { anchor: [cx - r, cy], left: [cx - r, cy - k], right: [cx - r, cy + k] },
      { anchor: [cx, cy + r], left: [cx - k, cy + r], right: [cx, cy + r] },
    ],
  };
}
