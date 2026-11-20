import * as THREE from 'three';
import { CONFIG, HORIZON_COLOUR, createWorld } from './src/world.js';
import { createTaxi, setTaxiBraking } from './src/vehicles.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.setClearColor(HORIZON_COLOUR, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const road = createWorld(scene);
const taxi = createTaxi();
scene.add(taxi);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
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
camera.add(cabin);
scene.add(camera);
const chaseTarget = new THREE.Vector3();
const clock = new THREE.Clock();
const state = { speed: 0, distance: 0, steer: 0, lateral: 0, z: 0, camera: 'chase', paused: false, brakeHeld: false, brakeTime: 0, wheelPointer: null };
const keys = new Set();
const $ = (id) => document.getElementById(id);
const controls = { speed: $('speedValue'), gear: $('gearValue'), rpm: $('rpmValue'), speedBar: $('speedBar'), rpmBar: $('rpmBar'), odo: $('distanceValue'), camera: $('cameraButton'), viewLabel: $('viewLabel'), pause: $('pauseButton'), toast: $('toast'), wheel: $('steeringWheel') };

function showToast(title, message) {
  if (!controls.toast) return;
  controls.toast.innerHTML = `${title}<span>${message}</span>`;
  controls.toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => controls.toast.classList.remove('visible'), 2300);
}
function has(...names) { return names.some((name) => keys.has(name)); }
function inputSteer() {
  const keyboard = (has('ArrowLeft', 'a', 'A') ? -1 : 0) + (has('ArrowRight', 'd', 'D') ? 1 : 0);
  return Math.abs(keyboard) > 0 ? keyboard : state.steer;
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
  if (controls.speed) controls.speed.textContent = String(Math.round(Math.abs(state.speed))).padStart(2, '0');
  if (controls.gear) controls.gear.textContent = reverse ? 'R' : Math.abs(state.speed) < 1 ? 'N' : 'D';
  const rpm = Math.round(800 + Math.abs(state.speed) * 34 + (accelerating ? 900 : 0));
  if (controls.rpm) controls.rpm.textContent = String(rpm);
  if (controls.speedBar) controls.speedBar.style.width = `${Math.min(100, Math.abs(state.speed) / CONFIG.speedMaxKmh * 100)}%`;
  if (controls.rpmBar) controls.rpmBar.style.width = `${Math.min(100, rpm / 6000 * 100)}%`;
  if (controls.odo) controls.odo.textContent = `${(state.distance / 1000).toFixed(2)} km`;
  controls.wheel?.style.setProperty('--wheel-turn', `${state.steer * 32}deg`);
}
function setCamera(dt) {
  const alpha = 1 - Math.exp(-CONFIG.cameraSmooth * dt);
  if (state.camera === 'chase') {
    camera.fov = 62 + Math.min(10, Math.abs(state.speed) * 0.065);
    const desired = new THREE.Vector3(state.lateral * 0.74, CONFIG.cameraHeight, state.z + CONFIG.cameraDistance);
    camera.position.lerp(desired, alpha);
    chaseTarget.set(state.lateral * 0.15, 1.05, state.z - 12);
    camera.lookAt(chaseTarget);
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
  const dt = Math.min(clock.getDelta(), 0.04);
  if (!state.paused) update(dt);
  setCamera(dt);
  renderer.render(scene, camera);
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
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  keys.add(event.key);
  if (event.key.toLowerCase() === 'v' && !event.repeat) toggleCamera();
  if (event.key.toLowerCase() === 'p' && !event.repeat) controls.pause?.click();
});
window.addEventListener('keyup', (event) => keys.delete(event.key));
window.addEventListener('blur', () => { keys.clear(); state.brakeHeld = false; });
document.querySelectorAll('.pedal').forEach((pedal) => {
  const down = (event) => { event.preventDefault(); pedal.classList.add('active'); pedal.setPointerCapture?.(event.pointerId); };
  const up = () => pedal.classList.remove('active');
  pedal.addEventListener('pointerdown', down);
  pedal.addEventListener('pointerup', up);
  pedal.addEventListener('pointercancel', up);
  pedal.addEventListener('lostpointercapture', up);
});
controls.wheel?.addEventListener('pointerdown', (event) => {
  state.wheelPointer = event.pointerId;
  controls.wheel.setPointerCapture(event.pointerId);
});
controls.wheel?.addEventListener('pointermove', (event) => {
  if (state.wheelPointer !== event.pointerId) return;
  const bounds = controls.wheel.getBoundingClientRect();
  state.steer = THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 2, -1, 1);
});
function releaseWheel(event) { if (state.wheelPointer === event.pointerId) { state.wheelPointer = null; state.steer = 0; } }
controls.wheel?.addEventListener('pointerup', releaseWheel);
controls.wheel?.addEventListener('pointercancel', releaseWheel);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);
});
showToast('SHIFT READY', 'Use ↑ or W to drive');
requestAnimationFrame(frame);
