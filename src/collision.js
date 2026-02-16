import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class CollisionSystem {
  constructor(track) {
    this.track = track;
  }

  resolveKart(kartState) {
    const closest = this.track.getClosestData(kartState.position);
    const limit = this.track.guardHalfWidth - kartState.radius;

    if (Math.abs(closest.lateral) > limit) {
      const sign = Math.sign(closest.lateral);
      const correction = Math.abs(closest.lateral) - limit;
      kartState.position.addScaledVector(closest.right, -sign * correction);

      const normal = closest.right.clone().multiplyScalar(sign);
      const towardWall = kartState.velocity.dot(normal);
      if (towardWall > 0) {
        kartState.velocity.addScaledVector(normal, -towardWall * 1.15);
      }

      kartState.wallHit = true;
    }

    return closest;
  }

  safeRespawn(state, checkpoint) {
    const spawn = checkpoint.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const closest = this.track.getClosestData(spawn);
    const capped = THREE.MathUtils.clamp(closest.lateral, -this.track.roadHalfWidth * 0.4, this.track.roadHalfWidth * 0.4);
    state.position.copy(closest.center).addScaledVector(closest.right, capped).add(new THREE.Vector3(0, 1.2, 0));
    state.velocity.set(0, 0, 0);
    state.verticalVelocity = 0;
    state.yaw = Math.atan2(closest.tangent.x, closest.tangent.z);
  }
}
