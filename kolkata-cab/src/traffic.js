import * as THREE from 'three';

const UNIT_PER_KMH = 0.38 / 3.6;
const trafficPalette = [0xe8c72d, 0x3974a8, 0xd9e2dd, 0x4b9a6c, 0xc64d3f, 0xe9e4d6, 0x3f555a];
const styles = [
  { sx: 1, sy: 1, sz: 1 },
  { sx: 1.12, sy: 1.16, sz: 1.7 },
  { sx: 0.74, sy: 0.77, sz: 0.82 },
];

function randomBetween(a, b) { return a + Math.random() * (b - a); }
function makeBox(w, h, d, material) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); }

function createSignal(z, index) {
  const root = new THREE.Group();
  root.position.set(0, 0, z);
  const metal = new THREE.MeshLambertMaterial({ color: 0x414a4b, flatShading: true });
  const post = makeBox(0.22, 7.2, 0.22, metal); post.position.set(-9.25, 3.6, 0); root.add(post);
  const arm = makeBox(0.18, 0.18, 18.5, metal); arm.position.set(0, 7.1, 0); root.add(arm);
  const boxMat = new THREE.MeshLambertMaterial({ color: 0x303638, flatShading: true });
  const housing = makeBox(0.8, 2.05, 0.62, boxMat); housing.position.set(0, 5.65, 0); root.add(housing);
  const lamps = [0xff3c34, 0xffc440, 0x39d876].map((color, i) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x161b1b, emissive: 0x000000, roughness: 0.26 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), material);
    bulb.position.set(0, 6.31 - i * 0.65, 0.34);
    root.add(bulb);
    return { material, color };
  });

  // Traffic constable on a small painted podium, with an animated stop/go arm.
  const podium = makeBox(0.8, 0.66, 0.8, new THREE.MeshLambertMaterial({ color: 0x9b4d37 }));
  podium.position.set(11.4, 0.33, 1.1); root.add(podium);
  const uniform = new THREE.MeshLambertMaterial({ color: 0xf2f0e5, flatShading: true });
  const skin = new THREE.MeshLambertMaterial({ color: 0x9c674a, flatShading: true });
  const officer = new THREE.Group(); officer.position.set(11.4, 0.66, 1.1); root.add(officer);
  const torso = makeBox(0.5, 0.75, 0.3, uniform); torso.position.y = 0.73; officer.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), skin); head.position.y = 1.28; officer.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 9), new THREE.MeshLambertMaterial({ color: 0x263d52 })); cap.position.y = 1.46; officer.add(cap);
  const armGroup = new THREE.Group(); armGroup.position.set(0.28, 0.98, 0); officer.add(armGroup);
  const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.57, 7), uniform); armMesh.position.y = 0.27; armGroup.add(armMesh);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), skin); hand.position.y = 0.56; armGroup.add(hand);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData.lamps = lamps;
  root.userData.arm = armGroup;
  root.userData.index = index;
  return root;
}

function createAudioHorn() {
  let context;
  function getContext() {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    return context;
  }
  return function honk(volume = 0.11) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const audio = getContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    for (const [i, frequency] of [392, 494].entries()) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + i * 0.025);
      gain.gain.exponentialRampToValueAtTime(volume / (i + 1), now + i * 0.025 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(now + i * 0.025); oscillator.stop(now + 0.34);
    }
  };
}

function makeRainLayer(count, zNear, zFar, opacity, streakLength) {
  const positions = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = randomBetween(-23, 23), y = randomBetween(-8, 14), z = randomBetween(zNear, zFar);
    const offset = i * 6;
    positions[offset] = x; positions[offset + 1] = y; positions[offset + 2] = z;
    positions[offset + 3] = x - streakLength * 0.16; positions[offset + 4] = y - streakLength; positions[offset + 5] = z + 0.08;
    speeds[i] = randomBetween(17, 28);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc5d6dc, transparent: true, opacity, depthWrite: false }));
  mesh.frustumCulled = false;
  mesh.userData.speeds = speeds;
  mesh.userData.count = count;
  return mesh;
}

function makeRain(scene, count, opacity) {
  const rainGroup = new THREE.Group();
  const layers = [makeRainLayer(Math.round(count * 0.62), -10, 11, opacity, 0.62), makeRainLayer(Math.round(count * 0.38), -38, -13, opacity * 0.62, 0.92)];
  rainGroup.add(...layers);
  scene.add(rainGroup);
  const splashMaterial = new THREE.MeshBasicMaterial({ color: 0x9ab6bb, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  const splashes = new THREE.InstancedMesh(new THREE.TorusGeometry(0.09, 0.007, 4, 16), splashMaterial, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    dummy.position.set(randomBetween(-7.8, 7.8), -0.022, randomBetween(-13, 8));
    dummy.rotation.set(-Math.PI / 2, 0, randomBetween(0, Math.PI));
    const size = randomBetween(0.65, 1.6);
    dummy.scale.set(size, size, size);
    dummy.updateMatrix(); splashes.setMatrixAt(i, dummy.matrix);
  }
  splashes.instanceMatrix.needsUpdate = true;
  scene.add(splashes);
  return {
    update(dt, cameraPosition) {
      rainGroup.position.copy(cameraPosition);
      splashes.position.set(cameraPosition.x, 0, cameraPosition.z);
      for (const rain of layers) {
        const positions = rain.geometry.attributes.position.array;
        const speeds = rain.userData.speeds;
        for (let i = 0; i < rain.userData.count; i++) {
          const at = i * 6;
          positions[at + 1] -= speeds[i] * dt;
          positions[at + 4] -= speeds[i] * dt;
          if (positions[at + 1] < -8) {
            const x = randomBetween(-23, 23), y = randomBetween(10, 16), z = randomBetween(rain === layers[0] ? -10 : -38, rain === layers[0] ? 11 : -13);
            positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
            positions[at + 3] = x - (rain === layers[0] ? 0.62 : 0.92) * 0.16;
            positions[at + 4] = y - (rain === layers[0] ? 0.62 : 0.92);
            positions[at + 5] = z + 0.08;
          }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
    },
  };
}

function makeInstance(geometry, material, max) {
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.count = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

export function createTrafficSystem(scene, config, onEvent = () => {}) {
  const bodyMesh = makeInstance(new THREE.BoxGeometry(1.72, 0.72, 3.45), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), config.trafficCount);
  const cabinMesh = makeInstance(new THREE.BoxGeometry(1.48, 0.68, 1.75), new THREE.MeshLambertMaterial({ color: 0x334044, flatShading: true }), config.trafficCount);
  const wheelMesh = makeInstance(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 9), new THREE.MeshLambertMaterial({ color: 0x222627, flatShading: true }), config.trafficCount * 4);
  wheelMesh.geometry.rotateZ(Math.PI / 2);
  const lampMesh = makeInstance(new THREE.BoxGeometry(0.2, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }), config.trafficCount * 4);
  scene.add(bodyMesh, cabinMesh, wheelMesh, lampMesh);

  const agents = Array.from({ length: config.trafficCount }, (_, i) => {
    const direction = i % 2 ? 1 : -1;
    const jam = i % 5 === 0 || i % 5 === 1;
    return {
      direction,
      laneX: direction < 0 ? 3.2 : -3.2,
      z: -45 - i * 27 + randomBetween(-8, 8),
      speed: jam ? randomBetween(config.jamSpeedMin, config.jamSpeedMax) : randomBetween(config.trafficSpeedMin, config.trafficSpeedMax),
      jamSpeed: randomBetween(config.jamSpeedMin, config.jamSpeedMax),
      jam,
      style: i % styles.length,
      color: trafficPalette[i % trafficPalette.length],
      brake: false,
    };
  });

  const signalSpacing = config.signalSpacing;
  const signals = Array.from({ length: config.signalCount }, (_, i) => {
    const group = createSignal(-130 - i * signalSpacing, i);
    scene.add(group);
    return group;
  });
  const rain = makeRain(scene, config.rainParticleCount, config.rainOpacity);
  const honk = createAudioHorn();
  const base = new THREE.Object3D();
  const part = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  let elapsed = 0;
  let playerLastZ = 0;
  let wanted = 0;
  let lastOffence = -100;
  let lastOffenceTime = -100;
  let randomHonkAt = randomBetween(3, 8);

  function addWanted(reason) {
    if (elapsed - lastOffenceTime < config.wantedCooldownSeconds) return;
    wanted = Math.min(3, wanted + 1);
    lastOffenceTime = elapsed;
    lastOffence = elapsed;
    onEvent('wanted', { level: wanted, reason });
  }

  function setPart(mesh, index, agent, localPosition, localScale, rotationY = 0) {
    base.position.set(agent.laneX, 0, agent.z);
    base.rotation.set(0, agent.direction < 0 ? 0 : Math.PI, 0);
    base.scale.set(styles[agent.style].sx, styles[agent.style].sy, styles[agent.style].sz);
    base.updateMatrix();
    part.position.set(...localPosition);
    part.rotation.set(0, rotationY, 0);
    part.scale.set(...localScale);
    part.updateMatrix();
    matrix.multiplyMatrices(base.matrix, part.matrix);
    mesh.setMatrixAt(index, matrix);
  }

  function updateInstances() {
    let wheelIndex = 0, lampIndex = 0;
    agents.forEach((agent, i) => {
      const style = styles[agent.style];
      setPart(bodyMesh, i, agent, [0, 0.72 * style.sy, 0], [1, 1, 1]);
      bodyMesh.setColorAt(i, new THREE.Color(agent.color));
      setPart(cabinMesh, i, agent, [0, 1.34 * style.sy, -0.08], [1, 1, 1]);
      for (const sx of [-0.71, 0.71]) for (const sz of [-1.12, 1.12]) {
        setPart(wheelMesh, wheelIndex++, agent, [sx, 0.33, sz], [1, 1, 1]);
      }
      const frontZ = agent.direction < 0 ? -1.71 : 1.71;
      const rearZ = -frontZ;
      for (const x of [-0.58, 0.58]) {
        const front = lampIndex++;
        setPart(lampMesh, front, agent, [x, 0.69, frontZ], [1, 1, 1]);
        lampMesh.setColorAt(front, new THREE.Color(0xfff0ba));
        const rear = lampIndex++;
        setPart(lampMesh, rear, agent, [x, 0.69, rearZ], [1, 1, 1]);
        lampMesh.setColorAt(rear, new THREE.Color(agent.brake ? 0xff2417 : 0xa62c25));
      }
    });
    bodyMesh.count = agents.length;
    cabinMesh.count = agents.length;
    wheelMesh.count = wheelIndex;
    lampMesh.count = lampIndex;
    for (const mesh of [bodyMesh, cabinMesh, wheelMesh, lampMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  function setSignalState(signal, state) {
    signal.userData.state = state;
    signal.userData.lamps.forEach((lamp, i) => {
      const active = (state === 'red' && i === 0) || (state === 'yellow' && i === 1) || (state === 'green' && i === 2);
      lamp.material.color.setHex(active ? lamp.color : 0x171b1b);
      lamp.material.emissive.setHex(active ? lamp.color : 0x000000);
      lamp.material.emissiveIntensity = active ? 2.2 : 0;
    });
  }

  function update(playerX, playerZ, speedKmh, dt, cameraPosition) {
    elapsed += dt;
    const phase = elapsed % config.signalCycleSeconds;
    const redEnd = config.signalRedSeconds;
    const yellowEnd = redEnd + config.signalYellowSeconds;
    const lightState = phase < redEnd ? 'red' : phase < yellowEnd ? 'yellow' : 'green';
    signals.forEach((signal) => {
      setSignalState(signal, lightState);
      signal.userData.arm.rotation.z = 0.12 + Math.sin(elapsed * 3 + signal.userData.index) * 0.18;
      if (playerLastZ > signal.position.z && playerZ <= signal.position.z) {
        if (signal.userData.state === 'red') addWanted('Ran a red light');
        else if (Math.abs(speedKmh) > config.policeStopSpeedKmh && phase < yellowEnd) addWanted('Ignored the traffic constable');
      }
      if (signal.position.z > playerZ + config.signalRecycleBehindUnits) {
        const farthest = Math.min(...signals.map((item) => item.position.z));
        signal.position.z = farthest - signalSpacing;
      }
    });

    agents.forEach((agent) => {
      const jamZone = Math.abs(agent.z % config.jamZoneLength) < config.jamZoneHalfLength;
      agent.brake = agent.jam && jamZone;
      const speed = agent.brake ? agent.jamSpeed : agent.speed;
      agent.z += agent.direction * speed * UNIT_PER_KMH * dt;
      const dx = Math.abs(agent.laneX - playerX);
      const dz = Math.abs(agent.z - playerZ);
      if (dx < config.collisionHalfWidth && dz < config.collisionHalfLength && Math.abs(speedKmh) > 10) {
        addWanted('Taxi collision');
        agent.z = playerZ - (agent.direction < 0 ? 380 : -380);
      }
      if (agent.z < playerZ - config.trafficRecycleAheadUnits) {
        agent.z = playerZ + randomBetween(80, 390);
      } else if (agent.z > playerZ + config.trafficRecycleBehindUnits) {
        agent.z = playerZ - randomBetween(120, 480);
      }
    });
    if (elapsed - lastOffence >= config.wantedEscapeSeconds && wanted > 0 && lastOffence > 0) {
      wanted = 0;
      lastOffence = -100;
      onEvent('wantedReset', { level: 0 });
    }
    if (elapsed >= randomHonkAt) {
      const jamNear = agents.some((agent) => agent.brake && Math.abs(agent.z - playerZ) < 90);
      if (jamNear && Math.random() < 0.58) honk(0.065);
      randomHonkAt = elapsed + randomBetween(4, 10);
    }
    if (cameraPosition) rain.update(dt, cameraPosition);
    updateInstances();
    playerLastZ = playerZ;
  }

  return {
    update,
    honk: () => honk(0.14),
    getWanted: () => wanted,
  };
}
