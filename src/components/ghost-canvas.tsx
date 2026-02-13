'use client'

import { useEffect, useRef, useCallback } from 'react'

interface GhostCanvasProps { onReady: () => void }

export default function GhostCanvas({ onReady }: GhostCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<any>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (sceneRef.current) {
      sceneRef.current.setMouse((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (sceneRef.current && e.touches.length > 0) {
      const t = e.touches[0]
      sceneRef.current.setMouse((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1)
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    let destroyed = false
    async function initScene() {
      const { GhostScene } = await import('@/lib/ghost-scene')
      if (destroyed || !canvasRef.current) return
      const scene = new GhostScene(canvasRef.current, onReady)
      sceneRef.current = scene
      scene.animate(0)
      scene.setMouse(0, 0)
    }
    initScene()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    const handleResize = () => sceneRef.current?.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => {
      destroyed = true
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', handleResize)
      sceneRef.current?.destroy()
    }
  }, [onReady, handleMouseMove, handleTouchMove])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0" style={{ background: 'transparent' }} />
}
