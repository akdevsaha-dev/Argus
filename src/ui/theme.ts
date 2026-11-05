export const theme = {
  accent: "#A78BFA",
  accentAlt: "#67E8F9",
  text: "#E4E4E7",
  muted: "#A1A1AA",
  subtle: "#71717A",
  border: "#3F3F46",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
} as const;

// Brand gradient, left to right.
export const brandStops = ["#C084FC", "#818CF8", "#67E8F9"];

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

export function mix(a: string, b: string, t: number): string {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex([0, 1, 2].map((i) => ca[i]! + (cb[i]! - ca[i]!) * t) as RGB);
}

/** Color at position t (0..1) along a multi-stop gradient. */
export function gradientAt(stops: string[], t: number): string {
  if (stops.length === 1) return stops[0]!;
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  return mix(stops[i]!, stops[i + 1]!, scaled - i);
}
