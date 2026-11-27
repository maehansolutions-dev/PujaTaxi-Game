import * as THREE from 'three';
import { isRoadOpening, roadAngle, roadCenterX } from './roadLayout.js';
import { loadGLTF } from './gltfCache.js';

export const DEFAULT_BUILDING_MODELS = [
  './models/building1.glb',
  './models/indian_style_building.glb',
  './models/building3.glb',
  './models/building4.glb',
];

const REPEAT_TINTS = [
  0xffffff, // Natural base color
  0xffe4c4, // Warm sandstone / ochre
  0xdcedc8, // Soft sage tint
  0xd6eaf8, // Cool slate / sky tint
  0xfadbd8, // Warm terracotta / rose plaster
  0xfcf3cf, // Sunlit cream
  0xe8daef, // Muted lavender / stone
];

const _tmpTint = new THREE.Color();

function normalizeBuildingTemplate(modelRoot) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  const toRemove = [];
  modelRoot.traverse((obj) => {
    if (obj.isLight || obj.isCamera) {
      toRemove.push(obj);
      return;
    }
    if (obj.isMesh) {
      const n = (obj.name || '').toLowerCase();
      if (
        n.includes('pplane') ||
        n.includes('plane') ||
        n.includes('floor') ||
        n.includes('ground') ||
        n.includes('backdrop') ||
        n.includes('background') ||
        n.includes('sky')
      ) {
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

  const height = size.y > 0.05 ? size.y : Math.max(size.x, size.z, 1);
  modelRoot.scale.multiplyScalar(1 / height);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const scaledSize = new THREE.Vector3();
  scaledBox.getSize(scaledSize);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
  });

  wrapper.userData.halfX = scaledSize.x * 0.5;
  wrapper.userData.halfZ = scaledSize.z * 0.5;
  return wrapper;
}

function createBuildingInstance(template) {
  const wrapper = template.clone(true);
  const tintableMaterials = [];
  const emissiveMaterials = [];

  wrapper.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const cloned = mats.map((orig) => {
      if (!orig) return orig;
      const mat = orig.clone();
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = 0.9;
      }
      if ('emissiveIntensity' in mat) {
        const baseEmissive = Math.min(mat.emissiveIntensity || 0, 1.1);
        mat.emissiveIntensity = baseEmissive;
        emissiveMaterials.push({ mat, baseEmissive });
      }
      if (mat.color) {
        tintableMaterials.push({
          mat,
          baseColor: mat.color.clone(),
          hasTexture: Boolean(mat.map),
        });
      }
      mat.needsUpdate = true;
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
  });

  return { wrapper, tintableMaterials, emissiveMaterials };
}

function applyLoopTint(slot, loopCycle) {
  if (!slot.tintableMaterials?.length) return;
  const tintHex = REPEAT_TINTS[Math.abs(loopCycle) % REPEAT_TINTS.length];
  _tmpTint.setHex(tintHex);

  for (const entry of slot.tintableMaterials) {
    if (entry.hasTexture) {
      // Keep textured facades crisp; apply only a subtle 18% tint shift
      entry.mat.color.copy(entry.baseColor).lerp(_tmpTint, 0.18);
    } else {
      // Gently vary untextured plaster/trim surfaces across loop cycles
      entry.mat.color.copy(entry.baseColor).lerp(_tmpTint, 0.45);
    }
  }
}

function triggerSpawnAnimation(slot, delay = 0) {
  slot.animDelay = delay;
  slot.animProgress = 0;
}

const BLOCK_SPACING = 80;
const BLOCK_BUILDING_OFFSETS = [-14, -29, -51, -66];

export function createBuildingLoopSystem(
  scene,
  {
    modelUrls = DEFAULT_BUILDING_MODELS,
    groundY = -0.46,
    blocks = 5,
    setbackX = 18.5,
  } = {}
) {
  const group = new THREE.Group();
  scene.add(group);

  const templates = new Array(modelUrls.length).fill(null);
  const slots = [];
  const pendingBuilds = [];
  let pendingBuildIndex = 0;

  for (const side of [-1, 1]) {
    for (let b = 1; b >= 2 - blocks; b--) {
      for (let o = 0; o < BLOCK_BUILDING_OFFSETS.length; o++) {
        const slotIndex = slots.length;
        const modelIndex = slotIndex % modelUrls.length;
        const z = b * BLOCK_SPACING + BLOCK_BUILDING_OFFSETS[o];
        const x = side * (setbackX + (slotIndex % 2) * 0.8);
        const targetHeight = 14 + ((slotIndex * 5) % 5) * 3.2;

        const root = new THREE.Group();
        const holder = new THREE.Group();
        root.add(holder);
        root.position.set(x, groundY, z);
        holder.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        // Stay hidden until the GLB model loads (no solid fallback box)
        holder.visible = false;
        group.add(root);

        const slot = {
          root,
          holder,
          side,
          baseX: x,
          z,
          targetHeight,
          modelIndex,
          loaded: false,
          loopCycle: Math.abs(b) * BLOCK_BUILDING_OFFSETS.length + o,
          phase: slotIndex * 0.85,
          animDelay: 0,
          animProgress: 1,
          tintableMaterials: [],
          emissiveMaterials: [],
        };

        slots.push(slot);
      }
    }
  }

  function rebuildSlot(slot) {
    const tpl = templates[slot.modelIndex];
    if (!tpl) return;
    slot.holder.clear();

    const { wrapper, tintableMaterials, emissiveMaterials } = createBuildingInstance(tpl);
    // Holder is rotated ±90°, so local X spans world Z and local Z spans world X.
    const halfX = tpl.userData.halfX || 0.5;
    const halfZ = tpl.userData.halfZ || 0.5;
    const maxScaleZ = halfX > 0.01 ? 7.0 / halfX : slot.targetHeight;
    const maxScaleX = halfZ > 0.01 ? 6.8 / halfZ : slot.targetHeight;
    const s = Math.min(slot.targetHeight, maxScaleZ, maxScaleX);
    wrapper.scale.setScalar(s);

    slot.extentZ = halfX * s;
    slot.baseX = slot.side * (13.0 + halfZ * s);

    slot.holder.add(wrapper);
    slot.tintableMaterials = tintableMaterials;
    slot.emissiveMaterials = emissiveMaterials;
    slot.loaded = true;
    slot.holder.visible = !isRoadOpening(slot.z, slot.extentZ + 0.3);

    applyLoopTint(slot, slot.loopCycle);
    slot.animDelay = 0;
    slot.animProgress = 1;
  }

  modelUrls.forEach((url, idx) => {
    loadGLTF(url).then((gltf) => {
      templates[idx] = normalizeBuildingTemplate(gltf.scene.clone(true));
      for (const slot of slots) if (slot.modelIndex === idx) pendingBuilds.push(slot);
    }).catch((err) => console.warn(`[buildings.js] Failed to load ${url}:`, err));
  });

  const totalSpan = blocks * BLOCK_SPACING;

  return {
    group,
    update(playerZ, dt = 0.016, time = 0) {
      let buildsThisFrame = 0;
      while (pendingBuildIndex < pendingBuilds.length && buildsThisFrame < 4) {
        rebuildSlot(pendingBuilds[pendingBuildIndex++]);
        buildsThisFrame++;
      }
      if (pendingBuildIndex >= pendingBuilds.length) {
        pendingBuilds.length = 0;
        pendingBuildIndex = 0;
      }
      const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
      const recycleBehind = playerZ + 70;

      for (const slot of slots) {
        let cycled = false;
        if (slot.z > recycleBehind) {
          slot.z -= totalSpan;
          slot.loopCycle += 1;
          cycled = true;
        } else if (slot.z < playerZ - totalSpan + 70) {
          slot.z += totalSpan;
          slot.loopCycle = Math.max(0, slot.loopCycle - 1);
          cycled = true;
        }

        if (cycled) {
          slot.holder.visible = slot.loaded && !isRoadOpening(slot.z, (slot.extentZ || 2.0) + 0.3);
          applyLoopTint(slot, slot.loopCycle);
          triggerSpawnAnimation(slot, 0);
        }

        if (!slot.loaded) continue;
        const inRange = slot.z <= playerZ + 60 && slot.z >= playerZ - 240;
        slot.root.visible = inRange;
        if (!inRange) continue;

        if (slot.animDelay > 0) {
          slot.animDelay = Math.max(0, slot.animDelay - safeDt);
        } else if (slot.animProgress < 1) {
          slot.animProgress = Math.min(1, slot.animProgress + safeDt * 2.2);
        }

        const t = slot.animProgress;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const riseOffsetY = (1 - easeOut) * -6.5;
        const settleScaleY = 0.72 + easeOut * 0.28;
        const idleBreathY = t >= 1 ? Math.sin(time * 1.1 + slot.phase) * 0.04 : 0;

        slot.root.position.set(roadCenterX(slot.z) + slot.baseX, groundY + riseOffsetY + idleBreathY, slot.z);
        slot.root.rotation.y = roadAngle(slot.z);
        slot.holder.scale.set(1, settleScaleY, 1);

        if (slot.emissiveMaterials?.length) {
          const pulse = 0.85 + Math.sin(time * 2.1 + slot.phase) * 0.15;
          for (const em of slot.emissiveMaterials) {
            if (em.baseEmissive > 0.01) {
              em.mat.emissiveIntensity = em.baseEmissive * pulse;
            }
          }
        }
      }
    },
  };
}
