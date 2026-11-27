export const ROAD_BLOCK_SPACING = 80;
export const ROAD_ALLEY_OFFSET = 40;
export const CROSS_STREET_WIDTH = 13;
export const ALLEY_WIDTH = 6.2;
export const CROSS_STREET_LENGTH = 280;
export const ALLEY_LENGTH = 220;

export function roadModulo(z) {
  return ((z % ROAD_BLOCK_SPACING) + ROAD_BLOCK_SPACING) % ROAD_BLOCK_SPACING;
}

export function isCrossStreetOpening(z, halfWidth = CROSS_STREET_WIDTH / 2) {
  const mod = roadModulo(z);
  return Math.min(mod, ROAD_BLOCK_SPACING - mod) <= halfWidth;
}

export function isAlleyOpening(z, halfWidth = ALLEY_WIDTH / 2) {
  return Math.abs(roadModulo(z) - ROAD_ALLEY_OFFSET) <= halfWidth;
}

export function isRoadOpening(z, margin = 0) {
  return isCrossStreetOpening(z, CROSS_STREET_WIDTH / 2 + margin) || isAlleyOpening(z, ALLEY_WIDTH / 2 + margin);
}

export function isChunkRoadOpening(localZ, margin = 0) {
  return isRoadOpening(localZ + ROAD_BLOCK_SPACING / 2, margin);
}

export const VICTORIA_TURN_Z = -80;
export const VICTORIA_ROAD_X = 64;
export const VICTORIA_ROAD_WIDTH = 13;
export const VICTORIA_PLAZA_Z = -142;

// Smooth centerline curve: straight past the first two right turns (z = -40, -80), then curves.
export const CURVE_START_Z = -105;
export function roadCenterX(z) {
  if (z >= CURVE_START_Z) return 0;
  const d = CURVE_START_Z - z;
  const t = Math.min(1, d / 90);
  const smooth = t * t * (3 - 2 * t);
  return smooth * 38 * Math.sin(d * 0.011);
}

export function roadSlope(z) {
  return roadCenterX(z + 0.5) - roadCenterX(z - 0.5);
}

export function roadAngle(z) {
  return Math.atan(roadSlope(z));
}
