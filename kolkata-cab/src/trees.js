import * as THREE from 'three';
import { GANGA_NORTH_BANK_Z, GANGA_SOUTH_BANK_Z, isRoadOpening, roadAngle, roadCenterX } from './roadLayout.js';
import { loadGLTF } from './gltfCache.js';

export const DEFAULT_TREE_MODELS = [
  './models/tree1.glb',
  './models/tree4.glb',
  './models/tree5.glb',
];

function createFallbackTree(variant = 0) {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.9,
    metalness: 0.02,
  });

  const greens = [0x2f5936, 0x3b693c, 0x264c32, 0x457342, 0x345e38];
  const leafMat = new THREE.MeshStandardMaterial({
    color: greens[variant % greens.length],
    roughness: 0.78,
    metalness: 0.02,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.4, 8), trunkMat);
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const puffs = [
    { x: 0, y: 3.3, z: 0, r: 1.55 },
    { x: 0.95, y: 2.85, z: 0.45, r: 1.15 },
    { x: -0.9, y: 2.95, z: -0.4, r: 1.2 },
    { x: 0.2, y: 3.9, z: -0.55, r: 1.05 },
  ];
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  for (const p of puffs) {
    const m = new THREE.Mesh(puffGeo, leafMat);
    m.position.set(p.x, p.y, p.z);
    m.scale.setScalar(p.r);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  return group;
}

export function normalizeTreeModel(modelRoot, targetHeight = 1) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  // Strip stray helper planes/lights/cameras that sometimes ship inside GLB scenes
  const toRemove = [];
  modelRoot.traverse((obj) => {
    if (obj.isLight || obj.isCamera) {
      toRemove.push(obj);
      return;
    }
    if (obj.isMesh) {
      const n = (obj.name || '').toLowerCase();
      if (n.includes('plane') || n.includes('floor') || n.includes('ground')) {
        toRemove.push(obj);
      }
    }
  });
  for (const obj of toRemove) {
    obj.parent?.remove(obj);
  }

  modelRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);

  const height = size.y > 0.01 ? size.y : Math.max(size.x, size.z, 1);
  const scale = targetHeight / height;
  modelRoot.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  // Center X/Z and place bottom of trunk/canopy flush at y = 0
  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const clonedMats = mats.map((orig) => {
      if (!orig) return orig;
      const mat = orig.clone();
      mat.side = THREE.DoubleSide;
      if (mat.transparent && (mat.opacity === undefined || mat.opacity > 0.95)) {
        mat.depthWrite = true;
      }
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = 0.85;
      }
      mat.needsUpdate = true;
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? clonedMats : clonedMats[0];
  });

  return wrapper;
}

export function createTreeSystem(
  scene,
  {
    modelUrls = DEFAULT_TREE_MODELS,
    footpathY = 0.14,
    spacing = 26,
    slotsPerSide = 10,
  } = {}
) {
  const group = new THREE.Group();
  scene.add(group);

  const templates = new Array(modelUrls.length).fill(null);
  const trees = [];
  const pendingBuilds = [];
  let pendingBuildIndex = 0;

  for (const side of [-1, 1]) {
    for (let i = 0; i < slotsPerSide; i++) {
      const slotIdx = trees.length;
      const modelSlot = slotIdx % modelUrls.length;
      const z = 20 - i * spacing;
      const x = side * (12.4 + (i % 2) * 0.45);
      const rotY = ((slotIdx * 1.31) % (Math.PI * 2));
      const heightScale = 0.88 + ((slotIdx * 7) % 5) * 0.07; // ~5.5m to 7.2m tall
      const targetHeight = 6.2 * heightScale;

      const root = new THREE.Group();
      const holder = new THREE.Group();
      root.add(holder);
      root.position.set(x, footpathY, z);
      holder.rotation.y = rotY;
      holder.visible = !isRoadOpening(z, 1.5);
      group.add(root);

      holder.add(createFallbackTree(modelSlot));

      trees.push({
        root,
        holder,
        side,
        baseX: x,
        z,
        rotY,
        targetHeight,
        modelSlot,
      });
    }
  }

  function rebuildTreeVisual(tree) {
    const tpl = templates[tree.modelSlot];
    if (!tpl) return;
    tree.holder.clear();
    tree.holder.scale.setScalar(tree.targetHeight);
    tree.holder.add(tpl.clone(true));
  }

  modelUrls.forEach((url, idx) => {
    loadGLTF(url).then((gltf) => {
      templates[idx] = normalizeTreeModel(gltf.scene.clone(true));
      for (const tree of trees) if (tree.modelSlot === idx) pendingBuilds.push(tree);
    }).catch(() => {
      // Keep the procedural fallback if a specific model file is missing.
    });
  });

  const totalSpan = slotsPerSide * spacing;

  return {
    group,
    update(playerZ) {
      let buildsThisFrame = 0;
      while (pendingBuildIndex < pendingBuilds.length && buildsThisFrame < 1) {
        rebuildTreeVisual(pendingBuilds[pendingBuildIndex++]);
        buildsThisFrame++;
      }
      if (pendingBuildIndex >= pendingBuilds.length) {
        pendingBuilds.length = 0;
        pendingBuildIndex = 0;
      }
      const recycleBehind = playerZ + 45;
      for (const t of trees) {
        if (t.z > recycleBehind) {
          t.z -= totalSpan;
          t.holder.visible = !isRoadOpening(t.z, 1.5);
        } else if (t.z < playerZ - totalSpan + 45) {
          t.z += totalSpan;
          t.holder.visible = !isRoadOpening(t.z, 1.5);
        }
        t.root.position.set(roadCenterX(t.z) + t.baseX, footpathY, t.z);
        t.root.rotation.y = roadAngle(t.z);
        const overRiver = t.z <= GANGA_SOUTH_BANK_Z + 10 && t.z >= GANGA_NORTH_BANK_Z - 10;
        t.root.visible = !overRiver && t.z <= playerZ + 35 && t.z >= playerZ - 160;
      }
    },
  };
}
