'use client'

/**
 * SceneController — Orchestrates the full landing page sequence:
 *
 * 1. TV Static preloader (2s)
 * 2. Ghost glitches onto screen (via ghost-canvas)
 * 3. Hold ghost briefly (3s)
 * 4. CRT TV-off effect
 * 5. Happy face appears (procedural particles) — 2s
 * 6. Face melts into skull — 2s
 * 7. Skull holds with glowing eyes — 3s
 * 8. Skull dissolves into particles — 2.5s
 * 9. Ghost returns, text pops + background type + CTA
 *
 * Background type ("LIVE FAST DIE YOUNG...") is large translucent text behind everything.
 * Scattered text pops ("CAN'T KILL WHAT'S ALREADY DEAD") glitch in/out with color.
 * No angel phase.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import TVStatic from './tv-static'
import CrtEffect from './crt-effect'
import BackgroundType from './background-type'
import ScatteredTextPops from './scattered-text-pops'
import CtaOverlay from './cta-overlay'

// Lazy-load heavy canvas components
const GhostCanvas = dynamic(() => import('./ghost-canvas'), { ssr: false })
const FaceSkullCanvas = dynamic(() => import('./face-skull-canvas'), { ssr: false })

type Phase =
  | 'static'        // TV static preloader
  | 'ghost-enter'   // Ghost glitches in
  | 'ghost-hold'    // Ghost visible, holding
  | 'crt-off'       // CRT turn-off transition
  | 'face'          // Happy face appears (procedural)
  | 'melt'          // Face melts into skull
  | 'skull'         // Skull holds, eyes glow
  | 'dissolve'      // Skull dissolves to particles
  | 'ghost-return'  // Ghost returns with all overlays + CTA

const GHOST_HOLD_DURATION = 3000
const STATIC_DURATION = 2000

export default function SceneController() {
  const [phase, setPhase] = useState<Phase>('static')
  const [staticOpacity, setStaticOpacity] = useState(1)
  const [ghostOpacity, setGhostOpacity] = useState(0)
  const [showCta, setShowCta] = useState(false)
  const [glitchTrigger, setGlitchTrigger] = useState(0)
  const phaseRef = useRef<Phase>('static')

  // Skull canvas phase mapping
  const faceSkullPhase = (() => {
    if (phase === 'face') return 'face' as const
    if (phase === 'melt') return 'melt' as const
    if (phase === 'skull') return 'skull' as const
    if (phase === 'dissolve') return 'dissolve' as const
    return 'idle' as const
  })()

  // Keep ref in sync
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ─── Phase: STATIC ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'static') return
    const timer = setTimeout(() => setPhase('ghost-enter'), STATIC_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: GHOST ENTER ─────────────────────────────────
  const handleGhostReady = useCallback(() => {
    if (phaseRef.current !== 'ghost-enter') return
    setStaticOpacity(0)
    setGhostOpacity(1)
    setTimeout(() => {
      if (phaseRef.current === 'ghost-enter') {
        setPhase('ghost-hold')
      }
    }, 1000)
  }, [])

  // ─── Phase: GHOST HOLD ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'ghost-hold') return
    const timer = setTimeout(() => setPhase('crt-off'), GHOST_HOLD_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  // ─── Phase: CRT OFF → FACE ─────────────────────────────
  const handleCrtComplete = useCallback(() => {
    setGhostOpacity(0)
    setPhase('face')
  }, [])

  // ─── Face/Skull phase transitions ───────────────────────
  const handleFaceSkullComplete = useCallback((completedPhase: string) => {
    if (completedPhase === 'face') setPhase('melt')
    else if (completedPhase === 'melt') setPhase('skull')
    else if (completedPhase === 'skull') setPhase('dissolve')
    else if (completedPhase === 'dissolve') setPhase('ghost-return')
  }, [])

  // ─── Phase: GHOST RETURN ────────────────────────────────
  useEffect(() => {
    if (phase !== 'ghost-return') return

    setGhostOpacity(1)
    setStaticOpacity(0.08) // Subtle static texture

    const ctaTimer = setTimeout(() => setShowCta(true), 1500)

    return () => {
      clearTimeout(ctaTimer)
    }
  }, [phase])

  // Determine what's shown
  const showGhost = phase === 'ghost-enter' || phase === 'ghost-hold' || phase === 'crt-off' || phase === 'ghost-return'
  const showFaceSkull = phase === 'face' || phase === 'melt' || phase === 'skull' || phase === 'dissolve'
  const showBgType = phase === 'ghost-return'
  const showTextPops = phase === 'ghost-return'

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      {/* TV Static — always rendered, opacity controlled */}
      <TVStatic
        active={phase === 'static' || staticOpacity > 0}
        opacity={staticOpacity}
        intensity={phase === 'static' ? 1 : 0.5}
      />

      {/* Background type — large translucent "LIVE FAST DIE YOUNG..." */}
      <BackgroundType active={showBgType} />

      {/* Scattered text pops — "CAN'T KILL WHAT'S ALREADY DEAD" etc. */}
      <ScatteredTextPops active={showTextPops} />

      {/* Ghost Canvas */}
      {showGhost && (
        <div
          className="fixed inset-0 z-10 transition-opacity duration-1000"
          style={{ opacity: ghostOpacity }}
        >
          <GhostCanvas
            onReady={handleGhostReady}
            glitchTrigger={glitchTrigger}
            gMorphEnabled={phase === 'ghost-return'}
          />
        </div>
      )}

      {/* CRT TV-off effect */}
      <CrtEffect
        active={phase === 'crt-off'}
        onComplete={handleCrtComplete}
      />

      {/* Face → Skull procedural canvas */}
      {showFaceSkull && (
        <FaceSkullCanvas
          phase={faceSkullPhase}
          onPhaseComplete={handleFaceSkullComplete}
        />
      )}

      {/* CTA Overlay */}
      <CtaOverlay isVisible={showCta} />
    </main>
  )
}