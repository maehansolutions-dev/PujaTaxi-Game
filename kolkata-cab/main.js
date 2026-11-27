import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPedestrianSystem } from './src/pedestrians.js';
import { createCabinInterior } from './src/interior.js';
import { CONFIG, HORIZON_COLOUR, createWorld } from './src/world.js';
import {
  createTaxi,
  setTaxiBraking,
  setTaxiDoors,
  setTaxiHeadlights,
  setTaxiIndicators,
  updateTaxiDoors,
  updateTaxiIndicators,
  updateTaxiWheels,
} from './src/vehicles.js';
import { createAutoTraffic } from './src/autorickshaw.js';
import { createJettaTraffic } from './src/jetta.js';
import { createBusTraffic } from './src/bus.js';
import { createOpenWorldNetwork } from './src/openworld.js';
import { createVictoriaMemorialLandmark } from './src/victoriaMemorial.js';
import { createPassengerSystem } from './src/passengers.js';
import { createHud } from './src/ui.js';
import { createTrafficSystem } from './src/traffic.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.setClearColor(HORIZON_COLOUR, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.exposure;

const scene = new THREE.Scene();
const road = createWorld(scene, renderer);
const openWorld = createOpenWorldNetwork(scene, CONFIG);
openWorld.setNightMode(road.getTimeOfDay() === 'night');
const victoriaMemorial = createVictoriaMemorialLandmark(scene);
victoriaMemorial.setNightMode(road.getTimeOfDay() === 'night');
const taxi = createTaxi();
scene.add(taxi);

const cabinInterior = createCabinInterior();
taxi.add(cabinInterior.group);

const autoTraffic = createAutoTraffic(scene, {
  glbUrl: './models/autorickshaw.glb',
  companionLaneX: -3.4,
  oncomingCount: 3,
});

const jettaTraffic = createJettaTraffic(scene, {
  glbUrl: './models/volk_jetta.glb',
  sameLaneCount: 2,
  oncomingCount: 3,
});

const busTraffic = createBusTraffic(scene, {
  modelUrls: ['./models/bus1.glb', './models/bus2.glb'],
  sameLaneCount: 2,
  oncomingCount: 2,
});

const pedestrians = createPedestrianSystem(scene, {
  modelUrls: ['./models/samp_person1.glb', './models/samp_person2.glb'],
  count: 10,
  footpathY: 0.14,
});

const headLight = new THREE.SpotLight(0xffe4b0, 22, 50, Math.PI / 4.5, 0.65, 1.5);
headLight.position.set(0, 1.05, -2.0);
headLight.target.position.set(0, 0.05, -20);
taxi.add(headLight, headLight.target);

const headLightPool = new THREE.PointLight(0xffd480, 6.5, 18, 1.8);
headLightPool.position.set(0, 0.5, -6.5);
taxi.add(headLightPool);

const tailLightPool = new THREE.PointLight(0xff2a1e, 1.35, 7, 2.0);
tailLightPool.position.set(0, 0.45, 2.85);
taxi.add(tailLightPool);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 560);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  CONFIG.bloomStrength,
  CONFIG.bloomRadius,
  CONFIG.bloomThreshold
);
composer.addPass(bloomPass);
const vignettePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.12 }, scale: { value: 0.58 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:
    'uniform sampler2D tDiffuse; uniform float strength; uniform float scale; varying vec2 vUv; void main(){ vec4 color=texture2D(tDiffuse,vUv); vec2 p=(vUv-0.5)*2.0; float vignette=1.0-smoothstep(0.2,1.4,dot(p,p)*scale); color.rgb*=mix(1.0, vignette, strength); gl_FragColor=color; }',
});
composer.addPass(vignettePass);
composer.addPass(new OutputPass());

const qualityLevels = ['low', 'medium', 'high'];
let qualityIndex = Math.max(0, qualityLevels.indexOf(CONFIG.quality));
let slowFrameSeconds = 0;
function applyQuality() {
  const quality = qualityLevels[qualityIndex];
  // Bloom is the second most expensive full-screen pass on the medium preset.
  bloomPass.enabled = quality === 'high';
  bloomPass.strength = CONFIG.bloomStrength;
  bloomPass.radius = CONFIG.bloomRadius;
  bloomPass.threshold = CONFIG.bloomThreshold;
  const pixelRatio =
    quality === 'low'
      ? Math.min(window.devicePixelRatio || 1, 1.1)
      : quality === 'medium'
      ? Math.min(window.devicePixelRatio || 1, 1.25)
      : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(innerWidth, innerHeight);
  road.setQuality(quality);
  CONFIG.quality = quality;
}
applyQuality();

const CAMERA_MODES = [
  { id: 'chase', label: 'CHASE CAM', desc: 'Third-person chase camera' },
  { id: 'driver', label: 'DRIVER CAM', desc: 'Driver seat · Drag to look front or left window' },
  { id: 'passengerFront', label: 'PASSENGER · FRONT', desc: 'Passenger seat · Drag 360° around cabin & windows' },
  { id: 'passengerWindow', label: 'PASSENGER · WINDOW', desc: 'Back seat window view · Drag 360°' },
];

const chaseTarget = new THREE.Vector3();
const localWorldPoint = new THREE.Vector3();
const localDirection = new THREE.Vector3();
const worldDirection = new THREE.Vector3();
const clock = new THREE.Clock();
const state = {
  speed: 0,
  distance: 0,
  steer: 0,
  heading: 0,
  lookYaw: 0,
  lookPitch: 0,
  lookPointer: null,
  lookLastX: 0,
  lookLastY: 0,
  wheelInput: 0,
  wheelPointer: null,
  wheelAngleOrigin: 0,
  wheelValueOrigin: 0,
  lateral: -3.2,
  z: 0,
  camera: 'chase',
  paused: false,
  brakeHeld: false,
  brakeTime: 0,
  headlightsOn: true,
  indicator: null,
  backLeftDoorOpen: false,
  frontLeftDoorOpen: false,
};
const keys = new Set();
const $ = (id) => document.getElementById(id);
const controls = {
  speed: $('speedValue'),
  gear: $('gearValue'),
  rpm: $('rpmValue'),
  speedBar: $('speedBar'),
  rpmBar: $('rpmBar'),
  odo: $('distanceValue'),
  camera: $('cameraButton'),
  viewLabel: $('viewLabel'),
  pause: $('pauseButton'),
  toast: $('toast'),
  wheel: $('steeringWheel'),
  helpToggle: $('keyboardHelpToggle'),
  helpPanel: $('keyboardHelp'),
  indicatorLeft: $('indicatorLeft'),
  indicatorRight: $('indicatorRight'),
  brake: document.querySelector('.brake'),
  accelerator: document.querySelector('.accelerator'),
};

function showToast(title, message) {
  if (!controls.toast) return;
  controls.toast.innerHTML = `${title}<span>${message}</span>`;
  controls.toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => controls.toast.classList.remove('visible'), 2300);
}

const passengers = createPassengerSystem(scene, CONFIG, (event, data) => {
  if (event === 'pickup') showToast('PASSENGER ON BOARD', `Destination: ${data.destination}`);
  if (event === 'dropoff') showToast('FARE COMPLETED', `\u20b9${data.fare.toFixed(2)} added to driver cash`);
});
const hud = createHud(CONFIG);
const traffic = createTrafficSystem(scene, CONFIG, (event, data) => {
  if (event === 'wanted' || event === 'wantedReset') {
    const stars = $('wantedStars');
    const status = $('wantedStatus');
    if (stars) {
      [...stars.querySelectorAll('.star')].forEach((star, index) => {
        star.textContent = index < data.level ? '★' : '☆';
      });
      stars.setAttribute('aria-label', `${data.level} of 3 wanted stars`);
    }
    if (status) {
      status.textContent = data.level
        ? `WANTED LEVEL: ${data.level}/3 · ${data.reason.toUpperCase()}`
        : 'WANTED LEVEL: 0/3 · CLEAN RECORD';
    }
    if (event === 'wanted') showToast('WANTED LEVEL RAISED', data.reason);
    else showToast('WANTED LEVEL CLEARED', 'The streets have calmed down');
  }
});

function has(...names) {
  return names.some((name) => keys.has(name));
}
function inputSteer() {
  const keyboard = (has('ArrowLeft', 'a', 'A') ? -1 : 0) + (has('ArrowRight', 'd', 'D') ? 1 : 0);
  return Math.abs(keyboard) > 0 ? keyboard : state.wheelInput;
}

function update(dt) {
  const accelerating = has('ArrowUp', 'w', 'W') || controls.accelerator?.classList.contains('active');
  const braking = has('ArrowDown', 's', 'S') || state.brakeHeld || controls.brake?.classList.contains('active');
  setTaxiBraking(taxi, Boolean(braking));
  if (braking) state.brakeTime += dt;
  else state.brakeTime = 0;
  const reverse = braking && state.brakeTime > 0.4 && Math.abs(state.speed) < 14;
  if (accelerating) state.speed += CONFIG.acceleration * dt;
  else if (reverse) state.speed -= CONFIG.acceleration * 0.58 * dt;
  else if (braking) state.speed = Math.abs(state.speed) < 2 ? 0 : state.speed - Math.sign(state.speed) * CONFIG.braking * dt;
  else if (Math.abs(state.speed) > 0) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), CONFIG.drag * dt);
  state.speed = THREE.MathUtils.clamp(state.speed, -CONFIG.reverseMaxKmh, CONFIG.speedMaxKmh);

  const steerInput = inputSteer();
  state.steer += (steerInput - state.steer) * Math.min(1, dt * 11);

  const moveStep = state.speed * (0.38 / 3.6) * dt;
  const speedFactor = THREE.MathUtils.clamp(Math.abs(state.speed) / 14, 0.2, 1);
  const reverseSign = state.speed < 0 ? -1 : 1;

  if (Math.abs(state.speed) > 0.4) {
    state.heading += -state.steer * 1.65 * speedFactor * dt * reverseSign;
  }

  if (Math.abs(steerInput) < 0.05 && Math.abs(state.speed) > 2) {
    const quarterTurn = Math.PI / 2;
    const nearestCardinal = Math.round(state.heading / quarterTurn) * quarterTurn;
    if (Math.abs(state.heading - nearestCardinal) < 0.16) {
      state.heading = THREE.MathUtils.lerp(state.heading, nearestCardinal, 1 - Math.exp(-3.5 * dt));
    }
  }

  const nextLateral = state.lateral - Math.sin(state.heading) * moveStep;
  const nextZ = state.z - Math.cos(state.heading) * moveStep;

  const resolved = openWorld
    ? openWorld.resolveMovement(
        state.lateral,
        state.z,
        nextLateral,
        nextZ,
        state.heading,
        state.speed,
        dt
      )
    : { x: nextLateral, z: nextZ, heading: state.heading, speed: state.speed };

  state.lateral = resolved.x;
  state.z = resolved.z;
  state.heading = resolved.heading;
  state.speed = resolved.speed;
  state.distance += Math.abs(moveStep);

  const motionScale = Math.min(1, Math.abs(state.speed) / 25);
  taxi.position.set(
    state.lateral,
    Math.sin(performance.now() * 0.006) * Math.min(0.015, Math.abs(state.speed) * 0.00012),
    state.z
  );
  taxi.rotation.y = state.heading;
  taxi.rotation.z = 0;

  taxi.userData.body.rotation.z = -state.steer * 0.012 * motionScale;
  taxi.userData.body.rotation.x = braking && state.speed > 1 ? -0.022 : accelerating ? 0.007 : 0;

  const isNight = road.getTimeOfDay() === 'night';
  headLight.intensity = state.headlightsOn && isNight ? 22 : state.headlightsOn ? 6 : 0;
  headLightPool.intensity = state.headlightsOn && isNight ? 6.5 : 0;
  setTaxiHeadlights(taxi, state.headlightsOn);
  cabinInterior.setHeadlights(state.headlightsOn);

  updateTaxiDoors(taxi, dt);
  const indicatorBlinkOn = updateTaxiIndicators(taxi, performance.now() * 0.001);
  controls.indicatorLeft?.classList.toggle('active', state.indicator === 'left' && indicatorBlinkOn);
  controls.indicatorRight?.classList.toggle('active', state.indicator === 'right' && indicatorBlinkOn);
  updateTaxiWheels(taxi, dt, moveStep / Math.max(dt, 0.0001), -state.steer * 0.32);
  cabinInterior.update(state.steer, performance.now());
  openWorld?.update(state.lateral, state.z, dt);
  autoTraffic?.update(state.lateral, state.z, state.speed, dt);
  jettaTraffic?.update(state.lateral, state.z, state.speed, dt, isNight);
  busTraffic?.update(state.lateral, state.z, state.speed, dt, isNight);
  pedestrians?.update(state.z, dt);
  passengers.update(state.lateral, state.z, state.speed, dt);
  hud.update(passengers.getSnapshot(state.lateral, state.z), state.lateral, state.z);
  traffic.update(state.lateral, state.z, state.speed, dt, camera.position);

  if (controls.speed) controls.speed.textContent = String(Math.round(Math.abs(state.speed))).padStart(2, '0');
  if (controls.gear) controls.gear.textContent = reverse ? 'R' : Math.abs(state.speed) < 1 ? 'N' : 'D';
  const rpm = Math.round(800 + Math.abs(state.speed) * 34 + (accelerating ? 900 : 0));
  if (controls.rpm) controls.rpm.textContent = String(rpm);
  if (controls.speedBar) controls.speedBar.style.width = `${Math.min(100, (Math.abs(state.speed) / CONFIG.speedMaxKmh) * 100)}%`;
  if (controls.rpmBar) controls.rpmBar.style.width = `${Math.min(100, (rpm / 6000) * 100)}%`;
  if (controls.odo) controls.odo.textContent = `${(state.distance / 1000).toFixed(2)} km`;
  controls.wheel?.style.setProperty('--wheel-turn', `${state.steer * 100}deg`);
  controls.brake?.style.setProperty('--hold-progress', `${Math.min(1, state.brakeTime / 0.4) * 360}deg`);
  const brakeLabel = controls.brake?.querySelector('.pedal-label');
  if (brakeLabel) brakeLabel.textContent = braking && state.brakeTime > 0.4 ? 'R' : 'BRAKE';
}

function localToWorld(lx, ly, lz) {
  const sinH = Math.sin(state.heading);
  const cosH = Math.cos(state.heading);
  return localWorldPoint.set(
    state.lateral + lx * cosH + lz * sinH,
    taxi.position.y + ly,
    state.z - lx * sinH + lz * cosH
  );
}

function setLookTargetFromAngles(originWorld, yaw, pitch, dist = 16) {
  const cosP = Math.cos(pitch);
  localDirection.set(Math.sin(yaw) * cosP, Math.sin(pitch), -Math.cos(yaw) * cosP);
  const sinH = Math.sin(state.heading);
  const cosH = Math.cos(state.heading);
  worldDirection.set(
    localDirection.x * cosH + localDirection.z * sinH,
    localDirection.y,
    -localDirection.x * sinH + localDirection.z * cosH
  );
  chaseTarget.copy(originWorld).addScaledVector(worldDirection, dist);
  camera.lookAt(chaseTarget);
}

function setCamera(dt) {
  const alpha = 1 - Math.exp(-CONFIG.cameraSmooth * dt);
  const isChase = state.camera === 'chase';
  taxi.userData.body.visible = isChase;
  cabinInterior.group.visible = !isChase;

  if (state.camera === 'chase') {
    const nextFov = 68 + Math.min(10, Math.abs(state.speed) * 0.065);
    if (camera.fov !== nextFov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    const desired = localToWorld(0, CONFIG.cameraHeight, CONFIG.cameraDistance);
    camera.position.lerp(desired, alpha);
    chaseTarget.copy(localToWorld(0, 1.35, -14));
    camera.lookAt(chaseTarget);
    const shake = Math.min(1, Math.abs(state.speed) / CONFIG.speedMaxKmh);
    camera.position.y += Math.sin(performance.now() * 0.019) * shake * 0.01;
    camera.position.x += Math.sin(performance.now() * 0.013) * shake * 0.007;
  } else if (state.camera === 'driver') {
    if (camera.fov !== 72) { camera.fov = 72; camera.updateProjectionMatrix(); }
    const camPos = localToWorld(0.42, 1.32, -0.18);
    camera.position.copy(camPos);
    setLookTargetFromAngles(camPos, state.lookYaw, state.lookPitch, 22);
  } else if (state.camera === 'passengerFront') {
    if (camera.fov !== 74) { camera.fov = 74; camera.updateProjectionMatrix(); }
    const camPos = localToWorld(-0.34, 1.30, 0.56);
    camera.position.copy(camPos);
    setLookTargetFromAngles(camPos, state.lookYaw, state.lookPitch, 18);
  } else if (state.camera === 'passengerWindow') {
    if (camera.fov !== 72) { camera.fov = 72; camera.updateProjectionMatrix(); }
    const camPos = localToWorld(0.42, 1.26, 0.62);
    camera.position.copy(camPos);
    setLookTargetFromAngles(camPos, state.lookYaw, state.lookPitch, 14);
  }

  road.update(taxi.position, camera.position);
}

function frame() {
  const rawDt = clock.getDelta();
  if (rawDt > 1 / 40) slowFrameSeconds += Math.min(rawDt, 0.1);
  else slowFrameSeconds = 0;
  if (slowFrameSeconds >= 3 && qualityIndex > 0) {
    qualityIndex--;
    applyQuality();
    slowFrameSeconds = 0;
    showToast('RENDER QUALITY REDUCED', `Performance preset: ${qualityLevels[qualityIndex]}`);
  }
  const dt = Math.min(rawDt, 0.04);
  if (!state.paused) update(dt);
  setCamera(dt);
  composer.render();
  requestAnimationFrame(frame);
}

function resetLookForMode(modeId) {
  state.lookPitch = 0;
  if (modeId === 'passengerWindow') {
    state.lookYaw = Math.PI * 0.42;
  } else {
    state.lookYaw = 0;
  }
}

function toggleCamera() {
  const idx = CAMERA_MODES.findIndex((m) => m.id === state.camera);
  const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
  state.camera = next.id;
  resetLookForMode(next.id);
  if (controls.viewLabel) controls.viewLabel.textContent = next.label;
  showToast('CAMERA VIEW', next.desc);
}

canvas?.addEventListener('pointerdown', (event) => {
  if (state.camera === 'chase') return;
  if (event.target.closest('.touch-controls, button')) return;
  state.lookPointer = event.pointerId;
  state.lookLastX = event.clientX;
  state.lookLastY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
});

canvas?.addEventListener('pointermove', (event) => {
  if (state.lookPointer !== event.pointerId) return;
  const dx = event.clientX - state.lookLastX;
  const dy = event.clientY - state.lookLastY;
  state.lookLastX = event.clientX;
  state.lookLastY = event.clientY;

  const sensitivity = 0.0045;
  state.lookYaw -= dx * sensitivity;
  state.lookPitch = THREE.MathUtils.clamp(state.lookPitch - dy * sensitivity, -0.65, 0.75);

  if (state.camera === 'driver') {
    state.lookYaw = THREE.MathUtils.clamp(state.lookYaw, -0.45, Math.PI * 0.55);
  }
});

function releaseLookPointer(event) {
  if (state.lookPointer === event.pointerId) {
    state.lookPointer = null;
  }
}
canvas?.addEventListener('pointerup', releaseLookPointer);
canvas?.addEventListener('pointercancel', releaseLookPointer);
canvas?.addEventListener('lostpointercapture', releaseLookPointer);

controls.camera?.addEventListener('click', toggleCamera);
controls.pause?.addEventListener('click', () => {
  state.paused = !state.paused;
  controls.pause.querySelector('span').textContent = state.paused ? 'RESUME' : 'PAUSE';
  showToast(state.paused ? 'DRIVE PAUSED' : 'SHIFT RESUMED', state.paused ? 'Press the button again to continue' : 'Use WASD or the pedals');
});
controls.helpToggle?.addEventListener('click', () => {
  const open = controls.helpPanel?.hidden ?? true;
  if (controls.helpPanel) controls.helpPanel.hidden = !open;
  controls.helpToggle.setAttribute('aria-expanded', String(open));
});
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    if (!event.repeat) {
      const side = event.key === 'ArrowLeft' ? 'left' : 'right';
      state.indicator = state.indicator === side ? null : side;
      setTaxiIndicators(taxi, state.indicator);
      showToast(
        state.indicator ? `${side.toUpperCase()} INDICATOR ON` : `${side.toUpperCase()} INDICATOR OFF`,
        'Shift + ← / → to toggle turn indicators'
      );
    }
    return;
  }
  keys.add(event.key);
  if (event.key.toLowerCase() === 'b' && !event.repeat) {
    if (event.shiftKey) {
      state.frontLeftDoorOpen = !state.frontLeftDoorOpen;
      setTaxiDoors(taxi, { frontLeftOpen: state.frontLeftDoorOpen });
      showToast(
        state.frontLeftDoorOpen ? 'FRONT LEFT DOOR OPEN' : 'FRONT LEFT DOOR CLOSED',
        'Shift + B to toggle front left door'
      );
    } else {
      state.backLeftDoorOpen = !state.backLeftDoorOpen;
      setTaxiDoors(taxi, { backLeftOpen: state.backLeftDoorOpen });
      showToast(
        state.backLeftDoorOpen ? 'BACK LEFT DOOR OPEN' : 'BACK LEFT DOOR CLOSED',
        'B to toggle back left door'
      );
    }
  }
  if (event.key.toLowerCase() === 'v' && !event.repeat) toggleCamera();
  if (event.key.toLowerCase() === 'p' && !event.repeat) controls.pause?.click();
  if (event.key.toLowerCase() === 'h' && !event.repeat) traffic.honk();
  if (event.key.toLowerCase() === 't' && !event.repeat) {
    state.headlightsOn = !state.headlightsOn;
    showToast(
      state.headlightsOn ? 'HEADLIGHTS & DASH ON' : 'HEADLIGHTS OFF',
      state.headlightsOn ? 'Press T to turn lights off' : 'Press T to turn lights on'
    );
  }
  if (event.key.toLowerCase() === 'n' && !event.repeat) {
    const nextMode = road.getTimeOfDay() === 'night' ? 'day' : 'night';
    road.setTimeOfDay(nextMode);
    openWorld?.setNightMode(nextMode === 'night');
    victoriaMemorial?.setNightMode(nextMode === 'night');
    traffic.setRainEnabled(nextMode !== 'day');
    renderer.toneMappingExposure = CONFIG.exposure;
    bloomPass.strength = CONFIG.bloomStrength;
    bloomPass.threshold = CONFIG.bloomThreshold;
    if (nextMode === 'night') {
      state.headlightsOn = true;
    }
    showToast(
      nextMode === 'day' ? 'PLEASANT DAYTIME' : 'KOLKATA NIGHTTIME',
      nextMode === 'day' ? 'Clear sky & clouds · Press N for night' : 'Rain & streetlamps · Press N for day'
    );
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key));
window.addEventListener('blur', () => {
  keys.clear();
  state.brakeHeld = false;
  state.wheelPointer = null;
  state.wheelInput = 0;
  state.lookPointer = null;
  document.querySelectorAll('.pedal.active').forEach((pedal) => pedal.classList.remove('active'));
});
document.querySelectorAll('.pedal').forEach((pedal) => {
  const down = (event) => {
    event.preventDefault();
    pedal.classList.add('active');
    pedal.setPointerCapture?.(event.pointerId);
    if (event.pointerType === 'touch') navigator.vibrate?.(12);
  };
  const up = () => pedal.classList.remove('active');
  pedal.addEventListener('pointerdown', down);
  pedal.addEventListener('pointerup', up);
  pedal.addEventListener('pointercancel', up);
  pedal.addEventListener('lostpointercapture', up);
});
controls.wheel?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  state.wheelPointer = event.pointerId;
  controls.wheel.setPointerCapture(event.pointerId);
  const bounds = controls.wheel.getBoundingClientRect();
  state.wheelAngleOrigin = Math.atan2(
    event.clientY - (bounds.top + bounds.height / 2),
    event.clientX - (bounds.left + bounds.width / 2)
  );
  state.wheelValueOrigin = state.wheelInput;
});
controls.wheel?.addEventListener('pointermove', (event) => {
  if (state.wheelPointer !== event.pointerId) return;
  const bounds = controls.wheel.getBoundingClientRect();
  const angle = Math.atan2(
    event.clientY - (bounds.top + bounds.height / 2),
    event.clientX - (bounds.left + bounds.width / 2)
  );
  let delta = angle - state.wheelAngleOrigin;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  state.wheelInput = THREE.MathUtils.clamp(state.wheelValueOrigin + delta / (Math.PI * 0.58), -1, 1);
});
function releaseWheel(event) {
  if (state.wheelPointer === event.pointerId) {
    state.wheelPointer = null;
    state.wheelInput = 0;
  }
}
controls.wheel?.addEventListener('pointerup', releaseWheel);
controls.wheel?.addEventListener('pointercancel', releaseWheel);
controls.wheel?.addEventListener('lostpointercapture', releaseWheel);
document.addEventListener('contextmenu', (event) => {
  if (event.target.closest('.touch-controls')) event.preventDefault();
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  applyQuality();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
});
showToast('SHIFT READY', 'Skip 1st right, take 2nd right, then 1st left for Victoria Memorial');
requestAnimationFrame(frame);
