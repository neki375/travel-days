/** Axis-aligned box in map (viewBox) coordinates: [[left, top], [right, bottom]]. */
export type Bounds = [[number, number], [number, number]];

/** Zoom transform in d3-zoom terms: screen = point × k + (x, y). */
export interface FitTransform {
  k: number;
  x: number;
  y: number;
}

/** Smallest box containing all the given boxes, or null for an empty list. */
export function unionBounds(boxes: readonly Bounds[]): Bounds | null {
  if (boxes.length === 0) {
    return null;
  }
  return boxes.reduce(([[left, top], [right, bottom]], [[x0, y0], [x1, y1]]) => [
    [Math.min(left, x0), Math.min(top, y0)],
    [Math.max(right, x1), Math.max(bottom, y1)],
  ]);
}

/**
 * Transform that centers `bounds` in `extent` and scales it to fill the extent minus
 * `padding` (share of the extent), within [1, maxZoom]. The result never shows anything
 * outside the extent, matching a d3-zoom translateExtent equal to the extent.
 */
export function fitTransform(
  bounds: Bounds,
  extent: Bounds,
  maxZoom: number,
  padding = 0.2,
): FitTransform {
  const [[x0, y0], [x1, y1]] = extent;
  const [[left, top], [right, bottom]] = bounds;
  const fill = Math.min((x1 - x0) / (right - left), (y1 - y0) / (bottom - top)) * (1 - padding);
  // A single point (zero size) gives Infinity and ends up at maxZoom.
  const k = Math.min(maxZoom, Math.max(1, fill));
  const x = (x0 + x1) / 2 - k * ((left + right) / 2);
  const y = (y0 + y1) / 2 - k * ((top + bottom) / 2);
  return {
    k,
    x: clamp(x, x1 * (1 - k), x0 * (1 - k)),
    y: clamp(y, y1 * (1 - k), y0 * (1 - k)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
