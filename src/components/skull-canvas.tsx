'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { AudioBands } from '@/lib/audio-analyzer'

interface SkullCanvasProps {
  audioBands?: AudioBands
  opacity?: number
  className?: string
}

export default function SkullCanvas({ audioBands, opacity = 1, className = '' }: SkullCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<any>(null)
  const rafRef = useRef<number>(0)

  // Initialize scene
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let destroyed = false

    async function setup() {
      const { SkullScene } = await import('@/lib/skull-scene')
      if (destroyed) return

      const scene = new SkullScene()
      await scene.init(canvas!, '/images/skull.jpg')
      if (destroyed) {
        scene.destroy()
        return
      }
      sceneRef.current = scene

      // Animation loop
      function animate() {
        if (destroyed) return
        scene.render()
        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    setup().catch(console.error)

    return () => {
      destroyed = true
      cancelAnimationFrame(rafRef.current)
      if (sceneRef.current) {
        sceneRef.current.destroy()
        sceneRef.current = null
      }
    }
  }, [])

  // Update audio bands
  useEffect(() => {
    if (sceneRef.current && audioBands) {
      sceneRef.current.setAudioBands(audioBands)
    }
  }, [audioBands])

  // Update opacity
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.opacity = opacity
    }
  }, [opacity])

  // Mouse handling
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const scene = sceneRef.current
    if (!canvas || !scene) return
    const bounds = canvas.getBoundingClientRect()
    scene.setMouseFromScreen(e.clientX, e.clientY, bounds)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const scene = sceneRef.current
    if (!canvas || !scene) return
    const touch = e.touches[0]
    const bounds = canvas.getBoundingClientRect()
    scene.setMouseFromScreen(touch.clientX, touch.clientY, bounds)
  }, [])

  // Resize handling
  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current
      const scene = sceneRef.current
      if (!canvas || !scene) return
      scene.resize(canvas.clientWidth, canvas.clientHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ opacity }}
    />
  )
}
