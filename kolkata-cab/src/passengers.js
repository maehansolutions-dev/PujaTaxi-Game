import * as THREE from 'three';

const names = ['Ananya', 'Arjun', 'Moumita', 'Ritwik', 'Soham', 'Ishita', 'Debashis', 'Riya'];
const places = ['Howrah Station', 'College Street', 'Esplanade', 'Park Street', 'Burrabazar', 'Prinsep Ghat', 'Shyambazar', 'Sealdah'];
const quotes = [
  'Dada, please take the quickest route.',
  'Could you drop me near the main entrance?',
  'Please avoid the busiest crossing if you can.',
  'I am in a bit of a hurry, dada.',
];

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
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.52, 7), shirt);
  arm.position.set(0.3, 1.18, 0);
  arm.rotation.z = -0.92;
  person.add(arm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), skin);
  hand.position.set(0.49, 1.42, 0);
  person.add(hand);
  person.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return person;
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
  const waiting = makePerson();
  const pickupMarker = makeMarker(0xffd04b, 0.48);
  const destinationMarker = makeMarker(0x57dbb0, 0.56);
  scene.add(waiting, pickupMarker, destinationMarker);
  destinationMarker.visible = false;
  let wallet = 0;
  let trip = null;
  let passenger = null;
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
    const x = side * (config.roadHalfWidth + config.footpathWidth * 0.58);
    passenger = { ...details, x, z, side };
    waiting.position.set(x, 0.14, z);
    waiting.visible = true;
    pickupMarker.position.set(x, 0.14, z);
    pickupMarker.visible = true;
    destinationMarker.visible = false;
  }

  function startTrip(playerZ) {
    const id = serial + Math.floor(Math.random() * 4);
    const destination = labels(id).place;
    const lengthGameMetres = THREE.MathUtils.randFloat(6, 12);
    const distanceUnits = lengthGameMetres * config.worldUnitsPerGameMetre;
    const x = passenger.x;
    const z = playerZ - Math.sqrt(Math.max(0, distanceUnits ** 2 - (passenger.x - x) ** 2));
    const fare = lengthGameMetres * config.fareRsPerGameMetre;
    trip = { destination, x, z, fare, distance: distanceUnits };
    passenger = null;
    waiting.visible = false;
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

  function update(playerX, playerZ, speed, dt) {
    clock += dt;
    const slow = Math.abs(speed) <= config.passengerPickupMaxKmh;
    if (!trip && !passenger && clock >= nextSpawn) spawn(playerZ);
    if (passenger) {
      pickupMarker.position.y = 0.14 + Math.sin(clock * 3.8) * 0.045;
      const distance = Math.hypot(passenger.x - playerX, passenger.z - playerZ);
      if (distance <= config.passengerPickupRadiusUnits && slow) startTrip(playerZ);
      else if (playerZ < passenger.z - config.passengerMissedUnits) {
        passenger = null;
        waiting.visible = pickupMarker.visible = false;
        nextSpawn = clock + config.passengerRespawnDelay;
      }
    } else if (trip) {
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
