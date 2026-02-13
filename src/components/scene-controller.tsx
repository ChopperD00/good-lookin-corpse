'use client'

/**
 * SceneController — Orchestrates the full landing page sequence:
 *
 * 1. TV Static preloader (1-2s)
 * 2. Ghost glitches onto screen (via ghost-canvas)
 * 3. Hold ghost for 3-5 seconds
 * 4. CRT TV-off effect
 * 5. Angel particles form from "GOOD LOOKIN CORPSE" text (audio-reactive)
 * 6. Ghost returns with glitch text overlay, flies through angels
 *
 * Each phase is driven by a state machine.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import TVStatic from './tv-static'
import CrtEffect from './crt-effect'
import GlitchText from './glitch-text'
import CtaOverlay from './cta-overlay'
import type { AudioBands } from '@/lib/audio-analyzer'

// Lazy-load heavy Three.js components
const GhostCanvas = dynamic(() => import('./ghost-canvas'), { ssr: false })
const AngelCanvas = dynamic(() => import('./angel-canvas'), { ssr: false })

type Phase =
  | 'static'        // TV static preloader
  | 'ghost-enter'   // Ghost glitches in
  | 'ghost-hold'    // Ghost visible, holding
  | 'crt-off'       // CRT turn-off transition
  | 'angel'         // Angel particles form from text (audio-reactive)
  | 'ghost-return'  // Ghost returns with glitch text

const GHOST_HOLD_DURATION = 4000 // 4 seconds
const STATIC_DURATION = 2000     // 2 seconds initial static
const ANGEL_DURATION = 12000     // 12 seconds of angel particles before ghost returns

export default function SceneController() {
  const [phase, setPhase] = useState<Phase>('static')
  const [staticOpacity, setStaticOpacity] = useState(1)
  const [ghostOpacity, setGhostOpacity] = useState(0)
  const [angelOpacity, setAngelOpacity] = useState(0)
  const [showCta, setShowCta] = useState(false)
  const [audioBands, setAudioBands] = useState<AudioBands>({ bass: 0, mid: 0, high: 0, overall: 0 })
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number }>({ x: -1, y: -1 })
  const audioRef = useRef<any>(null)
  const phaseRef = useRef<Phase>('static')

  // Keep ref in sync
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ─── Phase: STATIC ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'static') return
    const timer = setTimeout(() => {
      setPhase('ghost-enter')
    }, STATIC_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: GHOST ENTER ─────────────────────────────────
  const handleGhostReady = useCallback(() => {
    if (phaseRef.current !== 'ghost-enter') return
    // Fade out static, fade in ghost
    setStaticOpacity(0)
    setGhostOpacity(1)
    // After ghost is visible, hold it
    setTimeout(() => {
      if (phaseRef.current === 'ghost-enter') {
        setPhase('ghost-hold')
      }
    }, 1000)
  }, [])

  // ─── Phase: GHOST HOLD ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'ghost-hold') return
    const timer = setTimeout(() => {
      setPhase('crt-off')
    }, GHOST_HOLD_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: CRT OFF ─────────────────────────────────────
  const handleCrtComplete = useCallback(() => {
    setGhostOpacity(0)
    setPhase('angel')
  }, [])

  // ─── Phase: ANGEL ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'angel') return

    // Initialize audio analyzer for microphone reactivity
    async function initAudio() {
      try {
        const { AudioAnalyzer } = await import('@/lib/audio-analyzer')
        const analyzer = new AudioAnalyzer()
        const ok = await analyzer.init()
        if (ok) {
          audioRef.current = analyzer
          function pollAudio() {
            if (phaseRef.current !== 'angel' && phaseRef.current !== 'ghost-return') {
              return
            }
            if (audioRef.current?.isActive) {
              setAudioBands(audioRef.current.getBands())
            }
            requestAnimationFrame(pollAudio)
          }
          requestAnimationFrame(pollAudio)
        }
      } catch {
        // Audio not available — angels still work without it
      }
    }

    // Fade in angel particles
    setAngelOpacity(1)
    // Keep a good amount of static as background texture
    setStaticOpacity(0.12)

    initAudio()

    // After angel duration, transition to ghost return
    const timer = setTimeout(() => {
      setPhase('ghost-return')
    }, ANGEL_DURATION)

    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: GHOST RETURN ────────────────────────────────
  useEffect(() => {
    if (phase !== 'ghost-return') return

    // Dim angel particles so glitch text is readable
    setAngelOpacity(0.35)
    setGhostOpacity(1)
    // Keep visible static in the background
    setStaticOpacity(0.10)

    // Show CTA after glitch text completes
    const ctaTimer = setTimeout(() => {
      setShowCta(true)
    }, 3000)

    // Simulate ghost flying across screen for angel interaction
    // The ghost-canvas moves the ghost — we approximate its position
    let ghostFrame = 0
    function updateGhostPos() {
      if (phaseRef.current !== 'ghost-return') return
      ghostFrame++
      // Ghost roughly moves in a sine wave pattern
      const t = ghostFrame / 120
      const gx = 0.3 + Math.sin(t * 0.7) * 0.3
      const gy = 0.4 + Math.cos(t * 0.5) * 0.2
      setGhostPosition({ x: gx, y: gy })
      requestAnimationFrame(updateGhostPos)
    }
    requestAnimationFrame(updateGhostPos)

    return () => clearTimeout(ctaTimer)
  }, [phase])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.destroy()
    }
  }, [])

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      {/* TV Static — always rendered, opacity controlled */}
      <TVStatic
        active={phase === 'static' || staticOpacity > 0}
        opacity={staticOpacity}
        intensity={phase === 'static' ? 1 : 0.5}
      />

      {/* Ghost Canvas — rendered when needed */}
      {(phase === 'ghost-enter' || phase === 'ghost-hold' || phase === 'crt-off' || phase === 'ghost-return') && (
        <div
          className="fixed inset-0 z-10 transition-opacity duration-1000"
          style={{ opacity: ghostOpacity }}
        >
          <GhostCanvas onReady={handleGhostReady} />
        </div>
      )}

      {/* CRT TV-off effect */}
      <CrtEffect
        active={phase === 'crt-off'}
        onComplete={handleCrtComplete}
      />

      {/* Angel Particle Canvas — persists through ghost-return for interaction */}
      {(phase === 'angel' || phase === 'ghost-return') && (
        <div
          className="fixed inset-0 z-10 transition-opacity duration-1500"
          style={{ opacity: angelOpacity }}
        >
          <AngelCanvas
            audioBands={audioBands}
            opacity={angelOpacity}
            ghostPosition={phase === 'ghost-return' ? ghostPosition : undefined}
          />
        </div>
      )}

      {/* Glitch Text Overlay — appears during ghost return */}
      <GlitchText active={phase === 'ghost-return'} />

      {/* CTA Overlay */}
      <CtaOverlay isVisible={showCta} />
    </main>
  )
}
