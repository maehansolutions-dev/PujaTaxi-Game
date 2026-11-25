import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_PERSON_MODELS = [
  './models/samp_person1.glb',
  './models/samp_person2.glb',
];

const TARGET_HEIGHT = 1.72;

// Curated fashion/outfit color palettes (same figure proportions, varied clothing & styling)
const FASHION_STYLES = [
  { name: 'Kolkata Kurta & Cream', outfit: 0xe8dec5, accent: 0x2f5d50, trim: 0xc99a4b, roughness: 0.86 },
  { name: 'Terracotta Casual', outfit: 0xb8533d, accent: 0x263445, trim: 0xd9b37c, roughness: 0.78 },
  { name: 'Mustard & Charcoal', outfit: 0xd4a024, accent: 0x22262b, trim: 0x8fa3ad, roughness: 0.72 },
  { name: 'Teal Streetwear', outfit: 0x2c7a7b, accent: 0x1d242b, trim: 0xe2c08d, roughness: 0.68 },
  { name: 'Maroon & Sand', outfit: 0x7a2838, accent: 0xc9b99a, trim: 0xe8c574, roughness: 0.84 },
  { name: 'Sage & Slate', outfit: 0x6b8572, accent: 0x2d3748, trim: 0xd6cfc2, roughness: 0.8 },
];

function createFallbackPerson(style) {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5e42, roughness: 0.72, metalness: 0.04 });
  const clothMat = new THREE.MeshStandardMaterial({ color: style.outfit, roughness: style.roughness, metalness: 0.04 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: style.accent, roughness: 0.85, metalness: 0.04 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: style.trim, roughness: 0.76, metalness: 0.05 });

  // Grounded legs (y = 0 to 0.78)
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.18), trouserMat);
    leg.position.set(side * 0.13, 0.39, 0);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // Torso (y = 0.78 to 1.38)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.26), clothMat);
  torso.position.set(0, 1.08, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Fashion stole/collar accent
  const stole = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.12, 0.29), scarfMat);
  stole.position.set(0, 1.32, 0);
  stole.castShadow = true;
  group.add(stole);

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.14), clothMat);
    arm.position.set(side * 0.3, 1.08, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  // Head (y = 1.42 to 1.72)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinMat);
  head.position.set(0, 1.57, 0);
  head.castShadow = true;
  group.add(head);

  return group;
}

function normalizePersonModel(modelRoot, style) {
  const wrapper = new THREE.Group();
  wrapper.add(modelRoot);

  // Remove accidental ground/backdrop planes if present in a GLB
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
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);

  const height = size.y || 1;
  const scale = TARGET_HEIGHT / height;
  modelRoot.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  // Center X/Z and place feet flush on y = 0
  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  // Apply clothing/fashion styling across meshes while keeping the exact figure geometry
  const outfitColor = new THREE.Color(style.outfit);
  const accentColor = new THREE.Color(style.accent);
  const trimColor = new THREE.Color(style.trim);

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;

    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const styledMats = mats.map((origMat) => {
      if (!origMat) return origMat;
      const mat = origMat.clone();
      if ('roughness' in mat) mat.roughness = style.roughness;
      if ('metalness' in mat) mat.metalness = 0.05;
      if ('envMapIntensity' in mat) mat.envMapIntensity = 0.9;

      if (mat.color) {
        if (name.includes('pant') || name.includes('leg') || name.includes('trouser') || name.includes('jean')) {
          mat.color.copy(accentColor);
        } else if (name.includes('scarf') || name.includes('shawl') || name.includes('trim') || name.includes('acc')) {
          mat.color.copy(trimColor);
        } else if (!name.includes('head') && !name.includes('skin') && !name.includes('hair') && !name.includes('face')) {
          // Tint clothing/body surface while preserving baked shading/texture detail
          mat.color.lerp(outfitColor, 0.55);
        }
      }
      return mat;
    });

    obj.material = Array.isArray(obj.material) ? styledMats : styledMats[0];
  });

  return wrapper;
}

export function createPedestrianSystem(
  scene,
  {
    modelUrls = DEFAULT_PERSON_MODELS,
    count = 10,
    footpathY = 0.14,
  } = {}
) {
  const group = new THREE.Group();
  scene.add(group);

  const templates = new Array(modelUrls.length).fill(null);
  const walkers = [];

  for (let i = 0; i < count; i++) {
    const style = FASHION_STYLES[i % FASHION_STYLES.length];
    const side = i % 2 === 0 ? -1 : 1;
    const laneX = side * (10.35 + (i % 3) * 0.45);
    const dir = i % 4 < 2 ? -1 : 1; // -1 walks toward -Z, +1 walks toward +Z
    const z = -18 - i * 16;

    const root = new THREE.Group();
    const figureHolder = new THREE.Group();
    root.add(figureHolder);
    group.add(root);

    const fallback = createFallbackPerson(style);
    figureHolder.add(fallback);

    walkers.push({
      root,
      figureHolder,
      style,
      modelSlot: i % modelUrls.length,
      side,
      laneX,
      z,
      dir,
      walkSpeed: 1.15 + (i % 4) * 0.22,
      phase: i * 1.37,
    });
  }

  function rebuildWalkerVisual(walker) {
    const tpl = templates[walker.modelSlot];
    if (!tpl) return;
    walker.figureHolder.clear();
    const normalized = normalizePersonModel(tpl.clone(true), walker.style);
    walker.figureHolder.add(normalized);
  }

  const loader = new GLTFLoader();
  modelUrls.forEach((url, slotIdx) => {
    loader.load(
      url,
      (gltf) => {
        templates[slotIdx] = gltf.scene;
        for (const w of walkers) {
          if (w.modelSlot === slotIdx) {
            rebuildWalkerVisual(w);
          }
        }
      },
      undefined,
      () => {
        // Keep procedural fallback figure if a model file is missing
      }
    );
  });

  return {
    group,
    update(playerZ, dt) {
      const nowSec = performance.now() * 0.001;

      for (const w of walkers) {
        w.z += w.dir * w.walkSpeed * dt;

        // Recycle pedestrians smoothly behind or ahead of the player
        if (w.z > playerZ + 32) {
          w.z = playerZ - 115 - ((w.phase * 13) % 45);
        } else if (w.z < playerZ - 155) {
          w.z = playerZ + 24;
        }

        const stride = Math.sin(nowSec * 5.4 + w.phase);
        const bob = Math.abs(Math.sin(nowSec * 5.4 + w.phase)) * 0.035;

        w.root.position.set(w.laneX, footpathY + bob, w.z);
        w.figureHolder.rotation.y = w.dir < 0 ? Math.PI : 0;
        w.figureHolder.rotation.z = stride * 0.035;
      }
    },
  };
}