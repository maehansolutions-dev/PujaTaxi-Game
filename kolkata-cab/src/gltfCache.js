import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
const loadQueue = [];
let loadingCount = 0;
const MAX_CONCURRENT_LOADS = 2;

function enhanceModelTextures(scene, anisotropy = 16) {
  const seen = new Set();
  const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];
  scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const key of texKeys) {
        const tex = mat[key];
        if (tex && !seen.has(tex)) {
          seen.add(tex);
          tex.anisotropy = Math.max(tex.anisotropy || 1, anisotropy);
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          tex.needsUpdate = true;
        }
      }
    }
  });
}

function loadNext() {
  if (loadingCount >= MAX_CONCURRENT_LOADS || loadQueue.length === 0) return;
  loadingCount++;
  const { url, resolve, reject } = loadQueue.shift();
  const finish = () => {
    loadingCount--;
    loadNext();
  };
  loader.load(
    url,
    (gltf) => {
      if (gltf?.scene) enhanceModelTextures(gltf.scene, 8);
      resolve(gltf);
      finish();
    },
    undefined,
    (error) => { reject(error); finish(); }
  );
}

// One network request and parse per URL, shared by every world subsystem.
export function loadGLTF(url, { priority = 'normal' } = {}) {
  if (!cache.has(url)) {
    const request = new Promise((resolve, reject) => {
      const entry = { url, resolve, reject };
      if (priority === 'high') loadQueue.unshift(entry);
      else loadQueue.push(entry);
      loadNext();
    }).catch((error) => {
      cache.delete(url);
      throw error;
    });
    cache.set(url, request);
  }
  return cache.get(url);
}
