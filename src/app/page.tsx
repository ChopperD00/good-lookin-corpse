'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Preloader from '@/components/preloader'
import CtaOverlay from '@/components/cta-overlay'
import MobileFallback from '@/components/mobile-fallback'

const GhostCanvas = dynamic(() => import('@/components/ghost-canvas'), { ssr: false })

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [sceneReady, setSceneReady] = useState(false)
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null)

  useEffect(() => {
    async function detect() {
      const { detectWebGLSupport } = await import('@/lib/ghost-scene')
      setSupportsWebGL(detectWebGLSupport())
    }
    detect()
  }, [])

  const handleSceneReady = useCallback(() => {
    setSceneReady(true)
    setTimeout(() => setIsLoading(false), 1500)
  }, [])

  if (supportsWebGL === null) return <Preloader isLoading={true} />

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      <Preloader isLoading={isLoading} />
      {supportsWebGL ? (
        <GhostCanvas onReady={handleSceneReady} />
      ) : (
        <>
          <MobileFallback />
          {isLoading && <FallbackReady onReady={() => { setSceneReady(true); setTimeout(() => setIsLoading(false), 800) }} />}
        </>
      )}
      <CtaOverlay isVisible={sceneReady && !isLoading} />
    </main>
  )
}

function FallbackReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onReady, 500)
    return () => clearTimeout(timer)
  }, [onReady])
  return null
}
