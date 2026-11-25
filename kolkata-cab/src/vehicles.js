// // // import * as THREE from 'three';

// // // const PLATE_YELLOW = 0xf2c200;

// // // function addMesh(parent, geometry, mat, position = [0, 0, 0], rotation = null) {
// // //   const object = new THREE.Mesh(geometry, mat);
// // //   object.position.set(...position);
// // //   if (rotation) object.rotation.set(...rotation);
// // //   object.castShadow = true;
// // //   object.receiveShadow = true;
// // //   parent.add(object);
// // //   return object;
// // // }

// // // function makeRoundedRectShape(w, h, r) {
// // //   const hw = w / 2;
// // //   const hh = h / 2;
// // //   const rad = Math.min(r, hw, hh);
// // //   const s = new THREE.Shape();
// // //   s.moveTo(-hw + rad, -hh);
// // //   s.lineTo(hw - rad, -hh);
// // //   s.quadraticCurveTo(hw, -hh, hw, -hh + rad);
// // //   s.lineTo(hw, hh - rad);
// // //   s.quadraticCurveTo(hw, hh, hw - rad, hh);
// // //   s.lineTo(-hw + rad, hh);
// // //   s.quadraticCurveTo(-hw, hh, -hw, hh - rad);
// // //   s.lineTo(-hw, -hh + rad);
// // //   s.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
// // //   return s;
// // // }

// // // function makeLabelTexture(
// // //   text,
// // //   {
// // //     background,
// // //     foreground = '#111315',
// // //     width = 512,
// // //     height = 128,
// // //     font = 'bold 76px monospace',
// // //   } = {}
// // // ) {
// // //   const canvas = document.createElement('canvas');
// // //   canvas.width = width;
// // //   canvas.height = height;
// // //   const ctx = canvas.getContext('2d');
// // //   ctx.fillStyle = background;
// // //   ctx.fillRect(0, 0, width, height);
// // //   ctx.textAlign = 'center';
// // //   ctx.textBaseline = 'middle';
// // //   ctx.fillStyle = foreground;
// // //   ctx.font = font;
// // //   ctx.fillText(text, width / 2, height / 2 + 1);
// // //   const texture = new THREE.CanvasTexture(canvas);
// // //   texture.colorSpace = THREE.SRGBColorSpace;
// // //   return texture;
// // // }

// // // function makeGlowTexture(color, centerAlpha = 0.8) {
// // //   const canvas = document.createElement('canvas');
// // //   canvas.width = canvas.height = 128;
// // //   const ctx = canvas.getContext('2d');
// // //   const [r, g, b] = color;
// // //   const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
// // //   gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
// // //   gradient.addColorStop(0.25, `rgba(${r},${g},${b},${centerAlpha * 0.55})`);
// // //   gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
// // //   ctx.fillStyle = gradient;
// // //   ctx.fillRect(0, 0, 128, 128);
// // //   const texture = new THREE.CanvasTexture(canvas);
// // //   texture.colorSpace = THREE.SRGBColorSpace;
// // //   return texture;
// // // }

// // // function curvedGlassPanel(width, height, curvature, segW, segH, mat, pos, rot) {
// // //   const geometry = new THREE.BufferGeometry();
// // //   const positions = [];
// // //   const normals = [];
// // //   const uvs = [];
// // //   const indices = [];

// // //   for (let iy = 0; iy <= segH; iy++) {
// // //     for (let ix = 0; ix <= segW; ix++) {
// // //       const u = ix / segW;
// // //       const v = iy / segH;
// // //       const x = (u - 0.5) * width;
// // //       const y = v * height;
// // //       const z = Math.sin(u * Math.PI) * curvature;
// // //       positions.push(x, y, z);
// // //       uvs.push(u, v);

// // //       const dzdu = Math.PI * curvature * Math.cos(u * Math.PI);
// // //       const nx = -dzdu;
// // //       const nz = 1.0;
// // //       const len = Math.hypot(nx, nz) || 1;
// // //       normals.push(nx / len, 0, nz / len);
// // //     }
// // //   }

// // //   for (let iy = 0; iy < segH; iy++) {
// // //     for (let ix = 0; ix < segW; ix++) {
// // //       const a = iy * (segW + 1) + ix;
// // //       const b = a + 1;
// // //       const c = a + segW + 1;
// // //       const d = c + 1;
// // //       indices.push(a, b, d, a, d, c);
// // //     }
// // //   }

// // //   geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
// // //   geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
// // //   geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
// // //   geometry.setIndex(indices);
// // //   geometry.computeVertexNormals();

// // //   const mesh = new THREE.Mesh(geometry, mat);
// // //   if (pos) mesh.position.set(...pos);
// // //   if (rot) mesh.rotation.set(...rot);
// // //   return mesh;
// // // }

// // // export function createTaxi() {
// // //   const taxi = new THREE.Group();
// // //   const body = new THREE.Group();
// // //   taxi.add(body);

// // //   // ---------- Rich Kolkata Taxi PBR Materials ----------
// // //   const paintYellow = new THREE.MeshPhysicalMaterial({
// // //     color: 0xeab308,
// // //     roughness: 0.25,
// // //     metalness: 0.05,
// // //     clearcoat: 0.85,
// // //     clearcoatRoughness: 0.16,
// // //     flatShading: false,
// // //     envMapIntensity: 1.05,
// // //   });
// // //   const paintDark = new THREE.MeshStandardMaterial({
// // //     color: 0x141618,
// // //     roughness: 0.42,
// // //     metalness: 0.08,
// // //     flatShading: false,
// // //   });
// // //   const chrome = new THREE.MeshStandardMaterial({
// // //     color: 0xe8ecee,
// // //     metalness: 1.0,
// // //     roughness: 0.08,
// // //     flatShading: false,
// // //   });
// // //   const bumperGrey = new THREE.MeshStandardMaterial({
// // //     color: 0x9aa2aa,
// // //     roughness: 0.48,
// // //     metalness: 0.32,
// // //   });
// // //   const blackRubber = new THREE.MeshStandardMaterial({
// // //     color: 0x111315,
// // //     roughness: 0.92,
// // //     metalness: 0.02,
// // //     flatShading: false,
// // //   });
// // //   const tyreMat = new THREE.MeshStandardMaterial({
// // //     color: 0x08090a,
// // //     roughness: 0.96,
// // //     metalness: 0.0,
// // //     flatShading: false,
// // //   });
// // //   const hubMat = new THREE.MeshStandardMaterial({
// // //     color: 0x878b90,
// // //     metalness: 0.88,
// // //     roughness: 0.24,
// // //     flatShading: false,
// // //   });
// // //   const glass = new THREE.MeshPhysicalMaterial({
// // //     color: 0x1b242a,
// // //     roughness: 0.05,
// // //     metalness: 0.05,
// // //     transmission: 0.35,
// // //     transparent: true,
// // //     opacity: 0.72,
// // //     thickness: 0.04,
// // //     envMapIntensity: 1.0,
// // //     flatShading: false,
// // //     side: THREE.DoubleSide,
// // //   });
// // //   const rearGlassMat = new THREE.MeshPhysicalMaterial({
// // //     color: 0x0c1116,
// // //     roughness: 0.06,
// // //     metalness: 0.15,
// // //     clearcoat: 1.0,
// // //     clearcoatRoughness: 0.05,
// // //     envMapIntensity: 1.35,
// // //   });
// // //   const tailRed = new THREE.MeshStandardMaterial({
// // //     color: 0xc81e1e,
// // //     emissive: 0x6b0e0a,
// // //     emissiveIntensity: 0.65,
// // //     roughness: 0.14,
// // //     metalness: 0.0,
// // //     flatShading: false,
// // //   });
// // //   const indicatorMat = new THREE.MeshStandardMaterial({
// // //     color: 0xff9d22,
// // //     emissive: 0xff6b08,
// // //     emissiveIntensity: 0.3,
// // //     roughness: 0.18,
// // //     metalness: 0.0,
// // //     flatShading: false,
// // //   });

// // //   taxi.userData.brakeLights = [];
// // //   taxi.userData.brakeGlows = [];
// // //   taxi.userData.wheels = [];

// // //   // ---------- Stepped Ambassador Mark IV Silhouette (-Z = front, +Z = rear) ----------
// // //   const profile = new THREE.Shape();
// // //   profile.moveTo(-2.14, 0.36);
// // //   profile.lineTo(-2.14, 0.76);
// // //   profile.quadraticCurveTo(-2.06, 0.85, -1.90, 0.86);
// // //   profile.lineTo(-1.34, 0.88);
// // //   profile.lineTo(-0.78, 1.38);
// // //   profile.quadraticCurveTo(-0.56, 1.52, -0.28, 1.54);
// // //   profile.lineTo(0.46, 1.54);
// // //   profile.quadraticCurveTo(0.76, 1.52, 1.04, 1.34);
// // //   profile.lineTo(1.48, 1.04);
// // //   profile.quadraticCurveTo(1.86, 0.98, 2.08, 0.84);
// // //   profile.quadraticCurveTo(2.16, 0.72, 2.14, 0.36);
// // //   profile.closePath();

// // //   const bodyDepth = 1.66;
// // //   const bodyGeo = new THREE.ExtrudeGeometry(profile, {
// // //     depth: bodyDepth,
// // //     bevelEnabled: true,
// // //     bevelSegments: 8,
// // //     steps: 1,
// // //     bevelSize: 0.085,
// // //     bevelThickness: 0.085,
// // //     curveSegments: 36,
// // //   });
// // //   bodyGeo.translate(0, 0, -bodyDepth / 2);
// // //   bodyGeo.rotateY(-Math.PI / 2);

// // //   const bodyShell = addMesh(body, bodyGeo, paintYellow);
// // //   bodyShell.position.set(0, 0, 0);

// // //   // Lower black two-tone skirt
// // //   addMesh(body, new THREE.BoxGeometry(1.82, 0.42, 4.28), paintDark, [0, 0.24, 0]);

// // //   // Rear boot lid crease & chrome trim bar
// // //   addMesh(body, new THREE.BoxGeometry(1.48, 0.015, 0.03), paintDark, [0, 0.86, 1.98]);
// // //   addMesh(body, new THREE.BoxGeometry(1.54, 0.032, 0.035), chrome, [0, 0.93, 2.14]);

// // //   // Side door creases & black window trim frames
// // //   for (const side of [-1, 1]) {
// // //     addMesh(body, new THREE.BoxGeometry(0.014, 0.36, 1.36), paintDark, [side * 0.918, 0.84, 0.12]);
// // //     addMesh(body, new THREE.BoxGeometry(0.02, 0.38, 0.80), blackRubber, [side * 0.92, 1.32, -0.34]);
// // //     addMesh(body, new THREE.BoxGeometry(0.02, 0.38, 0.80), blackRubber, [side * 0.92, 1.32, 0.48]);
// // //   }

// // //   // ---------- Wheels & Flares (grounded at y = 0, radius = 0.45) ----------
// // //   const wheelRadius = 0.45;
// // //   const wheelPositions = [
// // //     { name: 'FL', x: -0.92, z: -1.24, steer: true },
// // //     { name: 'FR', x: 0.92, z: -1.24, steer: true },
// // //     { name: 'RL', x: -0.92, z: 1.24, steer: false },
// // //     { name: 'RR', x: 0.92, z: 1.24, steer: false },
// // //   ];

// // //   for (const wp of wheelPositions) {
// // //     addMesh(
// // //       body,
// // //       new THREE.CylinderGeometry(0.54, 0.54, 0.42, 24, 1, false, 0, Math.PI),
// // //       paintDark,
// // //       [wp.x * 0.97, wheelRadius, wp.z],
// // //       [0, Math.PI / 2, 0]
// // //     );

// // //     const steerPivot = new THREE.Group();
// // //     steerPivot.position.set(wp.x, wheelRadius, wp.z);
// // //     body.add(steerPivot);

// // //     const spinGroup = new THREE.Group();
// // //     steerPivot.add(spinGroup);

// // //     addMesh(
// // //       spinGroup,
// // //       new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.34, 28),
// // //       tyreMat,
// // //       [0, 0, 0],
// // //       [0, 0, Math.PI / 2]
// // //     );
// // //     addMesh(
// // //       spinGroup,
// // //       new THREE.CylinderGeometry(0.27, 0.27, 0.355, 22),
// // //       hubMat,
// // //       [0, 0, 0],
// // //       [0, 0, Math.PI / 2]
// // //     );
// // //     addMesh(
// // //       spinGroup,
// // //       new THREE.CylinderGeometry(0.11, 0.11, 0.37, 16),
// // //       chrome,
// // //       [0, 0, 0],
// // //       [0, 0, Math.PI / 2]
// // //     );

// // //     taxi.userData.wheels.push({
// // //       name: wp.name,
// // //       steer: wp.steer,
// // //       pivot: steerPivot,
// // //       spin: spinGroup,
// // //     });
// // //   }

// // //   // Chrome waist beltline
// // //   for (const side of [-1, 1]) {
// // //     const beltPoints = [];
// // //     for (let i = 0; i <= 24; i++) {
// // //       const t = i / 24;
// // //       const z = -1.96 + t * 3.92;
// // //       const y = 1.06 + Math.sin(t * Math.PI) * 0.03;
// // //       beltPoints.push(new THREE.Vector3(side * 0.926, y, z));
// // //     }
// // //     addMesh(
// // //       body,
// // //       new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPoints), 28, 0.013, 6, false),
// // //       chrome
// // //     );
// // //   }

// // //   // ---------- Interior ----------
// // //   const interior = new THREE.Group();
// // //   body.add(interior);
// // //   const dashMat = new THREE.MeshStandardMaterial({ color: 0x1a2022, roughness: 0.8, metalness: 0.05 });
// // //   const seatMat = new THREE.MeshStandardMaterial({ color: 0x2c1c14, roughness: 0.88, metalness: 0.02 });

// // //   addMesh(interior, new THREE.BoxGeometry(1.46, 0.26, 0.22), dashMat, [0, 1.02, -0.78]);

// // //   const steering = new THREE.Group();
// // //   steering.position.set(0.42, 1.02, -0.62);
// // //   addMesh(steering, new THREE.TorusGeometry(0.17, 0.02, 10, 24), blackRubber, [0, 0, 0], [Math.PI / 2.4, 0, 0]);
// // //   addMesh(steering, new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), blackRubber, [0, -0.02, 0.08], [Math.PI / 2.4, 0, 0]);
// // //   interior.add(steering);
// // //   taxi.userData.steeringWheel = steering;

// // //   for (const side of [-0.36, 0.36]) {
// // //     addMesh(interior, new THREE.BoxGeometry(0.46, 0.20, 0.44), seatMat, [side, 0.56, -0.22]);
// // //     addMesh(interior, new THREE.BoxGeometry(0.46, 0.46, 0.14), seatMat, [side, 0.84, 0.02]);
// // //   }
// // //   addMesh(interior, new THREE.BoxGeometry(1.36, 0.22, 0.46), seatMat, [0, 0.58, 0.52]);
// // //   addMesh(interior, new THREE.BoxGeometry(1.36, 0.48, 0.15), seatMat, [0, 0.88, 0.78]);

// // //   // ---------- Windows ----------
// // //   const windscreen = curvedGlassPanel(1.34, 0.44, 0.10, 18, 8, glass, [0, 1.24, -0.92], [0.22, Math.PI, 0]);
// // //   body.add(windscreen);

// // //   // Classic Ambassador rounded-rectangle rear window with thick black rubber seal
// // //   const rearWindowGroup = new THREE.Group();
// // //   rearWindowGroup.position.set(0, 1.265, 1.318);
// // //   rearWindowGroup.rotation.x = -Math.atan2(0.44, 0.30);
// // //   body.add(rearWindowGroup);

// // //   const sealGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(1.42, 0.46, 0.10), {
// // //     depth: 0.02,
// // //     bevelEnabled: true,
// // //     bevelSize: 0.01,
// // //     bevelThickness: 0.01,
// // //     bevelSegments: 3,
// // //   });
// // //   addMesh(rearWindowGroup, sealGeo, blackRubber, [0, 0, -0.005]);

// // //   const paneGeo = new THREE.ShapeGeometry(makeRoundedRectShape(1.30, 0.36, 0.075), 16);
// // //   addMesh(rearWindowGroup, paneGeo, rearGlassMat, [0, 0, 0.028]);

// // //   for (const side of [-1, 1]) {
// // //     addMesh(body, new THREE.PlaneGeometry(0.74, 0.33), glass, [side * 0.924, 1.32, -0.34], [0, side * (Math.PI / 2), 0]);
// // //     addMesh(body, new THREE.PlaneGeometry(0.74, 0.33), glass, [side * 0.924, 1.32, 0.48], [0, side * (Math.PI / 2), 0]);
// // //     addMesh(body, new THREE.BoxGeometry(0.03, 0.028, 0.22), chrome, [side * 0.928, 0.96, -0.22]);
// // //     addMesh(body, new THREE.BoxGeometry(0.03, 0.028, 0.22), chrome, [side * 0.928, 0.96, 0.56]);
// // //   }

// // //   // ---------- Front Fascia (-Z) ----------
// // //   const grille = new THREE.Group();
// // //   grille.position.set(0, 0.86, -2.17);
// // //   body.add(grille);
// // //   addMesh(grille, new THREE.BoxGeometry(0.84, 0.36, 0.04), chrome, [0, 0, 0]);
// // //   for (let i = 0; i < 6; i++) {
// // //     addMesh(grille, new THREE.BoxGeometry(0.78, 0.022, 0.045), chrome, [0, 0.13 - i * 0.052, -0.024]);
// // //   }

// // //   const headGlowTexture = makeGlowTexture([255, 231, 182], 0.75);
// // //   for (const side of [-1, 1]) {
// // //     const lamp = new THREE.Group();
// // //     lamp.position.set(side * 0.66, 0.90, -2.16);
// // //     body.add(lamp);

// // //     addMesh(lamp, new THREE.TorusGeometry(0.22, 0.03, 14, 28), chrome, [0, 0, -0.02]);
// // //     addMesh(
// // //       lamp,
// // //       new THREE.CylinderGeometry(0.19, 0.19, 0.04, 24),
// // //       new THREE.MeshStandardMaterial({
// // //         color: 0xfffef2,
// // //         emissive: 0xffdf9e,
// // //         emissiveIntensity: 0.22,
// // //         roughness: 0.08,
// // //       }),
// // //       [0, 0, -0.015],
// // //       [Math.PI / 2, 0, 0]
// // //     );
// // //     addMesh(lamp, new THREE.BoxGeometry(0.12, 0.11, 0.03), indicatorMat, [0, -0.24, -0.02]);

// // //     const headGlow = new THREE.Sprite(
// // //       new THREE.SpriteMaterial({
// // //         map: headGlowTexture,
// // //         color: 0xffe8bd,
// // //         transparent: true,
// // //         opacity: 0.35,
// // //         blending: THREE.AdditiveBlending,
// // //         depthWrite: false,
// // //         toneMapped: false,
// // //       })
// // //     );
// // //     headGlow.position.set(0, 0, -0.10);
// // //     headGlow.scale.set(0.8, 0.8, 1);
// // //     lamp.add(headGlow);
// // //   }

// // //   const frontBumper = new THREE.Group();
// // //   frontBumper.position.set(0, 0.54, -2.20);
// // //   body.add(frontBumper);
// // //   addMesh(frontBumper, new THREE.BoxGeometry(1.78, 0.11, 0.11), chrome, [0, 0, -0.03]);
// // //   for (const side of [-1, 1]) {
// // //     addMesh(frontBumper, new THREE.BoxGeometry(0.08, 0.20, 0.13), blackRubber, [side * 0.62, 0.01, -0.05]);
// // //   }

// // //   const plateTexture = makeLabelTexture('WB 04 BH 1189', {
// // //     background: '#F2C200',
// // //     foreground: '#111315',
// // //     width: 560,
// // //     height: 150,
// // //     font: 'bold 64px monospace',
// // //   });
// // //   addMesh(frontBumper, new THREE.BoxGeometry(0.46, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: PLATE_YELLOW, roughness: 0.55 }), [0, 0.02, -0.085]);
// // //   addMesh(
// // //     frontBumper,
// // //     new THREE.PlaneGeometry(0.43, 0.095),
// // //     new THREE.MeshBasicMaterial({ map: plateTexture, side: THREE.DoubleSide }),
// // //     [0, 0.02, -0.097],
// // //     [0, Math.PI, 0]
// // //   );

// // //   // ---------- Rear Fascia (+Z): Slim Oval Ambassador Tail Lamps ----------
// // //   const tailGlowTexture = makeGlowTexture([255, 56, 42], 0.85);
// // //   const lampBaseGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.13, 0.28, 0.06), {
// // //     depth: 0.02,
// // //     bevelEnabled: false,
// // //   });
// // //   const lampBezelGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.115, 0.265, 0.055), {
// // //     depth: 0.028,
// // //     bevelEnabled: true,
// // //     bevelSize: 0.006,
// // //     bevelThickness: 0.006,
// // //     bevelSegments: 3,
// // //   });
// // //   const lampLensGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.082, 0.21, 0.04), {
// // //     depth: 0.036,
// // //     bevelEnabled: true,
// // //     bevelSize: 0.008,
// // //     bevelThickness: 0.008,
// // //     bevelSegments: 4,
// // //   });

// // //   for (const side of [-1, 1]) {
// // //     const lamp = new THREE.Group();
// // //     lamp.position.set(side * 0.80, 0.84, 2.15);
// // //     body.add(lamp);

// // //     addMesh(lamp, lampBaseGeo, blackRubber, [0, 0, 0]);
// // //     addMesh(lamp, lampBezelGeo, chrome, [0, 0, 0.01]);
// // //     addMesh(lamp, lampLensGeo, tailRed, [0, 0.01, 0.018]);
// // //     addMesh(lamp, new THREE.BoxGeometry(0.032, 0.11, 0.022), indicatorMat, [0, -0.21, 0.012]);

// // //     taxi.userData.brakeLights.push(tailRed);

// // //     const tailGlow = new THREE.Sprite(
// // //       new THREE.SpriteMaterial({
// // //         map: tailGlowTexture,
// // //         color: 0xff382a,
// // //         transparent: true,
// // //         opacity: 0.38,
// // //         blending: THREE.AdditiveBlending,
// // //         depthWrite: false,
// // //         toneMapped: false,
// // //       })
// // //     );
// // //     tailGlow.position.set(0, 0.01, 0.09);
// // //     tailGlow.scale.set(0.42, 0.52, 1);
// // //     lamp.add(tailGlow);
// // //     taxi.userData.brakeGlows.push(tailGlow);
// // //   }

// // //   // Boot lock/handle
// // //   addMesh(body, new THREE.BoxGeometry(0.24, 0.04, 0.03), chrome, [0, 0.84, 2.25]);

// // //   // Rear license plate sitting cleanly outside the beveled rear boot
// // //   addMesh(
// // //     body,
// // //     new THREE.BoxGeometry(0.46, 0.12, 0.02),
// // //     new THREE.MeshStandardMaterial({ color: PLATE_YELLOW, roughness: 0.55 }),
// // //     [0, 0.68, 2.26]
// // //   );
// // //   addMesh(
// // //     body,
// // //     new THREE.PlaneGeometry(0.43, 0.095),
// // //     new THREE.MeshBasicMaterial({ map: plateTexture, side: THREE.DoubleSide }),
// // //     [0, 0.68, 2.275]
// // //   );

// // //   // Slim grey rear bumper sitting lower and flush with the yellow body width (1.82)
// // //   const rearBumper = new THREE.Group();
// // //   rearBumper.position.set(0, 0.34, 2.27);
// // //   body.add(rearBumper);

// // //   addMesh(rearBumper, new THREE.BoxGeometry(1.82, 0.07, 0.08), bumperGrey, [0, 0, 0.02]);
// // //   for (const side of [-1, 1]) {
// // //     addMesh(rearBumper, new THREE.BoxGeometry(0.055, 0.12, 0.09), blackRubber, [side * 0.54, 0.005, 0.03]);
// // //   }

// // //   // ---------- Roof TAXI Sign ----------
// // //   const roofSign = new THREE.Group();
// // //   roofSign.position.set(0, 1.65, 0.14);
// // //   body.add(roofSign);

// // //   const signBox = addMesh(roofSign, new THREE.BoxGeometry(0.62, 0.19, 0.20), paintDark, [0, 0.095, 0]);
// // //   taxi.userData.roofSign = signBox;

// // //   const signTexture = makeLabelTexture('TAXI', {
// // //     background: '#f2b729',
// // //     foreground: '#111315',
// // //     width: 512,
// // //     height: 160,
// // //     font: '900 112px Manrope, Arial, sans-serif',
// // //   });
// // //   const signMaterial = new THREE.MeshStandardMaterial({
// // //     map: signTexture,
// // //     emissive: 0xffd26a,
// // //     emissiveMap: signTexture,
// // //     emissiveIntensity: 0.32,
// // //     roughness: 0.45,
// // //     side: THREE.DoubleSide,
// // //   });
// // //   addMesh(roofSign, new THREE.PlaneGeometry(0.56, 0.15), signMaterial, [0, 0.095, -0.103], [0, Math.PI, 0]);
// // //   addMesh(roofSign, new THREE.PlaneGeometry(0.56, 0.15), signMaterial, [0, 0.095, 0.103]);

// // //   // ---------- Side Mirrors ----------
// // //   for (const side of [-1, 1]) {
// // //     const mirror = new THREE.Group();
// // //     mirror.position.set(side * 0.94, 1.14, -0.82);
// // //     body.add(mirror);
// // //     addMesh(mirror, new THREE.BoxGeometry(0.14, 0.04, 0.05), chrome, [side * 0.05, 0, 0]);
// // //     addMesh(mirror, new THREE.BoxGeometry(0.20, 0.13, 0.16), paintDark, [side * 0.14, 0.02, 0.04]);
// // //   }

// // //   // ---------- 3rd-Person Follow Anchor ----------
// // //   const riderFollowAnchor = new THREE.Object3D();
// // //   riderFollowAnchor.position.set(0, 2.35, 5.4);
// // //   taxi.add(riderFollowAnchor);
// // //   taxi.userData.riderFollowAnchor = riderFollowAnchor;

// // //   taxi.userData.body = body;
// // //   taxi.position.set(0, 0, 0);
// // //   return taxi;
// // // }

// // // export function setTaxiBraking(taxi, braking) {
// // //   for (const lamp of taxi.userData.brakeLights || []) {
// // //     lamp.emissiveIntensity = braking ? 2.8 : 0.68;
// // //     lamp.color.setHex(braking ? 0xff3025 : 0xc81e1e);
// // //   }
// // //   for (const glow of taxi.userData.brakeGlows || []) {
// // //     glow.material.opacity = braking ? 0.72 : 0.28;
// // //   }
// // // }

// // // export function updateTaxiWheels(taxi, dt, speed = 0, steerAngle = 0) {
// // //   for (const w of taxi.userData.wheels || []) {
// // //     if (w.steer) {
// // //       w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle, 1 - Math.exp(-12 * dt));
// // //     }
// // //     w.spin.rotation.x -= (speed * dt) / 0.45;
// // //   }
// // // }

// // import * as THREE from 'three';

// // const PLATE_YELLOW = 0xf2c200;

// // function addMesh(parent, geometry, mat, position = [0, 0, 0], rotation = null) {
// //   const object = new THREE.Mesh(geometry, mat);
// //   object.position.set(...position);
// //   if (rotation) object.rotation.set(...rotation);
// //   object.castShadow = true;
// //   object.receiveShadow = true;
// //   parent.add(object);
// //   return object;
// // }

// // function makeRoundedRectShape(w, h, r) {
// //   const hw = w / 2;
// //   const hh = h / 2;
// //   const rad = Math.min(r, hw, hh);
// //   const s = new THREE.Shape();
// //   s.moveTo(-hw + rad, -hh);
// //   s.lineTo(hw - rad, -hh);
// //   s.quadraticCurveTo(hw, -hh, hw, -hh + rad);
// //   s.lineTo(hw, hh - rad);
// //   s.quadraticCurveTo(hw, hh, hw - rad, hh);
// //   s.lineTo(-hw + rad, hh);
// //   s.quadraticCurveTo(-hw, hh, -hw, hh - rad);
// //   s.lineTo(-hw, -hh + rad);
// //   s.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
// //   return s;
// // }

// // function makeLabelTexture(
// //   text,
// //   {
// //     background,
// //     foreground = '#111315',
// //     width = 512,
// //     height = 128,
// //     font = 'bold 76px monospace',
// //   } = {}
// // ) {
// //   const canvas = document.createElement('canvas');
// //   canvas.width = width;
// //   canvas.height = height;
// //   const ctx = canvas.getContext('2d');
// //   ctx.fillStyle = background;
// //   ctx.fillRect(0, 0, width, height);
// //   ctx.textAlign = 'center';
// //   ctx.textBaseline = 'middle';
// //   ctx.fillStyle = foreground;
// //   ctx.font = font;
// //   ctx.fillText(text, width / 2, height / 2 + 1);
// //   const texture = new THREE.CanvasTexture(canvas);
// //   texture.colorSpace = THREE.SRGBColorSpace;
// //   return texture;
// // }

// // function makeRearPlateTexture(line1 = 'WB 04', line2 = 'BH 1189') {
// //   const canvas = document.createElement('canvas');
// //   canvas.width = 256;
// //   canvas.height = 160;
// //   const ctx = canvas.getContext('2d');
// //   ctx.fillStyle = '#e5b810';
// //   ctx.fillRect(0, 0, 256, 160);
// //   ctx.strokeStyle = '#1b1d1f';
// //   ctx.lineWidth = 8;
// //   ctx.strokeRect(6, 6, 244, 148);
// //   ctx.fillStyle = '#14171a';
// //   ctx.textAlign = 'center';
// //   ctx.textBaseline = 'middle';
// //   ctx.font = 'bold 54px monospace';
// //   ctx.fillText(line1, 128, 52);
// //   ctx.fillText(line2, 128, 112);
// //   const texture = new THREE.CanvasTexture(canvas);
// //   texture.colorSpace = THREE.SRGBColorSpace;
// //   return texture;
// // }

// // function makeGlowTexture(color, centerAlpha = 0.8) {
// //   const canvas = document.createElement('canvas');
// //   canvas.width = canvas.height = 128;
// //   const ctx = canvas.getContext('2d');
// //   const [r, g, b] = color;
// //   const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
// //   gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
// //   gradient.addColorStop(0.25, `rgba(${r},${g},${b},${centerAlpha * 0.55})`);
// //   gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
// //   ctx.fillStyle = gradient;
// //   ctx.fillRect(0, 0, 128, 128);
// //   const texture = new THREE.CanvasTexture(canvas);
// //   texture.colorSpace = THREE.SRGBColorSpace;
// //   return texture;
// // }

// // function curvedGlassPanel(width, height, curvature, segW, segH, mat, pos, rot) {
// //   const geometry = new THREE.BufferGeometry();
// //   const positions = [];
// //   const normals = [];
// //   const uvs = [];
// //   const indices = [];

// //   for (let iy = 0; iy <= segH; iy++) {
// //     for (let ix = 0; ix <= segW; ix++) {
// //       const u = ix / segW;
// //       const v = iy / segH;
// //       const x = (u - 0.5) * width;
// //       const y = v * height;
// //       const z = Math.sin(u * Math.PI) * curvature;
// //       positions.push(x, y, z);
// //       uvs.push(u, v);

// //       const dzdu = Math.PI * curvature * Math.cos(u * Math.PI);
// //       const nx = -dzdu;
// //       const nz = 1.0;
// //       const len = Math.hypot(nx, nz) || 1;
// //       normals.push(nx / len, 0, nz / len);
// //     }
// //   }

// //   for (let iy = 0; iy < segH; iy++) {
// //     for (let ix = 0; ix < segW; ix++) {
// //       const a = iy * (segW + 1) + ix;
// //       const b = a + 1;
// //       const c = a + segW + 1;
// //       const d = c + 1;
// //       indices.push(a, b, d, a, d, c);
// //     }
// //   }

// //   geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
// //   geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
// //   geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
// //   geometry.setIndex(indices);
// //   geometry.computeVertexNormals();

// //   const mesh = new THREE.Mesh(geometry, mat);
// //   if (pos) mesh.position.set(...pos);
// //   if (rot) mesh.rotation.set(...rot);
// //   return mesh;
// // }

// // export function createTaxi() {
// //   const taxi = new THREE.Group();
// //   const body = new THREE.Group();
// //   taxi.add(body);

// //   // ---------- Rich Kolkata Taxi PBR Materials ----------
// //   const paintYellow = new THREE.MeshPhysicalMaterial({
// //     color: 0xeab308,
// //     roughness: 0.25,
// //     metalness: 0.05,
// //     clearcoat: 0.85,
// //     clearcoatRoughness: 0.16,
// //     flatShading: false,
// //     envMapIntensity: 1.05,
// //   });
// //   const paintDark = new THREE.MeshStandardMaterial({
// //     color: 0x141618,
// //     roughness: 0.42,
// //     metalness: 0.08,
// //     flatShading: false,
// //   });
// //   const chrome = new THREE.MeshStandardMaterial({
// //     color: 0xe8ecee,
// //     metalness: 0.92,
// //     roughness: 0.14,
// //     flatShading: false,
// //   });
// //   const bumperGrey = new THREE.MeshStandardMaterial({
// //     color: 0x9aa2aa,
// //     roughness: 0.42,
// //     metalness: 0.38,
// //   });
// //   const blackRubber = new THREE.MeshStandardMaterial({
// //     color: 0x111315,
// //     roughness: 0.92,
// //     metalness: 0.02,
// //     flatShading: false,
// //   });
// //   const tyreMat = new THREE.MeshStandardMaterial({
// //     color: 0x08090a,
// //     roughness: 0.96,
// //     metalness: 0.0,
// //     flatShading: false,
// //   });
// //   const hubMat = new THREE.MeshStandardMaterial({
// //     color: 0x878b90,
// //     metalness: 0.88,
// //     roughness: 0.24,
// //     flatShading: false,
// //   });
// //   const glass = new THREE.MeshPhysicalMaterial({
// //     color: 0x1b242a,
// //     roughness: 0.05,
// //     metalness: 0.05,
// //     transmission: 0.35,
// //     transparent: true,
// //     opacity: 0.72,
// //     thickness: 0.04,
// //     envMapIntensity: 1.0,
// //     flatShading: false,
// //     side: THREE.DoubleSide,
// //   });
// //   const rearGlassMat = new THREE.MeshPhysicalMaterial({
// //     color: 0x0c1116,
// //     roughness: 0.06,
// //     metalness: 0.15,
// //     clearcoat: 1.0,
// //     clearcoatRoughness: 0.05,
// //     envMapIntensity: 1.35,
// //   });
// //   const tailRed = new THREE.MeshStandardMaterial({
// //     color: 0xc81e1e,
// //     emissive: 0x6b0e0a,
// //     emissiveIntensity: 0.65,
// //     roughness: 0.14,
// //     metalness: 0.0,
// //     flatShading: false,
// //   });
// //   const indicatorMat = new THREE.MeshStandardMaterial({
// //     color: 0xff9d22,
// //     emissive: 0xff6b08,
// //     emissiveIntensity: 0.3,
// //     roughness: 0.18,
// //     metalness: 0.0,
// //     flatShading: false,
// //   });

// //   taxi.userData.brakeLights = [];
// //   taxi.userData.brakeGlows = [];
// //   taxi.userData.wheels = [];

// //   // ---------- Stepped Ambassador Mark IV Silhouette (-Z = front, +Z = rear) ----------
// //   const profile = new THREE.Shape();
// //   profile.moveTo(-2.14, 0.36);
// //   profile.lineTo(-2.14, 0.76);
// //   profile.quadraticCurveTo(-2.06, 0.85, -1.90, 0.86);
// //   profile.lineTo(-1.34, 0.88);
// //   profile.lineTo(-0.78, 1.38);
// //   profile.quadraticCurveTo(-0.56, 1.52, -0.28, 1.54);
// //   profile.lineTo(0.46, 1.54);
// //   profile.quadraticCurveTo(0.76, 1.52, 1.04, 1.34);
// //   profile.lineTo(1.48, 1.04);
// //   profile.quadraticCurveTo(1.86, 0.98, 2.08, 0.84);
// //   profile.quadraticCurveTo(2.16, 0.72, 2.14, 0.36);
// //   profile.closePath();

// //   const bodyDepth = 1.66;
// //   const bodyGeo = new THREE.ExtrudeGeometry(profile, {
// //     depth: bodyDepth,
// //     bevelEnabled: true,
// //     bevelSegments: 8,
// //     steps: 1,
// //     bevelSize: 0.085,
// //     bevelThickness: 0.085,
// //     curveSegments: 36,
// //   });
// //   bodyGeo.translate(0, 0, -bodyDepth / 2);
// //   bodyGeo.rotateY(-Math.PI / 2);

// //   const bodyShell = addMesh(body, bodyGeo, paintYellow);
// //   bodyShell.position.set(0, 0, 0);

// //   // Lower black two-tone skirt
// //   addMesh(body, new THREE.BoxGeometry(1.82, 0.34, 4.22), paintDark, [0, 0.22, 0]);

// //   // Side door creases & black window trim frames
// //   for (const side of [-1, 1]) {
// //     addMesh(body, new THREE.BoxGeometry(0.014, 0.36, 1.36), paintDark, [side * 0.918, 0.84, 0.12]);
// //     addMesh(body, new THREE.BoxGeometry(0.02, 0.38, 0.80), blackRubber, [side * 0.92, 1.32, -0.34]);
// //     addMesh(body, new THREE.BoxGeometry(0.02, 0.38, 0.80), blackRubber, [side * 0.92, 1.32, 0.48]);
// //   }

// //   // ---------- Wheels & Flares (grounded at y = 0, radius = 0.45) ----------
// //   const wheelRadius = 0.45;
// //   const wheelPositions = [
// //     { name: 'FL', x: -0.92, z: -1.24, steer: true },
// //     { name: 'FR', x: 0.92, z: -1.24, steer: true },
// //     { name: 'RL', x: -0.92, z: 1.24, steer: false },
// //     { name: 'RR', x: 0.92, z: 1.24, steer: false },
// //   ];

// //   for (const wp of wheelPositions) {
// //     addMesh(
// //       body,
// //       new THREE.CylinderGeometry(0.54, 0.54, 0.42, 24, 1, false, 0, Math.PI),
// //       paintDark,
// //       [wp.x * 0.97, wheelRadius, wp.z],
// //       [0, Math.PI / 2, 0]
// //     );

// //     const steerPivot = new THREE.Group();
// //     steerPivot.position.set(wp.x, wheelRadius, wp.z);
// //     body.add(steerPivot);

// //     const spinGroup = new THREE.Group();
// //     steerPivot.add(spinGroup);

// //     addMesh(
// //       spinGroup,
// //       new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.34, 28),
// //       tyreMat,
// //       [0, 0, 0],
// //       [0, 0, Math.PI / 2]
// //     );
// //     addMesh(
// //       spinGroup,
// //       new THREE.CylinderGeometry(0.27, 0.27, 0.355, 22),
// //       hubMat,
// //       [0, 0, 0],
// //       [0, 0, Math.PI / 2]
// //     );
// //     addMesh(
// //       spinGroup,
// //       new THREE.CylinderGeometry(0.11, 0.11, 0.37, 16),
// //       chrome,
// //       [0, 0, 0],
// //       [0, 0, Math.PI / 2]
// //     );

// //     taxi.userData.wheels.push({
// //       name: wp.name,
// //       steer: wp.steer,
// //       pivot: steerPivot,
// //       spin: spinGroup,
// //     });
// //   }

// //   // Chrome waist beltline
// //   for (const side of [-1, 1]) {
// //     const beltPoints = [];
// //     for (let i = 0; i <= 24; i++) {
// //       const t = i / 24;
// //       const z = -1.96 + t * 3.92;
// //       const y = 1.06 + Math.sin(t * Math.PI) * 0.03;
// //       beltPoints.push(new THREE.Vector3(side * 0.926, y, z));
// //     }
// //     addMesh(
// //       body,
// //       new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPoints), 28, 0.013, 6, false),
// //       chrome
// //     );
// //   }

// //   // ---------- Interior ----------
// //   const interior = new THREE.Group();
// //   body.add(interior);
// //   const dashMat = new THREE.MeshStandardMaterial({ color: 0x1a2022, roughness: 0.8, metalness: 0.05 });
// //   const seatMat = new THREE.MeshStandardMaterial({ color: 0x2c1c14, roughness: 0.88, metalness: 0.02 });

// //   addMesh(interior, new THREE.BoxGeometry(1.46, 0.26, 0.22), dashMat, [0, 1.02, -0.78]);

// //   const steering = new THREE.Group();
// //   steering.position.set(0.42, 1.02, -0.62);
// //   addMesh(steering, new THREE.TorusGeometry(0.17, 0.02, 10, 24), blackRubber, [0, 0, 0], [Math.PI / 2.4, 0, 0]);
// //   addMesh(steering, new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), blackRubber, [0, -0.02, 0.08], [Math.PI / 2.4, 0, 0]);
// //   interior.add(steering);
// //   taxi.userData.steeringWheel = steering;

// //   for (const side of [-0.36, 0.36]) {
// //     addMesh(interior, new THREE.BoxGeometry(0.46, 0.20, 0.44), seatMat, [side, 0.56, -0.22]);
// //     addMesh(interior, new THREE.BoxGeometry(0.46, 0.46, 0.14), seatMat, [side, 0.84, 0.02]);
// //   }
// //   addMesh(interior, new THREE.BoxGeometry(1.36, 0.22, 0.46), seatMat, [0, 0.58, 0.52]);
// //   addMesh(interior, new THREE.BoxGeometry(1.36, 0.48, 0.15), seatMat, [0, 0.88, 0.78]);

// //   // ---------- Windows ----------
// //   const windscreen = curvedGlassPanel(1.34, 0.44, 0.10, 18, 8, glass, [0, 1.24, -0.92], [0.22, Math.PI, 0]);
// //   body.add(windscreen);

// //   // Classic Ambassador rounded-rectangle rear window with thick black rubber seal
// //   const rearWindowGroup = new THREE.Group();
// //   rearWindowGroup.position.set(0, 1.265, 1.318);
// //   rearWindowGroup.rotation.x = -Math.atan2(0.44, 0.30);
// //   body.add(rearWindowGroup);

// //   const sealGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(1.42, 0.46, 0.10), {
// //     depth: 0.02,
// //     bevelEnabled: true,
// //     bevelSize: 0.01,
// //     bevelThickness: 0.01,
// //     bevelSegments: 3,
// //   });
// //   addMesh(rearWindowGroup, sealGeo, blackRubber, [0, 0, -0.005]);

// //   const paneGeo = new THREE.ShapeGeometry(makeRoundedRectShape(1.30, 0.36, 0.075), 16);
// //   addMesh(rearWindowGroup, paneGeo, rearGlassMat, [0, 0, 0.028]);

// //   for (const side of [-1, 1]) {
// //     addMesh(body, new THREE.PlaneGeometry(0.74, 0.33), glass, [side * 0.924, 1.32, -0.34], [0, side * (Math.PI / 2), 0]);
// //     addMesh(body, new THREE.PlaneGeometry(0.74, 0.33), glass, [side * 0.924, 1.32, 0.48], [0, side * (Math.PI / 2), 0]);
// //     addMesh(body, new THREE.BoxGeometry(0.03, 0.028, 0.22), chrome, [side * 0.928, 0.96, -0.22]);
// //     addMesh(body, new THREE.BoxGeometry(0.03, 0.028, 0.22), chrome, [side * 0.928, 0.96, 0.56]);
// //   }

// //   // ---------- Front Fascia (-Z) ----------
// //   const grille = new THREE.Group();
// //   grille.position.set(0, 0.86, -2.17);
// //   body.add(grille);
// //   addMesh(grille, new THREE.BoxGeometry(0.84, 0.36, 0.04), chrome, [0, 0, 0]);
// //   for (let i = 0; i < 6; i++) {
// //     addMesh(grille, new THREE.BoxGeometry(0.78, 0.022, 0.045), chrome, [0, 0.13 - i * 0.052, -0.024]);
// //   }

// //   const headGlowTexture = makeGlowTexture([255, 231, 182], 0.75);
// //   for (const side of [-1, 1]) {
// //     const lamp = new THREE.Group();
// //     lamp.position.set(side * 0.66, 0.90, -2.16);
// //     body.add(lamp);

// //     addMesh(lamp, new THREE.TorusGeometry(0.22, 0.03, 14, 28), chrome, [0, 0, -0.02]);
// //     addMesh(
// //       lamp,
// //       new THREE.CylinderGeometry(0.19, 0.19, 0.04, 24),
// //       new THREE.MeshStandardMaterial({
// //         color: 0xfffef2,
// //         emissive: 0xffdf9e,
// //         emissiveIntensity: 0.22,
// //         roughness: 0.08,
// //       }),
// //       [0, 0, -0.015],
// //       [Math.PI / 2, 0, 0]
// //     );
// //     addMesh(lamp, new THREE.BoxGeometry(0.12, 0.11, 0.03), indicatorMat, [0, -0.24, -0.02]);

// //     const headGlow = new THREE.Sprite(
// //       new THREE.SpriteMaterial({
// //         map: headGlowTexture,
// //         color: 0xffe8bd,
// //         transparent: true,
// //         opacity: 0.35,
// //         blending: THREE.AdditiveBlending,
// //         depthWrite: false,
// //         toneMapped: false,
// //       })
// //     );
// //     headGlow.position.set(0, 0, -0.10);
// //     headGlow.scale.set(0.8, 0.8, 1);
// //     lamp.add(headGlow);
// //   }

// //   const frontBumper = new THREE.Group();
// //   frontBumper.position.set(0, 0.54, -2.20);
// //   body.add(frontBumper);
// //   addMesh(frontBumper, new THREE.BoxGeometry(1.78, 0.11, 0.11), chrome, [0, 0, -0.03]);
// //   for (const side of [-1, 1]) {
// //     addMesh(frontBumper, new THREE.BoxGeometry(0.08, 0.20, 0.13), blackRubber, [side * 0.62, 0.01, -0.05]);
// //   }

// //   const plateTexture = makeLabelTexture('WB 04 BH 1189', {
// //     background: '#F2C200',
// //     foreground: '#111315',
// //     width: 560,
// //     height: 150,
// //     font: 'bold 64px monospace',
// //   });
// //   addMesh(frontBumper, new THREE.BoxGeometry(0.46, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: PLATE_YELLOW, roughness: 0.55 }), [0, 0.02, -0.085]);
// //   addMesh(
// //     frontBumper,
// //     new THREE.PlaneGeometry(0.43, 0.095),
// //     new THREE.MeshBasicMaterial({ map: plateTexture, side: THREE.DoubleSide }),
// //     [0, 0.02, -0.097],
// //     [0, Math.PI, 0]
// //   );

// //   // ---------- Rear Fascia (+Z): Boot Lid, Slim Oval Tail Lamps, Plate, Latch & Mudflaps ----------
// //   // Sculpted central boot-lid panel + vertical shut-line seams
// //   const bootLidGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(1.16, 0.50, 0.06), {
// //     depth: 0.025,
// //     bevelEnabled: true,
// //     bevelSize: 0.015,
// //     bevelThickness: 0.015,
// //     bevelSegments: 3,
// //   });
// //   addMesh(body, bootLidGeo, paintYellow, [0, 0.66, 2.21]);

// //   for (const side of [-1, 1]) {
// //     addMesh(body, new THREE.BoxGeometry(0.016, 0.52, 0.02), paintDark, [side * 0.60, 0.66, 2.245]);
// //   }
// //   addMesh(body, new THREE.BoxGeometry(1.22, 0.016, 0.02), paintDark, [0, 0.41, 2.245]);

// //   // Curved chrome number-plate light hood above the plate
// //   const plateHood = addMesh(
// //     body,
// //     new THREE.CylinderGeometry(0.045, 0.045, 0.44, 16, 1, false, 0, Math.PI),
// //     chrome,
// //     [0, 0.77, 2.255],
// //     [0, 0, Math.PI / 2]
// //   );
// //   plateHood.scale.set(0.65, 1, 0.85);

// //   // Classic two-line square Kolkata rear license plate
// //   const rearPlateTexture = makeRearPlateTexture('WB 04', 'BH 1189');
// //   addMesh(
// //     body,
// //     new THREE.BoxGeometry(0.39, 0.24, 0.018),
// //     new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.6 }),
// //     [0, 0.625, 2.256]
// //   );
// //   addMesh(
// //     body,
// //     new THREE.PlaneGeometry(0.37, 0.22),
// //     new THREE.MeshStandardMaterial({ map: rearPlateTexture, roughness: 0.52, metalness: 0.05 }),
// //     [0, 0.625, 2.268]
// //   );

// //   // Small chrome T-handle boot latch below the plate
// //   addMesh(body, new THREE.BoxGeometry(0.11, 0.022, 0.024), chrome, [0, 0.465, 2.262]);
// //   addMesh(body, new THREE.CylinderGeometry(0.018, 0.018, 0.022, 12), chrome, [0, 0.465, 2.255], [Math.PI / 2, 0, 0]);

// //   // Slim oval Ambassador tail lamps + round red lower reflectors
// //   const tailGlowTexture = makeGlowTexture([255, 56, 42], 0.85);
// //   const lampBaseGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.13, 0.27, 0.06), {
// //     depth: 0.02,
// //     bevelEnabled: false,
// //   });
// //   const lampBezelGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.115, 0.255, 0.055), {
// //     depth: 0.028,
// //     bevelEnabled: true,
// //     bevelSize: 0.006,
// //     bevelThickness: 0.006,
// //     bevelSegments: 3,
// //   });
// //   const lampLensGeo = new THREE.ExtrudeGeometry(makeRoundedRectShape(0.082, 0.20, 0.04), {
// //     depth: 0.036,
// //     bevelEnabled: true,
// //     bevelSize: 0.008,
// //     bevelThickness: 0.008,
// //     bevelSegments: 4,
// //   });

// //   for (const side of [-1, 1]) {
// //     const lamp = new THREE.Group();
// //     lamp.position.set(side * 0.79, 0.76, 2.18);
// //     body.add(lamp);

// //     addMesh(lamp, lampBaseGeo, blackRubber, [0, 0, 0]);
// //     addMesh(lamp, lampBezelGeo, chrome, [0, 0, 0.01]);
// //     addMesh(lamp, lampLensGeo, tailRed, [0, 0.01, 0.018]);

// //     // Classic small round red reflector right below the oval taillight
// //     addMesh(lamp, new THREE.CylinderGeometry(0.036, 0.036, 0.024, 14), chrome, [0, -0.20, 0.025], [Math.PI / 2, 0, 0]);
// //     addMesh(lamp, new THREE.CylinderGeometry(0.028, 0.028, 0.03, 14), tailRed, [0, -0.20, 0.028], [Math.PI / 2, 0, 0]);

// //     taxi.userData.brakeLights.push(tailRed);

// //     const tailGlow = new THREE.Sprite(
// //       new THREE.SpriteMaterial({
// //         map: tailGlowTexture,
// //         color: 0xff382a,
// //         transparent: true,
// //         opacity: 0.34,
// //         blending: THREE.AdditiveBlending,
// //         depthWrite: false,
// //         toneMapped: false,
// //       })
// //     );
// //     tailGlow.position.set(0, 0.01, 0.09);
// //     tailGlow.scale.set(0.40, 0.50, 1);
// //     lamp.add(tailGlow);
// //     taxi.userData.brakeGlows.push(tailGlow);
// //   }

// //   // Slim grey rear bumper sitting lower and flush with the yellow body width (1.82)
// //   const rearBumper = new THREE.Group();
// //   rearBumper.position.set(0, 0.36, 2.27);
// //   body.add(rearBumper);

// //   addMesh(rearBumper, new THREE.BoxGeometry(1.82, 0.072, 0.08), bumperGrey, [0, 0, 0.02]);
// //   for (const side of [-1, 1]) {
// //     addMesh(rearBumper, new THREE.BoxGeometry(0.06, 0.135, 0.095), blackRubber, [side * 0.52, 0.005, 0.03]);
// //   }

// //   // Rear black rubber mudflaps hanging behind the rear wheels
// //   for (const side of [-1, 1]) {
// //     addMesh(body, new THREE.BoxGeometry(0.32, 0.24, 0.025), blackRubber, [side * 0.72, 0.19, 2.12]);
// //   }

// //   // ---------- Roof TAXI Sign ----------
// //   const roofSign = new THREE.Group();
// //   roofSign.position.set(0, 1.65, 0.14);
// //   body.add(roofSign);

// //   const signBox = addMesh(roofSign, new THREE.BoxGeometry(0.62, 0.19, 0.20), paintDark, [0, 0.095, 0]);
// //   taxi.userData.roofSign = signBox;

// //   const signTexture = makeLabelTexture('TAXI', {
// //     background: '#f2b729',
// //     foreground: '#111315',
// //     width: 512,
// //     height: 160,
// //     font: '900 112px Manrope, Arial, sans-serif',
// //   });
// //   const signMaterial = new THREE.MeshStandardMaterial({
// //     map: signTexture,
// //     emissive: 0xffd26a,
// //     emissiveMap: signTexture,
// //     emissiveIntensity: 0.32,
// //     roughness: 0.45,
// //     side: THREE.DoubleSide,
// //   });
// //   addMesh(roofSign, new THREE.PlaneGeometry(0.56, 0.15), signMaterial, [0, 0.095, -0.103], [0, Math.PI, 0]);
// //   addMesh(roofSign, new THREE.PlaneGeometry(0.56, 0.15), signMaterial, [0, 0.095, 0.103]);

// //   // ---------- Side Mirrors ----------
// //   for (const side of [-1, 1]) {
// //     const mirror = new THREE.Group();
// //     mirror.position.set(side * 0.94, 1.14, -0.82);
// //     body.add(mirror);
// //     addMesh(mirror, new THREE.BoxGeometry(0.14, 0.04, 0.05), chrome, [side * 0.05, 0, 0]);
// //     addMesh(mirror, new THREE.BoxGeometry(0.20, 0.13, 0.16), paintDark, [side * 0.14, 0.02, 0.04]);
// //   }

// //   // ---------- 3rd-Person Follow Anchor ----------
// //   const riderFollowAnchor = new THREE.Object3D();
// //   riderFollowAnchor.position.set(0, 2.35, 5.4);
// //   taxi.add(riderFollowAnchor);
// //   taxi.userData.riderFollowAnchor = riderFollowAnchor;

// //   taxi.userData.body = body;
// //   taxi.position.set(0, 0, 0);
// //   return taxi;
// // }

// // export function setTaxiBraking(taxi, braking) {
// //   for (const lamp of taxi.userData.brakeLights || []) {
// //     lamp.emissiveIntensity = braking ? 2.8 : 0.68;
// //     lamp.color.setHex(braking ? 0xff3025 : 0xc81e1e);
// //   }
// //   for (const glow of taxi.userData.brakeGlows || []) {
// //     glow.material.opacity = braking ? 0.72 : 0.28;
// //   }
// // }

// // export function updateTaxiWheels(taxi, dt, speed = 0, steerAngle = 0) {
// //   for (const w of taxi.userData.wheels || []) {
// //     if (w.steer) {
// //       w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle, 1 - Math.exp(-12 * dt));
// //     }
// //     w.spin.rotation.x -= (speed * dt) / 0.45;
// //   }
// // }

// import * as THREE from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// const DEFAULT_MODEL_URL = './models/taxi.glb';
// const TARGET_LENGTH = 4.75;

// function makeGlowTexture(color, centerAlpha = 0.85) {
//   const canvas = document.createElement('canvas');
//   canvas.width = canvas.height = 128;
//   const ctx = canvas.getContext('2d');
//   const [r, g, b] = color;
//   const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
//   gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
//   gradient.addColorStop(0.28, `rgba(${r},${g},${b},${centerAlpha * 0.5})`);
//   gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
//   ctx.fillStyle = gradient;
//   ctx.fillRect(0, 0, 128, 128);
//   const texture = new THREE.CanvasTexture(canvas);
//   texture.colorSpace = THREE.SRGBColorSpace;
//   return texture;
// }

// function createFallbackTaxi() {
//   const group = new THREE.Group();
//   const paint = new THREE.MeshPhysicalMaterial({
//     color: 0xeab308,
//     roughness: 0.25,
//     metalness: 0.05,
//     clearcoat: 0.85,
//     clearcoatRoughness: 0.16,
//   });
//   const dark = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.45, metalness: 0.08 });
//   const shell = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.18, 4.4), paint);
//   shell.position.set(0, 0.86, 0);
//   const lower = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.36, 4.42), dark);
//   lower.position.set(0, 0.44, 0);
//   group.add(shell, lower);

//   const wheels = [];
//   for (const [name, x, z, steer] of [
//     ['FL', -0.92, -1.28, true],
//     ['FR', 0.92, -1.28, true],
//     ['RL', -0.92, 1.28, false],
//     ['RR', 0.92, 1.28, false],
//   ]) {
//     const pivot = new THREE.Group();
//     pivot.position.set(x, 0.45, z);
//     const spin = new THREE.Group();
//     const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 24), dark);
//     tyre.rotation.z = Math.PI / 2;
//     spin.add(tyre);
//     pivot.add(spin);
//     group.add(pivot);
//     wheels.push({ name, steer, pivot, spin });
//   }
//   return { group, wheels };
// }

// function orientForwardToNegativeZ(modelRoot) {
//   modelRoot.updateMatrixWorld(true);
//   const box = new THREE.Box3().setFromObject(modelRoot);
//   const size = new THREE.Vector3();
//   box.getSize(size);

//   if (size.x > size.z * 1.15) {
//     modelRoot.rotation.y += Math.PI / 2;
//     modelRoot.updateMatrixWorld(true);
//   }
// }

// function normalizeLoadedModel(modelRoot) {
//   const wrapper = new THREE.Group();
//   wrapper.add(modelRoot);

//   const toRemove = [];
//   modelRoot.traverse((obj) => {
//     if (!obj.isMesh) return;
//     const n = (obj.name || '').toLowerCase();
//     if (n.includes('pplane') || n.includes('plane') || n.includes('floor') || n.includes('ground')) {
//       toRemove.push(obj);
//     }
//   });
//   for (const obj of toRemove) {
//     obj.parent?.remove(obj);
//   }

//   orientForwardToNegativeZ(modelRoot);

//   const rawBox = new THREE.Box3().setFromObject(wrapper);
//   const rawSize = new THREE.Vector3();
//   rawBox.getSize(rawSize);
//   const longest = Math.max(rawSize.x, rawSize.z) || 1;
//   const scale = TARGET_LENGTH / longest;
//   modelRoot.scale.multiplyScalar(scale);

//   wrapper.updateMatrixWorld(true);
//   const scaledBox = new THREE.Box3().setFromObject(wrapper);
//   const center = new THREE.Vector3();
//   scaledBox.getCenter(center);

//   modelRoot.position.x -= center.x;
//   modelRoot.position.z -= center.z;
//   modelRoot.position.y -= scaledBox.min.y;

//   wrapper.updateMatrixWorld(true);
//   const finalBox = new THREE.Box3().setFromObject(wrapper);

//   const wheels = [];
//   const brakeLights = [];

//   modelRoot.traverse((obj) => {
//     if (!obj.isMesh) return;
//     obj.castShadow = true;
//     obj.receiveShadow = true;

//     const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
//     for (const mat of mats) {
//       if (!mat) continue;
//       mat.side = THREE.FrontSide;
//       if ('normalScale' in mat && mat.normalScale) {
//         mat.normalScale.set(0.35, 0.35);
//       }
//       if ('envMapIntensity' in mat) mat.envMapIntensity = 1.0;
//       if ('emissiveIntensity' in mat && mat.emissiveIntensity > 0.5) {
//         mat.emissiveIntensity = 0.35;
//       }
//       if (mat.color) {
//         const c = mat.color;
//         if (c.r > 0.45 && c.g < 0.25 && c.b < 0.25) {
//           brakeLights.push(mat);
//         }
//       }
//     }

//     const lowerName = (obj.name || '').toLowerCase();
//     if (lowerName.includes('wheel') || lowerName.includes('tyre') || lowerName.includes('tire')) {
//       wheels.push({
//         name: obj.name,
//         steer: lowerName.includes('front') || lowerName.includes('fl') || lowerName.includes('fr'),
//         pivot: obj,
//         spin: obj,
//       });
//     }
//   });

//   return { wrapper, wheels, brakeLights, bounds: finalBox };
// }

// export function createTaxi(modelUrl = DEFAULT_MODEL_URL) {
//   const taxi = new THREE.Group();
//   const body = new THREE.Group();
//   taxi.add(body);

//   taxi.userData.body = body;
//   taxi.userData.brakeLights = [];
//   taxi.userData.brakeGlows = [];
//   taxi.userData.wheels = [];

//   const tailGlowTexture = makeGlowTexture([255, 52, 38], 0.85);
//   const brakeGlows = [];
//   for (const side of [-1, 1]) {
//     const glow = new THREE.Sprite(
//       new THREE.SpriteMaterial({
//         map: tailGlowTexture,
//         color: 0xff3426,
//         transparent: true,
//         opacity: 0.22,
//         blending: THREE.AdditiveBlending,
//         depthWrite: false,
//         toneMapped: false,
//       })
//     );
//     glow.position.set(side * 0.68, 0.78, 2.22);
//     glow.scale.set(0.28, 0.34, 1);
//     body.add(glow);
//     brakeGlows.push(glow);
//   }
//   taxi.userData.brakeGlows = brakeGlows;

//   const riderFollowAnchor = new THREE.Object3D();
//   riderFollowAnchor.position.set(0, 2.35, 5.4);
//   taxi.add(riderFollowAnchor);
//   taxi.userData.riderFollowAnchor = riderFollowAnchor;

//   const fallback = createFallbackTaxi();
//   body.add(fallback.group);
//   taxi.userData.wheels = fallback.wheels;

//   const loader = new GLTFLoader();
//   loader.load(
//     modelUrl,
//     (gltf) => {
//       body.remove(fallback.group);
//       const { wrapper, wheels, brakeLights, bounds } = normalizeLoadedModel(gltf.scene);
//       body.add(wrapper);
//       taxi.userData.wheels = wheels;
//       taxi.userData.brakeLights = brakeLights;

//       const rearZ = bounds.max.z + 0.02;
//       const halfW = Math.max(0.45, (bounds.max.x - bounds.min.x) * 0.36);
//       const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.46;
//       brakeGlows.forEach((sprite, idx) => {
//         const side = idx === 0 ? -1 : 1;
//         sprite.position.set(side * halfW, lampY, rearZ);
//       });
//     },
//     undefined,
//     () => {}
//   );

//   return taxi;
// }

// export function setTaxiBraking(taxi, braking) {
//   for (const lamp of taxi.userData.brakeLights || []) {
//     if ('emissive' in lamp) {
//       lamp.emissive.setHex(braking ? 0xff2a1e : 0x6b0e0a);
//       lamp.emissiveIntensity = braking ? 2.2 : 0.4;
//     }
//   }
//   for (const glow of taxi.userData.brakeGlows || []) {
//     glow.material.opacity = braking ? 0.58 : 0.2;
//   }
// }

// export function updateTaxiWheels(taxi, dt, speed = 0, steerAngle = 0) {
//   for (const w of taxi.userData.wheels || []) {
//     if (!w.spin) continue;
//     if (w.steer && w.pivot) {
//       w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle, 1 - Math.exp(-12 * dt));
//     }
//     w.spin.rotation.x -= (speed * dt) / 0.45;
//   }
// }
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_MODEL_URL = './models/taxi.glb';
const TARGET_LENGTH = 4.75;

function makeGlowTexture(color, centerAlpha = 0.9) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const [r, g, b] = color;
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${centerAlpha})`);
  gradient.addColorStop(0.25, `rgba(${r},${g},${b},${centerAlpha * 0.6})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeHeadlightConeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, 'rgba(255, 226, 165, 0.34)');
  grad.addColorStop(0.5, 'rgba(255, 212, 135, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 200, 115, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFallbackTaxi() {
  const group = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xeab308,
    roughness: 0.25,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.45, metalness: 0.08 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.18, 4.4), paint);
  shell.position.set(0, 0.86, 0);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.36, 4.42), dark);
  lower.position.set(0, 0.44, 0);
  group.add(shell, lower);

  const wheels = [];
  for (const [name, x, z, steer] of [
    ['FL', -0.92, -1.28, true],
    ['FR', 0.92, -1.28, true],
    ['RL', -0.92, 1.28, false],
    ['RR', 0.92, 1.28, false],
  ]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.45, z);
    const spin = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 24), dark);
    tyre.rotation.z = Math.PI / 2;
    spin.add(tyre);
    pivot.add(spin);
    group.add(pivot);
    wheels.push({ name, steer, pivot, spin });
  }
  return { group, wheels };
}

function orientForwardToNegativeZ(modelRoot) {
  modelRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x > size.z * 1.15) {
    modelRoot.rotation.y += Math.PI / 2;
    modelRoot.updateMatrixWorld(true);
  }
}

function normalizeLoadedModel(modelRoot) {
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

  orientForwardToNegativeZ(modelRoot);

  const rawBox = new THREE.Box3().setFromObject(wrapper);
  const rawSize = new THREE.Vector3();
  rawBox.getSize(rawSize);
  const longest = Math.max(rawSize.x, rawSize.z) || 1;
  const scale = TARGET_LENGTH / longest;
  modelRoot.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  modelRoot.position.x -= center.x;
  modelRoot.position.z -= center.z;
  modelRoot.position.y -= scaledBox.min.y;

  wrapper.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(wrapper);

  const wheels = [];
  const brakeLights = [];

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.side = THREE.FrontSide;
      if ('normalScale' in mat && mat.normalScale) {
        mat.normalScale.set(0.35, 0.35);
      }
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.0;
      if ('emissiveIntensity' in mat && mat.emissiveIntensity > 0.5) {
        mat.emissiveIntensity = 0.35;
      }
      if (mat.color) {
        const c = mat.color;
        if (c.r > 0.45 && c.g < 0.25 && c.b < 0.25) {
          brakeLights.push(mat);
        }
      }
    }

    const lowerName = (obj.name || '').toLowerCase();
    if (lowerName.includes('wheel') || lowerName.includes('tyre') || lowerName.includes('tire')) {
      wheels.push({
        name: obj.name,
        steer: lowerName.includes('front') || lowerName.includes('fl') || lowerName.includes('fr'),
        pivot: obj,
        spin: obj,
      });
    }
  });

  return { wrapper, wheels, brakeLights, bounds: finalBox };
}

export function createTaxi(modelUrl = DEFAULT_MODEL_URL) {
  const taxi = new THREE.Group();
  const body = new THREE.Group();
  taxi.add(body);

  taxi.userData.body = body;
  taxi.userData.brakeLights = [];
  taxi.userData.brakeGlows = [];
  taxi.userData.headlightMeshes = [];
  taxi.userData.wheels = [];

  // Rear tail light glow sprites
  const tailGlowTexture = makeGlowTexture([255, 52, 38], 0.85);
  const brakeGlows = [];
  for (const side of [-1, 1]) {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tailGlowTexture,
        color: 0xff3426,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    glow.position.set(side * 0.68, 0.78, 2.22);
    glow.scale.set(0.28, 0.34, 1);
    body.add(glow);
    brakeGlows.push(glow);
  }
  taxi.userData.brakeGlows = brakeGlows;

  // Front headlights: left & right lamp glows + forward light cones (-Z)
  const headLightsGroup = new THREE.Group();
  const headGlowTex = makeGlowTexture([255, 232, 175], 0.95);
  const coneTex = makeHeadlightConeTexture();
  const coneMat = new THREE.MeshBasicMaterial({
    map: coneTex,
    color: 0xffe2a6,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const leftLampGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: headGlowTex,
      color: 0xffe6ad,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  const rightLampGlow = leftLampGlow.clone();
  leftLampGlow.scale.set(0.65, 0.65, 1);
  rightLampGlow.scale.set(0.65, 0.65, 1);
  headLightsGroup.add(leftLampGlow, rightLampGlow);

  const leftCone = new THREE.Mesh(new THREE.ConeGeometry(1.55, 11.5, 24, 1, true), coneMat);
  const rightCone = new THREE.Mesh(new THREE.ConeGeometry(1.55, 11.5, 24, 1, true), coneMat);
  // Point cone tip at lamp and flare forward along -Z
  leftCone.rotation.x = -Math.PI / 2;
  rightCone.rotation.x = -Math.PI / 2;
  headLightsGroup.add(leftCone, rightCone);

  function positionFrontHeadlights(bounds) {
    const frontZ = bounds.min.z - 0.05;
    const halfW = Math.max(0.55, (bounds.max.x - bounds.min.x) * 0.38);
    const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.56;

    leftLampGlow.position.set(-halfW, lampY, frontZ);
    rightLampGlow.position.set(halfW, lampY, frontZ);

    leftCone.position.set(-halfW, lampY - 0.12, frontZ - 5.75);
    rightCone.position.set(halfW, lampY - 0.12, frontZ - 5.75);
  }

  positionFrontHeadlights(
    new THREE.Box3(new THREE.Vector3(-0.94, 0, -2.35), new THREE.Vector3(0.94, 1.65, 2.35))
  );

  body.add(headLightsGroup);
  taxi.userData.headlightMeshes.push(headLightsGroup);

  const riderFollowAnchor = new THREE.Object3D();
  riderFollowAnchor.position.set(0, 2.35, 5.4);
  taxi.add(riderFollowAnchor);
  taxi.userData.riderFollowAnchor = riderFollowAnchor;

  const fallback = createFallbackTaxi();
  body.add(fallback.group);
  taxi.userData.wheels = fallback.wheels;

  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      body.remove(fallback.group);
      const { wrapper, wheels, brakeLights, bounds } = normalizeLoadedModel(gltf.scene);
      body.add(wrapper);
      taxi.userData.wheels = wheels;
      taxi.userData.brakeLights = brakeLights;

      positionFrontHeadlights(bounds);

      const rearZ = bounds.max.z + 0.02;
      const halfW = Math.max(0.45, (bounds.max.x - bounds.min.x) * 0.36);
      const lampY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.46;
      brakeGlows.forEach((sprite, idx) => {
        const side = idx === 0 ? -1 : 1;
        sprite.position.set(side * halfW, lampY, rearZ);
      });
    },
    undefined,
    () => {}
  );

  return taxi;
}

export function setTaxiHeadlights(taxi, on) {
  for (const obj of taxi.userData.headlightMeshes || []) {
    obj.visible = Boolean(on);
  }
}

export function setTaxiBraking(taxi, braking) {
  for (const lamp of taxi.userData.brakeLights || []) {
    if ('emissive' in lamp) {
      lamp.emissive.setHex(braking ? 0xff2a1e : 0x6b0e0a);
      lamp.emissiveIntensity = braking ? 2.2 : 0.4;
    }
  }
  for (const glow of taxi.userData.brakeGlows || []) {
    glow.material.opacity = braking ? 0.58 : 0.2;
  }
}

export function updateTaxiWheels(taxi, dt, speed = 0, steerAngle = 0) {
  for (const w of taxi.userData.wheels || []) {
    if (!w.spin) continue;
    if (w.steer && w.pivot) {
      w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle, 1 - Math.exp(-12 * dt));
    }
    w.spin.rotation.x -= (speed * dt) / 0.45;
  }
}