import type {
  EditorialPolygonCoordinates,
  EditorialPosition as Position
} from '@/lib/geometry/editorial-types';

const cross = (x: number, y: number, u: number, v: number): number => x * v - y * u;
const epsilon = 1e-12;

/** Split each source segment at all boundary crossings, then classify the open intervals. */
export const createRoadClipper = (polygon: EditorialPolygonCoordinates) => {
  const edges = polygon.flatMap((ring) =>
    ring.slice(1).flatMap(([x, y], i) => {
      const [ax, ay] = ring[i]!;
      const dx = x - ax;
      const dy = y - ay;
      return dx || dy ? [{ ax, ay, x, y, dx, dy, length: Math.hypot(dx, dy) }] : [];
    })
  );

  const inside = ([x, y]: Position): boolean => {
    let odd = false;
    for (const edge of edges) {
      const u = x - edge.ax;
      const v = y - edge.ay;
      if (
        Math.abs(cross(u, v, edge.dx, edge.dy)) <= epsilon * edge.length &&
        u * (x - edge.x) + v * (y - edge.y) <= epsilon * epsilon
      )
        return true;
      if (edge.ay > y !== edge.y > y && x < edge.ax + (v * edge.dx) / edge.dy) odd = !odd;
    }
    return odd;
  };

  return (line: readonly Position[]): Position[][] => {
    const fragments: Position[][] = [];
    let active: Position[] | undefined;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (!length) continue;
      const cuts = [0, 1];
      const cut = (t: number): void => {
        if (t > 0 && t < 1) cuts.push(t);
      };
      for (const e of edges) {
        const x = e.ax - a[0];
        const y = e.ay - a[1];
        const det = cross(dx, dy, e.dx, e.dy);
        if (Math.abs(det) <= Number.EPSILON * length * e.length) {
          // A collinear boundary run can start and end between two source nodes.
          if (Math.abs(cross(x, y, dx, dy)) <= epsilon * length) {
            const t = (x * dx + y * dy) / (length * length);
            cut(t);
            cut(t + (e.dx * dx + e.dy * dy) / (length * length));
          }
        } else {
          const alongEdge = cross(x, y, dx, dy) / det;
          if (alongEdge >= -epsilon && alongEdge <= 1 + epsilon) cut(cross(x, y, e.dx, e.dy) / det);
        }
      }
      cuts.sort((m, n) => m - n);
      const point = (t: number): Position =>
        t === 0 ? a : t === 1 ? b : [a[0] + dx * t, a[1] + dy * t];
      let start = 0;
      for (const end of cuts) {
        if (end - start <= epsilon) continue;
        if (inside(point((start + end) / 2))) {
          if (!active) {
            active = [point(start)];
            fragments.push(active);
          }
          active.push(point(end));
        } else {
          active = undefined;
        }
        start = end;
      }
    }
    return fragments;
  };
};
