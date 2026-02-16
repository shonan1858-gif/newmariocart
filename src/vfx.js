import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const TURBO_COLORS = ['#4ca8ff', '#ff9d35', '#ea5cff'];

export class VFXSystem {
  constructor(scene) {
    this.scene = scene;
    this.sparks = [];
    this.skidSegments = [];
    this.windLines = [];

    this.sparkGeometry = new THREE.BufferGeometry();
    this.sparkMaterial = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.95 });
    this.sparkPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    scene.add(this.sparkPoints);

    this.skidGeometry = new THREE.BufferGeometry();
    this.skidMaterial = new THREE.LineBasicMaterial({ color: '#2f2f2f', transparent: true, opacity: 0.22 });
    this.skidLines = new THREE.LineSegments(this.skidGeometry, this.skidMaterial);
    scene.add(this.skidLines);

    this.windGeometry = new THREE.BufferGeometry();
    this.windMaterial = new THREE.LineBasicMaterial({ color: '#d9efff', transparent: true, opacity: 0.3 });
    this.windMesh = new THREE.LineSegments(this.windGeometry, this.windMaterial);
    scene.add(this.windMesh);
  }

  addDriftSparks(position, turboLevel) {
    const color = new THREE.Color(TURBO_COLORS[Math.max(0, turboLevel - 1)] ?? '#77a9ff');
    for (let i = 0; i < 4; i += 1) {
      this.sparks.push({
        position: position.clone(),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 2 + 1, (Math.random() - 0.5) * 6),
        color,
        life: 0.3 + Math.random() * 0.25,
      });
    }
  }

  addSkid(left, right) {
    this.skidSegments.push(left.clone(), right.clone());
    if (this.skidSegments.length > 900) {
      this.skidSegments.splice(0, 4);
    }
  }

  addBoostWind(position, forward) {
    for (let i = 0; i < 3; i += 1) {
      const lateral = new THREE.Vector3(forward.z, 0, -forward.x).multiplyScalar((Math.random() - 0.5) * 2.5);
      const start = position.clone().add(lateral).add(new THREE.Vector3(0, 0.8 + Math.random() * 1.6, 0));
      this.windLines.push({
        start,
        end: start.clone().addScaledVector(forward, -5 - Math.random() * 4),
        life: 0.18,
      });
    }
  }

  update(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i];
      spark.life -= dt;
      spark.position.addScaledVector(spark.velocity, dt);
      spark.velocity.y -= 13 * dt;
      if (spark.life <= 0) this.sparks.splice(i, 1);
    }

    const sparkPos = [];
    const sparkColor = [];
    this.sparks.forEach((spark) => {
      sparkPos.push(spark.position.x, spark.position.y, spark.position.z);
      sparkColor.push(spark.color.r, spark.color.g, spark.color.b);
    });
    this.sparkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparkPos, 3));
    this.sparkGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sparkColor, 3));

    this.skidGeometry.setFromPoints(this.skidSegments);

    for (let i = this.windLines.length - 1; i >= 0; i -= 1) {
      this.windLines[i].life -= dt;
      if (this.windLines[i].life <= 0) this.windLines.splice(i, 1);
    }
    const windPoints = [];
    this.windLines.forEach((line) => {
      windPoints.push(line.start, line.end);
    });
    this.windGeometry.setFromPoints(windPoints);
  }
}
