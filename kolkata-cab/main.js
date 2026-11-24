import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG, HORIZON_COLOUR, createWorld } from './src/world.js';
import { createTaxi, setTaxiBraking, updateTaxiWheels } from './src/vehicles.js';
import { createPassengerSystem } from './src/passengers.js';
import { createHud } from './src/ui.js';
import { createTrafficSystem } from './src/traffic.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
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
const taxi = createTaxi();
scene.add(taxi);
const headLight = new THREE.SpotLight(0xffe4b0, 28, 52, Math.PI / 4.2, 0.55, 1.4);
headLight.position.set(0, 1.05, -2.0);
headLight.target.position.set(0, 0.1, -18);
taxi.add(headLight, headLight.target);

// const tailLightPool = new THREE.PointLight(0xff3022, 4.5, 10, 1.8);
// tailLightPool.position.set(0, 0.85, 2.55);
// taxi.add(tailLightPool);

const tailLightPool = new THREE.PointLight(0xff2a1e, 1.35, 7, 2.0);
tailLightPool.position.set(0, 0.45, 2.85);
taxi.add(tailLightPool);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), CONFIG.bloomStrength, CONFIG.bloomRadius, CONFIG.bloomThreshold);
composer.addPass(bloomPass);
const vignettePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.18 }, scale: { value: 0.72 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float strength; uniform float scale; varying vec2 vUv; void main(){ vec4 color=texture2D(tDiffuse,vUv); vec2 p=(vUv-0.5)*2.0; float vignette=1.0-smoothstep(0.2,1.4,dot(p,p)*scale); color.rgb*=mix(1.0, vignette, strength); gl_FragColor=color; }',
});
composer.addPass(vignettePass);
composer.addPass(new OutputPass());
const qualityLevels = ['low', 'medium', 'high'];
let qualityIndex = Math.max(0, qualityLevels.indexOf(CONFIG.quality));
let slowFrameSeconds = 0;
function applyQuality() {
  const quality = qualityLevels[qualityIndex];
  bloomPass.enabled = quality !== 'low';
  bloomPass.strength = CONFIG.bloomStrength;
  bloomPass.radius = CONFIG.bloomRadius;
  bloomPass.threshold = CONFIG.bloomThreshold;
  const pixelRatio = quality === 'low' ? Math.min(window.devicePixelRatio || 1, 1.1) : quality === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(innerWidth, innerHeight);
  CONFIG.quality = quality;
}
applyQuality();
const cabin = new THREE.Group();
const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x202523, flatShading: true });
const cabinBox = (size, position, color = 0x202523) => {
  const piece = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  piece.position.set(...position);
  cabin.add(piece);
};
// Driver-seat dashboard, bonnet, mirrors and a simple instrument binnacle.
cabinBox([2.5, 0.42, 0.58], [0, -0.62, -1.32]);
cabinBox([1.85, 0.13, 1.15], [0, -0.9, -2.05], 0xdcb33f);
cabinBox([0.48, 0.17, 0.09], [0.18, -0.56, -1.05], 0x111817);
cabinBox([0.46, 0.16, 0.08], [0.76, -0.56, -1.04], 0x111817);
cabinBox([0.8, 0.24, 0.17], [0.42, -0.33, -0.9], 0x303a36);
cabinBox([0.22, 0.08, 0.13], [-0.83, 0.42, -1.02], 0x3d4845);
cabinBox([0.22, 0.08, 0.13], [0.83, 0.42, -1.02], 0x3d4845);
const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 7, 16), cabinMaterial);
wheelRing.position.set(0.45, -0.55, -0.78);
cabin.add(wheelRing);
const wheelStem = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.045), cabinMaterial);
wheelStem.position.set(0.45, -0.55, -0.79);
cabin.add(wheelStem);
const wipers = [-0.28, 0.28].map((x, index) => {
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.27, -0.54);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.045), new THREE.MeshLambertMaterial({ color: 0x202625, flatShading: true }));
  blade.position.x = index ? -0.28 : 0.28;
  pivot.add(blade);
  cabin.add(pivot);
  return pivot;
});
camera.add(cabin);
scene.add(camera);
const chaseTarget = new THREE.Vector3();
const clock = new THREE.Clock();
const state = { speed: 0, distance: 0, steer: 0, wheelInput: 0, wheelPointer: null, wheelAngleOrigin: 0, wheelValueOrigin: 0, lateral: 0, z: 0, camera: 'chase', paused: false, brakeHeld: false, brakeTime: 0 };
const keys = new Set();
const $ = (id) => document.getElementById(id);
const controls = { speed: $('speedValue'), gear: $('gearValue'), rpm: $('rpmValue'), speedBar: $('speedBar'), rpmBar: $('rpmBar'), odo: $('distanceValue'), camera: $('cameraButton'), viewLabel: $('viewLabel'), pause: $('pauseButton'), toast: $('toast'), wheel: $('steeringWheel'), helpToggle: $('keyboardHelpToggle'), helpPanel: $('keyboardHelp'), brake: document.querySelector('.brake') };

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
      [...stars.querySelectorAll('.star')].forEach((star, index) => { star.textContent = index < data.level ? '★' : '☆'; });
      stars.setAttribute('aria-label', `${data.level} of 3 wanted stars`);
    }
    if (status) status.textContent = data.level ? `WANTED LEVEL: ${data.level}/3 · ${data.reason.toUpperCase()}` : 'WANTED LEVEL: 0/3 · CLEAN RECORD';
    if (event === 'wanted') showToast('WANTED LEVEL RAISED', data.reason);
    else showToast('WANTED LEVEL CLEARED', 'The streets have calmed down');
  }
});
function has(...names) { return names.some((name) => keys.has(name)); }
function inputSteer() {
  const keyboard = (has('ArrowLeft', 'a', 'A') ? -1 : 0) + (has('ArrowRight', 'd', 'D') ? 1 : 0);
  return Math.abs(keyboard) > 0 ? keyboard : state.wheelInput;
}
function update(dt) {
  const accelerating = has('ArrowUp', 'w', 'W') || document.querySelector('.accelerator.active');
  const braking = has('ArrowDown', 's', 'S') || state.brakeHeld || document.querySelector('.brake.active');
  setTaxiBraking(taxi, Boolean(braking));
  if (braking) state.brakeTime += dt; else state.brakeTime = 0;
  const reverse = braking && state.brakeTime > 0.4 && Math.abs(state.speed) < 14;
  if (accelerating) state.speed += CONFIG.acceleration * dt;
  else if (reverse) state.speed -= CONFIG.acceleration * 0.58 * dt;
  else if (braking) state.speed = Math.abs(state.speed) < 2 ? 0 : state.speed - Math.sign(state.speed) * CONFIG.braking * dt;
  else if (Math.abs(state.speed) > 0) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), CONFIG.drag * dt);
  state.speed = THREE.MathUtils.clamp(state.speed, -CONFIG.reverseMaxKmh, CONFIG.speedMaxKmh);
  const steerInput = inputSteer();
  const speedFactor = THREE.MathUtils.clamp(Math.abs(state.speed) / 18, 0.16, 1);
  state.lateral += steerInput * CONFIG.steeringRate * speedFactor * dt * (state.speed < 0 ? -1 : 1);
  state.lateral = THREE.MathUtils.clamp(state.lateral, -6.7, 6.7);
  state.z -= state.speed * (0.38 / 3.6) * dt;
  state.distance += Math.abs(state.speed) * (0.38 / 3.6) * dt;
  state.steer += (steerInput - state.steer) * Math.min(1, dt * 9);
  taxi.position.set(state.lateral, Math.sin(performance.now() * 0.006) * Math.min(0.025, Math.abs(state.speed) * 0.0002), state.z);
  taxi.rotation.z = -state.steer * Math.min(0.065, Math.abs(state.speed) * 0.0012);
  taxi.userData.body.rotation.z = -state.steer * 0.028;
  taxi.userData.body.rotation.x = braking && state.speed > 1 ? -0.027 : accelerating ? 0.009 : 0;
  updateTaxiWheels(taxi, dt, state.speed * (0.38 / 3.6), -state.steer * 0.32);
  passengers.update(state.lateral, state.z, state.speed, dt);
  hud.update(passengers.getSnapshot(state.lateral, state.z), state.lateral, state.z);
  traffic.update(state.lateral, state.z, state.speed, dt, camera.position);
  const wiperSweep = Math.sin(performance.now() * 0.0017) * 0.48;
  wipers[0].rotation.z = wiperSweep;
  wipers[1].rotation.z = -wiperSweep;
  if (controls.speed) controls.speed.textContent = String(Math.round(Math.abs(state.speed))).padStart(2, '0');
  if (controls.gear) controls.gear.textContent = reverse ? 'R' : Math.abs(state.speed) < 1 ? 'N' : 'D';
  const rpm = Math.round(800 + Math.abs(state.speed) * 34 + (accelerating ? 900 : 0));
  if (controls.rpm) controls.rpm.textContent = String(rpm);
  if (controls.speedBar) controls.speedBar.style.width = `${Math.min(100, Math.abs(state.speed) / CONFIG.speedMaxKmh * 100)}%`;
  if (controls.rpmBar) controls.rpmBar.style.width = `${Math.min(100, rpm / 6000 * 100)}%`;
  if (controls.odo) controls.odo.textContent = `${(state.distance / 1000).toFixed(2)} km`;
  controls.wheel?.style.setProperty('--wheel-turn', `${state.steer * 100}deg`);
  controls.brake?.style.setProperty('--hold-progress', `${Math.min(1, state.brakeTime / 0.4) * 360}deg`);
  const brakeLabel = controls.brake?.querySelector('.pedal-label');
  if (brakeLabel) brakeLabel.textContent = braking && state.brakeTime > 0.4 ? 'R' : 'BRAKE';
}
function setCamera(dt) {
  const alpha = 1 - Math.exp(-CONFIG.cameraSmooth * dt);
  if (state.camera === 'chase') {
    camera.fov = 68 + Math.min(10, Math.abs(state.speed) * 0.065);
    const desired = new THREE.Vector3(state.lateral * 0.74, CONFIG.cameraHeight, state.z + CONFIG.cameraDistance);
    camera.position.lerp(desired, alpha);
    chaseTarget.set(state.lateral * 0.15, 1.4, state.z - 12);
    camera.lookAt(chaseTarget);
    const shake = Math.min(1, Math.abs(state.speed) / CONFIG.speedMaxKmh);
    camera.position.y += Math.sin(performance.now() * 0.019) * shake * 0.012;
    camera.position.x += Math.sin(performance.now() * 0.013) * shake * 0.009;
  } else {
    cabin.visible = true;
    camera.fov = 72;
    const desired = new THREE.Vector3(state.lateral + 0.38, 2.06, state.z - 0.2);
    camera.position.lerp(desired, alpha);
    chaseTarget.set(state.lateral, 1.5, state.z - 28);
    camera.lookAt(chaseTarget);
  }
  if (state.camera === 'chase') cabin.visible = false;
  camera.updateProjectionMatrix();
  road.update(state.z, camera.position);
}
function frame() {
  const rawDt = clock.getDelta();
  if (rawDt > 1 / 40) slowFrameSeconds += Math.min(rawDt, 0.1); else slowFrameSeconds = 0;
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
function toggleCamera() {
  state.camera = state.camera === 'chase' ? 'driver' : 'chase';
  if (controls.viewLabel) controls.viewLabel.textContent = state.camera === 'chase' ? 'CHASE CAM' : 'DRIVER CAM';
  showToast('CAMERA VIEW', state.camera === 'chase' ? 'Third-person chase camera' : 'Right-hand driver seat');
}
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
  keys.add(event.key);
  if (event.key.toLowerCase() === 'v' && !event.repeat) toggleCamera();
  if (event.key.toLowerCase() === 'p' && !event.repeat) controls.pause?.click();
  if (event.key.toLowerCase() === 'h' && !event.repeat) traffic.honk();
});
window.addEventListener('keyup', (event) => keys.delete(event.key));
window.addEventListener('blur', () => {
  keys.clear(); state.brakeHeld = false; state.wheelPointer = null; state.wheelInput = 0;
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
  state.wheelAngleOrigin = Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2));
  state.wheelValueOrigin = state.wheelInput;
});
controls.wheel?.addEventListener('pointermove', (event) => {
  if (state.wheelPointer !== event.pointerId) return;
  const bounds = controls.wheel.getBoundingClientRect();
  const angle = Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2));
  let delta = angle - state.wheelAngleOrigin;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  state.wheelInput = THREE.MathUtils.clamp(state.wheelValueOrigin + delta / (Math.PI * 0.58), -1, 1);
});
function releaseWheel(event) { if (state.wheelPointer === event.pointerId) { state.wheelPointer = null; state.wheelInput = 0; } }
controls.wheel?.addEventListener('pointerup', releaseWheel);
controls.wheel?.addEventListener('pointercancel', releaseWheel);
controls.wheel?.addEventListener('lostpointercapture', releaseWheel);
document.addEventListener('contextmenu', (event) => { if (event.target.closest('.touch-controls')) event.preventDefault(); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  applyQuality();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
});
showToast('SHIFT READY', 'Use ↑ or W to drive');
requestAnimationFrame(frame);
