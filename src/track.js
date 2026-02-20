import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function terrainHeight() {
  return -4.0;
}

function createRampMesh(width, length, height) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 18);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const z = pos.getZ(i);
    const rampT = THREE.MathUtils.clamp((z + length * 0.5) / length, 0, 1);
    const y = Math.sin(rampT * Math.PI * 0.5) * height;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: '#96999e', roughness: 0.95, metalness: 0.02 }),
  );
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.roadHalfWidth = 12;
    this.guardHalfWidth = 14.8;
    this.samples = [];
    this.checkpoints = [];
    this.curve = null;
    this.jumpRamps = [];
    this.itemBoxSpawns = [];

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

    const terrainGeo = new THREE.PlaneGeometry(5000, 5000, 18, 18);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setY(i, terrainHeight());
    }
    terrainGeo.computeVertexNormals();
    this.scene.add(
      new THREE.Mesh(
        terrainGeo,
        new THREE.MeshStandardMaterial({ color: '#608a55', roughness: 1, metalness: 0 }),
      ),
    );
  }

  buildTrack() {
    const roadLift = 0.08;
    const points = [
      new THREE.Vector3(0, roadLift, 0),
      new THREE.Vector3(210, roadLift, -280),
      new THREE.Vector3(520, roadLift, -620),
      new THREE.Vector3(930, roadLift, -490),
      new THREE.Vector3(1200, roadLift, 60),
      new THREE.Vector3(980, roadLift, 610),
      new THREE.Vector3(560, roadLift, 930),
      new THREE.Vector3(20, roadLift, 1060),
      new THREE.Vector3(-580, roadLift, 800),
      new THREE.Vector3(-980, roadLift, 230),
      new THREE.Vector3(-840, roadLift, -260),
      new THREE.Vector3(-450, roadLift, -720),
      new THREE.Vector3(-120, roadLift, -820),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.34);
    const sampleCount = 1000;
    const centerPoints = this.curve.getPoints(sampleCount);

    const roadPositions = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    const wallMat = new THREE.MeshStandardMaterial({ color: '#d0d2d6', roughness: 0.82, metalness: 0.03 });
    const wallGeo = new THREE.BoxGeometry(0.85, 1.45, 3.1);
    const laneDashGeo = new THREE.BoxGeometry(0.35, 0.04, 4.2);
    const laneDashMat = new THREE.MeshStandardMaterial({ color: '#f5f7fa', roughness: 0.75, metalness: 0 });

    for (let i = 0; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const center = centerPoints[i];
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

      const left = center.clone().addScaledVector(right, -this.roadHalfWidth);
      const rgt = center.clone().addScaledVector(right, this.roadHalfWidth);

      roadPositions.push(left.x, left.y, left.z, rgt.x, rgt.y, rgt.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUvs.push(0, t * 24, 1, t * 24);

      this.samples.push({ t, center: center.clone(), right: right.clone(), tangent: tangent.clone() });

      if (i > 0) {
        const base = i * 2;
        roadIndices.push(base - 2, base - 1, base, base, base - 1, base + 1);
      }

      if (i % 120 === 0) {
        this.checkpoints.push({ position: center.clone().add(new THREE.Vector3(0, 1, 0)), direction: tangent.clone(), t });
      }

      if (i % 20 === 0) {
        const wallL = new THREE.Mesh(wallGeo, wallMat);
        wallL.position.copy(center).addScaledVector(right, -(this.guardHalfWidth + 0.2)).add(new THREE.Vector3(0, 0.72, 0));
        wallL.rotation.y = Math.atan2(tangent.x, tangent.z);
        this.scene.add(wallL);

        const wallR = wallL.clone();
        wallR.position.copy(center).addScaledVector(right, this.guardHalfWidth + 0.2).add(new THREE.Vector3(0, 0.72, 0));
        this.scene.add(wallR);
      }

      if (i % 24 === 0) {
        const dash = new THREE.Mesh(laneDashGeo, laneDashMat);
        dash.position.copy(center).add(new THREE.Vector3(0, 0.03, 0));
        dash.rotation.y = Math.atan2(tangent.x, tangent.z);
        this.scene.add(dash);
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
      new THREE.MeshStandardMaterial({ color: '#8f9296', roughness: 0.94, metalness: 0.02, transparent: false, opacity: 1 }),
    );
    road.receiveShadow = true;
    this.scene.add(road);

    const shoulder = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 1600, this.roadHalfWidth + 2.2, 14, true),
      new THREE.MeshStandardMaterial({ color: '#bbb8ad', roughness: 0.96, metalness: 0 }),
    );
    shoulder.position.y = roadLift - 0.08;
    this.scene.add(shoulder);

    this.placeJumpRamp(0.34, 8, 18, 2.2);
    this.placeItemBoxes([0.18, 0.51, 0.77]);

    this.startTransform = {
      position: this.samples[8].center.clone().add(new THREE.Vector3(0, 1.2, 0)),
      yaw: Math.atan2(this.samples[8].tangent.x, this.samples[8].tangent.z),
    };
  }

  placeJumpRamp(t, width, length, height) {
    const center = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    const mesh = createRampMesh(width, length, height);
    mesh.position.copy(center).add(new THREE.Vector3(0, 0.05, 0));
    mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
    this.scene.add(mesh);

    this.jumpRamps.push({ center: center.clone(), tangent: tangent.clone(), width, length, height, boost: 9.5 });
  }

  placeItemBoxes(ts) {
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#7fd8ff',
      emissive: '#2e6ec4',
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.15,
      transparent: true,
      opacity: 0.78,
    });
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true });

    ts.forEach((t) => {
      const center = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      [-3.4, 0, 3.4].forEach((offset, idx) => {
        const pos = center.clone().addScaledVector(right, offset).add(new THREE.Vector3(0, 2.2, 0));
        const box = new THREE.Group();
        box.position.copy(pos);
        box.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), glassMat));
        box.add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), edgeMat));
        this.scene.add(box);
        this.itemBoxSpawns.push({ id: `${t}-${idx}`, position: pos, group: box, active: true, respawn: 0 });
      });
    });
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

    for (let i = 0; i < 260; i += 1) {
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
