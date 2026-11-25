// import * as THREE from 'three';
// import { createLandmarks, dressChunk } from './street.js';

// export const CONFIG = {
//   fareRsPerGameMetre: 50,
//   worldUnitsPerGameMetre: 10,
//   speedMaxKmh: 110,
//   acceleration: 24,
//   braking: 42,
//   reverseMaxKmh: 22,
//   drag: 5.5,
//   steeringRate: 1.8,
//   roadWidth: 18,
//   roadHalfWidth: 9,
//   footpathWidth: 3.3,
//   chunkLength: 80,
//   chunkCount: 11,
//   roadAheadMargin: 80,
//   fogNear: 75,
//   fogFar: 320,
//   detailLevel: 'medium',
//   density: {
//     low: { clutterStep: 10, people: 8, trees: 2, poles: 2 },
//     medium: { clutterStep: 7.2, people: 14, trees: 3, poles: 3 },
//     high: { clutterStep: 5.5, people: 20, trees: 4, poles: 4 },
//   },
//   shadows: true,
//   cameraHeight: 2.7,
//   cameraDistance: 6.4,
//   cameraSmooth: 5.5,
//   passengerPickupRadiusUnits: 5.3,
//   passengerPickupMaxKmh: 7,
//   passengerSpawnAheadMinUnits: 125,
//   passengerSpawnAheadMaxUnits: 185,
//   passengerMissedUnits: 22,
//   passengerRespawnAheadUnits: 145,
//   passengerRespawnDelay: 1.8,
//   destinationStopRadiusUnits: 5.3,
//   destinationStopMaxKmh: 7,
//   trafficCount: 18,
//   trafficSpeedMin: 24,
//   trafficSpeedMax: 62,
//   jamSpeedMin: 2,
//   jamSpeedMax: 11,
//   jamZoneLength: 260,
//   jamZoneHalfLength: 42,
//   signalCount: 3,
//   signalSpacing: 240,
//   signalCycleSeconds: 22,
//   signalRedSeconds: 8,
//   signalYellowSeconds: 2.5,
//   signalRecycleBehindUnits: 60,
//   trafficRecycleAheadUnits: 620,
//   trafficRecycleBehindUnits: 130,
//   collisionHalfWidth: 1.45,
//   collisionHalfLength: 2.65,
//   policeStopSpeedKmh: 12,
//   wantedCooldownSeconds: 3,
//   wantedEscapeSeconds: 20,
//   rainParticleCount: 920,
//   quality: 'medium',
//   exposure: 1.12,
//   bloomStrength: 0.55,
//   bloomRadius: 0.52,
//   bloomThreshold: 0.68,
//   reflectionIntensity: 1.45,
//   rainOpacity: 0.34,
// };

// export const HORIZON_COLOUR = 0x0c121b;
// export const DAY_HORIZON_COLOUR = 0xb9d6ec;

// const stdMat = (color, extra = {}) =>
//   new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...extra });

// function makeNoiseTexture({ base, patch, seed, count, cracks = false, tyre = false }) {
//   const canvas = document.createElement('canvas');
//   canvas.width = canvas.height = 512;
//   const ctx = canvas.getContext('2d');
//   ctx.fillStyle = base;
//   ctx.fillRect(0, 0, 512, 512);
//   let state = seed;
//   const random = () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
//   for (let i = 0; i < count; i++) {
//     const radiusX = 2 + random() * 34;
//     const radiusY = 1 + random() * 17;
//     ctx.fillStyle = `rgba(${patch},${0.04 + random() * 0.12})`;
//     const x = random() * 512;
//     const y = random() * 512;
//     const angle = random() * Math.PI;
//     const xCopies = [0, ...(x < radiusX ? [512] : []), ...(x + radiusX > 512 ? [-512] : [])];
//     const yCopies = [0, ...(y < radiusY ? [512] : []), ...(y + radiusY > 512 ? [-512] : [])];
//     for (const dx of xCopies) for (const dy of yCopies) {
//       ctx.beginPath();
//       ctx.ellipse(x + dx, y + dy, radiusX, radiusY, angle, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }
//   if (cracks) {
//     ctx.strokeStyle = 'rgba(8,10,12,.45)';
//     ctx.lineWidth = 1.5;
//     for (let i = 0; i < 19; i++) {
//       let x = 40 + random() * 432;
//       let y = 48 + random() * 280;
//       ctx.beginPath();
//       ctx.moveTo(x, y);
//       for (let step = 0; step < 5; step++) {
//         x = Math.max(40, Math.min(472, x + (random() - 0.5) * 30));
//         y += 8 + random() * 25;
//         ctx.lineTo(x, y);
//       }
//       ctx.stroke();
//     }
//   }
//   if (tyre) {
//     ctx.strokeStyle = 'rgba(10,13,16,.28)';
//     ctx.lineWidth = 10;
//     ctx.setLineDash([32, 20]);
//     for (const x of [118, 395]) {
//       ctx.beginPath();
//       ctx.moveTo(x, 0);
//       ctx.lineTo(x + 7, 512);
//       ctx.stroke();
//     }
//     ctx.setLineDash([]);
//   }
//   const texture = new THREE.CanvasTexture(canvas);
//   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
//   texture.colorSpace = THREE.SRGBColorSpace;
//   texture.anisotropy = 4;
//   return texture;
// }

// const roadTexture = makeNoiseTexture({ base: '#30363e', patch: '12,15,20', seed: 1432, count: 650, cracks: true, tyre: true });
// const groundTexture = makeNoiseTexture({ base: '#1a2026', patch: '10,12,15', seed: 3917, count: 520 });

// function canvasTexture(canvas, colorSpace = null) {
//   const texture = new THREE.CanvasTexture(canvas);
//   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
//   if (colorSpace) texture.colorSpace = colorSpace;
//   texture.anisotropy = 8;
//   return texture;
// }

// function deriveNormalMap(source, strength = 2.4) {
//   const width = source.width, height = source.height;
//   const sourceCtx = source.getContext('2d');
//   const pixels = sourceCtx.getImageData(0, 0, width, height).data;
//   const canvas = document.createElement('canvas');
//   canvas.width = width; canvas.height = height;
//   const ctx = canvas.getContext('2d');
//   const output = ctx.createImageData(width, height);
//   const sample = (x, y) => pixels[(THREE.MathUtils.euclideanModulo(y, height) * width + THREE.MathUtils.euclideanModulo(x, width)) * 4];
//   for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
//     const gx = (sample(x + 1, y - 1) + 2 * sample(x + 1, y) + sample(x + 1, y + 1) - sample(x - 1, y - 1) - 2 * sample(x - 1, y) - sample(x - 1, y + 1)) / 8;
//     const gy = (sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1) - sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1)) / 8;
//     const i = (y * width + x) * 4;
//     output.data[i] = THREE.MathUtils.clamp(128 - gx * strength, 0, 255);
//     output.data[i + 1] = THREE.MathUtils.clamp(128 - gy * strength, 0, 255);
//     output.data[i + 2] = 255;
//     output.data[i + 3] = 255;
//   }
//   ctx.putImageData(output, 0, 0);
//   return canvasTexture(canvas);
// }

// function makeRoughnessMap(size = 512) {
//   const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
//   const ctx = canvas.getContext('2d');
//   ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, size, size);
//   let seed = 81231;
//   const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
//   for (let i = 0; i < 28; i++) {
//     const x = random() * size, y = random() * size, rx = 18 + random() * 82, ry = 8 + random() * 34;
//     ctx.save(); ctx.translate(x, y); ctx.rotate(random() * Math.PI); ctx.scale(rx, ry);
//     const wet = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
//     wet.addColorStop(0, '#101010');
//     wet.addColorStop(0.58, 'rgba(20,20,20,.92)');
//     wet.addColorStop(1, 'rgba(20,20,20,0)');
//     ctx.fillStyle = wet; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
//   }
//   return canvasTexture(canvas);
// }

// const roadNormal = deriveNormalMap(roadTexture.image, 3.2);
// const roadRoughness = makeRoughnessMap();

// function makeBrickCanvas() {
//   const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
//   const ctx = canvas.getContext('2d'); ctx.fillStyle = '#2d2420'; ctx.fillRect(0, 0, 512, 512);
//   const tones = ['#5a3a30', '#634136', '#4f332b', '#694539', '#56372e'];
//   for (let row = 0; row < 16; row++) {
//     const y = row * 32; const offset = row % 2 ? -24 : 0;
//     for (let x = offset; x < 512; x += 64) {
//       ctx.fillStyle = tones[(row * 7 + Math.floor((x + 24) / 64)) % tones.length];
//       ctx.fillRect(x + 2, y + 2, 60, 28);
//       ctx.fillStyle = 'rgba(220,180,145,.08)'; ctx.fillRect(x + 3, y + 3, 58, 2);
//     }
//   }
//   return canvas;
// }
// const brickCanvas = makeBrickCanvas();
// const brickTexture = canvasTexture(brickCanvas, THREE.SRGBColorSpace);
// const brickNormal = deriveNormalMap(brickCanvas, 5.0);

// function makePuddleTexture() {
//   const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
//   const ctx = canvas.getContext('2d');
//   const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
//   gradient.addColorStop(0, 'rgba(255,255,255,.96)');
//   gradient.addColorStop(0.65, 'rgba(255,255,255,.65)');
//   gradient.addColorStop(1, 'rgba(255,255,255,0)');
//   ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
//   return canvasTexture(canvas, THREE.SRGBColorSpace);
// }
// const puddleTexture = makePuddleTexture();

// function createCamberedRoad() {
//   const positions = [];
//   const uvs = [];
//   const indices = [];
//   const across = 8;
//   const along = 2;
//   for (let iz = 0; iz <= along; iz++) {
//     const v = iz / along;
//     const z = -CONFIG.chunkLength / 2 + v * CONFIG.chunkLength;
//     for (let ix = 0; ix <= across; ix++) {
//       const u = ix / across;
//       const x = -CONFIG.roadHalfWidth + u * CONFIG.roadWidth;
//       const edge = Math.abs(x) / CONFIG.roadHalfWidth;
//       const y = -0.04 - edge * edge * 0.09;
//       positions.push(x, y, z);
//       uvs.push(u * 3, v * 8);
//     }
//   }
//   for (let iz = 0; iz < along; iz++) {
//     for (let ix = 0; ix < across; ix++) {
//       const a = iz * (across + 1) + ix;
//       const b = a + across + 1;
//       indices.push(a, b, a + 1, b, b + 1, a + 1);
//     }
//   }
//   const geometry = new THREE.BufferGeometry();
//   geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
//   geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
//   geometry.setIndex(indices);
//   geometry.computeVertexNormals();
//   return geometry;
// }

// function addInstances(parent, geometry, material, items) {
//   if (!items.length) return null;
//   const mesh = new THREE.InstancedMesh(geometry, material, items.length);
//   mesh.castShadow = true;
//   mesh.receiveShadow = true;
//   const dummy = new THREE.Object3D();
//   items.forEach((item, index) => {
//     dummy.position.set(item.x, item.y, item.z);
//     dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
//     dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
//     dummy.updateMatrix();
//     mesh.setMatrixAt(index, dummy.matrix);
//     if (item.color) mesh.setColorAt(index, new THREE.Color(item.color));
//   });
//   mesh.instanceMatrix.needsUpdate = true;
//   parent.add(mesh);
//   return mesh;
// }

// function createChunk(index) {
//   const group = new THREE.Group();
//   const asphalt = new THREE.MeshStandardMaterial({
//     color: 0x262c34,
//     map: roadTexture,
//     normalMap: roadNormal,
//     normalScale: new THREE.Vector2(0.38, 0.38),
//     roughnessMap: roadRoughness,
//     roughness: 0.42,
//     metalness: 0.28,
//     envMapIntensity: CONFIG.reflectionIntensity,
//   });
//   const road = new THREE.Mesh(createCamberedRoad(), asphalt);
//   road.receiveShadow = true;
//   group.add(road);

//   const sheen = new THREE.Mesh(
//     new THREE.PlaneGeometry(3.2, CONFIG.chunkLength),
//     new THREE.MeshStandardMaterial({
//       color: 0x3b4858,
//       roughness: 0.08,
//       metalness: 0.55,
//       transparent: true,
//       opacity: 0.14,
//       envMapIntensity: CONFIG.reflectionIntensity,
//     })
//   );
//   sheen.rotation.x = -Math.PI / 2;
//   sheen.position.y = -0.024;
//   group.add(sheen);

//   for (const side of [-1, 1]) {
//     const footpathMat = new THREE.MeshStandardMaterial({
//       color: 0xb8aba2,
//       map: brickTexture,
//       normalMap: brickNormal,
//       normalScale: new THREE.Vector2(0.4, 0.4),
//       roughness: 0.52,
//       metalness: 0.1,
//     });
//     brickTexture.repeat.set(2.5, CONFIG.chunkLength / 3.2);
//     brickNormal.repeat.copy(brickTexture.repeat);
//     const footpath = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.footpathWidth, 0.32, CONFIG.chunkLength), footpathMat);
//     footpath.position.set(side * (CONFIG.roadHalfWidth + CONFIG.footpathWidth / 2), -0.02, 0);
//     footpath.receiveShadow = true;
//     group.add(footpath);
//   }

//   const curbItems = [];
//   for (const side of [-1, 1]) {
//     for (let z = -CONFIG.chunkLength / 2 + 1.5; z < CONFIG.chunkLength / 2; z += 3) {
//       curbItems.push({ x: side * (CONFIG.roadHalfWidth + 0.2), y: 0.02, z, sz: 1.5, color: Math.floor((z + 80) / 3) % 2 ? 0x1a1e20 : 0xd4ad3f });
//     }
//   }
//   addInstances(group, new THREE.BoxGeometry(0.42, 0.25, 1.5), stdMat(0xffffff, { roughness: 0.55 }), curbItems);

//   const dashes = [];
//   for (const x of [-3, 3]) for (let z = -CONFIG.chunkLength / 2 + 2; z < CONFIG.chunkLength / 2; z += 13) dashes.push({ x, y: -0.005, z, sz: 6 });
//   addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 6), stdMat(0xb8b4a4, { roughness: 0.45 }), dashes);

//   const rails = [];
//   for (const side of [-1, 1]) {
//     const x = side < 0 ? -7.2 : -6.5;
//     rails.push({ x, y: -0.004, z: 0, sz: CONFIG.chunkLength / 0.12 });
//   }
//   addInstances(group, new THREE.BoxGeometry(0.12, 0.055, 0.12), new THREE.MeshStandardMaterial({ color: 0x8e969c, roughness: 0.22, metalness: 0.88 }), rails);

//   const sleepers = [];
//   for (let z = -CONFIG.chunkLength / 2 + 1; z < CONFIG.chunkLength / 2; z += 2.4) sleepers.push({ x: -6.85, y: 0, z, sx: 9.2 });
//   addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 0.14), stdMat(0x2e2b26, { roughness: 0.85 }), sleepers);

//   if (index % 3 !== 1) {
//     const crossing = [];
//     for (let x = -8.1; x <= 8.1; x += 1.35) crossing.push({ x, y: -0.005, z: 0, sx: 0.55, sz: 4.2 });
//     addInstances(group, new THREE.BoxGeometry(1, 0.025, 1), stdMat(0xc4c1b4, { roughness: 0.45 }), crossing);
//   }

//   const puddleGeometry = new THREE.CircleGeometry(1, 14);
//   const puddleMat = new THREE.MeshPhysicalMaterial({
//     map: puddleTexture,
//     color: 0x48586a,
//     roughness: 0.04,
//     metalness: 0.65,
//     clearcoat: 1.0,
//     clearcoatRoughness: 0.04,
//     transparent: true,
//     opacity: 0.72,
//     side: THREE.DoubleSide,
//     depthWrite: false,
//     envMapIntensity: CONFIG.reflectionIntensity * 1.35,
//   });
//   const puddles = [];
//   for (let p = 0; p < 5; p++) {
//     const z = -32 + ((index * 13 + p * 16) % 64);
//     const x = [-6.8, -2.2, 1.4, 5.2, 7.1][p];
//     puddles.push({ x, y: -0.016, z, sx: 0.55 + (p % 2) * 0.45, sz: 1.5 + (p % 3) * 0.7, rx: -Math.PI / 2 });
//   }
//   addInstances(group, puddleGeometry, puddleMat, puddles);

//   const manhole = new THREE.Mesh(
//     new THREE.CircleGeometry(0.62, 12),
//     new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide })
//   );
//   manhole.rotation.x = -Math.PI / 2;
//   manhole.position.set(index % 2 ? 2.4 : -2.4, -0.017, 24);
//   group.add(manhole);

//   group.userData.index = index;
//   group.userData.animatePeople = dressChunk(group, index, CONFIG.detailLevel, CONFIG);
//   return group;
// }

// function makeSkyDome(canvas) {
//   const tex = new THREE.CanvasTexture(canvas);
//   tex.mapping = THREE.EquirectangularReflectionMapping;
//   tex.colorSpace = THREE.SRGBColorSpace;
//   return new THREE.Mesh(
//     new THREE.SphereGeometry(520, 28, 18),
//     new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
//   );
// }

// function makeNightSkyCanvas() {
//   const canvas = document.createElement('canvas');
//   canvas.width = 512;
//   canvas.height = 256;
//   const ctx = canvas.getContext('2d');

//   const grad = ctx.createLinearGradient(0, 0, 0, 256);
//   grad.addColorStop(0.0, '#050810');
//   grad.addColorStop(0.42, '#0c1524');
//   grad.addColorStop(0.68, '#1a2230');
//   grad.addColorStop(0.84, '#2a2224');
//   grad.addColorStop(1.0, '#090d14');
//   ctx.fillStyle = grad;
//   ctx.fillRect(0, 0, 512, 256);

//   const glows = [
//     { x: 70, y: 158, r: 44, c: 'rgba(255,176,74,0.65)' },
//     { x: 160, y: 162, r: 36, c: 'rgba(255,112,158,0.42)' },
//     { x: 256, y: 156, r: 52, c: 'rgba(255,194,96,0.72)' },
//     { x: 350, y: 162, r: 38, c: 'rgba(104,210,255,0.38)' },
//     { x: 442, y: 158, r: 46, c: 'rgba(255,168,68,0.65)' },
//   ];
//   for (const g of glows) {
//     const rg = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, g.r);
//     rg.addColorStop(0, g.c);
//     rg.addColorStop(1, 'rgba(0,0,0,0)');
//     ctx.fillStyle = rg;
//     ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
//   }
//   return canvas;
// }

// function makeDaySkyCanvas() {
//   const canvas = document.createElement('canvas');
//   canvas.width = 1024;
//   canvas.height = 512;
//   const ctx = canvas.getContext('2d');

//   // Pleasant blue sky transitioning into a soft sunlit horizon
//   const grad = ctx.createLinearGradient(0, 0, 0, 512);
//   grad.addColorStop(0.0, '#2c72c4');
//   grad.addColorStop(0.32, '#5ba2e6');
//   grad.addColorStop(0.54, '#9cc9f0');
//   grad.addColorStop(0.68, '#d4e8f7');
//   grad.addColorStop(1.0, '#8fb8dc');
//   ctx.fillStyle = grad;
//   ctx.fillRect(0, 0, 1024, 512);

//   // Soft sun glow
//   const sunGlow = ctx.createRadialGradient(740, 130, 6, 740, 130, 160);
//   sunGlow.addColorStop(0.0, 'rgba(255, 250, 224, 0.95)');
//   sunGlow.addColorStop(0.25, 'rgba(255, 240, 195, 0.45)');
//   sunGlow.addColorStop(1.0, 'rgba(255, 240, 195, 0)');
//   ctx.fillStyle = sunGlow;
//   ctx.fillRect(560, 0, 360, 310);

//   // Soft painted clouds along the upper/mid sky band
//   const cloudClusters = [
//     { cx: 140, cy: 135, s: 1.0 },
//     { cx: 360, cy: 112, s: 1.15 },
//     { cx: 560, cy: 148, s: 0.9 },
//     { cx: 880, cy: 122, s: 1.05 },
//   ];
//   for (const cl of cloudClusters) {
//     for (let p = -2; p <= 2; p++) {
//       const px = cl.cx + p * 28 * cl.s;
//       const py = cl.cy + Math.abs(p) * 5 * cl.s;
//       const pr = (34 - Math.abs(p) * 5) * cl.s;
//       const cg = ctx.createRadialGradient(px, py - pr * 0.2, 2, px, py, pr);
//       cg.addColorStop(0, 'rgba(255, 253, 248, 0.92)');
//       cg.addColorStop(0.65, 'rgba(245, 250, 255, 0.58)');
//       cg.addColorStop(1, 'rgba(245, 250, 255, 0)');
//       ctx.fillStyle = cg;
//       ctx.beginPath();
//       ctx.arc(px, py, pr, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }

//   return canvas;
// }

// function createCloudFlock(scene) {
//   const flock = new THREE.Group();
//   const cloudMat = new THREE.MeshStandardMaterial({
//     color: 0xf8fbff,
//     roughness: 0.95,
//     metalness: 0.0,
//     transparent: true,
//     opacity: 0.88,
//   });
//   const puffGeo = new THREE.SphereGeometry(1, 12, 10);
//   const clusters = [];

//   for (let i = 0; i < 14; i++) {
//     const group = new THREE.Group();
//     const baseX = ((i % 5) - 2) * 34 + (i % 2) * 9;
//     const baseY = 58 + (i % 3) * 8;
//     const baseZ = -35 - i * 24;
//     group.position.set(baseX, baseY, baseZ);

//     const puffs = [
//       { x: 0, y: 0, z: 0, sx: 11, sy: 3.4, sz: 7.5 },
//       { x: -6.5, y: -0.6, z: 0.8, sx: 7.5, sy: 2.6, sz: 5.8 },
//       { x: 6.8, y: -0.5, z: -0.6, sx: 8.2, sy: 2.8, sz: 6.0 },
//       { x: 1.8, y: 1.5, z: 0.5, sx: 6.8, sy: 2.5, sz: 5.2 },
//     ];
//     for (const pf of puffs) {
//       const m = new THREE.Mesh(puffGeo, cloudMat);
//       m.position.set(pf.x, pf.y, pf.z);
//       m.scale.set(pf.sx, pf.sy, pf.sz);
//       group.add(m);
//     }
//     flock.add(group);
//     clusters.push({
//       group,
//       baseX,
//       baseY,
//       relZ: baseZ,
//       driftSpeed: 0.8 + (i % 4) * 0.25,
//       phase: i * 0.9,
//     });
//   }

//   flock.visible = false;
//   scene.add(flock);

//   return {
//     group: flock,
//     setVisible(v) {
//       flock.visible = v;
//     },
//     update(playerZ, time) {
//       if (!flock.visible) return;
//       for (const c of clusters) {
//         let worldZ = playerZ + c.relZ;
//         if (worldZ > playerZ + 45) c.relZ -= 336;
//         else if (worldZ < playerZ - 290) c.relZ += 336;
//         worldZ = playerZ + c.relZ;

//         const driftX = c.baseX + Math.sin(time * 0.12 * c.driftSpeed + c.phase) * 14;
//         const bobY = c.baseY + Math.cos(time * 0.25 + c.phase) * 0.6;
//         c.group.position.set(driftX, bobY, worldZ);
//       }
//     },
//   };
// }

// export function createWorld(scene, renderer) {
//   let mode = 'night';

//   const nightFog = new THREE.FogExp2(HORIZON_COLOUR, 0.0082);
//   const dayFog = new THREE.Fog(DAY_HORIZON_COLOUR, CONFIG.fogNear, CONFIG.fogFar);

//   scene.background = new THREE.Color(HORIZON_COLOUR);
//   scene.fog = nightFog;

//   const nightSky = makeSkyDome(makeNightSkyCanvas());
//   const daySky = makeSkyDome(makeDaySkyCanvas());
//   daySky.visible = false;
//   scene.add(nightSky, daySky);

//   const cloudFlock = createCloudFlock(scene);

//   const hemiLight = new THREE.HemisphereLight(0x3a5275, 0x3b2818, 0.65);
//   const ambientLight = new THREE.AmbientLight(0x243040, 0.28);
//   scene.add(hemiLight, ambientLight);

//   const sunOrMoon = new THREE.DirectionalLight(0x9ab8e0, 0.85);
//   sunOrMoon.position.set(16, 28, 18);
//   sunOrMoon.castShadow = CONFIG.shadows;
//   sunOrMoon.shadow.mapSize.set(2048, 2048);
//   sunOrMoon.shadow.camera.left = -45;
//   sunOrMoon.shadow.camera.right = 45;
//   sunOrMoon.shadow.camera.top = 45;
//   sunOrMoon.shadow.camera.bottom = -45;
//   sunOrMoon.shadow.camera.near = 1;
//   sunOrMoon.shadow.camera.far = 150;
//   sunOrMoon.shadow.bias = -0.00025;
//   sunOrMoon.shadow.normalBias = 0.035;
//   sunOrMoon.shadow.radius = 3;
//   scene.add(sunOrMoon, sunOrMoon.target);

//   const streetWarmLeft = new THREE.PointLight(0xffb454, 18, 38, 1.5);
//   const streetWarmRight = new THREE.PointLight(0xffa84c, 18, 38, 1.5);
//   scene.add(streetWarmLeft, streetWarmRight);

//   const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x161b22, map: groundTexture, roughness: 0.9, fog: true });
//   const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), groundMaterial);
//   ground.rotation.x = -Math.PI / 2;
//   ground.position.y = -0.46;
//   ground.receiveShadow = true;
//   scene.add(ground);

//   const landmarks = createLandmarks(scene);
//   const chunks = Array.from({ length: CONFIG.chunkCount }, (_, i) => {
//     const chunk = createChunk(i);
//     chunk.position.z = 40 - i * CONFIG.chunkLength;
//     scene.add(chunk);
//     return chunk;
//   });

//   function applyMode(nextMode) {
//     mode = nextMode === 'day' ? 'day' : 'night';
//     const isDay = mode === 'day';

//     scene.background = new THREE.Color(isDay ? DAY_HORIZON_COLOUR : HORIZON_COLOUR);
//     scene.fog = isDay ? dayFog : nightFog;

//     nightSky.visible = !isDay;
//     daySky.visible = isDay;
//     cloudFlock.setVisible(isDay);

//     if (isDay) {
//       hemiLight.color.setHex(0xcbe5ff);
//       hemiLight.groundColor.setHex(0x8c765c);
//       hemiLight.intensity = 1.25;
//       ambientLight.color.setHex(0xdcebf7);
//       ambientLight.intensity = 0.42;

//       sunOrMoon.color.setHex(0xfff1d0);
//       sunOrMoon.intensity = 2.35;
//       sunOrMoon.position.set(22, 42, 24);

//       streetWarmLeft.intensity = 0;
//       streetWarmRight.intensity = 0;

//       groundMaterial.color.setHex(0x525a50);
//       groundMaterial.roughness = 0.85;

//       CONFIG.exposure = 1.02;
//       CONFIG.bloomStrength = 0.14;
//       CONFIG.bloomThreshold = 0.92;
//       CONFIG.rainOpacity = 0;
//     } else {
//       hemiLight.color.setHex(0x3a5275);
//       hemiLight.groundColor.setHex(0x3b2818);
//       hemiLight.intensity = 0.65;
//       ambientLight.color.setHex(0x243040);
//       ambientLight.intensity = 0.28;

//       sunOrMoon.color.setHex(0x9ab8e0);
//       sunOrMoon.intensity = 0.85;
//       sunOrMoon.position.set(16, 28, 18);

//       streetWarmLeft.intensity = 18;
//       streetWarmRight.intensity = 18;

//       groundMaterial.color.setHex(0x161b22);
//       groundMaterial.roughness = 0.9;

//       CONFIG.exposure = 1.12;
//       CONFIG.bloomStrength = 0.55;
//       CONFIG.bloomThreshold = 0.68;
//       CONFIG.rainOpacity = 0.34;
//     }

//     renderer.toneMappingExposure = CONFIG.exposure;
//   }

//   const shadowTarget = new THREE.Vector3();
//   return {
//     setTimeOfDay: applyMode,
//     getTimeOfDay: () => mode,
//     update(playerZ, cameraPosition) {
//       const time = performance.now() / 1000;
//       ground.position.x = cameraPosition.x;
//       ground.position.z = playerZ;
//       nightSky.position.copy(cameraPosition);
//       daySky.position.copy(cameraPosition);
//       cloudFlock.update(playerZ, time);
//       landmarks.update(playerZ, cameraPosition.x);
//       for (const chunk of chunks) chunk.userData.animatePeople?.(time);

//       shadowTarget.set(cameraPosition.x, 0, playerZ);
//       sunOrMoon.target.position.copy(shadowTarget);
//       if (mode === 'day') {
//         sunOrMoon.position.set(cameraPosition.x + 22, 42, playerZ + 24);
//       } else {
//         sunOrMoon.position.set(cameraPosition.x + 16, 28, playerZ + 18);
//       }
//       sunOrMoon.shadow.camera.updateProjectionMatrix();

//       if (mode === 'night') {
//         const lampStep = 24;
//         const nearestLampZ = Math.round(playerZ / lampStep) * lampStep;
//         streetWarmLeft.position.set(-10.5, 6.8, nearestLampZ);
//         streetWarmRight.position.set(10.5, 6.8, nearestLampZ - lampStep * 0.5);
//       }

//       const recycleBefore = playerZ + CONFIG.chunkLength / 2 + CONFIG.roadAheadMargin;
//       for (const chunk of chunks) {
//         if (chunk.position.z + CONFIG.chunkLength / 2 > recycleBefore) {
//           const minZ = Math.min(...chunks.map((item) => item.position.z));
//           chunk.position.z = minZ - CONFIG.chunkLength;
//         }
//       }
//     },
//   };
// }
import * as THREE from 'three';
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
  fogNear: 75,
  fogFar: 320,
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
  rainParticleCount: 920,
  quality: 'medium',
  exposure: 1.12,
  bloomStrength: 0.55,
  bloomRadius: 0.52,
  bloomThreshold: 0.68,
  reflectionIntensity: 1.45,
  rainOpacity: 0.34,
};

export const HORIZON_COLOUR = 0x0c121b;
export const DAY_HORIZON_COLOUR = 0xb9d6ec;

const stdMat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...extra });

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
    ctx.fillStyle = `rgba(${patch},${0.04 + random() * 0.12})`;
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
    ctx.strokeStyle = 'rgba(8,10,12,.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 19; i++) {
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
    ctx.strokeStyle = 'rgba(10,13,16,.28)';
    ctx.lineWidth = 10;
    ctx.setLineDash([32, 20]);
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

const roadTexture = makeNoiseTexture({ base: '#30363e', patch: '12,15,20', seed: 1432, count: 650, cracks: true, tyre: true });
const groundTexture = makeNoiseTexture({ base: '#1a2026', patch: '10,12,15', seed: 3917, count: 520 });

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
  ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, size, size);
  let seed = 81231;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 28; i++) {
    const x = random() * size, y = random() * size, rx = 18 + random() * 82, ry = 8 + random() * 34;
    ctx.save(); ctx.translate(x, y); ctx.rotate(random() * Math.PI); ctx.scale(rx, ry);
    const wet = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    wet.addColorStop(0, '#101010');
    wet.addColorStop(0.58, 'rgba(20,20,20,.92)');
    wet.addColorStop(1, 'rgba(20,20,20,0)');
    ctx.fillStyle = wet; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  return canvasTexture(canvas);
}

const roadNormal = deriveNormalMap(roadTexture.image, 3.2);
const roadRoughness = makeRoughnessMap();

function makeBrickCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#2d2420'; ctx.fillRect(0, 0, 512, 512);
  const tones = ['#5a3a30', '#634136', '#4f332b', '#694539', '#56372e'];
  for (let row = 0; row < 16; row++) {
    const y = row * 32; const offset = row % 2 ? -24 : 0;
    for (let x = offset; x < 512; x += 64) {
      ctx.fillStyle = tones[(row * 7 + Math.floor((x + 24) / 64)) % tones.length];
      ctx.fillRect(x + 2, y + 2, 60, 28);
      ctx.fillStyle = 'rgba(220,180,145,.08)'; ctx.fillRect(x + 3, y + 3, 58, 2);
    }
  }
  return canvas;
}
const brickCanvas = makeBrickCanvas();
const brickTexture = canvasTexture(brickCanvas, THREE.SRGBColorSpace);
const brickNormal = deriveNormalMap(brickCanvas, 5.0);

function makePuddleTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.96)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
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
    color: 0x262c34,
    map: roadTexture,
    normalMap: roadNormal,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughnessMap: roadRoughness,
    roughness: 0.42,
    metalness: 0.28,
    envMapIntensity: CONFIG.reflectionIntensity,
  });
  const road = new THREE.Mesh(createCamberedRoad(), asphalt);
  road.receiveShadow = true;
  group.add(road);

  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, CONFIG.chunkLength),
    new THREE.MeshStandardMaterial({
      color: 0x3b4858,
      roughness: 0.08,
      metalness: 0.55,
      transparent: true,
      opacity: 0.14,
      envMapIntensity: CONFIG.reflectionIntensity,
    })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = -0.024;
  group.add(sheen);

  for (const side of [-1, 1]) {
    const footpathMat = new THREE.MeshStandardMaterial({
      color: 0xb8aba2,
      map: brickTexture,
      normalMap: brickNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.52,
      metalness: 0.1,
    });
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
      curbItems.push({ x: side * (CONFIG.roadHalfWidth + 0.2), y: 0.02, z, sz: 1.5, color: Math.floor((z + 80) / 3) % 2 ? 0x1a1e20 : 0xd4ad3f });
    }
  }
  addInstances(group, new THREE.BoxGeometry(0.42, 0.25, 1.5), stdMat(0xffffff, { roughness: 0.55 }), curbItems);

  const dashes = [];
  for (const x of [-3, 3]) for (let z = -CONFIG.chunkLength / 2 + 2; z < CONFIG.chunkLength / 2; z += 13) dashes.push({ x, y: -0.005, z, sz: 6 });
  addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 6), stdMat(0xb8b4a4, { roughness: 0.45 }), dashes);

  const rails = [];
  for (const side of [-1, 1]) {
    const x = side < 0 ? -7.2 : -6.5;
    rails.push({ x, y: -0.004, z: 0, sz: CONFIG.chunkLength / 0.12 });
  }
  addInstances(group, new THREE.BoxGeometry(0.12, 0.055, 0.12), new THREE.MeshStandardMaterial({ color: 0x8e969c, roughness: 0.22, metalness: 0.88 }), rails);

  const sleepers = [];
  for (let z = -CONFIG.chunkLength / 2 + 1; z < CONFIG.chunkLength / 2; z += 2.4) sleepers.push({ x: -6.85, y: 0, z, sx: 9.2 });
  addInstances(group, new THREE.BoxGeometry(0.12, 0.025, 0.14), stdMat(0x2e2b26, { roughness: 0.85 }), sleepers);

  if (index % 3 !== 1) {
    const crossing = [];
    for (let x = -8.1; x <= 8.1; x += 1.35) crossing.push({ x, y: -0.005, z: 0, sx: 0.55, sz: 4.2 });
    addInstances(group, new THREE.BoxGeometry(1, 0.025, 1), stdMat(0xc4c1b4, { roughness: 0.45 }), crossing);
  }

  const puddleGeometry = new THREE.CircleGeometry(1, 14);
  const puddleMat = new THREE.MeshPhysicalMaterial({
    map: puddleTexture,
    color: 0x48586a,
    roughness: 0.04,
    metalness: 0.65,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: CONFIG.reflectionIntensity * 1.35,
  });
  const puddles = [];
  for (let p = 0; p < 5; p++) {
    const z = -32 + ((index * 13 + p * 16) % 64);
    const x = [-6.8, -2.2, 1.4, 5.2, 7.1][p];
    puddles.push({ x, y: -0.016, z, sx: 0.55 + (p % 2) * 0.45, sz: 1.5 + (p % 3) * 0.7, rx: -Math.PI / 2 });
  }
  addInstances(group, puddleGeometry, puddleMat, puddles);

  const manhole = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 12),
    new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide })
  );
  manhole.rotation.x = -Math.PI / 2;
  manhole.position.set(index % 2 ? 2.4 : -2.4, -0.017, 24);
  group.add(manhole);

  group.userData.index = index;
  group.userData.animatePeople = dressChunk(group, index, CONFIG.detailLevel, CONFIG);
  return group;
}

function makeSkyDome(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.SphereGeometry(520, 28, 18),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
}

function makeNightSkyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#050810');
  grad.addColorStop(0.42, '#0c1524');
  grad.addColorStop(0.68, '#1a2230');
  grad.addColorStop(0.84, '#2a2224');
  grad.addColorStop(1.0, '#090d14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  const glows = [
    { x: 70, y: 158, r: 44, c: 'rgba(255,176,74,0.65)' },
    { x: 160, y: 162, r: 36, c: 'rgba(255,112,158,0.42)' },
    { x: 256, y: 156, r: 52, c: 'rgba(255,194,96,0.72)' },
    { x: 350, y: 162, r: 38, c: 'rgba(104,210,255,0.38)' },
    { x: 442, y: 158, r: 46, c: 'rgba(255,168,68,0.65)' },
  ];
  for (const g of glows) {
    const rg = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, g.r);
    rg.addColorStop(0, g.c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
  }
  return canvas;
}

function makeDaySkyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2c72c4');
  grad.addColorStop(0.32, '#5ba2e6');
  grad.addColorStop(0.54, '#9cc9f0');
  grad.addColorStop(0.68, '#d4e8f7');
  grad.addColorStop(1.0, '#8fb8dc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const sunGlow = ctx.createRadialGradient(740, 130, 6, 740, 130, 160);
  sunGlow.addColorStop(0.0, 'rgba(255, 250, 224, 0.95)');
  sunGlow.addColorStop(0.25, 'rgba(255, 240, 195, 0.45)');
  sunGlow.addColorStop(1.0, 'rgba(255, 240, 195, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(560, 0, 360, 310);

  const cloudClusters = [
    { cx: 140, cy: 135, s: 1.0 },
    { cx: 360, cy: 112, s: 1.15 },
    { cx: 560, cy: 148, s: 0.9 },
    { cx: 880, cy: 122, s: 1.05 },
  ];
  for (const cl of cloudClusters) {
    for (let p = -2; p <= 2; p++) {
      const px = cl.cx + p * 28 * cl.s;
      const py = cl.cy + Math.abs(p) * 5 * cl.s;
      const pr = (34 - Math.abs(p) * 5) * cl.s;
      const cg = ctx.createRadialGradient(px, py - pr * 0.2, 2, px, py, pr);
      cg.addColorStop(0, 'rgba(255, 253, 248, 0.92)');
      cg.addColorStop(0.65, 'rgba(245, 250, 255, 0.58)');
      cg.addColorStop(1, 'rgba(245, 250, 255, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

function createCloudFlock(scene) {
  const flock = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf8fbff,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
  });
  const puffGeo = new THREE.SphereGeometry(1, 12, 10);
  const clusters = [];

  for (let i = 0; i < 14; i++) {
    const group = new THREE.Group();
    const baseX = ((i % 5) - 2) * 34 + (i % 2) * 9;
    const baseY = 58 + (i % 3) * 8;
    const baseZ = -35 - i * 24;
    group.position.set(baseX, baseY, baseZ);

    const puffs = [
      { x: 0, y: 0, z: 0, sx: 11, sy: 3.4, sz: 7.5 },
      { x: -6.5, y: -0.6, z: 0.8, sx: 7.5, sy: 2.6, sz: 5.8 },
      { x: 6.8, y: -0.5, z: -0.6, sx: 8.2, sy: 2.8, sz: 6.0 },
      { x: 1.8, y: 1.5, z: 0.5, sx: 6.8, sy: 2.5, sz: 5.2 },
    ];
    for (const pf of puffs) {
      const m = new THREE.Mesh(puffGeo, cloudMat);
      m.position.set(pf.x, pf.y, pf.z);
      m.scale.set(pf.sx, pf.sy, pf.sz);
      m.castShadow = false;
      m.receiveShadow = false;
      group.add(m);
    }
    flock.add(group);
    clusters.push({
      group,
      baseX,
      baseY,
      relZ: baseZ,
      driftSpeed: 0.8 + (i % 4) * 0.25,
      phase: i * 0.9,
    });
  }

  flock.visible = false;
  scene.add(flock);

  return {
    group: flock,
    setVisible(v) {
      flock.visible = v;
    },
    update(playerZ, time) {
      if (!flock.visible) return;
      for (const c of clusters) {
        let worldZ = playerZ + c.relZ;
        if (worldZ > playerZ + 45) c.relZ -= 336;
        else if (worldZ < playerZ - 290) c.relZ += 336;
        worldZ = playerZ + c.relZ;

        const driftX = c.baseX + Math.sin(time * 0.12 * c.driftSpeed + c.phase) * 14;
        const bobY = c.baseY + Math.cos(time * 0.25 + c.phase) * 0.6;
        c.group.position.set(driftX, bobY, worldZ);
      }
    },
  };
}

export function createWorld(scene, renderer) {
  let mode = 'night';

  const nightFog = new THREE.FogExp2(HORIZON_COLOUR, 0.0082);
  const dayFog = new THREE.Fog(DAY_HORIZON_COLOUR, CONFIG.fogNear, CONFIG.fogFar);

  scene.background = new THREE.Color(HORIZON_COLOUR);
  scene.fog = nightFog;

  const nightSky = makeSkyDome(makeNightSkyCanvas());
  const daySky = makeSkyDome(makeDaySkyCanvas());
  daySky.visible = false;
  scene.add(nightSky, daySky);

  const cloudFlock = createCloudFlock(scene);

  const hemiLight = new THREE.HemisphereLight(0x3a5275, 0x3b2818, 0.65);
  const ambientLight = new THREE.AmbientLight(0x243040, 0.28);
  scene.add(hemiLight, ambientLight);

  const sunOrMoon = new THREE.DirectionalLight(0x9ab8e0, 0.85);
  sunOrMoon.position.set(16, 28, 18);
  sunOrMoon.castShadow = CONFIG.shadows;
  sunOrMoon.shadow.mapSize.set(2048, 2048);
  sunOrMoon.shadow.camera.left = -80;
  sunOrMoon.shadow.camera.right = 80;
  sunOrMoon.shadow.camera.top = 80;
  sunOrMoon.shadow.camera.bottom = -80;
  sunOrMoon.shadow.camera.near = 1;
  sunOrMoon.shadow.camera.far = 220;
  sunOrMoon.shadow.bias = -0.00015;
  sunOrMoon.shadow.normalBias = 0.045;
  sunOrMoon.shadow.radius = 2;
  scene.add(sunOrMoon, sunOrMoon.target);

  const streetWarmLeft = new THREE.PointLight(0xffb454, 18, 38, 1.5);
  const streetWarmRight = new THREE.PointLight(0xffa84c, 18, 38, 1.5);
  scene.add(streetWarmLeft, streetWarmRight);

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x161b22, map: groundTexture, roughness: 0.9, fog: true });
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

  function applyMode(nextMode) {
    mode = nextMode === 'day' ? 'day' : 'night';
    const isDay = mode === 'day';

    scene.background = new THREE.Color(isDay ? DAY_HORIZON_COLOUR : HORIZON_COLOUR);
    scene.fog = isDay ? dayFog : nightFog;

    nightSky.visible = !isDay;
    daySky.visible = isDay;
    cloudFlock.setVisible(isDay);

    if (isDay) {
      // Strong sky & warm ground bounce so building walls facing away from the sun stay bright & natural
      hemiLight.color.setHex(0xdbeeff);
      hemiLight.groundColor.setHex(0xb89f7e);
      hemiLight.intensity = 2.15;
      ambientLight.color.setHex(0xf2f7fc);
      ambientLight.intensity = 1.05;

      sunOrMoon.color.setHex(0xfff4dc);
      sunOrMoon.intensity = 1.75;
      sunOrMoon.position.set(12, 85, 16);
      sunOrMoon.shadow.normalBias = 0.05;

      scene.environmentIntensity = CONFIG.reflectionIntensity * 1.15;

      streetWarmLeft.intensity = 0;
      streetWarmRight.intensity = 0;

      groundMaterial.color.setHex(0x646e62);
      groundMaterial.roughness = 0.85;

      CONFIG.exposure = 1.0;
      CONFIG.bloomStrength = 0.1;
      CONFIG.bloomThreshold = 0.95;
      CONFIG.rainOpacity = 0;
    } else {
      hemiLight.color.setHex(0x3a5275);
      hemiLight.groundColor.setHex(0x3b2818);
      hemiLight.intensity = 0.65;
      ambientLight.color.setHex(0x243040);
      ambientLight.intensity = 0.28;

      sunOrMoon.color.setHex(0x9ab8e0);
      sunOrMoon.intensity = 0.85;
      sunOrMoon.position.set(16, 28, 18);
      sunOrMoon.shadow.normalBias = 0.035;

      scene.environmentIntensity = CONFIG.reflectionIntensity;

      streetWarmLeft.intensity = 18;
      streetWarmRight.intensity = 18;

      groundMaterial.color.setHex(0x161b22);
      groundMaterial.roughness = 0.9;

      CONFIG.exposure = 1.12;
      CONFIG.bloomStrength = 0.55;
      CONFIG.bloomThreshold = 0.68;
      CONFIG.rainOpacity = 0.34;
    }

    renderer.toneMappingExposure = CONFIG.exposure;
  }

  const shadowTarget = new THREE.Vector3();
  return {
    setTimeOfDay: applyMode,
    getTimeOfDay: () => mode,
    update(playerZ, cameraPosition) {
      const time = performance.now() / 1000;
      ground.position.x = cameraPosition.x;
      ground.position.z = playerZ;
      nightSky.position.copy(cameraPosition);
      daySky.position.copy(cameraPosition);
      cloudFlock.update(playerZ, time);
      landmarks.update(playerZ, cameraPosition.x);
      for (const chunk of chunks) chunk.userData.animatePeople?.(time);

      shadowTarget.set(cameraPosition.x, 0, playerZ);
      sunOrMoon.target.position.copy(shadowTarget);
      if (mode === 'day') {
        sunOrMoon.position.set(cameraPosition.x + 12, 85, playerZ + 16);
      } else {
        sunOrMoon.position.set(cameraPosition.x + 16, 28, playerZ + 18);
      }
      sunOrMoon.shadow.camera.updateProjectionMatrix();

      if (mode === 'night') {
        const lampStep = 24;
        const nearestLampZ = Math.round(playerZ / lampStep) * lampStep;
        streetWarmLeft.position.set(-10.5, 6.8, nearestLampZ);
        streetWarmRight.position.set(10.5, 6.8, nearestLampZ - lampStep * 0.5);
      }

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