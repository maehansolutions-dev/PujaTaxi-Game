import * as THREE from 'three';
import { roadAngle, roadCenterX } from './roadLayout.js';

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function makeBox(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function createSignal(z, index) {
  const root = new THREE.Group();
  root.position.set(0, 0, z);
  const metal = new THREE.MeshLambertMaterial({ color: 0x414a4b, flatShading: true });
  const post = makeBox(0.22, 7.2, 0.22, metal);
  post.position.set(-9.25, 3.6, 0);
  root.add(post);
  const arm = makeBox(0.18, 0.18, 18.5, metal);
  arm.position.set(0, 7.1, 0);
  root.add(arm);
  const boxMat = new THREE.MeshLambertMaterial({ color: 0x303638, flatShading: true });
  const housing = makeBox(0.8, 2.05, 0.62, boxMat);
  housing.position.set(0, 5.65, 0);
  root.add(housing);
  const lamps = [0xff3c34, 0xffc440, 0x39d876].map((color, i) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x161b1b, emissive: 0x000000, roughness: 0.26 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), material);
    bulb.position.set(0, 6.31 - i * 0.65, 0.34);
    root.add(bulb);
    return { material, color };
  });

  // Traffic constable on a small painted podium, with an animated stop/go arm.
  const podium = makeBox(0.8, 0.66, 0.8, new THREE.MeshLambertMaterial({ color: 0x9b4d37 }));
  podium.position.set(11.4, 0.33, 1.1);
  root.add(podium);
  const uniform = new THREE.MeshLambertMaterial({ color: 0xf2f0e5, flatShading: true });
  const skin = new THREE.MeshLambertMaterial({ color: 0x9c674a, flatShading: true });
  const officer = new THREE.Group();
  officer.position.set(11.4, 0.66, 1.1);
  root.add(officer);
  const torso = makeBox(0.5, 0.75, 0.3, uniform);
  torso.position.y = 0.73;
  officer.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), skin);
  head.position.y = 1.28;
  officer.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 9), new THREE.MeshLambertMaterial({ color: 0x263d52 }));
  cap.position.y = 1.46;
  officer.add(cap);
  const armGroup = new THREE.Group();
  armGroup.position.set(0.28, 0.98, 0);
  officer.add(armGroup);
  const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.57, 7), uniform);
  armMesh.position.y = 0.27;
  armGroup.add(armMesh);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), skin);
  hand.position.y = 0.56;
  armGroup.add(hand);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });
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
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now + i * 0.025);
      oscillator.stop(now + 0.34);
    }
  };
}

function makeRainLayer(count, zNear, zFar, opacity, streakLength) {
  const positions = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = randomBetween(-23, 23);
    const y = randomBetween(-8, 14);
    const z = randomBetween(zNear, zFar);
    const offset = i * 6;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    positions[offset + 3] = x - streakLength * 0.16;
    positions[offset + 4] = y - streakLength;
    positions[offset + 5] = z + 0.08;
    speeds[i] = randomBetween(17, 28);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mesh = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xc5d6dc, transparent: true, opacity, depthWrite: false })
  );
  mesh.frustumCulled = false;
  mesh.userData.speeds = speeds;
  mesh.userData.count = count;
  return mesh;
}

function makeRain(scene, count, opacity) {
  const rainGroup = new THREE.Group();
  const layers = [
    makeRainLayer(Math.round(count * 0.62), -10, 11, opacity, 0.62),
    makeRainLayer(Math.round(count * 0.38), -38, -13, opacity * 0.62, 0.92),
  ];
  rainGroup.add(...layers);
  scene.add(rainGroup);

  const splashMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ab6bb,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const splashes = new THREE.InstancedMesh(new THREE.TorusGeometry(0.09, 0.007, 4, 16), splashMaterial, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    dummy.position.set(randomBetween(-7.8, 7.8), -0.022, randomBetween(-13, 8));
    dummy.rotation.set(-Math.PI / 2, 0, randomBetween(0, Math.PI));
    const size = randomBetween(0.65, 1.6);
    dummy.scale.set(size, size, size);
    dummy.updateMatrix();
    splashes.setMatrixAt(i, dummy.matrix);
  }
  splashes.instanceMatrix.needsUpdate = true;
  scene.add(splashes);

  return {
    setVisible(visible) {
      const show = Boolean(visible);
      rainGroup.visible = show;
      splashes.visible = show;
    },
    update(dt, cameraPosition) {
      if (!rainGroup.visible) return;
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
            const x = randomBetween(-23, 23);
            const y = randomBetween(10, 16);
            const z = randomBetween(rain === layers[0] ? -10 : -38, rain === layers[0] ? 11 : -13);
            positions[at] = x;
            positions[at + 1] = y;
            positions[at + 2] = z;
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

export function createTrafficSystem(scene, config, onEvent = () => {}) {
  const signalSpacing = config.signalSpacing;
  const signals = Array.from({ length: config.signalCount }, (_, i) => {
    const group = createSignal(-130 - i * signalSpacing, i);
    scene.add(group);
    return group;
  });
  const rain = makeRain(scene, config.rainParticleCount, config.rainOpacity);
  const honk = createAudioHorn();

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

  function setSignalState(signal, state) {
    signal.userData.state = state;
    signal.userData.lamps.forEach((lamp, i) => {
      const active =
        (state === 'red' && i === 0) ||
        (state === 'yellow' && i === 1) ||
        (state === 'green' && i === 2);
      lamp.material.color.setHex(active ? lamp.color : 0x171b1b);
      lamp.material.emissive.setHex(active ? lamp.color : 0x000000);
      lamp.material.emissiveIntensity = active ? 2.2 : 0;
    });
  }

  function update(_playerX, playerZ, speedKmh, dt, cameraPosition) {
    elapsed += dt;
    const phase = elapsed % config.signalCycleSeconds;
    const redEnd = config.signalRedSeconds;
    const yellowEnd = redEnd + config.signalYellowSeconds;
    const lightState = phase < redEnd ? 'red' : phase < yellowEnd ? 'yellow' : 'green';

    signals.forEach((signal) => {
      signal.position.x = roadCenterX(signal.position.z);
      signal.rotation.y = roadAngle(signal.position.z);
      if (signal.userData.state !== lightState) setSignalState(signal, lightState);
      signal.userData.arm.rotation.z = 0.12 + Math.sin(elapsed * 3 + signal.userData.index) * 0.18;
      if (playerLastZ > signal.position.z && playerZ <= signal.position.z) {
        if (signal.userData.state === 'red') addWanted('Ran a red light');
        else if (Math.abs(speedKmh) > config.policeStopSpeedKmh && phase < yellowEnd) {
          addWanted('Ignored the traffic constable');
        }
      }
      if (signal.position.z > playerZ + config.signalRecycleBehindUnits) {
        let farthest = Infinity;
        for (const item of signals) farthest = Math.min(farthest, item.position.z);
        signal.position.z = farthest - signalSpacing;
      }
    });

    if (elapsed - lastOffence >= config.wantedEscapeSeconds && wanted > 0 && lastOffence > 0) {
      wanted = 0;
      lastOffence = -100;
      onEvent('wantedReset', { level: 0 });
    }

    if (elapsed >= randomHonkAt) {
      if (Math.random() < 0.28) honk(0.055);
      randomHonkAt = elapsed + randomBetween(5, 11);
    }

    if (cameraPosition) rain.update(dt, cameraPosition);
    playerLastZ = playerZ;
  }

  return {
    update,
    honk: () => honk(0.14),
    getWanted: () => wanted,
    setRainEnabled: (enabled) => rain.setVisible(enabled),
  };
}
