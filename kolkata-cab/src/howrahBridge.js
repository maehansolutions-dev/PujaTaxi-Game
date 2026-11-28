import * as THREE from 'three';
import {
  GANGA_NORTH_BANK_Z,
  GANGA_SOUTH_BANK_Z,
  HOWRAH_BRIDGE_DECK_Y,
  HOWRAH_BRIDGE_END_Z,
  HOWRAH_BRIDGE_START_Z,
  HOWRAH_BRIDGE_Z,
  getBridgeElevationY,
  roadCenterX,
} from './roadLayout.js';

function makeGangaWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Authentic muddy brownish-yellow Hooghly / Ganga silt tone
  ctx.fillStyle = '#8b7646';
  ctx.fillRect(0, 0, 512, 512);

  let seed = 61234;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // Flowing silt streaks & gentle surface ripples
  for (let i = 0; i < 900; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const w = 18 + rand() * 68;
    const h = 1.5 + rand() * 3.5;
    ctx.fillStyle = rand() > 0.5
      ? `rgba(164, 142, 88, ${0.06 + rand() * 0.12})`
      : `rgba(88, 72, 40, ${0.07 + rand() * 0.14})`;
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeWaterNormalTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * tau;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * tau;
      // Multi-frequency river ripple slopes (tileable across 2*PI)
      const dx =
        Math.cos(u * 3 + v * 2) * 0.35 +
        Math.cos(u * 7 - v * 5) * 0.25 +
        Math.cos(u * 13 + v * 11) * 0.18;
      const dy =
        Math.sin(u * 2 + v * 4) * 0.35 +
        Math.sin(u * 6 - v * 9) * 0.28 +
        Math.sin(u * 11 + v * 15) * 0.2;
      const nx = -dx * 0.42;
      const ny = -dy * 0.42;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 10);
  tex.needsUpdate = true;
  return tex;
}

function buildBridgeDeckRibbon(zStart, zEnd, segments, leftOffset, rightOffset, yBias = 0) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = zStart + (zEnd - zStart) * t;
    const cx = roadCenterX(z);
    const y = getBridgeElevationY(z) + yBias;

    positions.push(cx + leftOffset, y, z, cx + rightOffset, y, z);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * 26, 1, t * 26);

    if (i < segments) {
      const b = i * 2;
      // z decreases along segments, so (b, b+1, b+2) winds counter-clockwise facing +Y (upward)
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createHowrahBridgeLandmark(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const riverCenterZ = (GANGA_SOUTH_BANK_Z + GANGA_NORTH_BANK_Z) / 2; // -750
  const riverWidthZ = Math.abs(GANGA_NORTH_BANK_Z - GANGA_SOUTH_BANK_Z) + 16; // 266m

  // 1. Ganga (Hooghly) River water surface — brownish-yellow silty water with animated waves & slow current
  const waterTex = makeGangaWaterTexture();
  const waterNormal = makeWaterNormalTexture();
  const waterUniforms = { uWaterTime: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: 0xffffff,
    roughness: 0.14,
    metalness: 0.42,
    envMapIntensity: 1.75,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = waterUniforms.uWaterTime;
    shader.vertexShader = `uniform float uWaterTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float wave1 = sin(position.x * 0.11 + uWaterTime * 1.15) * 0.085;
       float wave2 = cos(position.y * 0.24 - uWaterTime * 0.95 + position.x * 0.05) * 0.055;
       float wave3 = sin((position.x + position.y) * 0.42 + uWaterTime * 1.8) * 0.025;
       transformed.z += wave1 + wave2 + wave3;`
    );
  };
  const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(4200, riverWidthZ, 96, 28), waterMat);
  riverMesh.rotation.x = -Math.PI / 2;
  riverMesh.position.set(0, -0.32, riverCenterZ);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  // 2. Stepped stone riverfront ghats & embankments along both banks
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c7568, roughness: 0.88 });
  const mudBankMat = new THREE.MeshStandardMaterial({ color: 0x5d523c, roughness: 0.94 });
  for (const [bankZ, dir] of [[GANGA_SOUTH_BANK_Z, -1], [GANGA_NORTH_BANK_Z, 1]]) {
    for (let step = 0; step < 4; step++) {
      const ghatStep = new THREE.Mesh(new THREE.BoxGeometry(1800, 0.32, 3.2), stoneMat);
      ghatStep.position.set(0, -0.3 + (3 - step) * 0.2, bankZ + dir * (step * 2.4 - 2));
      ghatStep.receiveShadow = true;
      group.add(ghatStep);
    }
    const mudStrip = new THREE.Mesh(new THREE.BoxGeometry(4200, 0.25, 10), mudBankMat);
    mudStrip.position.set(0, -0.36, bankZ + dir * 2);
    group.add(mudStrip);
  }

  // 3. Moored wooden country boats (nouka) on the Ganga
  const boatHullMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.85 });
  const boatCanopyMat = new THREE.MeshStandardMaterial({ color: 0xb59c72, roughness: 0.9 });
  const boats = [];
  for (const [bx, bz, ry] of [[-55, -670, 0.2], [72, -715, -0.15], [-92, -820, 0.3], [48, -835, -0.25]]) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 8.5), boatHullMat);
    hull.position.y = 0.25;
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.6, 8, 1, false, 0, Math.PI), boatCanopyMat);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 0.75, 0);
    boat.add(hull, canopy);
    boat.position.set(bx, -0.28, bz);
    boat.rotation.y = ry;
    group.add(boat);
    boats.push({ mesh: boat, baseY: -0.28, phase: bx * 0.1 });
  }

  // 4. Elevated Bridge Roadway Deck + Sidewalks (z = -595 to -905, following getBridgeElevationY)
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x2e3338,
    roughness: 0.44,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const deckMesh = new THREE.Mesh(
    buildBridgeDeckRibbon(HOWRAH_BRIDGE_START_Z, HOWRAH_BRIDGE_END_Z, 64, -9.0, 9.0, 0.02),
    deckMat
  );
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // Bridge sidewalks & steel deck edge girders
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x868b90, roughness: 0.76, side: THREE.DoubleSide });
  const girderMat = new THREE.MeshStandardMaterial({ color: 0x5c646c, roughness: 0.45, metalness: 0.72 });
  for (const side of [-1, 1]) {
    const inOff = side > 0 ? 9.0 : -11.4;
    const outOff = side > 0 ? 11.4 : -9.0;
    const walk = new THREE.Mesh(
      buildBridgeDeckRibbon(HOWRAH_BRIDGE_START_Z, HOWRAH_BRIDGE_END_Z, 64, inOff, outOff, 0.16),
      walkMat
    );
    group.add(walk);

    const railOff = side * 11.3;
    const rail = new THREE.Mesh(
      buildBridgeDeckRibbon(HOWRAH_BRIDGE_START_Z, HOWRAH_BRIDGE_END_Z, 64, railOff - 0.15, railOff + 0.15, 1.05),
      girderMat
    );
    group.add(rail);
  }

  // Dashed center lane line across the bridge
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xe6c86e, roughness: 0.6 });
  for (let z = HOWRAH_BRIDGE_START_Z - 6; z > HOWRAH_BRIDGE_END_Z + 6; z -= 10) {
    const y = getBridgeElevationY(z) + 0.04;
    const slopeY = (getBridgeElevationY(z - 1) - getBridgeElevationY(z + 1)) / 2;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 4.5), dashMat);
    dash.position.set(roadCenterX(z), y, z);
    dash.rotation.x = Math.atan(slopeY);
    group.add(dash);
  }

  // 5. Open-Steel Cantilever Howrah Bridge Structure (100% clear roadway, crisp steel lattice)
  const bridgeRoot = new THREE.Group();
  group.add(bridgeRoot);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xaab4be,
    roughness: 0.42,
    metalness: 0.78,
    envMapIntensity: 1.35,
  });
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.85 });

  const beamMatrices = [];
  const beamColors = [];
  const _up = new THREE.Vector3(0, 1, 0);
  const _dir = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3();
  const _mat4 = new THREE.Matrix4();
  const _col = new THREE.Color();

  const addBeam = (x1, y1, z1, x2, y2, z2, thickX = 0.45, thickZ = 0.45, hex = 0xb4bec8) => {
    _dir.set(x2 - x1, y2 - y1, z2 - z1);
    const len = _dir.length();
    if (len < 0.05) return;
    _dir.divideScalar(len);
    _quat.setFromUnitVectors(_up, _dir);
    _mid.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    _scale.set(thickX, len, thickZ);
    _mat4.compose(_mid, _quat, _scale);
    beamMatrices.push(_mat4.clone());
    _col.setHex(hex);
    beamColors.push(_col.clone());
  };

  // Iconic Howrah Bridge top chord height profile (symmetric around z = -750)
  const southTowerZ = -660;
  const northTowerZ = -840;
  const deckY = HOWRAH_BRIDGE_DECK_Y;
  const trussX = 11.7;

  const topChordOffset = (z) => {
    if (z >= southTowerZ) {
      // South anchor arm: -600 (10m) -> -660 (44m)
      const t = (z - (-600)) / (southTowerZ - (-600));
      return 10 + t * 34;
    }
    if (z <= northTowerZ) {
      // North anchor arm: -900 (10m) -> -840 (44m)
      const t = (-900 - z) / (-900 - northTowerZ);
      return 10 + t * 34;
    }
    const distFromCenter = Math.abs(z - HOWRAH_BRIDGE_Z); // 0 at -750, 90 at towers
    if (distFromCenter <= 35) {
      // Central suspended arch span (16m at hinges -> 21m at center)
      const u = distFromCenter / 35;
      return 21 - 5 * u * u;
    }
    // Cantilever arms (16m at hinge -> 44m at tower)
    const u = (distFromCenter - 35) / 55;
    return 16 + 28 * Math.pow(u, 1.15);
  };

  const panelStep = 10;
  for (let z = -600; z > -900; z -= panelStep) {
    const zNext = z - panelStep;
    const yTop1 = deckY + topChordOffset(z);
    const yTop2 = deckY + topChordOffset(zNext);
    const yBot1 = getBridgeElevationY(z) + 0.35;
    const yBot2 = getBridgeElevationY(zNext) + 0.35;
    const yMid1 = (yBot1 + yTop1) * 0.5;
    const yMid2 = (yBot2 + yTop2) * 0.5;

    for (const side of [-1, 1]) {
      const x = side * trussX;
      // Top & bottom chords
      addBeam(x, yTop1, z, x, yTop2, zNext, 0.72, 0.72, 0xc2ccd6);
      addBeam(x, yBot1, z, x, yBot2, zNext, 0.65, 0.65, 0x9aa4ae);
      // Vertical post + mid-panel hanger
      addBeam(x, yBot1, z, x, yTop1, z, 0.56, 0.56, 0xb0bac4);
      const zMid = (z + zNext) * 0.5;
      const yTopMid = (yTop1 + yTop2) * 0.5;
      const yBotMid = (yBot1 + yBot2) * 0.5;
      addBeam(x, yBotMid, zMid, x, yTopMid, zMid, 0.28, 0.28, 0x9ea8b2);
      // K-truss / X-lattice diagonals on side walls
      addBeam(x, yBot1, z, x, yTop2, zNext, 0.38, 0.38, 0xaab4be);
      addBeam(x, yTop1, z, x, yBot2, zNext, 0.38, 0.38, 0x9aa4ae);
      addBeam(x, yMid1, z, x, yBotMid, zMid, 0.24, 0.24, 0x909aa4);
      addBeam(x, yMid2, zNext, x, yBotMid, zMid, 0.24, 0.24, 0x909aa4);
    }

    // High overhead cross-girders & wind bracing (always >= 10m above deck!)
    addBeam(-trussX, yTop1, z, trussX, yTop1, z, 0.55, 0.55, 0xb8c2cc);
    addBeam(-trussX, yTop1, z, trussX, yTop2, zNext, 0.32, 0.32, 0x9aa4ae);
    addBeam(trussX, yTop1, z, -trussX, yTop2, zNext, 0.32, 0.32, 0x9aa4ae);

    // Under-deck floor cross-beams
    addBeam(-trussX, yBot1 - 0.65, z, trussX, yBot1 - 0.65, z, 0.5, 0.5, 0x6f7880);
  }

  // Twin Main Cantilever Towers & Riverbank Concrete Piers at z = -660 and z = -840
  for (const tz of [southTowerZ, northTowerZ]) {
    const towerTopY = deckY + 46;
    for (const side of [-1, 1]) {
      const x = side * trussX;
      // Heavy twin tower legs + concrete pier down into the river
      addBeam(x, -1.5, tz, x, towerTopY, tz, 1.35, 1.45, 0xc8d2dc);
      addBeam(x, -1.5, tz + 3.2, x, deckY + 24, tz, 0.85, 0.85, 0xaab4be);
      addBeam(x, -1.5, tz - 3.2, x, deckY + 24, tz, 0.85, 0.85, 0xaab4be);

      const pier = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6.2, 10.5), pierMat);
      pier.position.set(x, 1.4, tz);
      pier.receiveShadow = true;
      bridgeRoot.add(pier);
    }
    // High overhead portal cross-beams on the main towers (clear height >= 13m above deck)
    for (const py of [deckY + 14, deckY + 26, deckY + 38, towerTopY - 0.6]) {
      addBeam(-trussX, py, tz, trussX, py, tz, 0.95, 0.95, 0xc8d2dc);
    }
    addBeam(-trussX, deckY + 14, tz, trussX, deckY + 26, tz, 0.55, 0.55, 0xaab4be);
    addBeam(trussX, deckY + 14, tz, -trussX, deckY + 26, tz, 0.55, 0.55, 0xaab4be);
    addBeam(-trussX, deckY + 26, tz, trussX, deckY + 38, tz, 0.55, 0.55, 0xaab4be);
    addBeam(trussX, deckY + 26, tz, -trussX, deckY + 38, tz, 0.55, 0.55, 0xaab4be);
  }

  const steelGeo = new THREE.BoxGeometry(1, 1, 1);
  const steelMesh = new THREE.InstancedMesh(steelGeo, steelMat, beamMatrices.length);
  steelMesh.castShadow = false;
  steelMesh.receiveShadow = true;
  steelMesh.frustumCulled = false;
  for (let i = 0; i < beamMatrices.length; i++) {
    steelMesh.setMatrixAt(i, beamMatrices[i]);
    steelMesh.setColorAt(i, beamColors[i]);
  }
  steelMesh.instanceMatrix.needsUpdate = true;
  if (steelMesh.instanceColor) steelMesh.instanceColor.needsUpdate = true;
  bridgeRoot.add(steelMesh);

  // 6. Night bridge illumination (cool-silver tower floodlights + warm deck lights)
  const bridgeLights = [];
  for (const lz of [-645, -750, -855]) {
    const pl = new THREE.PointLight(lz === -750 ? 0xdbe8ff : 0xffe4b8, 36, 130, 1.2);
    pl.position.set(0, HOWRAH_BRIDGE_DECK_Y + 18, lz);
    group.add(pl);
    bridgeLights.push(pl);
  }

  return {
    group,
    setNightMode(isNight) {
      waterMat.color.setHex(isNight ? 0x423822 : 0xffffff);
      for (const pl of bridgeLights) pl.intensity = isNight ? 36 : 0;
    },
    update(dt = 0.016, time = 0) {
      waterUniforms.uWaterTime.value = time;
      // Slow river current + cross-ripple drift
      waterTex.offset.x = (waterTex.offset.x + dt * 0.014) % 1;
      waterTex.offset.y = (waterTex.offset.y + dt * 0.003) % 1;
      waterNormal.offset.x = (waterNormal.offset.x + dt * 0.032) % 1;
      waterNormal.offset.y = (waterNormal.offset.y - dt * 0.012) % 1;
      for (const b of boats) {
        b.mesh.position.y = b.baseY + Math.sin(time * 1.4 + b.phase) * 0.07;
        b.mesh.rotation.z = Math.sin(time * 1.1 + b.phase) * 0.032;
      }
    },
  };
}
