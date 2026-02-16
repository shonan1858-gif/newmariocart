import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.lookTarget = new THREE.Vector3();
    this.currentPos = new THREE.Vector3();
    this.jitter = 0;
    this.camera.up.set(0, 1, 0);
  }

  update(dt, kart, telemetry) {
    this.camera.up.set(0, 1, 0);

    const forward = kart.getForward();
    const speedNorm = THREE.MathUtils.clamp(telemetry.speed / 55, 0, 1);
    const driftOffset = telemetry.drifting ? -kart.driftDir * 1.4 : 0;

    const ideal = kart.position
      .clone()
      .addScaledVector(forward, -8.5 - speedNorm * 4)
      .add(new THREE.Vector3(driftOffset, 4.3, 0));

    if (this.currentPos.lengthSq() === 0) {
      this.currentPos.copy(ideal);
    }

    this.currentPos.lerp(ideal, 1 - Math.exp(-dt * 7));

    this.lookTarget
      .copy(kart.position)
      .addScaledVector(forward, 9)
      .add(new THREE.Vector3(0, 2.0, 0));

    this.jitter = telemetry.boostTime > 0 ? Math.sin(performance.now() * 0.04) * 0.03 * speedNorm : 0;

    this.camera.position.copy(this.currentPos);
    this.camera.position.y += this.jitter;
    this.camera.lookAt(this.lookTarget);

    const baseFov = 62;
    const speedFov = speedNorm * 11;
    const boostFov = telemetry.boostTime > 0 ? 6 : 0;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, baseFov + speedFov + boostFov, 1 - Math.exp(-dt * 6));
    this.camera.updateProjectionMatrix();
  }
}
