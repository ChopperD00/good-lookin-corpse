'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import MobileFallback from '@/components/mobile-fallback'

// Lazy-load the scene controller — no SSR (Three.js)
const SceneController = dynamic(() => import('@/components/scene-controller'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black" />
  ),
})

export default function Home() {
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null)

  useEffect(() => {
    async function detect() {
      const { detectWebGLSupport } = await import('@/lib/ghost-scene')
      setSupportsWebGL(detectWebGLSupport())
    }
    detect()
  }, [])

  // Still detecting
  if (supportsWebGL === null) {
    return <div className="fixed inset-0 bg-black" />
  }

  if (!supportsWebGL) {
    return (
      <main className="relative w-full h-screen overflow-hidden bg-black">
        <MobileFallback />
      </main>
    )
  }

  return <SceneController />
}
