import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const ITEM_TYPES = ['BANANA', 'GREEN_SHELL'];

export class ItemSystem {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;

    this.rouletteActive = false;
    this.rouletteTimer = 0;
    this.rouletteIndex = 0;
    this.heldItem = null;

    this.boxes = this.track.itemBoxSpawns;
    this.projectiles = [];
    this.shards = [];

    this.shardGeo = new THREE.BufferGeometry();
    this.shardMat = new THREE.PointsMaterial({ color: '#b8ecff', size: 0.22, transparent: true, opacity: 0.9 });
    this.shardPoints = new THREE.Points(this.shardGeo, this.shardMat);
    this.scene.add(this.shardPoints);
  }

  getUIState() {
    return {
      rouletteActive: this.rouletteActive,
      rouletteName: ITEM_TYPES[this.rouletteIndex % ITEM_TYPES.length],
      heldItem: this.heldItem,
    };
  }

  collectBox(box) {
    box.active = false;
    box.respawn = 7;
    box.group.visible = false;

    for (let i = 0; i < 14; i += 1) {
      this.shards.push({
        position: box.position.clone(),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 7 + 2, (Math.random() - 0.5) * 8),
        life: 0.55,
      });
    }

    this.rouletteActive = true;
    this.rouletteTimer = 1.65;
    this.rouletteIndex = Math.floor(Math.random() * ITEM_TYPES.length);
    this.heldItem = null;
  }

  throwHeldItem(kart) {
    if (!this.heldItem) return;

    const forward = kart.getForward();
    const isBanana = this.heldItem === 'BANANA';
    const projectile = {
      type: this.heldItem,
      position: kart.position.clone().add(new THREE.Vector3(0, 1.1, 0)).addScaledVector(forward, 2.2),
      velocity: forward.clone().multiplyScalar(isBanana ? 15 : 25).add(new THREE.Vector3(0, isBanana ? 6 : 4.5, 0)),
      life: isBanana ? 13 : 8,
      armed: false,
    };

    if (isBanana) {
      projectile.mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: '#ffd84f', roughness: 0.7 }),
      );
      projectile.mesh.rotation.x = Math.PI;
    } else {
      projectile.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#4fcf60', roughness: 0.5, metalness: 0.1 }),
      );
    }

    projectile.mesh.position.copy(projectile.position);
    this.scene.add(projectile.mesh);
    this.projectiles.push(projectile);
    this.heldItem = null;
  }

  update(dt, kart, input) {
    this.boxes.forEach((box) => {
      if (!box.active) {
        box.respawn -= dt;
        if (box.respawn <= 0) {
          box.active = true;
          box.group.visible = true;
        }
        return;
      }

      box.group.rotation.y += dt * 1.8;
      box.group.rotation.x += dt * 1.2;

      if (kart.position.distanceToSquared(box.position) < 8.5 && !this.rouletteActive && !this.heldItem) {
        this.collectBox(box);
      }
    });

    if (this.rouletteActive) {
      this.rouletteTimer -= dt;
      if (Math.floor(this.rouletteTimer * 20) % 2 === 0) {
        this.rouletteIndex = (this.rouletteIndex + 1) % ITEM_TYPES.length;
      }
      if (this.rouletteTimer <= 0) {
        this.rouletteActive = false;
        this.heldItem = ITEM_TYPES[this.rouletteIndex % ITEM_TYPES.length];
      }
    }

    if (input.consumePressed('KeyK')) {
      this.throwHeldItem(kart);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.velocity.y -= p.type === 'BANANA' ? 18 : 12;
      p.position.addScaledVector(p.velocity, dt);

      const ground = this.track.getGroundInfo(p.position);
      const groundY = ground.height + 0.45;

      if (p.position.y <= groundY) {
        if (p.type === 'BANANA') {
          p.position.y = groundY;
          p.velocity.set(0, 0, 0);
          p.armed = true;
        } else {
          p.position.y = groundY;
          p.velocity.y = Math.abs(p.velocity.y) * 0.3;
          p.velocity.multiplyScalar(0.82);
          p.armed = true;
        }
      }

      if (p.armed) {
        const toKart = kart.position.distanceToSquared(p.position);
        if (toKart < 2.3) {
          kart.velocity.multiplyScalar(0.45);
          p.life = 0;
        }
      }

      p.mesh.position.copy(p.position);
      p.mesh.rotation.y += dt * 2;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.shards.length - 1; i >= 0; i -= 1) {
      const shard = this.shards[i];
      shard.life -= dt;
      shard.velocity.y -= 25 * dt;
      shard.position.addScaledVector(shard.velocity, dt);
      if (shard.life <= 0) {
        this.shards.splice(i, 1);
      }
    }

    const shardPos = [];
    this.shards.forEach((shard) => {
      shardPos.push(shard.position.x, shard.position.y, shard.position.z);
    });
    this.shardGeo.setAttribute('position', new THREE.Float32BufferAttribute(shardPos, 3));
  }
}
