'use client'

import { useEffect, useRef } from 'react'

/**
 * TVStatic — Full-screen canvas noise that looks like analog TV static
 * Used as preloader and transition effect
 */

interface TVStaticProps {
  active?: boolean
  opacity?: number
  intensity?: number  // 0-1, controls noise density
  className?: string
}

export default function TVStatic({
  active = true,
  opacity = 1,
  intensity = 1,
  className = '',
}: TVStaticProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let running = true

    function resize() {
      if (!canvas) return
      // Render at reduced resolution for performance, stretch via CSS
      canvas.width = Math.floor(window.innerWidth / 3)
      canvas.height = Math.floor(window.innerHeight / 3)
    }
    resize()
    window.addEventListener('resize', resize)

    function drawNoise() {
      if (!running || !ctx || !canvas) return

      const w = canvas.width
      const h = canvas.height
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        // Random noise value
        const v = Math.random() * 255

        // Scanline darkening
        const y = Math.floor((i / 4) / w)
        const scanline = y % 3 === 0 ? 0.7 : 1.0

        // Occasional horizontal tear
        const tear = Math.random() > 0.997 ? (Math.random() * 60 - 30) : 0

        const pixel = Math.floor(v * scanline * intensity)
        data[i] = Math.min(255, pixel + tear)     // R
        data[i + 1] = Math.min(255, pixel + tear)  // G
        data[i + 2] = Math.min(255, pixel + tear)  // B
        data[i + 3] = 255                           // A
      }

      // Occasional horizontal static band
      if (Math.random() > 0.93) {
        const bandY = Math.floor(Math.random() * h)
        const bandH = 1 + Math.floor(Math.random() * 4)
        for (let y = bandY; y < Math.min(h, bandY + bandH); y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4
            data[idx] = 200 + Math.floor(Math.random() * 55)
            data[idx + 1] = 200 + Math.floor(Math.random() * 55)
            data[idx + 2] = 200 + Math.floor(Math.random() * 55)
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)
      rafRef.current = requestAnimationFrame(drawNoise)
    }

    rafRef.current = requestAnimationFrame(drawNoise)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [active, intensity])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full z-50 pointer-events-none ${className}`}
      style={{
        opacity,
        imageRendering: 'pixelated',
        mixBlendMode: 'screen',
      }}
    />
  )
}
