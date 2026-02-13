'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface CtaOverlayProps { isVisible: boolean }

/** Neon light that traces the button border at random speeds */
function NeonTrace({ width, height }: { width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const offsetRef = useRef(0)
  const speedRef = useRef(0.6)
  const pauseRef = useRef(false)
  const glowRef = useRef(1)

  useEffect(() => {
    if (!width || !height) return
    const perimeter = 2 * (width + height)
    const dashLen = Math.max(30, perimeter * 0.08) // ~8% of perimeter lit
    let raf = 0
    let lastTime = performance.now()
    let nextEvent = 1500 + Math.random() * 3000
    let elapsed = 0

    function tick(now: number) {
      const dt = Math.min(now - lastTime, 50) // cap at 50ms
      lastTime = now
      elapsed += dt

      // Random events: speed change, pause, or flicker
      if (elapsed > nextEvent) {
        elapsed = 0
        nextEvent = 1500 + Math.random() * 4000
        const roll = Math.random()
        if (roll < 0.25) {
          // Pause briefly
          pauseRef.current = true
          setTimeout(() => { pauseRef.current = false }, 300 + Math.random() * 700)
        } else if (roll < 0.5) {
          // Speed burst
          speedRef.current = 1.5 + Math.random() * 1.5
          setTimeout(() => { speedRef.current = 0.4 + Math.random() * 0.5 }, 400 + Math.random() * 600)
        } else if (roll < 0.7) {
          // Flicker glow
          glowRef.current = 0.3
          setTimeout(() => { glowRef.current = 1 }, 100)
          setTimeout(() => { glowRef.current = 0.4 }, 200)
          setTimeout(() => { glowRef.current = 1 }, 300)
        } else {
          // Gentle speed change
          speedRef.current = 0.3 + Math.random() * 0.8
        }
      }

      if (!pauseRef.current) {
        offsetRef.current = (offsetRef.current + speedRef.current * (dt / 16)) % perimeter
      }

      const rect = svgRef.current?.querySelector('rect')
      if (rect) {
        rect.setAttribute('stroke-dasharray', `${dashLen} ${perimeter - dashLen}`)
        rect.setAttribute('stroke-dashoffset', String(-offsetRef.current))
        rect.setAttribute('stroke-opacity', String(glowRef.current))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [width, height])

  if (!width || !height) return null

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width={width - 1}
        height={height - 1}
        rx="0"
        ry="0"
        stroke="#00ffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        filter="url(#neonGlow)"
      />
      <defs>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

export default function CtaOverlay({ isVisible }: CtaOverlayProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [btnSize, setBtnSize] = useState({ w: 0, h: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  // Measure button for SVG overlay
  useEffect(() => {
    if (!btnRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // Add padding back (px-8 = 32px each side, py-3 = 12px each side)
        setBtnSize({ w: Math.round(width + 64), h: Math.round(height + 24) })
      }
    })
    ro.observe(btnRef.current)
    return () => ro.disconnect()
  }, [showForm, submitted])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      console.log('Email signup:', email)
      setSubmitted(true)
    }
  }

  return (
    <div className={`fixed inset-0 z-10 flex flex-col items-center justify-end pb-[12vh] pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`text-center mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-spectral tracking-tight leading-none">GOOD LOOKIN<br />CORPSE</h1>
        <p className="mt-3 font-mono text-[10px] sm:text-xs text-white/40 tracking-[0.4em] uppercase">Can&apos;t Kill What&apos;s Already Dead</p>
      </div>
      <div className={`pointer-events-auto transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {!showForm && !submitted && (
          <button
            ref={btnRef}
            onClick={() => setShowForm(true)}
            className="group relative px-8 py-3 border border-white/10 text-spectral font-mono text-xs tracking-[0.3em] uppercase hover:text-neon-cyan transition-all duration-500 focus:outline-none"
          >
            {/* Neon trace animation */}
            <NeonTrace width={btnSize.w} height={btnSize.h} />
            <span className="relative z-10">Coming March 28</span>
            <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        )}
        {showForm && !submitted && (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="w-64 px-4 py-3 bg-transparent border border-white/20 text-spectral font-mono text-xs tracking-wider placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors duration-300" />
            <button type="submit" className="px-6 py-3 bg-white/5 border border-white/20 text-spectral font-mono text-xs tracking-[0.2em] uppercase hover:bg-neon-cyan/10 hover:border-neon-cyan/50 hover:text-neon-cyan transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30">Notify Me</button>
          </form>
        )}
        {submitted && <p className="font-mono text-xs text-neon-cyan/70 tracking-[0.3em] uppercase animate-fade-in">You&apos;re on the list</p>}
      </div>
    </div>
  )
}
