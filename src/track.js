import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function terrainHeight() {
  return -4.0;
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.roadHalfWidth = 11;
    this.guardHalfWidth = 14;
    this.samples = [];
    this.checkpoints = [];
    this.curve = null;

    this.buildEnvironment();
    this.buildTrack();
    this.buildDecorations();
  }

  buildEnvironment() {
    const skyGeo = new THREE.SphereGeometry(3200, 24, 18);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color('#6ba4f6') },
        bottom: { value: new THREE.Color('#dff0ff') },
      },
      vertexShader: `varying vec3 vPos; void main(){vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos; void main(){ float h = normalize(vPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }`,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    const terrainSize = 5000;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 24, 24);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setY(i, terrainHeight());
    }
    terrainGeo.computeVertexNormals();

    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({ color: '#608a55', roughness: 1, metalness: 0 }),
    );
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  buildTrack() {
    const roadLift = 0.05;
    const points = [
      new THREE.Vector3(0, roadLift, 0),
      new THREE.Vector3(180, roadLift, -260),
      new THREE.Vector3(430, roadLift, -560),
      new THREE.Vector3(820, roadLift, -420),
      new THREE.Vector3(1080, roadLift, 90),
      new THREE.Vector3(920, roadLift, 540),
      new THREE.Vector3(520, roadLift, 860),
      new THREE.Vector3(80, roadLift, 980),
      new THREE.Vector3(-500, roadLift, 780),
      new THREE.Vector3(-900, roadLift, 280),
      new THREE.Vector3(-820, roadLift, -180),
      new THREE.Vector3(-460, roadLift, -620),
      new THREE.Vector3(-120, roadLift, -760),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.35);
    const sampleCount = 900;
    const centerPoints = this.curve.getPoints(sampleCount);

    const roadPositions = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    const guardPositions = [];
    const guardIndices = [];

    const barrierGeo = new THREE.BoxGeometry(0.8, 1.0, 3.2);
    const barrierMat = new THREE.MeshStandardMaterial({ color: '#d7dbe2', roughness: 0.8, metalness: 0.1 });

    for (let i = 0; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const center = centerPoints[i];
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

      const left = center.clone().addScaledVector(right, -this.roadHalfWidth);
      const rgt = center.clone().addScaledVector(right, this.roadHalfWidth);

      roadPositions.push(left.x, left.y, left.z, rgt.x, rgt.y, rgt.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUvs.push(0, t * 30, 1, t * 30);

      const guardL = center.clone().addScaledVector(right, -this.guardHalfWidth);
      const guardR = center.clone().addScaledVector(right, this.guardHalfWidth);
      guardPositions.push(guardL.x, guardL.y + 1.2, guardL.z, guardR.x, guardR.y + 1.2, guardR.z);

      this.samples.push({ t, center: center.clone(), right: right.clone(), tangent: tangent.clone() });

      if (i > 0) {
        const base = i * 2;
        roadIndices.push(base - 2, base - 1, base, base, base - 1, base + 1);
        guardIndices.push(base - 2, base, base - 1, base + 1);
      }

      if (i % 90 === 0) {
        this.checkpoints.push({ position: center.clone().add(new THREE.Vector3(0, 1, 0)), direction: tangent.clone(), t });
      }

      if (i % 18 === 0) {
        const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        leftBarrier.position.copy(guardL).add(new THREE.Vector3(0, 0.45, 0));
        leftBarrier.rotation.y = Math.atan2(tangent.x, tangent.z);
        this.scene.add(leftBarrier);

        const rightBarrier = leftBarrier.clone();
        rightBarrier.position.copy(guardR).add(new THREE.Vector3(0, 0.45, 0));
        this.scene.add(rightBarrier);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({
        color: '#8f9296',
        roughness: 0.93,
        metalness: 0.03,
        transparent: false,
        opacity: 1,
      }),
    );
    road.receiveShadow = true;
    this.scene.add(road);

    const shoulder = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 1400, this.roadHalfWidth + 1.8, 12, true),
      new THREE.MeshStandardMaterial({ color: '#b9b6a4', roughness: 0.9, metalness: 0 }),
    );
    shoulder.position.y = roadLift - 0.06;
    this.scene.add(shoulder);

    const guardGeo = new THREE.BufferGeometry();
    guardGeo.setAttribute('position', new THREE.Float32BufferAttribute(guardPositions, 3));
    guardGeo.setIndex(guardIndices);
    this.scene.add(
      new THREE.LineSegments(
        guardGeo,
        new THREE.LineBasicMaterial({ color: '#d8e6ef', transparent: true, opacity: 0.5 }),
      ),
    );

    this.startTransform = {
      position: this.samples[5].center.clone().add(new THREE.Vector3(0, 1.2, 0)),
      yaw: Math.atan2(this.samples[5].tangent.x, this.samples[5].tangent.z),
    };
  }

  buildDecorations() {
    const sun = new THREE.DirectionalLight('#fff2cc', 1.2);
    sun.position.set(650, 900, 350);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight('#acc7ea', 0.46));
    this.scene.add(new THREE.HemisphereLight('#d9ecff', '#61785f', 0.4));

    const mountainMatFar = new THREE.MeshStandardMaterial({ color: '#4f6b6b', roughness: 1 });
    const mountainMatMid = new THREE.MeshStandardMaterial({ color: '#5f7a5d', roughness: 1 });

    for (let i = 0; i < 70; i += 1) {
      const dist = 1200 + Math.random() * 900;
      const angle = (i / 70) * Math.PI * 2;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = terrainHeight();
      const isFar = i % 2 === 0;
      const geo = new THREE.ConeGeometry(120 + Math.random() * 120, 240 + Math.random() * 250, isFar ? 5 : 8);
      const m = new THREE.Mesh(geo, isFar ? mountainMatFar : mountainMatMid);
      m.position.set(x, y + geo.parameters.height * 0.5 - 20, z);
      this.scene.add(m);
    }

    for (let i = 0; i < 300; i += 1) {
      const x = (Math.random() - 0.5) * 3600;
      const z = (Math.random() - 0.5) * 3600;
      const y = terrainHeight();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 2.2, 16, 6),
        new THREE.MeshStandardMaterial({ color: '#61472f' }),
      );
      trunk.position.set(x, y + 8, z);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(8 + Math.random() * 6, 28, 7),
        new THREE.MeshStandardMaterial({ color: '#2f6436' }),
      );
      crown.position.set(x, y + 28, z);
      this.scene.add(trunk, crown);
    }
  }

  getTerrainHeight(x, z) {
    return terrainHeight(x, z);
  }

  getClosestData(worldPosition) {
    let best = this.samples[0];
    let bestDistSq = Infinity;
    for (let i = 0; i < this.samples.length; i += 2) {
      const sample = this.samples[i];
      const dx = worldPosition.x - sample.center.x;
      const dz = worldPosition.z - sample.center.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = sample;
      }
    }

    const toPos = worldPosition.clone().sub(best.center);
    const lateral = toPos.dot(best.right);
    const forward = toPos.dot(best.tangent);

    return {
      ...best,
      lateral,
      forward,
      distFromCenter: Math.abs(lateral),
    };
  }

  getGroundInfo(worldPosition) {
    const closest = this.getClosestData(worldPosition);
    const onRoad = closest.distFromCenter <= this.roadHalfWidth + 1.2;
    const roadHeight = closest.center.y;
    const terrain = this.getTerrainHeight(worldPosition.x, worldPosition.z);
    const target = onRoad ? roadHeight : Math.max(terrain, roadHeight - 35);
    return {
      height: target,
      onRoad,
      closest,
    };
  }
}
