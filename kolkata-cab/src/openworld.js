// import * as THREE from 'three';

// const UNIT_PER_KMH = 0.38 / 3.6;
// const INTERSECTION_SPACING = 80; // Matches CONFIG.chunkLength
// const ALLEY_SPACING = 40;       // Half-block alleyway along Z

// function makeSignalLampTexture(state = 'green') {
//   const canvas = document.createElement('canvas');
//   canvas.width = 64;
//   canvas.height = 160;
//   const ctx = canvas.getContext('2d');

//   ctx.fillStyle = '#121619';
//   ctx.fillRect(0, 0, 64, 160);
//   ctx.strokeStyle = '#394148';
//   ctx.lineWidth = 4;
//   ctx.strokeRect(2, 2, 60, 156);

//   const bulbs = [
//     { id: 'red', y: 34, color: '#ff3b30' },
//     { id: 'yellow', y: 80, color: '#ffc440' },
//     { id: 'green', y: 126, color: '#39d876' },
//   ];

//   for (const b of bulbs) {
//     const active = b.id === state;
//     ctx.beginPath();
//     ctx.arc(32, b.y, 13, 0, Math.PI * 2);
//     ctx.fillStyle = active ? b.color : '#22272c';
//     ctx.fill();
//     if (active) {
//       ctx.shadowColor = b.color;
//       ctx.shadowBlur = 14;
//       ctx.fill();
//       ctx.shadowBlur = 0;
//     }
//   }

//   const tex = new THREE.CanvasTexture(canvas);
//   tex.colorSpace = THREE.SRGBColorSpace;
//   return tex;
// }

// function getIntersectionLight(index, elapsedSec) {
//   const cycle = 22;
//   const t = (((elapsedSec + index * 5.5) % cycle) + cycle) % cycle;
//   if (t < 8.5) return 'green';
//   if (t < 11.0) return 'yellow';
//   return 'red';
// }

// export function createOpenWorldNetwork(scene, config) {
//   const group = new THREE.Group();
//   scene.add(group);

//   const mainStreetMat = new THREE.MeshStandardMaterial({
//     color: 0x262c34,
//     roughness: 0.42,
//     metalness: 0.25,
//     envMapIntensity: config.reflectionIntensity ?? 1.3,
//   });

//   const alleyMat = new THREE.MeshStandardMaterial({
//     color: 0x20242b,
//     roughness: 0.68,
//     metalness: 0.12,
//   });

//   const laneDashMat = new THREE.MeshStandardMaterial({
//     color: 0xb8b4a4,
//     roughness: 0.45,
//   });

//   const postMat = new THREE.MeshStandardMaterial({
//     color: 0x3a4246,
//     roughness: 0.5,
//     metalness: 0.55,
//   });

//   const yellowCurbMat = new THREE.MeshStandardMaterial({
//     color: 0xe0aa1f,
//     emissive: 0x473304,
//     emissiveIntensity: 0.25,
//     roughness: 0.48,
//     metalness: 0.1,
//   });

//   const sideBuildingColors = [0x8f5642, 0x9c763e, 0x76877b, 0xa89d87, 0x8c5e52];
//   const sideBuildingMats = sideBuildingColors.map(
//     (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.05 })
//   );
//   const lampBulbMat = new THREE.MeshStandardMaterial({
//     color: 0xffd27d,
//     emissive: 0xffbe55,
//     emissiveIntensity: 1.35,
//   });

//   const lampTextures = {
//     red: makeSignalLampTexture('red'),
//     yellow: makeSignalLampTexture('yellow'),
//     green: makeSignalLampTexture('green'),
//   };

//   const curbSpanLen = 67;
//   const yellowCurbGeo = new THREE.BoxGeometry(0.44, 0.28, curbSpanLen);
//   const yellowCurbOffset = -40;

//   const nodes = [];
//   for (let i = -5; i <= 3; i++) {
//     const z = i * INTERSECTION_SPACING;
//     const nodeGroup = new THREE.Group();
//     nodeGroup.position.set(0, 0, z);
//     group.add(nodeGroup);

//     // Wide cross street extending ±140m along X so you can turn left or right and keep driving
//     const crossStreet = new THREE.Mesh(new THREE.PlaneGeometry(280, 13), mainStreetMat);
//     crossStreet.rotation.x = -Math.PI / 2;
//     crossStreet.position.set(0, 0.008, 0);
//     crossStreet.receiveShadow = true;
//     nodeGroup.add(crossStreet);

//     // Center dashed markings along the cross street
//     for (let dx = -128; dx <= 128; dx += 12) {
//       if (Math.abs(dx) < 11) continue;
//       const dash = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.02, 0.14), laneDashMat);
//       dash.position.set(dx, 0.012, 0);
//       nodeGroup.add(dash);
//     }

//     // Side-street buildings & streetlamps lining both sides of the cross street
//     for (const sideZ of [-1, 1]) {
//       for (const dirX of [-1, 1]) {
//         for (let b = 0; b < 5; b++) {
//           const bx = dirX * (26 + b * 22);
//           const bh = 9 + ((i + b) & 1) * 3.5;
//           const bMesh = new THREE.Mesh(
//             new THREE.BoxGeometry(19, bh, 12),
//             sideBuildingMats[(Math.abs(i) + b) % sideBuildingMats.length]
//           );
//           bMesh.position.set(bx, bh / 2, sideZ * 13.5);
//           bMesh.castShadow = true;
//           bMesh.receiveShadow = true;
//           nodeGroup.add(bMesh);

//           if (b % 2 === 0) {
//             const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.5, 6), postMat);
//             lampPole.position.set(bx - 7, 3.75, sideZ * 7.2);
//             const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.65), lampBulbMat);
//             lampHead.position.set(bx - 7, 7.2, sideZ * 6.8);
//             nodeGroup.add(lampPole, lampHead);
//           }
//         }
//       }
//     }

//     // Intersection signal post
//     const signalGroup = new THREE.Group();
//     signalGroup.position.set(8.6, 0, 6.8);

//     const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), postMat);
//     pole.position.y = 2.6;
//     pole.castShadow = true;
//     signalGroup.add(pole);

//     const headMat = new THREE.MeshStandardMaterial({
//       map: lampTextures.green,
//       emissiveMap: lampTextures.green,
//       emissive: 0xffffff,
//       emissiveIntensity: 0.85,
//       roughness: 0.3,
//     });
//     const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.24), headMat);
//     headMesh.position.set(0, 4.7, 0);
//     signalGroup.add(headMesh);
//     nodeGroup.add(signalGroup);

//     // Narrow alleyway halfway between cross streets extending ±110m along X
//     const alley = new THREE.Mesh(new THREE.PlaneGeometry(220, 6.2), alleyMat);
//     alley.rotation.x = -Math.PI / 2;
//     alley.position.set(0, 0.007, -ALLEY_SPACING);
//     alley.receiveShadow = true;
//     nodeGroup.add(alley);

//     // Yellow center curb running along x = 0 between intersections
//     const yellowCurb = new THREE.Mesh(yellowCurbGeo, yellowCurbMat);
//     yellowCurb.position.set(0, 0.14, yellowCurbOffset);
//     yellowCurb.castShadow = true;
//     yellowCurb.receiveShadow = true;
//     nodeGroup.add(yellowCurb);

//     nodes.push({
//       index: i,
//       z,
//       nodeGroup,
//       headMat,
//       currentLight: 'green',
//     });
//   }

//   // Queued traffic cars that stop at red/yellow signals and queue behind cars ahead
//   const queuePalette = [0xe8c72d, 0x3974a8, 0xc64d3f, 0x4b9a6c, 0xd9a05b, 0x6b8cae];
//   const carChassisGeo = new THREE.BoxGeometry(1.74, 0.72, 3.6);
//   const carCabinGeo = new THREE.BoxGeometry(1.48, 0.62, 1.8);
//   const cabinMat = new THREE.MeshStandardMaterial({ color: 0x151d24, roughness: 0.18, metalness: 0.5 });

//   const queuedVehicles = [];
//   for (let i = 0; i < 12; i++) {
//     const car = new THREE.Group();
//     const paintMat = new THREE.MeshStandardMaterial({
//       color: queuePalette[i % queuePalette.length],
//       roughness: 0.35,
//       metalness: 0.2,
//     });
//     const chassis = new THREE.Mesh(carChassisGeo, paintMat);
//     chassis.position.y = 0.68;
//     chassis.castShadow = true;
//     chassis.receiveShadow = true;

//     const cabin = new THREE.Mesh(carCabinGeo, cabinMat);
//     cabin.position.set(0, 1.32, -0.06);
//     cabin.castShadow = true;

//     car.add(chassis, cabin);
//     group.add(car);

//     const isOncoming = i % 2 === 1;
//     const laneX = isOncoming ? 3.2 : -3.2;
//     if (isOncoming) car.rotation.y = Math.PI;

//     queuedVehicles.push({
//       mesh: car,
//       laneX,
//       isOncoming,
//       z: -24 - i * 16,
//       speedKmh: 0,
//       cruiseKmh: 36 + (i % 3) * 6,
//     });
//   }

//   function isDrivable(x, z) {
//     // 1. Main north-south avenue
//     if (Math.abs(x) <= 9.6) return true;
//     // 2. Cross streets (every 80m) & alleyways (every 80m offset by -40m)
//     const mod80 = ((z % INTERSECTION_SPACING) + INTERSECTION_SPACING) % INTERSECTION_SPACING;
//     const distCross = Math.min(mod80, INTERSECTION_SPACING - mod80);
//     if (distCross <= 5.4 && Math.abs(x) <= 132) return true;

//     const distAlley = Math.abs(mod80 - ALLEY_SPACING);
//     if (distAlley <= 2.3 && Math.abs(x) <= 104) return true;

//     return false;
//   }

//   function hitsCenterCurb(x, z) {
//     if (Math.abs(x) > 0.85) return false;
//     const mod80 = ((z % INTERSECTION_SPACING) + INTERSECTION_SPACING) % INTERSECTION_SPACING;
//     const distCross = Math.min(mod80, INTERSECTION_SPACING - mod80);
//     // Open at cross streets so you can turn across
//     return distCross > 6.6;
//   }

//   // Resolves open-world street/curb boundaries so left & right 90° turns work cleanly
//   function resolveMovement(prevX, prevZ, nextX, nextZ, heading, speed, dt) {
//     let x = nextX;
//     let z = nextZ;
//     let h = heading;
//     let spd = speed;

//     // Prevent clipping through the yellow center divider between cross streets
//     if (hitsCenterCurb(x, z) && !hitsCenterCurb(prevX, prevZ)) {
//       x = prevX >= 0 ? 0.9 : -0.9;
//       h = THREE.MathUtils.lerp(h, 0, Math.min(1, dt * 8));
//       spd *= Math.exp(-1.5 * dt);
//     }

//     // Keep vehicle inside main avenue, cross streets, or alleyways
//     if (!isDrivable(x, z)) {
//       if (isDrivable(prevX, z)) {
//         x = prevX;
//         spd *= Math.exp(-2.0 * dt);
//       } else if (isDrivable(x, prevZ)) {
//         z = prevZ;
//         spd *= Math.exp(-2.0 * dt);
//       } else {
//         x = prevX;
//         z = prevZ;
//         spd *= Math.exp(-3.0 * dt);
//       }
//     }

//     return { x, z, heading: h, speed: spd };
//   }

//   return {
//     group,
//     isDrivable,
//     resolveMovement,
//     update(playerX, playerZ, dt) {
//       const elapsed = performance.now() * 0.001;
//       const totalSpan = INTERSECTION_SPACING * 9;

//       for (const n of nodes) {
//         if (n.z > playerZ + INTERSECTION_SPACING * 3) {
//           n.z -= totalSpan;
//           n.index -= 9;
//         } else if (n.z < playerZ - INTERSECTION_SPACING * 5) {
//           n.z += totalSpan;
//           n.index += 9;
//         }

//         n.nodeGroup.position.z = n.z;

//         const nextLight = getIntersectionLight(n.index, elapsed);
//         if (nextLight !== n.currentLight) {
//           n.currentLight = nextLight;
//           const tex = lampTextures[nextLight];
//           n.headMat.map = tex;
//           n.headMat.emissiveMap = tex;
//           n.headMat.needsUpdate = true;
//         }
//       }

//       for (let i = 0; i < queuedVehicles.length; i++) {
//         const v = queuedVehicles[i];
//         const dir = v.isOncoming ? 1 : -1;

//         if (v.z > playerZ + 35) {
//           v.z = playerZ - 110 - i * 12;
//           v.speedKmh = v.cruiseKmh * 0.6;
//         } else if (v.z < playerZ - 155) {
//           v.z = playerZ + 20;
//           v.speedKmh = v.cruiseKmh * 0.6;
//         }

//         let mustStop = false;

//         for (const n of nodes) {
//           const distToStop = v.isOncoming ? (n.z - 8.5) - v.z : v.z - (n.z + 8.5);
//           if (distToStop > 0 && distToStop < 16) {
//             if (n.currentLight === 'red' || n.currentLight === 'yellow') {
//               mustStop = true;
//               break;
//             }
//           }
//         }

//         for (let j = 0; j < queuedVehicles.length; j++) {
//           if (i === j) continue;
//           const other = queuedVehicles[j];
//           if (other.laneX !== v.laneX) continue;
//           const gap = v.isOncoming ? other.z - v.z : v.z - other.z;
//           if (gap > 0 && gap < 6.8) {
//             mustStop = true;
//             break;
//           }
//         }

//         const targetSpeed = mustStop ? 0 : v.cruiseKmh;
//         const rate = mustStop ? 52 : 24;
//         if (v.speedKmh < targetSpeed) {
//           v.speedKmh = Math.min(targetSpeed, v.speedKmh + rate * dt);
//         } else if (v.speedKmh > targetSpeed) {
//           v.speedKmh = Math.max(targetSpeed, v.speedKmh - rate * dt);
//         }

//         v.z += dir * v.speedKmh * UNIT_PER_KMH * dt;
//         v.mesh.position.set(v.laneX, 0, v.z);
//       }
//     },
//   };
// }
import * as THREE from 'three';
import { DEFAULT_BUILDING_MODELS } from './buildings.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import { ALLEY_LENGTH, ALLEY_WIDTH, COLLEGE_CROSSING_Z, COLLEGE_STREET_WIDTH, COLLEGE_STREET_X, COLLEGE_TURN_Z, CROSS_STREET_LENGTH, CROSS_STREET_WIDTH, EDEN_X, EDEN_Z, NETAJI_CROSSING_Z, ROAD_ALLEY_OFFSET, ROAD_BLOCK_SPACING, STPAUL_X, STPAUL_Z, VICTORIA_PLAZA_Z, VICTORIA_ROAD_WIDTH, VICTORIA_ROAD_X, VICTORIA_TURN_Z, isRoadOpening, roadAngle, roadCenterX } from './roadLayout.js';
import { loadGLTF } from './gltfCache.js';

const INTERSECTION_SPACING = ROAD_BLOCK_SPACING;
const ALLEY_SPACING = ROAD_ALLEY_OFFSET;

function makeAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#30363e'; ctx.fillRect(0, 0, 512, 512);
  let seed = 21731;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 1100; i++) {
    const v = Math.floor(18 + random() * 32);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},${0.12 + random() * 0.26})`;
    ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 1.5 + random() * 9, 1.5 + random() * 5, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 2);
  texture.anisotropy = 8;
  return texture;
}

function normalizeFacade(source) {
  const wrapper = new THREE.Group();
  const root = source.clone(true);
  wrapper.add(root);

  const remove = [];
  root.traverse((object) => {
    if (object.isLight || object.isCamera) remove.push(object);
    else if (object.isMesh) {
      const name = (object.name || '').toLowerCase();
      if (name.includes('ground') || name.includes('floor') || name.includes('backdrop') || name.includes('background')) remove.push(object);
    }
  });
  for (const object of remove) object.parent?.remove(object);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3(); bounds.getSize(size);
  if (size.y < 0.1) return { scene: wrapper, halfX: 0.5, halfZ: 0.5 };
  root.scale.multiplyScalar(1 / size.y);
  wrapper.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(wrapper);
  const scaledSize = new THREE.Vector3(); scaled.getSize(scaledSize);
  const center = new THREE.Vector3(); scaled.getCenter(center);
  root.position.set(-center.x, -scaled.min.y, -center.z);
  root.traverse((obj) => { if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = true; } });
  return { scene: wrapper, halfX: scaledSize.x * 0.5, halfZ: scaledSize.z * 0.5 };
}

function makeSignalLampTexture(state = 'green') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#121619';
  ctx.fillRect(0, 0, 64, 160);
  ctx.strokeStyle = '#394148';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 60, 156);

  const bulbs = [
    { id: 'red', y: 34, color: '#ff3b30' },
    { id: 'yellow', y: 80, color: '#ffc440' },
    { id: 'green', y: 126, color: '#39d876' },
  ];

  for (const b of bulbs) {
    const active = b.id === state;
    ctx.beginPath();
    ctx.arc(32, b.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = active ? b.color : '#22272c';
    ctx.fill();
    if (active) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getIntersectionLight(index, elapsedSec) {
  const cycle = 22;
  const t = (((elapsedSec + index * 5.5) % cycle) + cycle) % cycle;
  if (t < 8.5) return 'green';
  if (t < 11.0) return 'yellow';
  return 'red';
}

const _instDummy = new THREE.Object3D();
const _instColor = new THREE.Color();

function addOpenWorldInstances(parent, geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  items.forEach((item, idx) => {
    _instDummy.position.set(item.x, item.y, item.z);
    _instDummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _instDummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    _instDummy.updateMatrix();
    mesh.setMatrixAt(idx, _instDummy.matrix);
    if (item.color) {
      _instColor.setHex(item.color);
      mesh.setColorAt(idx, _instColor);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function makeSidePuddleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createOpenWorldNetwork(scene, config) {
  const group = new THREE.Group();
  scene.add(group);

  const asphaltMap = makeAsphaltTexture();
  const puddleTex = makeSidePuddleTexture();
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const clutterCylGeo = new THREE.CylinderGeometry(0.32, 0.35, 1, 8);
  const wheelTorusGeo = new THREE.TorusGeometry(0.32, 0.045, 5, 10);
  const puddleGeo = new THREE.CircleGeometry(1, 12);
  const manholeGeo = new THREE.CircleGeometry(0.58, 10);

  const clutterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.08 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x262c2e, roughness: 0.6, metalness: 0.35 });
  const puddleMat = new THREE.MeshStandardMaterial({
    map: puddleTex,
    color: 0x48586a,
    roughness: 0.08,
    metalness: 0.65,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: (config.reflectionIntensity ?? 1.3) * 1.3,
  });
  const manholeMat = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide });
  const endCurbGeoCross = new THREE.BoxGeometry(0.5, 0.28, CROSS_STREET_WIDTH);
  const endCurbGeoAlley = new THREE.BoxGeometry(0.5, 0.26, ALLEY_WIDTH);
  const alleyEdgeCurbGeo = new THREE.BoxGeometry(ALLEY_LENGTH, 0.18, 0.24);
  const mainStreetMat = new THREE.MeshStandardMaterial({
    color: 0x262c34,
    map: asphaltMap,
    roughness: 0.42,
    metalness: 0.25,
    envMapIntensity: config.reflectionIntensity ?? 1.3,
  });

  const alleyMat = new THREE.MeshStandardMaterial({
    color: 0x20242b,
    map: asphaltMap,
    roughness: 0.68,
    metalness: 0.12,
  });

  const laneDashMat = new THREE.MeshStandardMaterial({
    color: 0xb8b4a4,
    roughness: 0.45,
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x3a4246,
    roughness: 0.5,
    metalness: 0.55,
  });


  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb8aba2, roughness: 0.78 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd2bd83, roughness: 0.72 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xffbe55,
    emissiveIntensity: 1.35,
  });

  const lampTextures = {
    red: makeSignalLampTexture('red'),
    yellow: makeSignalLampTexture('yellow'),
    green: makeSignalLampTexture('green'),
  };

  const buildingTemplates = new Array(DEFAULT_BUILDING_MODELS.length).fill(null);
  const facadeSlots = [];
  const pendingFacadeBuilds = [];
  let pendingFacadeIndex = 0;
  const buildFacade = (slot) => {
    const template = buildingTemplates[slot.modelIndex];
    if (!template) return;
    slot.root.clear();
    const visual = template.scene.clone(true);
    // Cap horizontal footprint so wide GLBs never spill onto the road or main avenue
    const maxScaleX = template.halfX > 0.01 ? 9.5 / template.halfX : slot.height;
    const maxScaleZ = template.halfZ > 0.01 ? 6.5 / template.halfZ : slot.height;
    const s = Math.min(slot.height, maxScaleX, maxScaleZ);
    visual.scale.setScalar(s);
    visual.rotation.y = slot.rotation;
    const offsetZ = template.halfZ * s;
    slot.root.position.z = slot.roadOffset + slot.sideZ * (slot.clearEdgeZ + offsetZ);
    slot.root.add(visual);
  };
  DEFAULT_BUILDING_MODELS.forEach((url, index) => loadGLTF(url).then((gltf) => {
    buildingTemplates[index] = normalizeFacade(gltf.scene);
    for (const slot of facadeSlots) if (slot.modelIndex === index) pendingFacadeBuilds.push(slot);
  }).catch((err) => console.warn(`[openworld.js] Failed to load ${url}:`, err)));

  const treeTemplates = new Array(DEFAULT_TREE_MODELS.length).fill(null);
  const treeSlots = [];
  const pendingTreeBuilds = [];
  let pendingTreeIndex = 0;
  const buildTree = (slot) => {
    const template = treeTemplates[slot.modelIndex];
    if (!template) return;
    slot.root.clear();
    slot.root.scale.setScalar(slot.height);
    slot.root.add(template.clone(true));
  };
  DEFAULT_TREE_MODELS.forEach((url, index) => loadGLTF(url).then((gltf) => {
    treeTemplates[index] = normalizeTreeModel(gltf.scene.clone(true));
    for (const slot of treeSlots) if (slot.modelIndex === index) pendingTreeBuilds.push(slot);
  }).catch((err) => console.warn(`[openworld.js] Failed to load ${url}:`, err)));

  const nodes = [];
  const practicalLights = [];
  const inVictoriaZone = (wx, wz) =>
    (Math.abs(wx - VICTORIA_ROAD_X) <= 14 && wz <= VICTORIA_TURN_Z - 4 && wz >= VICTORIA_PLAZA_Z) ||
    (wx >= 44 && wx <= 150 && wz <= VICTORIA_PLAZA_Z + 8 && wz >= VICTORIA_PLAZA_Z - 125);
  const isVictoriaOpening = (wx, wz) => Math.abs(wx - VICTORIA_ROAD_X) <= VICTORIA_ROAD_WIDTH / 2 + 4 && Math.abs(wz - VICTORIA_TURN_Z) <= 14;
  const inCollegeZone = (wx, wz) => wx <= -46 && wx >= -125 && wz <= COLLEGE_TURN_Z - 4 && wz >= COLLEGE_CROSSING_Z - 24;
  const isCollegeOpening = (wx, wz) => Math.abs(wx - COLLEGE_STREET_X) <= COLLEGE_STREET_WIDTH / 2 + 4 && Math.abs(wz - COLLEGE_TURN_Z) <= 14;
  const inEdenZone = (wx, wz) => wx >= 24 && wx <= 142 && wz <= EDEN_Z + 46 && wz >= EDEN_Z - 46;
  for (let i = -5; i <= 3; i++) {
    const z = i * INTERSECTION_SPACING;
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(0, 0, z);
    group.add(nodeGroup);

    // Wide cross street extending ±140m along X (clip +X at z=-160 for Victoria, -X for College St at i<=-2)
    const clipVictoriaCross = i === -2;
    const clipCollegeSide = i <= -2 && i >= -5;
    const crossLeftX = clipCollegeSide ? -46 : -CROSS_STREET_LENGTH / 2;
    const crossRightX = clipVictoriaCross ? 12 : CROSS_STREET_LENGTH / 2;
    const crossLen = crossRightX - crossLeftX;
    const crossOffsetX = (crossLeftX + crossRightX) / 2;
    const crossStreet = new THREE.Mesh(new THREE.PlaneGeometry(crossLen, CROSS_STREET_WIDTH), mainStreetMat);
    crossStreet.rotation.x = -Math.PI / 2;
    crossStreet.position.set(crossOffsetX, 0.008, 0);
    crossStreet.receiveShadow = true;
    nodeGroup.add(crossStreet);

    // Continuous sidewalks and curbs on left & right of the main avenue (never crossing x = -12.3..+12.3).
    const aveEdge = config.roadHalfWidth + config.footpathWidth;
    const crossWingLen = CROSS_STREET_LENGTH / 2 - aveEdge;
    const crossWingCenter = aveEdge + crossWingLen / 2;
    for (const sideZ of [-1, 1]) {
      for (const dirX of [-1, 1]) {
        if (clipVictoriaCross && dirX === 1) continue;
        if (clipCollegeSide && dirX === -1) continue;
        const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(crossWingLen, 4.4), sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.set(dirX * crossWingCenter, 0.006, sideZ * 8.7);
        sidewalk.receiveShadow = true;
        nodeGroup.add(sidewalk);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(crossWingLen, 0.2, 0.28), curbMat);
        curb.position.set(dirX * crossWingCenter, 0.1, sideZ * 6.65);
        curb.castShadow = curb.receiveShadow = true;
        if (!(i === -1 && sideZ === -1)) nodeGroup.add(curb);
      }
    }
    if (i === -1) {
      // Leave both x = VICTORIA_ROAD_X (+64) and x = COLLEGE_STREET_X (-76) turn openings clear on north curb of z = -80
      for (const [sign, turnX, turnW] of [[1, VICTORIA_ROAD_X, VICTORIA_ROAD_WIDTH], [-1, Math.abs(COLLEGE_STREET_X), COLLEGE_STREET_WIDTH]]) {
        const gapHalf = turnW / 2 + 0.4;
        const seg1Len = (turnX - gapHalf) - aveEdge;
        const seg2Len = (CROSS_STREET_LENGTH / 2) - (turnX + gapHalf);
        for (const [cx, len] of [[aveEdge + seg1Len / 2, seg1Len], [turnX + gapHalf + seg2Len / 2, seg2Len]]) {
          if (len > 1) {
            const c = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, 0.28), curbMat);
            c.position.set(sign * cx, 0.1, -6.65);
            c.receiveShadow = true;
            nodeGroup.add(c);
          }
        }
      }
    }

    // Center dashed markings along the cross street
    for (let dx = -128; dx <= 128; dx += 12) {
      if (Math.abs(dx) < 11) continue;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.02, 0.14), laneDashMat);
      dash.position.set(dx, 0.012, 0);
      nodeGroup.add(dash);
    }
    for (let dx = -104; dx <= 104; dx += 13) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.018, 0.12), laneDashMat);
      dash.position.set(dx, 0.014, -ALLEY_SPACING);
      nodeGroup.add(dash);
    }

    // Center median is now rendered per-chunk in world.js so it curves smoothly with the road.

    // Reuse the project's detailed GLB building assets beside cross streets and alleys.
    for (const roadOffset of [0, -ALLEY_SPACING]) {
      const buildingDistances = roadOffset ? [25, 47, 69, 91] : [25, 45, 65, 85, 105, 125];
      const clearEdgeZ = roadOffset ? 5.8 : 11.4;
      for (const sideZ of [-1, 1]) {
        for (let b = 0; b < buildingDistances.length; b++) {
          const distance = buildingDistances[b];
          for (const dirX of [-1, 1]) {
            const wx = dirX * distance;
            const wz = z + roadOffset + sideZ * (clearEdgeZ + 5);
            if (
              inVictoriaZone(wx, wz) ||
              inCollegeZone(wx, wz) ||
              inEdenZone(wx, wz) ||
              (sideZ === -1 && (isVictoriaOpening(wx, z + roadOffset) || isCollegeOpening(wx, z + roadOffset)))
            ) continue;
            const root = new THREE.Group();
            root.position.set(wx, 0, roadOffset + sideZ * (clearEdgeZ + 5));
            nodeGroup.add(root);
            const slot = {
              root,
              roadOffset,
              sideZ,
              clearEdgeZ,
              modelIndex: (Math.abs(i * 7) + b + (dirX > 0 ? 1 : 0)) % buildingTemplates.length,
              height: 9 + ((i + b) & 1) * 3,
              rotation: sideZ > 0 ? 0 : Math.PI,
            };
            facadeSlots.push(slot);
            if (buildingTemplates[slot.modelIndex]) pendingFacadeBuilds.push(slot);
          }
        }
      }
    }

    // Intersection signal post
    const signalGroup = new THREE.Group();
    signalGroup.position.set(8.6, 0, 6.8);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), postMat);
    pole.position.y = 2.6;
    pole.castShadow = true;
    signalGroup.add(pole);

    const headMat = new THREE.MeshStandardMaterial({
      map: lampTextures.green,
      emissiveMap: lampTextures.green,
      emissive: 0xffffff,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.24), headMat);
    headMesh.position.set(0, 4.7, 0);
    signalGroup.add(headMesh);
    nodeGroup.add(signalGroup);

    // Narrow alleyway halfway between cross streets extending ±110m along X (clip +X in Victoria/Eden, -X in College St)
    const clipVictoriaAlley = i === -1 || i === -2 || i === -4;
    const clipCollegeAlley = i <= -1 && i >= -4;
    const alleyLeftX = clipCollegeAlley ? -46 : -ALLEY_LENGTH / 2;
    const alleyRightX = clipVictoriaAlley ? 12 : ALLEY_LENGTH / 2;
    const alleyDrawLen = alleyRightX - alleyLeftX;
    const alleyOffsetX = (alleyLeftX + alleyRightX) / 2;
    const alley = new THREE.Mesh(new THREE.PlaneGeometry(alleyDrawLen, ALLEY_WIDTH), alleyMat);
    alley.rotation.x = -Math.PI / 2;
    alley.position.set(alleyOffsetX, 0.007, -ALLEY_SPACING);
    alley.receiveShadow = true;
    nodeGroup.add(alley);

    const alleyWingLen = ALLEY_LENGTH / 2 - aveEdge;
    const alleyWingCenter = aveEdge + alleyWingLen / 2;
    for (const sideZ of [-1, 1]) {
      for (const dirX of [-1, 1]) {
        if (clipVictoriaAlley && dirX === 1) continue;
        if (clipCollegeAlley && dirX === -1) continue;
        const alleyWalk = new THREE.Mesh(new THREE.PlaneGeometry(alleyWingLen, 2.2), sidewalkMat);
        alleyWalk.rotation.x = -Math.PI / 2;
        alleyWalk.position.set(dirX * alleyWingCenter, 0.006, -ALLEY_SPACING + sideZ * 4.2);
        alleyWalk.receiveShadow = true;
        nodeGroup.add(alleyWalk);

        const alleyCurb = new THREE.Mesh(new THREE.BoxGeometry(alleyWingLen, 0.18, 0.24), curbMat);
        alleyCurb.position.set(dirX * alleyWingCenter, 0.09, -ALLEY_SPACING + sideZ * (ALLEY_WIDTH / 2 + 0.14));
        alleyCurb.receiveShadow = true;
        nodeGroup.add(alleyCurb);
      }
    }

    // End-cap curbs at the drivable boundaries of cross streets and alleys
    for (const dirX of [-1, 1]) {
      const crossEndCurb = new THREE.Mesh(endCurbGeoCross, curbMat);
      crossEndCurb.position.set(dirX * (CROSS_STREET_LENGTH / 2 - 0.5), 0.14, 0);
      crossEndCurb.receiveShadow = true;
      nodeGroup.add(crossEndCurb);

      const alleyEndCurb = new THREE.Mesh(endCurbGeoAlley, curbMat);
      alleyEndCurb.position.set(dirX * (ALLEY_LENGTH / 2 - 0.5), 0.13, -ALLEY_SPACING);
      alleyEndCurb.receiveShadow = true;
      nodeGroup.add(alleyEndCurb);
    }

    // Side-street footpath clutter (stalls, awnings, bins, bikes) + puddles & manholes
    const sideBoxes = [];
    const sideCyls = [];
    const sideWheels = [];
    const sidePuddles = [];
    const sideManholes = [];
    const stallColors = [0x6b4b33, 0x7a573b, 0x634630, 0x704e34];
    const awningColors = [0x275b6e, 0x9c3e32, 0x8a763b, 0x38704d];

    for (const roadOffset of [0, -ALLEY_SPACING]) {
      const maxX = roadOffset ? 100 : 128;
      const step = roadOffset ? 14 : 11;
      for (const sideZ of [-1, 1]) {
        const walkZ = roadOffset + sideZ * (roadOffset ? 4.2 : 8.4);
        for (let x = -maxX; x <= maxX; x += step) {
          if (Math.abs(x) < 16) continue;
          if (
            inVictoriaZone(x, z + walkZ) ||
            inCollegeZone(x, z + walkZ) ||
            inEdenZone(x, z + walkZ) ||
            (sideZ === -1 && (isVictoriaOpening(x, z + roadOffset) || isCollegeOpening(x, z + roadOffset)))
          ) continue;
          const kind = Math.abs(Math.round(x / step) + i) % 4;
          if (kind === 0) {
            sideBoxes.push({ x, y: 0.52, z: walkZ, sx: 1.5, sy: 1.0, sz: 1.1, color: stallColors[Math.abs(i) % stallColors.length] });
            sideBoxes.push({ x, y: 2.02, z: walkZ, sx: 1.85, sy: 0.14, sz: 1.45, color: awningColors[Math.abs(i + x) % awningColors.length] });
          } else if (kind === 1) {
            sideBoxes.push({ x, y: 0.42, z: walkZ, sx: 1.2, sy: 0.75, sz: 0.85, color: 0x704b32 });
          } else if (kind === 2) {
            sideCyls.push({ x, y: 0.48, z: walkZ, sx: 1, sy: 0.96, sz: 1, color: 0x373d3b });
          } else {
            sideWheels.push({ x: x - 0.4, y: 0.36, z: walkZ }, { x: x + 0.4, y: 0.36, z: walkZ });
          }
        }
      }
      for (let px = -96; px <= 96; px += 32) {
        if (Math.abs(px) < 18) continue;
        sidePuddles.push({
          x: px + (i % 2) * 5,
          y: 0.013,
          z: roadOffset + ((px % 3) - 1) * (roadOffset ? 1.1 : 2.2),
          sx: 1.4,
          sz: 0.75,
          rx: -Math.PI / 2,
        });
      }
      for (let mx = -80; mx <= 80; mx += 40) {
        if (Math.abs(mx) < 18) continue;
        sideManholes.push({ x: mx, y: 0.012, z: roadOffset + (roadOffset ? 0.8 : 1.8), rx: -Math.PI / 2 });
      }
    }
    addOpenWorldInstances(nodeGroup, unitBoxGeo, clutterMat, sideBoxes);
    addOpenWorldInstances(nodeGroup, clutterCylGeo, clutterMat, sideCyls);
    addOpenWorldInstances(nodeGroup, wheelTorusGeo, darkMetalMat, sideWheels);
    addOpenWorldInstances(nodeGroup, puddleGeo, puddleMat, sidePuddles);
    addOpenWorldInstances(nodeGroup, manholeGeo, manholeMat, sideManholes);

    for (const roadOffset of [0, -ALLEY_SPACING]) {
      for (const sideZ of [-1, 1]) {
        for (const x of [-68, 68]) {
          if (
            inVictoriaZone(x, z + roadOffset) ||
            inCollegeZone(x, z + roadOffset) ||
            inEdenZone(x, z + roadOffset) ||
            (sideZ === -1 && (isVictoriaOpening(x, z + roadOffset) || isCollegeOpening(x, z + roadOffset)))
          ) continue;
          const root = new THREE.Group();
          root.position.set(x, 0, roadOffset + sideZ * (roadOffset ? 5.0 : 8.7));
          nodeGroup.add(root);
          const slot = { root, modelIndex: (Math.abs(i) + (x > 0 ? 2 : 0)) % treeTemplates.length, height: 5.8 + (Math.abs(i) % 3) * 0.45 };
          treeSlots.push(slot);
          if (treeTemplates[slot.modelIndex]) pendingTreeBuilds.push(slot);
        }
        for (const x of [-105, -52, 52, 105]) {
          if (
            inVictoriaZone(x, z + roadOffset) ||
            inCollegeZone(x, z + roadOffset) ||
            inEdenZone(x, z + roadOffset) ||
            (sideZ === -1 && (isVictoriaOpening(x, z + roadOffset) || isCollegeOpening(x, z + roadOffset)))
          ) continue;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.8, 7), postMat);
          pole.position.set(x, 3.4, roadOffset + sideZ * (roadOffset ? 4.8 : 7.25));
          pole.castShadow = false;
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.16), lampBulbMat);
          head.position.set(x, 6.75, pole.position.z);
          nodeGroup.add(pole, head);
        }
      }
    }

    // The center median has a deliberate alley-width opening between its two segments.

    nodes.push({
      index: i,
      z,
      nodeGroup,
      headMat,
      currentLight: 'green',
    });
  }

  function isDrivable(x, z) {
    // Keep taxi outside the circular Netaji statue pedestal at the z = -240 crossing
    if (Math.hypot(x - roadCenterX(NETAJI_CROSSING_Z), z - NETAJI_CROSSING_Z) < 3.1) return false;
    // Keep taxi outside St. Paul's Cathedral compound (x = -36..-104, z = -488..-552)
    if (x <= -34 && x >= -106 && z <= STPAUL_Z + 38 && z >= STPAUL_Z - 38) return false;
    const lx = x - roadCenterX(z);
    const mainHalfWidth = config.roadHalfWidth - config.collisionHalfWidth;
    if (Math.abs(lx) <= mainHalfWidth) return true;
    const mod80 = ((z % INTERSECTION_SPACING) + INTERSECTION_SPACING) % INTERSECTION_SPACING;
    const distCross = Math.min(mod80, INTERSECTION_SPACING - mod80);
    const crossCenterLimit = CROSS_STREET_LENGTH / 2 - config.collisionHalfLength;
    if (distCross <= (CROSS_STREET_WIDTH - config.collisionHalfWidth * 2) / 2 && Math.abs(lx) <= crossCenterLimit) return true;

    const distAlley = Math.abs(mod80 - ALLEY_SPACING);
    const alleyCenterLimit = ALLEY_LENGTH / 2 - config.collisionHalfLength;
    if (distAlley <= (ALLEY_WIDTH - config.collisionHalfWidth * 2) / 2 && Math.abs(lx) <= alleyCenterLimit) return true;

    // Victoria Road (1st left turn after taking 2nd right at z = -80) & Memorial turnaround plaza
    if (
      Math.abs(x - VICTORIA_ROAD_X) <= (VICTORIA_ROAD_WIDTH - config.collisionHalfWidth * 2) / 2 &&
      z <= VICTORIA_TURN_Z + 6 &&
      z >= VICTORIA_PLAZA_Z - 3
    ) return true;
    if (Math.abs(x - VICTORIA_ROAD_X) <= 18 && z <= VICTORIA_PLAZA_Z + 4 && z >= VICTORIA_PLAZA_Z - 7) return true;

    // College Street corridor (turn left at z = -80, then 1st right at x = -76 northbound) & College St Crossing
    if (
      Math.abs(x - COLLEGE_STREET_X) <= (COLLEGE_STREET_WIDTH - config.collisionHalfWidth * 2) / 2 &&
      z <= COLLEGE_TURN_Z + 6 &&
      z >= COLLEGE_CROSSING_Z - 12
    ) return true;
    if (Math.abs(x - COLLEGE_STREET_X) <= 36 && z <= COLLEGE_CROSSING_Z + 2 && z >= COLLEGE_CROSSING_Z - 14) return true;

    // Eden Gardens East Perimeter Road (x = 126, connecting z = -320 and z = -400 around the stadium)
    if (Math.abs(x - 126) <= 5.0 && z <= -314 && z >= -406) return true;

    return false;
  }

  function hitsCenterCurb(x, z) {
    const lx = x - roadCenterX(z);
    if (Math.abs(lx) > 0.85) return false;
    if (isRoadOpening(z, config.collisionHalfLength)) return false;
    const mod80 = ((z % INTERSECTION_SPACING) + INTERSECTION_SPACING) % INTERSECTION_SPACING;
    const distCross = Math.min(mod80, INTERSECTION_SPACING - mod80);
    return distCross > 6.6;
  }

  function resolveMovement(prevX, prevZ, nextX, nextZ, heading, speed, dt) {
    let x = nextX;
    let z = nextZ;
    let h = heading;
    let spd = speed;

    if (hitsCenterCurb(x, z) && !hitsCenterCurb(prevX, prevZ)) {
      const cx = roadCenterX(z);
      x = prevX >= cx ? cx + 0.9 : cx - 0.9;
      h = THREE.MathUtils.lerp(h, roadAngle(z), Math.min(1, dt * 8));
      spd *= Math.exp(-1.5 * dt);
    }

    if (!isDrivable(x, z)) {
      if (isDrivable(prevX, z)) {
        x = prevX;
        spd *= Math.exp(-2.0 * dt);
      } else if (isDrivable(x, prevZ)) {
        z = prevZ;
        spd *= Math.exp(-2.0 * dt);
      } else {
        x = prevX;
        z = prevZ;
        spd *= Math.exp(-3.0 * dt);
      }
    }

    return { x, z, heading: h, speed: spd };
  }

  return {
    group,
    isDrivable,
    resolveMovement,
    setNightMode(isNight) {
      const night = Boolean(isNight);
      for (const light of practicalLights) light.visible = night;
      lampBulbMat.emissiveIntensity = night ? 1.35 : 0.18;
    },
    update(_playerX, playerZ) {
      let built = 0;
      while (pendingFacadeIndex < pendingFacadeBuilds.length && built < 8) {
        buildFacade(pendingFacadeBuilds[pendingFacadeIndex++]);
        built++;
      }
      if (pendingFacadeIndex >= pendingFacadeBuilds.length) {
        pendingFacadeBuilds.length = 0;
        pendingFacadeIndex = 0;
      }
      built = 0;
      while (pendingTreeIndex < pendingTreeBuilds.length && built < 4) {
        buildTree(pendingTreeBuilds[pendingTreeIndex++]);
        built++;
      }
      if (pendingTreeIndex >= pendingTreeBuilds.length) {
        pendingTreeBuilds.length = 0;
        pendingTreeIndex = 0;
      }
      const elapsed = performance.now() * 0.001;
      const totalSpan = INTERSECTION_SPACING * 9;

      for (const n of nodes) {
        if (n.z > playerZ + INTERSECTION_SPACING * 3) {
          n.z -= totalSpan;
          n.index -= 9;
        } else if (n.z < playerZ - INTERSECTION_SPACING * 5) {
          n.z += totalSpan;
          n.index += 9;
        }

        n.nodeGroup.position.set(roadCenterX(n.z), 0, n.z);
        n.nodeGroup.rotation.y = roadAngle(n.z);
        n.nodeGroup.visible = Math.abs(n.z - playerZ) < 200;
        // Hide recycled west-side (-X) buildings/stalls/alley meshes when a node overlaps St. Paul's Cathedral (z = -520)
        const overlapsStPaul = Math.abs(n.z - (-480)) < 14 || Math.abs(n.z - (-560)) < 14;
        for (const child of n.nodeGroup.children) {
          if (child.position.x < -14) {
            child.visible = !overlapsStPaul;
          }
        }

        const nextLight = getIntersectionLight(n.index, elapsed);
        if (nextLight !== n.currentLight) {
          n.currentLight = nextLight;
          const tex = lampTextures[nextLight];
          n.headMat.map = tex;
          n.headMat.emissiveMap = tex;
          n.headMat.needsUpdate = true;
        }
      }
    },
  };
}
