import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { createLandmarks, dressChunk } from './street.js';

export const CONFIG = {
  fareRsPerGameMetre: 50,
  worldUnitsPerGameMetre: 10,
  speedMaxKmh: 110,
  acceleration: 24,
  braking: 42,
  reverseMaxKmh: 22,
  drag: 5.5,
  steeringRate: 1.8,
  roadWidth: 18,
  roadHalfWidth: 9,
  footpathWidth: 3.3,
  chunkLength: 80,
  chunkCount: 11,
  roadAheadMargin: 80,
  fogNear: 70,
  fogFar: 300,
  detailLevel: 'medium',
  density: {
    low: { clutterStep: 10, people: 8, trees: 2, poles: 2 },
    medium: { clutterStep: 7.2, people: 14, trees: 3, poles: 3 },
    high: { clutterStep: 5.5, people: 20, trees: 4, poles: 4 },
  },
  shadows: true,
  cameraHeight: 2.7,
  cameraDistance: 6.4,
  cameraSmooth: 5.5,
  passengerPickupRadiusUnits: 5.3,
  passengerPickupMaxKmh: 7,
  passengerSpawnAheadMinUnits: 125,
  passengerSpawnAheadMaxUnits: 185,
  passengerMissedUnits: 22,
  passengerRespawnAheadUnits: 145,
  passengerRespawnDelay: 1.8,
  destinationStopRadiusUnits: 5.3,
  destinationStopMaxKmh: 7,
  trafficCount: 18,
  trafficSpeedMin: 24,
  trafficSpeedMax: 62,
  jamSpeedMin: 2,
  jamSpeedMax: 11,
  jamZoneLength: 260,
  jamZoneHalfLength: 42,
  signalCount: 3,
  signalSpacing: 240,
  signalCycleSeconds: 22,
  signalRedSeconds: 8,
  signalYellowSeconds: 2.5,
  signalRecycleBehindUnits: 60,
  trafficRecycleAheadUnits: 620,
  trafficRecycleBehindUnits: 130,
  collisionHalfWidth: 1.45,
  collisionHalfLength: 2.65,
  policeStopSpeedKmh: 12,
  wantedCooldownSeconds: 3,
  wantedEscapeSeconds: 20,
  rainParticleCount: 780,
  quality: 'medium',
  exposure: 1.0,
  bloomStrength: 0.35,
  bloomRadius: 0.6,
  bloomThreshold: 0.85,
  reflectionIntensity: 1.3,
  skyElevation: 28,
  skyTurbidity: 6,
  skyRayleigh: 1.6,
  rainOpacity: 0.42,
};

export const HORIZON_COLOUR = 0xe0ded4;

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function makeNoiseTexture({ base, patch, seed, count, cracks = false, tyre = false }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  let state = seed;
  const random = () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    const radiusX = 2 + random() * 34;
    const radiusY = 1 + random() * 17;
    ctx.fillStyle = `rgba(${patch},${0.025 + random() * 0.09})`;
    const x = random() * 512;
    const y = random() * 512;
    const angle = random() * Math.PI;
    const xCopies = [0, ...(x < radiusX ? [512] : []), ...(x + radiusX > 512 ? [-512] : [])];
    const yCopies = [0, ...(y < radiusY ? [512] : []), ...(y + radiusY > 512 ? [-512] : [])];
    for (const dx of xCopies) for (const dy of yCopies) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, radiusX, radiusY, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (cracks) {
    ctx.strokeStyle = 'rgba(27,31,33,.22)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 17; i++) {
      let x = 40 + random() * 432;
      let y = 48 + random() * 280;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let step = 0; step < 5; step++) {
        x = Math.max(40, Math.min(472, x + (random() - 0.5) * 30));
        y += 8 + random() * 25;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (tyre) {
    ctx.strokeStyle = 'rgba(38,42,43,.12)';
    ctx.lineWidth = 8;
    ctx.setLineDash([28, 24]);
    for (const x of [118, 395]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 7, 512);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const roadTexture = makeNoiseTexture({ base: '#ffffff', patch: '48,51,52', seed: 1432, count: 620, cracks: true, tyre: true });
const groundTexture = makeNoiseTexture({ base: '#ffffff', patch: '58,62,53', seed: 3917, count: 680 });

function canvasTexture(canvas, colorSpace = null) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (colorSpace) texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  return texture;
}

function deriveNormalMap(source, strength = 2.4) {
  const width = source.width, height = source.height;
  const sourceCtx = source.getContext('2d');
  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const output = ctx.createImageData(width, height);
  const sample = (x, y) => pixels[(THREE.MathUtils.euclideanModulo(y, height) * width + THREE.MathUtils.euclideanModulo(x, width)) * 4];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const gx = (sample(x + 1, y - 1) + 2 * sample(x + 1, y) + sample(x + 1, y + 1) - sample(x - 1, y - 1) - 2 * sample(x - 1, y) - sample(x - 1, y + 1)) / 8;
    const gy = (sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1) - sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1)) / 8;
    const i = (y * width + x) * 4;
    output.data[i] = THREE.MathUtils.clamp(128 - gx * strength, 0, 255);
    output.data[i + 1] = THREE.MathUtils.clamp(128 - gy * strength, 0, 255);
    output.data[i + 2] = 255;
    output.data[i + 3] = 255;
  }
  ctx.putImageData(output, 0, 0);
  return canvasTexture(canvas);
}

function makeRoughnessMap(size = 512) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d2d2d2'; ctx.fillRect(0, 0, size, size);
  let seed = 81231;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 18; i++) {
    const x = random() * size, y = random() * size, rx = 12 + random() * 65, ry = 4 + random() * 24;
    ctx.save(); ctx.translate(x, y); ctx.rotate(random() * Math.PI); ctx.scale(rx, ry);
    const wet = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    wet.addColorStop(0, '#4d4d4d'); wet.addColorStop(0.62, 'rgba(77,77,77,.92)'); wet.addColorStop(1, 'rgba(77,77,77,0)');
    ctx.fillStyle = wet; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  return canvasTexture(canvas);
}

const roadNormal = deriveNormalMap(roadTexture.image, 3.5);
const roadRoughness = makeRoughnessMap();

function makeBrickCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#594740'; ctx.fillRect(0, 0, 512, 512);
  const tones = ['#9a6151', '#a66b59', '#8e594c', '#aa705d', '#965d4e'];
  for (let row = 0; row < 16; row++) {
    const y = row * 32; const offset = row % 2 ? -24 : 0;
    for (let x = offset; x < 512; x += 64) {
      ctx.fillStyle = tones[(row * 7 + Math.floor((x + 24) / 64)) % tones.length];
      ctx.fillRect(x + 2, y + 2, 60, 28);
      ctx.fillStyle = 'rgba(235,190,155,.12)'; ctx.fillRect(x + 3, y + 3, 58, 2);
    }
  }
  return canvas;
}
const brickCanvas = makeBrickCanvas();
const brickTexture = canvasTexture(brickCanvas, THREE.SRGBColorSpace);
const brickNormal = deriveNormalMap(brickCanvas, 5.5);

function makePuddleTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.96)'); gradient.addColorStop(.68, 'rgba(255,255,255,.68)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return canvasTexture(canvas, THREE.SRGBColorSpace);
}
const puddleTexture = makePuddleTexture();

function createCamberedRoad() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const across = 8;
  const along = 2;
  for (let iz = 0; iz <= along; iz++) {
    const v = iz / along;
    const z = -CONFIG.chunkLength / 2 + v * CONFIG.chunkLength;
    for (let ix = 0; ix <= across; ix++) {
      const u = ix / across;
      const x = -CONFIG.roadHalfWidth + u * CONFIG.roadWidth;
      const edge = Math.abs(x) / CONFIG.roadHalfWidth;
      const y = -0.04 - edge * edge * 0.09;
      positions.push(x, y, z);
      uvs.push(u * 3, v * 8);
    }
  }
  for (let iz = 0; iz < along; iz++) {
    for (let ix = 0; ix < across; ix++) {
      const a = iz * (across + 1) + ix;
      const b = a + across + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addInstances(parent, geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  items.forEach((item, index) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (item.color) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function createChunk(index) {
  const group = new THREE.Group();
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x5a5d5e,
    map: roadTexture,
    normalMap: roadNormal,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughnessMap: roadRoughness,
    roughness: 0.54,
    metalness: 0.12,
    flatShading: false,
  });
  asphalt.envMapIntensity = CONFIG.reflectionIntensity;
  const road = new THREE.Mesh(createCamberedRoad(), asphalt);
  road.receiveShadow = true;
  group.add(road);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, CONFIG.chunkLength), new THREE.MeshStandardMaterial({
    color: 0x9ba7a5, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.16,
  }));
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = -0.025;
  group.add(sheen);

  // Brick footpaths and a single batched black/yellow curb stripe mesh.
  for (const side of [-1, 1]) {
    const footpathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: brickTexture, normalMap: brickNormal, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.78, metalness: 0.02, flatShading: true });
    brickTexture.repeat.set(2.5, CONFIG.chunkLength / 3.2);
    brickNormal.repeat.copy(brickTexture.repeat);
    const footpath = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.footpathWidth, 0.32, CONFIG.chunkLength), footpathMat);
    footpath.position.set(side * (CONFIG.roadHalfWidth + CONFIG.footpathWidth / 2), -0.02, 0);
    footpath.receiveShadow = true;
    group.add(footpath);
  }
  const curbItems = [];
  for (const side of [-1, 1]) {
    for (let z = -CONFIG.chunkLength / 2 + 1.5; z < CONFIG.chunkLength / 2; z += 3) {
      curbItems.push({ x: side * (CONFIG.roadHalfWidth + 0.2), y: 0.02, z, sz: 1.5, color: Math.floor((z + 80) / 3) % 2 ? 0x282b29 : 0xe9c451 });
    }
  }
  addInstances(group, new THREE.BoxGeometry(0.42, 0.25, 1.5), lambert(0xffffff), curbItems);

  // Lane dashes, tram rails and sleepers are batched to keep draw calls low.
  const dashes = [];
  for (const x of [-3, 3]) for (let z = -CONFIG.chunkLength / 2 + 2; z < CONFIG.chunkLength / 2; z += 13) dashes.push({ x, y: -0.005, z, sz: 6 });
  addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 6), lambert(0xe0ded1), dashes);
  const rails = [];
  for (const side of [-1, 1]) {
    const x = side < 0 ? -7.2 : -6.5;
    rails.push({ x, y: -0.005, z: 0, sz: CONFIG.chunkLength / 0.12 });
  }
  addInstances(group, new THREE.BoxGeometry(0.12, 0.055, 0.12), lambert(0x777b78), rails);
  const sleepers = [];
  for (let z = -CONFIG.chunkLength / 2 + 1; z < CONFIG.chunkLength / 2; z += 2.4) sleepers.push({ x: -6.85, y: 0, z, sx: 9.2 });
  addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 0.14), lambert(0x4d4940), sleepers);

  // Crossings repeat in a 160/80 m cadence: 120 m average spacing.
  if (index % 3 !== 1) {
    const crossing = [];
    for (let x = -8.1; x <= 8.1; x += 1.35) crossing.push({ x, y: -0.005, z: 0, sx: 0.55, sz: 4.2 });
    addInstances(group, new THREE.BoxGeometry(1, 0.025, 1), lambert(0xe9e7db), crossing);
  }
  const puddleGeometry = new THREE.CircleGeometry(1, 12);
  const puddleMat = new THREE.MeshPhysicalMaterial({ map: puddleTexture, color: 0x9eafb1, roughness: 0.05, metalness: 0.48, clearcoat: 0.7, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: CONFIG.reflectionIntensity });
  const puddles = [];
  for (let p = 0; p < 4; p++) {
    const z = -30 + ((index * 11 + p * 17) % 60);
    const x = [-7.1, 1.1, 6.8, -1.9][p];
    puddles.push({ x, y: -0.017, z, sx: 0.35 + (p % 2) * 0.4, sz: 1.2 + (p % 3) * 0.55, rx: -Math.PI / 2 });
  }
  addInstances(group, puddleGeometry, puddleMat, puddles);
  const manhole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 12), new THREE.MeshStandardMaterial({ color: 0x464a49, roughness: 0.72, metalness: 0.28, side: THREE.DoubleSide }));
  manhole.rotation.x = -Math.PI / 2;
  manhole.position.set(index % 2 ? 2.4 : -2.4, -0.018, 24);
  group.add(manhole);
  group.userData.index = index;
  group.userData.animatePeople = dressChunk(group, index, CONFIG.detailLevel, CONFIG);
  return group;
}

function makeSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(450000);
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = CONFIG.skyTurbidity;
  uniforms.rayleigh.value = CONFIG.skyRayleigh;
  uniforms.mieCoefficient.value = 0.004;
  uniforms.mieDirectionalG.value = 0.82;
  const sunPosition = new THREE.Vector3();
  sunPosition.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - CONFIG.skyElevation), THREE.MathUtils.degToRad(145));
  uniforms.sunPosition.value.copy(sunPosition);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const environmentScene = new THREE.Scene();
  environmentScene.add(sky.clone());
  const environment = pmrem.fromScene(environmentScene);
  scene.environment = environment.texture;
  scene.environmentIntensity = CONFIG.reflectionIntensity;
  pmrem.dispose();
  return sky;
}

export function createWorld(scene, renderer) {
  scene.background = new THREE.Color(HORIZON_COLOUR);
  scene.fog = new THREE.Fog(HORIZON_COLOUR, CONFIG.fogNear, CONFIG.fogFar);
  const sky = makeSky(scene, renderer);
  scene.add(new THREE.HemisphereLight(0xbcd3e6, 0x6b5a48, 0.9));
  scene.add(new THREE.AmbientLight(0x9ca8ad, 0.22));
  const sun = new THREE.DirectionalLight(0xffe8c6, 2.2);
  sun.position.set(14, 26, 18);
  sun.castShadow = CONFIG.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);

  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4b4e49, map: groundTexture, flatShading: true, fog: true });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.46;
  ground.receiveShadow = true;
  scene.add(ground);

  const landmarks = createLandmarks(scene);
  const chunks = Array.from({ length: CONFIG.chunkCount }, (_, i) => {
    const chunk = createChunk(i);
    chunk.position.z = 40 - i * CONFIG.chunkLength;
    scene.add(chunk);
    return chunk;
  });
  const shadowTarget = new THREE.Vector3();
  return {
    update(playerZ, cameraPosition) {
      const time = performance.now() / 1000;
      ground.position.x = cameraPosition.x;
      ground.position.z = playerZ;
      sky.position.copy(cameraPosition);
      landmarks.update(playerZ, cameraPosition.x);
      for (const chunk of chunks) chunk.userData.animatePeople?.(time);
      shadowTarget.set(cameraPosition.x, 0, playerZ);
      sun.target.position.copy(shadowTarget);
      sun.position.set(cameraPosition.x + 14, 26, playerZ + 18);
      sun.shadow.camera.updateProjectionMatrix();
      const recycleBefore = playerZ + CONFIG.chunkLength / 2 + CONFIG.roadAheadMargin;
      for (const chunk of chunks) {
        if (chunk.position.z + CONFIG.chunkLength / 2 > recycleBefore) {
          const minZ = Math.min(...chunks.map((item) => item.position.z));
          chunk.position.z = minZ - CONFIG.chunkLength;
        }
      }
    },
  };
}
