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
