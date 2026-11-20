import * as THREE from 'three';

export const CONFIG = {
  fareRsPerGameMetre: 50,
  worldUnitsPerGameMetre: 10,
  speedMaxKmh: 110,
  acceleration: 24,
  braking: 42,
  reverseMaxKmh: 22,
  drag: 5.5,
  steeringRate: 1.8,
  roadWidth: 18,
  chunkLength: 80,
  chunkCount: 11,
  roadAheadMargin: 80,
  fogNear: 60,
  fogFar: 260,
  cameraHeight: 6.2,
  cameraDistance: 11,
  cameraSmooth: 5.5,
};

export const HORIZON_COLOUR = 0xb7c6ca;

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function createChunk(index) {
  const group = new THREE.Group();
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x252d31, roughness: 0.29, metalness: 0.12, flatShading: true });
  const road = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.roadWidth, 0.18, CONFIG.chunkLength), asphalt);
  road.position.y = -0.12;
  road.receiveShadow = true;
  group.add(road);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, CONFIG.chunkLength), new THREE.MeshStandardMaterial({
    color: 0x58666b, roughness: 0.2, metalness: 0.18, transparent: true, opacity: 0.22, flatShading: true,
  }));
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.set(0, -0.024, 0);
  group.add(sheen);
  // Brick footpaths and black/yellow striped kerbs on both sides.
  for (const side of [-1, 1]) {
    const pavement = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.34, CONFIG.chunkLength), mat(0x81483d));
    pavement.position.set(side * 10.65, 0, 0);
    pavement.receiveShadow = true;
    group.add(pavement);
    for (let z = -CONFIG.chunkLength / 2 + 3; z < CONFIG.chunkLength / 2; z += 6) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 3), mat(Math.floor((z + 100) / 6) % 2 ? 0x242729 : 0xe3bb57));
      curb.position.set(side * 8.92, 0.055, z);
      group.add(curb);
    }
  }
  // Broken white lane dividers.
  for (const x of [-3, 3]) {
    for (let z = -CONFIG.chunkLength / 2 + 2; z < CONFIG.chunkLength / 2; z += 13) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 6), mat(0xd8d5c6));
      dash.position.set(x, 0, z);
      group.add(dash);
    }
  }
  // Tram rails on the left side of the carriageway.
  for (const x of [-7.2, -6.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, CONFIG.chunkLength), mat(0x777b72));
    rail.position.set(x, 0.01, 0);
    group.add(rail);
  }
  for (let z = -CONFIG.chunkLength / 2 + 1; z < CONFIG.chunkLength / 2; z += 2.4) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.14), mat(0x4d4940));
    sleeper.position.set(-6.85, 0.015, z);
    group.add(sleeper);
  }
  group.userData.index = index;
  return group;
}

function makeSky(scene) {
  const geometry = new THREE.SphereGeometry(900, 48, 32);
  const positions = geometry.attributes.position;
  const colors = [];
  const warmHaze = new THREE.Color(0xd6cfc1);
  const horizon = new THREE.Color(HORIZON_COLOUR);
  const zenith = new THREE.Color(0x8299a8);
  for (let i = 0; i < positions.count; i++) {
    const elevation = positions.getY(i) / 900;
    const color = elevation < 0
      ? warmHaze.clone().lerp(horizon, THREE.MathUtils.smoothstep(elevation, -0.12, 0))
      : horizon.clone().lerp(zenith, THREE.MathUtils.smoothstep(elevation, 0, 0.92));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffdfb0 }));
  sun.position.set(-72, 88, -180);
  scene.add(sun);
  return { sky, sun };
}

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#34393a';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 3917;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 720; i++) {
    const shade = Math.round(40 + random() * 24);
    ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 1},${0.12 + random() * 0.23})`;
    ctx.beginPath();
    ctx.ellipse(random() * 256, random() * 256, 2 + random() * 17, 1 + random() * 7, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWorld(scene) {
  scene.background = new THREE.Color(HORIZON_COLOUR);
  scene.fog = new THREE.Fog(HORIZON_COLOUR, CONFIG.fogNear, CONFIG.fogFar);
  const { sky, sun: warmSun } = makeSky(scene);
  scene.add(new THREE.HemisphereLight(0xe1eeee, 0x484342, 1.8));
  const sun = new THREE.DirectionalLight(0xffe3c1, 2.1);
  sun.position.set(-35, 65, -55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({
    color: 0x3a3b3b, map: makeGroundTexture(), flatShading: true,
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.43;
  ground.receiveShadow = true;
  scene.add(ground);
  const chunks = Array.from({ length: CONFIG.chunkCount }, (_, i) => {
    const chunk = createChunk(i);
    chunk.position.z = 40 - i * CONFIG.chunkLength;
    scene.add(chunk);
    return chunk;
  });
  return {
    update(playerZ, cameraPosition) {
      ground.position.x = cameraPosition.x;
      ground.position.z = playerZ;
      sky.position.copy(cameraPosition);
      warmSun.position.x = cameraPosition.x - 72;
      warmSun.position.z = playerZ - 180;
      const recycleBefore = playerZ + CONFIG.chunkLength / 2 + CONFIG.roadAheadMargin;
      for (const chunk of chunks) {
        if (chunk.position.z + CONFIG.chunkLength / 2 > recycleBefore) {
          const minZ = Math.min(...chunks.map((item) => item.position.z));
          chunk.position.z = minZ - CONFIG.chunkLength;
        }
      }
      // The 880-unit pool leaves several hundred units of road beyond the 260-unit fog edge.
    },
  };
}
