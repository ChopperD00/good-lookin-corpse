'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * BackgroundType — Large semi-translucent block text behind everything.
 * Like the FOCUS / PRESENCE / FEEL in the reference screenshot.
 * "LIVE FAST", "DIE YOUNG", "and leave a" scattered at different positions
 * and sizes across the viewport, very low opacity, coffin font.
 */

interface BackgroundTypeProps {
  active: boolean
  /** 0-1, controls overall opacity */
  intensity?: number
}

const WORDS = [
  { text: 'LIVE', x: 5, y: 12, size: 'clamp(6rem, 22vw, 18rem)', rotate: -2 },
  { text: 'FAST', x: 45, y: 8, size: 'clamp(5rem, 18vw, 14rem)', rotate: 1 },
  { text: 'DIE', x: 15, y: 38, size: 'clamp(7rem, 26vw, 22rem)', rotate: -1 },
  { text: 'YOUNG', x: 40, y: 42, size: 'clamp(5rem, 16vw, 13rem)', rotate: 2 },
  { text: 'AND', x: 65, y: 22, size: 'clamp(3rem, 10vw, 8rem)', rotate: -3 },
  { text: 'LEAVE', x: 10, y: 68, size: 'clamp(5rem, 20vw, 16rem)', rotate: 1.5 },
  { text: 'A', x: 70, y: 60, size: 'clamp(8rem, 28vw, 24rem)', rotate: -1 },
  { text: 'GOOD', x: 25, y: 82, size: 'clamp(4rem, 14vw, 11rem)', rotate: 2 },
  { text: 'LOOKIN', x: 55, y: 78, size: 'clamp(3.5rem, 12vw, 10rem)', rotate: -2 },
  { text: 'CORPSE', x: 5, y: 92, size: 'clamp(4rem, 15vw, 12rem)', rotate: 0.5 },
]

export default function BackgroundType({ active, intensity = 1 }: BackgroundTypeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      // Stagger in
      const timer = setTimeout(() => setVisible(true), 200)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [active])

  const baseOpacity = 0.04 * intensity

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 2s ease',
      }}
    >
      {WORDS.map((word, i) => (
        <div
          key={i}
          className="absolute font-casket uppercase leading-none whitespace-nowrap"
          style={{
            left: `${word.x}%`,
            top: `${word.y}%`,
            fontSize: word.size,
            transform: `rotate(${word.rotate}deg)`,
            opacity: baseOpacity,
            color: '#f5f5f5',
            // Subtle drift animation per word
            animation: `bgTypeDrift ${8 + i * 1.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.7}s`,
          }}
        >
          {word.text}
        </div>
      ))}
    </div>
  )
}