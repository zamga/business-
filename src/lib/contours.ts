/**
 * Generates smooth closed contour lines around a summit: a perturbed ellipse
 * per level, drawn as a closed Catmull-Rom spline converted to cubic Béziers.
 * Deterministic, so every build produces the same drawing.
 */
export interface Summit {
  cx: number;
  cy: number;
  levels: number;
  base: number;
  step: number;
  stretch?: number;
  squash?: number;
  drift?: [number, number];
  phase?: number;
}

export function contourPaths(s: Summit): string[] {
  const { cx, cy, levels, base, step, stretch = 1.25, squash = 0.82, drift = [-6, 5], phase = 0 } = s;
  return Array.from({ length: levels }, (_, k) => {
    const ox = cx + drift[0] * k;
    const oy = cy + drift[1] * k;
    const r = base + k * step;
    const n = 40;
    const pts = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const wobble = 1 + 0.1 * Math.sin(3 * t + k * 0.7 + phase) + 0.05 * Math.cos(5 * t - k + phase);
      return [ox + Math.cos(t) * r * stretch * wobble, oy + Math.sin(t) * r * squash * wobble] as const;
    });
    const f = (v: number) => v.toFixed(1);
    let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n]!;
      const p1 = pts[i]!;
      const p2 = pts[(i + 1) % n]!;
      const p3 = pts[(i + 2) % n]!;
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return `${d}Z`;
  });
}
