'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAvatar } from '@/context/AvatarContext';

const MODEL_URL = '/models/robot.glb';
const MODEL_HEIGHT = 2.2;
const PINK = 0xf472b6;

type Accessories = {
  glasses?: boolean;
  headphones?: boolean;
  hat?: boolean;
  gafas?: boolean;
  audifonos?: boolean;
  glassesActive?: boolean;
  headset?: boolean;
  gorrito?: boolean;
};

interface Avatar3DProps {
  interactive?: boolean;
  compact?: boolean;
  className?: string;
  variant?: 'classic' | 'chibi' | 'cyber-cat';
  accessories?: Accessories;
  reactionState?: 'idle' | 'thinking' | 'success';
  autoRotate?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  modelScale?: number;
}

interface StarParticle {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  sway: number;
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (context) {
    context.translate(size / 2, size / 2);
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 27 : 11;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.shadowColor = 'rgba(255,255,255,0.9)';
    context.shadowBlur = 8;
    context.fillStyle = '#ffffff';
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function tuneMaterial(material: THREE.MeshStandardMaterial) {
  switch (material.name) {
    case 'Shell':
      material.roughness = 0.42;
      material.metalness = 0.04;
      break;
    case 'Visor':
      material.roughness = 0.12;
      material.metalness = 0.4;
      break;
    case 'Joint':
      material.roughness = 0.5;
      material.metalness = 0.25;
      break;
    case 'Pink':
    case 'Heart':
    case 'Eye':
    case 'Blush':
      material.roughness = 0.35;
      material.metalness = 0;
      break;
    default:
      break;
  }
  material.needsUpdate = true;
}

const IDLE_ARM: readonly [number, number, number] = [0.12, 0.1, 0.3];
// Both arms rest beside the body while pondering (no face/head clipping).
const THINKING_ARM: readonly [number, number, number] = [0.1, 0, -0.15];
const SUCCESS_ARM: readonly [number, number, number] = [0.02, 0.16, 0.14];
// Warm "pondering" amber, matching the hero's thinking expression (#f59e0b).
const THINK_COLOR = new THREE.Color(0xf59e0b);

const VARIANT_CONFIG = {
  classic: {
    headScale: 1,
    bodyScale: [1, 1, 1],
    bodyTone: 0xfdfbf7,
    accentColor: 0xf472b6,
    rimColor: 0xa855f7,
  },
  chibi: {
    headScale: 1.15,
    bodyScale: [1.05, 0.98, 1.05],
    bodyTone: 0xfce7f3,
    accentColor: 0xec4899,
    rimColor: 0xf472b6,
  },
  'cyber-cat': {
    headScale: 1,
    bodyScale: [1, 1, 1],
    bodyTone: 0x1e1e2e,
    accentColor: 0x00ffff,
    rimColor: 0xff00ff,
  },
} as const;

type VariantConfig = (typeof VARIANT_CONFIG)[keyof typeof VARIANT_CONFIG];

function getVariantConfig(variant: string): VariantConfig {
  return VARIANT_CONFIG[variant as keyof typeof VARIANT_CONFIG] ?? VARIANT_CONFIG.classic;
}

function createGlasses(): THREE.Group {
  const glassesGroup = new THREE.Group();

  // Transparent lens material (cristales transparentes)
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // Solid frame material (montura superior oscura)
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e1522,
    roughness: 0.2,
    metalness: 0.6,
  });

  // Lente principal: caja ancha ligeramente arqueada (estilo protector/deportivo)
  const lensWidth = 1.05;
  const lensHeight = 0.26;
  const lensDepth = 0.05;

  // Main wraparound lens — single wide curved piece
  const mainLens = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth, lensHeight, lensDepth),
    lensMaterial
  );
  // Slight arch simulation via scale
  mainLens.scale.set(1, 0.92, 0.85);
  glassesGroup.add(mainLens);

  // Borde superior sólido (barra superior de la montura)
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth + 0.06, 0.035, lensDepth * 0.8),
    frameMaterial
  );
  topBar.position.set(0, lensHeight * 0.5 + 0.015, lensDepth * 0.25);
  glassesGroup.add(topBar);

  // Borde inferior fino para completar la envoltura
  const bottomBar = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth + 0.06, 0.02, lensDepth * 0.7),
    frameMaterial
  );
  bottomBar.position.set(0, -lensHeight * 0.5 - 0.008, lensDepth * 0.2);
  glassesGroup.add(bottomBar);

  // Patillas laterales (temples) que se ajustan a los lados de la cabeza
  const createTemple = (side: number) => {
    const templeGroup = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.045, 0.4),
      frameMaterial
    );
    // Extiende la patilla hacia atrás
    arm.position.set(0, 0, -0.18);
    templeGroup.add(arm);
    templeGroup.position.set(side * (lensWidth * 0.5 + 0.06), 0, 0);
    templeGroup.rotation.y = side * 0.3;
    return templeGroup;
  };
  glassesGroup.add(createTemple(-1));
  glassesGroup.add(createTemple(1));

  // Puente nasal fino que conecta el lente con la nariz
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.03, lensDepth * 0.6),
    frameMaterial
  );
  bridge.position.set(0, -lensHeight * 0.35, lensDepth * 0.2);
  glassesGroup.add(bridge);

  // Posición a la altura de los ojos
  glassesGroup.position.set(0, 0.68, 0.32);
  return glassesGroup;
}

function createHeadphones(): THREE.Group {
  const headphonesGroup = new THREE.Group();

  // Headband: arco superior azul metálico (TorusGeometry)
  const headbandMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.25,
    metalness: 0.7,
  });
  const headbandGeo = new THREE.TorusGeometry(0.45, 0.04, 12, 32, Math.PI);
  const headband = new THREE.Mesh(headbandGeo, headbandMat);
  headphonesGroup.add(headband);

  // Material para los exterior e interior de las orejeras
  const earCupMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.25,
    metalness: 0.7,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Helper para crear cada orejera (capsa/vertical cylinder)
  const createEarCup = (xOffset: number, isLeft: boolean) => {
    const cupGroup = new THREE.Group();

    // Exterior azul (outer capsule/cylinder)
    const outerCup = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.16, 8, 16),
      earCupMat
    );
    outerCup.rotation.x = Math.PI / 2;
    cupGroup.add(outerCup);

    // Interior oscuro/negro (almohadilla interna)
    const innerCushion = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.14, 8, 16),
      cushionMat
    );
    innerCushion.rotation.x = Math.PI / 2;
    // Posicióna hacia el interior (hacia el centro de la cabeza)
    const inward = isLeft ? 1 : -1;
    innerCushion.position.set(inward * (0.18 - 0.13 - 0.01), 0, 0);
    cupGroup.add(innerCushion);

    cupGroup.position.set(xOffset, 0, 0);
    return cupGroup;
  };

  // Posicióna las orejeras en los lados (referido en el código original)
  headphonesGroup.add(createEarCup(-0.42, true));
  headphonesGroup.add(createEarCup(0.42, false));

  // Posicióna las orejas a la altura de las orejas del robot
  headphonesGroup.position.set(0, 0.1, 0);
  return headphonesGroup;
}

function createHat(): THREE.Group {
  const group = new THREE.Group();
  const hatMaterial = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.35,
    metalness: 0.2,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.8,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 0.5,
  });

  // Stylized cone crown above the head
  const coneHeight = 0.6;
  const coneRadius = 0.16;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, coneHeight, 16), hatMaterial);
  cone.position.set(0, 0, 0);
  group.add(cone);

  // Stylized crown top sphere/crown accent
  const crownSphere = new THREE.Mesh(new THREE.SphereGeometry(coneRadius * 0.5, 12, 8), hatMaterial);
  crownSphere.position.set(0, coneHeight * 0.45, 0);
  group.add(crownSphere);

  // Golden accent ring around the cone base
  const accentRing = new THREE.Mesh(new THREE.TorusGeometry(coneRadius * 1.1, 0.025, 8, 32), accentMaterial);
  accentRing.position.set(0, 0, 0);
  accentRing.rotation.x = Math.PI / 2;
  group.add(accentRing);

  // Floating ring above the crown (elegant accent)
  const floatingRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 32), accentMaterial);
  floatingRing.position.set(0, coneHeight * 0.95, 0);
  group.add(floatingRing);

  group.position.set(0, 1.25, 0);
  return group;
}

function resolveGlasses(a: Accessories | undefined): boolean {
  return Boolean(a?.glasses || a?.gafas || a?.glassesActive);
}

function resolveHeadphones(a: Accessories | undefined): boolean {
  return Boolean(a?.headphones || a?.audifonos || a?.headset);
}

function resolveHat(a: Accessories | undefined): boolean {
  return Boolean(a?.hat || a?.gorrito);
}

function createCyberEars(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stylized-cyber-cat-ears';

  // Two-tone composite: a soft armor shell matching the head, plus a neon
  // inner ear that glows. The inner material is exposed on userData so the
  // render loop can retint it live when the accent/eye color changes.
  const outerMaterial = new THREE.MeshStandardMaterial({
    color: 0xfdfbf7,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const innerGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xff69b4,
    emissive: new THREE.Color(0xff1493),
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // robot.glb head shell: a sphere centered at head-local y ~= 0.58 with
  // radius ~1.06, so the crown of the head sits at y ~= 1.64. Ears must be
  // anchored there (a previous y=1.05 buried them completely inside the mesh).
  const earBaseY = 1.62;

  const createEar = (isLeft: boolean) => {
    const ear = new THREE.Group();

    // Outer shell: flattened pyramid/cone for a curved ear silhouette.
    const outerGeo = new THREE.ConeGeometry(0.2, 0.44, 4);
    outerGeo.scale(1.2, 1, 0.6);
    const outerMesh = new THREE.Mesh(outerGeo, outerMaterial);
    ear.add(outerMesh);

    // Inner glowing pad, tucked slightly toward the front of the ear.
    const innerGeo = new THREE.ConeGeometry(0.13, 0.32, 4);
    innerGeo.scale(1.1, 1, 0.45);
    const innerMesh = new THREE.Mesh(innerGeo, innerGlowMaterial);
    innerMesh.position.set(0, -0.015, 0.06);
    ear.add(innerMesh);

    const sideMult = isLeft ? -1 : 1;
    ear.position.set(sideMult * 0.4, earBaseY, 0.05);
    ear.rotation.z = sideMult * -0.3; // Cute outward angle
    ear.rotation.x = 0.1; // Slight forward tilt

    return ear;
  };

  group.add(createEar(true), createEar(false));
  group.userData.glowMaterial = innerGlowMaterial;
  group.userData.shellMaterial = outerMaterial;
  return group;
}

function applyVariantColors(
  variant: string,
  shellMaterials: Set<THREE.MeshStandardMaterial>,
  accentMaterials: Set<THREE.MeshStandardMaterial>,
  rimLight: THREE.DirectionalLight,
) {
  const config = getVariantConfig(variant);
  shellMaterials.forEach((material) => {
    material.color.set(config.bodyTone);
  });
  accentMaterials.forEach((material) => {
    material.color.set(config.accentColor);
    material.emissive.set(config.accentColor);
  });
  rimLight.color.set(config.rimColor);
}

export default function Avatar3D({ 
  interactive = false, 
  compact = false, 
  className = '',
  variant: propVariant,
  accessories: propAccessories,
  reactionState: propReaction,
  autoRotate = true,
  cameraPosition = [0, 0.8, 2.5],
  cameraFov = 38,
  modelScale = 1,
}: Avatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings, mood } = useAvatar();
  const settingsRef = useRef<typeof settings>(settings);

  // Use props if provided (for preview), otherwise fall back to context.
  const effectiveVariant = propVariant ?? settings.variant;
  const effectiveAccessories = propAccessories ?? settings.accessories;
  const effectiveReaction = propReaction ?? mood;
  const variantRef = useRef(effectiveVariant);
  const accessoriesRef = useRef(effectiveAccessories);
  const moodRef = useRef(effectiveReaction);

  const glassesRef = useRef<THREE.Group | null>(null);
  const headphonesRef = useRef<THREE.Group | null>(null);
  const hatRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    moodRef.current = effectiveReaction;
  }, [effectiveReaction]);

  useEffect(() => {
    variantRef.current = effectiveVariant;
  }, [effectiveVariant]);

  useEffect(() => {
    accessoriesRef.current = effectiveAccessories;
  }, [effectiveAccessories]);

  // Reactive visibility sync for accessory groups
  useEffect(() => {
    if (hatRef.current) hatRef.current.visible = resolveHat(effectiveAccessories);
    if (glassesRef.current) glassesRef.current.visible = resolveGlasses(effectiveAccessories);
    if (headphonesRef.current) headphonesRef.current.visible = resolveHeadphones(effectiveAccessories);
  }, [effectiveAccessories]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 50);
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    camera.lookAt(0, 0.4, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableRotate = interactive;
    controls.enableZoom = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = compact ? 0.8 : 1.2;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.minDistance = 1.8;
    controls.maxDistance = 4.0;
    if (!interactive) controls.enabled = false;

    // TransformControls for dragging accessories
    const transformControls = new TransformControls(camera, renderer.domElement);
    if (glassesRef.current) transformControls.attach(glassesRef.current);
    else if (headphonesRef.current) transformControls.attach(headphonesRef.current);
    else if (hatRef.current) transformControls.attach(hatRef.current);
    transformControls.mode = 'translate';
    transformControls.enabled = !!glassesRef.current || !!headphonesRef.current || !!hatRef.current;
    transformControls.setTranslationSnap(0.01);
    transformControls.space = 'world';
    renderer.domElement.addEventListener('click', () => {
      if (glassesRef.current) transformControls.attach(glassesRef.current);
      else if (headphonesRef.current) transformControls.attach(headphonesRef.current);
      else if (hatRef.current) transformControls.attach(hatRef.current);
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(2, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(-2, 4, -3);
    scene.add(rimLight);

    const holder = new THREE.Group();
    scene.add(holder);

    const materials = new Set<THREE.MeshStandardMaterial>();
    const shellMaterials = new Set<THREE.MeshStandardMaterial>();
    const accentMaterials = new Set<THREE.MeshStandardMaterial>();
    let shellMaterial: THREE.MeshStandardMaterial | null = null;
    let eyeMaterial: THREE.MeshStandardMaterial | null = null;
    let blushMaterial: THREE.MeshStandardMaterial | null = null;
    let heartMaterial: THREE.MeshStandardMaterial | null = null;
    let pinkMaterial: THREE.MeshStandardMaterial | null = null;

    let headNode: THREE.Object3D | null = null;
    let wavingArm: THREE.Object3D | null = null;
    let wavingHand: THREE.Object3D | null = null;
    let restingArm: THREE.Object3D | null = null;
    let smileNode: THREE.Object3D | null = null;
    let leftOpenEye: THREE.Object3D | null = null;
    let rightOpenEye: THREE.Object3D | null = null;
    let leftHappyEye: THREE.Object3D | null = null;
    let rightHappyEye: THREE.Object3D | null = null;
    let winkEye: THREE.Object3D | null = null;

    // Accessory refs
    let glassesGroup: THREE.Group | null = null;
    let headphonesGroup: THREE.Group | null = null;
    let hatGroup: THREE.Group | null = null;
    let cyberEarsGroup: THREE.Group | null = null;
    let accessoryMeshes: { name: string; mesh: THREE.Mesh }[] = [];
    let earGlowMaterials: THREE.MeshStandardMaterial[] = [];
    let earShellMaterials: THREE.MeshStandardMaterial[] = [];
    let currentVariant = variantRef.current;
    const currentAccessories = {
      glasses: resolveGlasses(accessoriesRef.current),
      headphones: resolveHeadphones(accessoriesRef.current),
      hat: resolveHat(accessoriesRef.current),
    };
    const headBaseScale = new THREE.Vector3(1, 1, 1);

    const registerEarMaterials = (ears: THREE.Group) => {
      const glow = ears.userData.glowMaterial as THREE.MeshStandardMaterial | undefined;
      const shell = ears.userData.shellMaterial as THREE.MeshStandardMaterial | undefined;
      earGlowMaterials = glow ? [glow] : [];
      earShellMaterials = shell ? [shell] : [];
    };

    const armBase = new THREE.Euler();
    const handBase = new THREE.Euler();
    const restingBase = new THREE.Euler();
    const headBase = new THREE.Euler();
    const armOffset = new THREE.Vector3(...IDLE_ARM);
    const handOffset = new THREE.Vector3(0.05, 0.08, 0.1);
    const headOffset = new THREE.Vector3();
    const restingOffset = new THREE.Vector3();

    const heartNodes: Array<{ node: THREE.Object3D; base: THREE.Vector3 }> = [];
    const cheekNodes: Array<{ node: THREE.Object3D; base: THREE.Vector3 }> = [];
    let smileScale = 1;

    const glowTexture = createGlowTexture();
    const starTexture = createStarTexture();

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(settingsRef.current.accentColor),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(3, 3, 1);
    glowSprite.position.set(0, 0, -1.1);
    scene.add(glowSprite);

    const ringGeometry = new THREE.RingGeometry(0.68, 0.88, 56);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(settingsRef.current.accentColor),
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const baseRing = new THREE.Mesh(ringGeometry, ringMaterial);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = -MODEL_HEIGHT / 2 + 0.02;
    scene.add(baseRing);

    const starCount = 15;
    const starPositions = new Float32Array(starCount * 3);
    const starParticles: StarParticle[] = [];
    for (let i = 0; i < starCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.75 + Math.random() * 0.9;
      starParticles.push({
        x: Math.cos(angle) * radius,
        y: Math.random() * 1.8 - 0.9,
        z: Math.sin(angle) * radius * 0.6,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random(),
        sway: 0.15 + Math.random() * 0.3,
      });
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      map: starTexture,
      color: new THREE.Color(settingsRef.current.accentColor),
      size: compact ? 9 : 12,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;

        // Debug: traverse scene to identify all mesh/group names
        console.log('[Avatar3D] GLTF loaded, traversing scene:');
        gltf.scene.traverse((object) => {
          console.log(`  ${object.type}: "${object.name}"`);
        });

        // Identify accessory meshes in the GLTF hierarchy
        accessoryMeshes.length = 0;
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const nameLower = object.name?.toLowerCase() || '';
          if (
            nameLower.includes('glass') ||
            nameLower.includes('gafa') ||
            nameLower.includes('gafas') ||
            nameLower.includes('headphone') ||
            nameLower.includes('audifono') ||
            nameLower.includes('hat') ||
            nameLower.includes('gorro') ||
            nameLower.includes('crown') ||
            nameLower.includes('corona')
          ) {
            accessoryMeshes.push({ name: object.name || 'unknown', mesh: object });
          }
        });

        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = (MODEL_HEIGHT / Math.max(size.y, 0.001)) * modelScale;

        root.scale.setScalar(scale);
        root.position.copy(center).multiplyScalar(-scale);
        holder.add(root);

        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const mesh = object as THREE.Mesh;
          const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          meshMaterials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              materials.add(material);
              if (material.name === 'Shell') {
                shellMaterial = material;
                shellMaterials.add(material);
              }
              if (material.name === 'Pink') {
                pinkMaterial = material;
                accentMaterials.add(material);
              }
              if (material.name === 'Eye') eyeMaterial = material;
              if (material.name === 'Blush') blushMaterial = material;
              if (material.name === 'Heart') heartMaterial = material;
            }
          });

          if (mesh.name === 'antennaHeart' || mesh.name === 'chestHeart') {
            heartNodes.push({ node: mesh, base: mesh.scale.clone() });
          } else if (mesh.name === 'cheekLeft' || mesh.name === 'cheekRight') {
            cheekNodes.push({ node: mesh, base: mesh.scale.clone() });
          } else if (mesh.name === 'smile') {
            smileNode = mesh;
            smileScale = mesh.scale.x;
          }
        });

        materials.forEach(tuneMaterial);

        leftOpenEye = root.getObjectByName('eyeLeft') ?? null;
        rightOpenEye = root.getObjectByName('eyeRight') ?? null;
        leftHappyEye = root.getObjectByName('eyeHappyLeft') ?? null;
        rightHappyEye = root.getObjectByName('eyeHappyRight') ?? null;
        winkEye = root.getObjectByName('eyeWinkLeft') ?? null;
        if (winkEye) winkEye.visible = false;

        headNode = root.getObjectByName('head') ?? null;
        wavingArm = root.getObjectByName('wavingArm') ?? null;
        wavingHand = root.getObjectByName('wavingHand') ?? null;
        restingArm = root.getObjectByName('restingArm') ?? null;

        if (wavingArm) armBase.copy(wavingArm.rotation);
        if (wavingHand) handBase.copy(wavingHand.rotation);
        if (restingArm) restingBase.copy(restingArm.rotation);
        if (headNode) {
          headBase.copy(headNode.rotation);
          headBaseScale.copy(headNode.scale);
        }

        // Attach accessories directly to the scene holder (not the head node)
// so they don't depend on head tracking and use absolute positioning.
      if (currentAccessories.glasses && !glassesGroup) {
        glassesGroup = createGlasses();
        glassesRef.current = glassesGroup;
        holder.add(glassesGroup);
      }
      if (currentAccessories.headphones && !headphonesGroup) {
        headphonesGroup = createHeadphones();
        headphonesRef.current = headphonesGroup;
        holder.add(headphonesGroup);
      }
      if (currentAccessories.hat && !hatGroup) {
        hatGroup = createHat();
        hatRef.current = hatGroup;
        holder.add(hatGroup);
      }

        // Procedural cyber-cat ears are created once and mounted on the head
        // (falling back to the robot root) so the active variant can simply
        // toggle their visibility.
        if (!cyberEarsGroup) {
          cyberEarsGroup = createCyberEars();
          cyberEarsGroup.visible = currentVariant === 'cyber-cat';
          registerEarMaterials(cyberEarsGroup);
          (headNode ?? holder).add(cyberEarsGroup);
        }

          // Aplicar visibilidad de accesorios según el estado actual
          accessoryMeshes.forEach(({ name: meshName, mesh }) => {
            const nameLower = meshName.toLowerCase();
            if (nameLower.includes('glass') || nameLower.includes('gafa')) {
              mesh.visible = currentAccessories.glasses;
            } else if (nameLower.includes('headphone') || nameLower.includes('audifono')) {
              mesh.visible = currentAccessories.headphones;
            } else if (nameLower.includes('hat') || nameLower.includes('gorro') || nameLower.includes('crown') || nameLower.includes('corona')) {
              mesh.visible = currentAccessories.hat;
            }
          });

          // Apply variant colors and proportions
        applyVariantColors(currentVariant, shellMaterials, accentMaterials, rimLight);
        const initialVariantConfig = getVariantConfig(currentVariant);
        holder.scale.set(
          initialVariantConfig.bodyScale[0],
          initialVariantConfig.bodyScale[1],
          initialVariantConfig.bodyScale[2],
        );
        if (headNode) {
          headNode.scale.set(
            headBaseScale.x * initialVariantConfig.headScale,
            headBaseScale.y * initialVariantConfig.headScale,
            headBaseScale.z * initialVariantConfig.headScale,
          );
        }

        if (shellMaterial) shellMaterial.color.set(settingsRef.current.bodyTone);
        if (eyeMaterial) {
          eyeMaterial.color.set(settingsRef.current.eyeColor);
          eyeMaterial.emissive.set(settingsRef.current.eyeColor);
          eyeMaterial.emissiveIntensity = 0.55;
        }
        if (blushMaterial) {
          blushMaterial.color.set(settingsRef.current.eyeColor);
          blushMaterial.emissive.set(settingsRef.current.eyeColor);
        }
        if (heartMaterial) {
          heartMaterial.color.set(settingsRef.current.accentColor);
          heartMaterial.emissive.set(settingsRef.current.accentColor);
        }
        if (pinkMaterial) {
          pinkMaterial.color.set(settingsRef.current.accentColor);
          pinkMaterial.emissive.set(settingsRef.current.accentColor);
        }
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error(`[Avatar3D] Could not load ${MODEL_URL}`, error);
        const fallback = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.4 });
        materials.add(fallback);
        holder.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), fallback));
      },
    );

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const clock = new THREE.Clock();
    const accentColor = new THREE.Color();
    const eyeColor = new THREE.Color();
    const bodyColor = new THREE.Color();
    const moodAccent = new THREE.Color();
    const targetHead = new THREE.Vector3();
    const targetArm = new THREE.Vector3();
    const targetHand = new THREE.Vector3();
    const targetResting = new THREE.Vector3();
    let elapsed = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;
      const ease = Math.min(1, delta * 5);
      const currentMood = moodRef.current;
      const isThinking = currentMood === 'thinking';
      const isSuccess = currentMood === 'success';

      accentColor.set(settingsRef.current.accentColor);
      eyeColor.set(settingsRef.current.eyeColor);
      bodyColor.set(settingsRef.current.bodyTone);
      moodAccent.copy(isThinking ? THINK_COLOR : accentColor);

      if (shellMaterial) shellMaterial.color.lerp(bodyColor, ease);

      if (eyeMaterial) {
        eyeMaterial.color.lerp(eyeColor, ease);
        eyeMaterial.emissive.lerp(isThinking ? moodAccent : eyeColor, ease);
        eyeMaterial.emissiveIntensity += ((isThinking ? 1.15 : isSuccess ? 0.85 : 0.5) - eyeMaterial.emissiveIntensity) * ease;
      }

      if (blushMaterial) {
        blushMaterial.color.lerp(isThinking ? moodAccent : eyeColor, ease);
        blushMaterial.emissive.lerp(isThinking ? moodAccent : eyeColor, ease);
      }

      if (heartMaterial) {
        heartMaterial.color.lerp(isThinking ? moodAccent : accentColor, ease);
        heartMaterial.emissive.lerp(isThinking ? moodAccent : accentColor, ease);
        heartMaterial.emissiveIntensity += ((isThinking ? 1.1 : isSuccess ? 1.3 : 0.6) - heartMaterial.emissiveIntensity) * ease;
      }

      if (pinkMaterial) {
        pinkMaterial.color.lerp(isThinking ? moodAccent : accentColor, ease);
        pinkMaterial.emissive.lerp(isThinking ? moodAccent : accentColor, ease);
      }

      // Cyber-cat inner ear follows the live accent hue; the armor shell
      // follows the head/body tone so the ears stay cohesive with the robot.
      if (earGlowMaterials.length) {
        earGlowMaterials.forEach((material) => {
          material.color.lerp(isThinking ? moodAccent : accentColor, ease);
          material.emissive.lerp(isThinking ? moodAccent : accentColor, ease);
        });
      }
      if (earShellMaterials.length) {
        earShellMaterials.forEach((material) => {
          material.color.lerp(bodyColor, ease);
        });
      }

      glowMaterial.color.lerp(isThinking ? moodAccent : accentColor, ease);
      shineRing(ringMaterial, glowMaterial, isThinking, isSuccess, accentColor, moodAccent, elapsed, ease);

      if (rimLight) {
        rimLight.color.lerp(isThinking ? moodAccent : accentColor, ease);
        rimLight.intensity += ((isThinking ? 2.4 : isSuccess ? 2.0 : 1.4) - rimLight.intensity) * ease;
      }

      if (headNode) {
        // Thinking tilts the head down/forward and noticeably to the side.
        targetHead.set(
          isThinking ? 0.1 : 0,
          isThinking ? -0.12 : isSuccess ? 0.08 : 0,
          isThinking ? 0.2 : isSuccess ? 0.05 : 0,
        );
        headOffset.lerp(targetHead, ease);
        headNode.rotation.set(headBase.x + headOffset.x, headBase.y + headOffset.y, headBase.z + headOffset.z);

        const variantHeadScale = getVariantConfig(currentVariant).headScale;
        const personalityScale = settingsRef.current.personality === 'chibi' ? 1.08 : 1;
        const headScale = variantHeadScale * personalityScale;
        headNode.scale.x += (headBaseScale.x * headScale - headNode.scale.x) * ease;
        headNode.scale.y += (headBaseScale.y * headScale - headNode.scale.y) * ease;
        headNode.scale.z += (headBaseScale.z * headScale - headNode.scale.z) * ease;
      }

      // Sync variant changes: recolor, retune proportions and toggle the ears.
      if (variantRef.current !== currentVariant) {
        currentVariant = variantRef.current;
        applyVariantColors(currentVariant, shellMaterials, accentMaterials, rimLight);

        const variantConfig = getVariantConfig(currentVariant);
        holder.scale.set(
          variantConfig.bodyScale[0],
          variantConfig.bodyScale[1],
          variantConfig.bodyScale[2],
        );
        if (headNode) {
          headNode.scale.set(
            headBaseScale.x * variantConfig.headScale,
            headBaseScale.y * variantConfig.headScale,
            headBaseScale.z * variantConfig.headScale,
          );
        }
      }

      // Sync accessory changes - just toggle visibility via refs
      const nextAccessories = accessoriesRef.current;

      if (glassesRef.current) glassesRef.current.visible = resolveGlasses(nextAccessories);
      if (headphonesRef.current) headphonesRef.current.visible = resolveHeadphones(nextAccessories);
      if (hatRef.current) hatRef.current.visible = resolveHat(nextAccessories);

      // Sync cyber-cat ears: create once, then just toggle visibility so the
      // switch is instant and allocation-free.
      if (headNode) {
        if (!cyberEarsGroup) {
          cyberEarsGroup = createCyberEars();
          registerEarMaterials(cyberEarsGroup);
          headNode.add(cyberEarsGroup);
        }
        cyberEarsGroup.visible = currentVariant === 'cyber-cat';
      }

      if (wavingArm) {
        const armArr = isThinking ? THINKING_ARM : isSuccess ? SUCCESS_ARM : IDLE_ARM;
        targetArm.set(armArr[0], armArr[1], armArr[2]);
        armOffset.lerp(targetArm, ease);
        const wave = isSuccess
          ? Math.sin(elapsed * 6) * 0.17
          : isThinking
            ? Math.sin(elapsed * 1.6) * 0.025
            : Math.sin(elapsed * 2.2) * 0.1;
        wavingArm.rotation.set(armBase.x + armOffset.x, armBase.y + armOffset.y, armBase.z + armOffset.z + wave);
      }

      if (wavingHand) {
        targetHand.set(
          isSuccess ? 0.03 : isThinking ? -0.15 : 0.05,
          isSuccess ? 0.14 : isThinking ? 0.1 : 0.08,
          isSuccess ? 0.12 : isThinking ? 0.3 : 0.1,
        );
        handOffset.lerp(targetHand, ease);
        const handWave = isSuccess
          ? Math.sin(elapsed * 7) * 0.24
          : isThinking
            ? Math.sin(elapsed * 2) * 0.03
            : Math.sin(elapsed * 3) * 0.15;
        wavingHand.rotation.set(handBase.x + handOffset.x, handBase.y + handOffset.y + Math.cos(elapsed * 2.6) * 0.08, handBase.z + handOffset.z + handWave);
      }

      if (restingArm) {
        // Keep the resting (right) arm lowered beside the body while pondering
        // so the hand can't clip through the face/head mesh.
        targetResting.set(isThinking ? 0.1 : 0, 0, isThinking ? 0.15 : 0);
        restingOffset.lerp(targetResting, ease);
        restingArm.rotation.set(
          restingBase.x + restingOffset.x,
          restingBase.y + restingOffset.y,
          restingBase.z + restingOffset.z + Math.sin(elapsed * 1.3) * 0.03,
        );
      }

      const bounce = isSuccess
        ? Math.abs(Math.sin(elapsed * 7)) * 0.08
        : isThinking
          ? Math.sin(elapsed * 1.5) * 0.015
          : Math.sin(elapsed * 1.3) * 0.025;
      holder.position.y = bounce;
      holder.rotation.z = isSuccess ? Math.sin(elapsed * 7) * 0.035 : Math.sin(elapsed * 1.2) * 0.012;

      if (leftOpenEye) leftOpenEye.visible = !isSuccess && !isThinking;
      if (rightOpenEye) rightOpenEye.visible = !isSuccess;
      if (leftHappyEye) leftHappyEye.visible = isSuccess || isThinking;
      if (rightHappyEye) rightHappyEye.visible = isSuccess;

      if (smileNode) {
        const smileTarget = smileScale * (isSuccess ? 1.35 : isThinking ? 0.85 : 1.1);
        smileNode.scale.x += (smileTarget - smileNode.scale.x) * ease;
        smileNode.scale.y += (smileTarget - smileNode.scale.y) * ease;
      }

      cheekNodes.forEach(({ node, base }) => {
        const cheekScale = isSuccess ? 1.55 : isThinking ? 1.3 : 1.1;
        node.scale.x += (base.x * cheekScale - node.scale.x) * ease;
        node.scale.y += (base.y * cheekScale - node.scale.y) * ease;
      });

      heartNodes.forEach(({ node, base }) => {
        const pulse = 1 + Math.sin(elapsed * (isSuccess ? 8 : 2.6)) * (isSuccess ? 0.12 : 0.06);
        node.scale.set(base.x * pulse, base.y * pulse, base.z * pulse);
      });

      stars.visible = isSuccess;
      if (isSuccess) {
        starMaterial.color.lerp(accentColor, 0.15);
        starMaterial.opacity += (0.95 - starMaterial.opacity) * ease;
        const positions = starGeometry.getAttribute('position') as THREE.BufferAttribute;
        const array = positions.array as Float32Array;
        for (let i = 0; i < starCount; i += 1) {
          const particle = starParticles[i];
          const progress = (elapsed * particle.speed + particle.phase) % 1.2;
          array[i * 3] = particle.x + Math.sin(elapsed * 2 + particle.phase * 6) * particle.sway;
          array[i * 3 + 1] = particle.y + progress * 1.5;
          array[i * 3 + 2] = particle.z;
        }
        positions.needsUpdate = true;
      } else {
        starMaterial.opacity += (0 - starMaterial.opacity) * ease;
      }

      baseRing.rotation.z += delta * 0.12;
      controls.update();
      if (effectiveAccessories.hat && hatRef.current) {
        transformControls.attach(hatRef.current);
      } else if (effectiveAccessories.glasses && glassesRef.current) {
        transformControls.attach(glassesRef.current);
      } else if (effectiveAccessories.headphones && headphonesRef.current) {
        transformControls.attach(headphonesRef.current);
      } else {
        transformControls.detach();
      }
      transformControls.update(delta);
      renderer.render(scene, camera);
    };

    function shineRing(
      ring: THREE.MeshBasicMaterial,
      glow: THREE.SpriteMaterial,
      thinking: boolean,
      success: boolean,
      accent: THREE.Color,
      cyan: THREE.Color,
      time: number,
      easeValue: number,
    ) {
      ring.color.lerp(thinking ? cyan : accent, easeValue);
      ring.opacity += ((thinking ? 0.5 : success ? 0.45 : 0.22) - ring.opacity) * easeValue;
      const pulse = thinking ? 0.42 + Math.sin(time * 4) * 0.12 : success ? 0.5 : 0.25;
      glow.opacity += (pulse - glow.opacity) * easeValue;
    }

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          meshMaterials.forEach((material) => material.dispose());
        }
      });

      glowMaterial.dispose();
      glowTexture.dispose();
      starTexture.dispose();
      renderer.dispose();
      transformControls.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [interactive, compact]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${className}`}
      role="img"
      aria-label="Avatar 3D personalizable"
    >
      {effectiveReaction === 'thinking' && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 flex -translate-x-1/2 animate-bounce items-center gap-1.5 rounded-2xl border border-purple-500/40 bg-slate-900/90 px-4 py-2 text-purple-300 shadow-xl backdrop-blur-sm">
          <span className="mr-1 text-xs font-semibold">Pensando</span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:100ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:200ms]" />
        </div>
      )}
    </div>
  );
}
