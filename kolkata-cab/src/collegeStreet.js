import * as THREE from 'three';
import { loadGLTF } from './gltfCache.js';
import { DEFAULT_TREE_MODELS, normalizeTreeModel } from './trees.js';
import {
  COLLEGE_CROSSING_Z,
  COLLEGE_STREET_WIDTH,
  COLLEGE_STREET_X,
  COLLEGE_TURN_Z,
} from './roadLayout.js';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function addInstanced(parent, geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  items.forEach((item, i) => {
    _dummy.position.set(item.x, item.y, item.z);
    _dummy.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    _dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    if (item.color) {
      _color.setHex(item.color);
      mesh.setColorAt(i, _color);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function makeWeatheredFacadeTexture(baseHex, shutterHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle vertical rain patina & plaster weathering
  let seed = 31415;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(22, 20, 18, ${0.03 + rand() * 0.08})`;
    ctx.fillRect(rand() * 256, rand() * 512, 2 + rand() * 8, 12 + rand() * 48);
  }

  // Horizontal cornice bands per floor
  for (let row = 0; row < 4; row++) {
    const y = 32 + row * 116;
    ctx.fillStyle = 'rgba(255,250,240,0.22)';
    ctx.fillRect(0, y - 6, 256, 5);
    ctx.fillStyle = 'rgba(20,18,16,0.22)';
    ctx.fillRect(0, y - 1, 256, 3);

    // Tall vertically proportioned louvered shutter windows
    for (let col = 0; col < 4; col++) {
      const wx = 20 + col * 58;
      const wy = y + 14;
      const ww = 34;
      const wh = 72;
      ctx.fillStyle = '#24201c';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      ctx.fillStyle = shutterHex;
      ctx.fillRect(wx, wy, ww, wh);

      // Louver slats + center split
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      for (let sy = wy + 6; sy < wy + wh; sy += 6) {
        ctx.fillRect(wx + 2, sy, ww - 4, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#272c32';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 77123;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 650; i++) {
    const v = Math.floor(24 + rand() * 26);
    ctx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 4}, 0.24)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 28);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createCollegeStreetCorridor(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const startZ = COLLEGE_TURN_Z - 6.5; // Clear north edge of Bowbazar Crossing (z = -80)
  const endZ = COLLEGE_CROSSING_Z;     // College Street Crossing (z = -396)
  const length = Math.abs(endZ - startZ);
  const centerZ = (startZ + endZ) / 2;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

  // 1. Undivided dark-grey bituminous asphalt carriageway (16m wide, no central Jersey divider)
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: makeAsphaltTexture(),
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.15,
  });
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(COLLEGE_STREET_WIDTH, length), asphaltMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(COLLEGE_STREET_X, 0.012, centerZ);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Faint faded white edge demarcations
  const faintMarkMat = new THREE.MeshStandardMaterial({ color: 0x9da096, roughness: 0.65, transparent: true, opacity: 0.55 });
  for (const side of [-1, 1]) {
    const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.14, length - 12), faintMarkMat);
    edgeLine.rotation.x = -Math.PI / 2;
    edgeLine.position.set(COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 - 0.55), 0.016, centerZ);
    group.add(edgeLine);
  }

  // College Street Crossing perpendicular road at z = COLLEGE_CROSSING_Z
  const crossingRoad = new THREE.Mesh(new THREE.PlaneGeometry(76, 14), asphaltMat);
  crossingRoad.rotation.x = -Math.PI / 2;
  crossingRoad.position.set(COLLEGE_STREET_X, 0.013, COLLEGE_CROSSING_Z - 7);
  crossingRoad.receiveShadow = true;
  group.add(crossingRoad);

  // 2. Central double-track steel tramway rails flush-mounted in the asphalt spine
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8f979e, roughness: 0.24, metalness: 0.88 });
  for (const rx of [-2.85, -1.35, 1.35, 2.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, length + 8), railMat);
    rail.position.set(COLLEGE_STREET_X + rx, 0.01, centerZ);
    group.add(rail);
  }

  // 3. Raised concrete & stone sidewalks (18cm above road grade) on east and west curbs
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9e9a92, roughness: 0.82 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xb8b3a8, roughness: 0.72 });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, length), walkMat);
    walk.position.set(COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 1.4), 0.09, centerZ);
    walk.receiveShadow = true;
    group.add(walk);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, length), curbMat);
    curb.position.set(COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 0.12), 0.1, centerZ);
    group.add(curb);
  }

  // 4. Continuous blue-and-white alternating pedestrian guardrails along both curbs
  const guardrailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.35 });
  const railItems = [];
  const isGateGap = (z) =>
    Math.abs(z - (COLLEGE_TURN_Z - 12)) < 8 ||
    Math.abs(z - (-168)) < 6 ||  // Calcutta Medical College portal
    Math.abs(z - (-235)) < 7 ||  // University of Calcutta portico
    Math.abs(z - (COLLEGE_CROSSING_Z + 8)) < 10;

  let railIdx = 0;
  for (let z = startZ - 10; z > endZ + 10; z -= 2.2) {
    if (isGateGap(z)) { railIdx++; continue; }
    const bandColor = railIdx % 2 === 0 ? 0x1b5fa8 : 0xeef2f5;
    for (const side of [-1, 1]) {
      const gx = COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 0.22);
      railItems.push({ x: gx, y: 0.62, z, sx: 0.07, sy: 0.92, sz: 0.07, color: bandColor });
      railItems.push({ x: gx, y: 1.02, z, sx: 0.06, sy: 0.06, sz: 2.2, color: bandColor });
      railItems.push({ x: gx, y: 0.64, z, sx: 0.05, sy: 0.05, sz: 2.2, color: bandColor });
    }
    railIdx++;
  }
  addInstanced(group, boxGeo, guardrailMat, railItems);

  // 5. Cobra-head LED streetlamps, traction poles, junction boxes & overhead copper catenary
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c666e, roughness: 0.48, metalness: 0.65 });
  const ledHeadMat = new THREE.MeshStandardMaterial({ color: 0xe6f2ff, emissive: 0xcce4ff, emissiveIntensity: 1.2, roughness: 0.3 });
  const boxUtilityMat = new THREE.MeshStandardMaterial({ color: 0x6f777d, roughness: 0.62, metalness: 0.35 });
  const poles = [];
  const lampArms = [];
  const ledHeads = [];
  const junctionBoxes = [];
  const spanWirePts = [];

  for (let z = startZ - 14; z > endZ + 10; z -= 22) {
    for (const side of [-1, 1]) {
      const px = COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 0.48);
      poles.push({ x: px, y: 4.1, z, sx: 0.11, sy: 8.2, sz: 0.11 });
      lampArms.push({ x: px - side * 1.15, y: 7.95, z, sx: 2.3, sy: 0.09, sz: 0.09, rz: side * 0.16 });
      ledHeads.push({ x: px - side * 2.15, y: 8.1, z, sx: 0.58, sy: 0.12, sz: 0.28 });
      if (Math.abs(Math.round(z)) % 44 < 22) {
        junctionBoxes.push({ x: px + side * 0.25, y: 1.65, z: z + 0.8, sx: 0.36, sy: 0.58, sz: 0.28 });
      }
    }
    // Cross-span steel suspension wire anchored across the street
    spanWirePts.push(
      new THREE.Vector3(COLLEGE_STREET_X - 8.48, 6.95, z),
      new THREE.Vector3(COLLEGE_STREET_X + 8.48, 6.95, z)
    );
  }
  addInstanced(group, cylGeo, poleMat, poles);
  addInstanced(group, boxGeo, poleMat, lampArms);
  addInstanced(group, boxGeo, ledHeadMat, ledHeads);
  addInstanced(group, boxGeo, boxUtilityMat, junctionBoxes);

  // Overhead copper tramway catenary wires + parallel black utility cable bundles
  const copperWireMat = new THREE.LineBasicMaterial({ color: 0xa66a38, transparent: true, opacity: 0.88 });
  for (const cx of [-2.1, 2.1]) {
    const contactGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(COLLEGE_STREET_X + cx, 6.15, startZ),
      new THREE.Vector3(COLLEGE_STREET_X + cx, 6.15, endZ),
    ]);
    const messengerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(COLLEGE_STREET_X + cx, 6.85, startZ),
      new THREE.Vector3(COLLEGE_STREET_X + cx, 6.85, endZ),
    ]);
    group.add(new THREE.Line(contactGeo, copperWireMat), new THREE.Line(messengerGeo, copperWireMat));
  }
  const spanGeo = new THREE.BufferGeometry().setFromPoints(spanWirePts);
  group.add(new THREE.LineSegments(spanGeo, new THREE.LineBasicMaterial({ color: 0x3b4248, transparent: true, opacity: 0.78 })));

  const telecomMat = new THREE.LineBasicMaterial({ color: 0x14171a, transparent: true, opacity: 0.85 });
  for (const side of [-1, 1]) {
    for (const dy of [5.1, 5.35]) {
      const tGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 0.55), dy, startZ),
        new THREE.Vector3(COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 0.55), dy, endZ),
      ]);
      group.add(new THREE.Line(tGeo, telecomMat));
    }
  }

  // 6. EAST / RIGHT SIDE (+X): Continuous 3-5 story heritage masonry street canyon
  const heritageConfigs = [
    { base: '#c9a66b', shutter: '#244a32' }, // Ochre + dark green louvers
    { base: '#d9c589', shutter: '#4a3122' }, // Pale yellow + brown louvers
    { base: '#b86852', shutter: '#2a4559' }, // Terracotta + faded blue louvers
    { base: '#cfc8b8', shutter: '#21452e' }, // Weathered off-white + green louvers
    { base: '#9e9a92', shutter: '#3b2b22' }, // Aged grey + dark brown louvers
  ];
  const heritageMats = heritageConfigs.map(
    (c) => new THREE.MeshStandardMaterial({ map: makeWeatheredFacadeTexture(c.base, c.shutter), roughness: 0.86 })
  );
  const darkArcadeMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.9 });
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
  const balconies = [];
  const arcadeBays = [];

  const eastWallX = COLLEGE_STREET_X + COLLEGE_STREET_WIDTH / 2 + 2.8; // Flush with eastern sidewalk edge
  let blockIdx = 0;
  for (let z = startZ - 14; z > endZ + 28; z -= 20) {
    const h = 12.5 + (blockIdx % 3) * 2.8; // 3-5 stories
    const depth = 11.5;
    const mat = heritageMats[blockIdx % heritageMats.length];
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(depth, h, 19.6), mat);
    bldg.position.set(eastWallX + depth / 2, h / 2, z);
    bldg.receiveShadow = true;
    group.add(bldg);

    // Ground-floor recessed colonnaded arcade bays
    for (let bz = -6.5; bz <= 6.5; bz += 6.5) {
      arcadeBays.push({ x: eastWallX + 0.35, y: 1.9, z: z + bz, sx: 0.8, sy: 3.6, sz: 4.4, color: 0x17191c });
    }
    // Cantilevered upper-level concrete & wrought-iron balconies
    if (blockIdx % 2 === 0) {
      balconies.push(
        { x: eastWallX - 0.55, y: 5.2, z, sx: 1.1, sy: 0.22, sz: 9.2, color: 0xbab3a6 },
        { x: eastWallX - 1.05, y: 5.75, z, sx: 0.08, sy: 0.9, sz: 9.2, color: 0x1a1e22 }
      );
    }
    blockIdx++;
  }
  addInstanced(group, boxGeo, darkArcadeMat, arcadeBays);
  addInstanced(group, boxGeo, balconyMat, balconies);

  // 7. WEST / LEFT SIDE (-X): Institutional Landmarks & Corner Blocks
  const westWallX = COLLEGE_STREET_X - COLLEGE_STREET_WIDTH / 2 - 2.8;

  // 7A. Early Heritage Block before Medical College (z = -90 to -126)
  const westEarly = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 34), heritageMats[1]);
  westEarly.position.set(westWallX - 5.5, 7, -109);
  group.add(westEarly);

  // 7B. Calcutta Medical College (z = -130 to -205): Red-ochre perimeter wall + portal + red-brick colonial block
  const medWallMat = new THREE.MeshStandardMaterial({ color: 0xa34b39, roughness: 0.82 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xeee9dd, roughness: 0.72 });
  const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x265a96, roughness: 0.68 });
  for (const [wz, wlen] of [[-146, 32], [-190, 32]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, wlen), medWallMat);
    wall.position.set(westWallX - 0.35, 1.6, wz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, wlen), trimMat);
    cap.position.set(westWallX - 0.35, 3.25, wz);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, wlen), blueTrimMat);
    stripe.position.set(westWallX - 0.35, 2.75, wz);
    group.add(wall, cap, stripe);
  }
  // Monumental Neoclassical Entrance Portal (z = -168)
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.8, 9.5), trimMat);
  portalArch.position.set(westWallX - 0.6, 2.9, -168);
  const portalVoid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 5.2), darkArcadeMat);
  portalVoid.position.set(westWallX - 0.6, 2.1, -168);
  group.add(portalArch, portalVoid);

  // Red-brick colonial institutional block set back behind the perimeter wall
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x82362a, roughness: 0.85 });
  const medBlock = new THREE.Mesh(new THREE.BoxGeometry(16, 17, 66), brickMat);
  medBlock.position.set(westWallX - 15, 8.5, -168);
  group.add(medBlock);
  // White pilasters along Medical College facade
  const pilasters = [];
  for (let pz = -196; pz <= -140; pz += 8) {
    pilasters.push({ x: westWallX - 6.8, y: 8.5, z: pz, sx: 0.6, sy: 17, sz: 0.9, color: 0xf0ece1 });
  }
  addInstanced(group, boxGeo, balconyMat, pilasters);

  // 7C. University of Calcutta (z = -215 to -295): Classical Wing + Modernist Brise-Soleil Tower
  const neoWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf0ece1, roughness: 0.68 });
  const cuClassical = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 38), neoWhiteMat);
  cuClassical.position.set(westWallX - 8.5, 8, -234);
  const cuPortico = new THREE.Mesh(new THREE.BoxGeometry(3.2, 13.5, 16), neoWhiteMat);
  cuPortico.position.set(westWallX - 1.6, 6.75, -234);
  group.add(cuClassical, cuPortico);
  // Giant Corinthian/Ionic columns
  const cuCols = [];
  for (let cz = -241; cz <= -227; cz += 3.5) {
    cuCols.push({ x: westWallX - 0.35, y: 6.5, z: cz, sx: 0.45, sy: 13, sz: 0.45, color: 0xf7f4ec });
  }
  addInstanced(group, cylGeo, balconyMat, cuCols);

  // Modernist Wing (8-10 story concrete tower with vertical brise-soleil fins & horizontal slab bands)
  const modConcreteMat = new THREE.MeshStandardMaterial({ color: 0xc8c5bc, roughness: 0.78 });
  const cuModern = new THREE.Mesh(new THREE.BoxGeometry(16, 30, 34), modConcreteMat);
  cuModern.position.set(westWallX - 9.0, 15, -276);
  group.add(cuModern);
  const briseItems = [];
  for (let fz = -291; fz <= -261; fz += 2.4) {
    briseItems.push({ x: westWallX - 0.7, y: 15, z: fz, sx: 0.9, sy: 29, sz: 0.22, color: 0xdedbd2 });
  }
  for (let fy = 4; fy <= 28; fy += 3.4) {
    briseItems.push({ x: westWallX - 0.7, y: fy, z: -276, sx: 0.95, sy: 0.32, sz: 34, color: 0xb0ada4 });
  }
  addInstanced(group, boxGeo, balconyMat, briseItems);

  // 7D. Calcutta University Institute / Academic Halls (z = -302 to -348)
  const cuInst = new THREE.Mesh(new THREE.BoxGeometry(14, 15, 44), neoWhiteMat);
  cuInst.position.set(westWallX - 7.0, 7.5, -325);
  group.add(cuInst);

  // 7E. College Street Crossing Commercial Corner Blocks (z = -356 to -388, both sides)
  const cornerMat = new THREE.MeshStandardMaterial({ color: 0xbcb5a6, roughness: 0.82 });
  for (const side of [-1, 1]) {
    const cx = side < 0 ? westWallX - 7.5 : eastWallX + 7.5;
    const corner = new THREE.Mesh(new THREE.BoxGeometry(15, 18, 30), cornerMat);
    corner.position.set(cx, 9, -372);
    group.add(corner);
    // Double-height pillared ground-floor arcade
    const pillars = [];
    const px = side < 0 ? westWallX - 0.45 : eastWallX + 0.45;
    for (let pz = -384; pz <= -360; pz += 4.8) {
      pillars.push({ x: px, y: 2.8, z: pz, sx: 0.75, sy: 5.6, sz: 0.75, color: 0xd6d0c4 });
    }
    addInstanced(group, boxGeo, balconyMat, pillars);
  }

  // 8. Mature Deciduous Banyan/Peepal & Palm Canopy arching over sidewalks
  const treeSlots = [];
  for (let z = startZ - 22; z > endZ + 18; z -= 26) {
    for (const side of [-1, 1]) {
      treeSlots.push({
        x: COLLEGE_STREET_X + side * (COLLEGE_STREET_WIDTH / 2 + 1.4),
        z,
        height: 8.5 + (Math.abs(Math.round(z)) % 3) * 1.4,
        modelIdx: (Math.abs(Math.round(z / 26)) + (side > 0 ? 1 : 0)) % DEFAULT_TREE_MODELS.length,
      });
    }
  }
  DEFAULT_TREE_MODELS.forEach((url, idx) => {
    loadGLTF(url)
      .then((gltf) => {
        const tpl = normalizeTreeModel(gltf.scene.clone(true));
        for (const slot of treeSlots) {
          if (slot.modelIdx !== idx) continue;
          const tree = tpl.clone(true);
          tree.scale.setScalar(slot.height);
          tree.position.set(slot.x, 0.16, slot.z);
          tree.rotation.y = (slot.x + slot.z) * 0.35;
          group.add(tree);
        }
      })
      .catch(() => {});
  });

  // 9. Traffic signal gantries at Bowbazar Crossing & College Street Crossing
  const signalMat = new THREE.MeshStandardMaterial({ color: 0x303638, roughness: 0.45, metalness: 0.5 });
  const greenLampMat = new THREE.MeshStandardMaterial({ color: 0x39d876, emissive: 0x39d876, emissiveIntensity: 1.6 });
  for (const sz of [startZ - 2, endZ + 6]) {
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.24, 0.24), poleMat);
    gantry.position.set(COLLEGE_STREET_X, 6.8, sz);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.8, 0.45), signalMat);
    housing.position.set(COLLEGE_STREET_X, 5.7, sz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), greenLampMat);
    bulb.position.set(COLLEGE_STREET_X, 5.2, sz + 0.25);
    group.add(gantry, housing, bulb);
  }

  // Night lighting along the College Street canyon
  const streetLights = [];
  for (const lz of [-130, -210, -290, -365]) {
    const pl = new THREE.PointLight(0xdceeff, 18, 70, 1.35);
    pl.position.set(COLLEGE_STREET_X, 7.6, lz);
    group.add(pl);
    streetLights.push(pl);
  }

  return {
    group,
    setNightMode(isNight) {
      ledHeadMat.emissiveIntensity = isNight ? 1.4 : 0.2;
      for (const pl of streetLights) pl.intensity = isNight ? 18 : 0;
    },
  };
}
