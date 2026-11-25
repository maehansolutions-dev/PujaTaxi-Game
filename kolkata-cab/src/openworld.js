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

const INTERSECTION_SPACING = 80; // Matches CONFIG.chunkLength
const ALLEY_SPACING = 40;       // Half-block alleyway along Z

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

export function createOpenWorldNetwork(scene, config) {
  const group = new THREE.Group();
  scene.add(group);

  const mainStreetMat = new THREE.MeshStandardMaterial({
    color: 0x262c34,
    roughness: 0.42,
    metalness: 0.25,
    envMapIntensity: config.reflectionIntensity ?? 1.3,
  });

  const alleyMat = new THREE.MeshStandardMaterial({
    color: 0x20242b,
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

  const yellowCurbMat = new THREE.MeshStandardMaterial({
    color: 0xe0aa1f,
    emissive: 0x473304,
    emissiveIntensity: 0.25,
    roughness: 0.48,
    metalness: 0.1,
  });

  const sideBuildingColors = [0x8f5642, 0x9c763e, 0x76877b, 0xa89d87, 0x8c5e52];
  const sideBuildingMats = sideBuildingColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.05 })
  );
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

  const curbSpanLen = 67;
  const yellowCurbGeo = new THREE.BoxGeometry(0.44, 0.28, curbSpanLen);
  const yellowCurbOffset = -40;

  const nodes = [];
  for (let i = -5; i <= 3; i++) {
    const z = i * INTERSECTION_SPACING;
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(0, 0, z);
    group.add(nodeGroup);

    // Wide cross street extending ±140m along X so you can turn left or right and keep driving
    const crossStreet = new THREE.Mesh(new THREE.PlaneGeometry(280, 13), mainStreetMat);
    crossStreet.rotation.x = -Math.PI / 2;
    crossStreet.position.set(0, 0.008, 0);
    crossStreet.receiveShadow = true;
    nodeGroup.add(crossStreet);

    // Center dashed markings along the cross street
    for (let dx = -128; dx <= 128; dx += 12) {
      if (Math.abs(dx) < 11) continue;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.02, 0.14), laneDashMat);
      dash.position.set(dx, 0.012, 0);
      nodeGroup.add(dash);
    }

    // Side-street buildings & streetlamps lining both sides of the cross street
    for (const sideZ of [-1, 1]) {
      for (const dirX of [-1, 1]) {
        for (let b = 0; b < 5; b++) {
          const bx = dirX * (26 + b * 22);
          const bh = 9 + ((i + b) & 1) * 3.5;
          const bMesh = new THREE.Mesh(
            new THREE.BoxGeometry(19, bh, 12),
            sideBuildingMats[(Math.abs(i) + b) % sideBuildingMats.length]
          );
          bMesh.position.set(bx, bh / 2, sideZ * 13.5);
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;
          nodeGroup.add(bMesh);

          if (b % 2 === 0) {
            const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.5, 6), postMat);
            lampPole.position.set(bx - 7, 3.75, sideZ * 7.2);
            const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.65), lampBulbMat);
            lampHead.position.set(bx - 7, 7.2, sideZ * 6.8);
            nodeGroup.add(lampPole, lampHead);
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

    // Narrow alleyway halfway between cross streets extending ±110m along X
    const alley = new THREE.Mesh(new THREE.PlaneGeometry(220, 6.2), alleyMat);
    alley.rotation.x = -Math.PI / 2;
    alley.position.set(0, 0.007, -ALLEY_SPACING);
    alley.receiveShadow = true;
    nodeGroup.add(alley);

    // Yellow center curb running along x = 0 between intersections
    const yellowCurb = new THREE.Mesh(yellowCurbGeo, yellowCurbMat);
    yellowCurb.position.set(0, 0.14, yellowCurbOffset);
    yellowCurb.castShadow = true;
    yellowCurb.receiveShadow = true;
    nodeGroup.add(yellowCurb);

    nodes.push({
      index: i,
      z,
      nodeGroup,
      headMat,
      currentLight: 'green',
    });
  }

  function isDrivable(x, z) {
    if (Math.abs(x) <= 9.6) return true;
    const mod80 = ((z % INTERSECTION_SPACING) + INTERSECTION_SPACING) % INTERSECTION_SPACING;
    const distCross = Math.min(mod80, INTERSECTION_SPACING - mod80);
    if (distCross <= 5.4 && Math.abs(x) <= 132) return true;

    const distAlley = Math.abs(mod80 - ALLEY_SPACING);
    if (distAlley <= 2.3 && Math.abs(x) <= 104) return true;

    return false;
  }

  function hitsCenterCurb(x, z) {
    if (Math.abs(x) > 0.85) return false;
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
      x = prevX >= 0 ? 0.9 : -0.9;
      h = THREE.MathUtils.lerp(h, 0, Math.min(1, dt * 8));
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
    update(_playerX, playerZ) {
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

        n.nodeGroup.position.z = n.z;

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