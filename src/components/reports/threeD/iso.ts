/**
 * Minimal isometric projection math shared by the 3D report's canvas charts.
 * Height (`y`) always stays vertical on screen — only `x`/`z` rotate around
 * the vertical axis when the user drags — so bars always read as "taller is
 * more" regardless of the current viewing angle.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2 {
  x: number;
  y: number;
}

const ISO_COS = Math.cos(Math.PI / 6);
const ISO_SIN = Math.sin(Math.PI / 6);

export function rotateY(point: Vec3, theta: number): Vec3 {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos,
  };
}

export function projectIso(point: Vec3): Point2 {
  return {
    x: (point.x - point.z) * ISO_COS,
    y: (point.x + point.z) * ISO_SIN - point.y,
  };
}

export function projectRotated(point: Vec3, theta: number): Point2 {
  return projectIso(rotateY(point, theta));
}

export function centerOf(points: Point2[]): Point2 {
  if (points.length === 0) return { x: 0, y: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * Base pixels-per-unit for a scene, chosen as the worst case over a full turn
 * of the azimuth rather than the current angle. Sampling every angle keeps the
 * scale constant while the user drags — fitting per-frame makes the scene
 * pulse bigger and smaller as its projected footprint changes — and makes the
 * zoom anchor maths exact, since only the user's zoom factor moves the scale.
 */
export function fitScale(
  corners: Vec3[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  sampleCount = 24,
): number {
  if (corners.length === 0) return 1;
  let smallest = Number.POSITIVE_INFINITY;
  for (let sample = 0; sample < sampleCount; sample++) {
    const theta = (sample / sampleCount) * Math.PI * 2;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const corner of corners) {
      const projected = projectRotated(corner, theta);
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
    }
    const width = Math.max(maxX - minX, 0.001);
    const height = Math.max(maxY - minY, 0.001);
    smallest = Math.min(smallest, (canvasWidth * padding) / width, (canvasHeight * padding) / height);
  }
  return Number.isFinite(smallest) && smallest > 0 ? smallest : 1;
}

/** True when a screen point falls inside a convex screen-space polygon. */
export function pointInPolygon(point: Point2, polygon: Point2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Depth key for painter's-algorithm sorting: larger sorts closer to the viewer. */
export function depthOf(point: Vec3, theta: number): number {
  const rotated = rotateY(point, theta);
  return rotated.x + rotated.z;
}

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. */
export function shadeHex(hex: string, amount: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return `#${channels
    .map((channel) => {
      const mixed =
        amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
      return Math.min(255, Math.max(0, Math.round(mixed)))
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}
