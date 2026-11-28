import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import { EDEN_X, EDEN_Z } from './roadLayout.js';

const MODEL_URL = './models/eden_gardens_stadium.glb';

function makeStadiumGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#366828';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 55213;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 1200; i++) {
    const g = Math.floor(82 + rand() * 52);
    ctx.fillStyle = `rgba(${Math.floor(g * 0.52)}, ${g}, ${Math.floor(g * 0.34)}, 0.28)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeTowerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeStyle = (y / 32) % 2 === 0 ? '#b83228' : '#f0efe9';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, y, 56, 32);
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(60, y + 32);
    ctx.moveTo(60, y);
    ctx.lineTo(4, y + 32);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function normalizeStadiumModel(srcScene) {
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

  // Fit enclosed stadium bowl cleanly inside the x=26..118, z=-328..-392 block
  const span = Math.max(size.x, size.z) || 1;
  root.scale.multiplyScalar(72 / span);

  wrapper.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaled.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    if (obj.geometry && !obj.geometry.attributes?.normal) {
      obj.geometry.computeVertexNormals();
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const upgraded = mats.map((orig) => {
      if (!orig) return orig;
      const mat = orig.clone();
      mat.side = THREE.DoubleSide;
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.15;
      if ((mat.name || '').toLowerCase().includes('floodlight panels')) {
        mat.emissive = new THREE.Color(0xeef6ff);
        mat.emissiveIntensity = 1.4;
      }
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? upgraded : upgraded[0];
  });

  return wrapper;
}

export function createEdenGardensLandmark(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Enclosed stadium block: x = 26..118 (92m wide), z = -328..-392 (64m deep)
  // Surrounded on all 4 sides by paved public streets:
  // West: Main Avenue, South: z = -320 cross street, North: z = -400 cross street, East: x = 126 perimeter road
  const blockW = 92;
  const blockD = 64;
  const centerX = 72; // (26 + 118) / 2

  // 1. East Perimeter Road (Gostha Pal Sarani East, x = 126, z = -320..-400)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.48, metalness: 0.2 });
  const eastRoad = new THREE.Mesh(new THREE.PlaneGeometry(13, 82), roadMat);
  eastRoad.rotation.x = -Math.PI / 2;
  eastRoad.position.set(126, 0.011, EDEN_Z);
  eastRoad.receiveShadow = true;
  group.add(eastRoad);

  const dashMat = new THREE.MeshStandardMaterial({ color: 0xd0ccc0, roughness: 0.45 });
  for (let z = -328; z >= -392; z -= 10) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 4.2), dashMat);
    dash.position.set(126, 0.02, z);
    group.add(dash);
  }

  // 2. Maidan grass strictly inside the enclosed stadium compound (never overlapping roads)
  const grassMat = new THREE.MeshStandardMaterial({ map: makeStadiumGrassTexture(), roughness: 0.92 });
  const compoundGrass = new THREE.Mesh(new THREE.PlaneGeometry(blockW, blockD), grassMat);
  compoundGrass.rotation.x = -Math.PI / 2;
  compoundGrass.position.set(centerX, 0.012, EDEN_Z);
  compoundGrass.receiveShadow = true;
  group.add(compoundGrass);

  // Paved pedestrian sidewalk apron around the outside of the stadium wall
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9e9a92, roughness: 0.82 });
  const westWalk = new THREE.Mesh(new THREE.PlaneGeometry(5, blockD), walkMat);
  westWalk.rotation.x = -Math.PI / 2;
  westWalk.position.set(23.5, 0.013, EDEN_Z);
  group.add(westWalk);

  // 3. Continuous Perimeter Boundary Wall & Wrought-Iron Fence enclosing all 4 sides
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b4, roughness: 0.78 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.45, metalness: 0.65 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1b5fa8, roughness: 0.45 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.45 });

  // West wall (x = 26) with gate opening at z = -360
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 25), wallMat);
    wall.position.set(26, 0.68, EDEN_Z + side * 19.5);
    const iron = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 25), ironMat);
    iron.position.set(26, 1.75, EDEN_Z + side * 19.5);
    group.add(wall, iron);
  }
  // North (z = -392) and South (z = -328) walls
  for (const wz of [EDEN_Z - 32, EDEN_Z + 32]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(blockW, 1.35, 0.45), wallMat);
    wall.position.set(centerX, 0.68, wz);
    const iron = new THREE.Mesh(new THREE.BoxGeometry(blockW, 0.85, 0.16), ironMat);
    iron.position.set(centerX, 1.75, wz);
    group.add(wall, iron);
  }
  // East wall (x = 118)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, blockD), wallMat);
  eastWall.position.set(118, 0.68, EDEN_Z);
  const eastIron = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, blockD), ironMat);
  eastIron.position.set(118, 1.75, EDEN_Z);
  group.add(eastWall, eastIron);

  // Blue-and-white Kolkata pedestrian guardrails along the west curb (x = 21.5)
  for (let i = 0; i < 22; i++) {
    const gz = EDEN_Z - 30 + i * 2.8;
    if (Math.abs(gz - EDEN_Z) < 6.0) continue;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 2.55), i % 2 === 0 ? blueMat : whiteMat);
    rail.position.set(21.5, 0.46, gz);
    group.add(rail);
  }

  // 4 Colonial Entrance Gate Pillars with finials at (x = 26, z = -360)
  for (const pz of [-6.0, -2.8, 2.8, 6.0]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.6, 0.85), wallMat);
    pillar.position.set(26, 1.8, EDEN_Z + pz);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), wallMat);
    finial.position.set(26, 3.8, EDEN_Z + pz);
    group.add(pillar, finial);
  }

  // 4. Solid concrete stadium concourse drum underneath the tiered bowl so it never looks hollow
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x9b978c, roughness: 0.85, metalness: 0.05 });
  const concourseDrum = new THREE.Mesh(new THREE.CylinderGeometry(28.5, 30.0, 8.2, 32), drumMat);
  concourseDrum.scale.set(1.06, 1, 0.82);
  concourseDrum.position.set(centerX, 4.1, EDEN_Z);
  concourseDrum.receiveShadow = true;
  group.add(concourseDrum);

  // 5. Mature Maidan trees strictly inside the perimeter compound edge (never on roads)
  const treeCoords = [
    [29, -334, 8.8, 0], [29, -347, 9.6, 1], [29, -373, 9.4, 1], [29, -386, 8.6, 0],
    [48, -331, 9.2, 1], [72, -331, 9.8, 0], [96, -331, 9.0, 2],
    [48, -389, 9.4, 0], [72, -389, 9.6, 1], [96, -389, 8.8, 2],
    [114, -342, 9.4, 1], [114, -378, 9.2, 0],
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

  // 6. Night stadium floodlight glow
  const pitchGlow = new THREE.PointLight(0xeef6ff, 48, 120, 1.15);
  pitchGlow.position.set(centerX, 24, EDEN_Z);
  group.add(pitchGlow);

  // Fallback solid oval bowl until eden_gardens_stadium.glb loads
  const fallback = new THREE.Mesh(
    new THREE.CylinderGeometry(33, 35, 13, 24, 1, false),
    new THREE.MeshStandardMaterial({ color: 0xc9c6ba, roughness: 0.7 })
  );
  fallback.scale.set(1.04, 1, 0.8);
  fallback.position.set(centerX, 6.5, EDEN_Z);
  group.add(fallback);

  const floodPanels = [];
  loadGLTF(MODEL_URL, { priority: 'high' })
    .then((gltf) => {
      group.remove(fallback);
      const stadium = normalizeStadiumModel(gltf.scene);
      stadium.position.set(centerX, 0.05, EDEN_Z);
      group.add(stadium);
      stadium.traverse((obj) => {
        if (!obj.isMesh) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if ((m?.name || '').toLowerCase().includes('floodlight panels')) floodPanels.push(m);
        }
      });
    })
    .catch((err) => console.warn('[edenGardens.js] Failed to load model:', err));

  return {
    group,
    setNightMode(isNight) {
      pitchGlow.intensity = isNight ? 52 : 0;
      for (const m of floodPanels) m.emissiveIntensity = isNight ? 1.8 : 0.15;
    },
  };
}
