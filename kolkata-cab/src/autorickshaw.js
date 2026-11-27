import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { roadAngle, roadCenterX } from './roadLayout.js';

const DEFAULT_GLB_URL = './models/autorickshaw.glb';
const TARGET_LENGTH = 2.85;
const WORLD_UNIT_PER_KMH_PER_SEC = 0.38 / 3.6;

function makeGlowTexture(color, centerAlpha = 0.92) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const [r, g, b] = color;
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
  gradient.addColorStop(0.24, `rgba(${r},${g},${b},${centerAlpha * 0.55})`);
  gradient.addColorStop(0.65, `rgba(${r},${g},${b},${centerAlpha * 0.14})`);
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
  // Soft elliptical puddle/beam wash with zero hard edges on any side
  ctx.save();
  ctx.translate(64, 128);
  ctx.scale(0.65, 1.0);
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 96);
  grad.addColorStop(0.0, 'rgba(255, 224, 158, 0.22)');
  grad.addColorStop(0.5, 'rgba(255, 208, 125, 0.08)');
  grad.addColorStop(1.0, 'rgba(255, 195, 105, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFallbackAuto() {
  const group = new THREE.Group();

  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.38,
    metalness: 0.06,
  });
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.45,
    metalness: 0.05,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x141618,
    roughness: 0.85,
    metalness: 0.05,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.56, 2.55), yellowMat);
  lower.position.set(0, 0.52, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 1.55), greenMat);
  cabin.position.set(0, 1.12, 0.12);
  cabin.castShadow = true;
  cabin.receiveShadow = true;

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 1.62), yellowMat);
  roof.position.set(0, 1.50, 0.12);
  roof.castShadow = true;

  const wheelGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.20, 18);
  wheelGeo.rotateZ(Math.PI / 2);

  const frontWheel = new THREE.Mesh(wheelGeo, darkMat);
  frontWheel.position.set(0, 0.30, -0.95);
  frontWheel.castShadow = true;

  const rearLeft = new THREE.Mesh(wheelGeo, darkMat);
  rearLeft.position.set(-0.66, 0.30, 0.78);
  rearLeft.castShadow = true;

  const rearRight = new THREE.Mesh(wheelGeo, darkMat);
  rearRight.position.set(0.66, 0.30, 0.78);
  rearRight.castShadow = true;

  group.add(lower, cabin, roof, frontWheel, rearLeft, rearRight);
  return group;
}

function normalizeAutoModel(modelRoot, oncoming = false) {
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

  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  // Forward (-Z) has wrapper.rotation.y = Math.PI; oncoming (+Z) faces opposite
  wrapper.rotation.y = oncoming ? 0 : Math.PI;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if ('roughness' in mat) mat.roughness = Math.min(1, Math.max(0.25, (mat.roughness ?? 0.5) * 0.9));
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.05;
    }
  });

  wrapper.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(wrapper);

  return { wrapper, bounds: finalBox };
}

function createAutoHeadlight({ oncoming = false, headGlowTex, poolTex }) {
  const group = new THREE.Group();
  const dirZ = oncoming ? 1 : -1;

  // Single centered front headlamp glow (authentic to an auto-rickshaw)
  const lampSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: headGlowTex,
      color: 0xffe4a3,
      transparent: true,
      opacity: oncoming ? 0.9 : 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  const glowSize = oncoming ? 0.52 : 0.34;
  lampSprite.scale.set(glowSize, glowSize, 1);
  group.add(lampSprite);

  // Soft diffused road reflection ahead of the single headlamp (no sharp cone edges)
  const roadWash = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 8.5),
    new THREE.MeshBasicMaterial({
      map: poolTex,
      color: 0xffdf9e,
      transparent: true,
      opacity: oncoming ? 0.45 : 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  roadWash.rotation.x = -Math.PI / 2;
  group.add(roadWash);

  function syncBounds(bounds) {
    const frontZ = oncoming ? bounds.max.z + 0.05 : bounds.min.z - 0.05;
    const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.52;

    lampSprite.position.set(0, lampY, frontZ);
    roadWash.position.set(0, 0.015, frontZ + dirZ * 4.4);
  }

  syncBounds(new THREE.Box3(new THREE.Vector3(-0.68, 0, -1.42), new THREE.Vector3(0.68, 1.55, 1.42)));

  return { group, syncBounds };
}

function createAutoUnit(
  scene,
  {
    glbUrl = DEFAULT_GLB_URL,
    laneX = -3.4,
    initialRelZ = -14,
    cruiseSpeedKmh = 46,
    oncoming = false,
    phase = 0,
    headGlowTex,
    poolTex,
  } = {}
) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  scene.add(root);

  const lights = createAutoHeadlight({ oncoming, headGlowTex, poolTex });
  root.add(lights.group);

  const fallback = createFallbackAuto();
  fallback.rotation.y = oncoming ? 0 : Math.PI;
  visual.add(fallback);

  const attachNormalized = (srcScene) => {
    visual.clear();
    const cloned = srcScene.clone(true);
    const { wrapper, bounds } = normalizeAutoModel(cloned, oncoming);
    visual.add(wrapper);
    lights.syncBounds(bounds);
  };

  let initialized = false;
  let autoZ = initialRelZ;
  let currentX = laneX;

  return {
    group: root,
    setTemplate(srcScene) {
      attachNormalized(srcScene);
    },
    update(taxiLateral, taxiZ, _taxiSpeedKmh, dt) {
      if (!initialized) {
        autoZ = taxiZ + initialRelZ;
        initialized = true;
      }

      const time = performance.now() * 0.001 + phase;
      const effectiveSpeedKmh = cruiseSpeedKmh + Math.sin(time * 0.85) * 4;
      const deltaZ = effectiveSpeedKmh * WORLD_UNIT_PER_KMH_PER_SEC * dt;

      if (oncoming) {
        autoZ += deltaZ;
        if (autoZ > taxiZ + 18) {
          autoZ = taxiZ - 85 - ((phase * 9) % 24);
        }
      } else {
        autoZ -= deltaZ;
        if (autoZ > taxiZ + 28) {
          autoZ = taxiZ - 68;
        } else if (autoZ < taxiZ - 85) {
          autoZ = taxiZ + 22;
        }
      }

      let targetX = laneX + Math.sin(time * 0.9) * 0.14;
      const localTaxiX = taxiLateral - roadCenterX(taxiZ);
      const dx = targetX - localTaxiX;
      const dz = autoZ - taxiZ;
      if (!oncoming && Math.abs(dx) < 2.2 && Math.abs(dz) < 7.5) {
        targetX = localTaxiX + (dx >= 0 ? 2.4 : -2.4);
      }
      targetX = THREE.MathUtils.clamp(targetX, -6.2, 6.2);
      currentX = THREE.MathUtils.lerp(currentX, targetX, 1 - Math.exp(-4 * dt));

      const bob = Math.abs(Math.sin(time * 9.5)) * 0.012;
      const roll = -Math.sin(time * 1.1) * 0.02;

      root.position.set(roadCenterX(autoZ) + currentX, bob, autoZ);
      root.rotation.y = roadAngle(autoZ);
      visual.rotation.z = roll;
    },
  };
}

export function createAutoTraffic(
  scene,
  { glbUrl = DEFAULT_GLB_URL, companionLaneX = -3.4, oncomingCount = 3 } = {}
) {
  const headGlowTex = makeGlowTexture([255, 226, 165], 0.92);
  const poolTex = makeRoadPoolTexture();
  const units = [];
  const pendingModelBuilds = [];
  let pendingModelIndex = 0;

  units.push(
    createAutoUnit(scene, {
      glbUrl,
      laneX: companionLaneX,
      initialRelZ: -14,
      cruiseSpeedKmh: 46,
      oncoming: false,
      phase: 0,
      headGlowTex,
      poolTex,
    })
  );

  const count = Math.max(2, Math.min(3, oncomingCount));
  const oncomingLanes = [2.6, 4.4, 3.3];
  const initialOffsets = [-22, -46, -72];
  const speeds = [44, 48, 42];

  for (let i = 0; i < count; i++) {
    units.push(
      createAutoUnit(scene, {
        glbUrl,
        laneX: oncomingLanes[i % oncomingLanes.length],
        initialRelZ: initialOffsets[i % initialOffsets.length],
        cruiseSpeedKmh: speeds[i % speeds.length],
        oncoming: true,
        phase: i * 1.9 + 0.7,
        headGlowTex,
        poolTex,
      })
    );
  }

  loadGLTF(glbUrl, { priority: 'high' }).then((gltf) => {
      for (const u of units) pendingModelBuilds.push([u, gltf.scene]);
    }).catch(() => {});

  return {
    update(taxiLateral, taxiZ, taxiSpeedKmh, dt) {
      if (pendingModelIndex < pendingModelBuilds.length) {
        const [unit, template] = pendingModelBuilds[pendingModelIndex++];
        unit.setTemplate(template);
        if (pendingModelIndex >= pendingModelBuilds.length) pendingModelBuilds.length = pendingModelIndex = 0;
      }
      for (const u of units) {
        u.group.visible = Math.abs(taxiLateral - roadCenterX(taxiZ)) <= 13;
        if (!u.group.visible) continue;
        u.update(taxiLateral, taxiZ, taxiSpeedKmh, dt);
      }
    },
  };
}
