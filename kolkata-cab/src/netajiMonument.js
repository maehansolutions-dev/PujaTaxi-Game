import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { NETAJI_CROSSING_Z, roadAngle, roadCenterX } from './roadLayout.js';

const MODEL_URL = './models/netaji_scb.glb';
const MONUMENT_TARGET_HEIGHT = 6.0;

function normalizeMonument(srcScene) {
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

  const scale = MONUMENT_TARGET_HEIGHT / (size.y || 1);
  root.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaled.getCenter(center);

  // Center X/Z at crossing and sit built-in pedestal flush on y = 0
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const upgraded = mats.map((orig) => {
      if (!orig) return orig;
      const mat = orig.clone();
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.15;
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? upgraded : upgraded[0];
  });

  return wrapper;
}

export function createNetajiMonument(scene) {
  const group = new THREE.Group();
  const cx = roadCenterX(NETAJI_CROSSING_Z);
  const cz = NETAJI_CROSSING_Z;
  group.position.set(cx, 0, cz);
  group.rotation.y = roadAngle(cz);
  scene.add(group);

  // Minimal fallback while netaji_scb.glb loads (model already includes its own pedestal)
  const fallback = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 4.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.65 })
  );
  fallback.position.y = 2.25;
  group.add(fallback);

  const statueLight = new THREE.PointLight(0xffe7b8, 18, 30, 1.4);
  statueLight.position.set(0, 5.8, 2.8);
  group.add(statueLight);

  loadGLTF(MODEL_URL, { priority: 'high' })
    .then((gltf) => {
      group.remove(fallback);
      const monument = normalizeMonument(gltf.scene);
      group.add(monument);
    })
    .catch((err) => console.warn('[netajiMonument.js] Failed to load model:', err));

  return {
    group,
    setNightMode(isNight) {
      statueLight.intensity = isNight ? 20 : 0;
    },
  };
}
