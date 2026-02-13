'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface CtaOverlayProps { isVisible: boolean }

const SCRAMBLE_CHARS = '\u25A0\u25AA\u258C\u2590\u25AC\u2591\u2592\u2593\u2588\u2584\u2580'
const PRIMARY_TEXT = 'Coming March 28'
const GLITCH_TEXT = 'Click Here'

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
    const dashLen = Math.max(30, perimeter * 0.08)
    let raf = 0
    let lastTime = performance.now()
    let nextEvent = 1500 + Math.random() * 3000
    let elapsed = 0

    function tick(now: number) {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now
      elapsed += dt

      if (elapsed > nextEvent) {
        elapsed = 0
        nextEvent = 1500 + Math.random() * 4000
        const roll = Math.random()
        if (roll < 0.25) {
          pauseRef.current = true
          setTimeout(() => { pauseRef.current = false }, 300 + Math.random() * 700)
        } else if (roll < 0.5) {
          speedRef.current = 1.5 + Math.random() * 1.5
          setTimeout(() => { speedRef.current = 0.4 + Math.random() * 0.5 }, 400 + Math.random() * 600)
        } else if (roll < 0.7) {
          glowRef.current = 0.3
          setTimeout(() => { glowRef.current = 1 }, 100)
          setTimeout(() => { glowRef.current = 0.4 }, 200)
          setTimeout(() => { glowRef.current = 1 }, 300)
        } else {
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

/** Button text that randomly glitches between primary text and alt text */
function GlitchButtonText() {
  const [displayText, setDisplayText] = useState(PRIMARY_TEXT)
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    let cancelled = false

    function scheduleGlitch() {
      if (cancelled) return
      // Random delay: 3-8 seconds between glitches
      const delay = 3000 + Math.random() * 5000
      setTimeout(() => {
        if (cancelled) return

        // Start scramble sequence
        setIsGlitching(true)
        let frame = 0
        const scrambleFrames = 6 + Math.floor(Math.random() * 4)
        const showAlt = Math.random() < 0.5 // 50% chance to show "Click Here"

        function scrambleTick() {
          if (cancelled) return
          if (frame >= scrambleFrames) {
            // Resolve to either alt text or primary text
            if (showAlt) {
              setDisplayText(GLITCH_TEXT)
              // Hold "Click Here" briefly, then scramble back
              setTimeout(() => {
                if (cancelled) return
                let returnFrame = 0
                const returnFrames = 4 + Math.floor(Math.random() * 3)
                function returnTick() {
                  if (cancelled) return
                  if (returnFrame >= returnFrames) {
                    setDisplayText(PRIMARY_TEXT)
                    setIsGlitching(false)
                    scheduleGlitch()
                    return
                  }
                  // Scramble chars during return
                  const target = PRIMARY_TEXT
                  const chars = target.split('')
                  const numGlitch = 2 + Math.floor(Math.random() * 4)
                  for (let n = 0; n < numGlitch; n++) {
                    const idx = Math.floor(Math.random() * chars.length)
                    if (chars[idx] !== ' ') {
                      chars[idx] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
                    }
                  }
                  setDisplayText(chars.join(''))
                  returnFrame++
                  requestAnimationFrame(returnTick)
                }
                requestAnimationFrame(returnTick)
              }, 800 + Math.random() * 1200) // Hold alt text 0.8-2s
            } else {
              // Just glitched and returned to primary
              setDisplayText(PRIMARY_TEXT)
              setIsGlitching(false)
              scheduleGlitch()
            }
            return
          }

          // Scramble characters mid-transition
          const source = frame < scrambleFrames / 2 ? PRIMARY_TEXT : (showAlt ? GLITCH_TEXT : PRIMARY_TEXT)
          const chars = source.split('')
          const numGlitch = 3 + Math.floor(Math.random() * 5)
          for (let n = 0; n < numGlitch; n++) {
            const idx = Math.floor(Math.random() * chars.length)
            if (chars[idx] !== ' ') {
              chars[idx] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
            }
          }
          setDisplayText(chars.join(''))
          frame++
          requestAnimationFrame(scrambleTick)
        }
        requestAnimationFrame(scrambleTick)
      }, delay)
    }

    scheduleGlitch()
    return () => { cancelled = true }
  }, [])

  return (
    <span
      className="relative z-10"
      style={{
        textShadow: isGlitching
          ? '1px 0 #00ffff, -1px 0 #ff4500'
          : 'none',
        transition: 'text-shadow 0.1s',
      }}
    >
      {displayText}
    </span>
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
    <div
      className={`fixed inset-0 z-10 flex flex-col items-center justify-end pb-[8vh] pointer-events-none transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Brand mark — tighter spacing, moved up */}
      <div
        className={`text-center mb-4 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-spectral tracking-tight leading-none">
          GOOD LOOKIN
          <br />
          CORPSE
        </h1>
        <p className="mt-2 font-mono text-[10px] sm:text-xs text-white/40 tracking-[0.4em] uppercase">
          Can&apos;t Kill What&apos;s Already Dead
        </p>
      </div>

      {/* CTA area */}
      <div
        className={`pointer-events-auto transition-all duration-1000 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {!showForm && !submitted && (
          <button
            ref={btnRef}
            onClick={() => setShowForm(true)}
            className="group relative px-8 py-3 border border-white/10 text-spectral font-mono text-xs tracking-[0.3em] uppercase
                       hover:text-neon-cyan transition-all duration-500 focus:outline-none"
          >
            {/* Neon trace animation */}
            <NeonTrace width={btnSize.w} height={btnSize.h} />
            <GlitchButtonText />
            <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        )}

        {showForm && !submitted && (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-64 px-4 py-3 bg-transparent border border-white/20 text-spectral font-mono text-xs
                         tracking-wider placeholder:text-white/20
                         focus:outline-none focus:border-neon-cyan/50 transition-colors duration-300"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white/5 border border-white/20 text-spectral font-mono text-xs tracking-[0.2em] uppercase
                         hover:bg-neon-cyan/10 hover:border-neon-cyan/50 hover:text-neon-cyan transition-all duration-300
                         focus:outline-none focus:ring-1 focus:ring-neon-cyan/30"
            >
              Notify Me
            </button>
          </form>
        )}

        {submitted && (
          <p className="font-mono text-xs text-neon-cyan/70 tracking-[0.3em] uppercase animate-fade-in">
            You&apos;re on the list
          </p>
        )}
      </div>
    </div>
  )
}
