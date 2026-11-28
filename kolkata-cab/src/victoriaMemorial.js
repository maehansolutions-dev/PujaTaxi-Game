import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import {
  VICTORIA_PLAZA_Z,
  VICTORIA_ROAD_WIDTH,
  VICTORIA_ROAD_X,
  VICTORIA_TURN_Z,
} from './roadLayout.js';

const MODEL_URL = './models/victoria_tripo.glb';

function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3f732d';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 91823;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 1400; i++) {
    const g = Math.floor(88 + rand() * 58);
    ctx.fillStyle = `rgba(${Math.floor(g * 0.54)}, ${g}, ${Math.floor(g * 0.34)}, 0.3)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makePromenadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ad7b62';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 44219;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(130 + rand() * 55);
    ctx.fillStyle = `rgba(${v}, ${Math.floor(v * 0.7)}, ${Math.floor(v * 0.56)}, 0.18)`;
    ctx.fillRect(rand() * 256, rand() * 256, 3 + rand() * 6, 3 + rand() * 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeGateRailingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);

  ctx.strokeStyle = '#14171a';
  ctx.fillStyle = '#14171a';

  // Horizontal iron rails
  ctx.fillRect(0, 42, 512, 12);
  ctx.fillRect(0, 68, 512, 8);
  ctx.fillRect(0, 218, 512, 14);
  ctx.fillRect(0, 238, 512, 14);

  // Dense vertical pickets with spear finials
  for (let x = 12; x < 512; x += 24) {
    ctx.fillRect(x - 2.5, 34, 5, 214);
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 5, 34);
    ctx.lineTo(x - 5, 34);
    ctx.closePath();
    ctx.fill();
  }

  // Ornate circular medallions every 128px (matches Pic 1 railing)
  for (let cx = 64; cx < 512; cx += 128) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, 144, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, 144, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(9, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeCenterGateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);

  ctx.strokeStyle = '#14171a';
  ctx.fillStyle = '#14171a';

  // Gentle arched crest top (matching Pic 1 central gate)
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 246, 200, Math.PI * 1.18, Math.PI * 1.82);
  ctx.stroke();

  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 246, 178, Math.PI * 1.17, Math.PI * 1.83);
  ctx.stroke();

  // Horizontal base & mid rails
  ctx.fillRect(20, 224, 472, 16);
  ctx.fillRect(20, 96, 472, 9);

  // Vertical bars clipped below arch
  for (let x = 32; x <= 480; x += 24) {
    const dx = x - 256;
    const archY = 246 - Math.sqrt(Math.max(0, 194 * 194 - dx * dx));
    if (archY < 224) ctx.fillRect(x - 3, archY, 6, 232 - archY);
  }

  // Central crest emblem
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(256, 152, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 152, 16, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function normalizeVictoriaModel(srcScene) {
  const wrapper = new THREE.Group();
  const root = srcScene.clone(true);
  wrapper.add(root);

  const remove = [];
  root.traverse((obj) => {
    if (obj.isLight || obj.isCamera) remove.push(obj);
  });
  for (const obj of remove) obj.parent?.remove(obj);

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Scale Victoria Memorial to realistic ~64m width
  const span = Math.max(size.x, size.z) || 1;
  root.scale.multiplyScalar(64 / span);

  wrapper.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaled.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;

  // Align widest facade along X facing +Z toward Victoria Road
  const scaledSize = new THREE.Vector3();
  scaled.getSize(scaledSize);
  if (scaledSize.z > scaledSize.x * 1.1) {
    wrapper.rotation.y = Math.PI / 2;
  }

  const marbleMaterials = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    if (obj.geometry && !obj.geometry.attributes?.normal) {
      obj.geometry.computeVertexNormals();
    }
    const origMats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const cloned = origMats.map((orig) => {
      const mat = orig
        ? orig.clone()
        : new THREE.MeshStandardMaterial({ color: 0xf8f5ec });
      mat.side = THREE.DoubleSide;
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.35;
      marbleMaterials.push(mat);
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
  });

  return { wrapper, marbleMaterials };
}

export function createVictoriaMemorialLandmark(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const roadLen = Math.abs(VICTORIA_PLAZA_Z - VICTORIA_TURN_Z) + 6;
  const roadCenterZ = (VICTORIA_TURN_Z + VICTORIA_PLAZA_Z) / 2;

  // 1. Victoria Road heading left (-Z) from the z = -80 cross street at x = 64
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.48, metalness: 0.2 });
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(VICTORIA_ROAD_WIDTH, roadLen), roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(VICTORIA_ROAD_X, 0.011, roadCenterZ);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Dashed lane markings along Victoria Road
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xd0ccc0, roughness: 0.45 });
  const dashGeo = new THREE.BoxGeometry(0.14, 0.02, 4.2);
  for (let z = VICTORIA_TURN_Z - 9; z > VICTORIA_PLAZA_Z + 8; z -= 10) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(VICTORIA_ROAD_X, 0.02, z);
    group.add(dash);
  }

  // Sidewalks & low trimmed green hedges along Victoria Road (stop cleanly before promenade)
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb8aba2, roughness: 0.78 });
  const grassTex = makeGrassTexture();
  const hedgeMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0x2a5624, roughness: 0.9 });
  const hedgeLen = roadLen - 22;
  const hedgeZ = VICTORIA_TURN_Z - 11 - hedgeLen / 2;
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3.0, roadLen - 8), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(VICTORIA_ROAD_X + side * (VICTORIA_ROAD_WIDTH / 2 + 1.5), 0.012, roadCenterZ + 2);
    walk.receiveShadow = true;
    group.add(walk);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, hedgeLen), hedgeMat);
    hedge.position.set(VICTORIA_ROAD_X + side * (VICTORIA_ROAD_WIDTH / 2 + 3.2), 0.275, hedgeZ);
    hedge.receiveShadow = true;
    group.add(hedge);
  }

  // 2. Sandstone / terracotta pedestrian promenade in front of the gate (Pic 1)
  const promenadeMat = new THREE.MeshStandardMaterial({ map: makePromenadeTexture(), roughness: 0.84 });
  const promenade = new THREE.Mesh(new THREE.PlaneGeometry(92, 20), promenadeMat);
  promenade.rotation.x = -Math.PI / 2;
  promenade.position.set(VICTORIA_ROAD_X, 0.015, VICTORIA_PLAZA_Z - 2);
  promenade.receiveShadow = true;
  group.add(promenade);

  // 3. Expansive Maidan green lawn behind the gate + flanking Victoria Road approach (Pic 1 & Pic 2)
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 });
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(96, 118), grassMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(VICTORIA_ROAD_X, 0.014, VICTORIA_PLAZA_Z - 70);
  lawn.receiveShadow = true;
  group.add(lawn);

  const approachParkLen = Math.abs(VICTORIA_PLAZA_Z - VICTORIA_TURN_Z) - 14;
  const approachParkZ = VICTORIA_TURN_Z - 11 - approachParkLen / 2;
  for (const side of [-1, 1]) {
    const park = new THREE.Mesh(new THREE.PlaneGeometry(36, approachParkLen), grassMat);
    park.rotation.x = -Math.PI / 2;
    park.position.set(VICTORIA_ROAD_X + side * (VICTORIA_ROAD_WIDTH / 2 + 21), 0.01, approachParkZ);
    park.receiveShadow = true;
    group.add(park);
  }

  // 4. Low ornate wrought-iron fence + low arched central crest gate (Pic 1)
  const gateZ = VICTORIA_PLAZA_Z - 11;
  const railMat = new THREE.MeshStandardMaterial({
    map: makeGateRailingTexture(),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.45,
    metalness: 0.65,
  });
  const centerGateMat = new THREE.MeshStandardMaterial({
    map: makeCenterGateTexture(),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.45,
    metalness: 0.65,
  });

  // Left & right fence wings (2.1m tall)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(38, 2.1), railMat);
    wing.position.set(VICTORIA_ROAD_X + side * 22.8, 1.05, gateZ);
    group.add(wing);
  }
  // Central arched crest gate (7.2m wide, 2.9m tall)
  const centerGate = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.9), centerGateMat);
  centerGate.position.set(VICTORIA_ROAD_X, 1.45, gateZ);
  group.add(centerGate);

  // Low stone gate posts
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.68 });
  for (const px of [-42, -3.7, 3.7, 42]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.35, 0.65), stoneMat);
    pillar.position.set(VICTORIA_ROAD_X + px, 1.18, gateZ);
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // 5. Reflecting water pool & marble plinth (Pic 3 & Pic 4)
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x26444a,
    roughness: 0.08,
    metalness: 0.72,
    envMapIntensity: 1.4,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(36, 15), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(VICTORIA_ROAD_X, 0.03, VICTORIA_PLAZA_Z - 31);
  group.add(pool);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(68, 1.2, 46), stoneMat);
  plinth.position.set(VICTORIA_ROAD_X, 0.6, VICTORIA_PLAZA_Z - 66);
  plinth.receiveShadow = true;
  group.add(plinth);

  // 6. Real 3D GLB trees filling the Maidan approach in front of Victoria & framing the lawn
  const treePositions = [
    // Inner memorial garden
    [-26, -24, 9.5, 0], [-34, -40, 10.5, 1], [-24, -56, 8.8, 2],
    [26, -24, 9.8, 1], [34, -42, 10.2, 0], [24, -58, 9.0, 2],
    [-16, -20, 6.2, 2], [16, -20, 6.5, 0],
    // Maidan approach flanking Victoria Road (both sides in front of the gate)
    [-12, 14, 8.2, 0], [-12, 28, 9.4, 1], [-12, 42, 7.8, 2],
    [12, 14, 8.6, 1], [12, 28, 7.9, 2], [12, 42, 9.2, 0],
    [-22, 10, 9.8, 1], [-24, 22, 8.5, 0], [-21, 36, 9.1, 1], [-26, 48, 8.4, 2],
    [22, 10, 9.5, 0], [24, 22, 8.8, 1], [21, 36, 8.2, 2], [26, 48, 9.6, 0],
    [-34, 16, 10.2, 0], [-36, 32, 9.0, 2], [-34, 46, 10.4, 1],
    [34, 16, 10.0, 1], [36, 32, 9.4, 0], [34, 46, 8.9, 2],
  ];
  DEFAULT_TREE_MODELS.forEach((url, idx) => {
    loadGLTF(url)
      .then((gltf) => {
        const tpl = normalizeTreeModel(gltf.scene.clone(true));
        for (const [dx, dz, h, modelIdx] of treePositions) {
          if (modelIdx !== idx) continue;
          const tree = tpl.clone(true);
          tree.scale.setScalar(h);
          tree.position.set(VICTORIA_ROAD_X + dx, 0.02, VICTORIA_PLAZA_Z + dz);
          tree.rotation.y = (dx + dz) * 0.4;
          group.add(tree);
        }
      })
      .catch(() => {});
  });

  // 7. Silvery floodlight + approach light for night mode
  const monumentLight = new THREE.PointLight(0xdce8ff, 34, 115, 1.2);
  monumentLight.position.set(VICTORIA_ROAD_X, 18, VICTORIA_PLAZA_Z - 40);
  const approachLight = new THREE.PointLight(0xffd89c, 16, 75, 1.4);
  approachLight.position.set(VICTORIA_ROAD_X, 8, (VICTORIA_TURN_Z + VICTORIA_PLAZA_Z) / 2);
  group.add(monumentLight, approachLight);

  // Fallback white marble silhouette until victoria.glb loads
  const fallbackGroup = new THREE.Group();
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8f5ec,
    emissive: 0xfff5dc,
    emissiveIntensity: 0.16,
    roughness: 0.34,
    metalness: 0.08,
  });
  const baseHall = new THREE.Mesh(new THREE.BoxGeometry(52, 12, 30), marbleMat);
  baseHall.position.set(0, 6, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8.5, 16, 12), marbleMat);
  dome.position.set(0, 18, 0);
  fallbackGroup.add(baseHall, dome);
  fallbackGroup.position.set(VICTORIA_ROAD_X, 1.2, VICTORIA_PLAZA_Z - 66);
  group.add(fallbackGroup);

  let currentNight = true;
  let loadedMarbleMats = [marbleMat];
  function applyMarbleMode(isNight) {
    currentNight = Boolean(isNight);
    monumentLight.intensity = currentNight ? 34 : 0;
    approachLight.intensity = currentNight ? 16 : 0;
    for (const mat of loadedMarbleMats) {
      if (currentNight) {
        mat.color.setHex(0xe9eff8);
        mat.emissive.setHex(0xcfdcf0);
        mat.emissiveIntensity = 0.24;
        mat.roughness = 0.28;
        mat.metalness = 0.16;
      } else {
        mat.color.setHex(0xf9f6ee);
        mat.emissive.setHex(0xfff5dc);
        mat.emissiveIntensity = 0.16;
        mat.roughness = 0.34;
        mat.metalness = 0.08;
      }
    }
  }
  applyMarbleMode(currentNight);

  loadGLTF(MODEL_URL, { priority: 'high' })
    .then((gltf) => {
      group.remove(fallbackGroup);
      const { wrapper, marbleMaterials } = normalizeVictoriaModel(gltf.scene);
      wrapper.position.set(VICTORIA_ROAD_X, 1.2, VICTORIA_PLAZA_Z - 66);
      group.add(wrapper);
      loadedMarbleMats = marbleMaterials;
      applyMarbleMode(currentNight);
    })
    .catch((err) => console.warn('[victoriaMemorial.js] Failed to load model:', err));

  return {
    group,
    setNightMode: applyMarbleMode,
  };
}
