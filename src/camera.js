import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.lookTarget = new THREE.Vector3();
    this.smoothLookTarget = new THREE.Vector3();
    this.currentPos = new THREE.Vector3();
    this.camera.up.set(0, 1, 0);
  }

  update(dt, kart, telemetry) {
    this.camera.up.set(0, 1, 0);

    const forward = kart.getForward();
    const speedNorm = THREE.MathUtils.clamp(telemetry.speed / 95, 0, 1);
    const driftOffset = telemetry.drifting ? -kart.driftDir * 1.2 : 0;

    const ideal = kart.position
      .clone()
      .addScaledVector(forward, -8.2 - speedNorm * 4.8)
      .add(new THREE.Vector3(driftOffset, 4.2, 0));

    if (this.currentPos.lengthSq() === 0) {
      this.currentPos.copy(ideal);
      this.smoothLookTarget.copy(kart.position);
    }

    this.currentPos.lerp(ideal, 1 - Math.exp(-dt * 8.5));

    this.lookTarget
      .copy(kart.position)
      .addScaledVector(forward, 10)
      .add(new THREE.Vector3(0, 1.8, 0));

    this.smoothLookTarget.lerp(this.lookTarget, 1 - Math.exp(-dt * 10));

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.smoothLookTarget);

    const baseFov = 64;
    const speedFov = speedNorm * 12;
    const boostFov = telemetry.boostTime > 0 ? 4 : 0;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, baseFov + speedFov + boostFov, 1 - Math.exp(-dt * 5));
    this.camera.updateProjectionMatrix();
  }
}
