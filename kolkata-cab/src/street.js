import * as THREE from 'three';

const shopNames = [
  ['Chai', '\u099a\u09be\u09df'],
  ['Mishti', '\u09ae\u09bf\u09b7\u09cd\u099f\u09bf'],
  ['Book Stall', '\u09ac\u0987\u09df\u09c7\u09b0 \u09a6\u09cb\u0995\u09be\u09a8'],
  ['Pharmacy', '\u0994\u09b7\u09a7'],
  ['Tailors', '\u09a6\u09b0\u09cd\u099c\u09bf'],
  ['Park Street Cafe', '\u0995\u09b2\u0995\u09be\u09a4\u09be'],
];
const facadeTextures = [];
const signTextures = [];
const _dummy = new THREE.Object3D();
const _unitBox = new THREE.BoxGeometry(1, 1, 1);
const _facadeGeometry = new THREE.BoxGeometry(1, 1, 1);
const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
let streetGlowTexture;

function getStreetGlowTexture() {
  if (streetGlowTexture) return streetGlowTexture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,231,174,.62)'); gradient.addColorStop(.25, 'rgba(255,211,137,.25)'); gradient.addColorStop(1, 'rgba(255,211,137,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  streetGlowTexture = new THREE.CanvasTexture(canvas); streetGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return streetGlowTexture;
}

function addGlowBatch(parent, items, color = 0xffe6b0, opacity = 0.3) {
  if (!items.length) return;
  const material = new THREE.MeshBasicMaterial({ map: getStreetGlowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, items.length);
  mesh.frustumCulled = false;
  items.forEach((item, index) => {
    _dummy.position.set(item.x, item.y, item.z);
    _dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _dummy.scale.set(item.sx ?? 1, item.sy ?? 1, 1);
    _dummy.updateMatrix(); mesh.setMatrixAt(index, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
}

function randomFor(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; };
}

function makeFacadeAtlas(variant) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  const random = randomFor(8171 + variant * 571);
  const paint = ['#c6a66f', '#9db5a1', '#d4a2a0', '#d8cfb6', '#9da3a4', '#b8785d'][variant];
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, 384, 768);
  // Stains and peeling paint, painted into the surface atlas.
  for (let i = 0; i < 62; i++) {
    const x = random() * 384;
    const y = random() * 768;
    const w = 4 + random() * 34;
    const h = 3 + random() * 24;
    ctx.fillStyle = i % 3 ? 'rgba(83,67,53,.11)' : 'rgba(240,225,194,.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ground floor shopfront: doorway, goods shelves, rolled shutter and a hand-painted bilingual sign.
  ctx.fillStyle = '#473b33';
  ctx.fillRect(16, 566, 352, 188);
  ctx.fillStyle = '#273437';
  ctx.fillRect(26, 630, 98, 122);
  ctx.fillStyle = '#a9844f';
  ctx.fillRect(27, 628, 97, 10);
  ctx.fillStyle = '#6d6256';
  ctx.fillRect(132, 594, 116, 160);
  ctx.fillStyle = '#bbb19d';
  for (let y = 606; y < 750; y += 13) ctx.fillRect(136, y, 108, 4);
  ctx.fillStyle = '#584536';
  for (let row = 0; row < 3; row++) {
    ctx.fillRect(258, 612 + row * 34, 94, 7);
    for (let col = 0; col < 5; col++) {
      ctx.fillStyle = ['#dfb75a', '#a4513f', '#77906a', '#c5d0c5'][col % 4];
      ctx.fillRect(263 + col * 17, 595 + row * 34, 12, 16);
    }
  }
  ctx.fillStyle = '#294b43';
  ctx.fillRect(23, 520, 338, 48);
  ctx.strokeStyle = '#e5c16d';
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 521, 336, 46);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f1dcaa';
  ctx.font = 'bold 24px Manrope, sans-serif';
  ctx.fillText(shopNames[variant][0], 192, 544);
  ctx.fillStyle = '#243438';
  ctx.fillRect(18, 492, 348, 8);
  // Upper-floor window grid with green/brown shutters drawn into the atlas.
  const rows = 2 + (variant % 3);
  const cols = variant % 2 ? 2 : 3;
  const cellW = 384 / (cols + 1);
  const upperHeight = 488;
  const rowHeight = upperHeight / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const w = Math.min(70, cellW * 0.58);
      const h = Math.min(100, rowHeight * 0.53);
      const x = cellW * (col + 0.65) - w / 2;
      const y = rowHeight * (row + 0.45) + 13;
      ctx.fillStyle = '#392f2a';
      ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
      ctx.fillStyle = '#273c40';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = variant % 2 ? '#506b4c' : '#75583a';
      ctx.fillRect(x + 3, y + 4, w * 0.33, h - 8);
      ctx.fillRect(x + w * 0.62, y + 4, w * 0.32, h - 8);
      ctx.fillStyle = 'rgba(203,218,205,.26)';
      ctx.fillRect(x + w * 0.47, y + 3, 3, h - 6);
      ctx.fillStyle = '#b8a589';
      ctx.fillRect(x - 8, y + h, w + 16, 7);
    }
  }
  // Cornice, downpipe, AC boxes and dark grime at the foot of the wall.
  ctx.fillStyle = '#736557';
  ctx.fillRect(0, 0, 384, 17);
  ctx.fillStyle = '#e0c994';
  ctx.fillRect(0, 20, 384, 10);
  ctx.fillStyle = '#4d4840';
  ctx.fillRect(8, 25, 9, 740);
  ctx.fillStyle = '#77746b';
  ctx.fillRect(294, 336, 55, 30);
  ctx.fillStyle = '#393d3c';
  for (let x = 300; x < 346; x += 9) ctx.fillRect(x, 340, 3, 22);
  const gradient = ctx.createLinearGradient(0, 640, 0, 768);
  gradient.addColorStop(0, 'rgba(38,35,31,0)');
  gradient.addColorStop(1, 'rgba(35,31,27,.42)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 640, 384, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  facadeTextures[variant] = texture;
  return texture;
}

function getFacadeMaterials() {
  if (facadeTextures.length === 0) {
    for (let i = 0; i < 6; i++) makeFacadeAtlas(i);
  }
  return facadeTextures.map((map) => {
    const facade = new THREE.MeshLambertMaterial({ map, color: 0xffffff, flatShading: true, fog: true });
    const sideWall = new THREE.MeshLambertMaterial({ color: 0x827d70, flatShading: true, fog: true });
    return [facade, facade, sideWall, sideWall, sideWall, sideWall];
  });
}

function makeSignTexture(index) {
  if (signTextures[index]) return signTextures[index];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const colors = ['#31564b', '#8b4134', '#284860', '#896b35', '#604653', '#31505a'];
  ctx.fillStyle = colors[index];
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#e4c476';
  ctx.lineWidth = 9;
  ctx.strokeRect(7, 7, 498, 146);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3e5c2';
  ctx.font = 'bold 52px Manrope, Noto Sans Bengali, sans-serif';
  ctx.fillText(shopNames[index][0], 256, 57);
  ctx.font = 'bold 32px Manrope, Noto Sans Bengali, sans-serif';
  ctx.fillText(shopNames[index][1], 256, 112);
  signTextures[index] = new THREE.CanvasTexture(canvas);
  signTextures[index].colorSpace = THREE.SRGBColorSpace;
  return signTextures[index];
}

function addInstanced(parent, geometry, material, items, receiveShadow = true) {
  if (items.length === 0) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.castShadow = true;
  mesh.receiveShadow = receiveShadow;
  items.forEach((item, i) => {
    _dummy.position.set(item.x, item.y, item.z);
    _dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    if (item.color) mesh.setColorAt(i, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function seededRng(chunkIndex, side) {
  return randomFor(9929 + chunkIndex * 1709 + (side + 1) * 113);
}

function makeBayRuns(rng) {
  const runs = [];
  const alleyHalf = 1.25;
  for (const range of [[-40, -alleyHalf], [alleyHalf, 40]]) {
    let z = range[0];
    while (z < range[1]) {
      const remaining = range[1] - z;
      let width = 5 + Math.floor(rng() * 6);
      if (remaining <= 10) width = remaining;
      else if (remaining - width < 5) width = remaining - 5;
      runs.push({ center: z + width / 2, width });
      z += width;
    }
  }
  return runs;
}

function addFacadeRows(group, chunkIndex, config) {
  const materials = getFacadeMaterials();
  const facades = Array.from({ length: 6 }, () => []);
  const awnings = [];
  const cornices = [];
  const drains = [];
  const acUnits = [];
  const balconyBases = [];
  const balconyRails = [];
  const laundry = [];
  const tanks = [];
  const junctionBoxes = [];
  const signGroups = Array.from({ length: 6 }, () => []);
  const signGlows = [];

  for (const side of [-1, 1]) {
    const rng = seededRng(chunkIndex, side);
    const runs = makeBayRuns(rng);
    for (let i = 0; i < runs.length; i++) {
      const bay = runs[i];
      const variant = Math.floor(rng() * 6);
      const floors = 3 + Math.floor(rng() * 4);
      const height = floors * 3;
      const depth = 7 + rng() * 5;
      const front = config.roadHalfWidth + config.footpathWidth + 0.6;
      const center = side * (front + depth / 2);
      const z = bay.center;
      facades[variant].push({ x: center, y: height / 2, z, sx: depth, sy: height, sz: bay.width });

      const color = [0xc6a66f, 0x9db5a1, 0xd4a2a0, 0xd8cfb6, 0x9da3a4, 0xb8785d][variant];
      awnings.push({ x: side * (front - 0.72), y: 3.63, z, sx: 1.42, sy: 0.12, sz: bay.width * 0.9, rz: side * -0.12, color });
      cornices.push({ x: center, y: height + 0.14, z, sx: depth + 0.25, sy: 0.22, sz: bay.width + 0.22, color: 0xb7a583 });
      if (rng() < 0.7) drains.push({ x: side * (front - 0.08), y: height / 2, z: z + bay.width * 0.42, sy: height, color: 0x514e45 });
      if (rng() < 0.42) acUnits.push({ x: side * (front - 0.1), y: 5.5 + rng() * Math.max(0, height - 7), z: z + (rng() - 0.5) * bay.width * 0.4, color: 0x797a70 });
      if (rng() < 0.34) {
        balconyBases.push({ x: side * (front - 0.24), y: 4.7 + rng() * Math.max(0, height - 5), z, sx: 0.75, sy: 0.14, sz: bay.width * 0.7 });
        balconyRails.push({ x: side * (front - 0.62), y: balconyBases[balconyBases.length - 1].y + 0.4, z, sx: 0.12, sy: 0.72, sz: bay.width * 0.7, color: 0x343936 });
      }
      if (rng() < 0.3) laundry.push({ x: side * (front - 0.5), y: 6.0 + rng() * Math.max(0, height - 7), z: z + (rng() - 0.5) * bay.width * 0.4, sx: 0.04, sy: 0.72, sz: 1.0, color: [0xe4d5ae, 0x7e9aa2, 0xb45243][Math.floor(rng() * 3)] });
      if (i === 0 && rng() < 0.8) {
        tanks.push({ x: center, y: height + 1.5, z, sx: 1.5, sy: 1.3, sz: 1.7, color: 0x4c5351 });
        junctionBoxes.push({ x: side * (front - 0.1), y: 4.2, z: z + 1.3, color: 0x574e42 });
      }
      // One or two signs per chunk physically project over the sidewalk and are texture-batched by variant.
      if ((i === 1 || (i === 4 && chunkIndex % 2 === 0)) && side === 1) {
        signGroups[variant].push({ x: side * (front - 1.12), y: 3.08, z, sx: bay.width * 0.7, sy: 0.74, sz: 1, ry: -Math.PI / 2 });
        signGlows.push({ x: side * (front - 1.105), y: 3.08, z, sx: bay.width * 0.82, sy: 0.96, ry: -Math.PI / 2 });
      }

      // The second, taller block row sits eight metres behind the first row's outer wall.
      const backDepth = 9 + rng() * 6;
      const backHeight = (6 + Math.floor(rng() * 5)) * 3;
      const backFront = front + depth + 8;
      const backCenter = side * (backFront + backDepth / 2);
      const backVariant = Math.floor(rng() * 6);
      facades[backVariant].push({ x: backCenter, y: backHeight / 2, z, sx: backDepth, sy: backHeight, sz: bay.width });
    }
  }

  for (let variant = 0; variant < 6; variant++) {
    addInstanced(group, _facadeGeometry, materials[variant], facades[variant]);
    if (signGroups[variant].length) {
      const signTexture = makeSignTexture(variant);
      const signMat = new THREE.MeshStandardMaterial({ map: signTexture, emissive: 0xffffff, emissiveMap: signTexture, emissiveIntensity: 0.75, roughness: 0.45, side: THREE.DoubleSide });
      addInstanced(group, new THREE.PlaneGeometry(1, 1), signMat, signGroups[variant], false);
    }
  }
  addGlowBatch(group, signGlows, 0xffdb9a, 0.12);

  const awningCanvas = document.createElement('canvas');
  awningCanvas.width = 128;
  awningCanvas.height = 64;
  const awningCtx = awningCanvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    awningCtx.fillStyle = i % 2 ? '#eee0bb' : '#bd4e3c';
    awningCtx.fillRect(i * 16, 0, 16, 64);
  }
  const awningTexture = new THREE.CanvasTexture(awningCanvas);
  awningTexture.colorSpace = THREE.SRGBColorSpace;
  const awningMat = new THREE.MeshLambertMaterial({ map: awningTexture, vertexColors: true, flatShading: true });
  addInstanced(group, new THREE.BoxGeometry(1, 1, 1), awningMat, awnings);

  addInstanced(group, _unitBox, mat(0xb7a583), cornices);
  addInstanced(group, new THREE.CylinderGeometry(0.045, 0.06, 1, 6), mat(0x514e45), drains);
  addInstanced(group, new THREE.BoxGeometry(0.8, 0.48, 0.55), mat(0xffffff), acUnits);
  addInstanced(group, _unitBox, mat(0x8c795c), balconyBases);
  addInstanced(group, _unitBox, mat(0x343936), balconyRails);
  addInstanced(group, _unitBox, mat(0xffffff), laundry);
  addInstanced(group, new THREE.CylinderGeometry(0.75, 0.75, 1, 8), mat(0xffffff), tanks);
  addInstanced(group, new THREE.BoxGeometry(0.45, 0.65, 0.32), mat(0xffffff), junctionBoxes);
}

function densitySettings(detailLevel, densityConfig) {
  return densityConfig[detailLevel] || densityConfig.medium;
}

function addTreesPolesAndWires(group, chunkIndex, config, density) {
  const trunks = [];
  const crowns = [];
  const poles = [];
  const lampHeads = [];
  const lampGlows = [];
  const crossArms = [];
  const wireJoints = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < density.trees; i++) {
      const z = -35 + i * (70 / Math.max(1, density.trees - 1));
      const x = side * (12.4 + (i % 2) * 0.3);
      trunks.push({ x, y: 1.9, z, sy: 1.9 });
      crowns.push({ x, y: 4.25, z, sx: 1.55, sy: 1.4, sz: 1.65, color: [0x45644b, 0x56724f, 0x3d5e49][(chunkIndex + i) % 3] });
    }
    for (let i = 0; i < density.poles; i++) {
      const z = -30 + i * (60 / Math.max(1, density.poles - 1));
      const x = side * 12.2;
      poles.push({ x, y: 4.15, z, sy: 8.3 });
      lampHeads.push({ x: x - side * 0.45, y: 6.95, z, rz: side * 0.15 });
      lampGlows.push({ x: x - side * 0.45, y: 6.95, z, sx: 1.05, sy: 1.05 });
      crossArms.push({ x: 0, y: 8.3, z });
      wireJoints.push({ x: side * 12.1, y: 8.28, z, color: 0x343c3b });
    }
  }
  addInstanced(group, new THREE.CylinderGeometry(0.14, 0.23, 1, 6), mat(0x584534), trunks);
  addInstanced(group, new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), crowns);
  addInstanced(group, new THREE.CylinderGeometry(0.07, 0.11, 1, 7), mat(0x3e4543), poles);
  addInstanced(group, new THREE.BoxGeometry(0.7, 0.09, 0.09), mat(0xe5bc68, { emissive: 0xffc86b, emissiveIntensity: 0.85 }), lampHeads);
  addGlowBatch(group, lampGlows, 0xffd992, 0.32);
  addInstanced(group, new THREE.BoxGeometry(24.4, 0.1, 0.12), mat(0x464b47), crossArms);
  addInstanced(group, new THREE.BoxGeometry(0.25, 0.24, 0.25), mat(0xffffff), wireJoints);

  const wireMat = new THREE.LineBasicMaterial({ color: 0x333c3b, transparent: true, opacity: 0.8 });
  for (const x of [-5, 0, 5]) {
    const points = [new THREE.Vector3(x - 1.0, 8.25, -40), new THREE.Vector3(x, 7.8, 0), new THREE.Vector3(x + 1.0, 8.25, 40)];
    const curve = new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(18)), wireMat));
  }
}

function addFootpathClutter(group, chunkIndex, detailLevel, config, density) {
  const counter = [];
  const awning = [];
  const kettle = [];
  const stool = [];
  const umbrellaPole = [];
  const umbrella = [];
  const carts = [];
  const cartWheels = [];
  const bookshelves = [];
  const bookSpines = [];
  const fruitCrates = [];
  const fruit = [];
  const newspaper = [];
  const bikesWheels = [];
  const bikesFrames = [];
  const scooters = [];
  const bins = [];
  const sacks = [];
  const barriers = [];
  const rng = randomFor(1207 + chunkIndex * 7919);
  const slots = Math.floor(config.chunkLength / density.clutterStep);
  for (const side of [-1, 1]) {
    for (let i = 0; i < slots; i++) {
      const z = -config.chunkLength / 2 + density.clutterStep * (i + 0.5) + (rng() - 0.5) * 1.6;
      const x = side * (10.65 + rng() * 1.0);
      const type = Math.floor(rng() * 10);
      if (type === 0 || type === 1) {
        counter.push({ x, y: 0.52, z, sx: 1.7, sy: 1.0, sz: 1.15, color: type ? 0x79563b : 0x8a6445 });
        awning.push({ x, y: 2.08, z, sx: 1.95, sy: 0.16, sz: 1.55, rz: side * -0.08, color: [0x2f6d83, 0xb64b3d, 0xa08b47][Math.floor(rng() * 3)] });
        kettle.push({ x: x - side * 0.24, y: 1.15, z, color: 0x92968d });
        stool.push({ x: x + side * 0.55, y: 0.25, z: z + 0.55, color: 0x66533d });
      } else if (type === 2) {
        umbrellaPole.push({ x, y: 1.18, z });
        umbrella.push({ x, y: 2.2, z, color: [0x3484a0, 0xc94d3e, 0xe0ad45, 0x45875e][Math.floor(rng() * 4)] });
        fruitCrates.push({ x: x + side * 0.45, y: 0.35, z, color: 0x81573b });
        for (let f = 0; f < 5; f++) fruit.push({ x: x + side * (0.15 + rng() * 0.65), y: 0.7 + rng() * 0.35, z: z + (rng() - 0.5), color: [0xc9462e, 0xd49e37, 0x68914f][f % 3] });
      } else if (type === 3) {
        carts.push({ x, y: 0.58, z, color: 0x815a3c });
        cartWheels.push({ x: x - 0.7, y: 0.28, z, rx: 0, ry: 0, rz: Math.PI / 2 }, { x: x + 0.7, y: 0.28, z, rz: Math.PI / 2 });
      } else if (type === 4) {
        bookshelves.push({ x, y: 0.8, z, color: 0x725238 });
        for (let b = 0; b < 8; b++) bookSpines.push({ x: x + (rng() - 0.5) * 1.35, y: 0.55 + (b % 4) * 0.34, z: z + (rng() - 0.5) * 0.55, color: [0xb44736, 0x305d75, 0xd1a84f, 0x56805e][b % 4] });
      } else if (type === 5) {
        newspaper.push({ x, y: 0.65, z, color: 0x9b8e73 });
      } else if (type === 6 || type === 7) {
        for (const wheelX of [-0.42, 0.42]) bikesWheels.push({ x: x + wheelX, y: 0.45, z, ry: Math.PI / 2, color: 0x292e2d });
        bikesFrames.push({ x, y: 0.72, z, color: 0x39484a });
      } else if (type === 8) {
        scooters.push({ x, y: 0.55, z, color: 0x47606a });
        bikesWheels.push({ x: x - 0.55, y: 0.31, z, ry: Math.PI / 2, color: 0x252a2b }, { x: x + 0.55, y: 0.31, z, ry: Math.PI / 2, color: 0x252a2b });
      } else {
        if (rng() < 0.5) bins.push({ x, y: 0.52, z, color: 0x444b48 });
        else sacks.push({ x, y: 0.36, z, sx: 0.6, sy: 0.65, sz: 0.55, color: 0x9b8d68 });
      }
      if (i % 4 === 2) barriers.push({ x: side * 10.95, y: 0.48, z: z + 1.6, rz: 0, color: 0x4f5550 });
    }
  }
  addInstanced(group, _unitBox, mat(0xffffff), counter);
  const awningMap = makeAwningTexture();
  addInstanced(group, _unitBox, new THREE.MeshLambertMaterial({ map: awningMap, vertexColors: true, flatShading: true }), awning);
  addInstanced(group, new THREE.CylinderGeometry(0.2, 0.25, 0.32, 10), mat(0x96958d), kettle);
  addInstanced(group, new THREE.CylinderGeometry(0.23, 0.23, 0.45, 8), mat(0x574638), stool);
  addInstanced(group, new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), mat(0x594f40), umbrellaPole);
  addInstanced(group, new THREE.ConeGeometry(1.15, 0.46, 8), mat(0xffffff), umbrella.map((v) => ({ ...v, sy: 0.58 })));
  addInstanced(group, _unitBox, mat(0xffffff), fruitCrates);
  addInstanced(group, new THREE.IcosahedronGeometry(0.18, 0), mat(0xffffff), fruit);
  addInstanced(group, _unitBox, mat(0xffffff), carts.map((v) => ({ ...v, sx: 1.75, sy: 0.18, sz: 1.3 })));
  addInstanced(group, new THREE.CylinderGeometry(0.25, 0.25, 0.12, 8), mat(0x292c2b), cartWheels);
  addInstanced(group, _unitBox, mat(0xffffff), bookshelves.map((v) => ({ ...v, sx: 1.7, sy: 1.55, sz: 0.7 })));
  addInstanced(group, _unitBox, mat(0xffffff), bookSpines.map((v) => ({ ...v, sx: 0.12, sy: 0.29, sz: 0.12 })));
  addInstanced(group, _unitBox, mat(0xffffff), newspaper.map((v) => ({ ...v, sx: 0.8, sy: 1.2, sz: 0.25 })));
  addInstanced(group, new THREE.TorusGeometry(0.34, 0.045, 5, 10), mat(0x333b3d), bikesWheels);
  addInstanced(group, new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5), mat(0xffffff), bikesFrames.map((v) => ({ ...v, rz: 0.65 })));
  addInstanced(group, _unitBox, mat(0xffffff), scooters.map((v) => ({ ...v, sx: 0.55, sy: 0.55, sz: 1.3 })));
  addInstanced(group, new THREE.CylinderGeometry(0.35, 0.38, 1.0, 8), mat(0xffffff), bins);
  addInstanced(group, new THREE.IcosahedronGeometry(0.45, 1), mat(0xffffff), sacks);
  addInstanced(group, new THREE.BoxGeometry(0.12, 0.9, 1), mat(0xffffff), barriers.map((v) => ({ ...v, sx: 1.9, sz: 1.0 })));
}

function makeAwningTexture() {
  if (makeAwningTexture.texture) return makeAwningTexture.texture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#efe0bd' : '#bd4e3c';
    ctx.fillRect(i * 16, 0, 16, 64);
  }
  makeAwningTexture.texture = new THREE.CanvasTexture(canvas);
  makeAwningTexture.texture.colorSpace = THREE.SRGBColorSpace;
  return makeAwningTexture.texture;
}

function addPeople(group, chunkIndex, density) {
  const count = density.people;
  const rng = randomFor(8221 + chunkIndex * 433);
  const bodyMaterial = mat(0xffffff);
  const headMaterial = mat(0xffffff);
  const legsMaterial = mat(0x343b3d);
  const bodies = [];
  const heads = [];
  const legs = [];
  const umbrellas = [];
  const records = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -37 + rng() * 74;
    const x = side * (10.1 + rng() * 1.9);
    const walking = i % 3 !== 0;
    const color = [0x456c7c, 0x934d43, 0x68784a, 0xb08b52, 0x6c536f][i % 5];
    const record = { x, z, walking, phase: rng() * Math.PI * 2, color };
    records.push(record);
    bodies.push({ x, y: 1.0, z, sx: 0.48, sy: 0.84, sz: 0.34, color });
    heads.push({ x, y: 1.59, z, sx: 0.24, sy: 0.25, sz: 0.24, color: [0x9b7358, 0x6f503e, 0xb38665][i % 3] });
    for (const legSide of [-1, 1]) legs.push({ x: x + legSide * 0.13, y: 0.38, z, sx: 0.12, sy: 0.7, sz: 0.15, color: 0x353a3a });
    if (i % 5 === 1) umbrellas.push({ x, y: 2.25, z, color: [0x307d9a, 0xbf4e42, 0xd3a245][i % 3] });
  }
  const bodyMesh = addInstanced(group, new THREE.BoxGeometry(1, 1, 1), bodyMaterial, bodies);
  const headMesh = addInstanced(group, new THREE.SphereGeometry(1, 8, 6), headMaterial, heads);
  const legMesh = addInstanced(group, new THREE.CylinderGeometry(0.14, 0.12, 1, 6), legsMaterial, legs);
  addInstanced(group, new THREE.CylinderGeometry(0.035, 0.04, 1.0, 6), mat(0x514b42), umbrellas);
  addInstanced(group, new THREE.ConeGeometry(0.8, 0.34, 8), mat(0xffffff), umbrellas.map((p) => ({ ...p, sy: 0.48 })));
  return (time) => {
    if (!bodyMesh || !headMesh || !legMesh) return;
    const temp = new THREE.Object3D();
    records.forEach((p, i) => {
      const bob = p.walking ? Math.sin(time * 5.2 + p.phase) * 0.045 : 0;
      temp.position.set(p.x, 1.0 + bob, p.z);
      temp.scale.set(0.48, 0.84, 0.34);
      temp.updateMatrix();
      bodyMesh.setMatrixAt(i, temp.matrix);
      temp.position.set(p.x, 1.59 + bob, p.z);
      temp.scale.set(0.24, 0.25, 0.24);
      temp.updateMatrix();
      headMesh.setMatrixAt(i, temp.matrix);
      for (let leg = 0; leg < 2; leg++) {
        const swing = p.walking ? Math.sin(time * 5.2 + p.phase + leg * Math.PI) * 0.08 : 0;
        temp.position.set(p.x + (leg ? 0.13 : -0.13), 0.38, p.z + swing);
        temp.scale.set(0.12, 0.7, 0.15);
        temp.updateMatrix();
        legMesh.setMatrixAt(i * 2 + leg, temp.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    legMesh.instanceMatrix.needsUpdate = true;
  };
}

function addStalls(group, chunkIndex, detailLevel, config, density) {
  const count = Math.max(2, Math.floor(config.chunkLength / (density.clutterStep * 2)));
  const counters = [];
  const tinRoofs = [];
  const kettles = [];
  const stools = [];
  const awnings = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      const z = -config.chunkLength / 2 + (i + 0.5) * (config.chunkLength / count) + (side < 0 ? 1.5 : -1.5);
      const x = side * 11.35;
      const type = (chunkIndex + i + (side > 0 ? 1 : 0)) % 4;
      counters.push({ x, y: 0.54, z, sx: 1.8, sy: 1.0, sz: 1.45, color: type === 2 ? 0x6f4d35 : 0x78563b });
      tinRoofs.push({ x, y: 2.06, z, sx: 2.1, sy: 0.13, sz: 1.65, color: [0x48646a, 0x6b716c, 0x987b4f][type % 3] });
      kettles.push({ x: x - side * 0.35, y: 1.15, z, color: 0xaeb0a7 });
      stools.push({ x: x + side * 0.55, y: 0.27, z: z + 0.55, color: 0x584632 });
      if (type === 0 || type === 1) awnings.push({ x: side * 11.55, y: 2.45, z, sx: 0.95, sy: 0.11, sz: 1.8, rz: side * -0.08, color: type ? 0xbd4e3c : 0x347d98 });
    }
  }
  addInstanced(group, _unitBox, mat(0xffffff), counters);
  addInstanced(group, _unitBox, mat(0xffffff), tinRoofs);
  addInstanced(group, new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10), mat(0x9b9b90), kettles);
  addInstanced(group, new THREE.CylinderGeometry(0.22, 0.24, 0.4, 8), mat(0x584632), stools);
  addInstanced(group, _unitBox, new THREE.MeshLambertMaterial({ map: makeAwningTexture(), vertexColors: true }), awnings);
}

function addWires(group) {
  const wireMat = new THREE.LineBasicMaterial({ color: 0x333a3c, transparent: true, opacity: 0.68 });
  for (const x of [-4.8, 0, 4.8]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 1.2, 8.4, -40),
      new THREE.Vector3(x, 7.9, 0),
      new THREE.Vector3(x + 1.2, 8.4, 40),
    ]);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(18)), wireMat));
  }
}

export function dressChunk(group, chunkIndex, detailLevel, config) {
  addFacadeRows(group, chunkIndex, config);
  const density = densitySettings(detailLevel, config.density);
  addTreesPolesAndWires(group, chunkIndex, config, density);
  addFootpathClutter(group, chunkIndex, detailLevel, config, density);
  addStalls(group, chunkIndex, detailLevel, config, density);
  const updatePeople = addPeople(group, chunkIndex, density);
  addWires(group);
  return updatePeople;
}

function createFlyover() {
  const group = new THREE.Group();
  const concrete = mat(0x777974);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(32, 1.15, 12), concrete);
  deck.position.y = 6.0;
  group.add(deck);
  for (const x of [-15, -11, 11, 15]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 5.8, 8), concrete);
    pillar.position.set(x, 2.8, 0);
    group.add(pillar);
  }
  return group;
}

function createHowrahSilhouette() {
  const group = new THREE.Group();
  const steel = mat(0x53646a, { transparent: true, opacity: 0.84 });
  const addBar = (a, b, radius = 0.12) => {
    const direction = new THREE.Vector3().subVectors(b, a);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 5), steel);
    bar.position.copy(a).add(b).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(bar);
  };
  const left = -42;
  const right = 42;
  const bottom = 3;
  const top = 22;
  for (const x of [left, right]) {
    addBar(new THREE.Vector3(x, bottom, 0), new THREE.Vector3(x, top, 0), 0.34);
    addBar(new THREE.Vector3(x - 4, top, 0), new THREE.Vector3(x + 4, top, 0), 0.32);
  }
  addBar(new THREE.Vector3(left, bottom, 0), new THREE.Vector3(right, bottom, 0), 0.35);
  addBar(new THREE.Vector3(left, 14, 0), new THREE.Vector3(right, 14, 0), 0.22);
  for (let x = left; x < right; x += 8) {
    const x2 = x + 8;
    addBar(new THREE.Vector3(x, bottom, 0), new THREE.Vector3(x2, 14, 0), 0.11);
    addBar(new THREE.Vector3(x, 14, 0), new THREE.Vector3(x2, bottom, 0), 0.11);
  }
  return group;
}

export function createLandmarks(scene) {
  const flyover = createFlyover();
  const bridge = createHowrahSilhouette();
  for (const landmark of [flyover, bridge]) {
    landmark.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }
  scene.add(flyover, bridge);
  return {
    update(playerZ, cameraX) {
      flyover.position.set(cameraX * 0.35, 0, playerZ - 116);
      bridge.position.set(cameraX * 0.22, -1, playerZ - 200);
    },
  };
}

