'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * ValentineTeaser — Social-first teaser animation
 *
 * Sequence:
 * 1. Black + static grain (1s)
 * 2. Two skull halves slide in from edges (1.5s)
 * 3. Halves slam together — flash + shake (0.5s)
 * 4. Hold as full heart — glow pulse (2s)
 * 5. Particles erupt from the heart, swirl (2s)
 * 6. Particles settle — reveal text "02.14" and tagline (2s)
 * 7. Hidden discount code flashes in the static (blink-and-miss-it)
 * 8. Brand lockup + "Coming March 28"
 */

const DISCOUNT_CODE = 'DEADVALENTINE'
const SCRAMBLE_CHARS = '■▪▌▐▬░▒▓█▄▀'

type Phase =
  | 'intro'       // black + static
  | 'split-enter' // halves slide in
  | 'slam'        // halves collide, flash
  | 'glow'        // heart glows, pulses
  | 'particles'   // particle eruption
  | 'reveal'      // text reveal
  | 'lockup'      // brand lockup + CTA

export default function ValentineTeaser() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [shakeClass, setShakeClass] = useState('')
  const [codeFlash, setCodeFlash] = useState(false)
  const [particleData, setParticleData] = useState<Array<{
    x: number; y: number; vx: number; vy: number; size: number; color: string; delay: number
  }>>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate particles on mount
  useEffect(() => {
    const colors = ['#ff66a4', '#ff9ec9', '#ffbd6b', '#a54d8f', '#732a6c', '#fff', '#00ffff']
    const particles = Array.from({ length: 60 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.5
      const speed = 2 + Math.random() * 4
      return {
        x: 50 + (Math.random() - 0.5) * 10,
        y: 45 + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.4,
      }
    })
    setParticleData(particles)
  }, [])

  // ─── Phase sequencer ─────────────────────────────────────
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timers.push(id)
    }

    // Phase 1: intro static
    t(() => setPhase('split-enter'), 1000)

    // Phase 2→3: slam together
    t(() => {
      setPhase('slam')
      setShakeClass('animate-shake')
      setTimeout(() => setShakeClass(''), 500)
    }, 2800)

    // Phase 4: glow
    t(() => setPhase('glow'), 3400)

    // Flash the discount code briefly during glow
    t(() => setCodeFlash(true), 4200)
    t(() => setCodeFlash(false), 4500)

    // Phase 5: particles
    t(() => setPhase('particles'), 5500)

    // Phase 6: reveal text
    t(() => setPhase('reveal'), 7500)

    // Flash code again very briefly
    t(() => setCodeFlash(true), 8400)
    t(() => setCodeFlash(false), 8600)

    // Phase 7: lockup
    t(() => setPhase('lockup'), 9500)

    return () => timers.forEach(clearTimeout)
  }, [])

  const phaseIndex = ['intro', 'split-enter', 'slam', 'glow', 'particles', 'reveal', 'lockup'].indexOf(phase)

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen overflow-hidden bg-black ${shakeClass}`}
      style={{ fontFamily: 'var(--font-inter)' }}
    >
      {/* ─── STATIC GRAIN BACKGROUND ─── */}
      <div
        className="absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          opacity: phase === 'intro' ? 0.15 : phase === 'lockup' ? 0.03 : 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
          animation: 'grain 0.3s steps(1) infinite',
        }}
      />

      {/* ─── SKULL HEART — LEFT HALF ─── */}
      <div
        className="absolute z-10 transition-all"
        style={{
          width: '55vmin',
          height: `${(1410.55 / 1566.75) * 55}vmin`,
          left: '50%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
          clipPath: 'inset(0 50% 0 0)',
          transition: phaseIndex >= 2 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.3, 1.1)' : 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(phase === 'intro' && {
            transform: 'translate(-150%, -50%)',
            opacity: 0,
          }),
          ...(phase === 'split-enter' && {
            transform: 'translate(-70%, -50%)',
            opacity: 1,
          }),
          ...(phaseIndex >= 2 && {
            transform: 'translate(-50%, -50%)',
            opacity: 1,
          }),
        }}
      >
        <img src="/skull-heart.svg" alt="" className="w-full h-full" draggable={false} />
      </div>

      {/* ─── SKULL HEART — RIGHT HALF ─── */}
      <div
        className="absolute z-10 transition-all"
        style={{
          width: '55vmin',
          height: `${(1410.55 / 1566.75) * 55}vmin`,
          left: '50%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
          clipPath: 'inset(0 0 0 50%)',
          transition: phaseIndex >= 2 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.3, 1.1)' : 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(phase === 'intro' && {
            transform: 'translate(50%, -50%)',
            opacity: 0,
          }),
          ...(phase === 'split-enter' && {
            transform: 'translate(-30%, -50%)',
            opacity: 1,
          }),
          ...(phaseIndex >= 2 && {
            transform: 'translate(-50%, -50%)',
            opacity: 1,
          }),
        }}
      >
        <img src="/skull-heart.svg" alt="" className="w-full h-full" draggable={false} />
      </div>

      {/* ─── IMPACT FLASH ─── */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 42%, rgba(255,102,164,0.6) 0%, transparent 60%)',
          opacity: phase === 'slam' ? 1 : 0,
          transition: 'opacity 0.15s ease-out',
        }}
      />

      {/* ─── GLOW PULSE ─── */}
      {(phase === 'glow' || phase === 'particles') && (
        <div
          className="absolute z-5 pointer-events-none"
          style={{
            width: '70vmin',
            height: '70vmin',
            left: '50%',
            top: '42%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,102,164,0.25) 0%, rgba(165,77,143,0.15) 30%, transparent 65%)',
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* ─── PARTICLE ERUPTION ─── */}
      {phaseIndex >= 4 && (
        <div className="absolute inset-0 z-15 pointer-events-none">
          {particleData.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                left: `${p.x}%`,
                top: `${p.y}%`,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                animation: `particleFly ${1.5 + p.delay}s ease-out ${p.delay}s forwards`,
                '--px-vx': `${p.vx * 15}vmin`,
                '--px-vy': `${p.vy * 15}vmin`,
                opacity: phaseIndex >= 6 ? 0 : 1,
                transition: 'opacity 1s ease-out',
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ─── HIDDEN DISCOUNT CODE ─── */}
      <div
        className="absolute z-30 left-1/2 top-[72%] -translate-x-1/2 font-mono text-[10px] tracking-[0.5em] text-white/60 pointer-events-none select-none"
        style={{
          opacity: codeFlash ? 0.7 : 0,
          transition: 'opacity 0.05s',
          textShadow: '0 0 8px rgba(0,255,255,0.5)',
          filter: codeFlash ? 'none' : 'blur(4px)',
        }}
      >
        USE CODE: {DISCOUNT_CODE}
      </div>

      {/* ─── DATE REVEAL ─── */}
      <div
        className="absolute z-20 left-1/2 top-[72%] -translate-x-1/2 text-center pointer-events-none"
        style={{
          opacity: phaseIndex >= 5 && !codeFlash ? 1 : 0,
          transform: `translate(-50%, 0) translateY(${phaseIndex >= 5 ? 0 : 20}px)`,
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="font-display text-4xl md:text-6xl tracking-tight text-spectral"
          style={{
            textShadow: '0 0 30px rgba(255,102,164,0.4), 0 0 60px rgba(255,102,164,0.2)',
          }}
        >
          02.14
        </div>
        <div className="mt-2 font-mono text-[10px] tracking-[0.4em] uppercase text-white/40">
          Something&apos;s dying to meet you
        </div>
      </div>

      {/* ─── BRAND LOCKUP ─── */}
      <div
        className="absolute z-20 inset-0 flex flex-col items-center justify-end pb-[5vh] pointer-events-none"
        style={{
          opacity: phaseIndex >= 6 ? 1 : 0,
          transform: `translateY(${phaseIndex >= 6 ? 0 : 15}px)`,
          transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1) 0.3s',
        }}
      >
        <div className="text-center">
          <div
            className="font-display tracking-tight leading-[0.85] text-spectral"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 3.5rem)',
              textShadow: '0 0 40px rgba(0,0,0,0.9)',
            }}
          >
            GOOD LOOKIN CORP
            <span className="text-[#00ffff]" style={{ fontSize: '0.5em' }}>.</span>
            SE
          </div>
          <div className="mt-2 font-mono text-[9px] tracking-[0.4em] uppercase text-white/25">
            Coming March 28
          </div>
        </div>
      </div>

      {/* ─── KEYFRAME ANIMATIONS ─── */}
      <style jsx>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }

        @keyframes glowPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }

        @keyframes particleFly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          60% {
            opacity: 0.8;
          }
          100% {
            transform: translate(var(--px-vx), var(--px-vy)) scale(0);
            opacity: 0;
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-4px, 2px); }
          20% { transform: translate(4px, -2px); }
          30% { transform: translate(-3px, 1px); }
          40% { transform: translate(3px, -1px); }
          50% { transform: translate(-2px, 1px); }
          60% { transform: translate(2px, -1px); }
          70% { transform: translate(-1px, 0px); }
          80% { transform: translate(1px, 0px); }
        }
      `}</style>
    </div>
  )
}
