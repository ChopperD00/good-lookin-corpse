'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

/**
 * GlitchText — Kinetic typography overlay
 * Inspired by GSAP SplitText/ScrambleText CodePen with:
 * - Character-level splitting with mask containers
 * - Kinetic type background (large repeated text rotating/sliding)
 * - Scramble reveal for each line
 * - Character expansion with inner offset on micro-glitches
 *
 * Text: "LIVE FAST / DIE YOUNG / and leave a"
 */

const SCRAMBLE_CHARS = '■▪▌▐▬░▒▓█▄▀'
const LINES = [
  { text: 'LIVE FAST', font: 'font-casket', size: 'text-5xl md:text-7xl lg:text-8xl', weight: 'font-normal' },
  { text: 'DIE YOUNG', font: 'font-casket', size: 'text-5xl md:text-7xl lg:text-8xl', weight: 'font-normal' },
  { text: 'and leave a', font: 'font-casket-drip', size: 'text-4xl md:text-6xl lg:text-7xl', weight: 'font-normal' },
]

// Kinetic type: repeated text lines for the background animation
const KINETIC_WORDS = ['LIVE FAST', 'DIE YOUNG', 'GOOD LOOKIN', 'CORPSE']

interface GlitchTextProps {
  active?: boolean
  className?: string
  onComplete?: () => void
  onGlitch?: () => void
}

/** Scramble a string with random glitch chars, revealing over time */
function scrambleText(original: string, progress: number): string {
  const len = original.length
  const revealedCount = Math.floor(progress * len)
  let result = ''
  for (let i = 0; i < len; i++) {
    if (original[i] === ' ') {
      result += ' '
    } else if (i < revealedCount) {
      result += original[i]
    } else {
      result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    }
  }
  return result
}

/** Individual character with split-mask container */
function SplitChar({
  char,
  index,
  revealed,
  expanded,
}: {
  char: string
  index: number
  revealed: boolean
  expanded: boolean
}) {
  if (char === ' ') {
    return <span className="inline-block w-[0.3em]">&nbsp;</span>
  }

  return (
    <span
      className={`split-char ${expanded ? 'expanded' : ''}`}
      style={{
        maxWidth: expanded ? '1.4em' : '0.75em',
        animationDelay: `${index * 0.05}s`,
        opacity: revealed ? 1 : 0,
        transition: `max-width 0.6s cubic-bezier(0.86, 0, 0.07, 1), opacity 0.15s ease ${index * 0.03}s`,
      }}
    >
      <span className="split-char-inner">{char}</span>
    </span>
  )
}

function GlitchLine({
  text,
  font,
  size,
  weight,
  delay,
  active,
  onGlitch,
}: {
  text: string
  font: string
  size: string
  weight: string
  delay: number
  active: boolean
  onGlitch?: () => void
}) {
  const [displayText, setDisplayText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const rafRef = useRef<number>(0)

  // Scramble reveal phase
  useEffect(() => {
    if (!active) {
      setDisplayText('')
      setRevealed(false)
      setGlitching(false)
      setExpanded(false)
      return
    }

    const startTime = performance.now() + delay
    const scrambleDuration = 800
    let cancelled = false

    function tick() {
      if (cancelled) return
      const now = performance.now()
      const elapsed = now - startTime

      if (elapsed < 0) {
        setDisplayText('')
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const progress = Math.min(1, elapsed / scrambleDuration)
      setDisplayText(scrambleText(text, progress))
      setGlitching(progress < 1)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayText(text)
        setRevealed(true)
        setGlitching(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, text, delay])

  // Periodic micro-glitch with character expansion (like CodePen hover effect)
  useEffect(() => {
    if (!revealed || !active) return
    let cancelled = false

    function microGlitch() {
      if (cancelled) return
      const nextDelay = 2000 + Math.random() * 5000
      setTimeout(() => {
        if (cancelled) return
        setGlitching(true)
        setExpanded(true) // Expand characters like CodePen hover
        onGlitch?.()

        let frame = 0
        const maxFrames = 4 + Math.floor(Math.random() * 6)
        function glitchTick() {
          if (cancelled || frame >= maxFrames) {
            setDisplayText(text)
            setGlitching(false)
            // Hold expansion briefly then collapse
            setTimeout(() => {
              if (!cancelled) setExpanded(false)
            }, 300 + Math.random() * 500)
            microGlitch()
            return
          }
          const chars = text.split('')
          const numGlitch = 1 + Math.floor(Math.random() * 3)
          for (let n = 0; n < numGlitch; n++) {
            const idx = Math.floor(Math.random() * chars.length)
            if (chars[idx] !== ' ') {
              chars[idx] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
            }
          }
          setDisplayText(chars.join(''))
          frame++
          requestAnimationFrame(glitchTick)
        }
        requestAnimationFrame(glitchTick)
      }, nextDelay)
    }

    microGlitch()
    return () => { cancelled = true }
  }, [revealed, active, text, onGlitch])

  const opacity = displayText ? 0.85 : 0
  const chars = displayText.split('')

  return (
    <div
      className={`
        ${font} ${size} ${weight}
        transition-opacity duration-300
        ${glitching ? 'glitch-flicker' : ''}
        tracking-wider leading-none
        flex items-center justify-center
      `}
      style={{
        opacity,
        color: '#e5e5e5',
        textShadow: glitching
          ? '2px 0 rgba(0,255,255,0.5), -2px 0 rgba(255,69,0,0.5), 0 0 40px rgba(0,255,255,0.15)'
          : '0 0 30px rgba(229,229,229,0.1)',
        transform: glitching
          ? `translate(${(Math.random() - 0.5) * 3}px, ${(Math.random() - 0.5) * 2}px)`
          : 'none',
      }}
    >
      {revealed ? (
        // Split characters with mask containers after reveal
        chars.map((c, i) => (
          <SplitChar key={i} char={c} index={i} revealed expanded={expanded} />
        ))
      ) : (
        // Plain scramble text during reveal
        displayText
      )}
    </div>
  )
}

/** Kinetic type background — large repeated text rotating and sliding */
function KineticBackground({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const startRef = useRef(0)

  // Generate lines
  const lines = useMemo(() => {
    const result: { text: string; isOdd: boolean }[] = []
    for (let i = 0; i < 12; i++) {
      const word = KINETIC_WORDS[i % KINETIC_WORDS.length]
      const repeated = `${word} ${word} ${word}`
      result.push({ text: repeated, isOdd: i % 2 === 0 })
    }
    return result
  }, [])

  useEffect(() => {
    if (!active || !containerRef.current) return
    startRef.current = performance.now()
    let cancelled = false

    function animate() {
      if (cancelled || !containerRef.current) return
      const elapsed = (performance.now() - startRef.current) / 1000
      const children = containerRef.current.children as HTMLCollectionOf<HTMLElement>

      // Animate: rotate container, slide lines opposite directions
      const rotation = -90 * Math.min(1, elapsed / 1.4) // 1.4s to -90°
      const scale = 1 + 1.7 * Math.min(1, elapsed / 1.4) // scale to 2.7
      containerRef.current.style.transform = `rotate(${rotation}deg) scale(${scale})`

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const isOdd = i % 2 === 0
        const staggerDelay = i * 0.08

        // Keyframe 1: slide 20% (0-1s), then slide -200% (1-2.5s)
        const t = Math.max(0, elapsed - staggerDelay)
        let xPercent = 0
        if (t < 1) {
          xPercent = (isOdd ? 20 : -20) * Math.min(1, t / 1)
        } else {
          const t2 = Math.min(1, (t - 1) / 1.5)
          const ease = t2 * t2 * (3 - 2 * t2) // smoothstep
          xPercent = isOdd
            ? 20 + (-220) * ease
            : -20 + (220) * ease
        }

        // Opacity: 0→1 (0-1s), 1→0 (1-2.5s)
        let lineOpacity = 0.04
        if (t < 1) {
          lineOpacity = 0.04 + 0.96 * Math.min(1, t / 1)
        } else {
          const t2 = Math.min(1, (t - 1) / 1.5)
          lineOpacity = 1 - t2
        }

        child.style.transform = `translateX(${xPercent}%)`
        child.style.opacity = String(lineOpacity * 0.08) // keep subtle
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      cancelled = true
      cancelAnimationFrame(animRef.current)
    }
  }, [active])

  // Reset when deactivated
  useEffect(() => {
    if (!active && containerRef.current) {
      containerRef.current.style.transform = 'rotate(0deg) scale(1)'
      const children = containerRef.current.children as HTMLCollectionOf<HTMLElement>
      for (let i = 0; i < children.length; i++) {
        children[i].style.transform = 'translateX(0%)'
        children[i].style.opacity = '0.04'
      }
    }
  }, [active])

  return (
    <div
      ref={containerRef}
      className={`kinetic-type ${active ? 'active' : ''}`}
    >
      {lines.map((line, i) => (
        <div key={i} className="kinetic-line">
          {line.text}
        </div>
      ))}
    </div>
  )
}

export default function GlitchText({ active = false, className = '', onComplete, onGlitch }: GlitchTextProps) {
  const completedRef = useRef(false)
  const [kineticActive, setKineticActive] = useState(false)

  useEffect(() => {
    if (!active || completedRef.current) return
    const totalMs = LINES.length * 300 + 800 + 200
    const timeout = setTimeout(() => {
      completedRef.current = true
      onComplete?.()
    }, totalMs)

    // Start kinetic background shortly after text begins revealing
    const kineticTimer = setTimeout(() => {
      setKineticActive(true)
    }, 400)

    return () => {
      clearTimeout(timeout)
      clearTimeout(kineticTimer)
    }
  }, [active, onComplete])

  // Reset when deactivated
  useEffect(() => {
    if (!active) {
      completedRef.current = false
      setKineticActive(false)
    }
  }, [active])

  return (
    <>
      {/* Kinetic type background layer */}
      <KineticBackground active={active && kineticActive} />

      {/* Main text overlay */}
      <div
        className={`
          fixed inset-0 z-20 flex flex-col items-center justify-center
          pointer-events-none select-none -translate-y-[5vh]
          ${className}
        `}
      >
        <div className="relative flex flex-col items-center gap-2 md:gap-3">
          {LINES.map((line, i) => (
            <GlitchLine
              key={i}
              text={line.text}
              font={line.font}
              size={line.size}
              weight={line.weight}
              delay={i * 300}
              active={active}
              onGlitch={onGlitch}
            />
          ))}
        </div>
      </div>
    </>
  )
}
