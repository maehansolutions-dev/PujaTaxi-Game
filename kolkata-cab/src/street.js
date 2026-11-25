import * as THREE from 'three';

const shopNames = [
  ['FLURYS TEAROOM', '\u09ab\u09cd\u09b2\u09c1\u09b0\u09bf\u09b8 \u099f\u09bf\u09b0\u09c1\u09ae'],
  ['PETER CAT', '\u09aa\u09c0\u099f\u09be\u09b0 \u0995\u09cd\u09af\u09be\u099f'],
  ['MOCAMBO', '\u09ae\u09cb\u0995\u09be\u09ae\u09cd\u09ac\u09cb'],
  ['CHAI & MISHTI', '\u099a\u09be \u0993 \u09ae\u09bf\u09b7\u09cd\u099f\u09bf'],
  ['BOI BITAN', '\u09ac\u0987 \u09ac\u09bf\u09a4\u09be\u09a8'],
  ['NORTH BARI CAFE', '\u0989\u09a4\u09cd\u09a4\u09b0 \u0995\u09b2\u0995\u09be\u09a4\u09be'],
];

const HERITAGE_PALETTE = [
  { hex: 0x9c563f, css: '#9c563f', trim: '#e2ccb0', shutter: '#1e3a30', signBg: '#5e2336', signAccent: '#ff9ec4' },
  { hex: 0xa87c3b, css: '#a87c3b', trim: '#e6d3ad', shutter: '#223d32', signBg: '#3b2414', signAccent: '#ffbe55' },
  { hex: 0x7c8f82, css: '#7c8f82', trim: '#d6dfd8', shutter: '#23362c', signBg: '#183842', signAccent: '#8ce0ff' },
  { hex: 0xb5aa94, css: '#b5aa94', trim: '#e6dcc8', shutter: '#422c1d', signBg: '#2a3d28', signAccent: '#ffd478' },
  { hex: 0x9e675b, css: '#9e675b', trim: '#e3cbc4', shutter: '#1f3630', signBg: '#4a2126', signAccent: '#ffa57d' },
  { hex: 0x856a46, css: '#856a46', trim: '#d8c5a2', shutter: '#1d2e29', signBg: '#2b243d', signAccent: '#ffc96b' },
];

const facadeTextures = [];
const signTextures = [];
const _dummy = new THREE.Object3D();
const _unitBox = new THREE.BoxGeometry(1, 1, 1);
const _facadeGeometry = new THREE.BoxGeometry(1, 1, 1);
const stdMat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.08, ...extra });
let streetGlowTexture;

// Helper: checks if local chunk Z is inside the cross-street opening (|z| > 33.5) or alleyway (|z| < 3.1)
function isRoadOpeningLocalZ(z) {
  return Math.abs(z) > 33.5 || Math.abs(z) < 3.1;
}

function getStreetGlowTexture() {
  if (streetGlowTexture) return streetGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,224,156,.75)');
  gradient.addColorStop(0.32, 'rgba(255,186,102,.32)');
  gradient.addColorStop(1, 'rgba(255,186,102,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  streetGlowTexture = new THREE.CanvasTexture(canvas);
  streetGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return streetGlowTexture;
}

function addGlowBatch(parent, items, color = 0xffe09c, opacity = 0.34) {
  if (!items.length) return;
  const material = new THREE.MeshBasicMaterial({
    map: getStreetGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, items.length);
  mesh.frustumCulled = false;
  items.forEach((item, index) => {
    _dummy.position.set(item.x, item.y, item.z);
    _dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _dummy.scale.set(item.sx ?? 1, item.sy ?? 1, 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(index, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
}

function randomFor(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function drawArchWindow(ctx, x, y, w, h, palette, lit, random) {
  const archR = Math.min(w * 0.5, 22);

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + h);
  ctx.lineTo(x - 8, y + archR);
  ctx.arc(x + w / 2, y + archR, w / 2 + 8, Math.PI, 0, false);
  ctx.lineTo(x + w + 8, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lit ? '#ffbe66' : '#182429';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + archR);
  ctx.arc(x + w / 2, y + archR, w / 2, Math.PI, 0, false);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  if (lit) {
    const warmGlow = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 4, x + w / 2, y + h * 0.55, w * 0.85);
    warmGlow.addColorStop(0, 'rgba(255,228,165,0.92)');
    warmGlow.addColorStop(1, 'rgba(235,142,52,0.35)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(x, y + archR * 0.4, w, h - archR * 0.4);
  }

  const shutterW = w * 0.28;
  ctx.fillStyle = palette.shutter;
  ctx.fillRect(x + 2, y + archR * 0.7, shutterW, h - archR * 0.7 - 2);
  ctx.fillRect(x + w - shutterW - 2, y + archR * 0.7, shutterW, h - archR * 0.7 - 2);

  ctx.fillStyle = 'rgba(8,12,11,0.48)';
  for (let sy = y + archR * 0.8 + 4; sy < y + h - 5; sy += 7) {
    ctx.fillRect(x + 4, sy, shutterW - 4, 3);
    ctx.fillRect(x + w - shutterW + 2, sy, shutterW - 4, 3);
  }

  const midX = x + shutterW + 2;
  const midW = Math.max(6, w - shutterW * 2 - 4);
  if (!lit && random() > 0.2) {
    ctx.fillStyle = 'rgba(185,212,222,0.14)';
    ctx.fillRect(midX + 3, y + archR, midW - 6, h - archR - 6);
  }
  ctx.fillStyle = palette.trim;
  for (let my = y + archR + 24; my < y + h - 8; my += 28) {
    ctx.fillRect(midX, my, midW, 3);
  }

  ctx.fillStyle = palette.trim;
  ctx.fillRect(x - 10, y + h, w + 20, 8);
  ctx.fillStyle = 'rgba(20,16,12,0.42)';
  ctx.fillRect(x - 8, y + h + 8, w + 16, 4);
}

function makeFacadeAtlas(variant) {
  const palette = HERITAGE_PALETTE[variant % HERITAGE_PALETTE.length];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const random = randomFor(9173 + variant * 613);

  ctx.fillStyle = palette.css;
  ctx.fillRect(0, 0, 512, 1024);

  for (let i = 0; i < 140; i++) {
    const x = random() * 512;
    const y = random() * 1024;
    const w = 8 + random() * 64;
    const h = 6 + random() * 42;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(30,24,20,0.18)'
        : i % 3 === 1
        ? 'rgba(250,238,212,0.16)'
        : 'rgba(42,56,48,0.13)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = palette.trim;
  ctx.fillRect(0, 0, 512, 24);
  ctx.fillStyle = 'rgba(24,18,14,0.36)';
  ctx.fillRect(0, 24, 512, 7);

  for (const bandY of [315, 535]) {
    ctx.fillStyle = palette.trim;
    ctx.fillRect(0, bandY, 512, 10);
    ctx.fillStyle = 'rgba(24,18,14,0.34)';
    ctx.fillRect(0, bandY + 10, 512, 5);
  }

  const rows = 3;
  const cols = 3;
  const marginX = 34;
  const colSpan = (512 - marginX * 2) / cols;
  const rowBands = [
    [44, 295],
    [334, 515],
    [556, 718],
  ];

  for (let r = 0; r < rows; r++) {
    const [topY, botY] = rowBands[r];
    const h = Math.min(142, botY - topY - 20);
    const y = topY + (botY - topY - h) / 2;
    for (let c = 0; c < cols; c++) {
      const w = Math.min(84, colSpan * 0.56);
      const x = marginX + c * colSpan + (colSpan - w) / 2;
      const lit = (r * 2 + c + variant) % 3 === 0;
      drawArchWindow(ctx, x, y, w, h, palette, lit, random);
    }
  }

  ctx.fillStyle = palette.trim;
  ctx.fillRect(0, 738, 512, 10);

  const cafeGrad = ctx.createLinearGradient(20, 776, 20, 1012);
  cafeGrad.addColorStop(0, '#ffd482');
  cafeGrad.addColorStop(1, '#b86828');
  ctx.fillStyle = '#241913';
  ctx.fillRect(18, 772, 156, 244);
  ctx.fillStyle = cafeGrad;
  ctx.fillRect(26, 782, 140, 155);
  ctx.fillStyle = '#5c3720';
  ctx.fillRect(26, 938, 140, 74);
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = ['#fff0c2', '#ff9db8', '#ffd166', '#98e2c6', '#ffb86c'][k];
    ctx.fillRect(36 + k * 25, 892, 16, 36);
  }

  ctx.fillStyle = '#241d18';
  ctx.fillRect(184, 772, 144, 244);
  ctx.fillStyle = '#4f4841';
  ctx.fillRect(192, 786, 128, 224);
  for (let sy = 796; sy < 1004; sy += 14) {
    ctx.fillStyle = '#8b8070';
    ctx.fillRect(196, sy, 120, 5);
  }

  ctx.fillStyle = '#211814';
  ctx.fillRect(338, 772, 156, 244);
  ctx.fillStyle = '#f5be67';
  ctx.fillRect(346, 782, 140, 165);
  for (let row = 0; row < 3; row++) {
    const sy = 824 + row * 44;
    ctx.fillStyle = '#5e3c24';
    ctx.fillRect(352, sy, 128, 6);
    for (let col = 0; col < 6; col++) {
      ctx.fillStyle = ['#b83b2b', '#27556e', '#d19838', '#3e6e4c', '#9e476a', '#c96a38'][col];
      ctx.fillRect(358 + col * 20, sy - 22, 14, 21);
    }
  }

  ctx.fillStyle = palette.signBg;
  ctx.fillRect(16, 744, 480, 26);
  ctx.strokeStyle = palette.signAccent;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 746, 476, 22);
  ctx.fillStyle = palette.signAccent;
  ctx.font = 'bold 14px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shopNames[variant][0], 256, 757);

  const grime = ctx.createLinearGradient(0, 890, 0, 1024);
  grime.addColorStop(0, 'rgba(18,16,14,0)');
  grime.addColorStop(1, 'rgba(14,12,10,0.62)');
  ctx.fillStyle = grime;
  ctx.fillRect(0, 890, 512, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  facadeTextures[variant] = texture;
  return texture;
}

function getFacadeMaterials() {
  if (facadeTextures.length === 0) {
    for (let i = 0; i < HERITAGE_PALETTE.length; i++) makeFacadeAtlas(i);
  }
  return facadeTextures.map((map, i) => {
    const facade = new THREE.MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.06,
      emissiveMap: map,
      emissive: 0xffcf87,
      emissiveIntensity: 0.22,
      fog: true,
    });
    const sideWall = stdMat(HERITAGE_PALETTE[i % HERITAGE_PALETTE.length].hex, { fog: true });
    return [facade, facade, sideWall, sideWall, sideWall, sideWall];
  });
}

function makeSignTexture(index) {
  if (signTextures[index]) return signTextures[index];
  const palette = HERITAGE_PALETTE[index % HERITAGE_PALETTE.length];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = palette.signBg;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = palette.signAccent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.signAccent;
  ctx.font = 'bold 44px Manrope, Noto Sans Bengali, sans-serif';
  ctx.fillText(shopNames[index % shopNames.length][0], 256, 54);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 30px Manrope, Noto Sans Bengali, sans-serif';
  ctx.fillText(shopNames[index % shopNames.length][1], 256, 112);
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

// Leaves a 13m cross-street gap at chunk ends (z = ±40) and a 6.2m alleyway gap at z = 0
function makeBayRuns(rng) {
  const runs = [];
  const alleyHalf = 3.1;
  const crossHalf = 6.5;
  for (const range of [[-40 + crossHalf, -alleyHalf], [alleyHalf, 40 - crossHalf]]) {
    let z = range[0];
    while (z < range[1]) {
      const remaining = range[1] - z;
      let width = 6 + Math.floor(rng() * 7);
      if (remaining <= 11) width = remaining;
      else if (remaining - width < 6) width = remaining - 6;
      runs.push({ center: z + width / 2, width });
      z += width;
    }
  }
  return runs;
}

function addFacadeRows(group, chunkIndex, config) {
  const materials = getFacadeMaterials();
  const facades = Array.from({ length: HERITAGE_PALETTE.length }, () => []);
  const cornices = [];
  const parapets = [];
  const pedimentCaps = [];
  const pilasters = [];
  const columns = [];
  const balconySlabs = [];
  const balconyRailings = [];
  const balconyBrackets = [];
  const verandaPillars = [];
  const drains = [];
  const acUnits = [];
  const laundry = [];
  const tanks = [];
  const mumties = [];
  const junctionBoxes = [];
  const signGroups = Array.from({ length: HERITAGE_PALETTE.length }, () => []);
  const signGlows = [];

  for (const side of [-1, 1]) {
    const rng = seededRng(chunkIndex, side);
    const runs = makeBayRuns(rng);
    for (let i = 0; i < runs.length; i++) {
      const bay = runs[i];
      const variant = Math.floor(rng() * HERITAGE_PALETTE.length);
      const palette = HERITAGE_PALETTE[variant];
      const floors = 3 + Math.floor(rng() * 3);
      const height = floors * 3.1;
      const depth = 7.5 + rng() * 5.5;
      const front = config.roadHalfWidth + config.footpathWidth + 0.65;
      const center = side * (front + depth / 2);
      const z = bay.center;

      facades[variant].push({ x: center, y: height / 2, z, sx: depth, sy: height, sz: bay.width });

      cornices.push({
        x: side * (front - 0.14),
        y: height + 0.12,
        z,
        sx: 0.42,
        sy: 0.24,
        sz: bay.width + 0.24,
      });
      parapets.push({
        x: side * (front + 0.05),
        y: height + 0.56,
        z,
        sx: 0.24,
        sy: 0.68,
        sz: bay.width * 0.96,
        color: palette.hex,
      });

      if ((i + chunkIndex) % 2 === 0) {
        pedimentCaps.push({
          x: side * (front - 0.12),
          y: height + 1.05,
          z,
          sx: 0.34,
          sy: 0.42,
          sz: bay.width * 0.46,
        });
      }

      for (const endSign of [-1, 1]) {
        pilasters.push({
          x: side * (front - 0.08),
          y: height / 2,
          z: z + endSign * (bay.width * 0.47),
          sx: 0.2,
          sy: height,
          sz: 0.34,
        });
      }

      if (rng() < 0.72) {
        const floorIndex = 1 + Math.floor(rng() * Math.max(1, floors - 1));
        const by = floorIndex * 3.1;
        const bw = bay.width * 0.84;
        const projDepth = 1.05;

        balconySlabs.push({
          x: side * (front - projDepth * 0.45),
          y: by,
          z,
          sx: projDepth,
          sy: 0.18,
          sz: bw,
        });
        balconyRailings.push({
          x: side * (front - projDepth + 0.04),
          y: by + 0.52,
          z,
          sx: 0.08,
          sy: 0.86,
          sz: bw,
          color: 0x1e2322,
        });

        const bracketCount = bw > 7.5 ? 3 : 2;
        for (let b = 0; b < bracketCount; b++) {
          const frac = bracketCount === 1 ? 0 : -0.38 + (b / (bracketCount - 1)) * 0.76;
          balconyBrackets.push({
            x: side * (front - projDepth * 0.48),
            y: by - 0.24,
            z: z + bw * frac,
            sx: 0.78,
            sy: 0.26,
            sz: 0.16,
            rz: side * 0.38,
          });
        }

        if (rng() < 0.55) {
          for (const cSign of [-1, 1]) {
            columns.push({
              x: side * (front - projDepth + 0.14),
              y: by - 1.5,
              z: z + cSign * (bw * 0.36),
              sy: 3.0,
            });
          }
        }
      }

      if (bay.width >= 7.5 && rng() < 0.65) {
        verandaPillars.push({
          x: side * (front - 0.55),
          y: 1.55,
          z: z + (rng() > 0.5 ? 1.8 : -1.8),
          sy: 3.1,
        });
      }

      if (rng() < 0.7) {
        drains.push({ x: side * (front - 0.08), y: height / 2, z: z + bay.width * 0.43, sy: height, color: 0x3f3c36 });
      }
      if (rng() < 0.35) {
        acUnits.push({ x: side * (front - 0.12), y: 6.2 + rng() * Math.max(0, height - 7.5), z: z + (rng() - 0.5) * bay.width * 0.3, color: 0x62655d });
      }
      if (rng() < 0.25) {
        laundry.push({
          x: side * (front - 0.78),
          y: 6.5 + rng() * Math.max(0, height - 7.5),
          z: z + (rng() - 0.5) * bay.width * 0.35,
          sx: 0.04,
          sy: 0.75,
          sz: 1.1,
          color: [0xd9c8a0, 0xa84336, 0x6d8991][Math.floor(rng() * 3)],
        });
      }

      if (i === 0 && rng() < 0.85) {
        tanks.push({ x: center, y: height + 1.5, z, sx: 1.5, sy: 1.3, sz: 1.7, color: 0x414746 });
        junctionBoxes.push({ x: side * (front - 0.1), y: 4.2, z: z + 1.3, color: 0x4b443a });
      }

      if (i % 3 === 1 && rng() < 0.45) {
        mumties.push({
          x: side * (front + depth * 0.45),
          y: height + 1.2,
          z,
          sx: 2.3,
          sy: 2.4,
          sz: Math.min(3.4, bay.width * 0.52),
        });
      }

      if (i === 1 || i === 3) {
        signGroups[variant].push({
          x: side * (front - 0.94),
          y: 2.95,
          z,
          sx: Math.min(4.4, bay.width * 0.58),
          sy: 0.72,
          sz: 1,
          ry: side === 1 ? -Math.PI / 2 : Math.PI / 2,
        });
        signGlows.push({
          x: side * (front - 0.92),
          y: 2.95,
          z,
          sx: Math.min(5.2, bay.width * 0.7),
          sy: 0.96,
          ry: side === 1 ? -Math.PI / 2 : Math.PI / 2,
        });
      }

      const backDepth = 9 + rng() * 6;
      const backHeight = (6 + Math.floor(rng() * 5)) * 3.1;
      const backFront = front + depth + 8;
      const backCenter = side * (backFront + backDepth / 2);
      const backVariant = Math.floor(rng() * HERITAGE_PALETTE.length);
      facades[backVariant].push({ x: backCenter, y: backHeight / 2, z, sx: backDepth, sy: backHeight, sz: bay.width });
    }
  }

  for (let variant = 0; variant < HERITAGE_PALETTE.length; variant++) {
    addInstanced(group, _facadeGeometry, materials[variant], facades[variant]);
    if (signGroups[variant].length) {
      const signTexture = makeSignTexture(variant);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTexture,
        emissive: 0xffffff,
        emissiveMap: signTexture,
        emissiveIntensity: 1.15,
        roughness: 0.35,
        side: THREE.DoubleSide,
      });
      addInstanced(group, new THREE.PlaneGeometry(1, 1), signMat, signGroups[variant], false);
    }
  }
  addGlowBatch(group, signGlows, 0xffc68c, 0.2);

  addInstanced(group, _unitBox, stdMat(0xd9c6a6), cornices);
  addInstanced(group, _unitBox, stdMat(0xffffff), parapets);
  addInstanced(group, _unitBox, stdMat(0xe3d1b2), pedimentCaps);
  addInstanced(group, _unitBox, stdMat(0xdfd0b4), pilasters);
  addInstanced(group, new THREE.CylinderGeometry(0.14, 0.17, 1, 8), stdMat(0xe5d7bc), columns);
  addInstanced(group, _unitBox, stdMat(0xc7b28e), balconySlabs);
  addInstanced(group, _unitBox, stdMat(0xffffff), balconyRailings);
  addInstanced(group, _unitBox, stdMat(0xd6c19e), balconyBrackets);
  addInstanced(group, new THREE.CylinderGeometry(0.16, 0.19, 1, 8), stdMat(0xd8c5a4), verandaPillars);
  addInstanced(group, new THREE.CylinderGeometry(0.045, 0.06, 1, 6), stdMat(0xffffff), drains);
  addInstanced(group, new THREE.BoxGeometry(0.8, 0.48, 0.55), stdMat(0xffffff), acUnits);
  addInstanced(group, _unitBox, stdMat(0xffffff), laundry);
  addInstanced(group, new THREE.CylinderGeometry(0.75, 0.75, 1, 8), stdMat(0xffffff), tanks);
  addInstanced(group, _unitBox, stdMat(0xd6c2a0), mumties);
  addInstanced(group, new THREE.BoxGeometry(0.45, 0.65, 0.32), stdMat(0xffffff), junctionBoxes);
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
      const z = -28 + i * (56 / Math.max(1, density.trees - 1));
      if (isRoadOpeningLocalZ(z)) continue;
      const x = side * (12.4 + (i % 2) * 0.3);
      trunks.push({ x, y: 1.9, z, sy: 1.9 });
      crowns.push({
        x,
        y: 4.25,
        z,
        sx: 1.55,
        sy: 1.4,
        sz: 1.65,
        color: [0x36523c, 0x435e3e, 0x2f4b39][(chunkIndex + i) % 3],
      });
    }
    for (let i = 0; i < density.poles; i++) {
      const z = -26 + i * (52 / Math.max(1, density.poles - 1));
      if (isRoadOpeningLocalZ(z)) continue;
      const x = side * 12.2;
      poles.push({ x, y: 4.15, z, sy: 8.3 });
      lampHeads.push({ x: x - side * 0.45, y: 6.95, z, rz: side * 0.15 });
      lampGlows.push({ x: x - side * 0.45, y: 6.95, z, sx: 1.35, sy: 1.35 });
      crossArms.push({ x: 0, y: 8.3, z });
      wireJoints.push({ x: side * 12.1, y: 8.28, z, color: 0x2a3130 });
    }
  }
  addInstanced(group, new THREE.CylinderGeometry(0.14, 0.23, 1, 6), stdMat(0x473729), trunks);
  addInstanced(group, new THREE.IcosahedronGeometry(1, 1), stdMat(0xffffff), crowns);
  addInstanced(group, new THREE.CylinderGeometry(0.07, 0.11, 1, 7), stdMat(0x323837), poles);
  addInstanced(
    group,
    new THREE.BoxGeometry(0.7, 0.09, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xffd27d, emissive: 0xffbe55, emissiveIntensity: 1.35 }),
    lampHeads
  );
  addGlowBatch(group, lampGlows, 0xffd284, 0.42);
  addInstanced(group, new THREE.BoxGeometry(24.4, 0.1, 0.12), stdMat(0x393e3b), crossArms);
  addInstanced(group, new THREE.BoxGeometry(0.25, 0.24, 0.25), stdMat(0xffffff), wireJoints);

  const wireMat = new THREE.LineBasicMaterial({ color: 0x2c3332, transparent: true, opacity: 0.78 });
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
      if (isRoadOpeningLocalZ(z)) continue;
      const x = side * (10.65 + rng() * 1.0);
      const type = Math.floor(rng() * 10);
      if (type === 0 || type === 1) {
        counter.push({ x, y: 0.52, z, sx: 1.7, sy: 1.0, sz: 1.15, color: type ? 0x6b4b33 : 0x7a573b });
        awning.push({ x, y: 2.08, z, sx: 1.95, sy: 0.16, sz: 1.55, rz: side * -0.08, color: [0x275b6e, 0x9c3e32, 0x8a763b][Math.floor(rng() * 3)] });
        kettle.push({ x: x - side * 0.24, y: 1.15, z, color: 0x878b82 });
        stool.push({ x: x + side * 0.55, y: 0.25, z: z + 0.55, color: 0x574633 });
      } else if (type === 2) {
        umbrellaPole.push({ x, y: 1.18, z });
        umbrella.push({ x, y: 2.2, z, color: [0x2b6e87, 0xa83e32, 0xc29238, 0x38704d][Math.floor(rng() * 4)] });
        fruitCrates.push({ x: x + side * 0.45, y: 0.35, z, color: 0x704b32 });
        for (let f = 0; f < 5; f++) fruit.push({ x: x + side * (0.15 + rng() * 0.65), y: 0.7 + rng() * 0.35, z: z + (rng() - 0.5), color: [0xb33b26, 0xbd892c, 0x577a41][f % 3] });
      } else if (type === 3) {
        carts.push({ x, y: 0.58, z, color: 0x704e34 });
        cartWheels.push({ x: x - 0.7, y: 0.28, z, rx: 0, ry: 0, rz: Math.PI / 2 }, { x: x + 0.7, y: 0.28, z, rz: Math.PI / 2 });
      } else if (type === 4) {
        bookshelves.push({ x, y: 0.8, z, color: 0x634630 });
        for (let b = 0; b < 8; b++) bookSpines.push({ x: x + (rng() - 0.5) * 1.35, y: 0.55 + (b % 4) * 0.34, z: z + (rng() - 0.5) * 0.55, color: [0x9c3b2c, 0x264d61, 0xb89040, 0x476b4d][b % 4] });
      } else if (type === 5) {
        newspaper.push({ x, y: 0.65, z, color: 0x877b64 });
      } else if (type === 6 || type === 7) {
        for (const wheelX of [-0.42, 0.42]) bikesWheels.push({ x: x + wheelX, y: 0.45, z, ry: Math.PI / 2, color: 0x222726 });
        bikesFrames.push({ x, y: 0.72, z, color: 0x2f3c3e });
      } else if (type === 8) {
        scooters.push({ x, y: 0.55, z, color: 0x3a4f57 });
        bikesWheels.push({ x: x - 0.55, y: 0.31, z, ry: Math.PI / 2, color: 0x1e2223 }, { x: x + 0.55, y: 0.31, z, ry: Math.PI / 2, color: 0x1e2223 });
      } else {
        if (rng() < 0.5) bins.push({ x, y: 0.52, z, color: 0x373d3b });
        else sacks.push({ x, y: 0.36, z, sx: 0.6, sy: 0.65, sz: 0.55, color: 0x857858 });
      }
      if (i % 4 === 2 && !isRoadOpeningLocalZ(z + 1.6)) {
        barriers.push({ x: side * 10.95, y: 0.48, z: z + 1.6, rz: 0, color: 0x404642 });
      }
    }
  }
  addInstanced(group, _unitBox, stdMat(0xffffff), counter);
  const awningMap = makeAwningTexture();
  addInstanced(group, _unitBox, new THREE.MeshStandardMaterial({ map: awningMap, roughness: 0.75 }), awning);
  addInstanced(group, new THREE.CylinderGeometry(0.2, 0.25, 0.32, 10), stdMat(0x87867e), kettle);
  addInstanced(group, new THREE.CylinderGeometry(0.23, 0.23, 0.45, 8), stdMat(0x493a2e), stool);
  addInstanced(group, new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), stdMat(0x4a4236), umbrellaPole);
  addInstanced(group, new THREE.ConeGeometry(1.15, 0.46, 8), stdMat(0xffffff), umbrella.map((v) => ({ ...v, sy: 0.58 })));
  addInstanced(group, _unitBox, stdMat(0xffffff), fruitCrates);
  addInstanced(group, new THREE.IcosahedronGeometry(0.18, 0), stdMat(0xffffff), fruit);
  addInstanced(group, _unitBox, stdMat(0xffffff), carts.map((v) => ({ ...v, sx: 1.75, sy: 0.18, sz: 1.3 })));
  addInstanced(group, new THREE.CylinderGeometry(0.25, 0.25, 0.12, 8), stdMat(0x222524), cartWheels);
  addInstanced(group, _unitBox, stdMat(0xffffff), bookshelves.map((v) => ({ ...v, sx: 1.7, sy: 1.55, sz: 0.7 })));
  addInstanced(group, _unitBox, stdMat(0xffffff), bookSpines.map((v) => ({ ...v, sx: 0.12, sy: 0.29, sz: 0.12 })));
  addInstanced(group, _unitBox, stdMat(0xffffff), newspaper.map((v) => ({ ...v, sx: 0.8, sy: 1.2, sz: 0.25 })));
  addInstanced(group, new THREE.TorusGeometry(0.34, 0.045, 5, 10), stdMat(0x282f31), bikesWheels);
  addInstanced(group, new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5), stdMat(0xffffff), bikesFrames.map((v) => ({ ...v, rz: 0.65 })));
  addInstanced(group, _unitBox, stdMat(0xffffff), scooters.map((v) => ({ ...v, sx: 0.55, sy: 0.55, sz: 1.3 })));
  addInstanced(group, new THREE.CylinderGeometry(0.35, 0.38, 1.0, 8), stdMat(0xffffff), bins);
  addInstanced(group, new THREE.IcosahedronGeometry(0.45, 1), stdMat(0xffffff), sacks);
  addInstanced(group, new THREE.BoxGeometry(0.12, 0.9, 1), stdMat(0xffffff), barriers.map((v) => ({ ...v, sx: 1.9, sz: 1.0 })));
}

function makeAwningTexture() {
  if (makeAwningTexture.texture) return makeAwningTexture.texture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#d9c8a3' : '#9c3e30';
    ctx.fillRect(i * 16, 0, 16, 64);
  }
  makeAwningTexture.texture = new THREE.CanvasTexture(canvas);
  makeAwningTexture.texture.colorSpace = THREE.SRGBColorSpace;
  return makeAwningTexture.texture;
}

function addPeople(group, chunkIndex, density) {
  const count = density.people;
  const rng = randomFor(8221 + chunkIndex * 433);
  const bodyMaterial = stdMat(0xffffff);
  const headMaterial = stdMat(0xffffff);
  const legsMaterial = stdMat(0x292f31);
  const bodies = [];
  const heads = [];
  const legs = [];
  const umbrellas = [];
  const records = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -32 + rng() * 64;
    if (isRoadOpeningLocalZ(z)) continue;
    const x = side * (10.1 + rng() * 1.9);
    const walking = i % 3 !== 0;
    const color = [0x385a68, 0x7d3f36, 0x55633c, 0x917242, 0x58435b][i % 5];
    const record = { x, z, walking, phase: rng() * Math.PI * 2, color };
    records.push(record);
    bodies.push({ x, y: 1.0, z, sx: 0.48, sy: 0.84, sz: 0.34, color });
    heads.push({ x, y: 1.59, z, sx: 0.24, sy: 0.25, sz: 0.24, color: [0x87624a, 0x5e4233, 0x9c7254][i % 3] });
    for (const legSide of [-1, 1]) legs.push({ x: x + legSide * 0.13, y: 0.38, z, sx: 0.12, sy: 0.7, sz: 0.15, color: 0x292e2e });
    if (i % 5 === 1) umbrellas.push({ x, y: 2.25, z, color: [0x26667d, 0x9e3e34, 0xb08538][i % 3] });
  }
  const bodyMesh = addInstanced(group, new THREE.BoxGeometry(1, 1, 1), bodyMaterial, bodies);
  const headMesh = addInstanced(group, new THREE.SphereGeometry(1, 8, 6), headMaterial, heads);
  const legMesh = addInstanced(group, new THREE.CylinderGeometry(0.14, 0.12, 1, 6), legsMaterial, legs);
  addInstanced(group, new THREE.CylinderGeometry(0.035, 0.04, 1.0, 6), stdMat(0x423c35), umbrellas);
  addInstanced(group, new THREE.ConeGeometry(0.8, 0.34, 8), stdMat(0xffffff), umbrellas.map((p) => ({ ...p, sy: 0.48 })));
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
      if (isRoadOpeningLocalZ(z)) continue;
      const x = side * 11.35;
      const type = (chunkIndex + i + (side > 0 ? 1 : 0)) % 4;
      counters.push({ x, y: 0.54, z, sx: 1.8, sy: 1.0, sz: 1.45, color: type === 2 ? 0x5c3f2b : 0x664831 });
      tinRoofs.push({ x, y: 2.06, z, sx: 2.1, sy: 0.13, sz: 1.65, color: [0x3a5257, 0x575c58, 0x7d6540][type % 3] });
      kettles.push({ x: x - side * 0.35, y: 1.15, z, color: 0x8e9088 });
      stools.push({ x: x + side * 0.55, y: 0.27, z: z + 0.55, color: 0x473828 });
      if (type === 0 || type === 1) awnings.push({ x: side * 11.55, y: 2.45, z, sx: 0.95, sy: 0.11, sz: 1.8, rz: side * -0.08, color: type ? 0x9c3e30 : 0x29657a });
    }
  }
  addInstanced(group, _unitBox, stdMat(0xffffff), counters);
  addInstanced(group, _unitBox, stdMat(0xffffff), tinRoofs);
  addInstanced(group, new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10), stdMat(0x808077), kettles);
  addInstanced(group, new THREE.CylinderGeometry(0.22, 0.24, 0.4, 8), stdMat(0x473828), stools);
  addInstanced(group, _unitBox, new THREE.MeshStandardMaterial({ map: makeAwningTexture(), roughness: 0.75 }), awnings);
}

function addWires(group) {
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2a3031, transparent: true, opacity: 0.72 });
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
  const concrete = stdMat(0x5c5e5a, { roughness: 0.88 });
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
  const steel = stdMat(0x3f4e54, { transparent: true, opacity: 0.84, roughness: 0.65 });
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