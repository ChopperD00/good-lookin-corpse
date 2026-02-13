/**
 * Angel Particle Scene — Text-to-angel particle morphing system
 * "GOOD LOOKIN CORPSE" text dissolves into particles that form angel shapes
 * Audio-reactive + ghost interaction
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { AudioBands } from './audio-analyzer'

// ─── GLSL Vertex Shader ─────────────────────────────────────────────
const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute float pindex;
attribute vec3 offset;      // home position (from angel image)
attribute vec3 startOffset;  // starting position (from text, at bottom)
attribute float angle;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uTexture;
uniform sampler2D uTouch;
uniform vec2 uMouse;
uniform float uMouseSize;
uniform float uMouseForce;
uniform float uIdleMovement;
uniform float uIdleSpeed;
uniform float uIdleIntensity;

// Morph: 0 = text position (bottom), 1 = angel formation
uniform float uMorph;
// Rise: controls vertical offset during initial rise
uniform float uRise;

// Audio uniforms
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uAudioOverall;

// Ghost interaction
uniform vec2 uGhostPos;    // ghost position in UV space
uniform float uGhostRadius;
uniform float uGhostForce;

varying vec2 vPUv;
varying vec2 vUv;
varying float vGrey;
varying float vDistance;
varying float vMorph;

float random(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float easeExpoOut(float t) {
  return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

// Smooth ease-in-out
float easeInOut(float t) {
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  vUv = uv;
  vMorph = uMorph;

  vec2 puv = offset.xy / uTextureSize;
  vPUv = puv;

  vec4 colA = texture2D(uTexture, puv);
  float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
  vGrey = grey;

  // Morph between start (text at bottom) and target (angel formation)
  float morphEased = easeInOut(uMorph);

  // Each particle has a slightly different morph timing for organic feel
  float particleDelay = random(pindex) * 0.3;
  float particleMorph = clamp((morphEased - particleDelay) / (1.0 - particleDelay), 0.0, 1.0);

  vec3 homePosition = mix(startOffset, vec3(offset.xy, 0.0), particleMorph);

  // Rise offset — particles float up from CTA box position
  homePosition.y += uRise * (1.0 - particleMorph) * 50.0;

  vec3 displaced = homePosition;

  // Randomize position
  displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;

  // Depth with audio reactivity
  float depthMult = uDepth + uAudioBass * 4.0;
  float rndz = (random(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1)));
  displaced.z += rndz * (random(pindex) * 2.0 * depthMult);

  // Touch interaction from texture
  float t = texture2D(uTouch, puv).r;
  displaced.z += t * 10.0 * rndz;
  displaced.x += cos(angle) * t * 10.0 * rndz;
  displaced.y += sin(angle) * t * 10.0 * rndz;

  // IDLE ANIMATION — mid frequency drives movement intensity
  float idleAmount = uIdleMovement + uAudioMid * 0.6;
  if (idleAmount > 0.0) {
    float idleTime = uTime * (uIdleSpeed + uAudioOverall * 0.3);
    float noise1 = snoise(vec2(pindex * 0.01, idleTime * 0.1));
    float noise2 = snoise(vec2(pindex * 0.02, idleTime * 0.15 + 100.0));
    float noise3 = snoise(vec2(pindex * 0.03, idleTime * 0.05 + 300.0));
    float breathe = sin(idleTime * 0.2 + pindex * 0.01) * 0.5 + 0.5;

    float suppression = 1.0 - min(1.0, t * 2.0);
    displaced.x += noise1 * uIdleIntensity * idleAmount * suppression;
    displaced.y += noise2 * uIdleIntensity * idleAmount * suppression;
    displaced.z += noise3 * uIdleIntensity * 2.0 * idleAmount * breathe * suppression;
  }

  // GHOST INTERACTION — particles scatter when ghost flies through
  float ghostDist = distance(offset.xy / uTextureSize, uGhostPos);
  if (ghostDist < uGhostRadius && uGhostForce > 0.0) {
    float ghostFactor = 1.0 - ghostDist / uGhostRadius;
    float ghostEased = easeExpoOut(ghostFactor) * uGhostForce;
    vec2 ghostDir = normalize(offset.xy / uTextureSize - uGhostPos);

    displaced.x += ghostDir.x * ghostEased * uTextureSize.x * 0.15;
    displaced.y += ghostDir.y * ghostEased * uTextureSize.y * 0.15;
    displaced.z += ghostEased * 20.0 * rndz;
  }

  // DIRECT MOUSE INTERACTION
  float dist = distance(offset.xy, uMouse * uTextureSize);
  vDistance = dist;

  if (dist < uMouseSize) {
    float forceFactor = 1.0 - dist / uMouseSize;
    float easedForce = easeExpoOut(forceFactor) * uMouseForce;
    vec2 dir = normalize(offset.xy - uMouse * uTextureSize);
    float uniqueness = snoise(vec2(pindex * 0.1, uTime * 0.2));
    float organicFactor = 0.8 + uniqueness * 0.4;

    displaced.x += dir.x * easedForce * 8.0 * organicFactor;
    displaced.y += dir.y * easedForce * 8.0 * organicFactor;
    displaced.z += easedForce * 15.0 * rndz * organicFactor;
  }

  // Particle size — bass makes particles pulse bigger
  float sizeMult = uSize + uAudioBass * 0.8;
  float psize = (snoise(vec2(uTime * 0.3, pindex) * 0.5) * 0.3 + 1.7);
  psize *= max(grey, 0.2);
  psize *= sizeMult;

  // During morph, particles glow brighter
  psize *= 1.0 + (1.0 - particleMorph) * 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  mvPosition.xyz += position * psize;

  gl_Position = projectionMatrix * mvPosition;
}
`

// ─── GLSL Fragment Shader ───────────────────────────────────────────
const fragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uMouseSize;
uniform vec2 uMouse;
uniform vec2 uTextureSize;
uniform float uGlowStrength;
uniform float uColorVariation;
uniform float uAudioHigh;
uniform float uAudioOverall;

varying vec2 vPUv;
varying vec2 vUv;
varying float vGrey;
varying float vDistance;
varying float vMorph;

void main() {
  vec4 colA = texture2D(uTexture, vPUv);
  float grey = vGrey;

  // Ethereal white-cyan palette for angels
  float r = grey * 0.85;
  float g = grey * 0.95;
  float b = grey;

  // Color variation — shift toward spectral/ethereal tones
  float colorVar = uColorVariation + uAudioHigh * 0.2;
  if (colorVar > 0.0) {
    float colorNoise = sin(vPUv.x * 10.0 + uTime * 0.2) * sin(vPUv.y * 8.0 - uTime * 0.1) * 0.5 + 0.5;
    float colorShift = colorNoise * colorVar;

    // Ethereal cyan-white on audio peaks
    r = grey * (0.8 + uAudioOverall * 0.1);
    g = grey * (0.9 + colorShift * 0.1 + uAudioOverall * 0.15);
    b = grey * (1.0 + colorShift * 0.2 + uAudioOverall * 0.2);
  }

  // During morph transition, particles glow neon cyan
  float morphGlow = (1.0 - vMorph) * 0.3;
  r += morphGlow * 0.0;
  g += morphGlow * 0.8;
  b += morphGlow * 1.0;

  vec4 colB = vec4(r, g, b, 1.0);

  // Circle shape with soft edge
  float border = 0.35;
  float radius = 0.5;
  float dist = radius - distance(vUv, vec2(0.5));
  float t = smoothstep(0.0, border, dist);

  // Glow near mouse + audio boost
  float mouseProximity = 1.0 - min(1.0, vDistance / uMouseSize);
  float glow = mouseProximity * (uGlowStrength + uAudioOverall * 0.3);

  vec4 color = colB;
  color.rgb += glow * 0.2;
  color.a = t;

  gl_FragColor = color;
}
`

// ─── Scene Parameters ───────────────────────────────────────────────
const defaultParams = {
  particleSize: 0.8,
  randomness: 0.4,
  depth: 2.5,
  mouseSize: 80,
  mouseForce: 0.6,
  mouseSmoothing: 0.12,
  idleMovement: 0.5,
  idleSpeed: 0.4,
  idleIntensity: 0.6,
  glowStrength: 0.4,
  colorVariation: 0.2,
  fadeSpeed: 0.08,
  bloomStrength: 1.5,
  bloomRadius: 0.6,
  bloomThreshold: 0.75,
  ghostRadius: 0.2,
  ghostForce: 2.0,
}

export class AngelScene {
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private composer: EffectComposer | null = null
  private particles: THREE.Mesh | null = null
  private bloomPass: UnrealBloomPass | null = null

  private width = 0
  private height = 0
  private time = 0
  private isRunning = false

  // Morph control: 0 = text at bottom, 1 = angel formation
  private morphTarget = 0
  private morphCurrent = 0
  private morphSpeed = 0.008 // ~2 seconds for full morph

  // Rise control: particles float upward
  private riseTarget = 0
  private riseCurrent = 0

  // Mouse tracking
  private mouse = new THREE.Vector2(0.5, 0.5)
  private targetMouse = new THREE.Vector2(0.5, 0.5)
  private lastMouse = new THREE.Vector2(0.5, 0.5)
  private mouseSpeed = 0
  private isMouseMoving = false
  private mouseMovingTimeout: ReturnType<typeof setTimeout> | null = null

  // Touch texture for mouse trail
  private touchCanvas: HTMLCanvasElement | null = null
  private touchContext: CanvasRenderingContext2D | null = null
  private touchTexture: THREE.Texture | null = null

  // Image sampling
  private imageWidth = 320
  private imageHeight = 180
  private numPoints = 320 * 180
  private threshold = 34

  // Audio bands
  private audioBands: AudioBands = { bass: 0, mid: 0, high: 0, overall: 0 }

  // Ghost position (normalized 0-1)
  private ghostPos = new THREE.Vector2(-1, -1)

  private params = { ...defaultParams }
  private _opacity = 1.0

  get opacity(): number { return this._opacity }
  set opacity(v: number) { this._opacity = Math.max(0, Math.min(1, v)) }

  /**
   * Initialize the angel particle scene
   * @param canvas - The canvas element
   * @param imageSrc - URL of the angel image (or placeholder)
   */
  async init(canvas: HTMLCanvasElement, imageSrc: string): Promise<void> {
    this.width = canvas.clientWidth
    this.height = canvas.clientHeight

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000)
    this.camera.position.set(0, 0, 300)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(ambientLight)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      this.params.bloomStrength,
      this.params.bloomRadius,
      this.params.bloomThreshold,
    )
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(new OutputPass())

    this.initTouchTexture()
    await this.loadImageAndCreateParticles(imageSrc)

    // Start morphed to text position, then animate to angel
    this.morphCurrent = 0
    this.morphTarget = 1
    this.riseCurrent = 0
    this.riseTarget = 1

    this.isRunning = true
  }

  private initTouchTexture(): void {
    this.touchCanvas = document.createElement('canvas')
    this.touchCanvas.width = this.imageWidth
    this.touchCanvas.height = this.imageHeight
    this.touchContext = this.touchCanvas.getContext('2d')!
    this.touchContext.fillStyle = 'black'
    this.touchContext.fillRect(0, 0, this.imageWidth, this.imageHeight)

    this.touchTexture = new THREE.Texture(this.touchCanvas)
    this.touchTexture.minFilter = THREE.LinearFilter
    this.touchTexture.magFilter = THREE.LinearFilter
    this.touchTexture.needsUpdate = true
  }

  /**
   * Render "GOOD LOOKIN CORPSE" text to a canvas and return pixel positions
   */
  private renderTextToPositions(): Float32Array {
    const canvas = document.createElement('canvas')
    canvas.width = this.imageWidth
    canvas.height = this.imageHeight
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.imageWidth, this.imageHeight)

    // Render text centered
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // "GOOD LOOKIN" on top, "CORPSE" below
    const fontSize1 = Math.floor(this.imageWidth / 10)
    const fontSize2 = Math.floor(this.imageWidth / 7)
    ctx.font = `bold ${fontSize1}px sans-serif`
    ctx.fillText('GOOD LOOKIN', this.imageWidth / 2, this.imageHeight * 0.35)
    ctx.font = `bold ${fontSize2}px sans-serif`
    ctx.fillText('CORPSE', this.imageWidth / 2, this.imageHeight * 0.65)

    const imgData = ctx.getImageData(0, 0, this.imageWidth, this.imageHeight)

    // Create position array: for each visible pixel, store its position
    // Positions are shifted down to simulate starting from CTA box area
    const positions = new Float32Array(this.numPoints * 3)
    for (let i = 0; i < this.numPoints; i++) {
      const brightness = imgData.data[i * 4]
      if (brightness > 30) {
        // Text pixel — position it at bottom of screen
        positions[i * 3] = i % this.imageWidth
        positions[i * 3 + 1] = Math.floor(i / this.imageWidth) - this.imageHeight * 0.8 // offset down
        positions[i * 3 + 2] = 0
      } else {
        // Not part of text — random scatter below screen
        positions[i * 3] = Math.random() * this.imageWidth
        positions[i * 3 + 1] = -this.imageHeight * 0.5 - Math.random() * this.imageHeight * 0.5
        positions[i * 3 + 2] = 0
      }
    }
    return positions
  }

  private loadImageAndCreateParticles(imageSrc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const imageTexture = new THREE.Texture(img)
        imageTexture.needsUpdate = true
        this.createParticles(img, imageTexture)
        resolve()
      }
      img.onerror = () => {
        // If angel image not found, generate a placeholder
        console.warn('Angel image not found, using generated placeholder')
        const placeholder = this.generatePlaceholderAngel()
        const imageTexture = new THREE.Texture(placeholder)
        imageTexture.needsUpdate = true
        this.createParticles(placeholder, imageTexture)
        resolve()
      }
      img.src = imageSrc
    })
  }

  /**
   * Generate a simple angel silhouette as placeholder
   */
  private generatePlaceholderAngel(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.imageWidth
    canvas.height = this.imageHeight
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.imageWidth, this.imageHeight)

    const cx = this.imageWidth / 2
    const cy = this.imageHeight / 2

    ctx.fillStyle = 'white'

    // Halo
    ctx.beginPath()
    ctx.ellipse(cx, cy - 50, 18, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(cx, cy - 35, 12, 0, Math.PI * 2)
    ctx.fill()

    // Body (triangle)
    ctx.beginPath()
    ctx.moveTo(cx - 25, cy + 40)
    ctx.lineTo(cx + 25, cy + 40)
    ctx.lineTo(cx, cy - 20)
    ctx.closePath()
    ctx.fill()

    // Wings (left)
    ctx.beginPath()
    ctx.moveTo(cx - 15, cy - 10)
    ctx.quadraticCurveTo(cx - 70, cy - 40, cx - 55, cy + 15)
    ctx.quadraticCurveTo(cx - 35, cy, cx - 15, cy + 5)
    ctx.closePath()
    ctx.fill()

    // Wings (right)
    ctx.beginPath()
    ctx.moveTo(cx + 15, cy - 10)
    ctx.quadraticCurveTo(cx + 70, cy - 40, cx + 55, cy + 15)
    ctx.quadraticCurveTo(cx + 35, cy, cx + 15, cy + 5)
    ctx.closePath()
    ctx.fill()

    // Flip Y for Three.js coordinate system
    const flipped = document.createElement('canvas')
    flipped.width = this.imageWidth
    flipped.height = this.imageHeight
    const fctx = flipped.getContext('2d')!
    fctx.scale(1, -1)
    fctx.drawImage(canvas, 0, -this.imageHeight)

    return flipped
  }

  private createParticles(img: HTMLCanvasElement | HTMLImageElement, imageTexture: THREE.Texture): void {
    // Sample angel image pixels
    const sampleCanvas = document.createElement('canvas')
    const sampleCtx = sampleCanvas.getContext('2d')!
    sampleCanvas.width = this.imageWidth
    sampleCanvas.height = this.imageHeight
    sampleCtx.scale(1, -1)
    sampleCtx.drawImage(img, 0, 0, this.imageWidth, this.imageHeight * -1)
    const imgData = sampleCtx.getImageData(0, 0, this.imageWidth, this.imageHeight)
    const pixels = Float32Array.from(imgData.data)

    // Get text starting positions
    const textPositions = this.renderTextToPositions()

    // Count visible points
    let numVisible = 0
    for (let i = 0; i < this.numPoints; i++) {
      if (pixels[i * 4] > this.threshold) numVisible++
    }

    // Instanced geometry
    const geometry = new THREE.InstancedBufferGeometry()

    const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3)
    positions.setXYZ(0, -0.5, 0.5, 0.0)
    positions.setXYZ(1, 0.5, 0.5, 0.0)
    positions.setXYZ(2, -0.5, -0.5, 0.0)
    positions.setXYZ(3, 0.5, -0.5, 0.0)
    geometry.setAttribute('position', positions)

    const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2)
    uvs.setXY(0, 0.0, 0.0)
    uvs.setXY(1, 1.0, 0.0)
    uvs.setXY(2, 0.0, 1.0)
    uvs.setXY(3, 1.0, 1.0)
    geometry.setAttribute('uv', uvs)

    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1))

    // Per-instance attributes
    const indices = new Uint16Array(numVisible)
    const offsets = new Float32Array(numVisible * 3)       // angel target positions
    const startOffsets = new Float32Array(numVisible * 3)  // text starting positions
    const angles = new Float32Array(numVisible)

    for (let i = 0, j = 0; i < this.numPoints; i++) {
      if (pixels[i * 4] <= this.threshold) continue

      // Angel target position
      offsets[j * 3] = i % this.imageWidth
      offsets[j * 3 + 1] = Math.floor(i / this.imageWidth)
      offsets[j * 3 + 2] = 0

      // Text starting position
      startOffsets[j * 3] = textPositions[i * 3]
      startOffsets[j * 3 + 1] = textPositions[i * 3 + 1]
      startOffsets[j * 3 + 2] = textPositions[i * 3 + 2]

      indices[j] = i
      angles[j] = Math.random() * Math.PI
      j++
    }

    geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false))
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false))
    geometry.setAttribute('startOffset', new THREE.InstancedBufferAttribute(startOffsets, 3, false))
    geometry.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false))

    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: this.params.randomness },
      uDepth: { value: this.params.depth },
      uSize: { value: this.params.particleSize },
      uTextureSize: { value: new THREE.Vector2(this.imageWidth, this.imageHeight) },
      uTexture: { value: imageTexture },
      uTouch: { value: this.touchTexture },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseSize: { value: this.params.mouseSize },
      uMouseForce: { value: this.params.mouseForce },
      uIdleMovement: { value: this.params.idleMovement },
      uIdleSpeed: { value: this.params.idleSpeed },
      uIdleIntensity: { value: this.params.idleIntensity },
      uGlowStrength: { value: this.params.glowStrength },
      uColorVariation: { value: this.params.colorVariation },
      uMorph: { value: 0 },
      uRise: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioHigh: { value: 0 },
      uAudioOverall: { value: 0 },
      uGhostPos: { value: new THREE.Vector2(-1, -1) },
      uGhostRadius: { value: this.params.ghostRadius },
      uGhostForce: { value: this.params.ghostForce },
    }

    const material = new THREE.RawShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      transparent: true,
    })

    this.particles = new THREE.Mesh(geometry, material)
    this.particles.position.x = -this.imageWidth / 2
    this.particles.position.y = -this.imageHeight / 2
    this.scene!.add(this.particles)
  }

  setAudioBands(bands: AudioBands): void {
    this.audioBands = bands
  }

  /**
   * Set ghost position for particle interaction (normalized 0-1)
   */
  setGhostPosition(x: number, y: number): void {
    this.ghostPos.set(x, y)
  }

  setMouse(nx: number, ny: number): void {
    this.targetMouse.set(
      Math.max(0, Math.min(1, nx)),
      Math.max(0, Math.min(1, ny)),
    )
    this.isMouseMoving = true
    if (this.mouseMovingTimeout) clearTimeout(this.mouseMovingTimeout)
    this.mouseMovingTimeout = setTimeout(() => {
      this.isMouseMoving = false
    }, 100)
  }

  setMouseFromScreen(clientX: number, clientY: number, canvasBounds: DOMRect): void {
    if (!this.camera) return
    const mx = ((clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1
    const my = -((clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mx, my), this.camera)

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersection)

    const imgX = (intersection.x + this.imageWidth / 2) / this.imageWidth
    const imgY = (intersection.y + this.imageHeight / 2) / this.imageHeight

    this.setMouse(imgX, imgY)
  }

  private updateTouchTexture(): void {
    if (!this.touchContext || !this.touchTexture) return

    this.touchContext.fillStyle = `rgba(0, 0, 0, ${this.params.fadeSpeed})`
    this.touchContext.fillRect(0, 0, this.imageWidth, this.imageHeight)

    const x = this.mouse.x * this.imageWidth
    const y = this.mouse.y * this.imageHeight
    const size = this.params.mouseSize

    const speedFactor = Math.min(1, this.mouseSpeed * 15)
    const intensity = this.isMouseMoving ? 0.7 + speedFactor * 0.3 : 0.5

    const gradient = this.touchContext.createRadialGradient(x, y, 0, x, y, size)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`)
    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.6})`)
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${intensity * 0.2})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)')

    this.touchContext.fillStyle = gradient
    this.touchContext.beginPath()
    this.touchContext.arc(x, y, size, 0, Math.PI * 2)
    this.touchContext.fill()

    if (this.isMouseMoving) {
      const cg = this.touchContext.createRadialGradient(x, y, 0, x, y, size * 0.3)
      cg.addColorStop(0, `rgba(255, 255, 255, ${intensity * 1.2})`)
      cg.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
      this.touchContext.fillStyle = cg
      this.touchContext.beginPath()
      this.touchContext.arc(x, y, size * 0.3, 0, Math.PI * 2)
      this.touchContext.fill()
    }

    this.touchTexture.needsUpdate = true
  }

  render(): void {
    if (!this.isRunning || !this.composer || !this.particles) return

    this.time += 0.05

    // Animate morph toward target
    this.morphCurrent += (this.morphTarget - this.morphCurrent) * this.morphSpeed
    this.riseCurrent += (this.riseTarget - this.riseCurrent) * 0.015

    // Mouse velocity
    const vx = this.targetMouse.x - this.lastMouse.x
    const vy = this.targetMouse.y - this.lastMouse.y
    this.mouseSpeed = Math.sqrt(vx * vx + vy * vy)
    this.lastMouse.copy(this.targetMouse)

    const adaptive = this.params.mouseSmoothing * (1 - Math.min(0.8, this.mouseSpeed * 5))
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * adaptive
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * adaptive

    this.updateTouchTexture()

    const u = (this.particles.material as THREE.RawShaderMaterial).uniforms
    u.uTime.value = this.time
    u.uRandom.value = this.params.randomness
    u.uDepth.value = this.params.depth
    u.uSize.value = this.params.particleSize
    u.uMouse.value.copy(this.mouse)
    u.uMouseSize.value = this.params.mouseSize
    u.uMouseForce.value = this.params.mouseForce
    u.uIdleMovement.value = this.params.idleMovement
    u.uIdleSpeed.value = this.params.idleSpeed
    u.uIdleIntensity.value = this.params.idleIntensity
    u.uGlowStrength.value = this.params.glowStrength
    u.uColorVariation.value = this.params.colorVariation
    u.uMorph.value = this.morphCurrent
    u.uRise.value = this.riseCurrent

    // Audio
    u.uAudioBass.value = this.audioBands.bass
    u.uAudioMid.value = this.audioBands.mid
    u.uAudioHigh.value = this.audioBands.high
    u.uAudioOverall.value = this.audioBands.overall

    // Ghost interaction
    u.uGhostPos.value.copy(this.ghostPos)
    u.uGhostRadius.value = this.params.ghostRadius
    u.uGhostForce.value = this.params.ghostForce

    // Audio → bloom
    if (this.bloomPass) {
      this.bloomPass.strength = this.params.bloomStrength + this.audioBands.bass * 1.5
    }

    if (this.particles) {
      (this.particles.material as THREE.RawShaderMaterial).opacity = this._opacity
    }

    this.composer.render()
  }

  resize(w: number, h: number): void {
    this.width = w
    this.height = h
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    if (this.renderer) this.renderer.setSize(w, h)
    if (this.composer) this.composer.setSize(w, h)
  }

  destroy(): void {
    this.isRunning = false
    if (this.mouseMovingTimeout) clearTimeout(this.mouseMovingTimeout)
    if (this.particles) {
      this.particles.geometry.dispose()
      ;(this.particles.material as THREE.RawShaderMaterial).dispose()
      this.scene?.remove(this.particles)
      this.particles = null
    }
    if (this.touchTexture) {
      this.touchTexture.dispose()
      this.touchTexture = null
    }
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
    }
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    this.scene = null
    this.camera = null
  }
}
