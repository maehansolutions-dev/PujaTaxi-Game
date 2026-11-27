import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadGLTF } from './gltfCache.js';
import { roadAngle, roadCenterX } from './roadLayout.js';

const names = ['Ananya', 'Arjun', 'Moumita', 'Ritwik', 'Soham', 'Ishita', 'Debashis', 'Riya'];
const places = ['Howrah Station', 'College Street', 'Esplanade', 'Park Street', 'Burrabazar', 'Prinsep Ghat', 'Shyambazar', 'Sealdah'];
const quotes = [
  'Dada, please take the quickest route.',
  'Could you drop me near the main entrance?',
  'Please avoid the busiest crossing if you can.',
  'I am in a bit of a hurry, dada.',
];

const HITCHHIKER_MODEL_URL = './models/samp_person2.glb';
const TARGET_HEIGHT = 1.72;

function makePerson() {
  const person = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: [0x4b8a78, 0xb8644f, 0x4d6d9b, 0xc28d3c, 0x8b6390][Math.floor(Math.random() * 5)] });
  const skin = new THREE.MeshLambertMaterial({ color: 0xb87955 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x32383a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.25), shirt);
  torso.position.y = 0.98;
  person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), skin);
  head.position.y = 1.42;
  person.add(head);
  for (const x of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.58, 7), dark);
    leg.position.set(x, 0.32, 0);
    person.add(leg);
  }
  const armPivot = new THREE.Group();
  armPivot.position.set(0.24, 1.24, 0);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.52, 7), shirt);
  arm.position.set(0.18, 0.14, 0);
  arm.rotation.z = -1.05;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), skin);
  hand.position.set(0.42, 0.28, 0);
  armPivot.add(arm, hand);
  person.add(armPivot);
  person.userData.fallbackArm = armPivot;
  person.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  return person;
}

function normalizeHitchhikerModel(srcScene) {
  const clone = SkeletonUtils.clone(srcScene);
  const wrapper = new THREE.Group();
  wrapper.add(clone);

  const toRemove = [];
  clone.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').toLowerCase();
    if (n.includes('plane') || n.includes('floor') || n.includes('ground')) {
      toRemove.push(obj);
    }
  });
  for (const obj of toRemove) obj.parent?.remove(obj);

  clone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = TARGET_HEIGHT / (size.y || 1);
  clone.scale.multiplyScalar(scale);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= scaledBox.min.y;

  clone.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
  });

  // Locate articulated arm bones for hitchhiking / hailing gesture
  let rightArm = null;
  let rightForeArm = null;
  let rightHand = null;
  clone.traverse((obj) => {
    const n = obj.name || '';
    if (n.includes('RightArm')) rightArm = obj;
    else if (n.includes('RightForeArm')) rightForeArm = obj;
    else if (n.includes('RightHand') && !n.includes('Thumb') && !n.includes('Index') && !n.includes('Middle') && !n.includes('Ring') && !n.includes('Pinky')) {
      rightHand = obj;
    }
  });

  return { wrapper, rightArm, rightForeArm, rightHand };
}

function makeMarker(color, radius = 0.36) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.025;
  group.add(disc);
  const beacon = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.52, 0.65, 8), new THREE.MeshBasicMaterial({ color }));
  beacon.position.y = 0.5;
  group.add(beacon);
  return group;
}

export function createPassengerSystem(scene, config, onEvent = () => {}) {
  const waiting = new THREE.Group();
  const fallback = makePerson();
  waiting.add(fallback);

  let modelRig = null;
  loadGLTF(HITCHHIKER_MODEL_URL, { priority: 'high' })
    .then((gltf) => {
      modelRig = normalizeHitchhikerModel(gltf.scene);
      waiting.clear();
      waiting.add(modelRig.wrapper);
    })
    .catch(() => {
      // Keep fallback procedural hitchhiker if GLB fails to load
    });

  const pickupMarker = makeMarker(0xffd04b, 0.48);
  const destinationMarker = makeMarker(0x57dbb0, 0.56);
  scene.add(waiting, pickupMarker, destinationMarker);
  destinationMarker.visible = false;

  let wallet = 0;
  let trip = null;
  let passenger = null;
  let boarding = null;
  let nextSpawn = 0;
  let clock = 0;
  let serial = 0;

  const labels = (id) => ({
    name: names[id % names.length],
    place: places[(id * 3 + 2) % places.length],
    quote: quotes[id % quotes.length],
  });

  function spawn(playerZ) {
    const id = serial++;
    const details = labels(id);
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = playerZ - THREE.MathUtils.randFloat(config.passengerSpawnAheadMinUnits, config.passengerSpawnAheadMaxUnits);
    const x = roadCenterX(z) + side * (config.roadHalfWidth + config.footpathWidth * 0.58);
    passenger = { ...details, x, z, side };
    boarding = null;
    waiting.scale.setScalar(1);
    waiting.position.set(x, 0.14, z);
    // Face the road & slightly toward the oncoming player taxi (+Z)
    waiting.rotation.y = (side < 0 ? Math.PI * 0.35 : -Math.PI * 0.35) + roadAngle(z);
    waiting.visible = true;
    pickupMarker.position.set(x, 0.14, z);
    pickupMarker.visible = true;
    destinationMarker.visible = false;
  }

  function startTrip(playerX, playerZ) {
    const id = serial + Math.floor(Math.random() * 4);
    const destination = labels(id).place;
    const lengthGameMetres = THREE.MathUtils.randFloat(6, 12);
    const distanceUnits = lengthGameMetres * config.worldUnitsPerGameMetre;
    const z = playerZ - distanceUnits;
    const x = roadCenterX(z) + passenger.side * (config.roadHalfWidth + config.footpathWidth * 0.58);
    const fare = lengthGameMetres * config.fareRsPerGameMetre;
    trip = { destination, x, z, fare, distance: distanceUnits };
    boarding = {
      startX: passenger.x,
      startZ: passenger.z,
      targetX: playerX,
      targetZ: playerZ,
      progress: 0,
    };
    passenger = null;
    pickupMarker.visible = false;
    destinationMarker.position.set(x, 0.14, z);
    destinationMarker.visible = true;
    onEvent('pickup', { destination, fare });
  }

  function dropOff() {
    wallet += trip.fare;
    const amount = trip.fare;
    trip = null;
    destinationMarker.visible = false;
    nextSpawn = clock + config.passengerRespawnDelay;
    onEvent('dropoff', { fare: amount, wallet });
  }

  function animateHitchhikerWave(time) {
    const wave = Math.sin(time * 5.2);
    if (modelRig?.rightArm) {
      // Raise right arm outward & upward in a hitchhiking / taxi-hailing wave
      modelRig.rightArm.rotation.z = -0.85 + wave * 0.16;
      modelRig.rightArm.rotation.x = -0.45;
      if (modelRig.rightForeArm) {
        modelRig.rightForeArm.rotation.z = -0.35 + wave * 0.22;
      }
      if (modelRig.rightHand) {
        modelRig.rightHand.rotation.z = wave * 0.25;
      }
    } else if (fallback.userData.fallbackArm) {
      fallback.userData.fallbackArm.rotation.z = wave * 0.18;
    }
  }

  function update(playerX, playerZ, speed, dt) {
    clock += dt;
    const slow = Math.abs(speed) <= config.passengerPickupMaxKmh;
    if (!trip && !passenger && clock >= nextSpawn) spawn(playerZ);

    if (passenger) {
      animateHitchhikerWave(clock);
      pickupMarker.position.y = 0.14 + Math.sin(clock * 3.8) * 0.045;
      const distance = Math.hypot(passenger.x - playerX, passenger.z - playerZ);
      if (distance <= config.passengerPickupRadiusUnits && slow) {
        startTrip(playerX, playerZ);
      } else if (playerZ < passenger.z - config.passengerMissedUnits) {
        passenger = null;
        waiting.visible = pickupMarker.visible = false;
        nextSpawn = clock + config.passengerRespawnDelay;
      }
    } else if (boarding) {
      boarding.progress = Math.min(1, boarding.progress + dt * 1.9);
      const t = boarding.progress;
      const bx = THREE.MathUtils.lerp(boarding.startX, playerX, t);
      const bz = THREE.MathUtils.lerp(boarding.startZ, playerZ, t);
      const bob = Math.abs(Math.sin(t * Math.PI * 3)) * 0.05;
      waiting.position.set(bx, 0.14 * (1 - t) + bob, bz);
      waiting.scale.setScalar(1 - t * 0.35);
      if (modelRig?.rightArm) {
        modelRig.rightArm.rotation.z = THREE.MathUtils.lerp(modelRig.rightArm.rotation.z, 0, t);
      }
      if (t >= 1) {
        boarding = null;
        waiting.visible = false;
        waiting.scale.setScalar(1);
      }
    }

    if (trip) {
      destinationMarker.position.y = 0.14 + Math.sin(clock * 3.2) * 0.035;
      const distance = Math.hypot(trip.x - playerX, trip.z - playerZ);
      if (distance <= config.destinationStopRadiusUnits && slow) dropOff();
    }
  }

  function getSnapshot(playerX, playerZ) {
    return {
      wallet,
      passenger: passenger ? { ...passenger } : null,
      trip: trip ? { ...trip, remaining: Math.hypot(trip.x - playerX, trip.z - playerZ) } : null,
      pickup: passenger ? { x: passenger.x, z: passenger.z } : null,
      destination: trip ? { x: trip.x, z: trip.z } : null,
      status: trip ? 'PASSENGER ON BOARD' : passenger ? 'PICK UP PASSENGER' : 'LOOKING FOR A FARE',
    };
  }
  return { update, getSnapshot };
}
