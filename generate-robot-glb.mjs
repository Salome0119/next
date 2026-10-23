import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter assembles the .glb with FileReader, which Node does not provide.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        if (typeof this.onloadend === 'function') this.onloadend();
      });
    }

    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        const type = blob.type || 'application/octet-stream';
        this.result = `data:${type};base64,${Buffer.from(buffer).toString('base64')}`;
        if (typeof this.onloadend === 'function') this.onloadend();
      });
    }
  };
}

function heartGeometry(width, depth) {
  const shape = new THREE.Shape();
  const scale = width / 32;
  const steps = 64;

  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) shape.moveTo(x * scale, y * scale);
    else shape.lineTo(x * scale, y * scale);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.center();
  return geometry;
}

function addSphere(target, options) {
  const {
    radius,
    position,
    scale = [1, 1, 1],
    width = 24,
    height = 16,
    material,
  } = options;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, width, height), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  target.add(mesh);
  return mesh;
}

function addCylinder(target, options) {
  const { radius, height, position, rotation, radial = 24, material } = options;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, radial),
    material
  );
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  target.add(mesh);
  return mesh;
}

function addCapsule(target, options) {
  const { radius, from, to, material } = options;
  const start = new THREE.Vector3(from[0], from[1], from[2]);
  const end = new THREE.Vector3(to[0], to[1], to[2]);
  const direction = new THREE.Vector3().subVectors(end, start);
  const fullLength = direction.length();
  const middleLength = Math.max(fullLength - radius * 2, 0.02);

  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, middleLength, 6, 18),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  target.add(mesh);
  return mesh;
}

function addHeart(target, options) {
  const { width, depth, position, material } = options;
  const mesh = new THREE.Mesh(heartGeometry(width, depth), material);
  mesh.position.set(position[0], position[1], position[2]);
  target.add(mesh);
  return mesh;
}

function buildRobot() {
  const scene = new THREE.Scene();
  scene.name = 'CuteRobot';

  const shellMaterial = new THREE.MeshStandardMaterial({
    name: 'Shell',
    color: 0xf7f4ef,
    roughness: 0.45,
    metalness: 0.03,
  });
  const visorMaterial = new THREE.MeshStandardMaterial({
    name: 'Visor',
    color: 0x17151c,
    roughness: 0.15,
    metalness: 0.35,
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    name: 'Joint',
    color: 0x3b3b44,
    roughness: 0.55,
    metalness: 0.2,
  });
  const pinkMaterial = new THREE.MeshStandardMaterial({
    name: 'Pink',
    color: 0xf8b8cf,
    roughness: 0.4,
    metalness: 0,
    emissive: 0xf472b6,
    emissiveIntensity: 0.25,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    name: 'Eye',
    color: 0xf9b6cf,
    roughness: 0.3,
    metalness: 0,
    emissive: 0xf472b6,
    emissiveIntensity: 0.35,
  });
  const heartMaterial = new THREE.MeshStandardMaterial({
    name: 'Heart',
    color: 0xf8b8cf,
    roughness: 0.35,
    metalness: 0,
    emissive: 0xf472b6,
    emissiveIntensity: 0.4,
  });
  const blushMaterial = new THREE.MeshStandardMaterial({
    name: 'Blush',
    color: 0xf8b8cf,
    roughness: 0.4,
    metalness: 0,
    emissive: 0xf472b6,
    emissiveIntensity: 0.3,
  });
  const faceMaterial = new THREE.MeshStandardMaterial({
    name: 'Face',
    color: 0xfff7fa,
    roughness: 0.3,
    metalness: 0,
    emissive: 0xffffff,
    emissiveIntensity: 0.08,
  });

  // Neck gap
  addCylinder(scene, {
    radius: 0.26,
    height: 0.2,
    position: [0, 0.92, 0],
    radial: 24,
    material: jointMaterial,
  });

  // Head assembly pivots at the neck so it can tilt and lean
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.92, 0);
  scene.add(head);

  // Rounded helmet
  addSphere(head, {
    radius: 1.08,
    position: [0, 0.58, 0],
    scale: [1.04, 0.98, 0.92],
    width: 40,
    height: 30,
    material: shellMaterial,
  });

  // Dark glass visor
  addSphere(head, {
    radius: 0.88,
    position: [0, 0.6, 0.5],
    scale: [1, 0.84, 0.58],
    width: 36,
    height: 24,
    material: visorMaterial,
  });

  // Face: tall oval eyes, blush marks and a small smile
  for (const side of [-1, 1]) {
    const eye = addSphere(head, {
      radius: 0.1,
      position: [side * 0.34, 0.61, 1.02],
      scale: [1, 2, 0.5],
      width: 16,
      height: 16,
      material: eyeMaterial,
    });
    eye.name = side < 0 ? 'eyeLeft' : 'eyeRight';

    const happyEye = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 24, Math.PI), eyeMaterial);
    happyEye.name = side < 0 ? 'eyeHappyLeft' : 'eyeHappyRight';
    happyEye.position.set(side * 0.34, 0.58, 1.04);
    head.add(happyEye);

    const cheek = addSphere(head, {
      radius: 0.05,
      position: [side * 0.58, 0.44, 0.92],
      scale: [2.2, 0.5, 0.5],
      width: 10,
      height: 8,
      material: blushMaterial,
    });
    cheek.name = side < 0 ? 'cheekLeft' : 'cheekRight';
  }

  // Wink chevron (>) for the left eye
  const winkEye = new THREE.Group();
  winkEye.name = 'eyeWinkLeft';
  winkEye.position.set(-0.34, 0.61, 1.04);
  head.add(winkEye);

  const winkUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 10), eyeMaterial);
  winkUpper.rotation.z = Math.PI / 4;
  winkUpper.position.set(0.018, 0.042, 0);
  winkEye.add(winkUpper);

  const winkLower = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 10), eyeMaterial);
  winkLower.rotation.z = (Math.PI * 3) / 4;
  winkLower.position.set(0.018, -0.042, 0);
  winkEye.add(winkLower);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24, Math.PI), faceMaterial);
  smile.name = 'smile';
  smile.position.set(0, 0.48, 1.02);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Ear pods: cream cup, pink ring, pink center button
  for (const side of [-1, 1]) {
    addCylinder(head, {
      radius: 0.37,
      height: 0.24,
      position: [side * 1.04, 0.58, 0],
      rotation: [0, 0, Math.PI / 2],
      radial: 28,
      material: shellMaterial,
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 10, 28), pinkMaterial);
    ring.position.set(side * 1.17, 0.58, 0);
    ring.rotation.y = Math.PI / 2;
    head.add(ring);

    addCylinder(head, {
      radius: 0.1,
      height: 0.3,
      position: [side * 1.19, 0.58, 0],
      rotation: [0, 0, Math.PI / 2],
      radial: 20,
      material: pinkMaterial,
    });
  }

  // Antenna with heart topper
  addCylinder(head, {
    radius: 0.035,
    height: 0.5,
    position: [0, 1.76, 0],
    radial: 8,
    material: jointMaterial,
  });
  addHeart(head, {
    width: 0.5,
    depth: 0.09,
    position: [0, 2.12, 0],
    material: heartMaterial,
  }).name = 'antennaHeart';

  // Rounded torso
  addSphere(scene, {
    radius: 0.72,
    position: [0, 0.3, 0],
    scale: [1.12, 0.92, 0.95],
    width: 32,
    height: 24,
    material: shellMaterial,
  });

  // Chest heart: cream backing + pink heart
  addHeart(scene, {
    width: 0.46,
    depth: 0.08,
    position: [0, 0.42, 0.62],
    material: shellMaterial,
  });
  addHeart(scene, {
    width: 0.36,
    depth: 0.08,
    position: [0, 0.42, 0.66],
    material: heartMaterial,
  }).name = 'chestHeart';

  // Hip joint peeking below the torso
  addSphere(scene, {
    radius: 0.24,
    position: [0, -0.42, 0],
    scale: [1.5, 0.7, 1.1],
    width: 20,
    height: 14,
    material: jointMaterial,
  });

  // Dark shoulder joints
  for (const side of [-1, 1]) {
    addSphere(scene, {
      radius: 0.2,
      position: [side * 0.8, 0.62, 0.02],
      width: 16,
      height: 12,
      material: jointMaterial,
    });
  }

  // Raised waving arm, pivoted at the shoulder so it can animate
  const wavingArm = new THREE.Group();
  wavingArm.name = 'wavingArm';
  wavingArm.position.set(-0.8, 0.62, 0.02);
  scene.add(wavingArm);

  addCapsule(wavingArm, {
    radius: 0.17,
    from: [0, 0, 0],
    to: [-0.52, 0.84, 0.26],
    material: shellMaterial,
  });

  const wavingHand = new THREE.Group();
  wavingHand.name = 'wavingHand';
  wavingHand.position.set(-0.62, 0.9, 0.3);
  wavingArm.add(wavingHand);

  addSphere(wavingHand, {
    radius: 0.2,
    position: [0, 0, 0.02],
    scale: [1, 1, 0.85],
    width: 18,
    height: 14,
    material: shellMaterial,
  });
  const fingertips = [
    [-0.14, 0.16, 0.06],
    [0.02, 0.2, 0.08],
    [0.16, 0.1, 0.06],
  ];
  for (const [dx, dy, dz] of fingertips) {
    addSphere(wavingHand, {
      radius: 0.055,
      position: [dx, dy, dz],
      width: 10,
      height: 8,
      material: pinkMaterial,
    });
  }

  // Relaxed arm with dark hand, also pivoted at the shoulder
  const restingArm = new THREE.Group();
  restingArm.name = 'restingArm';
  restingArm.position.set(0.8, 0.58, 0.02);
  scene.add(restingArm);

  addCapsule(restingArm, {
    radius: 0.17,
    from: [0, 0, 0],
    to: [0.22, -0.76, 0.12],
    material: shellMaterial,
  });

  const restingHand = new THREE.Group();
  restingHand.name = 'restingHand';
  restingHand.position.set(0.25, -0.84, 0.14);
  restingArm.add(restingHand);

  addSphere(restingHand, {
    radius: 0.17,
    position: [0, 0, 0],
    width: 16,
    height: 12,
    material: jointMaterial,
  });

  // Legs pivot at the hips so stance changes stay grounded
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'legLeft' : 'legRight';
    leg.position.set(side * 0.34, -0.5, 0.02);
    scene.add(leg);

    addCapsule(leg, {
      radius: 0.19,
      from: [0, 0, 0],
      to: [side * 0.02, -0.4, 0.03],
      material: shellMaterial,
    });
    addSphere(leg, {
      radius: 0.32,
      position: [side * 0.04, -0.5, 0.1],
      scale: [1, 0.62, 1.3],
      width: 20,
      height: 14,
      material: shellMaterial,
    });
    addSphere(leg, {
      radius: 0.32,
      position: [side * 0.04, -0.6, 0.1],
      scale: [0.88, 0.3, 1.2],
      width: 18,
      height: 10,
      material: pinkMaterial,
    });
  }

  return scene;
}

const rootDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(rootDir, 'public', 'models', 'robot.glb');

const scene = buildRobot();

let meshes = 0;
let vertices = 0;
let triangles = 0;
scene.traverse((object) => {
  if (!object.isMesh) return;
  meshes += 1;
  const count = object.geometry.getAttribute('position').count;
  vertices += count;
  triangles += (object.geometry.index ? object.geometry.index.count : count) / 3;
});

const exporter = new GLTFExporter();
const buffer = await exporter.parseAsync(scene, { binary: true, onlyVisible: false });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(buffer));

const header = new DataView(buffer, 0, 12);
const magic = String.fromCharCode(header.getUint8(0), header.getUint8(1), header.getUint8(2), header.getUint8(3));
if (magic !== 'glTF' || header.getUint32(4, true) !== 2) {
  throw new Error('Generated file is not a valid glTF 2.0 binary');
}

console.log(`wrote ${outputPath}`);
console.log(`meshes=${meshes} vertices=${vertices} triangles=${triangles} bytes=${buffer.byteLength}`);
