'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * FaceSkullCanvas — Procedural happy face that melts into a skull, then dissolves.
 *
 * Phases (driven by parent):
 *   'face'     — Draw happy face, hold
 *   'melt'     — Face melts/distorts into skull shape
 *   'skull'    — Skull holds, eyes glow
 *   'dissolve' — Skull particles scatter outward
 *   'gone'     — Canvas cleared, ready for ghost
 *
 * All procedural — no SVG imports.
 * Uses 2D canvas particles sampled from drawn shapes.
 */

interface FaceSkullCanvasProps {
  phase: 'idle' | 'face' | 'melt' | 'skull' | 'dissolve' | 'gone'
  onPhaseComplete?: (phase: string) => void
}

// Color palette
const FACE_COLOR = '#ffd96a'    // warm gold
const SKULL_COLOR = '#e5ddd0'   // bone white
const EYE_GLOW_COLORS = ['#ffb935', '#00ffff', '#ffffff', '#ff867f', '#c084fc']

interface Particle {
  // Current position
  x: number
  y: number
  // Face target position
  faceX: number
  faceY: number
  // Skull target position
  skullX: number
  skullY: number
  // Dissolve velocity
  vx: number
  vy: number
  // Visual
  size: number
  color: string
  skullColor: string
  opacity: number
  // Which part (for eye glow)
  isEye: boolean
}

// Draw a happy face to an offscreen canvas and sample particle positions
function sampleFaceParticles(w: number, h: number, count: number): Particle[] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.28

  // Draw filled happy face
  ctx.fillStyle = FACE_COLOR

  // Head circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Eyes (filled circles)
  const eyeR = r * 0.12
  const eyeY = cy - r * 0.15
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(cx - r * 0.3, eyeY, eyeR, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + r * 0.3, eyeY, eyeR, 0, Math.PI * 2)
  ctx.fill()

  // Smile arc
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = r * 0.06
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()

  // Sample pixels
  const imageData = ctx.getImageData(0, 0, w, h)
  const pixels: { x: number; y: number; isEye: boolean }[] = []

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4
      const a = imageData.data[idx + 3]
      if (a > 50) {
        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]
        const isEye = r < 80 && g < 80 && b < 80
        pixels.push({ x, y, isEye })
      }
    }
  }

  // Randomly sample from available pixels
  const particles: Particle[] = []
  for (let i = 0; i < count && pixels.length > 0; i++) {
    const idx = Math.floor(Math.random() * pixels.length)
    const p = pixels[idx]
    particles.push({
      x: p.x, y: p.y,
      faceX: p.x, faceY: p.y,
      skullX: 0, skullY: 0, // Will be set below
      vx: 0, vy: 0,
      size: 1.5 + Math.random() * 2,
      color: p.isEye ? '#1a1a1a' : FACE_COLOR,
      skullColor: SKULL_COLOR,
      opacity: 1,
      isEye: p.isEye,
    })
  }

  return particles
}

// Draw a skull shape to offscreen canvas and sample positions
function sampleSkullParticles(w: number, h: number, count: number): { x: number; y: number; isEye: boolean }[] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.28

  // Skull cranium (wider top, narrower jaw)
  ctx.fillStyle = SKULL_COLOR

  // Cranium — slightly vertically stretched ellipse
  ctx.beginPath()
  ctx.ellipse(cx, cy - r * 0.1, r * 1.0, r * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()

  // Jaw — narrower trapezoid area
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.55, cy + r * 0.5)
  ctx.lineTo(cx + r * 0.55, cy + r * 0.5)
  ctx.lineTo(cx + r * 0.35, cy + r * 1.0)
  ctx.lineTo(cx - r * 0.35, cy + r * 1.0)
  ctx.closePath()
  ctx.fill()

  // Eye sockets (dark voids)
  ctx.fillStyle = '#000000'
  const eyeW = r * 0.28
  const eyeH = r * 0.32
  const eyeY = cy - r * 0.15

  // Left eye socket (upside-down triangle-ish)
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.32, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2)
  ctx.fill()

  // Right eye socket
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.32, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2)
  ctx.fill()

  // Nose hole (inverted triangle)
  ctx.beginPath()
  ctx.moveTo(cx, cy + r * 0.15)
  ctx.lineTo(cx - r * 0.12, cy + r * 0.35)
  ctx.lineTo(cx + r * 0.12, cy + r * 0.35)
  ctx.closePath()
  ctx.fill()

  // Teeth line
  ctx.fillStyle = '#1a1a1a'
  const teethY = cy + r * 0.55
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(cx + i * r * 0.1 - r * 0.03, teethY, r * 0.06, r * 0.15)
    // Gaps between teeth
    ctx.clearRect(cx + i * r * 0.1 + r * 0.025, teethY, r * 0.02, r * 0.15)
  }

  // Sample pixels
  const imageData = ctx.getImageData(0, 0, w, h)
  const pixels: { x: number; y: number; isEye: boolean }[] = []

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4
      const a = imageData.data[idx + 3]
      if (a > 50) {
        const rr = imageData.data[idx]
        const isEye = rr < 30 // Eye socket regions are black
        pixels.push({ x, y, isEye })
      }
    }
  }

  // Shuffle and take
  for (let i = pixels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pixels[i], pixels[j]] = [pixels[j], pixels[i]]
  }

  return pixels.slice(0, count)
}

export default function FaceSkullCanvas({ phase, onPhaseComplete }: FaceSkullCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef(0)
  const phaseRef = useRef(phase)
  const phaseStartRef = useRef(0)
  const glowColorIdxRef = useRef(0)

  phaseRef.current = phase

  // Initialize particles when entering face phase
  useEffect(() => {
    if (phase === 'face') {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = canvas.width = window.innerWidth
      const h = canvas.height = window.innerHeight
      const count = Math.min(6000, Math.floor(w * h / 120))

      const particles = sampleFaceParticles(w, h, count)

      // Get skull target positions
      const skullPositions = sampleSkullParticles(w, h, count)

      // Map skull positions to particles
      for (let i = 0; i < particles.length; i++) {
        if (i < skullPositions.length) {
          particles[i].skullX = skullPositions[i].x
          particles[i].skullY = skullPositions[i].y
          // Eye particles on skull get special color
          if (skullPositions[i].isEye) {
            particles[i].isEye = true
            particles[i].skullColor = '#000000'
          }
        } else {
          // Extra particles — scatter to edges
          const angle = Math.random() * Math.PI * 2
          const dist = Math.min(w, h) * 0.6
          particles[i].skullX = w / 2 + Math.cos(angle) * dist
          particles[i].skullY = h / 2 + Math.sin(angle) * dist
        }
      }

      particlesRef.current = particles
      phaseStartRef.current = performance.now()
    }
  }, [phase])

  // Start phase timers
  useEffect(() => {
    if (phase === 'face') {
      phaseStartRef.current = performance.now()
      // Hold face for 2s, then signal melt
      const timer = setTimeout(() => onPhaseComplete?.('face'), 2000)
      return () => clearTimeout(timer)
    }
    if (phase === 'melt') {
      phaseStartRef.current = performance.now()
      // Melt takes 2s
      const timer = setTimeout(() => onPhaseComplete?.('melt'), 2000)
      return () => clearTimeout(timer)
    }
    if (phase === 'skull') {
      phaseStartRef.current = performance.now()
      // Hold skull for 3s with eye glow
      const timer = setTimeout(() => onPhaseComplete?.('skull'), 3000)
      return () => clearTimeout(timer)
    }
    if (phase === 'dissolve') {
      phaseStartRef.current = performance.now()
      // Set dissolve velocities
      const cx = (canvasRef.current?.width || window.innerWidth) / 2
      const cy = (canvasRef.current?.height || window.innerHeight) / 2
      particlesRef.current.forEach(p => {
        const dx = p.x - cx
        const dy = p.y - cy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const speed = 1 + Math.random() * 3
        p.vx = (dx / dist) * speed + (Math.random() - 0.5) * 2
        p.vy = (dy / dist) * speed + (Math.random() - 0.5) * 2 - 0.5 // slight upward bias
      })
      const timer = setTimeout(() => onPhaseComplete?.('dissolve'), 2500)
      return () => clearTimeout(timer)
    }
  }, [phase, onPhaseComplete])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let running = true

    function animate() {
      if (!running || !canvas) return

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const currentPhase = phaseRef.current
      if (currentPhase === 'idle' || currentPhase === 'gone') {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      const elapsed = (performance.now() - phaseStartRef.current) / 1000
      const particles = particlesRef.current

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (currentPhase === 'face') {
          // Particles at face positions, slight jitter
          p.x = p.faceX + (Math.random() - 0.5) * 0.3
          p.y = p.faceY + (Math.random() - 0.5) * 0.3
          p.opacity = Math.min(1, elapsed * 2) // fade in over 0.5s
          ctx.fillStyle = p.color
        }
        else if (currentPhase === 'melt') {
          // Lerp from face to skull position
          const t = Math.min(1, elapsed / 1.8)
          // Smoothstep
          const s = t * t * (3 - 2 * t)
          // Add melt drip effect — particles in lower half drip more
          const dripFactor = Math.max(0, (p.faceY - h * 0.4) / (h * 0.3))
          const meltDrip = dripFactor * Math.sin(elapsed * 3 + i * 0.01) * 20 * (1 - s)

          p.x = p.faceX + (p.skullX - p.faceX) * s + (Math.random() - 0.5) * (1 - s) * 3
          p.y = p.faceY + (p.skullY - p.faceY) * s + meltDrip
          p.opacity = 1

          // Color transition
          const faceR = parseInt(p.color.slice(1, 3) || 'e5', 16)
          const faceG = parseInt(p.color.slice(3, 5) || 'dd', 16)
          const faceB = parseInt(p.color.slice(5, 7) || 'd0', 16)
          const skullR = parseInt(p.skullColor.slice(1, 3) || 'e5', 16)
          const skullG = parseInt(p.skullColor.slice(3, 5) || 'dd', 16)
          const skullB = parseInt(p.skullColor.slice(5, 7) || 'd0', 16)
          const r = Math.round(faceR + (skullR - faceR) * s)
          const g = Math.round(faceG + (skullG - faceG) * s)
          const b = Math.round(faceB + (skullB - faceB) * s)
          ctx.fillStyle = `rgb(${r},${g},${b})`
        }
        else if (currentPhase === 'skull') {
          // At skull positions, eyes glow
          p.x = p.skullX + (Math.random() - 0.5) * 0.4
          p.y = p.skullY + (Math.random() - 0.5) * 0.4
          p.opacity = 1

          if (p.isEye && p.skullColor === '#000000') {
            // Eye glow — cycle colors
            const colorTime = elapsed * 0.8
            const colorIdx = Math.floor(colorTime) % EYE_GLOW_COLORS.length
            const nextIdx = (colorIdx + 1) % EYE_GLOW_COLORS.length
            const t = colorTime - Math.floor(colorTime)
            const c1 = EYE_GLOW_COLORS[colorIdx]
            const c2 = EYE_GLOW_COLORS[nextIdx]
            // Simple color lerp
            const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
            const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
            const r = Math.round(r1 + (r2 - r1) * t)
            const g = Math.round(g1 + (g2 - g1) * t)
            const b = Math.round(b1 + (b2 - b1) * t)
            const pulse = 0.7 + 0.3 * Math.sin(elapsed * 4)
            ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`
            // Bigger glow for eye particles
            const oldSize = p.size
            p.size = oldSize * (1.5 + 0.5 * Math.sin(elapsed * 3))
            ctx.globalAlpha = p.opacity
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
            p.size = oldSize
            continue
          } else {
            ctx.fillStyle = p.skullColor
          }
        }
        else if (currentPhase === 'dissolve') {
          // Particles scatter outward
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.02 // slight gravity
          p.vx *= 0.995 // drag
          p.vy *= 0.995
          p.opacity = Math.max(0, 1 - elapsed / 2)

          if (p.isEye) {
            const ci = Math.floor(elapsed * 2) % EYE_GLOW_COLORS.length
            ctx.fillStyle = EYE_GLOW_COLORS[ci]
          } else {
            ctx.fillStyle = p.skullColor
          }
        }

        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [phase])

  // Handle resize
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (phase === 'idle' || phase === 'gone') return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-15 w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
}