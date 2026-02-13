'use client'

/**
 * SceneController — Orchestrates the full landing page sequence:
 *
 * 1. TV Static preloader (1-2s)
 * 2. Ghost glitches onto screen (via ghost-canvas)
 * 3. Hold ghost for 3-5 seconds
 * 4. CRT TV-off effect
 * 5. Skull particles appear (audio-reactive)
 * 6. Ghost returns with glitch text overlay
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
const SkullCanvas = dynamic(() => import('./skull-canvas'), { ssr: false })

type Phase =
  | 'static'        // TV static preloader
  | 'ghost-enter'   // Ghost glitches in
  | 'ghost-hold'    // Ghost visible, holding
  | 'crt-off'       // CRT turn-off transition
  | 'skull'         // Skull particles (audio-reactive)
  | 'ghost-return'  // Ghost returns with glitch text

const GHOST_HOLD_DURATION = 4000 // 4 seconds
const STATIC_DURATION = 2000     // 2 seconds initial static
const SKULL_DURATION = 12000     // 12 seconds of skull particles before ghost returns

export default function SceneController() {
  const [phase, setPhase] = useState<Phase>('static')
  const [staticOpacity, setStaticOpacity] = useState(1)
  const [ghostOpacity, setGhostOpacity] = useState(0)
  const [skullOpacity, setSkullOpacity] = useState(0)
  const [showCta, setShowCta] = useState(false)
  const [audioBands, setAudioBands] = useState<AudioBands>({ bass: 0, mid: 0, high: 0, overall: 0 })
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
    setPhase('skull')
  }, [])

  // ─── Phase: SKULL ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'skull') return

    // Initialize audio analyzer for microphone reactivity
    async function initAudio() {
      try {
        const { AudioAnalyzer } = await import('@/lib/audio-analyzer')
        const analyzer = new AudioAnalyzer()
        const ok = await analyzer.init()
        if (ok) {
          audioRef.current = analyzer
          // Poll audio bands
          function pollAudio() {
            if (phaseRef.current !== 'skull' && phaseRef.current !== 'ghost-return') {
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
        // Audio not available — skull still works without it
      }
    }

    // Fade in skull particles
    setSkullOpacity(1)
    // Add some static back as texture
    setStaticOpacity(0.08)

    initAudio()

    // After skull duration, transition to ghost return
    const timer = setTimeout(() => {
      setPhase('ghost-return')
    }, SKULL_DURATION)

    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: GHOST RETURN ────────────────────────────────
  useEffect(() => {
    if (phase !== 'ghost-return') return

    // Cross-fade: skull out, ghost + glitch text in
    setSkullOpacity(0)
    setGhostOpacity(1)
    setStaticOpacity(0.04)

    // Show CTA after glitch text completes
    const ctaTimer = setTimeout(() => {
      setShowCta(true)
    }, 3000)

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

      {/* Skull Particle Canvas */}
      {(phase === 'skull' || (phase === 'ghost-return' && skullOpacity > 0)) && (
        <div
          className="fixed inset-0 z-10 transition-opacity duration-1500"
          style={{ opacity: skullOpacity }}
        >
          <SkullCanvas audioBands={audioBands} opacity={skullOpacity} />
        </div>
      )}

      {/* Glitch Text Overlay — appears during ghost return */}
      <GlitchText active={phase === 'ghost-return'} />

      {/* CTA Overlay */}
      <CtaOverlay isVisible={showCta} />
    </main>
  )
}
