'use client'

import { useState, useEffect, useRef } from 'react'

interface CtaOverlayProps { isVisible: boolean }

const SCRAMBLE_CHARS = '\u25A0\u25AA\u258C\u2590\u25AC\u2591\u2592\u2593\u2588\u2584\u2580'

/** Font/weight combos for the glitch cycle */
const GLITCH_FONTS = [
  { family: 'var(--font-bebas)', weight: '400', style: 'normal', stretch: 'normal' },
  { family: 'var(--font-playfair)', weight: '900', style: 'italic', stretch: 'normal' },
  { family: 'var(--font-elite)', weight: '400', style: 'normal', stretch: 'normal' },
  { family: 'var(--font-inter)', weight: '100', style: 'normal', stretch: 'normal' },
  { family: 'var(--font-playfair)', weight: '400', style: 'normal', stretch: 'normal' },
  { family: 'var(--font-bebas)', weight: '400', style: 'normal', stretch: 'normal' },
  { family: 'var(--font-inter)', weight: '900', style: 'normal', stretch: 'normal' },
]

const PRIMARY_TEXT = 'Coming March 28'
const ALT_TEXTS = ['Click Here', 'Coming March 28', 'Pre-Order Soon', 'Coming March 28']

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

/** Button text that glitches through different fonts/weights and occasionally swaps text */
function GlitchButtonText() {
  const [displayText, setDisplayText] = useState(PRIMARY_TEXT)
  const [isGlitching, setIsGlitching] = useState(false)
  const [fontStyle, setFontStyle] = useState<typeof GLITCH_FONTS[0] | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let cancelled = false

    function scheduleGlitch() {
      if (cancelled) return
      const delay = 2500 + Math.random() * 4000
      setTimeout(() => {
        if (cancelled) return

        setIsGlitching(true)
        let frame = 0
        const totalFrames = 8 + Math.floor(Math.random() * 6)
        // Pick a random alt text (50% chance to stay on primary)
        const altText = ALT_TEXTS[Math.floor(Math.random() * ALT_TEXTS.length)]
        const showAlt = altText !== PRIMARY_TEXT

        function scrambleTick() {
          if (cancelled) return
          if (frame >= totalFrames) {
            if (showAlt) {
              // Land on alt text with a random font
              const altFont = GLITCH_FONTS[Math.floor(Math.random() * GLITCH_FONTS.length)]
              setDisplayText(altText)
              setFontStyle(altFont)

              // Hold alt text briefly, then scramble back to primary
              setTimeout(() => {
                if (cancelled) return
                let returnFrame = 0
                const returnFrames = 5 + Math.floor(Math.random() * 4)
                function returnTick() {
                  if (cancelled) return
                  if (returnFrame >= returnFrames) {
                    setDisplayText(PRIMARY_TEXT)
                    setFontStyle(null)
                    setIsGlitching(false)
                    scheduleGlitch()
                    return
                  }
                  // Cycle through fonts on each frame
                  const font = GLITCH_FONTS[Math.floor(Math.random() * GLITCH_FONTS.length)]
                  setFontStyle(font)
                  // Scramble some chars
                  const chars = PRIMARY_TEXT.split('')
                  const numGlitch = 2 + Math.floor(Math.random() * 5)
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
              }, 600 + Math.random() * 1000)
            } else {
              // Just glitched fonts without changing text
              setDisplayText(PRIMARY_TEXT)
              setFontStyle(null)
              setIsGlitching(false)
              scheduleGlitch()
            }
            return
          }

          // Mid-scramble: cycle fonts rapidly and scramble chars
          const font = GLITCH_FONTS[Math.floor(Math.random() * GLITCH_FONTS.length)]
          setFontStyle(font)
          const source = frame < totalFrames / 2 ? PRIMARY_TEXT : (showAlt ? altText : PRIMARY_TEXT)
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
      ref={spanRef}
      className="relative z-10 inline-block min-w-[14ch] text-center"
      style={{
        fontFamily: fontStyle?.family || 'inherit',
        fontWeight: fontStyle?.weight || 'inherit',
        fontStyle: fontStyle?.style || 'normal',
        textShadow: isGlitching
          ? '1px 0 #00ffff, -1px 0 #ff4500'
          : 'none',
        transition: 'text-shadow 0.05s',
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
      className={`fixed inset-0 z-10 flex flex-col items-center pointer-events-none transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* ─── CENTER: Brand mark — dominant, centered on screen ─── */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className={`text-center transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <h1
            className="font-display tracking-tight leading-[0.85] text-spectral"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 10rem)',
              textShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 120px rgba(0,0,0,0.7), 0 0 20px rgba(229,229,229,0.15)',
            }}
          >
            GOOD
            <br />
            LOOKIN
            <br />
            <span className="inline-flex items-baseline">
              CORP
              <span
                className="text-neon-cyan"
                style={{
                  fontSize: '0.5em',
                  lineHeight: 1,
                  verticalAlign: 'baseline',
                  textShadow: '0 0 15px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.3)',
                }}
              >
                .
              </span>
              SE
            </span>
          </h1>
          <p
            className={`mt-4 font-mono text-[10px] sm:text-xs text-white/30 tracking-[0.5em] uppercase transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Can&apos;t Kill What&apos;s Already Dead
          </p>
        </div>
      </div>

      {/* ─── BOTTOM: CTA area ─── */}
      <div
        className={`pb-[6vh] pointer-events-auto transition-all duration-1000 delay-700 ${
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
