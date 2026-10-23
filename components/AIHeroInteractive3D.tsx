'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  useAvatar,
  type AvatarAccessories,
  type AvatarMood,
  type AvatarVariant,
} from '@/context/AvatarContext';

const MODEL_URL = '/models/robot.glb';
const MODEL_HEIGHT = 2.55;
const CREAM = 0xfdfbf7;
const PINK = 0xf472b6;
const RING_COUNT = 700;
const ORB_COUNT = 320;
const ORB_GLOW_MIN = 1.05;
const ORB_GLOW_MAX = 1.9;
const LG_BREAKPOINT = 1024;

interface RingParticle {
  speed: number;
  phase: number;
}

interface OrbParticle {
  nx: number;
  ny: number;
  hx: number;
  hy: number;
  speed: number;
  phase: number;
}

interface Expression {
  label: string;
  eyeStyle: 'open' | 'wink' | 'closed' | 'thinking';
  eyeColor: THREE.Color;
  eyeEmissive: THREE.Color;
  eyeEmissiveIntensity: number;
  blushColor: THREE.Color;
  blushEmissive: THREE.Color;
  cheekScale: number;
  smileScale: number;
  heartColor: THREE.Color;
  heartEmissive: THREE.Color;
  heartEmissiveIntensity: number;
  heartPulse: number;
  rimColor: THREE.Color;
}

const EXPRESSIONS: Expression[] = [
  {
    label: 'Default sweet',
    eyeStyle: 'open',
    eyeColor: new THREE.Color(0xf9b6cf),
    eyeEmissive: new THREE.Color(0xf472b6),
    eyeEmissiveIntensity: 0.5,
    blushColor: new THREE.Color(0xf8b8cf),
    blushEmissive: new THREE.Color(0xf472b6),
    cheekScale: 1.1,
    smileScale: 1.15,
    heartColor: new THREE.Color(0xf9b6cf),
    heartEmissive: new THREE.Color(0xf472b6),
    heartEmissiveIntensity: 0.7,
    heartPulse: 2.6,
    rimColor: new THREE.Color(0xa855f7),
  },
  {
    label: 'Wink and joy',
    eyeStyle: 'wink',
    eyeColor: new THREE.Color(0xfda4af),
    eyeEmissive: new THREE.Color(0xfb7185),
    eyeEmissiveIntensity: 0.6,
    blushColor: new THREE.Color(0xfecdd3),
    blushEmissive: new THREE.Color(0xfb7185),
    cheekScale: 1.35,
    smileScale: 1.3,
    heartColor: new THREE.Color(0xfda4af),
    heartEmissive: new THREE.Color(0xfb7185),
    heartEmissiveIntensity: 0.8,
    heartPulse: 3.4,
    rimColor: new THREE.Color(0xf472b6),
  },
  {
    label: 'Happy closed',
    eyeStyle: 'closed',
    eyeColor: new THREE.Color(0xfbcfe8),
    eyeEmissive: new THREE.Color(0xf472b6),
    eyeEmissiveIntensity: 0.7,
    blushColor: new THREE.Color(0xfbcfe8),
    blushEmissive: new THREE.Color(0xec4899),
    cheekScale: 1.55,
    smileScale: 1.4,
    heartColor: new THREE.Color(0xf9a8d4),
    heartEmissive: new THREE.Color(0xec4899),
    heartEmissiveIntensity: 0.95,
    heartPulse: 2.2,
    rimColor: new THREE.Color(0xec4899),
  },
  {
    label: 'Deep thought',
    eyeStyle: 'thinking',
    eyeColor: new THREE.Color(0xfef3c7),
    eyeEmissive: new THREE.Color(0xf59e0b),
    eyeEmissiveIntensity: 0.9,
    blushColor: new THREE.Color(0xfef08a),
    blushEmissive: new THREE.Color(0xf59e0b),
    cheekScale: 1.05,
    smileScale: 0.95,
    heartColor: new THREE.Color(0xfde68a),
    heartEmissive: new THREE.Color(0xf59e0b),
    heartEmissiveIntensity: 0.6,
    heartPulse: 1.8,
    rimColor: new THREE.Color(0xf59e0b),
  },
];

const THINKING_EXPRESSION_INDEX = 3;
const SUCCESS_EXPRESSION_INDEX = 1;

const LIMB_KEYS = [
  'wavingArm',
  'wavingHand',
  'restingArm',
  'restingHand',
  'head',
  'legLeft',
  'legRight',
] as const;

type LimbKey = (typeof LIMB_KEYS)[number];
type LimbAngles = readonly [number, number, number];

interface LimbPose {
  wavingArm: LimbAngles;
  wavingHand: LimbAngles;
  restingArm: LimbAngles;
  restingHand: LimbAngles;
  head: LimbAngles;
  legLeft: LimbAngles;
  legRight: LimbAngles;
  wave: boolean;
}

const POSES: LimbPose[] = [
  {
    wavingArm: [0.12, 0.1, 0.3],
    wavingHand: [0.05, 0.08, 0.1],
    restingArm: [0, 0, 0],
    restingHand: [0, 0, 0],
    head: [0, 0, 0],
    legLeft: [0, 0, 0],
    legRight: [0, 0, 0],
    wave: true,
  },
  {
    wavingArm: [0.05, 0.1, 1.2],
    wavingHand: [0, 0.15, -0.3],
    restingArm: [0.05, -0.1, 0.55],
    restingHand: [0, -0.15, -0.4],
    head: [0.02, 0.08, 0.1],
    legLeft: [0, 0, -0.04],
    legRight: [0, 0, 0.04],
    wave: false,
  },
  {
    wavingArm: [0.18, -0.12, 0.24],
    wavingHand: [-0.15, 0.1, 0.3],
    restingArm: [0.08, 0, 0.2],
    restingHand: [0, 0, 0],
    head: [0.06, -0.16, -0.14],
    legLeft: [0, 0, 0.03],
    legRight: [0, 0, -0.03],
    wave: false,
  },
];

// Classic pondering pose: the right (resting) arm is bent up so the hand comes
// to rest near the lower chin/visor, while the opposite (waving) arm drops to a
// relaxed position at the side. robot.glb bakes the "hello" pose into the arm
// geometry, so the waving arm needs an explicit rotation to bring it down.
//
// The head shell on this rig is large relative to the arm, so a hand placed at
// chin height naturally lands inside the head mesh. THINKING_ARM_FORWARD nudges
// the pondering shoulder forward (world +Z) so the hand sits just in front of
// the face instead of clipping through it. Angles were solved against the GLB
// arm/hand node transforms.
const THINKING_ARM_FORWARD = 0.22;

const THINKING_POSE: LimbPose = {
  wavingArm: [0.1, 0, -0.2],
  wavingHand: [0, 0, 0],
  restingArm: [-1.6, 0.3, -1.1],
  restingHand: [0.15, 0.1, 0.2],
  head: [0.05, -0.1, 0.15],
  legLeft: [0, 0, 0],
  legRight: [0, 0, 0],
  wave: false,
};

interface Colorway {
  shell: THREE.Color;
  accent: THREE.Color;
  rim: THREE.Color;
}

const COLORWAYS: Colorway[] = [
  {
    shell: new THREE.Color(0xfdfbf7),
    accent: new THREE.Color(0xf472b6),
    rim: new THREE.Color(0xa855f7),
  },
  {
    shell: new THREE.Color(0xf0e4ff),
    accent: new THREE.Color(0xc084fc),
    rim: new THREE.Color(0xec4899),
  },
  {
    shell: new THREE.Color(0xe2f4ff),
    accent: new THREE.Color(0x22d3ee),
    rim: new THREE.Color(0x38bdf8),
  },
];

const VARIANT_COLORS: Record<string, Colorway> = {
  classic: {
    shell: new THREE.Color(0xfdfbf7),
    accent: new THREE.Color(0xf472b6),
    rim: new THREE.Color(0xa855f7),
  },
  chibi: {
    shell: new THREE.Color(0xfce7f3),
    accent: new THREE.Color(0xec4899),
    rim: new THREE.Color(0xf472b6),
  },
  'cyber-cat': {
    shell: new THREE.Color(0x1e1e2e),
    accent: new THREE.Color(0x00ffff),
    rim: new THREE.Color(0xff00ff),
  },
};

interface VariantProportions {
  headScale: number;
  robotScale: [number, number, number];
}

const VARIANT_PROPORTIONS: Record<string, VariantProportions> = {
  classic: { headScale: 1, robotScale: [1, 1, 1] },
  chibi: { headScale: 1.15, robotScale: [1.05, 0.98, 1.05] },
  'cyber-cat': { headScale: 1, robotScale: [1, 1, 1] },
};

function getVariantProportions(variant: string): VariantProportions {
  return VARIANT_PROPORTIONS[variant] ?? VARIANT_PROPORTIONS.classic;
}

function createGlasses(): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  const leftLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), frameMat);
  leftLens.rotation.x = Math.PI / 2;
  leftLens.position.set(-0.2, 0.1, 0.42);

  const rightLens = leftLens.clone();
  rightLens.position.x = 0.2;

  group.add(leftLens, rightLens);
  return group;
}

function createHeadphones(): THREE.Group {
  const group = new THREE.Group();
  const hpMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });

  const leftCup = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16), hpMat);
  leftCup.rotation.z = Math.PI / 2;
  leftCup.position.set(-0.5, 0.1, 0);

  const rightCup = leftCup.clone();
  rightCup.position.x = 0.5;

  group.add(leftCup, rightCup);
  return group;
}

function createHat(): THREE.Group {
  const group = new THREE.Group();
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
  cap.position.set(0, 0.4, 0);

  group.add(cap);
  return group;
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

const ROBOT_MESSAGES = [
  '¡Quiubo! Soy tu asistente de PlanAI, todo bien, todo bonito ',
  '¡Qué más pues! Vamos a armar el parche para organizar tus tareas ',
  '¡Qué bacano! Haz clic en mi carita para cambiar de pose y ver qué tal ',
  '¡Listo el pollo! Aquí estoy a la orden para ayudarte a triunfar hoy ',
];

let lastMessageIndex = -1;
let isSpeaking = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;

const SPANISH_FEMALE_VOICE = /female|helena|laura|paulina|monica|mónica|luisa|marisol|sabina|elvira|lucia|lucía|sofia|sofía|penelope|penélope|carmen|esperanza|ximena|valentina/i;
const QUALITY_VOICE = /natural|neural|premium|enhanced|google|microsoft/i;

function pickSpanishFemaleVoice(voices: SpeechSynthesisVoice[]) {
  const spanishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('es'));

  return (
    spanishVoices.find((voice) => voice.lang.toLowerCase() === 'es-co' && QUALITY_VOICE.test(voice.name)) ??
    spanishVoices.find((voice) => voice.lang.toLowerCase() === 'es-co' && SPANISH_FEMALE_VOICE.test(voice.name)) ??
    spanishVoices.find((voice) => voice.lang.toLowerCase() === 'es-co') ??
    spanishVoices.find((voice) => QUALITY_VOICE.test(voice.name) && SPANISH_FEMALE_VOICE.test(voice.name)) ??
    spanishVoices.find((voice) => QUALITY_VOICE.test(voice.name)) ??
    spanishVoices.find((voice) => SPANISH_FEMALE_VOICE.test(voice.name)) ??
    spanishVoices.find((voice) => voice.localService) ??
    spanishVoices.find((voice) => voice.lang.toLowerCase().startsWith('es-es')) ??
    spanishVoices.find((voice) => voice.lang.toLowerCase().startsWith('es-mx')) ??
    spanishVoices[0] ??
    null
  );
}

function speakMessage(text: string) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    !('SpeechSynthesisUtterance' in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();
  isSpeaking = false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 1.0;
  utterance.rate = 0.98;

  const preferredVoice = pickSpanishFemaleVoice(window.speechSynthesis.getVoices());
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    if (activeUtterance === utterance) {
      isSpeaking = true;
    }
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) isSpeaking = false;
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) isSpeaking = false;
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function speakRandomMessage() {
  let index = Math.floor(Math.random() * ROBOT_MESSAGES.length);
  if (ROBOT_MESSAGES.length > 1 && index === lastMessageIndex) {
    index = (index + 1) % ROBOT_MESSAGES.length;
  }
  lastMessageIndex = index;
  speakMessage(ROBOT_MESSAGES[index]);
}

function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.32, 'rgba(255,255,255,0.72)');
    gradient.addColorStop(0.68, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function tuneMaterial(material: THREE.MeshStandardMaterial) {
  switch (material.name) {
    case 'Shell':
      material.color.setHex(CREAM);
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
      material.emissive.setHex(PINK);
      material.emissiveIntensity = 0.3;
      material.roughness = 0.38;
      material.metalness = 0;
      break;
    case 'Eye':
      material.emissive.setHex(PINK);
      material.emissiveIntensity = 0.35;
      material.roughness = 0.3;
      material.metalness = 0;
      break;
    case 'Heart':
      material.emissive.setHex(PINK);
      material.emissiveIntensity = 0.4;
      material.roughness = 0.35;
      material.metalness = 0;
      break;
    case 'Blush':
      material.emissive.setHex(PINK);
      material.emissiveIntensity = 0.3;
      material.roughness = 0.4;
      material.metalness = 0;
      break;
    default: {
      const { r, g, b } = material.color;
      if (r > g + 0.08 && r > b + 0.08) {
        material.emissive.setHex(PINK);
        material.emissiveIntensity = 0.3;
      } else if (r + g + b > 2.1) {
        material.color.setHex(CREAM);
      }
      break;
    }
  }

  material.transparent = true;
  material.depthWrite = true;
  material.opacity = 1;
  material.needsUpdate = true;
}

interface AIHeroInteractive3DProps {
  variant?: AvatarVariant;
  accessories?: AvatarAccessories;
  reactionState?: AvatarMood;
  showParticles?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
}

export default function AIHeroInteractive3D({
  variant: variantProp,
  accessories: accessoriesProp,
  reactionState: reactionStateProp,
  showParticles = true,
  cameraPosition = [0, -0.15, 6.2],
  cameraFov = 42,
}: AIHeroInteractive3DProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const thoughtBubbleRef = useRef<HTMLDivElement>(null);
  const { settings, mood } = useAvatar();

  const effectiveVariant = variantProp ?? settings.variant;
  const effectiveAccessories = useMemo(() => {
    const src = accessoriesProp ?? settings.accessories;
    return {
      glasses: Boolean(src?.glasses),
      headphones: Boolean(src?.headphones),
      hat: Boolean(src?.hat),
    };
  }, [accessoriesProp, settings.accessories]);
  const effectiveReaction = reactionStateProp ?? mood;
  const variantRef = useRef(effectiveVariant);
  const accessoriesRef = useRef(effectiveAccessories);
  const settingsRef = useRef(settings);
  const reactionRef = useRef(effectiveReaction);
  const glassesGroupRef = useRef<THREE.Group | null>(null);
  const headphonesGroupRef = useRef<THREE.Group | null>(null);
  const hatGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    variantRef.current = effectiveVariant;
  }, [effectiveVariant]);

  useEffect(() => {
    accessoriesRef.current = effectiveAccessories;
  }, [effectiveAccessories]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    reactionRef.current = effectiveReaction;
  }, [effectiveReaction]);

  // Instant accessory visibility sync via useEffect
  useEffect(() => {
    if (glassesGroupRef.current) glassesGroupRef.current.visible = !!effectiveAccessories.glasses;
    if (headphonesGroupRef.current) headphonesGroupRef.current.visible = !!effectiveAccessories.headphones;
    if (hatGroupRef.current) hatGroupRef.current.visible = !!effectiveAccessories.hat;
  }, [effectiveAccessories]);

  useEffect(() => {
    const container = containerRef.current;
    const hitArea = hitAreaRef.current;
    if (!container || !hitArea) return;

    const getWidth = () => container.clientWidth || window.innerWidth;
    const getHeight = () => container.clientHeight || window.innerHeight;
    const isDesktop = () => window.innerWidth >= LG_BREAKPOINT;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(getWidth(), getHeight());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      cameraFov,
      (isDesktop() ? getWidth() / 2 : getWidth()) / getHeight(),
      0.1,
      100,
    );
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

    // Ambient orb layer rendered full-screen, independent of the robot camera.
    const orbScene = new THREE.Scene();
    const orbCamera = new THREE.OrthographicCamera(
      -getWidth() / getHeight(),
      getWidth() / getHeight(),
      1,
      -1,
      0.1,
      10,
    );
    orbCamera.position.z = 2;

    const controls = new OrbitControls(camera, hitArea);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.enablePan = false;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
    };
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffe4e6, 2.0);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 1.5);
    rimLight.position.set(-5, -5, -5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffe9f2, 0.9);
    fillLight.position.set(-1, 2, 6);
    scene.add(fillLight);

    const holder = new THREE.Group();
    scene.add(holder);

    const materials = new Set<THREE.MeshStandardMaterial>();
    const shellMaterials = new Set<THREE.MeshStandardMaterial>();
    const accentMaterials = new Set<THREE.MeshStandardMaterial>();
    let openEyeLeft: THREE.Object3D | null = null;
    let openEyeRight: THREE.Object3D | null = null;
    let happyEyeLeft: THREE.Object3D | null = null;
    let happyEyeRight: THREE.Object3D | null = null;
    let winkEye: THREE.Object3D | null = null;
    const cheekMeshes: THREE.Mesh[] = [];
    const cheekBaseScales: THREE.Vector3[] = [];
    const heartMeshes: THREE.Mesh[] = [];
    const heartBaseScales: THREE.Vector3[] = [];
    let smileMesh: THREE.Mesh | null = null;
    let smileBaseY = 0;
    let mouthNode: THREE.Object3D | null = null;
    let mouthNodeBaseRotationX = 0;
    let mouthMorphMesh: THREE.Mesh | null = null;
    let mouthMorphIndex = -1;
    let mouthAmount = 0;
    let eyeMaterial: THREE.MeshStandardMaterial | null = null;
    let blushMaterial: THREE.MeshStandardMaterial | null = null;
    let heartMaterial: THREE.MeshStandardMaterial | null = null;
    let expressionIndex = 0;
    let poseIndex = 0;
    let lastReaction: AvatarMood = 'idle';
    // Smoothed, additive head tilt driven by the reaction state. Keeping it as
    // a separate offset avoids fighting the pose limb loop and prevents any
    // large/inverted head rotation.
    const headReactionTilt = new THREE.Vector3();
    const bubbleAnchor = new THREE.Vector3();
    const rimTarget = new THREE.Color();
    const earGlowTarget = new THREE.Color();
    const earShellTarget = new THREE.Color();

    // Accessory and variant state
    let cyberEarsGroup: THREE.Group | null = null;
    let earGlowMaterials: THREE.MeshStandardMaterial[] = [];
    let earShellMaterials: THREE.MeshStandardMaterial[] = [];
    let currentVariant = variantRef.current;
    const currentAccessories = { ...accessoriesRef.current };
    let headMesh: THREE.Object3D | null = null;
    const headBaseScale = new THREE.Vector3(1, 1, 1);

    const registerEarMaterials = (ears: THREE.Group) => {
      const glow = ears.userData.glowMaterial as THREE.MeshStandardMaterial | undefined;
      const shell = ears.userData.shellMaterial as THREE.MeshStandardMaterial | undefined;
      earGlowMaterials = glow ? [glow] : [];
      earShellMaterials = shell ? [shell] : [];
    };

    function applyProportions(variant: string) {
      const proportions = getVariantProportions(variant);
      holder.scale.set(
        proportions.robotScale[0],
        proportions.robotScale[1],
        proportions.robotScale[2],
      );
      if (headMesh) {
        headMesh.scale.set(
          headBaseScale.x * proportions.headScale,
          headBaseScale.y * proportions.headScale,
          headBaseScale.z * proportions.headScale,
        );
      }
    }

    function applyVariantColors(variant: string) {
      const variantColorway = VARIANT_COLORS[variant] || VARIANT_COLORS.classic;
      shellMaterials.forEach((material) => {
        material.color.set(variantColorway.shell);
      });
      accentMaterials.forEach((material) => {
        material.color.set(variantColorway.accent);
        material.emissive.set(variantColorway.accent);
      });
      rimLight.color.set(variantColorway.rim);
    }

    const applyFacialExpression = (index: number) => {
      const style = EXPRESSIONS[index].eyeStyle;
      const isOpen = style === 'open';
      const isWink = style === 'wink';
      const isClosed = style === 'closed';
      const isThinking = style === 'thinking';

      if (openEyeLeft) openEyeLeft.visible = isOpen || isThinking;
      if (openEyeRight) openEyeRight.visible = isOpen || isWink || isThinking;
      if (happyEyeLeft) happyEyeLeft.visible = isClosed;
      if (happyEyeRight) happyEyeRight.visible = isClosed;
      if (winkEye) winkEye.visible = isWink;

      expressionIndex = index;
    };

    const limbRig: Partial<
      Record<LimbKey, { node: THREE.Object3D; base: THREE.Euler; basePosition: THREE.Vector3 }>
    > = {};
    const limbOffset: Record<LimbKey, THREE.Vector3> = {
      wavingArm: new THREE.Vector3(...POSES[0].wavingArm),
      wavingHand: new THREE.Vector3(...POSES[0].wavingHand),
      restingArm: new THREE.Vector3(...POSES[0].restingArm),
      restingHand: new THREE.Vector3(...POSES[0].restingHand),
      head: new THREE.Vector3(...POSES[0].head),
      legLeft: new THREE.Vector3(...POSES[0].legLeft),
      legRight: new THREE.Vector3(...POSES[0].legRight),
    };

    const cyclePoseAndExpression = () => {
      // While the assistant is pondering, clicking must not break the pose.
      if (reactionRef.current === 'thinking') return;
      poseIndex = (poseIndex + 1) % POSES.length;
      applyFacialExpression((expressionIndex + 1) % EXPRESSIONS.length);
      speakRandomMessage();
    };

    let disposed = false;

    let glowTexture: THREE.CanvasTexture | null = null;
    let ringGeometry: THREE.BufferGeometry | null = null;
    let ringParticles: RingParticle[] = [];
    let basePositions: Float32Array | null = null;
    let ringMaterial: THREE.PointsMaterial | null = null;
    let dustRing: THREE.Points | null = null;

    let orbGeometry: THREE.BufferGeometry | null = null;
    let orbParticles: OrbParticle[] = [];
    let orbBaseColors: Float32Array | null = null;
    let orbMaterial: THREE.PointsMaterial | null = null;
    let orbHaloMaterial: THREE.PointsMaterial | null = null;

    if (showParticles) {
      glowTexture = createGlowTexture();

      // Soft dust ring that hugs the base of the robot while the hero fades.
      ringGeometry = new THREE.BufferGeometry();
      const ringPositions = new Float32Array(RING_COUNT * 3);
      const ringColors = new Float32Array(RING_COUNT * 3);
      basePositions = new Float32Array(RING_COUNT * 3);

      for (let i = 0; i < RING_COUNT; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.62 + Math.random() * 0.42;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.random() * 0.12;

        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        ringPositions[i * 3] = x;
        ringPositions[i * 3 + 1] = y;
        ringPositions[i * 3 + 2] = z;

        ringParticles.push({ speed: 0.12 + Math.random() * 0.22, phase: Math.random() });

        const pinkMix = Math.random();
        const ringGain = 1.18 + Math.random() * 0.22;
        ringColors[i * 3] = ringGain;
        ringColors[i * 3 + 1] = (0.55 + pinkMix * 0.18) * ringGain;
        ringColors[i * 3 + 2] = (0.72 + (1 - pinkMix) * 0.28) * ringGain;
      }

      ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      ringGeometry.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

      ringMaterial = new THREE.PointsMaterial({
        map: glowTexture,
        size: 0.088,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      dustRing = new THREE.Points(ringGeometry, ringMaterial);
      dustRing.visible = false;
      dustRing.position.y = -MODEL_HEIGHT / 2 + 0.05;
      scene.add(dustRing);

      // Persistent glowing orbs that live around the robot and spread across the page.
      orbGeometry = new THREE.BufferGeometry();
      const orbPositions = new Float32Array(ORB_COUNT * 3);
      const orbColors = new Float32Array(ORB_COUNT * 3);
      orbBaseColors = new Float32Array(ORB_COUNT * 3);
      const orbPalette = [
        { color: new THREE.Color(0xc084fc), gain: 1.06 },
        { color: new THREE.Color(0xa855f7), gain: 0.96 },
        { color: new THREE.Color(0xec4899), gain: 1.12 },
        { color: new THREE.Color(0xf472b6), gain: 1.04 },
        { color: new THREE.Color(0xf9a8d4), gain: 0.98 },
        { color: new THREE.Color(0x22d3ee), gain: 1.24 },
      ];

      for (let i = 0; i < ORB_COUNT; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.85;

        orbParticles.push({
          nx: Math.random() * 2 - 1,
          ny: Math.random() * 2 - 1,
          hx: Math.cos(angle) * radius,
          hy: Math.sin(angle) * radius * 1.15,
          speed: 0.25 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
        });

        const pick = orbPalette[Math.floor(Math.random() * orbPalette.length)];
        const brightness = (ORB_GLOW_MIN + Math.random() * (ORB_GLOW_MAX - ORB_GLOW_MIN)) * pick.gain;
        orbBaseColors[i * 3] = pick.color.r * brightness;
        orbBaseColors[i * 3 + 1] = pick.color.g * brightness;
        orbBaseColors[i * 3 + 2] = pick.color.b * brightness;

        orbColors[i * 3] = orbBaseColors[i * 3];
        orbColors[i * 3 + 1] = orbBaseColors[i * 3 + 1];
        orbColors[i * 3 + 2] = orbBaseColors[i * 3 + 2];

        orbPositions[i * 3] = 0;
        orbPositions[i * 3 + 1] = 0;
        orbPositions[i * 3 + 2] = 0;
      }

      orbGeometry.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));
      orbGeometry.setAttribute('color', new THREE.BufferAttribute(orbColors, 3));

      orbMaterial = new THREE.PointsMaterial({
        map: glowTexture,
        size: 11,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });

      const orbs = new THREE.Points(orbGeometry, orbMaterial);
      orbScene.add(orbs);

      orbHaloMaterial = new THREE.PointsMaterial({
        map: glowTexture,
        size: 28,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });

      const orbHalo = new THREE.Points(orbGeometry, orbHaloMaterial);
      orbScene.add(orbHalo);
    }

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;

        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = MODEL_HEIGHT / Math.max(size.y, 0.001);

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
              if (material.name === 'Shell') shellMaterials.add(material);
              if (material.name === 'Pink') accentMaterials.add(material);
              if (material.name === 'Eye') eyeMaterial = material;
              if (material.name === 'Blush') blushMaterial = material;
              if (material.name === 'Heart') heartMaterial = material;
            }
          });

          if (mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.name === 'Visor') {
            mesh.renderOrder = 10;
            mesh.material.depthWrite = true;
            mesh.material.transparent = true;
          } else {
            mesh.renderOrder = 0;
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
              mesh.material.depthWrite = true;
            }
          }

          if (mesh.name === 'cheekLeft' || mesh.name === 'cheekRight') {
            cheekMeshes.push(mesh);
            cheekBaseScales.push(mesh.scale.clone());
          } else if (mesh.name === 'antennaHeart' || mesh.name === 'chestHeart') {
            heartMeshes.push(mesh);
            heartBaseScales.push(mesh.scale.clone());
          } else if (mesh.name === 'smile') {
            smileMesh = mesh;
            smileBaseY = mesh.position.y;
          }
        });

        root.traverse((object) => {
          if (!mouthNode && /jaw|mouth|mandibula|mandíbula|boca/i.test(object.name)) {
            mouthNode = object;
            mouthNodeBaseRotationX = object.rotation.x;
          }

          if (object instanceof THREE.Mesh && object.morphTargetDictionary) {
            const morphKey = Object.keys(object.morphTargetDictionary).find((key) =>
              /jaw|mouth|open|talk|viseme/i.test(key),
            );

            if (morphKey) {
              mouthMorphMesh = object;
              mouthMorphIndex = object.morphTargetDictionary[morphKey];
            }
          }
        });

        materials.forEach(tuneMaterial);

        openEyeLeft = root.getObjectByName('eyeLeft') ?? null;
        openEyeRight = root.getObjectByName('eyeRight') ?? null;
        happyEyeLeft = root.getObjectByName('eyeHappyLeft') ?? null;
        happyEyeRight = root.getObjectByName('eyeHappyRight') ?? null;
        winkEye = root.getObjectByName('eyeWinkLeft') ?? null;

        for (const key of LIMB_KEYS) {
          const node = root.getObjectByName(key);
          if (node) {
            limbRig[key] = { node, base: node.rotation.clone(), basePosition: node.position.clone() };
          }
        }

        // Attach accessories based on settings
        const headNode = root.getObjectByName('head');
        if (headNode) {
          headMesh = headNode;
          headBaseScale.copy(headNode.scale);

          // Create all accessories once and add to head, visibility controlled by settings
          const glasses = createGlasses();
          glasses.visible = currentAccessories.glasses;
          headNode.add(glasses);
          glassesGroupRef.current = glasses;

          const headphones = createHeadphones();
          headphones.visible = currentAccessories.headphones;
          headNode.add(headphones);
          headphonesGroupRef.current = headphones;

          const hat = createHat();
          hat.visible = currentAccessories.hat;
          headNode.add(hat);
          hatGroupRef.current = hat;
        }

        // Procedural cyber-cat ears are created once and mounted on the head
        // (falling back to the robot root) so the active variant can simply
        // toggle their visibility.
        cyberEarsGroup = createCyberEars();
        cyberEarsGroup.visible = currentVariant === 'cyber-cat';
        registerEarMaterials(cyberEarsGroup);
        (headNode ?? holder).add(cyberEarsGroup);

        // Apply variant colors and instant proportions
        applyVariantColors(currentVariant);
        applyProportions(currentVariant);

        applyFacialExpression(0);
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error(`[AIHeroInteractive3D] Could not load ${MODEL_URL}`, error);

        const fallbackMaterial = new THREE.MeshStandardMaterial({
          color: CREAM,
          roughness: 0.35,
          metalness: 0.06,
          transparent: true,
          opacity: 1,
        });
        materials.add(fallbackMaterial);
        holder.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 3), fallbackMaterial));
      },
    );

    let scrollTarget = 0;
    let scrollProgress = 0;
    let elapsed = 0;
    let frameId = 0;
    let heroExited = false;

    const handleScroll = () => {
      scrollTarget = Math.max(0, Math.min(1, window.scrollY / Math.max(window.innerHeight, 1)));
    };

    const handleResize = () => {
      const w = getWidth();
      const h = getHeight();
      const desktop = isDesktop();

      camera.aspect = (desktop ? w / 2 : w) / h;
      camera.updateProjectionMatrix();

      const aspect = w / h;
      orbCamera.left = -aspect;
      orbCamera.right = aspect;
      orbCamera.top = 1;
      orbCamera.bottom = -1;
      orbCamera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    const clock = new THREE.Clock();
    const smoothstep = (value: number) => value * value * (3 - 2 * value);

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const pastHero = window.scrollY > window.innerHeight * 0.95;
      if (pastHero !== heroExited) {
        heroExited = pastHero;
        hitArea.style.pointerEvents = pastHero ? 'none' : '';
      }

      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;

      scrollProgress += (scrollTarget - scrollProgress) * Math.min(1, delta * 7);
      const blend = smoothstep(Math.max(0, Math.min(1, scrollProgress)));

      // Body stays perfectly still; only the jaw/mouth animates while speaking.
      holder.position.set(0, blend * 0.5, 0);
      holder.rotation.set(0, blend * 0.3, 0);
      holder.visible = blend < 0.995;

      materials.forEach((material) => {
        material.opacity = Math.max(0, 1 - blend);
      });

      // Reaction state drives a distinct, unmistakable pose. When the mood
      // flips (thinking / success / idle) we snap the expression selection and
      // let the per-frame lerps carry the limbs smoothly to the new target.
      const reaction = reactionRef.current;
      if (reaction !== lastReaction) {
        lastReaction = reaction;
        poseIndex = 0;
        if (reaction === 'thinking') {
          applyFacialExpression(THINKING_EXPRESSION_INDEX);
        } else if (reaction === 'success') {
          applyFacialExpression(SUCCESS_EXPRESSION_INDEX);
        } else {
          applyFacialExpression(0);
        }
      }

      const isPondering = reaction === 'thinking';

      // Smoothly lerp limb rotations toward the selected pose
      const poseTarget = isPondering ? THINKING_POSE : POSES[poseIndex];
      const poseEase = Math.min(1, delta * 5);
      const life = 1 - blend;
      const wavePhase = elapsed * 2.4;

      for (const key of LIMB_KEYS) {
        const rig = limbRig[key];
        if (!rig) continue;

        const target = poseTarget[key];
        const offset = limbOffset[key];
        offset.x += (target[0] - offset.x) * poseEase;
        offset.y += (target[1] - offset.y) * poseEase;
        offset.z += (target[2] - offset.z) * poseEase;

        let idleX = 0;
        let idleY = 0;
        let idleZ = 0;

        if (poseTarget.wave && key === 'wavingArm') {
          idleZ = Math.sin(wavePhase) * 0.12 * life;
          idleX = Math.sin(wavePhase + 0.5) * 0.04 * life;
        } else if (poseTarget.wave && key === 'wavingHand') {
          idleZ = Math.sin(elapsed * 3.2) * 0.18 * life;
          idleY = Math.cos(elapsed * 2.6) * 0.12 * life;
        } else if (key === 'restingArm') {
          idleZ = Math.sin(elapsed * 1.3) * 0.035 * life;
        } else if (key === 'head') {
          idleY = Math.sin(elapsed * 0.9) * 0.02 * life;
        }

        rig.node.rotation.set(
          rig.base.x + offset.x + idleX,
          rig.base.y + offset.y + idleY,
          rig.base.z + offset.z + idleZ,
        );
      }

      // Pondering arm: nudge the resting (right) shoulder forward so the hand
      // sits just in front of the visor instead of clipping the head mesh.
      const restingRig = limbRig.restingArm;
      if (restingRig) {
        const targetZ = restingRig.basePosition.z + (isPondering ? THINKING_ARM_FORWARD : 0);
        restingRig.node.position.z += (targetZ - restingRig.node.position.z) * poseEase;
      }

      // Spoken mouth motion: jaw node or morph target when present, mouth mesh otherwise.
      mouthAmount += ((isSpeaking ? 1 : 0) - mouthAmount) * Math.min(1, delta * 12);
      const mouthRhythm = Math.max(
        0,
        Math.min(1, 0.5 + 0.32 * Math.sin(elapsed * 24) + 0.18 * Math.sin(elapsed * 13 + 1.7)),
      );
      const mouthOpen = mouthAmount * mouthRhythm;

      if (mouthNode) {
        mouthNode.rotation.x = mouthNodeBaseRotationX + mouthOpen * 0.18;
      }

      if (mouthMorphMesh && mouthMorphIndex >= 0 && mouthMorphMesh.morphTargetInfluences) {
        mouthMorphMesh.morphTargetInfluences[mouthMorphIndex] = mouthOpen;
      }

      // Click-triggered expressions
      const expression = EXPRESSIONS[expressionIndex];
      const ease = Math.min(1, delta * 8);

      cheekMeshes.forEach((cheek, index) => {
        const base = cheekBaseScales[index];
        cheek.scale.x += (base.x * expression.cheekScale - cheek.scale.x) * ease;
        cheek.scale.y += (base.y * expression.cheekScale - cheek.scale.y) * ease;
      });

      if (smileMesh) {
        const fallbackOpen = mouthNode !== null || mouthMorphMesh !== null ? 0 : mouthOpen;
        const targetScaleX = expression.smileScale * (1 - fallbackOpen * 0.18);
        const targetScaleY = expression.smileScale * (1 + fallbackOpen * 1.15);
        smileMesh.scale.x += (targetScaleX - smileMesh.scale.x) * ease;
        smileMesh.scale.y += (targetScaleY - smileMesh.scale.y) * ease;
        smileMesh.position.y = smileBaseY - fallbackOpen * 0.045;
      }

      if (eyeMaterial) {
        eyeMaterial.color.lerp(expression.eyeColor, ease);
        eyeMaterial.emissive.lerp(expression.eyeEmissive, ease);
        eyeMaterial.emissiveIntensity +=
          (expression.eyeEmissiveIntensity - eyeMaterial.emissiveIntensity) * ease;
      }

      if (blushMaterial) {
        blushMaterial.color.lerp(expression.blushColor, ease);
        blushMaterial.emissive.lerp(expression.blushEmissive, ease);
      }

      if (heartMaterial) {
        heartMaterial.color.lerp(expression.heartColor, ease);
        heartMaterial.emissive.lerp(expression.heartEmissive, ease);
        heartMaterial.emissiveIntensity +=
          (expression.heartEmissiveIntensity - heartMaterial.emissiveIntensity) * ease;
      }

      // Cyber-cat inner ear follows the live accent hue; the armor shell
      // follows the head/body tone so the ears stay cohesive with the robot.
      if (earGlowMaterials.length) {
        earGlowTarget.set(settingsRef.current.accentColor);
        earGlowMaterials.forEach((material) => {
          material.color.lerp(earGlowTarget, ease);
          material.emissive.lerp(earGlowTarget, ease);
        });
      }
      if (earShellMaterials.length) {
        earShellTarget.set(settingsRef.current.bodyTone);
        earShellMaterials.forEach((material) => {
          material.color.lerp(earShellTarget, ease);
        });
      }

      heartMeshes.forEach((heart, index) => {
        const base = heartBaseScales[index];
        const pulse = 1 + Math.sin(elapsed * expression.heartPulse) * 0.07;
        heart.scale.set(base.x * pulse, base.y * pulse, base.z * pulse);
      });

      // Reaction-driven head tilt. robot.glb ships with no AnimationClips and no
      // AnimationMixer is created, so nothing external can reset these bones;
      // the only per-frame writer is the pose loop above, and this pass runs
      // after it, so the pondering tilt always takes priority. For non-idle
      // reactions the rotation is set absolutely (no pose residual can leak in);
      // for idle it decays back to neutral on top of the pose. Values stay
      // gentle so the head can never flip or point straight down.
      const headRig = limbRig.head;
      if (headRig) {
        const headEase = Math.min(1, delta * 6);
        const reaction = reactionRef.current;
        const targetTiltX = reaction === 'thinking' ? 0.05 : reaction === 'success' ? -0.1 : 0;
        const targetTiltZ = reaction === 'thinking' ? 0.2 : 0;
        headReactionTilt.x += (targetTiltX - headReactionTilt.x) * headEase;
        headReactionTilt.z += (targetTiltZ - headReactionTilt.z) * headEase;
        if (reaction === 'idle') {
          headRig.node.rotation.x += headReactionTilt.x;
          headRig.node.rotation.z += headReactionTilt.z;
        } else {
          headRig.node.rotation.set(
            headRig.base.x + headReactionTilt.x,
            headRig.node.rotation.y,
            headRig.base.z + headReactionTilt.z,
          );
        }
      }

      // Sync variant and accessories from settings/props
      const nextVariant = variantRef.current;
      const nextAccessories = accessoriesRef.current;

      if (nextVariant !== currentVariant) {
        currentVariant = nextVariant;
        applyVariantColors(currentVariant);
        applyProportions(currentVariant);

        // Cyber-cat ears are permanent meshes on the head; simply toggle them.
        if (!cyberEarsGroup && headMesh) {
          cyberEarsGroup = createCyberEars();
          registerEarMaterials(cyberEarsGroup);
          headMesh.add(cyberEarsGroup);
        }
        if (cyberEarsGroup) {
          cyberEarsGroup.visible = currentVariant === 'cyber-cat';
        }
      }

      if (nextAccessories.glasses !== currentAccessories.glasses) {
        currentAccessories.glasses = nextAccessories.glasses;
        if (glassesGroupRef.current) glassesGroupRef.current.visible = currentAccessories.glasses;
      }

      if (nextAccessories.headphones !== currentAccessories.headphones) {
        currentAccessories.headphones = nextAccessories.headphones;
        if (headphonesGroupRef.current) headphonesGroupRef.current.visible = currentAccessories.headphones;
      }

      if (nextAccessories.hat !== currentAccessories.hat) {
        currentAccessories.hat = nextAccessories.hat;
        if (hatGroupRef.current) hatGroupRef.current.visible = currentAccessories.hat;
      }

      // Body tone from settings drives the shell color; pose colorway only shifts accents/rim
      const colorway = COLORWAYS[poseIndex % COLORWAYS.length];
      const colorwayEase = Math.min(1, delta * 3.5);
      const bodyColor = new THREE.Color(settingsRef.current.bodyTone);
      shellMaterials.forEach((material) => {
        material.color.lerp(bodyColor, colorwayEase);
      });

      accentMaterials.forEach((material) => {
        material.color.lerp(colorway.accent, colorwayEase);
        material.emissive.lerp(colorway.accent, colorwayEase);
      });

      rimTarget.copy(expression.rimColor).lerp(colorway.rim, 0.8);
      rimLight.color.lerp(rimTarget, ease);

      const w = getWidth();
      const h = getHeight();
      const desktop = isDesktop();

      if (showParticles && ringGeometry && dustRing && basePositions && ringMaterial && orbGeometry && orbBaseColors && orbMaterial && orbHaloMaterial) {
        // Base emitter ring fades in and out with the transition
        const ringStrength = Math.sin(Math.min(1, blend) * Math.PI);
        const ringAttribute = ringGeometry.getAttribute('position') as THREE.BufferAttribute;
        const ringArray = ringAttribute.array as Float32Array;

        for (let i = 0; i < RING_COUNT; i += 1) {
          const particle = ringParticles[i];
          const rise = ((elapsed * particle.speed + particle.phase) % 1) * 0.85;
          const expand = 1 + blend * 0.18;
          ringArray[i * 3] = basePositions[i * 3] * expand;
          ringArray[i * 3 + 1] = basePositions[i * 3 + 1] + rise * blend + blend * 0.2;
          ringArray[i * 3 + 2] = basePositions[i * 3 + 2] * expand;
        }
        ringAttribute.needsUpdate = true;
        ringMaterial.opacity = ringStrength * 0.95;
        dustRing.visible = ringStrength > 0.02;

        // Ambient orbs: drift around the robot, then fill the viewport on scroll.
        const aspect = w / Math.max(h, 1);
        const halfWidth = aspect;
        const centerX = desktop ? halfWidth * 0.5 : 0;
        const clusterX = halfWidth * 0.26;
        const clusterY = 0.62;
        const orbAttribute = orbGeometry.getAttribute('position') as THREE.BufferAttribute;
        const orbArray = orbAttribute.array as Float32Array;
        const orbColorAttribute = orbGeometry.getAttribute('color') as THREE.BufferAttribute;
        const orbColorArray = orbColorAttribute.array as Float32Array;

        for (let i = 0; i < ORB_COUNT; i += 1) {
          const particle = orbParticles[i];
          const driftX = Math.sin(elapsed * particle.speed + particle.phase) * 0.035;
          const driftY = Math.cos(elapsed * particle.speed * 0.8 + particle.phase * 1.6) * 0.045;

          const heroX = centerX + particle.hx * clusterX + driftX;
          const heroY = particle.hy * clusterY + driftY;
          const fieldX = particle.nx * halfWidth * 1.06 + driftX;
          const fieldY = particle.ny * 1.06 + driftY;

          orbArray[i * 3] = heroX + (fieldX - heroX) * blend;
          orbArray[i * 3 + 1] = heroY + (fieldY - heroY) * blend;
          orbArray[i * 3 + 2] = 0;

          const twinkle = 0.86 + Math.sin(elapsed * particle.speed * 2.4 + particle.phase) * 0.14;
          orbColorArray[i * 3] = orbBaseColors[i * 3] * twinkle;
          orbColorArray[i * 3 + 1] = orbBaseColors[i * 3 + 1] * twinkle;
          orbColorArray[i * 3 + 2] = orbBaseColors[i * 3 + 2] * twinkle;
        }
        orbAttribute.needsUpdate = true;
        orbColorAttribute.needsUpdate = true;

        orbMaterial.opacity = 0.88 + 0.07 * blend;
        orbMaterial.size = 11 + blend * 4;

        orbHaloMaterial.opacity = 0.14 + 0.07 * blend;
        orbHaloMaterial.size = 28 + blend * 12;
      }

      controls.update();

      // Keep the HTML thought bubble anchored just above the head by
      // projecting the head's crown to screen space each frame.
      const bubbleEl = thoughtBubbleRef.current;
      if (bubbleEl) {
        if (headMesh) {
          camera.updateMatrixWorld();
          headMesh.updateWorldMatrix(true, false);
          bubbleAnchor.set(0, 2.05, 0);
          headMesh.localToWorld(bubbleAnchor);
          bubbleAnchor.project(camera);
          const viewportX = desktop ? w / 2 : 0;
          const viewportWidth = desktop ? w / 2 : w;
          const screenX = viewportX + (bubbleAnchor.x * 0.5 + 0.5) * viewportWidth;
          const screenY = (1 - (bubbleAnchor.y * 0.5 + 0.5)) * h;
          bubbleEl.style.opacity = reactionRef.current === 'thinking' ? '1' : '0';
          bubbleEl.style.transform = `translate(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px) translate(-50%, -100%)`;
        } else {
          bubbleEl.style.opacity = '0';
        }
      }

      renderer.setViewport(0, 0, w, h);
      renderer.clear();
      renderer.render(orbScene, orbCamera);
      renderer.clearDepth();
      renderer.setViewport(desktop ? w / 2 : 0, 0, desktop ? w / 2 : w, h);
      renderer.render(scene, camera);
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isPressing = false;
    let dragDistance = 0;
    let originX = 0;
    let originY = 0;

    const raycastRobot = (clientX: number, clientY: number) => {
      const rect = hitArea.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(holder, true).length > 0;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target !== hitArea || event.button !== 0) return;

      isPressing = true;
      dragDistance = 0;
      originX = event.clientX;
      originY = event.clientY;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isPressing) return;
      dragDistance = Math.max(
        dragDistance,
        Math.hypot(event.clientX - originX, event.clientY - originY),
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isPressing) return;
      isPressing = false;

      const wasClick = dragDistance <= 6 && event.button === 0 && !event.shiftKey;
      if (!wasClick) return;

      if (raycastRobot(event.clientX, event.clientY)) {
        cyclePoseAndExpression();
      }
    };

    const handlePointerCancel = () => {
      isPressing = false;
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (raycastRobot(event.clientX, event.clientY)) {
        cyclePoseAndExpression();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
    hitArea.addEventListener('contextmenu', handleContextMenu);

    handleScroll();
    handleResize();
    animate();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      hitArea.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(frameId);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          meshMaterials.forEach((material) => material.dispose());
        }
      });

      if (showParticles && orbGeometry && orbMaterial && orbHaloMaterial && glowTexture) {
        orbGeometry.dispose();
        orbMaterial.dispose();
        orbHaloMaterial.dispose();
        glowTexture.dispose();
      }
      activeUtterance = null;
      isSpeaking = false;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden"
        aria-hidden="true"
      />
      <div
        ref={hitAreaRef}
        className="pointer-events-none fixed inset-y-0 right-0 z-20 hidden w-1/2 cursor-grab active:cursor-grabbing lg:block lg:pointer-events-auto"
        aria-hidden="true"
      />
      <div
        ref={thoughtBubbleRef}
        className={`pointer-events-none fixed left-0 top-0 z-30 opacity-0 transition-opacity duration-200 ${
          effectiveReaction === 'thinking' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <div className="flex animate-bounce items-center gap-1 rounded-2xl border border-primary/30 bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:75ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
        </div>
      </div>
    </>
  );
}
