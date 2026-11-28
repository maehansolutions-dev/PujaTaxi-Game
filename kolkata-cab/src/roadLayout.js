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
export const VICTORIA_ROAD_X = 96;
export const VICTORIA_ROAD_WIDTH = 13;
export const VICTORIA_PLAZA_Z = -142;

export const COLLEGE_TURN_Z = -80;
export const COLLEGE_STREET_X = -76;
export const COLLEGE_STREET_WIDTH = 16;
export const COLLEGE_CURVE_START_Z = -310;
export const COLLEGE_MERGE_Z = -420;
export const COLLEGE_CROSSING_Z = COLLEGE_MERGE_Z;
export const NETAJI_CROSSING_Z = -240;
export const EDEN_X = 76;
export const EDEN_Z = -360;
export const STPAUL_X = -70;
export const STPAUL_Z = -520;

export const GANGA_SOUTH_BANK_Z = -625;
export const GANGA_NORTH_BANK_Z = -875;
export const HOWRAH_BRIDGE_START_Z = -595;
export const HOWRAH_BRIDGE_END_Z = -905;
export const HOWRAH_BRIDGE_Z = (HOWRAH_BRIDGE_START_Z + HOWRAH_BRIDGE_END_Z) / 2;
export const HOWRAH_BRIDGE_DECK_Y = 4.6;

export function isOverGangaRiver(z) {
  return z <= GANGA_SOUTH_BANK_Z && z >= GANGA_NORTH_BANK_Z;
}

export function getBridgeElevationY(z) {
  if (z >= HOWRAH_BRIDGE_START_Z || z <= HOWRAH_BRIDGE_END_Z) return 0;
  const rampLen = 45;
  if (z > HOWRAH_BRIDGE_START_Z - rampLen) {
    const t = (HOWRAH_BRIDGE_START_Z - z) / rampLen;
    return HOWRAH_BRIDGE_DECK_Y * (t * t * (3 - 2 * t));
  }
  if (z < HOWRAH_BRIDGE_END_Z + rampLen) {
    const t = (z - HOWRAH_BRIDGE_END_Z) / rampLen;
    return HOWRAH_BRIDGE_DECK_Y * (t * t * (3 - 2 * t));
  }
  return HOWRAH_BRIDGE_DECK_Y;
}

// Smooth centerline curve: straight past the first two right turns (z = -40, -80), curves gently (±20m),
// and straightens cleanly across Howrah Bridge (z = -595..-905).
export const CURVE_START_Z = -105;
export function roadCenterX(z) {
  if (z >= CURVE_START_Z) return 0;
  const d = CURVE_START_Z - z;
  const t = Math.min(1, d / 90);
  const smooth = t * t * (3 - 2 * t);
  let bridgeFlatten = 1;
  if (z <= HOWRAH_BRIDGE_START_Z && z >= HOWRAH_BRIDGE_END_Z) {
    bridgeFlatten = 0;
  } else if (z > HOWRAH_BRIDGE_START_Z && z < HOWRAH_BRIDGE_START_Z + 55) {
    const u = (z - HOWRAH_BRIDGE_START_Z) / 55;
    bridgeFlatten = u * u * (3 - 2 * u);
  } else if (z < HOWRAH_BRIDGE_END_Z && z > HOWRAH_BRIDGE_END_Z - 55) {
    const u = (HOWRAH_BRIDGE_END_Z - z) / 55;
    bridgeFlatten = u * u * (3 - 2 * u);
  }
  return smooth * bridgeFlatten * 20 * Math.sin(d * 0.011);
}

export function roadSlope(z) {
  return roadCenterX(z + 0.5) - roadCenterX(z - 0.5);
}

export function roadAngle(z) {
  return Math.atan(roadSlope(z));
}

export function collegeStreetCenterX(z) {
  if (z >= COLLEGE_CURVE_START_Z) return COLLEGE_STREET_X;
  if (z <= COLLEGE_MERGE_Z) return roadCenterX(z);
  const span = COLLEGE_CURVE_START_Z - COLLEGE_MERGE_Z; // positive (110)
  const u = (COLLEGE_CURVE_START_Z - z) / span;
  const u2 = u * u;
  const u3 = u2 * u;
  const x1 = roadCenterX(COLLEGE_MERGE_Z);
  // dz/du = -span, so dx/du at u=1 matches main roadSlope(COLLEGE_MERGE_Z) * (-span)
  const m1 = roadSlope(COLLEGE_MERGE_Z) * (-span);
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * COLLEGE_STREET_X + h01 * x1 + h11 * m1;
}

export function collegeStreetSlope(z) {
  return collegeStreetCenterX(z + 0.5) - collegeStreetCenterX(z - 0.5);
}

export function collegeStreetAngle(z) {
  return Math.atan(collegeStreetSlope(z));
}
