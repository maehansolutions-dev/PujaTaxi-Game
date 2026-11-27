import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { roadAngle, roadCenterX } from './roadLayout.js';

const DEFAULT_BUS_MODELS = ['./models/bus1.glb', './models/bus2.glb'];
const TARGET_LENGTH = 9.2;
const WORLD_UNIT_PER_KMH_PER_SEC = 0.38 / 3.6;

const BUS_TINTS = [0x2a6699, 0xd49a2a, 0x2f7558, 0xb84638];

function makeGlowTexture(color, centerAlpha = 0.9) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const [r, g, b] = color;
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
  gradient.addColorStop(0.28, `rgba(${r},${g},${b},${centerAlpha * 0.55})`);
  gradient.addColorStop(0.7, `rgba(${r},${g},${b},${centerAlpha * 0.14})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRoadPoolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(64, 128);
  ctx.scale(0.75, 1.0);
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 96);
  grad.addColorStop(0.0, 'rgba(255, 232, 185, 0.22)');
  grad.addColorStop(0.55, 'rgba(255, 218, 155, 0.08)');
  grad.addColorStop(1.0, 'rgba(255, 205, 130, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFallbackBus(tintHex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: tintHex,
    roughness: 0.38,
    metalness: 0.25,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xe6e8eb,
    roughness: 0.45,
    metalness: 0.12,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x162029,
    roughness: 0.14,
    metalness: 0.65,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x14171a,
    roughness: 0.85,
    metalness: 0.08,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.55, 9.0), bodyMat);
  lower.position.set(0, 1.15, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;

  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.95, 8.6), glassMat);
  windows.position.set(0, 2.25, 0);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.28, 8.9), roofMat);
  roof.position.set(0, 2.86, 0);
  roof.castShadow = true;

  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  for (const wx of [-1.14, 1.14]) {
    for (const wz of [-2.85, 2.75]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.48, wz);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  group.add(lower, windows, roof);
  return group;
}

function normalizeBusModel(modelRoot, oncoming = false) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  const toRemove = [];
  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').toLowerCase();
    if (n.includes('pplane') || n.includes('plane') || n.includes('floor') || n.includes('ground')) {
      toRemove.push(obj);
    }
  });
  for (const obj of toRemove) {
    obj.parent?.remove(obj);
  }

  modelRoot.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(wrapper);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);

  // Align longest horizontal dimension along Z
  if (initialSize.x > initialSize.z * 1.15) {
    modelRoot.rotation.y += Math.PI / 2;
    modelRoot.updateMatrixWorld(true);
  }

  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);
  const longest = Math.max(size.x, size.z) || 1;
  const scale = TARGET_LENGTH / longest;
  modelRoot.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  // Center X/Z and place bottom flush on y = 0
  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  // Same-direction buses face -Z (rotation.y = Math.PI); oncoming face +Z (rotation.y = 0)
  wrapper.rotation.y = oncoming ? 0 : Math.PI;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const nextMats = mats.map((origMat) => {
      if (!origMat) return origMat;
      const mat = origMat.clone();
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.25;
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? nextMats : nextMats[0];
  });

  wrapper.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(wrapper);
  return { wrapper, bounds: finalBox };
}

function createBusHeadlights({ oncoming = false, headGlowTex, poolTex }) {
  const group = new THREE.Group();
  const dirZ = oncoming ? 1 : -1;

  const lampMat = new THREE.SpriteMaterial({
    map: headGlowTex,
    color: 0xffe8b8,
    transparent: true,
    opacity: oncoming ? 0.94 : 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const leftLamp = new THREE.Sprite(lampMat);
  const rightLamp = new THREE.Sprite(lampMat.clone());
  const size = oncoming ? 0.72 : 0.46;
  leftLamp.scale.set(size, size, 1);
  rightLamp.scale.set(size, size, 1);
  group.add(leftLamp, rightLamp);

  const roadWash = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 13.0),
    new THREE.MeshBasicMaterial({
      map: poolTex,
      color: 0xffe4ad,
      transparent: true,
      opacity: oncoming ? 0.45 : 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  roadWash.rotation.x = -Math.PI / 2;
  group.add(roadWash);

  function syncBounds(bounds) {
    const frontZ = oncoming ? bounds.max.z + 0.06 : bounds.min.z - 0.06;
    const halfW = Math.max(0.75, (bounds.max.x - bounds.min.x) * 0.36);
    const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.32;

    leftLamp.position.set(-halfW, lampY, frontZ);
    rightLamp.position.set(halfW, lampY, frontZ);
    roadWash.position.set(0, 0.015, frontZ + dirZ * 6.4);
  }

  syncBounds(new THREE.Box3(new THREE.Vector3(-1.2, 0, -4.6), new THREE.Vector3(1.2, 3.0, 4.6)));

  return {
    group,
    syncBounds,
    setNightMode(isNight) {
      group.visible = isNight;
    },
  };
}

function createBusUnit(
  scene,
  {
    modelIndex = 0,
    laneX = -5.6,
    initialRelZ = -48,
    cruiseSpeedKmh = 38,
    oncoming = false,
    phase = 0,
    tintHex = 0x2a6699,
    headGlowTex,
    poolTex,
  } = {}
) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  scene.add(root);

  const lights = createBusHeadlights({ oncoming, headGlowTex, poolTex });
  root.add(lights.group);

  const fallback = createFallbackBus(tintHex);
  fallback.rotation.y = oncoming ? 0 : Math.PI;
  visual.add(fallback);

  let currentBounds = new THREE.Box3(
    new THREE.Vector3(-1.2, 0, -4.6),
    new THREE.Vector3(1.2, 3.0, 4.6)
  );

  const attachNormalized = (srcScene) => {
    visual.clear();
    const cloned = srcScene.clone(true);
    const { wrapper, bounds } = normalizeBusModel(cloned, oncoming);
    visual.add(wrapper);
    currentBounds = bounds;
    lights.syncBounds(bounds);
  };

  let initialized = false;
  let busZ = initialRelZ;
  let currentX = laneX;

  return {
    group: root,
    modelIndex,
    laneX,
    oncoming,
    getZ: () => busZ,
    setTemplate(srcScene) {
      attachNormalized(srcScene);
    },
    update(_taxiLateral, taxiZ, _taxiSpeedKmh, dt, isNight = true, allUnits = []) {
      if (!initialized) {
        busZ = taxiZ + initialRelZ;
        initialized = true;
      }

      lights.setNightMode(isNight);

      const time = performance.now() * 0.001 + phase;
      let effectiveSpeed = cruiseSpeedKmh + Math.sin(time * 0.6) * 3.0;

      for (const other of allUnits) {
        if (other === this || other.oncoming !== oncoming) continue;
        if (Math.abs(other.laneX - laneX) > 1.6) continue;
        const otherZ = other.getZ();
        const gap = oncoming ? otherZ - busZ : busZ - otherZ;
        if (gap > 0 && gap < 16.5) {
          effectiveSpeed = Math.min(effectiveSpeed, cruiseSpeedKmh * 0.35);
          break;
        }
      }

      const deltaZ = effectiveSpeed * WORLD_UNIT_PER_KMH_PER_SEC * dt;

      if (oncoming) {
        busZ += deltaZ;
        if (busZ > taxiZ + 26) {
          busZ = taxiZ - 140 - ((phase * 19) % 45);
        }
      } else {
        busZ -= deltaZ;
        if (busZ > taxiZ + 38) {
          busZ = taxiZ - 120 - ((phase * 15) % 40);
        } else if (busZ < taxiZ - 155) {
          busZ = taxiZ + 28;
        }
      }

      const targetX = THREE.MathUtils.clamp(laneX + Math.sin(time * 0.55) * 0.08, -7.2, 7.2);
      currentX = THREE.MathUtils.lerp(currentX, targetX, 1 - Math.exp(-4.0 * dt));

      const minGroundY = -currentBounds.min.y;
      const microBob = Math.abs(Math.sin(time * 7.0)) * 0.008;
      const bodyRoll = -Math.sin(time * 0.85) * 0.01;

      root.position.set(roadCenterX(busZ) + currentX, minGroundY + microBob, busZ);
      root.rotation.y = roadAngle(busZ);
      visual.rotation.z = bodyRoll;
    },
  };
}

export function createBusTraffic(
  scene,
  {
    modelUrls = DEFAULT_BUS_MODELS,
    sameLaneCount = 2,
    oncomingCount = 2,
  } = {}
) {
  const headGlowTex = makeGlowTexture([255, 232, 185], 0.92);
  const poolTex = makeRoadPoolTexture();
  const units = [];
  const pendingModelBuilds = [];
  let pendingModelIndex = 0;

  const sameLanes = [-5.8, -4.8];
  const sameOffsets = [-52, -124];
  for (let i = 0; i < sameLaneCount; i++) {
    units.push(
      createBusUnit(scene, {
        modelIndex: i % modelUrls.length,
        laneX: sameLanes[i % sameLanes.length],
        initialRelZ: sameOffsets[i % sameOffsets.length],
        cruiseSpeedKmh: 36 + i * 4,
        oncoming: false,
        phase: i * 1.9 + 0.4,
        tintHex: BUS_TINTS[i % BUS_TINTS.length],
        headGlowTex,
        poolTex,
      })
    );
  }

  const oncomingLanes = [5.2, 4.6];
  const oncomingOffsets = [-46, -112];
  for (let i = 0; i < oncomingCount; i++) {
    units.push(
      createBusUnit(scene, {
        modelIndex: (i + 1) % modelUrls.length,
        laneX: oncomingLanes[i % oncomingLanes.length],
        initialRelZ: oncomingOffsets[i % oncomingOffsets.length],
        cruiseSpeedKmh: 38 + i * 4,
        oncoming: true,
        phase: i * 2.3 + 1.2,
        tintHex: BUS_TINTS[(i + 2) % BUS_TINTS.length],
        headGlowTex,
        poolTex,
      })
    );
  }

  modelUrls.forEach((url, idx) => {
    loadGLTF(url)
      .then((gltf) => {
        for (const u of units) {
          if (u.modelIndex === idx) pendingModelBuilds.push([u, gltf.scene]);
        }
      })
      .catch(() => {
        // Fallback 3D bus stays active if a specific GLB fails to load
      });
  });

  return {
    update(taxiLateral, taxiZ, taxiSpeedKmh, dt, isNight = true) {
      if (pendingModelIndex < pendingModelBuilds.length) {
        const [unit, template] = pendingModelBuilds[pendingModelIndex++];
        unit.setTemplate(template);
        if (pendingModelIndex >= pendingModelBuilds.length) pendingModelBuilds.length = pendingModelIndex = 0;
      }
      for (const u of units) {
        u.group.visible = Math.abs(taxiLateral - roadCenterX(taxiZ)) <= 13;
        if (!u.group.visible) continue;
        u.update(taxiLateral, taxiZ, taxiSpeedKmh, dt, isNight, units);
      }
    },
  };
}
