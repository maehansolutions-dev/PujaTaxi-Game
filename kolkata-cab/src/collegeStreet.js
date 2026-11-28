import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import {
  COLLEGE_CURVE_START_Z,
  COLLEGE_MERGE_Z,
  COLLEGE_STREET_WIDTH,
  COLLEGE_STREET_X,
  COLLEGE_TURN_Z,
  collegeStreetAngle,
  collegeStreetCenterX,
  collegeStreetSlope,
} from './roadLayout.js';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function addInstanced(parent, geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  items.forEach((item, i) => {
    _dummy.position.set(item.x, item.y, item.z);
    _dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    if (item.color) {
      _color.setHex(item.color);
      mesh.setColorAt(i, _color);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function getRibbonPoint(z, lateral, y = 0) {
  const cx = collegeStreetCenterX(z);
  const slope = collegeStreetSlope(z);
  const invLen = 1 / Math.hypot(1, slope);
  const nx = invLen;
  const nz = -slope * invLen;
  return new THREE.Vector3(cx + lateral * nx, y, z + lateral * nz);
}

function buildRibbonGeometry(zStart, zEnd, segments, leftOffset, rightOffset, y, uRepeat = 1, vRepeat = 1) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = zStart + (zEnd - zStart) * t;
    const pL = getRibbonPoint(z, leftOffset, y);
    const pR = getRibbonPoint(z, rightOffset, y);

    positions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * vRepeat, uRepeat, t * vRepeat);

    if (i < segments) {
      const base = i * 2;
      // z decreases along segments, so (base, base+1, base+2) winds counter-clockwise facing +Y
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function makeWeatheredFacadeTexture(baseHex, shutterHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 512);

  let seed = 31415;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(22, 20, 18, ${0.03 + rand() * 0.08})`;
    ctx.fillRect(rand() * 256, rand() * 512, 2 + rand() * 8, 12 + rand() * 48);
  }

  for (let row = 0; row < 4; row++) {
    const y = 32 + row * 116;
    ctx.fillStyle = 'rgba(255,250,240,0.22)';
    ctx.fillRect(0, y - 6, 256, 5);
    ctx.fillStyle = 'rgba(20,18,16,0.22)';
    ctx.fillRect(0, y - 1, 256, 3);

    for (let col = 0; col < 4; col++) {
      const wx = 20 + col * 58;
      const wy = y + 14;
      const ww = 34;
      const wh = 72;
      ctx.fillStyle = '#24201c';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      ctx.fillStyle = shutterHex;
      ctx.fillRect(wx, wy, ww, wh);

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      for (let sy = wy + 6; sy < wy + wh; sy += 6) {
        ctx.fillRect(wx + 2, sy, ww - 4, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBookSpineTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1714';
  ctx.fillRect(0, 0, 512, 256);

  const palette = [
    '#7c2f26', '#283d59', '#8f7239', '#2b543b', '#cfc4ad',
    '#4f3b4a', '#9c5633', '#3b5258', '#685b4c', '#b5aa94',
  ];
  let seed = 91827;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let row = 0; row < 2; row++) {
    const y0 = row * 128 + 6;
    const rowH = 116;
    let x = 2;
    while (x < 508) {
      const w = 9 + Math.floor(rand() * 11);
      const h = rowH - Math.floor(rand() * 18);
      const y = y0 + (rowH - h);
      const col = palette[Math.floor(rand() * palette.length)];
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w - 2, h);

      // Subtle spine highlight & worn paper/gold bands
      ctx.fillStyle = 'rgba(255,248,230,0.16)';
      ctx.fillRect(x, y, 2, h);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + w - 4, y, 2, h);
      if (rand() > 0.35) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(235,215,170,0.55)' : 'rgba(20,18,16,0.45)';
        ctx.fillRect(x + 2, y + 10 + rand() * 12, w - 6, 3);
        ctx.fillRect(x + 2, y + h - 18, w - 6, 2);
      }
      x += w;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBookStackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9bfa8'; // Aged paper pages
  ctx.fillRect(0, 0, 256, 256);

  const covers = ['#6e2c24', '#293f57', '#7d6636', '#2e4f3b', '#52443b', '#9e8e74'];
  let seed = 44521;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = covers[Math.floor(rand() * covers.length)];
    ctx.fillRect(0, y, 256, 5);
    ctx.fillStyle = '#d4cab4';
    ctx.fillRect(0, y + 5, 256, 9);
    ctx.fillStyle = 'rgba(30,24,18,0.22)';
    ctx.fillRect(0, y + 14, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeWeatheredTimberTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5a412d';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 55109;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = `rgba(28, 18, 12, ${0.08 + rand() * 0.16})`;
    ctx.fillRect(0, rand() * 256, 256, 1 + rand() * 3);
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = 'rgba(18,12,8,0.45)';
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeCorrugatedTarpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bfc4c8';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 12) {
    ctx.fillStyle = 'rgba(20,24,28,0.24)';
    ctx.fillRect(x, 0, 5, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 5, 0, 3, 256);
  }
  let seed = 88211;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = `rgba(30,25,20,${0.04 + rand() * 0.1})`;
    ctx.fillRect(rand() * 256, rand() * 256, 4 + rand() * 14, 3 + rand() * 12);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#272c32';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 77123;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 650; i++) {
    const v = Math.floor(24 + rand() * 26);
    ctx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 4}, 0.24)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function normalizeHeroLandmark(modelRoot, targetHeight) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  const toRemove = [];
  modelRoot.traverse((obj) => {
    if (obj.isLight || obj.isCamera) {
      toRemove.push(obj);
      return;
    }
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if ('envMapIntensity' in mat) mat.envMapIntensity = 1.15;
        mat.needsUpdate = true;
      });
    }
  });
  for (const obj of toRemove) obj.parent?.remove(obj);

  modelRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = size.y > 0.05 ? size.y : Math.max(size.x, size.z, 1);
  modelRoot.scale.multiplyScalar(targetHeight / h);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;
  return wrapper;
}

export function createCollegeStreetCorridor(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const startZ = COLLEGE_TURN_Z - 6.5; // Clear north edge of Bowbazar Crossing (z = -80)
  const endZ = COLLEGE_MERGE_Z;        // Merges smoothly back into the main road (z = -420)
  const roadSegments = 72;
  const halfW = COLLEGE_STREET_WIDTH / 2;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

  // 1. Curved + straight dark-grey bituminous asphalt carriageway (16m wide)
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: makeAsphaltTexture(),
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.15,
  });
  const roadMesh = new THREE.Mesh(
    buildRibbonGeometry(startZ, endZ, roadSegments, -halfW, halfW, 0.014, 3, 28),
    asphaltMat
  );
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Faint faded white edge demarcations following the curve
  const faintMarkMat = new THREE.MeshStandardMaterial({
    color: 0x9da096,
    roughness: 0.65,
    transparent: true,
    opacity: 0.55,
  });
  for (const side of [-1, 1]) {
    const edgeOffset = side * (halfW - 0.55);
    const edgeLine = new THREE.Mesh(
      buildRibbonGeometry(startZ - 4, endZ + 4, roadSegments, edgeOffset - 0.07, edgeOffset + 0.07, 0.018),
      faintMarkMat
    );
    group.add(edgeLine);
  }

  // 2. Central double-track steel tramway rails along straight stretch + gently into bend
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8f979e, roughness: 0.24, metalness: 0.88 });
  for (const rx of [-2.85, -1.35, 1.35, 2.85]) {
    const rail = new THREE.Mesh(
      buildRibbonGeometry(startZ, COLLEGE_CURVE_START_Z - 26, 28, rx - 0.05, rx + 0.05, 0.02),
      railMat
    );
    group.add(rail);
  }

  // 3. Wide raised concrete & stone sidewalks (4.4m wide) on both sides for book stalls + central walking passage
  const walkWidth = 4.4;
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9e9a92, roughness: 0.82 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xb8b3a8, roughness: 0.72 });
  for (const side of [-1, 1]) {
    const inner = side > 0 ? halfW : -(halfW + walkWidth);
    const outer = side > 0 ? halfW + walkWidth : -halfW;
    const walk = new THREE.Mesh(
      buildRibbonGeometry(startZ, endZ + 12, roadSegments, inner, outer, 0.14),
      walkMat
    );
    walk.receiveShadow = true;
    group.add(walk);

    const curbIn = side > 0 ? halfW : -(halfW + 0.24);
    const curbOut = side > 0 ? halfW + 0.24 : -halfW;
    const curb = new THREE.Mesh(
      buildRibbonGeometry(startZ, endZ + 12, roadSegments, curbIn, curbOut, 0.16),
      curbMat
    );
    group.add(curb);
  }

  // 4. Continuous blue-and-white alternating pedestrian guardrails along both curbs
  const guardrailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.35 });
  const railItems = [];
  const isGateGap = (z) =>
    Math.abs(z - (COLLEGE_TURN_Z - 12)) < 8 ||
    Math.abs(z - (-168)) < 6 ||  // Calcutta Medical College portal
    Math.abs(z - (-226)) < 7 ||  // University of Calcutta portico
    Math.abs(z - (-282)) < 14 || // Presidency University grand gate & forecourt
    Math.abs(z - (-342)) < 10 || // Coffee House corner plaza
    z < endZ + 18;

  let railIdx = 0;
  for (let z = startZ - 10; z > endZ + 16; z -= 2.2) {
    if (isGateGap(z)) { railIdx++; continue; }
    const bandColor = railIdx % 2 === 0 ? 0x1b5fa8 : 0xeef2f5;
    const ang = collegeStreetAngle(z);
    for (const side of [-1, 1]) {
      const pt = getRibbonPoint(z, side * (halfW + 0.22), 0);
      railItems.push({ x: pt.x, y: 0.62, z: pt.z, ry: ang, sx: 0.07, sy: 0.92, sz: 0.07, color: bandColor });
      railItems.push({ x: pt.x, y: 1.02, z: pt.z, ry: ang, sx: 0.06, sy: 0.06, sz: 2.2, color: bandColor });
      railItems.push({ x: pt.x, y: 0.64, z: pt.z, ry: ang, sx: 0.05, sy: 0.05, sz: 2.2, color: bandColor });
    }
    railIdx++;
  }
  addInstanced(group, boxGeo, guardrailMat, railItems);

  // 5. Cobra-head LED streetlamps, traction poles, junction boxes & overhead catenary along curve
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c666e, roughness: 0.48, metalness: 0.65 });
  const ledHeadMat = new THREE.MeshStandardMaterial({ color: 0xe6f2ff, emissive: 0xcce4ff, emissiveIntensity: 1.2, roughness: 0.3 });
  const boxUtilityMat = new THREE.MeshStandardMaterial({ color: 0x6f777d, roughness: 0.62, metalness: 0.35 });
  const poles = [];
  const lampArms = [];
  const ledHeads = [];
  const junctionBoxes = [];
  const spanWirePts = [];

  for (let z = startZ - 14; z > endZ + 18; z -= 22) {
    const ang = collegeStreetAngle(z);
    for (const side of [-1, 1]) {
      const pPole = getRibbonPoint(z, side * (halfW + 0.48), 4.1);
      const pArm = getRibbonPoint(z, side * (halfW + 0.48 - 1.15), 7.95);
      const pHead = getRibbonPoint(z, side * (halfW + 0.48 - 2.15), 8.1);
      poles.push({ x: pPole.x, y: 4.1, z: pPole.z, ry: ang, sx: 0.11, sy: 8.2, sz: 0.11 });
      lampArms.push({ x: pArm.x, y: 7.95, z: pArm.z, ry: ang, rz: side * 0.16, sx: 2.3, sy: 0.09, sz: 0.09 });
      ledHeads.push({ x: pHead.x, y: 8.1, z: pHead.z, ry: ang, sx: 0.58, sy: 0.12, sz: 0.28 });
      if (Math.abs(Math.round(z)) % 44 < 22) {
        const pBox = getRibbonPoint(z + 0.8, side * (halfW + 0.73), 1.65);
        junctionBoxes.push({ x: pBox.x, y: 1.65, z: pBox.z, ry: ang, sx: 0.36, sy: 0.58, sz: 0.28 });
      }
    }
    spanWirePts.push(
      getRibbonPoint(z, -(halfW + 0.48), 6.95),
      getRibbonPoint(z, halfW + 0.48, 6.95)
    );
  }
  addInstanced(group, cylGeo, poleMat, poles);
  addInstanced(group, boxGeo, poleMat, lampArms);
  addInstanced(group, boxGeo, ledHeadMat, ledHeads);
  addInstanced(group, boxGeo, boxUtilityMat, junctionBoxes);

  // Overhead copper tramway catenary wires along straight section
  const copperWireMat = new THREE.LineBasicMaterial({ color: 0xa66a38, transparent: true, opacity: 0.88 });
  for (const cx of [-2.1, 2.1]) {
    const contactPts = [];
    const messengerPts = [];
    for (let i = 0; i <= 24; i++) {
      const z = startZ + ((COLLEGE_CURVE_START_Z - 26 - startZ) * i) / 24;
      contactPts.push(getRibbonPoint(z, cx, 6.15));
      messengerPts.push(getRibbonPoint(z, cx, 6.85));
    }
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(contactPts), copperWireMat),
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(messengerPts), copperWireMat)
    );
  }
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(spanWirePts),
      new THREE.LineBasicMaterial({ color: 0x3b4248, transparent: true, opacity: 0.78 })
    )
  );

  // 6. EAST / RIGHT SIDE (+X): Heritage masonry street canyon along straight section (stops before bend)
  const heritageConfigs = [
    { base: '#c9a66b', shutter: '#244a32' },
    { base: '#d9c589', shutter: '#4a3122' },
    { base: '#b86852', shutter: '#2a4559' },
    { base: '#cfc8b8', shutter: '#21452e' },
    { base: '#9e9a92', shutter: '#3b2b22' },
  ];
  const heritageMats = heritageConfigs.map(
    (c) => new THREE.MeshStandardMaterial({ map: makeWeatheredFacadeTexture(c.base, c.shutter), roughness: 0.86 })
  );
  const darkArcadeMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.9 });
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
  const balconies = [];
  const arcadeBays = [];

  const eastWallX = COLLEGE_STREET_X + halfW + walkWidth;
  let blockIdx = 0;
  for (let z = startZ - 14; z >= COLLEGE_CURVE_START_Z + 6; z -= 20) {
    const h = 12.5 + (blockIdx % 3) * 2.8;
    const depth = 11.5;
    const mat = heritageMats[blockIdx % heritageMats.length];
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(depth, h, 19.6), mat);
    bldg.position.set(eastWallX + depth / 2, h / 2, z);
    bldg.receiveShadow = true;
    group.add(bldg);

    for (let bz = -6.5; bz <= 6.5; bz += 6.5) {
      arcadeBays.push({ x: eastWallX + 0.35, y: 1.9, z: z + bz, sx: 0.8, sy: 3.6, sz: 4.4, color: 0x17191c });
    }
    if (blockIdx % 2 === 0) {
      balconies.push(
        { x: eastWallX - 0.55, y: 5.2, z, sx: 1.1, sy: 0.22, sz: 9.2, color: 0xbab3a6 },
        { x: eastWallX - 1.05, y: 5.75, z, sx: 0.08, sy: 0.9, sz: 9.2, color: 0x1a1e22 }
      );
    }
    blockIdx++;
  }
  addInstanced(group, boxGeo, darkArcadeMat, arcadeBays);
  addInstanced(group, boxGeo, balconyMat, balconies);

  // 7. WEST / LEFT SIDE (-X): Medical College -> Calcutta Univ. -> Presidency Univ. -> Coffee House
  const westWallX = COLLEGE_STREET_X - halfW - walkWidth;

  // 7A. Early Heritage Block (z = -92 to -122)
  const westEarly = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 28), heritageMats[1]);
  westEarly.position.set(westWallX - 5.5, 7, -107);
  group.add(westEarly);

  // 7B. Calcutta Medical College (z = -130 to -196)
  const medWallMat = new THREE.MeshStandardMaterial({ color: 0xa34b39, roughness: 0.82 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xeee9dd, roughness: 0.72 });
  const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x265a96, roughness: 0.68 });
  for (const [wz, wlen] of [[-146, 30], [-188, 28]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, wlen), medWallMat);
    wall.position.set(westWallX - 0.35, 1.6, wz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, wlen), trimMat);
    cap.position.set(westWallX - 0.35, 3.25, wz);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, wlen), blueTrimMat);
    stripe.position.set(westWallX - 0.35, 2.75, wz);
    group.add(wall, cap, stripe);
  }
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.8, 9.5), trimMat);
  portalArch.position.set(westWallX - 0.6, 2.9, -167);
  const portalVoid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 5.2), darkArcadeMat);
  portalVoid.position.set(westWallX - 0.6, 2.1, -167);
  group.add(portalArch, portalVoid);

  const brickMat = new THREE.MeshStandardMaterial({ color: 0x82362a, roughness: 0.85 });
  const medBlock = new THREE.Mesh(new THREE.BoxGeometry(16, 17, 62), brickMat);
  medBlock.position.set(westWallX - 15, 8.5, -167);
  group.add(medBlock);
  const pilasters = [];
  for (let pz = -194; pz <= -140; pz += 8) {
    pilasters.push({ x: westWallX - 6.8, y: 8.5, z: pz, sx: 0.6, sy: 17, sz: 0.9, color: 0xf0ece1 });
  }
  addInstanced(group, boxGeo, balconyMat, pilasters);

  // 7C. University of Calcutta (z = -205 to -248)
  const neoWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf0ece1, roughness: 0.68 });
  const cuClassical = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 36), neoWhiteMat);
  cuClassical.position.set(westWallX - 8.5, 8, -226);
  const cuPortico = new THREE.Mesh(new THREE.BoxGeometry(3.2, 13.5, 16), neoWhiteMat);
  cuPortico.position.set(westWallX - 1.6, 6.75, -226);
  group.add(cuClassical, cuPortico);
  const cuCols = [];
  for (let cz = -233; cz <= -219; cz += 3.5) {
    cuCols.push({ x: westWallX - 0.35, y: 6.5, z: cz, sx: 0.45, sy: 13, sz: 0.45, color: 0xf7f4ec });
  }
  addInstanced(group, cylGeo, balconyMat, cuCols);

  // 7D. PRESIDENCY UNIVERSITY (z = -282, West side facing East onto College Street)
  const presGroup = new THREE.Group();
  presGroup.position.set(westWallX - 16, 0, -282);
  group.add(presGroup);

  // Forecourt green lawn + paved ceremonial approach from College Street
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x2f5a29, roughness: 0.92 });
  const presLawn = new THREE.Mesh(new THREE.BoxGeometry(28, 0.14, 54), lawnMat);
  presLawn.position.set(4, 0.07, 0);
  presLawn.receiveShadow = true;
  presGroup.add(presLawn);

  const forecourtMat = new THREE.MeshStandardMaterial({ color: 0xc9c2b2, roughness: 0.78 });
  const presWalk = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 12), forecourtMat);
  presWalk.position.set(8, 0.09, 0);
  presGroup.add(presWalk);

  // Heritage wrought-iron perimeter pillars framing the Presidency University gate
  for (const gz of [-24, -8, 8, 24]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 1.1), neoWhiteMat);
    pillar.position.set(15.6, 1.9, gz);
    presGroup.add(pillar);
  }

  // Fallback white marble silhouette while presidency_university.glb loads
  const presFallback = new THREE.Mesh(new THREE.BoxGeometry(16, 17, 40), neoWhiteMat);
  presFallback.position.set(-2, 8.5, 0);
  presGroup.add(presFallback);

  loadGLTF('./models/presidency_university.glb', { priority: 'high' })
    .then((gltf) => {
      const model = normalizeHeroLandmark(gltf.scene.clone(true), 19.5);
      // Wide white marble facade parallel to College Street, facing East (+X)
      model.rotation.y = Math.PI / 2;
      model.position.set(-2, 0.08, 0);
      presGroup.remove(presFallback);
      presGroup.add(model);
    })
    .catch(() => {});

  // 7E. INDIAN COFFEE HOUSE (right at the curve around z = -342, outer/north-west side of the bend)
  const coffeePos = getRibbonPoint(-342, -(halfW + walkWidth + 12), 0);
  const coffeeGroup = new THREE.Group();
  coffeeGroup.position.set(coffeePos.x, 0, coffeePos.z);
  // Angle toward approaching northbound traffic entering the curve
  coffeeGroup.rotation.y = collegeStreetAngle(-342) + Math.PI * 0.36;
  group.add(coffeeGroup);

  const coffeePlaza = new THREE.Mesh(new THREE.BoxGeometry(22, 0.16, 22), forecourtMat);
  coffeePlaza.position.set(0, 0.08, 0);
  coffeePlaza.receiveShadow = true;
  coffeeGroup.add(coffeePlaza);

  const coffeeFallback = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), heritageMats[3]);
  coffeeFallback.position.set(0, 7, 0);
  coffeeGroup.add(coffeeFallback);

  loadGLTF('./models/coffe_house.glb', { priority: 'high' })
    .then((gltf) => {
      const model = normalizeHeroLandmark(gltf.scene.clone(true), 16.5);
      model.position.set(0, 0.14, 0);
      coffeeGroup.remove(coffeeFallback);
      coffeeGroup.add(model);
    })
    .catch(() => {});

  // 8. BOI PARA (College Street Book Market):
  // Textured weathered bookstalls along outer sidewalk + footpath book vendors along curb, leaving a central pedestrian passage
  const woodStallMat = new THREE.MeshStandardMaterial({
    map: makeWeatheredTimberTexture(),
    color: 0xffffff,
    roughness: 0.88,
  });
  const tarpRoofMat = new THREE.MeshStandardMaterial({
    map: makeCorrugatedTarpTexture(),
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.12,
  });
  const bookSpineMat = new THREE.MeshStandardMaterial({
    map: makeBookSpineTexture(),
    color: 0xffffff,
    roughness: 0.74,
  });
  const bookStackMat = new THREE.MeshStandardMaterial({
    map: makeBookStackTexture(),
    color: 0xffffff,
    roughness: 0.8,
  });
  const ironPoleMat = new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.55, metalness: 0.65 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: 0xffb84d,
    emissiveIntensity: 1.25,
    roughness: 0.3,
  });

  const woodParts = [];
  const tarpParts = [];
  const ironPosts = [];
  const shelfBooks = [];
  const stackBooks = [];
  const stallBulbs = [];

  // Muted, weathered Kolkata street tarpaulin & timber tones (multiplied with textures)
  const tarpColors = [0x3b5875, 0x455e4c, 0x73493a, 0x6e6246, 0x4e5661, 0x5c4c47];
  const woodColors = [0xd6c8b8, 0xbdae9e, 0xc9b9a6];
  const bookTintColors = [0xffffff, 0xe8dfd1, 0xd8cfc2, 0xcfc4b2];

  let stallIdx = 0;
  for (let z = startZ - 11; z > endZ + 22; z -= 4.2) {
    if (isGateGap(z)) { stallIdx++; continue; }
    const ang = collegeStreetAngle(z);
    for (const side of [-1, 1]) {
      const idx = stallIdx * 2 + (side > 0 ? 1 : 0);
      const tarp = tarpColors[idx % tarpColors.length];
      const wood = woodColors[idx % woodColors.length];

      // A) Outer sidewalk weathered wooden bookshop kiosks
      const outerD = side * (halfW + 3.75);
      const pStall = getRibbonPoint(z, outerD, 0);
      woodParts.push({ x: pStall.x, y: 1.32, z: pStall.z, ry: ang, sx: 1.0, sy: 2.36, sz: 3.65, color: wood });
      const pCounter = getRibbonPoint(z, side * (halfW + 3.05), 0);
      woodParts.push({ x: pCounter.x, y: 0.54, z: pCounter.z, ry: ang, sx: 0.54, sy: 0.82, sz: 3.45, color: wood });

      // Sloped corrugated tin / tarpaulin awning + thin iron awning posts
      const pRoof = getRibbonPoint(z, side * (halfW + 3.35), 0);
      tarpParts.push({ x: pRoof.x, y: 2.56, z: pRoof.z, ry: ang, rz: side * 0.18, sx: 1.85, sy: 0.06, sz: 3.9, color: tarp });
      const pPost = getRibbonPoint(z + 1.65, side * (halfW + 2.68), 0);
      ironPosts.push({ x: pPost.x, y: 1.32, z: pPost.z, ry: ang, sx: 0.035, sy: 2.36, sz: 0.035 });

      const pBulb = getRibbonPoint(z, side * (halfW + 2.95), 0);
      stallBulbs.push({ x: pBulb.x, y: 2.26, z: pBulb.z, ry: ang, sx: 0.1, sy: 0.14, sz: 0.1 });

      // Textured book-spine rows on shelves + neat paperback stacks on counter
      for (let r = 0; r < 3; r++) {
        const bCol = bookTintColors[(idx + r) % bookTintColors.length];
        const pShelfRow = getRibbonPoint(z, side * (halfW + 3.22), 0);
        shelfBooks.push({ x: pShelfRow.x, y: 1.02 + r * 0.46, z: pShelfRow.z, ry: ang, sx: 0.26, sy: 0.34, sz: 3.2, color: bCol });
      }
      for (let bz = -1.2; bz <= 1.2; bz += 0.6) {
        const bCol = bookTintColors[(idx + Math.abs(Math.round(bz * 3))) % bookTintColors.length];
        const stackH = 0.2 + ((idx + Math.abs(Math.round(bz * 3))) % 3) * 0.1;
        const pStk = getRibbonPoint(z + bz, side * (halfW + 3.02), 0);
        stackBooks.push({ x: pStk.x, y: 0.96 + stackH / 2, z: pStk.z, ry: ang, sx: 0.34, sy: stackH, sz: 0.4, color: bCol });
      }

      // B) Inner curbside footpath book vendors (tarpaulin mats + stacked books, leaving center 1.4m passage clear)
      if (stallIdx % 2 === 0 || Math.abs(z) < 310) {
        const innerD = side * (halfW + 0.72);
        const pMat = getRibbonPoint(z + 0.3, innerD, 0);
        tarpParts.push({ x: pMat.x, y: 0.165, z: pMat.z, ry: ang, sx: 0.9, sy: 0.04, sz: 2.55, color: tarp });
        for (let bz = -0.9; bz <= 0.9; bz += 0.45) {
          const bCol = bookTintColors[(idx + Math.abs(Math.round(bz * 4))) % bookTintColors.length];
          const stackH = 0.15 + ((idx + Math.abs(Math.round(bz * 4))) % 4) * 0.07;
          const pFloorBook = getRibbonPoint(z + 0.3 + bz, innerD, 0);
          stackBooks.push({ x: pFloorBook.x, y: 0.185 + stackH / 2, z: pFloorBook.z, ry: ang, sx: 0.46, sy: stackH, sz: 0.32, color: bCol });
        }
      }
    }
    stallIdx++;
  }
  addInstanced(group, boxGeo, woodStallMat, woodParts);
  addInstanced(group, boxGeo, tarpRoofMat, tarpParts);
  addInstanced(group, cylGeo, ironPoleMat, ironPosts);
  addInstanced(group, boxGeo, bookSpineMat, shelfBooks);
  addInstanced(group, boxGeo, bookStackMat, stackBooks);
  addInstanced(group, cylGeo, bulbMat, stallBulbs);

  // Realistic GLB pedestrians & book-stall vendors/browsers (samp_person1 & samp_person2)
  const walkers = [];
  const normalizePerson = (root) => {
    const wrap = new THREE.Group();
    wrap.add(root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y > 0.1 ? size.y : 1.7;
    root.scale.multiplyScalar(1.72 / h);
    wrap.updateMatrixWorld(true);
    const sBox = new THREE.Box3().setFromObject(wrap);
    const ctr = new THREE.Vector3();
    sBox.getCenter(ctr);
    root.position.x -= ctr.x;
    root.position.z -= ctr.z;
    root.position.y -= sBox.min.y;
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = true;
      }
    });
    return wrap;
  };

  Promise.all([loadGLTF('./models/samp_person1.glb'), loadGLTF('./models/samp_person2.glb')])
    .then(([g1, g2]) => {
      const templates = [normalizePerson(g1.scene.clone(true)), normalizePerson(g2.scene.clone(true))];
      // 16 strolling shoppers/students along the central 1.4m sidewalk passage
      for (let i = 0; i < 16; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = startZ - 14 - (i * (Math.abs(endZ - startZ) - 42)) / 16;
        const person = templates[i % templates.length].clone(true);
        group.add(person);
        walkers.push({
          mesh: person,
          side,
          z,
          dir: i % 3 === 0 ? 1 : -1,
          speed: 0.95 + (i % 4) * 0.16,
          lateralOffset: halfW + 1.88 + (i % 3) * 0.2,
          phase: i * 1.3,
        });
      }
      // 12 static vendors/browsers standing at stalls
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = startZ - 22 - i * 24;
        if (isGateGap(z)) continue;
        const person = templates[(i + 1) % templates.length].clone(true);
        const pt = getRibbonPoint(z, side * (halfW + 2.65), 0.14);
        person.position.copy(pt);
        person.rotation.y = collegeStreetAngle(z) + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
        group.add(person);
      }
    })
    .catch(() => {});

  // 9. Mature trees along sidewalk (keep Presidency & Coffee House sightlines clear)
  const treeSlots = [];
  for (let z = startZ - 20; z > endZ + 20; z -= 28) {
    const ang = collegeStreetAngle(z);
    for (const side of [-1, 1]) {
      if (side === -1 && Math.abs(z - (-282)) < 24) continue; // Keep Presidency facade open
      if (side === -1 && Math.abs(z - (-342)) < 18) continue; // Keep Coffee House facade open
      const pt = getRibbonPoint(z, side * (halfW + 1.1), 0);
      treeSlots.push({
        x: pt.x,
        z: pt.z,
        ry: ang + (pt.x + pt.z) * 0.35,
        height: 8.2 + (Math.abs(Math.round(z)) % 3) * 1.2,
        modelIdx: (Math.abs(Math.round(z / 28)) + (side > 0 ? 1 : 0)) % DEFAULT_TREE_MODELS.length,
      });
    }
  }
  DEFAULT_TREE_MODELS.forEach((url, idx) => {
    loadGLTF(url)
      .then((gltf) => {
        const tpl = normalizeTreeModel(gltf.scene.clone(true));
        for (const slot of treeSlots) {
          if (slot.modelIdx !== idx) continue;
          const tree = tpl.clone(true);
          tree.scale.setScalar(slot.height);
          tree.position.set(slot.x, 0.14, slot.z);
          tree.rotation.y = slot.ry;
          group.add(tree);
        }
      })
      .catch(() => {});
  });

  // 9. Night lighting along College Street + Presidency University + Coffee House
  const streetLights = [];
  for (const lz of [-130, -210, -282, -342, -385]) {
    const pt = getRibbonPoint(lz, 0, 7.6);
    const intensity = lz === -282 || lz === -342 ? 28 : 18;
    const pl = new THREE.PointLight(lz === -282 ? 0xfff0d8 : 0xdceeff, intensity, 75, 1.3);
    pl.position.set(pt.x, 8.0, pt.z);
    group.add(pl);
    streetLights.push(pl);
  }

  return {
    group,
    setNightMode(isNight) {
      ledHeadMat.emissiveIntensity = isNight ? 1.4 : 0.2;
      bulbMat.emissiveIntensity = isNight ? 1.5 : 0.15;
      for (let i = 0; i < streetLights.length; i++) {
        streetLights[i].intensity = isNight ? (i === 2 || i === 3 ? 28 : 18) : 0;
      }
    },
    update(dt = 0.016, time = 0) {
      for (const w of walkers) {
        w.z += w.dir * w.speed * dt;
        if (w.z < endZ + 24) w.z = startZ - 14;
        else if (w.z > startZ - 14) w.z = endZ + 24;
        const pt = getRibbonPoint(w.z, w.side * w.lateralOffset, 0.14);
        w.mesh.position.set(pt.x, pt.y + Math.abs(Math.sin(time * 4.4 + w.phase)) * 0.03, pt.z);
        w.mesh.rotation.y = collegeStreetAngle(w.z) + (w.dir < 0 ? Math.PI : 0);
      }
    },
  };
}
