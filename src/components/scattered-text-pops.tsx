'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * ScatteredTextPops — Words from "Can't Kill What's Already Dead"
 * appear as tiny pops of color, glitching in and out at random positions.
 * Like the small peripheral text in the reference screenshot
 * (BE PRESENT, LISTEN DEEPLY, OBSERVE, etc.)
 */

interface ScatteredTextPopsProps {
  active: boolean
}

const WORDS = [
  "CAN'T", 'KILL', "WHAT'S", 'ALREADY', 'DEAD',
  'VEIL', 'OF', 'DUST', 'TRAIL', 'ASH',
  'HEART', 'ICE', 'LIVE', 'FAST', 'DIE',
]

const COLORS = [
  '#00ffff',   // cyan
  '#ff4500',   // orange-red
  '#ffb935',   // gold
  '#ff867f',   // coral pink
  '#c084fc',   // purple
  '#34d399',   // emerald
  '#f472b6',   // pink
  '#fbbf24',   // amber
  '#60a5fa',   // blue
]

interface TextPop {
  id: number
  word: string
  x: number
  y: number
  color: string
  size: number
  rotation: number
  opacity: number
  phase: 'in' | 'hold' | 'out' | 'dead'
}

export default function ScatteredTextPops({ active }: ScatteredTextPopsProps) {
  const [pops, setPops] = useState<TextPop[]>([])
  const idRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(active)

  activeRef.current = active

  const spawnPop = useCallback(() => {
    if (!activeRef.current) return

    const word = WORDS[Math.floor(Math.random() * WORDS.length)]
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]

    const pop: TextPop = {
      id: idRef.current++,
      word,
      x: 5 + Math.random() * 85,  // 5-90% from left
      y: 5 + Math.random() * 85,  // 5-90% from top
      color,
      size: 9 + Math.random() * 5, // 9-14px
      rotation: (Math.random() - 0.5) * 20,
      opacity: 0,
      phase: 'in',
    }

    setPops(prev => {
      // Keep max 8 active pops
      const alive = prev.filter(p => p.phase !== 'dead').slice(-7)
      return [...alive, pop]
    })

    // Fade in
    requestAnimationFrame(() => {
      setPops(prev => prev.map(p =>
        p.id === pop.id ? { ...p, opacity: 0.6 + Math.random() * 0.3, phase: 'hold' } : p
      ))
    })

    // Hold then fade out
    const holdTime = 400 + Math.random() * 1200
    setTimeout(() => {
      setPops(prev => prev.map(p =>
        p.id === pop.id ? { ...p, opacity: 0, phase: 'out' } : p
      ))
      // Mark dead after fade
      setTimeout(() => {
        setPops(prev => prev.map(p =>
          p.id === pop.id ? { ...p, phase: 'dead' } : p
        ))
      }, 300)
    }, holdTime)

    // Schedule next pop
    const nextDelay = 150 + Math.random() * 600
    timerRef.current = setTimeout(spawnPop, nextDelay)
  }, [])

  useEffect(() => {
    if (active) {
      // Start spawning after a small delay
      timerRef.current = setTimeout(spawnPop, 500)
    } else {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPops([])
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, spawnPop])

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none select-none overflow-hidden">
      {pops.map(pop => (
        <span
          key={pop.id}
          className="absolute font-casket uppercase tracking-[0.3em] whitespace-nowrap"
          style={{
            left: `${pop.x}%`,
            top: `${pop.y}%`,
            fontSize: `${pop.size}px`,
            color: pop.color,
            opacity: pop.opacity,
            transform: `rotate(${pop.rotation}deg) translate(-50%, -50%)`,
            transition: 'opacity 0.25s ease',
            textShadow: `0 0 8px ${pop.color}40, 0 0 20px ${pop.color}20`,
            // Occasional glitch offset
            filter: Math.random() > 0.7 ? `blur(${Math.random() * 0.5}px)` : 'none',
          }}
        >
          {pop.word}
        </span>
      ))}
    </div>
  )
}