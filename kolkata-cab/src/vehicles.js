import * as THREE from 'three';

const YELLOW = 0xf2b91e;
const BLUE = 0x1f3f73;
const WHITE = 0xf4f0dc;
const CHROME = 0xc3c8c4;
const GLASS = 0x172c35;

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.04, flatShading: true, ...options });
}

function mesh(parent, geometry, mat, position, rotation = null) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function makeLabelTexture(text, { background = '#d8aa2d', foreground = '#251e12', width = 512, height = 160, font = 'bold 86px Manrope, Arial' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#f3dc83';
  ctx.lineWidth = Math.max(5, height * 0.035);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillText(text, width / 2, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sideGlass(parent, side, z, y, length, height, color = GLASS) {
  const glass = mesh(parent, new THREE.BoxGeometry(0.025, height, length), material(color, { roughness: 0.22, metalness: 0.18 }),
    [side * 0.785, y, z]);
  glass.castShadow = false;
  return glass;
}

function makeFender(parent, side, zCenter) {
  // Faceted semicircular arch trim follows the upper half of each wheel.
  const points = [];
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI * (i / 12);
    points.push(new THREE.Vector3(0, Math.sin(angle) * 0.48, Math.cos(angle) * 0.48));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.075, 6, false), material(YELLOW));
  arch.position.set(side * 0.82, 0.42, zCenter);
  arch.castShadow = true;
  parent.add(arch);
}

export function createTaxi() {
  const taxi = new THREE.Group();
  const body = new THREE.Group();
  taxi.add(body);
  const bodyMaterial = material(YELLOW, { roughness: 0.39 });

  // Side elevation: sloping bonnet, upright cabin and rounded Ambassador boot.
  // Shape X maps to car length (Z); extrusion depth maps across the body width (X).
  const profile = new THREE.Shape();
  profile.moveTo(-2.08, 0.47);
  profile.quadraticCurveTo(-2.12, 0.52, -2.08, 0.72);
  profile.lineTo(-1.79, 0.88);
  profile.quadraticCurveTo(-1.48, 0.99, -1.28, 1.25);
  profile.quadraticCurveTo(-1.12, 1.52, -0.82, 1.57);
  profile.lineTo(0.55, 1.57);
  profile.quadraticCurveTo(0.88, 1.55, 1.05, 1.35);
  profile.lineTo(1.22, 1.04);
  profile.quadraticCurveTo(1.5, 1.0, 1.9, 0.9);
  profile.quadraticCurveTo(2.12, 0.83, 2.1, 0.59);
  profile.quadraticCurveTo(2.07, 0.43, 1.86, 0.42);
  profile.lineTo(-1.83, 0.42);
  profile.quadraticCurveTo(-2.04, 0.42, -2.08, 0.47);
  const bodyGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: 1.58,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.055,
    bevelThickness: 0.055,
    curveSegments: 8,
  });
  bodyGeometry.translate(0, 0, -0.79);
  bodyGeometry.rotateY(-Math.PI / 2);
  mesh(body, bodyGeometry, bodyMaterial, [0, 0, 0]);

  // Dark blue lower body band and the thin white belt stripe on both sides.
  for (const side of [-1, 1]) {
    mesh(body, new THREE.BoxGeometry(0.028, 0.23, 3.72), material(BLUE), [side * 0.807, 0.66, 0]);
    mesh(body, new THREE.BoxGeometry(0.035, 0.052, 3.7), material(WHITE), [side * 0.817, 0.84, 0]);

    // Side windows are inset beneath the tall body pillars.
    sideGlass(body, side, -0.52, 1.32, 0.91, 0.36);
    sideGlass(body, side, 0.38, 1.32, 0.82, 0.36);
    sideGlass(body, side, -0.52, 1.32, 0.045, 0.44, YELLOW);
    sideGlass(body, side, 0.0, 1.32, 0.065, 0.48, YELLOW);
    sideGlass(body, side, 0.81, 1.32, 0.07, 0.47, YELLOW);
    // Small chrome door handles and mirror stalks/mirror shells.
    mesh(body, new THREE.BoxGeometry(0.035, 0.045, 0.17), material(CHROME, { metalness: 0.65 }), [side * 0.825, 1.04, 0.2]);
    mesh(body, new THREE.BoxGeometry(0.045, 0.08, 0.06), material(CHROME), [side * 0.91, 1.31, -1.19], [0, 0, side * -0.23]);
    mesh(body, new THREE.BoxGeometry(0.16, 0.12, 0.24), material(YELLOW), [side * 0.95, 1.36, -1.24]);
    makeFender(body, side, -1.28);
    makeFender(body, side, 1.28);
  }

  // Windscreen and rear window, kept separate from the body profile for a clear glass read.
  mesh(body, new THREE.BoxGeometry(1.23, 0.43, 0.035), material(GLASS, { roughness: 0.2, metalness: 0.16 }),
    [0, 1.31, -1.37], [-0.24, 0, 0]);
  mesh(body, new THREE.BoxGeometry(1.05, 0.4, 0.035), material(GLASS, { roughness: 0.2, metalness: 0.16 }),
    [0, 1.32, 0.94], [0.2, 0, 0]);
  // Wheels, thick low-poly tyres and grey hubcaps.
  const tyreMat = material(0x202326, { roughness: 0.82 });
  const hubMat = material(0x9ca29f, { metalness: 0.62, roughness: 0.35 });
  for (const side of [-1, 1]) {
    for (const z of [-1.28, 1.28]) {
      mesh(body, new THREE.CylinderGeometry(0.4, 0.4, 0.28, 12), tyreMat,
        [side * 0.83, 0.43, z], [0, 0, Math.PI / 2]);
      mesh(body, new THREE.CylinderGeometry(0.235, 0.235, 0.3, 12), hubMat,
        [side * 0.84, 0.43, z], [0, 0, Math.PI / 2]);
      mesh(body, new THREE.CylinderGeometry(0.07, 0.07, 0.31, 10), material(0x555c5b),
        [side * 0.85, 0.43, z], [0, 0, Math.PI / 2]);
    }
  }

  // Front chrome bumper, grille and round headlamps.
  mesh(body, new THREE.BoxGeometry(1.72, 0.12, 0.16), material(CHROME, { metalness: 0.72, roughness: 0.26 }), [0, 0.51, -2.08]);
  mesh(body, new THREE.BoxGeometry(0.56, 0.38, 0.055), material(0x69716f, { metalness: 0.65, roughness: 0.3 }), [0, 0.78, -2.1]);
  for (let i = -3; i <= 3; i++) {
    mesh(body, new THREE.BoxGeometry(0.035, 0.33, 0.035), material(0xe1e2d7, { metalness: 0.75, roughness: 0.24 }), [i * 0.072, 0.78, -2.14]);
  }
  const headlightMat = material(0xfff5d8, { emissive: 0xffe8ad, emissiveIntensity: 1.35, roughness: 0.18 });
  for (const side of [-1, 1]) {
    mesh(body, new THREE.CylinderGeometry(0.19, 0.19, 0.09, 16), material(CHROME, { metalness: 0.7 }),
      [side * 0.66, 0.84, -2.1], [Math.PI / 2, 0, 0]);
    mesh(body, new THREE.CircleGeometry(0.15, 16), headlightMat, [side * 0.66, 0.84, -2.153], [0, Math.PI, 0]);
  }
  mesh(body, new THREE.BoxGeometry(1.78, 0.12, 0.15), material(CHROME, { metalness: 0.72, roughness: 0.26 }), [0, 0.5, 2.08]);

  // Rear lamps intensify while braking, with their own emissive glow.
  taxi.userData.brakeLights = [];
  for (const side of [-1, 1]) {
    const lampMaterial = material(0xb42624, { emissive: 0x7b0807, emissiveIntensity: 0.7, roughness: 0.28 });
    const lamp = mesh(body, new THREE.BoxGeometry(0.22, 0.3, 0.07), lampMaterial, [side * 0.67, 0.81, 2.09]);
    taxi.userData.brakeLights.push(lampMaterial);
  }
  const plateTexture = makeLabelTexture('WB 19 A 7055', { background: '#171b1c', foreground: '#f2c641', width: 560, height: 110, font: 'bold 62px monospace' });
  mesh(body, new THREE.PlaneGeometry(0.78, 0.21), new THREE.MeshBasicMaterial({ map: plateTexture, side: THREE.DoubleSide }), [0, 0.73, 2.145]);

  // Textured yellow roof sign and modest chrome roof gutters.
  const sign = mesh(body, new THREE.BoxGeometry(0.46, 0.22, 0.25), material(YELLOW), [0, 1.69, -0.08]);
  const signTexture = makeLabelTexture('TAXI', { width: 320, height: 120, font: 'bold 78px Manrope, Arial' });
  mesh(body, new THREE.PlaneGeometry(0.36, 0.12), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }), [0, 1.72, -0.211]);
  for (const side of [-1, 1]) mesh(body, new THREE.BoxGeometry(0.035, 0.04, 1.45), material(CHROME, { metalness: 0.6 }), [side * 0.78, 1.6, -0.1]);

  taxi.userData.body = body;
  taxi.userData.roofSign = sign;
  taxi.position.set(0, 0, 0);
  return taxi;
}

export function setTaxiBraking(taxi, braking) {
  for (const lamp of taxi.userData.brakeLights || []) {
    lamp.emissiveIntensity = braking ? 2.8 : 0.7;
    lamp.color.setHex(braking ? 0xff3025 : 0xb42624);
  }
}
