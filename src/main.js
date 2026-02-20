import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { InputController } from './input.js';
import { Track } from './track.js';
import { Kart } from './kart.js';
import { CollisionSystem } from './collision.js';
import { ChaseCamera } from './camera.js';
import { UI } from './ui.js';
import { VFXSystem } from './vfx.js';
import { ItemSystem } from './items.js';

const app = document.getElementById('app');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#b9d1ef', 450, 2500);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
app.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const input = new InputController();
const track = new Track(scene);
const kart = new Kart(scene, track);
const collision = new CollisionSystem(track);
const chaseCamera = new ChaseCamera(camera);
const vfx = new VFXSystem(scene);
const itemSystem = new ItemSystem(scene, track);
const ui = new UI(track);

function respawn() {
  collision.safeRespawn(kart, kart.getCurrentCheckpoint());
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (input.consumePressed('KeyR')) {
    respawn();
  }

  const telemetry = kart.update(dt, input, track, collision, vfx);
  itemSystem.update(dt, kart, input);
  chaseCamera.update(dt, kart, telemetry);
  vfx.update(dt);
  ui.update(telemetry, kart, itemSystem.getUIState());

  renderer.render(scene, camera);
  input.endFrame();
  requestAnimationFrame(tick);
}

tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
