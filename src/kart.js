import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const DRIFT_THRESHOLDS = [0.8, 1.6, 2.5];
const BOOST_TABLE = [
  { force: 0, duration: 0 },
  { force: 18, duration: 0.65 },
  { force: 26, duration: 0.95 },
  { force: 36, duration: 1.2 },
];

const STEER_SIGN = -1;

export class Kart {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.radius = 1.8;
    this.hoverHeight = 1.2;

    this.group = new THREE.Group();
    this.group.position.copy(track.startTransform.position);
    this.yaw = track.startTransform.yaw;

    this.velocity = new THREE.Vector3();
    this.verticalVelocity = 0;
    this.onGround = true;
    this.wallHit = false;

    this.steerVisual = 0;
    this.wheels = [];
    this.frontWheels = [];

    this.isDrifting = false;
    this.driftDir = 0;
    this.driftTime = 0;
    this.turboLevel = 0;
    this.boostTime = 0;
    this.boostForce = 0;

    this.lastCheckpointIndex = 0;
    this.lap = 1;
    this.lastProgressT = 0;

    this.buildModel();
    scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  buildModel() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 1.0, 4.6),
      new THREE.MeshStandardMaterial({ color: '#e7b82d', roughness: 0.6 }),
    );
    body.position.y = 1.35;
    this.group.add(body);

    const fairing = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.05, 1.8, 5, 10),
      new THREE.MeshStandardMaterial({ color: '#d6403f', roughness: 0.45 }),
    );
    fairing.rotation.z = Math.PI / 2;
    fairing.position.set(0, 1.65, -0.2);
    this.group.add(fairing);

    const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.45, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#181818' });
    const wheelOffsets = [
      [-1.45, 0.7, 1.5],
      [1.45, 0.7, 1.5],
      [-1.45, 0.7, -1.45],
      [1.45, 0.7, -1.45],
    ];
    wheelOffsets.forEach((offset, idx) => {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(offset[0], offset[1], offset[2]);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheelPivot.add(wheel);
      this.group.add(wheelPivot);
      this.wheels.push(wheel);
      if (idx < 2) this.frontWheels.push(wheelPivot);
    });

    const driver = new THREE.Group();
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: '#5531b0' }),
    );
    torso.position.set(0, 2.4, 0.2);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#f6d0a6' }),
    );
    head.position.set(0, 3.35, 0.35);
    const armMat = new THREE.MeshStandardMaterial({ color: '#4a2ca3' });
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.65, 4, 8), armMat);
    armL.position.set(-0.6, 2.45, 0.35);
    armL.rotation.z = 0.65;
    const armR = armL.clone();
    armR.position.x *= -1;
    armR.rotation.z *= -1;
    driver.add(torso, head, armL, armR);
    this.group.add(driver);
  }

  getForward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
  }

  startDrift(directionHint) {
    this.isDrifting = true;
    this.driftDir = directionHint === 0 ? this.driftDir || 1 : Math.sign(directionHint * STEER_SIGN);
    this.driftTime = 0;
    this.turboLevel = 0;
  }

  stopDrift() {
    if (!this.isDrifting) return;
    this.isDrifting = false;
    const boost = BOOST_TABLE[this.turboLevel];
    this.boostTime = boost.duration;
    this.boostForce = boost.force;
    this.driftTime = 0;
    this.turboLevel = 0;
  }

  update(dt, input, track, collision, vfx) {
    this.wallHit = false;

    const steerInput = input.steer;
    const braking = input.brake > 0;
    const driftingInput = input.drift > 0;
    const throttle = input.throttle;

    const ground = track.getGroundInfo(this.position);
    const speed = this.velocity.length();

    const offroad = !ground.onRoad;
    const maxSpeed = offroad ? 66 : 95;
    const accel = offroad ? 44 : 88;
    const drag = offroad ? 2.3 : 1.45;

    if (input.consumePressed('Space') && this.onGround) {
      this.verticalVelocity = 8.5;
      this.onGround = false;
    }

    if (throttle > 0) {
      this.velocity.addScaledVector(this.getForward(), accel * dt);
    }

    if (braking) {
      if (speed > 3.5) {
        this.velocity.addScaledVector(this.velocity.clone().normalize(), -58 * dt);
      } else {
        this.velocity.addScaledVector(this.getForward(), -24 * dt);
      }
    }

    const movingSpeed = this.velocity.length();

    if (!this.isDrifting && this.onGround && driftingInput && movingSpeed > 8 && Math.abs(steerInput) > 0.08) {
      this.startDrift(steerInput);
    }

    if (this.isDrifting && !driftingInput) {
      this.stopDrift();
    }

    const steeringPower = this.isDrifting ? 3.15 : 2.25;
    const steerScale = THREE.MathUtils.clamp(movingSpeed / 26, 0.2, 1.0);
    this.yaw += steerInput * STEER_SIGN * steeringPower * steerScale * dt;

    if (this.isDrifting) {
      this.driftTime += dt;
      this.turboLevel = DRIFT_THRESHOLDS.reduce((lvl, threshold, idx) => (this.driftTime > threshold ? idx + 1 : lvl), 0);
      if (Math.abs(steerInput) > 0.01) {
        this.driftDir = Math.sign(steerInput * STEER_SIGN);
      }

      const slipAmount = Math.abs(steerInput) > 0.06
        ? THREE.MathUtils.lerp(0.18, 0.52, Math.min(1, this.driftTime / 2.5))
        : 0.12;
      const slip = (this.driftDir || 1) * slipAmount;
      const driftYaw = this.yaw + slip;
      const driftForward = new THREE.Vector3(Math.sin(driftYaw), 0, Math.cos(driftYaw));
      this.velocity.lerp(driftForward.multiplyScalar(this.velocity.length()), dt * 3.1);
      this.velocity.multiplyScalar(1 - dt * 0.28);
    }

    if (this.boostTime > 0) {
      this.boostTime = Math.max(0, this.boostTime - dt);
      this.velocity.addScaledVector(this.getForward(), this.boostForce * dt);
      vfx.addBoostWind(this.position, this.getForward());
    }

    const maxWithBoost = maxSpeed + this.boostForce * 0.35;
    if (this.velocity.length() > maxWithBoost) {
      this.velocity.setLength(maxWithBoost);
    }

    if (this.velocity.lengthSq() > 0.0001) {
      this.velocity.multiplyScalar(Math.max(0, 1 - drag * dt));
    }

    this.position.addScaledVector(this.velocity, dt);

    if (!this.onGround || this.verticalVelocity > 0) {
      this.verticalVelocity -= 24 * dt;
      this.position.y += this.verticalVelocity * dt;
    }

    const nextGround = track.getGroundInfo(this.position);
    const targetY = nextGround.height + this.hoverHeight;

    if (this.position.y <= targetY || this.verticalVelocity <= 0) {
      if (this.position.y <= targetY + 0.03) {
        this.onGround = true;
        this.verticalVelocity = 0;
        this.position.y = targetY;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }

    if (this.onGround) {
      this.position.y = targetY;
      this.verticalVelocity = 0;
    }

    const closest = collision.resolveKart(this);

    this.group.rotation.set(0, this.yaw, 0);

    const wheelSpin = this.velocity.length() * dt * 1.45;
    this.wheels.forEach((wheel) => {
      wheel.rotation.x -= wheelSpin;
    });

    this.steerVisual = THREE.MathUtils.lerp(this.steerVisual, steerInput * STEER_SIGN * 0.42, dt * 12);
    this.frontWheels.forEach((pivot) => {
      pivot.rotation.y = this.steerVisual;
    });

    if (this.isDrifting && this.onGround) {
      const rearL = new THREE.Vector3(-1.2, 0.05, -1.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.position);
      const rearR = new THREE.Vector3(1.2, 0.05, -1.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.position);
      vfx.addSkid(rearL, rearR);
      vfx.addDriftSparks(this.position.clone().add(new THREE.Vector3(0, 0.55, -1.4)), this.turboLevel);
    }

    this.updateProgress(closest);

    return {
      speed: this.velocity.length(),
      offroad,
      onGround: this.onGround,
      drifting: this.isDrifting,
      turboLevel: this.turboLevel,
      boostTime: this.boostTime,
      steering: steerInput,
      yaw: this.yaw,
    };
  }

  updateProgress(closest) {
    const checkpointCount = this.track.checkpoints.length;
    let nearestCP = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < checkpointCount; i += 1) {
      const cp = this.track.checkpoints[i];
      const d = cp.position.distanceToSquared(this.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestCP = i;
      }
    }

    const expected = (this.lastCheckpointIndex + 1) % checkpointCount;
    if (nearestCP === expected && nearestDist < 2400) {
      this.lastCheckpointIndex = expected;
      if (expected === 0) {
        this.lap = Math.min(3, this.lap + 1);
      }
    }

    this.lastProgressT = closest.t;
  }

  getCurrentCheckpoint() {
    return this.track.checkpoints[this.lastCheckpointIndex] || this.track.checkpoints[0];
  }
}
