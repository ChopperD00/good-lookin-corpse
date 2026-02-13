'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * GlitchText — Kinetic typography overlay
 * Recreates GSAP SplitText/ScrambleText effects with vanilla JS + CSS
 * Text: "LIVE FAST / DIE YOUNG / and leave a / GOOD LOOKING CORPSE"
 */

const SCRAMBLE_CHARS = '■▪▌▐▬░▒▓█▄▀'
const LINES = [
  { text: 'LIVE FAST', font: 'font-display', size: 'text-5xl md:text-7xl lg:text-8xl', weight: 'font-normal' },
  { text: 'DIE YOUNG', font: 'font-display', size: 'text-5xl md:text-7xl lg:text-8xl', weight: 'font-normal' },
  { text: 'and leave a', font: 'font-sans', size: 'text-lg md:text-2xl lg:text-3xl', weight: 'font-light', italic: true },
  { text: 'GOOD LOOKING', font: 'font-drip', size: 'text-4xl md:text-6xl lg:text-7xl', weight: 'font-normal' },
  { text: 'CORPSE', font: 'font-drip', size: 'text-5xl md:text-7xl lg:text-9xl', weight: 'font-normal' },
]

interface GlitchTextProps {
  active?: boolean
  className?: string
  onComplete?: () => void
}

/** Scramble a string with random glitch chars, revealing over time */
function scrambleText(
  original: string,
  progress: number, // 0 to 1
): string {
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

function GlitchLine({
  text,
  font,
  size,
  weight,
  italic,
  delay,
  active,
}: {
  text: string
  font: string
  size: string
  weight: string
  italic?: boolean
  delay: number
  active: boolean
}) {
  const [displayText, setDisplayText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setDisplayText('')
      setRevealed(false)
      setGlitching(false)
      return
    }

    const startTime = performance.now() + delay
    const scrambleDuration = 800 // ms to fully reveal
    let cancelled = false

    function tick() {
      if (cancelled) return
      const now = performance.now()
      const elapsed = now - startTime

      if (elapsed < 0) {
        // Not started yet
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

  // Periodic micro-glitch after reveal
  useEffect(() => {
    if (!revealed || !active) return
    let cancelled = false

    function microGlitch() {
      if (cancelled) return
      const nextDelay = 2000 + Math.random() * 5000
      setTimeout(() => {
        if (cancelled) return
        setGlitching(true)
        // Brief scramble
        let frame = 0
        const maxFrames = 4 + Math.floor(Math.random() * 6)
        function glitchTick() {
          if (cancelled || frame >= maxFrames) {
            setDisplayText(text)
            setGlitching(false)
            microGlitch()
            return
          }
          // Scramble 1-3 random characters
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
  }, [revealed, active, text])

  const opacity = displayText ? 1 : 0

  return (
    <div
      className={`
        ${font} ${size} ${weight}
        ${italic ? 'italic' : ''}
        transition-opacity duration-300
        ${glitching ? 'glitch-flicker' : ''}
        tracking-wider leading-none
      `}
      style={{
        opacity,
        color: '#e5e5e5',
        textShadow: glitching
          ? '2px 0 #00ffff, -2px 0 #ff4500, 0 0 20px rgba(0,255,255,0.3)'
          : '0 0 10px rgba(229,229,229,0.15)',
        transform: glitching
          ? `translate(${(Math.random() - 0.5) * 3}px, ${(Math.random() - 0.5) * 2}px)`
          : 'none',
      }}
    >
      {displayText}
    </div>
  )
}

export default function GlitchText({ active = false, className = '', onComplete }: GlitchTextProps) {
  const completedRef = useRef(false)

  useEffect(() => {
    if (!active || completedRef.current) return
    // Total animation time: last line delay + scramble duration + buffer
    const totalMs = LINES.length * 300 + 800 + 200
    const timeout = setTimeout(() => {
      completedRef.current = true
      onComplete?.()
    }, totalMs)
    return () => clearTimeout(timeout)
  }, [active, onComplete])

  // Reset when deactivated
  useEffect(() => {
    if (!active) completedRef.current = false
  }, [active])

  return (
    <div
      className={`
        fixed inset-0 z-20 flex flex-col items-center justify-center
        pointer-events-none select-none
        ${className}
      `}
    >
      <div className="flex flex-col items-center gap-2 md:gap-3">
        {LINES.map((line, i) => (
          <GlitchLine
            key={i}
            text={line.text}
            font={line.font}
            size={line.size}
            weight={line.weight}
            italic={line.italic}
            delay={i * 300}
            active={active}
          />
        ))}
      </div>
    </div>
  )
}
