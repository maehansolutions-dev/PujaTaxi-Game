import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import { STPAUL_X, STPAUL_Z } from './roadLayout.js';

const MODEL_URL = './models/stpaulcathedral.glb';

function makeCathedralGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a6e2b';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 67123;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 1100; i++) {
    const g = Math.floor(86 + rand() * 54);
    ctx.fillStyle = `rgba(${Math.floor(g * 0.54)}, ${g}, ${Math.floor(g * 0.34)}, 0.28)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function normalizeCathedralModel(srcScene) {
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

  // Scale cathedral cleanly to ~52m span inside the 68m x 64m compound
  const span = Math.max(size.x, size.z) || 1;
  root.scale.multiplyScalar(52 / span);

  wrapper.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaled.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;

  // Orient main side/nave facing +X directly toward the main road
  const scaledSize = new THREE.Vector3();
  scaled.getSize(scaledSize);
  wrapper.rotation.y = scaledSize.x > scaledSize.z * 1.1 ? Math.PI / 2 : 0;

  const cathedralMats = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    if (obj.geometry && !obj.geometry.attributes?.normal) {
      obj.geometry.computeVertexNormals();
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const upgraded = mats.map((orig) => {
      const mat = orig
        ? orig.clone()
        : new THREE.MeshStandardMaterial({ color: 0xf4f1e8 });
      mat.side = THREE.DoubleSide;
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.25;
      cathedralMats.push(mat);
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? upgraded : upgraded[0];
  });

  return { wrapper, cathedralMats };
}

export function createStPaulsCathedralLandmark(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Enclosed compound on west (-X) side between z = -488 and z = -552 (clear of main road at x = -32.3)
  const blockW = 68; // x = -36 to -104
  const blockD = 64; // z = -488 to -552

  // 1. Lush cathedral green lawn & gravel/stone entrance path facing the main road (+X)
  const grassMat = new THREE.MeshStandardMaterial({ map: makeCathedralGrassTexture(), roughness: 0.92 });
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(blockW, blockD), grassMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(STPAUL_X, 0.016, STPAUL_Z);
  lawn.receiveShadow = true;
  group.add(lawn);

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xb9aa96, roughness: 0.85 });
  const entryPath = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), pathMat);
  entryPath.rotation.x = -Math.PI / 2;
  entryPath.position.set(STPAUL_X + 22, 0.02, STPAUL_Z);
  group.add(entryPath);

  // 2. White/cream masonry boundary wall & iron fence with main entrance gate facing the main road (x = -36)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xebe6da, roughness: 0.72 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.45, metalness: 0.65 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1b5fa8, roughness: 0.45 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.45 });

  // East wall facing the main road (x = -36) with central gate opening at z = -520
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 25), wallMat);
    wall.position.set(-36, 0.68, STPAUL_Z + side * 19.5);
    const iron = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 25), ironMat);
    iron.position.set(-36, 1.75, STPAUL_Z + side * 19.5);
    group.add(wall, iron);
  }
  // North & South walls
  for (const wz of [STPAUL_Z - 32, STPAUL_Z + 32]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(blockW, 1.35, 0.45), wallMat);
    wall.position.set(STPAUL_X, 0.68, wz);
    const iron = new THREE.Mesh(new THREE.BoxGeometry(blockW, 0.85, 0.16), ironMat);
    iron.position.set(STPAUL_X, 1.75, wz);
    group.add(wall, iron);
  }
  // West back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, blockD), wallMat);
  backWall.position.set(-104, 0.68, STPAUL_Z);
  group.add(backWall);

  // Blue-and-white guardrails along the main-road sidewalk edge (x = -33.5)
  for (let i = 0; i < 20; i++) {
    const gz = STPAUL_Z - 28 + i * 2.9;
    if (Math.abs(gz - STPAUL_Z) < 6) continue;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 2.6), i % 2 === 0 ? blueMat : whiteMat);
    rail.position.set(-33.5, 0.46, gz);
    group.add(rail);
  }

  // Cathedral main gate pillars facing the main road (x = -36, z = -520)
  for (const pz of [-5.2, 5.2]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.6, 0.85), wallMat);
    pillar.position.set(-36, 1.8, STPAUL_Z + pz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 4), wallMat);
    cap.position.set(-36, 4.0, STPAUL_Z + pz);
    cap.rotation.y = Math.PI / 4;
    group.add(pillar, cap);
  }

  // 3. Mature trees framing the cathedral clearing (strictly around the lawn perimeter, open center view)
  const treeCoords = [
    [-39, STPAUL_Z - 28, 9.8, 0], [-39, STPAUL_Z - 16, 8.8, 1],
    [-39, STPAUL_Z + 16, 9.0, 1], [-39, STPAUL_Z + 28, 9.8, 0],
    [-52, STPAUL_Z - 29, 9.2, 2], [-72, STPAUL_Z - 29, 10.2, 1], [-94, STPAUL_Z - 26, 9.4, 0],
    [-52, STPAUL_Z + 29, 9.4, 1], [-72, STPAUL_Z + 29, 10.0, 0], [-94, STPAUL_Z + 26, 9.2, 2],
    [-98, STPAUL_Z - 10, 9.6, 1], [-98, STPAUL_Z + 10, 9.4, 0],
  ];
  DEFAULT_TREE_MODELS.forEach((url, idx) => {
    loadGLTF(url)
      .then((gltf) => {
        const tpl = normalizeTreeModel(gltf.scene.clone(true));
        for (const [tx, tz, h, mIdx] of treeCoords) {
          if (mIdx !== idx) continue;
          const tree = tpl.clone(true);
          tree.scale.setScalar(h);
          tree.position.set(tx, 0.02, tz);
          tree.rotation.y = (tx + tz) * 0.4;
          group.add(tree);
        }
      })
      .catch(() => {});
  });

  // 4. Warm architectural floodlight for night mode
  const facadeLight = new THREE.PointLight(0xffe9c4, 34, 85, 1.25);
  facadeLight.position.set(STPAUL_X + 24, 16, STPAUL_Z);
  group.add(facadeLight);

  // Fallback white Gothic silhouette until stpaulcathedral.glb loads
  const fallback = new THREE.Group();
  const fbMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.48 });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 42), fbMat);
  nave.position.y = 7;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 22, 8), fbMat);
  spire.position.set(8, 25, 0);
  fallback.add(nave, spire);
  fallback.position.set(STPAUL_X - 4, 0.02, STPAUL_Z);
  group.add(fallback);

  let currentNight = true;
  let loadedMats = [fbMat];
  function applyMode(isNight) {
    currentNight = Boolean(isNight);
    facadeLight.intensity = currentNight ? 36 : 0;
    for (const m of loadedMats) {
      if (currentNight) {
        m.emissive?.setHex(0xd8e2f0);
        m.emissiveIntensity = 0.14;
      } else {
        m.emissive?.setHex(0xfff6e0);
        m.emissiveIntensity = 0.08;
      }
    }
  }
  applyMode(currentNight);

  loadGLTF(MODEL_URL, { priority: 'high' })
    .then((gltf) => {
      group.remove(fallback);
      const { wrapper, cathedralMats } = normalizeCathedralModel(gltf.scene);
      wrapper.position.set(STPAUL_X - 4, 0.02, STPAUL_Z);
      group.add(wrapper);
      loadedMats = cathedralMats;
      applyMode(currentNight);
    })
    .catch((err) => console.warn('[stPaulsCathedral.js] Failed to load model:', err));

  return {
    group,
    setNightMode: applyMode,
  };
}
