import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function terrainHeight(x, z) {
  return 0;
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
    const segments = 220;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      color: '#6b9960',
      roughness: 1,
      metalness: 0,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  buildTrack() {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(140, 0, -220),
      new THREE.Vector3(390, 0, -470),
      new THREE.Vector3(720, 0, -350),
      new THREE.Vector3(980, 0, 90),
      new THREE.Vector3(810, 0, 480),
      new THREE.Vector3(480, 0, 790),
      new THREE.Vector3(80, 0, 920),
      new THREE.Vector3(-450, 0, 750),
      new THREE.Vector3(-820, 0, 280),
      new THREE.Vector3(-760, 0, -140),
      new THREE.Vector3(-420, 0, -550),
      new THREE.Vector3(-100, 0, -700),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.35);
    const sampleCount = 800;
    const centerPoints = this.curve.getPoints(sampleCount);

    const roadPositions = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    const guardPositions = [];
    const guardIndices = [];

    for (let i = 0; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const center = centerPoints[i];
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

      const left = center.clone().addScaledVector(right, -this.roadHalfWidth);
      const rgt = center.clone().addScaledVector(right, this.roadHalfWidth);

      roadPositions.push(left.x, left.y, left.z, rgt.x, rgt.y, rgt.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUvs.push(0, t * 50, 1, t * 50);

      const guardL = center.clone().addScaledVector(right, -this.guardHalfWidth);
      const guardR = center.clone().addScaledVector(right, this.guardHalfWidth);
      guardPositions.push(guardL.x, guardL.y + 1.8, guardL.z, guardR.x, guardR.y + 1.8, guardR.z);

      this.samples.push({
        t,
        center: center.clone(),
        right: right.clone(),
        tangent: tangent.clone(),
      });

      if (i > 0) {
        const base = i * 2;
        roadIndices.push(base - 2, base - 1, base, base, base - 1, base + 1);

        guardIndices.push(base - 2, base, base - 2, base - 1, base - 1, base + 1, base, base + 1);
      }

      if (i % 80 === 0) {
        this.checkpoints.push({
          position: center.clone().add(new THREE.Vector3(0, 1, 0)),
          direction: tangent.clone(),
          t,
        });
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: '#8b8d92',
      roughness: 0.92,
      metalness: 0.02,
      transparent: false,
      opacity: 1,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    this.scene.add(road);

    const guardGeo = new THREE.BufferGeometry();
    guardGeo.setAttribute('position', new THREE.Float32BufferAttribute(guardPositions, 3));
    guardGeo.setIndex(guardIndices);
    const guard = new THREE.LineSegments(
      guardGeo,
      new THREE.LineBasicMaterial({ color: '#dce8ef', transparent: true, opacity: 0.8 }),
    );
    this.scene.add(guard);

    this.startTransform = {
      position: this.samples[5].center.clone().add(new THREE.Vector3(0, 1.2, 0)),
      yaw: Math.atan2(this.samples[5].tangent.x, this.samples[5].tangent.z),
    };
  }

  buildDecorations() {
    const sun = new THREE.DirectionalLight('#fff2cc', 1.25);
    sun.position.set(650, 900, 350);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight('#acc7ea', 0.55));

    const mountainMatFar = new THREE.MeshStandardMaterial({ color: '#4f6b6b', roughness: 1 });
    const mountainMatMid = new THREE.MeshStandardMaterial({ color: '#5f7a5d', roughness: 1 });

    for (let i = 0; i < 70; i += 1) {
      const dist = 1200 + Math.random() * 900;
      const angle = (i / 70) * Math.PI * 2;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = terrainHeight(x, z);
      const isFar = i % 2 === 0;
      const geo = new THREE.ConeGeometry(120 + Math.random() * 120, 240 + Math.random() * 250, isFar ? 5 : 8);
      const m = new THREE.Mesh(geo, isFar ? mountainMatFar : mountainMatMid);
      m.position.set(x, y + geo.parameters.height * 0.5 - 20, z);
      this.scene.add(m);
    }

    for (let i = 0; i < 300; i += 1) {
      const x = (Math.random() - 0.5) * 3600;
      const z = (Math.random() - 0.5) * 3600;
      const y = terrainHeight(x, z);
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

    const bridgeWidth = this.roadHalfWidth * 2.2;
    const bridgeLength = 110;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(bridgeWidth, 2.5, bridgeLength),
      new THREE.MeshStandardMaterial({ color: '#8c8a83', roughness: 0.8 }),
    );
    const bridgeT = 0.36;
    const bridgeCenter = this.curve.getPointAt(bridgeT);
    const bridgeTan = this.curve.getTangentAt(bridgeT);
    bridge.position.copy(bridgeCenter).add(new THREE.Vector3(0, 0.4, 0));
    bridge.rotation.y = Math.atan2(bridgeTan.x, bridgeTan.z);
    this.scene.add(bridge);
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
