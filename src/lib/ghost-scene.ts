import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

// ─── Fluorescent Color Palette ───────────────────────────────────────
const fluorescentColors: Record<string, number> = {
  cyan: 0x00ffff,
  lime: 0x00ff00,
  magenta: 0xff00ff,
  yellow: 0xffff00,
  orange: 0xff4500,
  pink: 0xff1493,
  purple: 0x9400d3,
  blue: 0x0080ff,
  green: 0x00ff80,
  red: 0xff0040,
  teal: 0x00ffaa,
  violet: 0x8a2be2,
}

// ─── Default Parameters ──────────────────────────────────────────────
const params = {
  bodyColor: 0x0f2027,
  glowColor: 'orange',
  eyeGlowColor: 'green',
  ghostOpacity: 0.88,
  ghostScale: 2.4,
  emissiveIntensity: 5.8,
  pulseSpeed: 1.6,
  pulseIntensity: 0.6,
  eyeGlowIntensity: 4.5,
  eyeGlowDecay: 0.95,
  eyeGlowResponse: 0.31,
  rimLightIntensity: 1.8,
  followSpeed: 0.075,
  wobbleAmount: 0.35,
  floatSpeed: 1.6,
  movementThreshold: 0.07,
  particleCount: 250,
  particleDecayRate: 0.005,
  particleColor: 'orange',
  createParticlesOnlyWhenMoving: true,
  particleCreationRate: 5,
  revealRadius: 43,
  fadeStrength: 2.2,
  baseOpacity: 0.35,
  revealOpacity: 0.0,
  fireflyGlowIntensity: 2.6,
  fireflySpeed: 0.04,
  analogIntensity: 0.6,
  analogGrain: 0.4,
  analogBleeding: 1.0,
  analogVSync: 1.0,
  analogScanlines: 1.0,
  analogVignette: 1.0,
  analogJitter: 0.4,
  limboMode: false,
}

// ─── Analog Decay Shader ─────────────────────────────────────────────
const analogDecayShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2() },
    uAnalogGrain: { value: params.analogGrain },
    uAnalogBleeding: { value: params.analogBleeding },
    uAnalogVSync: { value: params.analogVSync },
    uAnalogScanlines: { value: params.analogScanlines },
    uAnalogVignette: { value: params.analogVignette },
    uAnalogJitter: { value: params.analogJitter },
    uAnalogIntensity: { value: params.analogIntensity },
    uLimboMode: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAnalogGrain;
    uniform float uAnalogBleeding;
    uniform float uAnalogVSync;
    uniform float uAnalogScanlines;
    uniform float uAnalogVignette;
    uniform float uAnalogJitter;
    uniform float uAnalogIntensity;
    uniform float uLimboMode;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float gaussian(float z, float u, float o) {
      return (1.0 / (o * sqrt(2.0 * 3.1415))) *
             exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
    }

    vec3 grain(vec2 uv, float time, float intensity) {
      float seed = dot(uv, vec2(12.9898, 78.233));
      float noise = fract(sin(seed) * 43758.5453 + time * 2.0);
      noise = gaussian(noise, 0.0, 0.5 * 0.5);
      return vec3(noise) * intensity;
    }

    void main() {
      vec2 uv = vUv;
      float time = uTime * 1.8;

      vec2 jitteredUV = uv;
      if (uAnalogJitter > 0.01) {
        float jitterAmount = (fract(sin(dot(vec2(floor(time * 60.0)), vec2(12.9898, 78.233))) * 43758.5453123) - 0.5) *
                           0.003 * uAnalogJitter * uAnalogIntensity;
        jitteredUV.x += jitterAmount;
        jitteredUV.y += (fract(sin(dot(vec2(floor(time * 30.0) + 1.0), vec2(12.9898, 78.233))) * 43758.5453123) - 0.5) *
                       0.001 * uAnalogJitter * uAnalogIntensity;
      }

      if (uAnalogVSync > 0.01) {
        float vsyncRoll = sin(time * 2.0 + uv.y * 100.0) * 0.02 *
                        uAnalogVSync * uAnalogIntensity;
        float vsyncChance = step(0.95, fract(sin(dot(vec2(floor(time * 4.0)), vec2(12.9898, 78.233))) * 43758.5453123));
        jitteredUV.y += vsyncRoll * vsyncChance;
      }

      vec4 color = texture2D(tDiffuse, jitteredUV);

      if (uAnalogBleeding > 0.01) {
        float bleedAmount = 0.012 * uAnalogBleeding * uAnalogIntensity;
        float offsetPhase = time * 1.5 + uv.y * 20.0;
        vec2 redOffset = vec2(sin(offsetPhase) * bleedAmount, 0.0);
        vec2 blueOffset = vec2(-sin(offsetPhase * 1.1) * bleedAmount * 0.8, 0.0);
        float r = texture2D(tDiffuse, jitteredUV + redOffset).r;
        float g = texture2D(tDiffuse, jitteredUV).g;
        float b = texture2D(tDiffuse, jitteredUV + blueOffset).b;
        color = vec4(r, g, b, color.a);
      }

      if (uAnalogGrain > 0.01) {
        vec3 grainEffect = grain(uv, time, 0.075 * uAnalogGrain * uAnalogIntensity);
        grainEffect *= (1.0 - color.rgb);
        color.rgb += grainEffect;
      }

      if (uAnalogScanlines > 0.01) {
        float scanlineFreq = 600.0 + uAnalogScanlines * 400.0;
        float scanlinePattern = sin(uv.y * scanlineFreq) * 0.5 + 0.5;
        float scanlineIntensity = 0.1 * uAnalogScanlines * uAnalogIntensity;
        color.rgb *= (1.0 - scanlinePattern * scanlineIntensity);
        float horizontalLines = sin(uv.y * scanlineFreq * 0.1) * 0.02 *
                              uAnalogScanlines * uAnalogIntensity;
        color.rgb *= (1.0 - horizontalLines);
      }

      if (uAnalogVignette > 0.01) {
        vec2 vignetteUV = (uv - 0.5) * 2.0;
        float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.3 *
                        uAnalogVignette * uAnalogIntensity;
        color.rgb *= vignette;
      }

      if (uLimboMode > 0.5) {
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = vec3(gray);
      }

      gl_FragColor = color;
    }
  `,
}

// ─── Ghost Scene Class ───────────────────────────────────────────────
export class GhostScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private analogDecayPass: ShaderPass
  private bloomPass: UnrealBloomPass

  private ghostGroup: THREE.Group
  private ghostBody: THREE.Mesh
  private ghostMaterial: THREE.MeshStandardMaterial
  private atmosphereMaterial: THREE.ShaderMaterial

  private eyes: {
    leftEyeMaterial: THREE.MeshBasicMaterial
    rightEyeMaterial: THREE.MeshBasicMaterial
    leftOuterGlowMaterial: THREE.MeshBasicMaterial
    rightOuterGlowMaterial: THREE.MeshBasicMaterial
  }

  private fireflies: THREE.Mesh[] = []
  private particles: THREE.Mesh[] = []
  private particlePool: THREE.Mesh[] = []
  private particleGroup: THREE.Group
  private particleBaseMaterial: THREE.MeshBasicMaterial
  private particleGeometries: THREE.BufferGeometry[]

  private mouse = new THREE.Vector2()
  private prevMouse = new THREE.Vector2()
  private mouseSpeed = new THREE.Vector2()
  private isMouseMoving = false
  private lastMouseUpdate = 0
  private mouseMovementTimer: ReturnType<typeof setTimeout> | null = null

  private time = 0
  private currentMovement = 0
  private lastFrameTime = 0
  private lastParticleTime = 0
  private frameCount = 0
  private animationId: number | null = null
  private isInitialized = false
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null

  private onReady: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, onReady?: () => void) {
    this.onReady = onReady || null

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = null

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.z = 20

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
      premultipliedAlpha: false,
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    this.renderer.setClearColor(0x000000, 0)

    // Post-processing
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, 1.25, 0.0
    )
    this.composer.addPass(this.bloomPass)

    this.analogDecayPass = new ShaderPass(analogDecayShader)
    this.analogDecayPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
    this.composer.addPass(this.analogDecayPass)
    this.composer.addPass(new OutputPass())

    // Atmosphere
    const atmosphereGeo = new THREE.PlaneGeometry(300, 300)
    this.atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ghostPosition: { value: new THREE.Vector3(0, 0, 0) },
        revealRadius: { value: params.revealRadius },
        fadeStrength: { value: params.fadeStrength },
        baseOpacity: { value: params.baseOpacity },
        revealOpacity: { value: params.revealOpacity },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 ghostPosition;
        uniform float revealRadius;
        uniform float fadeStrength;
        uniform float baseOpacity;
        uniform float revealOpacity;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          float dist = distance(vWorldPosition.xy, ghostPosition.xy);
          float dynamicRadius = revealRadius + sin(time * 2.0) * 5.0;
          float reveal = smoothstep(dynamicRadius * 0.2, dynamicRadius, dist);
          reveal = pow(reveal, fadeStrength);
          float opacity = mix(revealOpacity, baseOpacity, reveal);
          gl_FragColor = vec4(0.001, 0.001, 0.002, opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeo, this.atmosphereMaterial)
    atmosphere.position.z = -50
    atmosphere.renderOrder = -100
    this.scene.add(atmosphere)

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x0a0a2e, 0.08))
    const rim1 = new THREE.DirectionalLight(0x4a90e2, params.rimLightIntensity)
    rim1.position.set(-8, 6, -4)
    this.scene.add(rim1)
    const rim2 = new THREE.DirectionalLight(0x50e3c2, params.rimLightIntensity * 0.7)
    rim2.position.set(8, -4, -6)
    this.scene.add(rim2)

    // Ghost
    this.ghostGroup = new THREE.Group()
    this.scene.add(this.ghostGroup)

    const ghostGeo = new THREE.SphereGeometry(2, 40, 40)
    const pos = ghostGeo.getAttribute('position')
    const positions = pos.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i + 1] < -0.2) {
        const x = positions[i]
        const z = positions[i + 2]
        positions[i + 1] = -2.0 + Math.sin(x * 5) * 0.35 + Math.cos(z * 4) * 0.25 + Math.sin((x + z) * 3) * 0.15
      }
    }
    ghostGeo.computeVertexNormals()

    this.ghostMaterial = new THREE.MeshStandardMaterial({
      color: params.bodyColor,
      transparent: true,
      opacity: params.ghostOpacity,
      emissive: fluorescentColors[params.glowColor],
      emissiveIntensity: params.emissiveIntensity,
      roughness: 0.02,
      metalness: 0.0,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    })
    this.ghostBody = new THREE.Mesh(ghostGeo, this.ghostMaterial)
    this.ghostGroup.add(this.ghostBody)

    // Eyes
    this.eyes = this.createEyes()

    // Fireflies
    this.createFireflies()

    // Particles
    this.particleGroup = new THREE.Group()
    this.scene.add(this.particleGroup)
    this.particleGeometries = [
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.TetrahedronGeometry(0.04, 0),
      new THREE.OctahedronGeometry(0.045, 0),
    ]
    this.particleBaseMaterial = new THREE.MeshBasicMaterial({
      color: fluorescentColors[params.particleColor],
      transparent: true,
      opacity: 0,
      alphaTest: 0.1,
    })
    this.initParticlePool(100)

    // Force initial render
    setTimeout(() => {
      for (let i = 0; i < 3; i++) this.composer.render()
      for (let i = 0; i < 10; i++) this.createParticle()
      this.composer.render()
      this.isInitialized = true
      this.onReady?.()
    }, 100)
  }

  private createEyes() {
    const eyeGroup = new THREE.Group()
    this.ghostGroup.add(eyeGroup)

    const socketGeo = new THREE.SphereGeometry(0.45, 16, 16)
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

    const leftSocket = new THREE.Mesh(socketGeo, socketMat)
    leftSocket.position.set(-0.7, 0.6, 1.9)
    leftSocket.scale.set(1.1, 1.0, 0.6)
    eyeGroup.add(leftSocket)

    const rightSocket = new THREE.Mesh(socketGeo, socketMat)
    rightSocket.position.set(0.7, 0.6, 1.9)
    rightSocket.scale.set(1.1, 1.0, 0.6)
    eyeGroup.add(rightSocket)

    const eyeGeo = new THREE.SphereGeometry(0.3, 12, 12)
    const eyeColor = fluorescentColors[params.eyeGlowColor]

    const leftEyeMaterial = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: true, opacity: 0 })
    eyeGroup.add(new THREE.Mesh(eyeGeo, leftEyeMaterial).translateX(-0.7).translateY(0.6).translateZ(2.0))

    const rightEyeMaterial = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: true, opacity: 0 })
    eyeGroup.add(new THREE.Mesh(eyeGeo, rightEyeMaterial).translateX(0.7).translateY(0.6).translateZ(2.0))

    const glowGeo = new THREE.SphereGeometry(0.525, 12, 12)
    const leftOuterGlowMaterial = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: true, opacity: 0, side: THREE.BackSide })
    eyeGroup.add(new THREE.Mesh(glowGeo, leftOuterGlowMaterial).translateX(-0.7).translateY(0.6).translateZ(1.95))

    const rightOuterGlowMaterial = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: true, opacity: 0, side: THREE.BackSide })
    eyeGroup.add(new THREE.Mesh(glowGeo, rightOuterGlowMaterial).translateX(0.7).translateY(0.6).translateZ(1.95))

    return { leftEyeMaterial, rightEyeMaterial, leftOuterGlowMaterial, rightOuterGlowMaterial }
  }

  private createFireflies() {
    const fireflyGroup = new THREE.Group()
    this.scene.add(fireflyGroup)

    for (let i = 0; i < 20; i++) {
      const ffGeo = new THREE.SphereGeometry(0.02, 2, 2)
      const ffMat = new THREE.MeshBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.9 })
      const firefly = new THREE.Mesh(ffGeo, ffMat)
      firefly.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
      )

      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.4, side: THREE.BackSide })
      firefly.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat))

      const light = new THREE.PointLight(0xffff44, 0.8, 3, 2)
      firefly.add(light)

      firefly.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * params.fireflySpeed,
          (Math.random() - 0.5) * params.fireflySpeed,
          (Math.random() - 0.5) * params.fireflySpeed,
        ),
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 2 + Math.random() * 3,
        glowMaterial: glowMat,
        fireflyMaterial: ffMat,
        light,
      }

      fireflyGroup.add(firefly)
      this.fireflies.push(firefly)
    }
  }

  private initParticlePool(count: number) {
    for (let i = 0; i < count; i++) {
      const geo = this.particleGeometries[Math.floor(Math.random() * this.particleGeometries.length)]
      const mat = this.particleBaseMaterial.clone()
      const p = new THREE.Mesh(geo, mat)
      p.visible = false
      this.particleGroup.add(p)
      this.particlePool.push(p)
    }
  }

  private createParticle() {
    let particle: THREE.Mesh
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!
      particle.visible = true
    } else if (this.particles.length < params.particleCount) {
      const geo = this.particleGeometries[Math.floor(Math.random() * this.particleGeometries.length)]
      particle = new THREE.Mesh(geo, this.particleBaseMaterial.clone())
      this.particleGroup.add(particle)
    } else {
      return
    }

    const c = new THREE.Color(fluorescentColors[params.particleColor])
    c.offsetHSL(Math.random() * 0.1 - 0.05, 0, 0);
    (particle.material as THREE.MeshBasicMaterial).color = c

    particle.position.copy(this.ghostGroup.position)
    particle.position.z -= 0.8 + Math.random() * 0.6
    particle.position.x += (Math.random() - 0.5) * 3.5
    particle.position.y += (Math.random() - 0.5) * 3.5 - 0.8

    const s = 0.6 + Math.random() * 0.7
    particle.scale.set(s, s, s)
    particle.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)

    particle.userData.life = 1.0
    particle.userData.decay = Math.random() * 0.003 + params.particleDecayRate
    particle.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.015,
      y: (Math.random() - 0.5) * 0.015,
      z: (Math.random() - 0.5) * 0.015,
    }
    particle.userData.velocity = {
      x: (Math.random() - 0.5) * 0.012,
      y: (Math.random() - 0.5) * 0.012 - 0.002,
      z: (Math.random() - 0.5) * 0.012 - 0.006,
    };
    (particle.material as THREE.MeshBasicMaterial).opacity = Math.random() * 0.9
    this.particles.push(particle)
  }

  // ─── Public API ──────────────────────────────────────────────────
  setMouse(x: number, y: number) {
    const now = performance.now()
    if (now - this.lastMouseUpdate > 16) {
      this.prevMouse.x = this.mouse.x
      this.prevMouse.y = this.mouse.y
      this.mouse.x = x
      this.mouse.y = y
      this.mouseSpeed.x = this.mouse.x - this.prevMouse.x
      this.mouseSpeed.y = this.mouse.y - this.prevMouse.y
      this.isMouseMoving = true
      if (this.mouseMovementTimer) clearTimeout(this.mouseMovementTimer)
      this.mouseMovementTimer = setTimeout(() => { this.isMouseMoving = false }, 80)
      this.lastMouseUpdate = now
    }
  }

  resize(w: number, h: number) {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout)
    this.resizeTimeout = setTimeout(() => {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
      this.composer.setSize(w, h)
      this.bloomPass.setSize(w, h)
      this.analogDecayPass.uniforms.uResolution.value.set(w, h)
    }, 100)
  }

  animate = (timestamp: number) => {
    this.animationId = requestAnimationFrame(this.animate)
    if (!this.isInitialized) return

    const deltaTime = timestamp - this.lastFrameTime
    this.lastFrameTime = timestamp
    if (deltaTime > 100) return

    const timeInc = (deltaTime / 16.67) * 0.01
    this.time += timeInc
    this.frameCount++

    // Shader uniforms
    this.atmosphereMaterial.uniforms.time.value = this.time
    this.analogDecayPass.uniforms.uTime.value = this.time

    // Ghost follows mouse
    const targetX = this.mouse.x * 11
    const targetY = this.mouse.y * 7
    const prevPos = this.ghostGroup.position.clone()

    this.ghostGroup.position.x += (targetX - this.ghostGroup.position.x) * params.followSpeed
    this.ghostGroup.position.y += (targetY - this.ghostGroup.position.y) * params.followSpeed
    this.atmosphereMaterial.uniforms.ghostPosition.value.copy(this.ghostGroup.position)

    const movement = prevPos.distanceTo(this.ghostGroup.position)
    this.currentMovement = this.currentMovement * params.eyeGlowDecay + movement * (1 - params.eyeGlowDecay)

    // Float
    this.ghostGroup.position.y +=
      Math.sin(this.time * params.floatSpeed * 1.5) * 0.03 +
      Math.cos(this.time * params.floatSpeed * 0.7) * 0.018 +
      Math.sin(this.time * params.floatSpeed * 2.3) * 0.008

    // Pulse
    const pulse1 = Math.sin(this.time * params.pulseSpeed) * params.pulseIntensity
    const breathe = Math.sin(this.time * 0.6) * 0.12
    this.ghostMaterial.emissiveIntensity = params.emissiveIntensity + pulse1 + breathe

    // Fireflies
    this.fireflies.forEach((ff) => {
      const ud = ff.userData
      const pulse = Math.sin(this.time + ud.phase * ud.pulseSpeed) * 0.4 + 0.6
      ud.glowMaterial.opacity = params.fireflyGlowIntensity * 0.4 * pulse
      ud.fireflyMaterial.opacity = params.fireflyGlowIntensity * 0.9 * pulse
      ud.light.intensity = params.fireflyGlowIntensity * 0.8 * pulse
      ud.velocity.x += (Math.random() - 0.5) * 0.001
      ud.velocity.y += (Math.random() - 0.5) * 0.001
      ud.velocity.z += (Math.random() - 0.5) * 0.001
      ud.velocity.clampLength(0, params.fireflySpeed)
      ff.position.add(ud.velocity)
      if (Math.abs(ff.position.x) > 30) ud.velocity.x *= -0.5
      if (Math.abs(ff.position.y) > 20) ud.velocity.y *= -0.5
      if (Math.abs(ff.position.z) > 15) ud.velocity.z *= -0.5
    })

    // Ghost body rotation & scale
    const dir = new THREE.Vector2(targetX - this.ghostGroup.position.x, targetY - this.ghostGroup.position.y).normalize()
    const tilt = 0.1 * params.wobbleAmount
    this.ghostBody.rotation.z = this.ghostBody.rotation.z * 0.95 - dir.x * tilt * 0.05
    this.ghostBody.rotation.x = this.ghostBody.rotation.x * 0.95 + dir.y * tilt * 0.05
    this.ghostBody.rotation.y = Math.sin(this.time * 1.4) * 0.05 * params.wobbleAmount

    const sv = 1 + Math.sin(this.time * 2.1) * 0.025 * params.wobbleAmount + pulse1 * 0.015
    const sb = 1 + Math.sin(this.time * 0.8) * 0.012
    const fs = sv * sb
    this.ghostBody.scale.set(fs, fs, fs)

    // Eye glow
    const normSpeed = Math.sqrt(this.mouseSpeed.x ** 2 + this.mouseSpeed.y ** 2) * 8
    const isMoving = this.currentMovement > params.movementThreshold
    const targetGlow = isMoving ? 1.0 : 0.0
    const glowSpeed = isMoving ? params.eyeGlowResponse * 2 : params.eyeGlowResponse
    const newOp = this.eyes.leftEyeMaterial.opacity + (targetGlow - this.eyes.leftEyeMaterial.opacity) * glowSpeed
    this.eyes.leftEyeMaterial.opacity = newOp
    this.eyes.rightEyeMaterial.opacity = newOp
    this.eyes.leftOuterGlowMaterial.opacity = newOp * 0.3
    this.eyes.rightOuterGlowMaterial.opacity = newOp * 0.3

    // Particles
    const shouldCreate = params.createParticlesOnlyWhenMoving
      ? this.currentMovement > 0.005 && this.isMouseMoving
      : this.currentMovement > 0.005

    if (shouldCreate && timestamp - this.lastParticleTime > 100) {
      const rate = Math.min(params.particleCreationRate, Math.max(1, Math.floor(normSpeed * 3)))
      for (let i = 0; i < rate; i++) this.createParticle()
      this.lastParticleTime = timestamp
    }

    const pCount = Math.min(this.particles.length, 60)
    for (let i = 0; i < pCount; i++) {
      const idx = (this.frameCount + i) % this.particles.length
      if (idx < this.particles.length) {
        const p = this.particles[idx]
        p.userData.life -= p.userData.decay;
        (p.material as THREE.MeshBasicMaterial).opacity = p.userData.life * 0.85
        if (p.userData.velocity) {
          p.position.x += p.userData.velocity.x
          p.position.y += p.userData.velocity.y
          p.position.z += p.userData.velocity.z
          p.position.x += Math.cos(this.time * 1.8 + p.position.y) * 0.0008
        }
        if (p.userData.rotationSpeed) {
          p.rotation.x += p.userData.rotationSpeed.x
          p.rotation.y += p.userData.rotationSpeed.y
          p.rotation.z += p.userData.rotationSpeed.z
        }
        if (p.userData.life <= 0) {
          p.visible = false;
          (p.material as THREE.MeshBasicMaterial).opacity = 0
          this.particlePool.push(p)
          this.particles.splice(idx, 1)
        }
      }
    }

    this.composer.render()
  }

  destroy() {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId)
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout)
    if (this.mouseMovementTimer) clearTimeout(this.mouseMovementTimer)
    this.renderer.dispose()
    this.composer.dispose()
  }
}

// ─── WebGL Detection ─────────────────────────────────────────────────
export function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      const lowEnd = /swiftshader|llvmpipe|software/i.test(renderer)
      if (lowEnd) return false
    }
    return true
  } catch {
    return false
  }
}
