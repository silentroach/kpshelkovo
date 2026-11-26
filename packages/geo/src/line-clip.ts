import type {
  ActiveLineFragment,
  LineFragment,
  PlanarEdge,
  PolygonCoordinates,
  PolygonPosition
} from './types.ts';

const cross = (x: number, y: number, u: number, v: number): number => x * v - y * u;
const epsilon = 1e-12;

const getRingEdges = (ring: readonly PolygonPosition[]): PlanarEdge[] =>
  ring.slice(1).map((end, i) => {
    const start = ring[i]!;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    return { start, end, dx, dy, length: Math.hypot(dx, dy) };
  });

const sideOf = ([x, y]: PolygonPosition, edge: PlanarEdge): number =>
  cross(x - edge.start[0], y - edge.start[1], edge.dx, edge.dy);

const onEdge = (point: PolygonPosition, edge: PlanarEdge): boolean => {
  const [x, y] = point;
  return (
    Math.abs(sideOf(point, edge)) <= epsilon * edge.length &&
    (x - edge.start[0]) * (x - edge.end[0]) + (y - edge.start[1]) * (y - edge.end[1]) <=
      epsilon * epsilon
  );
};

const edgesMeet = (a: PlanarEdge, b: PlanarEdge): boolean =>
  (sideOf(a.start, b) * sideOf(a.end, b) < 0 && sideOf(b.start, a) * sideOf(b.end, a) < 0) ||
  onEdge(a.start, b) ||
  onEdge(a.end, b) ||
  onEdge(b.start, a) ||
  onEdge(b.end, a);

/** A closed ring has at least three nonzero edges and no self-intersections. */
export const isSimpleClosedRing = (ring: readonly PolygonPosition[]): boolean => {
  if (ring.length < 4) return false;
  const [x, y] = ring[0]!;
  const [lastX, lastY] = ring.at(-1)!;
  if (x !== lastX || y !== lastY) return false;

  const edges = getRingEdges(ring);
  if (edges.some(({ length }) => !length)) return false;
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i]!;
    for (let j = i + 1; j < edges.length; j++) {
      const b = edges[j]!;
      // Neighbours share one vertex, but must not turn back along one another.
      if (j === i + 1) {
        if (onEdge(a.start, b) || onEdge(b.end, a)) return false;
      } else if (i === 0 && j === edges.length - 1) {
        if (onEdge(a.end, b) || onEdge(b.start, a)) return false;
      } else if (edgesMeet(a, b)) {
        return false;
      }
    }
  }
  return true;
};

const contains = (edges: readonly PlanarEdge[], point: PolygonPosition): boolean => {
  const [x, y] = point;
  let odd = false;
  for (const edge of edges) {
    if (onEdge(point, edge)) return true;
    const [ax, ay] = edge.start;
    if (ay > y !== edge.end[1] > y && x < ax + ((y - ay) * edge.dx) / edge.dy) odd = !odd;
  }
  return odd;
};

/** Split planar polylines at the boundary of the union of the closed-ring polygons. */
export const createLineSplitter = (polygons: readonly PolygonCoordinates[]) => {
  const polygonEdges = polygons.map((rings) =>
    rings.flatMap(getRingEdges).filter(({ length }) => length)
  );
  const edges = polygonEdges.flat();

  return (line: readonly PolygonPosition[]): readonly LineFragment[] => {
    const fragments: ActiveLineFragment[] = [];
    let active: ActiveLineFragment | undefined;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (!length) continue;
      const cuts = [1];
      const cut = (t: number): void => {
        if (t > epsilon && t < 1 - epsilon) cuts.push(t);
      };
      for (const e of edges) {
        const x = e.start[0] - a[0];
        const y = e.start[1] - a[1];
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
      const point = (t: number): PolygonPosition => (t === 0 ? a : [a[0] + dx * t, a[1] + dy * t]);
      let start = 0;
      for (const end of cuts) {
        if (end - start <= epsilon) continue;
        const middle = point((start + end) / 2);
        const inside = polygonEdges.some((polygon) => contains(polygon, middle));
        if (active?.inside !== inside) {
          const from = point(start);
          if (start) active?.line.push(from);
          active = { inside, line: [from] };
          fragments.push(active);
        }
        start = end;
      }
      active?.line.push(b);
    }
    return fragments;
  };
};

/** Clip planar polylines to a polygon with closed rings, keeping boundary runs but not point touches. */
export const createLineClipper = (polygon: PolygonCoordinates) => {
  const split = createLineSplitter([polygon]);
  return (line: readonly PolygonPosition[]): readonly (readonly PolygonPosition[])[] =>
    split(line).flatMap((fragment) => (fragment.inside ? [fragment.line] : []));
};
