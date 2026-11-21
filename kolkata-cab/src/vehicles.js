import * as THREE from 'three';

const PAINT = 0xf5ae1f;
const CHROME = 0xd9ddd9;
const BLACK = 0x16181a;
const GLASS = 0x1a1f22;
const BLUE = 0x1f3f73;
const WHITE = 0xffffff;
const PLATE_YELLOW = 0xf2c200;
const BODY_HALF_WIDTH = 0.83;
const FRONT_Z = -2.10;
const REAR_Z = 2.10;
const SIDE_STRIPE = true;
const FRONT_PLATE_SIZE = [0.44, 0.11];
const REAR_PLATE_SIZE = [0.46, 0.12];

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.43, metalness: 0.06, flatShading: true, ...options });
}

function addMesh(parent, geometry, mat, position = [0, 0, 0], rotation = null) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function extrudeSide(shape, width, bevelSize) {
  const depth = width - bevelSize * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize,
    bevelThickness: bevelSize,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(-Math.PI / 2);
  return geometry;
}

function roundedRectShape(width, height, radius) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

function makeLabelTexture(text, { background, foreground = '#111315', width = 512, height = 128, font = 'bold 76px monospace' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = foreground;
  ctx.font = font;
  ctx.fillText(text, width / 2, height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGradientGlassTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#91aab3'); gradient.addColorStop(0.48, '#52666d'); gradient.addColorStop(1, '#252f32');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(8, 10, 112, 5);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeGlowTexture(color, centerAlpha = 0.8) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const [r, g, b] = color;
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
  gradient.addColorStop(0.2, `rgba(${r},${g},${b},${centerAlpha * 0.55})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function frameFromNormal(normal) {
  const z = normal.clone().normalize();
  let referenceUp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(z.dot(referenceUp)) > 0.96) referenceUp.set(0, 0, -1);
  const x = referenceUp.clone().cross(z).normalize();
  const y = z.clone().cross(x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export function createTaxi() {
  const taxi = new THREE.Group();
  const body = new THREE.Group();
  taxi.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: PAINT, roughness: 0.35, metalness: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 1.3, emissive: 0x2a1a00, emissiveIntensity: 0.2, flatShading: true });
  const chrome = material(CHROME, { metalness: 1, roughness: 0.15 });
  const darkRubber = material(BLACK, { roughness: 0.72 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: makeGradientGlassTexture(), roughness: 0.05, metalness: 0.1, reflectivity: 0.9, clearcoat: 0.65, clearcoatRoughness: 0.06, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const bodyProfile = new THREE.Shape();
  bodyProfile.moveTo(-1.93, 0.34);
  bodyProfile.quadraticCurveTo(-1.98, 0.36, -1.98, 0.56);
  bodyProfile.lineTo(-1.96, 0.72);
  bodyProfile.quadraticCurveTo(-1.92, 0.96, -1.64, 1.02);
  bodyProfile.quadraticCurveTo(-1.32, 1.13, -1.08, 1.13);
  bodyProfile.lineTo(0.88, 1.13);
  bodyProfile.quadraticCurveTo(1.44, 1.12, 1.79, 1.03);
  bodyProfile.quadraticCurveTo(1.97, 0.98, 1.98, 0.76);
  bodyProfile.lineTo(1.96, 0.56);
  bodyProfile.quadraticCurveTo(1.94, 0.36, 1.78, 0.34);
  bodyProfile.lineTo(-1.78, 0.34);
  bodyProfile.quadraticCurveTo(-1.91, 0.34, -1.93, 0.34);
  const lowerBody = addMesh(body, extrudeSide(bodyProfile, 1.66, 0.17), paint);

  // A painted, rounded greenhouse shell. The glass is mounted separately onto its skin.
  const cabinProfile = new THREE.Shape();
  cabinProfile.moveTo(-1.22, 1.07);
  cabinProfile.quadraticCurveTo(-1.12, 1.23, -0.74, 1.48);
  cabinProfile.quadraticCurveTo(-0.64, 1.51, -0.47, 1.51);
  cabinProfile.lineTo(0.52, 1.51);
  cabinProfile.quadraticCurveTo(0.70, 1.51, 0.80, 1.45);
  cabinProfile.quadraticCurveTo(1.02, 1.23, 1.22, 1.07);
  cabinProfile.lineTo(-1.22, 1.07);
  const cabinShell = addMesh(body, extrudeSide(cabinProfile, 1.30, 0.14), paint);

  // All surface-mounted trim uses ray hits against these two actual rounded shells.
  body.updateMatrixWorld(true);
  const targets = [lowerBody, cabinShell];
  const raycaster = new THREE.Raycaster();
  function mountPoint(hitTargets, origin, direction) {
    raycaster.set(origin, direction.clone().normalize());
    const hit = raycaster.intersectObjects(hitTargets, false)[0];
    if (!hit) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    return { point: hit.point.clone(), normal };
  }
  function mountGroup(hit, fallbackPoint, fallbackNormal) {
    const point = hit?.point || new THREE.Vector3(...fallbackPoint);
    const normal = hit?.normal || new THREE.Vector3(...fallbackNormal).normalize();
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, 0.018);
    group.quaternion.copy(frameFromNormal(normal));
    body.add(group);
    return group;
  }
  function frontHit(x, y, z = -8) {
    return mountPoint(targets, new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, 1));
  }
  function rearHit(x, y, z = 8) {
    return mountPoint(targets, new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1));
  }
  function sideHit(side, y, z) {
    return mountPoint(targets, new THREE.Vector3(side * 8, y, z), new THREE.Vector3(-side, 0, 0));
  }
  function attachPanel(hit, fallback, fallbackNormal, width, height, radius, panelMat, offset = 0.03) {
    const group = mountGroup(hit, fallback, fallbackNormal);
    const panel = addMesh(group, new THREE.ShapeGeometry(roundedRectShape(width, height, radius)), panelMat, [0, 0, offset]);
    panel.castShadow = false;
    return group;
  }
  function attachPlate(hit, fallback, fallbackNormal, size, label) {
    const group = mountGroup(hit, fallback, fallbackNormal);
    addMesh(group, new THREE.BoxGeometry(size[0], size[1], 0.025), material(PLATE_YELLOW, { roughness: 0.58 }), [0, 0, 0.018]);
    const texture = makeLabelTexture(label, { background: '#F2C200', foreground: '#111315', width: 560, height: 150, font: 'bold 65px monospace' });
    addMesh(group, new THREE.PlaneGeometry(size[0] * 0.91, size[1] * 0.74), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), [0, 0, 0.033]);
    return group;
  }

  // Wheels and dark arch rings sit on the outer body surface; the rings leave the tyres visible.
  const tyreMat = material(0x202326, { roughness: 0.86 });
  const hubMat = material(0xa5aaa7, { metalness: 0.64, roughness: 0.32 });
  for (const side of [-1, 1]) {
    for (const z of [-1.29, 1.29]) {
      addMesh(body, new THREE.CylinderGeometry(0.385, 0.385, 0.27, 14), tyreMat, [side * 0.77, 0.43, z], [0, 0, Math.PI / 2]);
      addMesh(body, new THREE.CylinderGeometry(0.235, 0.235, 0.29, 14), hubMat, [side * 0.79, 0.43, z], [0, 0, Math.PI / 2]);
      addMesh(body, new THREE.CylinderGeometry(0.055, 0.055, 0.30, 10), chrome, [side * 0.80, 0.43, z], [0, 0, Math.PI / 2]);
      const archHit = sideHit(side, 0.43, z);
      const arch = mountGroup(archHit, [side * BODY_HALF_WIDTH, 0.43, z], [side, 0, 0]);
      addMesh(arch, new THREE.RingGeometry(0.36, 0.49, 24), new THREE.MeshBasicMaterial({ color: BLACK, side: THREE.DoubleSide }), [0, 0, 0.018]);
    }
  }

  // Thin two-colour stripe follows the body's actual curved flank in ray-mounted segments.
  if (SIDE_STRIPE) {
    const blueMat = material(BLUE, { roughness: 0.38 });
    const whiteMat = material(WHITE, { roughness: 0.42 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 28; i++) {
        const z = -1.62 + i * 0.12;
        const blueHit = sideHit(side, 0.91, z);
        const blue = mountGroup(blueHit, [side * BODY_HALF_WIDTH, 0.91, z], [side, 0, 0]);
        addMesh(blue, new THREE.BoxGeometry(0.025, 0.08, 0.125), blueMat, [0, 0, 0.018]);
        const whiteHit = sideHit(side, 0.84, z);
        const white = mountGroup(whiteHit, [side * BODY_HALF_WIDTH, 0.84, z], [side, 0, 0]);
        addMesh(white, new THREE.BoxGeometry(0.025, 0.02, 0.125), whiteMat, [0, 0, 0.018]);
      }
    }
  }

  // Two inset, rounded side windows per side, separated by the painted B-pillar shell.
  for (const side of [-1, 1]) {
    for (const z of [-0.60, 0.48]) {
      const hit = sideHit(side, 1.37, z);
      const frame = attachPanel(hit, [side * 0.65, 1.37, z], [side, 0, 0], 0.94, 0.42, 0.09, paint, 0.01);
      addMesh(frame, new THREE.ShapeGeometry(roundedRectShape(0.78, 0.27, 0.065)), glass, [0, 0, 0.024]).castShadow = false;
    }
    // Ray-mounted fender mirror stalk and shell.
    const mirrorHit = sideHit(side, 1.19, -1.13);
    const mirror = mountGroup(mirrorHit, [side * 0.78, 1.19, -1.13], [side, 0, 0]);
    addMesh(mirror, new THREE.BoxGeometry(0.045, 0.055, 0.2), chrome, [0, 0, 0.12]);
    addMesh(mirror, new THREE.BoxGeometry(0.18, 0.13, 0.22), paint, [0, 0.02, 0.29]);
    addMesh(mirror, new THREE.BoxGeometry(0.018, 0.085, 0.16), material(0x71848a, { metalness: 0.3, roughness: 0.2 }), [0, 0.02, 0.405]);
  }

  // Fine door seams and a polished belt-line strip follow the rounded body surface.
  const panelLineMat = material(0x34302a, { roughness: 0.76, metalness: 0.02 });
  const beltTrimMat = material(CHROME, { metalness: 1, roughness: 0.15 });
  for (const side of [-1, 1]) {
    const beltPoints = [];
    for (let z = -1.55; z <= 1.42; z += 0.11) {
      const hit = sideHit(side, 1.005, z);
      if (hit) beltPoints.push(hit.point);
    }
    if (beltPoints.length > 3) addMesh(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPoints), 40, 0.012, 5, false), beltTrimMat);
    for (const z of [-0.18, 0.88]) {
      const seamPoints = [];
      for (let y = 0.52; y <= 1.0; y += 0.06) {
        const hit = sideHit(side, y, z);
        if (hit) seamPoints.push(hit.point);
      }
      if (seamPoints.length > 2) addMesh(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints), 16, 0.006, 4, false), panelLineMat);
    }
  }
  const bootLinePoints = [];
  for (let x = -0.72; x <= 0.72; x += 0.08) {
    const hit = rearHit(x, 0.93);
    if (hit) bootLinePoints.push(hit.point);
  }
  if (bootLinePoints.length > 3) addMesh(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bootLinePoints), 24, 0.008, 4, false), panelLineMat);

  // Curved front windscreen with a visible painted surround and a pair of wipers.
  const windHit = frontHit(0, 1.31);
  const windscreen = attachPanel(windHit, [0, 1.31, -1.0], [0, 0, -1], 1.20, 0.61, 0.14, paint, 0.012);
  addMesh(windscreen, new THREE.ShapeGeometry(roundedRectShape(1.02, 0.44, 0.09)), glass, [0, 0, 0.025]).castShadow = false;
  const wiperMat = material(BLACK, { roughness: 0.78 });
  for (const side of [-1, 1]) {
    addMesh(windscreen, new THREE.BoxGeometry(0.39, 0.018, 0.018), wiperMat, [side * 0.22, -0.205, 0.04], [0, 0, side * -0.12]);
    addMesh(windscreen, new THREE.BoxGeometry(0.018, 0.10, 0.018), wiperMat, [side * 0.10, -0.16, 0.04], [0, 0, side * 0.2]);
  }

  // Rounded, domed rear window with a broad yellow border.
  const rearWindowHit = rearHit(0, 1.31);
  const rearWindow = attachPanel(rearWindowHit, [0, 1.31, 1.0], [0, 0, 1], 1.22, 0.60, 0.15, paint, 0.012);
  addMesh(rearWindow, new THREE.ShapeGeometry(roundedRectShape(1.10, 0.46, 0.10)), glass, [0, 0, 0.025]).castShadow = false;

  // Six horizontal grille slats set in a dark recess and bounded by a chrome frame.
  const grilleHit = frontHit(0, 0.78);
  const grille = mountGroup(grilleHit, [0, 0.78, FRONT_Z], [0, 0, -1]);
  addMesh(grille, new THREE.BoxGeometry(0.78, 0.30, 0.045), material(BLACK, { roughness: 0.42 }), [0, 0, 0.018]);
  const grilleSlatMat = material(CHROME, { metalness: 0.76, roughness: 0.22 });
  addMesh(grille, new THREE.BoxGeometry(0.82, 0.035, 0.055), grilleSlatMat, [0, 0.15, 0.04]);
  addMesh(grille, new THREE.BoxGeometry(0.82, 0.035, 0.055), grilleSlatMat, [0, -0.15, 0.04]);
  addMesh(grille, new THREE.BoxGeometry(0.035, 0.30, 0.055), grilleSlatMat, [-0.392, 0, 0.04]);
  addMesh(grille, new THREE.BoxGeometry(0.035, 0.30, 0.055), grilleSlatMat, [0.392, 0, 0.04]);
  for (let i = 0; i < 6; i++) addMesh(grille, new THREE.BoxGeometry(0.72, 0.018, 0.035), grilleSlatMat, [0, 0.105 - i * 0.042, 0.045]);

  // Round headlights: raised chrome rings, warm domed lenses, and small amber indicators.
  const headlightMat = material(0xfff4db, { emissive: 0xffdf9e, emissiveIntensity: 2.4, roughness: 0.17 });
  const indicatorMat = material(0xff9d22, { emissive: 0xff6b08, emissiveIntensity: 1.5, roughness: 0.22 });
  taxi.userData.brakeGlows = [];
  const headGlowTexture = makeGlowTexture([255, 231, 182], 0.75);
  const tailGlowTexture = makeGlowTexture([255, 29, 18], 0.78);
  for (const side of [-1, 1]) {
    const hit = frontHit(side * 0.58, 0.90);
    const lamp = mountGroup(hit, [side * 0.58, 0.90, FRONT_Z], [0, 0, -1]);
    addMesh(lamp, new THREE.TorusGeometry(0.205, 0.035, 8, 24), chrome, [0, 0, 0.025]);
    addMesh(lamp, new THREE.SphereGeometry(0.17, 16, 10), headlightMat, [0, 0, 0.045]).scale.set(1, 1, 0.32);
    const headGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: headGlowTexture, color: 0xffe8bd, transparent: true, opacity: 0.44, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    headGlow.position.set(side * 0.58, 0.90, -2.12); headGlow.scale.set(0.92, 0.92, 1); body.add(headGlow);
    const spotlight = new THREE.SpotLight(0xfff1d7, 6, 28, 0.5, 0.62, 2);
    spotlight.position.set(side * 0.58, 0.9, -2.08);
    spotlight.target.position.set(side * 0.58, 0.34, -24);
    taxi.add(spotlight, spotlight.target);
    spotlight.castShadow = false;
    const indicatorHit = frontHit(side * 0.58, 0.64);
    const indicator = mountGroup(indicatorHit, [side * 0.58, 0.64, FRONT_Z], [0, 0, -1]);
    addMesh(indicator, new THREE.SphereGeometry(0.05, 10, 8), indicatorMat, [0, 0, 0.03]).scale.set(1, 1, 0.58);
  }

  // Small chrome bonnet emblem above the grille.
  const emblem = mountGroup(frontHit(0, 1.02), [0, 1.02, FRONT_Z], [0, 0, -1]);
  addMesh(emblem, new THREE.BoxGeometry(0.10, 0.05, 0.025), chrome, [0, 0, 0.024]);
  addMesh(emblem, new THREE.SphereGeometry(0.026, 8, 6), material(0xb23d29), [0, 0, 0.043]).scale.set(1, 0.62, 0.3);

  // Front chrome bumper with rubber guards and a surface-mounted yellow plate.
  const frontBumperHit = frontHit(0, 0.46);
  const frontBumper = mountGroup(frontBumperHit, [0, 0.46, FRONT_Z], [0, 0, -1]);
  addMesh(frontBumper, new THREE.BoxGeometry(1.70, 0.09, 0.10), chrome, [0, 0, 0.025]);
  for (const side of [-1, 1]) addMesh(frontBumper, new THREE.BoxGeometry(0.075, 0.18, 0.13), darkRubber, [side * 0.62, 0.01, 0.055]);
  const frontPlate = attachPlate(frontHit(0, 0.49), [0, 0.49, FRONT_Z], [0, 0, -1], FRONT_PLATE_SIZE, 'WB 19 A 7055');
  frontPlate.position.y += 0.035;
  frontPlate.position.z += 0.115;

  // Hood eyebrow ridges are half-cylinder rails ray-mounted on the bonnet's raised shoulders.
  const eyebrowMat = material(PAINT, { roughness: 0.35 });
  for (const side of [-1, 1]) {
    const hit = sideHit(side, 1.02, -1.28);
    const brow = mountGroup(hit, [side * 0.73, 1.02, -1.28], [side, 0, 0]);
    addMesh(brow, new THREE.CylinderGeometry(0.07, 0.07, 0.95, 12, 1, false, 0, Math.PI), eyebrowMat,
      [0, 0.055, -0.04], [Math.PI / 2, 0, 0]);
  }

  // Tall rear corner lamps: black surround, red brake section and amber lower section.
  taxi.userData.brakeLights = [];
  for (const side of [-1, 1]) {
    const hit = rearHit(side * 0.64, 0.86);
    const lamp = mountGroup(hit, [side * 0.64, 0.86, REAR_Z], [0, 0, 1]);
    addMesh(lamp, new THREE.BoxGeometry(0.15, 0.43, 0.065), darkRubber, [0, 0, 0.018]);
    const redMat = material(0xb92320, { emissive: 0xa20a06, emissiveIntensity: 1.25, roughness: 0.27 });
    addMesh(lamp, new THREE.BoxGeometry(0.105, 0.29, 0.035), redMat, [0, 0.065, 0.063]);
    addMesh(lamp, new THREE.BoxGeometry(0.105, 0.115, 0.035), indicatorMat, [0, -0.145, 0.063]);
    taxi.userData.brakeLights.push(redMat);
    const tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tailGlowTexture, color: 0xff382a, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    tailGlow.position.set(side * 0.64, 0.86, 2.14); tailGlow.scale.set(0.68, 0.68, 1); body.add(tailGlow);
    taxi.userData.brakeGlows.push(tailGlow);
  }

  // Boot handle, yellow rear registration plate, slim bumper and vertical rubber guards.
  const handle = mountGroup(rearHit(0, 0.93), [0, 0.93, REAR_Z], [0, 0, 1]);
  addMesh(handle, new THREE.BoxGeometry(0.30, 0.035, 0.035), chrome, [0, 0, 0.027]);
  const rearPlate = attachPlate(rearHit(0, 0.76), [0, 0.76, REAR_Z], [0, 0, 1], REAR_PLATE_SIZE, 'WB 19 A 7055');
  rearPlate.position.z += 0.08;
  const rearBumperHit = rearHit(0, 0.46);
  const rearBumper = mountGroup(rearBumperHit, [0, 0.46, REAR_Z], [0, 0, 1]);
  addMesh(rearBumper, new THREE.BoxGeometry(1.70, 0.09, 0.10), chrome, [0, 0, 0.025]);
  for (const side of [-1, 1]) addMesh(rearBumper, new THREE.BoxGeometry(0.06, 0.22, 0.12), darkRubber, [side * 0.50, 0.015, 0.06]);

  // Small yellow TAXI roof sign sits on a ray-hit point atop the domed painted roof.
  const roofHit = mountPoint(targets, new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, -1, 0));
  const roofPoint = roofHit?.point || new THREE.Vector3(0, 1.65, 0);
  const roofSign = new THREE.Group();
  roofSign.position.copy(roofPoint).add(new THREE.Vector3(0, 0.015, 0));
  body.add(roofSign);
  const signBox = addMesh(roofSign, new THREE.BoxGeometry(0.38, 0.10, 0.20), material(PAINT, { roughness: 0.36 }), [0, 0.05, 0]);
  const signTexture = makeLabelTexture('TAXI', { background: '#F0A51B', foreground: '#17191a', width: 320, height: 120, font: 'bold 78px Manrope, Arial' });
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, emissive: 0xffffff, emissiveMap: signTexture, emissiveIntensity: 1.1, roughness: 0.42, side: THREE.DoubleSide });
  addMesh(roofSign, new THREE.PlaneGeometry(0.30, 0.07), signMaterial, [0, 0.05, -0.101], [0, Math.PI, 0]);
  addMesh(roofSign, new THREE.PlaneGeometry(0.30, 0.07), signMaterial, [0, 0.05, 0.101]);

  const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 128;
  const contactCtx = contactCanvas.getContext('2d');
  const contactGradient = contactCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
  contactGradient.addColorStop(0, 'rgba(12,16,17,.72)'); contactGradient.addColorStop(0.55, 'rgba(12,16,17,.40)'); contactGradient.addColorStop(1, 'rgba(12,16,17,0)');
  contactCtx.fillStyle = contactGradient; contactCtx.fillRect(0, 0, 128, 128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  const contact = addMesh(taxi, new THREE.PlaneGeometry(2.9, 4.85), new THREE.MeshBasicMaterial({ map: contactTexture, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [0, 0.012, 0], [-Math.PI / 2, 0, 0]);
  contact.renderOrder = 1;
  const reflectionTexture = makeGlowTexture([235, 34, 24], 0.38);
  for (const side of [-1, 1]) {
    const reflection = addMesh(taxi, new THREE.PlaneGeometry(0.4, 0.95), new THREE.MeshBasicMaterial({ map: reflectionTexture, color: 0xffffff, transparent: true, opacity: 0.19, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [side * 0.64, 0.018, 2.35], [-Math.PI / 2, 0, 0]);
    reflection.renderOrder = 2;
  }

  taxi.userData.body = body;
  taxi.userData.roofSign = signBox;
  taxi.position.set(0, 0, 0);
  return taxi;
}

export function setTaxiBraking(taxi, braking) {
  for (const lamp of taxi.userData.brakeLights || []) {
    lamp.emissiveIntensity = braking ? 2.8 : 0.68;
    lamp.color.setHex(braking ? 0xff3025 : 0xb92320);
  }
  for (const glow of taxi.userData.brakeGlows || []) glow.material.opacity = braking ? 0.72 : 0.24;
}
