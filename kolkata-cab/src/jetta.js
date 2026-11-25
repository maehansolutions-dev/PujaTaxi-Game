import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_JETTA_GLB_URL = './models/volk_jetta.glb';
const TARGET_LENGTH = 4.45;
const WORLD_UNIT_PER_KMH_PER_SEC = 0.38 / 3.6;

const JETTA_TINTS = [0xd8dee6, 0x2f5d8a, 0x1f242b, 0x8f3932, 0x566873, 0xc9b99a];

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
  ctx.scale(0.7, 1.0);
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

function createFallbackJetta(tintHex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: tintHex,
    roughness: 0.3,
    metalness: 0.45,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x162029,
    roughness: 0.12,
    metalness: 0.7,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x14171a,
    roughness: 0.85,
    metalness: 0.08,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.58, 4.35), bodyMat);
  lower.position.set(0, 0.56, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 2.15), glassMat);
  cabin.position.set(0, 1.08, -0.08);
  cabin.castShadow = true;

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.85), bodyMat);
  roof.position.set(0, 1.38, -0.12);
  roof.castShadow = true;

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  for (const wx of [-0.82, 0.82]) {
    for (const wz of [-1.32, 1.32]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.34, wz);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  group.add(lower, cabin, roof);
  return group;
}

function normalizeJettaModel(modelRoot, oncoming = false, tintHex = null) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  const toRemove = [];
  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').toLowerCase();
    if (n.includes('plane') || n.includes('floor') || n.includes('ground')) {
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

  // Same-direction cars face -Z (rotation.y = Math.PI); oncoming cars face +Z (rotation.y = 0)
  wrapper.rotation.y = oncoming ? 0 : Math.PI;

  const tintColor = tintHex ? new THREE.Color(tintHex) : null;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const nextMats = mats.map((origMat) => {
      if (!origMat) return origMat;
      const mat = origMat.clone();
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.25;
      if (
        tintColor &&
        mat.color &&
        !name.includes('glass') &&
        !name.includes('window') &&
        !name.includes('tire') &&
        !name.includes('wheel') &&
        !name.includes('light') &&
        !name.includes('lamp')
      ) {
        mat.color.lerp(tintColor, 0.35);
      }
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? nextMats : nextMats[0];
  });

  wrapper.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(wrapper);
  return { wrapper, bounds: finalBox };
}

function createJettaHeadlights({ oncoming = false, headGlowTex, poolTex }) {
  const group = new THREE.Group();
  const dirZ = oncoming ? 1 : -1;

  const lampMat = new THREE.SpriteMaterial({
    map: headGlowTex,
    color: 0xffe8b8,
    transparent: true,
    opacity: oncoming ? 0.92 : 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const leftLamp = new THREE.Sprite(lampMat);
  const rightLamp = new THREE.Sprite(lampMat.clone());
  const size = oncoming ? 0.56 : 0.38;
  leftLamp.scale.set(size, size, 1);
  rightLamp.scale.set(size, size, 1);
  group.add(leftLamp, rightLamp);

  const roadWash = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 10.5),
    new THREE.MeshBasicMaterial({
      map: poolTex,
      color: 0xffe4ad,
      transparent: true,
      opacity: oncoming ? 0.42 : 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  roadWash.rotation.x = -Math.PI / 2;
  group.add(roadWash);

  function syncBounds(bounds) {
    const frontZ = oncoming ? bounds.max.z + 0.05 : bounds.min.z - 0.05;
    const halfW = Math.max(0.55, (bounds.max.x - bounds.min.x) * 0.36);
    const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.46;

    leftLamp.position.set(-halfW, lampY, frontZ);
    rightLamp.position.set(halfW, lampY, frontZ);
    roadWash.position.set(0, 0.015, frontZ + dirZ * 5.2);
  }

  syncBounds(new THREE.Box3(new THREE.Vector3(-0.9, 0, -2.22), new THREE.Vector3(0.9, 1.45, 2.22)));

  return {
    group,
    syncBounds,
    setNightMode(isNight) {
      group.visible = isNight;
    },
  };
}

function createJettaUnit(
  scene,
  {
    laneX = -5.4,
    initialRelZ = -34,
    cruiseSpeedKmh = 52,
    oncoming = false,
    phase = 0,
    tintHex = 0xd8dee6,
    headGlowTex,
    poolTex,
  } = {}
) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  scene.add(root);

  const lights = createJettaHeadlights({ oncoming, headGlowTex, poolTex });
  root.add(lights.group);

  const fallback = createFallbackJetta(tintHex);
  fallback.rotation.y = oncoming ? 0 : Math.PI;
  visual.add(fallback);

  let currentBounds = new THREE.Box3(
    new THREE.Vector3(-0.9, 0, -2.22),
    new THREE.Vector3(0.9, 1.45, 2.22)
  );

  const attachNormalized = (srcScene) => {
    visual.clear();
    const cloned = srcScene.clone(true);
    const { wrapper, bounds } = normalizeJettaModel(cloned, oncoming, tintHex);
    visual.add(wrapper);
    currentBounds = bounds;
    lights.syncBounds(bounds);
  };

  let initialized = false;
  let carZ = initialRelZ;
  let currentX = laneX;

  return {
    group: root,
    laneX,
    oncoming,
    getZ: () => carZ,
    setTemplate(srcScene) {
      attachNormalized(srcScene);
    },
    update(taxiLateral, taxiZ, _taxiSpeedKmh, dt, isNight = true, allUnits = []) {
      if (!initialized) {
        carZ = taxiZ + initialRelZ;
        initialized = true;
      }

      lights.setNightMode(isNight);

      const time = performance.now() * 0.001 + phase;
      let effectiveSpeed = cruiseSpeedKmh + Math.sin(time * 0.75) * 4.5;

      // Maintain safe spacing behind a vehicle ahead in the same travel direction & lane
      const dir = oncoming ? 1 : -1;
      for (const other of allUnits) {
        if (other === this || other.oncoming !== oncoming) continue;
        if (Math.abs(other.laneX - laneX) > 1.3) continue;
        const otherZ = other.getZ();
        const gap = oncoming ? otherZ - carZ : carZ - otherZ;
        if (gap > 0 && gap < 10.5) {
          effectiveSpeed = Math.min(effectiveSpeed, cruiseSpeedKmh * 0.35);
          break;
        }
      }

      const deltaZ = effectiveSpeed * WORLD_UNIT_PER_KMH_PER_SEC * dt;

      if (oncoming) {
        carZ += deltaZ;
        if (carZ > taxiZ + 22) {
          carZ = taxiZ - 115 - ((phase * 17) % 45);
        }
      } else {
        carZ -= deltaZ;
        if (carZ > taxiZ + 34) {
          carZ = taxiZ - 95 - ((phase * 13) % 35);
        } else if (carZ < taxiZ - 135) {
          carZ = taxiZ + 24;
        }
      }

      const targetX = THREE.MathUtils.clamp(laneX + Math.sin(time * 0.8) * 0.1, -7.4, 7.4);
      currentX = THREE.MathUtils.lerp(currentX, targetX, 1 - Math.exp(-4.5 * dt));

      const minGroundY = -currentBounds.min.y;
      const microBob = Math.abs(Math.sin(time * 8.5)) * 0.008;
      const bodyRoll = -Math.sin(time * 1.0) * 0.014;

      root.position.set(currentX, minGroundY + microBob, carZ);
      visual.rotation.z = bodyRoll;
    },
  };
}

export function createJettaTraffic(
  scene,
  {
    glbUrl = DEFAULT_JETTA_GLB_URL,
    sameLaneCount = 2,
    oncomingCount = 3,
  } = {}
) {
  const headGlowTex = makeGlowTexture([255, 232, 185], 0.92);
  const poolTex = makeRoadPoolTexture();
  const units = [];

  // Same-direction Jettas cruising along the left side of the avenue (-Z)
  const sameLanes = [-5.5, -2.1];
  const sameOffsets = [-32, -68];
  for (let i = 0; i < sameLaneCount; i++) {
    units.push(
      createJettaUnit(scene, {
        laneX: sameLanes[i % sameLanes.length],
        initialRelZ: sameOffsets[i % sameOffsets.length],
        cruiseSpeedKmh: 50 + i * 5,
        oncoming: false,
        phase: i * 1.7 + 0.3,
        tintHex: JETTA_TINTS[i % JETTA_TINTS.length],
        headGlowTex,
        poolTex,
      })
    );
  }

  // Oncoming Jettas driving toward you along the right side of the avenue (+Z)
  const oncomingLanes = [2.2, 5.4, 3.6];
  const oncomingOffsets = [-28, -56, -88];
  for (let i = 0; i < oncomingCount; i++) {
    units.push(
      createJettaUnit(scene, {
        laneX: oncomingLanes[i % oncomingLanes.length],
        initialRelZ: oncomingOffsets[i % oncomingOffsets.length],
        cruiseSpeedKmh: 52 + i * 4,
        oncoming: true,
        phase: i * 2.1 + 1.1,
        tintHex: JETTA_TINTS[(i + 2) % JETTA_TINTS.length],
        headGlowTex,
        poolTex,
      })
    );
  }

  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      for (const u of units) {
        u.setTemplate(gltf.scene);
      }
    },
    undefined,
    () => {
      // Fallback 3D Jetta stays active if GLB hasn't loaded yet
    }
  );

  return {
    update(taxiLateral, taxiZ, taxiSpeedKmh, dt, isNight = true) {
      for (const u of units) {
        u.update(taxiLateral, taxiZ, taxiSpeedKmh, dt, isNight, units);
      }
    },
  };
}