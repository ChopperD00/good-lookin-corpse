/**
 * Skull Particle Scene — Image-to-particle Three.js system
 * Adapted from CodePen raLRLLw with audio reactivity
 * Samples skull image pixels and creates interactive particle field
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
attribute vec3 offset;
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
uniform float uParticleSpring;

// Audio uniforms
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uAudioOverall;

varying vec2 vPUv;
varying vec2 vUv;
varying float vGrey;
varying float vDistance;

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

void main() {
  vUv = uv;

  vec2 puv = offset.xy / uTextureSize;
  vPUv = puv;

  vec4 colA = texture2D(uTexture, puv);
  float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
  vGrey = grey;

  vec3 homePosition = vec3(offset.xy, 0.0);
  vec3 displaced = homePosition;

  // Randomize position
  displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;

  // Depth with audio reactivity — bass drives depth pulsing
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

    float zForce = easedForce * 15.0 * rndz * organicFactor;
    float centerFactor = 1.0 - min(1.0, dist / (uMouseSize * 0.5));
    displaced.z += zForce * (0.5 + centerFactor * 0.5);
  }

  // Particle size — bass makes particles pulse bigger
  float sizeMult = uSize + uAudioBass * 0.8;
  float psize = (snoise(vec2(uTime * 0.3, pindex) * 0.5) * 0.3 + 1.7);
  psize *= max(grey, 0.2);
  psize *= sizeMult;

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

void main() {
  vec4 colA = texture2D(uTexture, vPUv);
  float grey = vGrey;

  float r = grey;
  float g = grey;
  float b = grey;

  // Color variation — high frequencies drive color shifting
  float colorVar = uColorVariation + uAudioHigh * 0.2;
  if (colorVar > 0.0) {
    float colorNoise = sin(vPUv.x * 10.0 + uTime * 0.2) * sin(vPUv.y * 8.0 - uTime * 0.1) * 0.5 + 0.5;
    float colorShift = colorNoise * colorVar;

    // Shift toward neon cyan on audio peaks
    r = grey * (1.0 - uAudioOverall * 0.15);
    g = grey * (1.0 + colorShift * 0.05 + uAudioOverall * 0.1);
    b = grey * (1.0 + colorShift * 0.15 + uAudioOverall * 0.15);
  }

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
  particleSize: 1.0,
  randomness: 0.6,
  depth: 3.0,
  mouseSize: 80,
  mouseForce: 0.8,
  mouseSmoothing: 0.12,
  idleMovement: 0.4,
  idleSpeed: 0.5,
  idleIntensity: 0.8,
  particleSpring: 0.7,
  glowStrength: 0.3,
  colorVariation: 0.15,
  fadeSpeed: 0.08,
  bloomStrength: 1.2,
  bloomRadius: 0.5,
  bloomThreshold: 0.85,
}

export class SkullScene {
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

  // Audio bands (updated externally)
  private audioBands: AudioBands = { bass: 0, mid: 0, high: 0, overall: 0 }

  // Parameters
  private params = { ...defaultParams }

  // Global opacity for fade in/out
  private _opacity = 1.0

  get opacity(): number { return this._opacity }
  set opacity(v: number) { this._opacity = Math.max(0, Math.min(1, v)) }

  /**
   * Initialize the skull particle scene
   * @param canvas - The canvas element to render to
   * @param imageSrc - URL of the skull image
   */
  async init(canvas: HTMLCanvasElement, imageSrc: string): Promise<void> {
    this.width = canvas.clientWidth
    this.height = canvas.clientHeight

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Scene
    this.scene = new THREE.Scene()

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000)
    this.camera.position.set(0, 0, 300)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(ambientLight)

    // Postprocessing
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

    // Touch texture
    this.initTouchTexture()

    // Load image and create particles
    await this.loadImageAndCreateParticles(imageSrc)

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
      img.onerror = reject
      img.src = imageSrc
    })
  }

  private createParticles(img: HTMLImageElement, imageTexture: THREE.Texture): void {
    // Sample image pixels
    const sampleCanvas = document.createElement('canvas')
    const sampleCtx = sampleCanvas.getContext('2d')!
    sampleCanvas.width = this.imageWidth
    sampleCanvas.height = this.imageHeight
    sampleCtx.scale(1, -1)
    sampleCtx.drawImage(img, 0, 0, this.imageWidth, this.imageHeight * -1)
    const imgData = sampleCtx.getImageData(0, 0, this.imageWidth, this.imageHeight)
    const pixels = Float32Array.from(imgData.data)

    // Count visible points (brightness > threshold)
    let numVisible = 0
    for (let i = 0; i < this.numPoints; i++) {
      if (pixels[i * 4] > this.threshold) numVisible++
    }

    // Instanced geometry
    const geometry = new THREE.InstancedBufferGeometry()

    // Quad vertices
    const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3)
    positions.setXYZ(0, -0.5, 0.5, 0.0)
    positions.setXYZ(1, 0.5, 0.5, 0.0)
    positions.setXYZ(2, -0.5, -0.5, 0.0)
    positions.setXYZ(3, 0.5, -0.5, 0.0)
    geometry.setAttribute('position', positions)

    // Quad UVs
    const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2)
    uvs.setXY(0, 0.0, 0.0)
    uvs.setXY(1, 1.0, 0.0)
    uvs.setXY(2, 0.0, 1.0)
    uvs.setXY(3, 1.0, 1.0)
    geometry.setAttribute('uv', uvs)

    // Index buffer
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1))

    // Per-instance attributes
    const indices = new Uint16Array(numVisible)
    const offsets = new Float32Array(numVisible * 3)
    const angles = new Float32Array(numVisible)

    for (let i = 0, j = 0; i < this.numPoints; i++) {
      if (pixels[i * 4] <= this.threshold) continue
      offsets[j * 3] = i % this.imageWidth
      offsets[j * 3 + 1] = Math.floor(i / this.imageWidth)
      offsets[j * 3 + 2] = 0
      indices[j] = i
      angles[j] = Math.random() * Math.PI
      j++
    }

    geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false))
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false))
    geometry.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false))

    // Material with custom shaders
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
      uParticleSpring: { value: this.params.particleSpring },
      uGlowStrength: { value: this.params.glowStrength },
      uColorVariation: { value: this.params.colorVariation },
      // Audio uniforms
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioHigh: { value: 0 },
      uAudioOverall: { value: 0 },
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

  /**
   * Update audio bands from external AudioAnalyzer
   */
  setAudioBands(bands: AudioBands): void {
    this.audioBands = bands
  }

  /**
   * Update mouse position (normalized 0-1 from canvas bounds)
   */
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

  /**
   * Convert screen mouse coordinates to particle UV space via raycasting
   */
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

    // Fade trail
    this.touchContext.fillStyle = `rgba(0, 0, 0, ${this.params.fadeSpeed})`
    this.touchContext.fillRect(0, 0, this.imageWidth, this.imageHeight)

    const x = this.mouse.x * this.imageWidth
    const y = this.mouse.y * this.imageHeight
    const size = this.params.mouseSize

    // Velocity-based intensity
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

    // Intense center when moving
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

  /**
   * Render one frame — called from external rAF loop
   */
  render(): void {
    if (!this.isRunning || !this.composer || !this.particles) return

    this.time += 0.05

    // Mouse velocity
    const vx = this.targetMouse.x - this.lastMouse.x
    const vy = this.targetMouse.y - this.lastMouse.y
    this.mouseSpeed = Math.sqrt(vx * vx + vy * vy)
    this.lastMouse.copy(this.targetMouse)

    // Smooth mouse with adaptive smoothing
    const adaptive = this.params.mouseSmoothing * (1 - Math.min(0.8, this.mouseSpeed * 5))
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * adaptive
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * adaptive

    // Update touch texture
    this.updateTouchTexture()

    // Update uniforms
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
    u.uParticleSpring.value = this.params.particleSpring
    u.uGlowStrength.value = this.params.glowStrength
    u.uColorVariation.value = this.params.colorVariation

    // Audio uniforms
    u.uAudioBass.value = this.audioBands.bass
    u.uAudioMid.value = this.audioBands.mid
    u.uAudioHigh.value = this.audioBands.high
    u.uAudioOverall.value = this.audioBands.overall

    // Audio → bloom: bass pumps bloom strength
    if (this.bloomPass) {
      this.bloomPass.strength = this.params.bloomStrength + this.audioBands.bass * 1.5
    }

    // Global opacity
    if (this.particles) {
      (this.particles.material as THREE.RawShaderMaterial).opacity = this._opacity
    }

    this.composer.render()
  }

  /**
   * Handle resize
   */
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

  /**
   * Cleanup all resources
   */
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
