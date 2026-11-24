import * as THREE from 'three';

function makeSwirlFabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5c1420';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(225,198,184,0.42)'
        : i % 3 === 1
        ? 'rgba(138,28,44,0.65)'
        : 'rgba(42,8,14,0.55)';
    ctx.lineWidth = 3 + (i % 4) * 2.2;
    ctx.beginPath();
    const y0 = (i / 42) * 256;
    for (let x = 0; x <= 256; x += 16) {
      const y = y0 + Math.sin(x * 0.045 + i * 0.7) * 18 + Math.cos(x * 0.02 - i * 0.4) * 10;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMeterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0e1312';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#575e59';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 118);

  ctx.fillStyle = '#c8a64b';
  ctx.font = '600 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CALCUTTA FARE METER', 128, 28);

  ctx.fillStyle = '#e5b84b';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('₹ 30.00', 128, 76);

  ctx.fillStyle = '#5ec48e';
  ctx.font = '600 13px monospace';
  ctx.fillText('FOR HIRE', 128, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGaugeClusterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0e1312';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#575e59';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 118);

  // Crisp thin dial arcs instead of thick bloom rings
  ctx.strokeStyle = '#e0b656';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(82, 66, 30, Math.PI * 0.85, Math.PI * 2.15);
  ctx.stroke();

  ctx.strokeStyle = '#5ec48e';
  ctx.beginPath();
  ctx.arc(176, 66, 24, Math.PI * 0.85, Math.PI * 2.15);
  ctx.stroke();

  ctx.fillStyle = '#d8be78';
  ctx.font = '600 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KM/H', 82, 106);
  ctx.fillStyle = '#8ad4ad';
  ctx.fillText('FUEL', 176, 102);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHandFanTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = '#b59250';
  ctx.beginPath();
  ctx.ellipse(112, 64, 96, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b3527';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(95,65,24,0.45)';
  ctx.lineWidth = 2;
  for (let i = -70; i <= 70; i += 14) {
    ctx.beginPath();
    ctx.moveTo(112 + i, 18);
    ctx.lineTo(112 + i * 0.7, 110);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawRealisticDroplet(ctx, x, y, r, warmTint = false) {
  ctx.save();
  ctx.translate(x, y);

  const rimGrad = ctx.createRadialGradient(0, r * 0.25, r * 0.2, 0, r * 0.15, r * 1.15);
  rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(0.65, 'rgba(6, 12, 20, 0.22)');
  rimGrad.addColorStop(0.92, 'rgba(6, 12, 20, 0.36)');
  rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = warmTint ? 'rgba(255, 224, 170, 0.32)' : 'rgba(205, 232, 250, 0.28)';
  ctx.lineWidth = Math.max(0.7, r * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r * 1.02, 0, 0, Math.PI * 2);
  ctx.stroke();

  const caustic = ctx.createRadialGradient(0, r * 0.52, 0, 0, r * 0.52, r * 0.55);
  caustic.addColorStop(0, warmTint ? 'rgba(255, 205, 130, 0.55)' : 'rgba(195, 228, 250, 0.42)');
  caustic.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = caustic;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.48, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 252, 245, 0.82)';
  ctx.beginPath();
  ctx.arc(-r * 0.26, -r * 0.38, Math.max(0.65, r * 0.22), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function makeWetGlassTexture(seed = 41, isWindshield = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 512);

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, 'rgba(145, 185, 212, 0.22)');
  grad.addColorStop(0.14, 'rgba(120, 160, 190, 0.05)');
  grad.addColorStop(0.86, 'rgba(120, 160, 190, 0.05)');
  grad.addColorStop(1.0, 'rgba(145, 185, 212, 0.20)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const glare = ctx.createLinearGradient(0, 0, 1024, 512);
  glare.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  glare.addColorStop(0.24, 'rgba(215, 238, 255, 0.08)');
  glare.addColorStop(0.29, 'rgba(255, 255, 255, 0)');
  glare.addColorStop(0.64, 'rgba(255, 222, 170, 0.06)');
  glare.addColorStop(0.69, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, 1024, 512);

  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const inWiperZone = (x, y) => {
    if (!isWindshield) return false;
    const d1 = Math.hypot(x - 340, y - 525);
    const d2 = Math.hypot(x - 690, y - 525);
    return (d1 > 90 && d1 < 375 && y > 135) || (d2 > 90 && d2 < 375 && y > 135);
  };

  const dropCount = isWindshield ? 220 : 180;
  for (let i = 0; i < dropCount; i++) {
    const x = rand() * 1024;
    const y = rand() * 512;
    const cleared = inWiperZone(x, y);
    if (cleared && rand() < 0.86) continue;
    const r = cleared ? 1.4 + rand() * 1.8 : 2.2 + rand() * 4.4;
    drawRealisticDroplet(ctx, x, y, r, rand() < 0.35);
  }

  const trailCount = isWindshield ? 16 : 26;
  for (let i = 0; i < trailCount; i++) {
    const x = rand() * 1024;
    const y = rand() * 340;
    if (inWiperZone(x, y) && rand() < 0.85) continue;
    const len = 35 + rand() * 115;
    const slant = isWindshield ? (rand() - 0.5) * 14 : -18 - rand() * 28;

    const trailGrad = ctx.createLinearGradient(x, y, x + slant, y + len);
    trailGrad.addColorStop(0, 'rgba(200, 230, 250, 0)');
    trailGrad.addColorStop(0.5, 'rgba(210, 235, 252, 0.16)');
    trailGrad.addColorStop(1, 'rgba(235, 246, 255, 0.34)');
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 1.2 + rand() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + slant * 0.4 + (rand() - 0.5) * 8, y + len * 0.5, x + slant, y + len);
    ctx.stroke();

    drawRealisticDroplet(ctx, x + slant, y + len, 2.6 + rand() * 2.4, rand() < 0.4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCabinInterior() {
  const root = new THREE.Group();
  root.visible = false;

  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xd9a20d, roughness: 0.38, metalness: 0.08 });
  const darkVinyl = new THREE.MeshStandardMaterial({ color: 0x16191b, roughness: 0.8, metalness: 0.05 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x191d20, roughness: 0.78, metalness: 0.06 });
  const headlinerMat = new THREE.MeshStandardMaterial({ color: 0x26231e, roughness: 0.94, side: THREE.DoubleSide });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd7dc, roughness: 0.18, metalness: 0.88 });
  const seatMat = new THREE.MeshStandardMaterial({ map: makeSwirlFabricTexture(), roughness: 0.85, metalness: 0.02 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x453e33, roughness: 0.9 });

  const windshieldTex = makeWetGlassTexture(41, true);
  const windshieldMat = new THREE.MeshPhysicalMaterial({
    map: windshieldTex,
    emissiveMap: windshieldTex,
    emissive: 0x9ec8e6,
    emissiveIntensity: 0.12,
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });

  const sideGlassTex = makeWetGlassTexture(97, false);
  const sideGlassMat = new THREE.MeshPhysicalMaterial({
    map: sideGlassTex,
    emissiveMap: sideGlassTex,
    emissive: 0x9ec8e6,
    emissiveIntensity: 0.12,
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.08,
    clearcoat: 0.95,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    envMapIntensity: 1.3,
    side: THREE.DoubleSide,
  });

  const add = (geo, mat, pos = [0, 0, 0], rot = null) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    root.add(m);
    return m;
  };

  // ---------- Roof Headliner & Floor ----------
  add(new THREE.BoxGeometry(1.72, 0.06, 2.35), headlinerMat, [0, 1.62, 0.02]);
  add(new THREE.BoxGeometry(1.70, 0.06, 2.35), darkVinyl, [0, 0.36, 0.02]);

  // ---------- Yellow A, B, and C Pillars + Window Sills + Glass ----------
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.08, 0.68, 0.09), yellowPaint, [side * 0.82, 1.32, -1.06], [0.22, 0, 0]);
    add(new THREE.BoxGeometry(0.08, 1.24, 0.10), yellowPaint, [side * 0.84, 1.00, 0.02]);
    add(new THREE.BoxGeometry(0.09, 0.75, 0.16), yellowPaint, [side * 0.82, 1.28, 0.98], [-0.28, 0, 0]);
    add(new THREE.BoxGeometry(0.07, 0.08, 2.15), yellowPaint, [side * 0.83, 1.58, -0.02]);
    add(new THREE.BoxGeometry(0.07, 0.62, 2.15), darkVinyl, [side * 0.84, 0.68, -0.02]);
    add(new THREE.BoxGeometry(0.09, 0.06, 2.15), yellowPaint, [side * 0.83, 1.00, -0.02]);
    add(new THREE.BoxGeometry(0.025, 0.56, 0.03), chromeMat, [side * 0.84, 1.29, 0.56]);
    add(new THREE.BoxGeometry(0.10, 0.07, 0.36), darkVinyl, [side * 0.78, 0.84, 0.42]);

    const frontSideGlass = add(
      new THREE.PlaneGeometry(1.02, 0.56),
      sideGlassMat,
      [side * 0.835, 1.29, -0.52],
      [0, side * (Math.PI / 2), 0]
    );
    frontSideGlass.renderOrder = 2;

    const rearSideGlass = add(
      new THREE.PlaneGeometry(0.92, 0.56),
      sideGlassMat,
      [side * 0.835, 1.29, 0.50],
      [0, side * (Math.PI / 2), 0]
    );
    rearSideGlass.renderOrder = 2;
  }

  // ---------- Front Windshield Glass + Rubber Seal ----------
  add(new THREE.BoxGeometry(1.64, 0.04, 0.04), darkVinyl, [0, 1.59, -1.00]);
  add(new THREE.BoxGeometry(1.64, 0.04, 0.04), darkVinyl, [0, 1.02, -1.12]);
  const frontWindshield = add(
    new THREE.PlaneGeometry(1.62, 0.62),
    windshieldMat,
    [0, 1.31, -1.06],
    [0.22, 0, 0]
  );
  frontWindshield.renderOrder = 3;

  // ---------- Yellow Left Side Mirror ----------
  add(new THREE.BoxGeometry(0.18, 0.03, 0.04), darkVinyl, [-0.94, 1.08, -0.95]);
  add(new THREE.BoxGeometry(0.22, 0.13, 0.09), yellowPaint, [-1.06, 1.11, -0.96], [0, 0.18, 0]);
  add(new THREE.PlaneGeometry(0.19, 0.10), chromeMat, [-1.06, 1.11, -0.91], [0, 0.18, 0]);

  // ---------- Front Dashboard, Bonnet, Meter, Gauges & Steering Wheel (RHD) ----------
  add(new THREE.BoxGeometry(1.56, 0.10, 1.05), yellowPaint, [0, 0.86, -1.78]);
  add(new THREE.BoxGeometry(1.66, 0.36, 0.34), dashMat, [0, 0.90, -1.04]);
  add(new THREE.BoxGeometry(0.54, 0.14, 0.03), darkVinyl, [-0.46, 0.84, -0.86]);
  add(new THREE.BoxGeometry(0.32, 0.08, 0.03), darkVinyl, [0.12, 0.96, -0.86]);
  add(new THREE.BoxGeometry(0.52, 0.20, 0.22), dashMat, [0.46, 1.08, -1.02]);

  const meterTex = makeMeterTexture();
  const meterMat = new THREE.MeshStandardMaterial({
    map: meterTex,
    emissive: 0xffb84d,
    emissiveMap: meterTex,
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });
  add(new THREE.BoxGeometry(0.28, 0.15, 0.14), darkVinyl, [0.10, 1.13, -1.00]);
  add(new THREE.PlaneGeometry(0.25, 0.12), meterMat, [0.10, 1.13, -0.928]);

  const gaugeTex = makeGaugeClusterTexture();
  const gaugeMat = new THREE.MeshStandardMaterial({
    map: gaugeTex,
    emissive: 0xffb84d,
    emissiveMap: gaugeTex,
    emissiveIntensity: 0.06,
    roughness: 0.45,
  });
  add(new THREE.PlaneGeometry(0.38, 0.15), gaugeMat, [0.46, 1.09, -0.908]);

  // Subtle localized backlight aimed low onto the instrument binnacle & meter (not the ceiling or charm)
  const dashGlowLight = new THREE.PointLight(0xffa938, 0, 1.4, 2.2);
  dashGlowLight.position.set(0.32, 1.04, -0.82);
  root.add(dashGlowLight);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(0.46, 1.02, -0.78);
  steeringWheel.rotation.x = -0.32;
  root.add(steeringWheel);
  steeringWheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.022, 10, 24), darkVinyl));
  steeringWheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.02), darkVinyl));
  const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.20, 0.02), darkVinyl);
  spoke2.position.y = -0.09;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), darkVinyl);
  hub.rotation.x = Math.PI / 2;
  steeringWheel.add(spoke2, hub);

  // ---------- Sun Visors, Tucked Hand Fan & Mirror Decoration ----------
  add(new THREE.BoxGeometry(0.54, 0.14, 0.025), visorMat, [-0.40, 1.52, -0.96], [0.35, 0, 0]);
  const fanMat = new THREE.MeshStandardMaterial({
    map: makeHandFanTexture(),
    transparent: true,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  add(new THREE.PlaneGeometry(0.44, 0.20), fanMat, [-0.36, 1.56, -0.94], [0.35, 0, -0.08]);
  add(new THREE.BoxGeometry(0.50, 0.14, 0.025), visorMat, [0.42, 1.52, -0.96], [0.35, 0, 0]);

  add(new THREE.BoxGeometry(0.26, 0.08, 0.03), darkVinyl, [0.06, 1.46, -0.96]);
  add(new THREE.PlaneGeometry(0.23, 0.06), chromeMat, [0.06, 1.46, -0.943]);

  // Hanging marigold decoration (matte cloth/petal material, never treated as a light)
  const garlandGroup = new THREE.Group();
  garlandGroup.position.set(0.06, 1.42, -0.95);
  root.add(garlandGroup);
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x2c4a27, roughness: 0.9 });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 6), cordMat);
  cord.position.y = -0.11;
  garlandGroup.add(cord);

  const petalMat = new THREE.MeshStandardMaterial({ color: 0xc86416, roughness: 0.92, metalness: 0.0 });
  for (let i = 0; i < 4; i++) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), petalMat);
    bead.position.set(0, -0.045 - i * 0.042, 0);
    bead.scale.set(1.1, 0.8, 1.1);
    garlandGroup.add(bead);
  }

  // ---------- Animated Windshield Wipers ----------
  const wipers = [-0.32, 0.24].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.04, -1.16);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.018, 0.018), darkVinyl);
    blade.position.x = 0.24;
    pivot.add(blade);
    root.add(pivot);
    return pivot;
  });

  // ---------- Front & Rear Seats (Maroon Swirled Kolkata Fabric) ----------
  add(new THREE.BoxGeometry(1.52, 0.18, 0.44), seatMat, [0, 0.56, -0.26]);
  add(new THREE.BoxGeometry(0.66, 0.58, 0.14), seatMat, [0.40, 0.88, -0.04], [-0.14, 0, 0]);
  add(new THREE.BoxGeometry(0.66, 0.52, 0.14), seatMat, [-0.40, 0.85, -0.04], [-0.14, 0, 0]);
  add(new THREE.BoxGeometry(1.56, 0.22, 0.52), seatMat, [0, 0.58, 0.68]);
  add(new THREE.BoxGeometry(1.56, 0.62, 0.16), seatMat, [0, 0.94, 0.96], [-0.16, 0, 0]);

  const cabinLight = new THREE.PointLight(0xffcf88, 0.35, 2.4, 2.0);
  cabinLight.position.set(0, 1.44, 0.25);
  root.add(cabinLight);

  return {
    group: root,
    setHeadlights(on) {
      gaugeMat.emissiveIntensity = on ? 0.52 : 0.05;
      meterMat.emissiveIntensity = on ? 0.48 : 0.14;
      dashGlowLight.intensity = on ? 0.45 : 0;
    },
    update(steer, timeMs) {
      steeringWheel.rotation.z = -steer * 1.4;
      const sweep = 0.28 + Math.sin(timeMs * 0.0022) * 0.42;
      wipers[0].rotation.z = sweep;
      wipers[1].rotation.z = sweep;
    },
  };
}