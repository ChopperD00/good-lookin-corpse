'use client'

/**
 * CRT TV-off effect — simulates an old CRT monitor turning off
 * White line collapses vertically then horizontally with afterglow
 */

interface CrtEffectProps {
  active?: boolean
  onComplete?: () => void
}

export default function CrtEffect({ active = false, onComplete }: CrtEffectProps) {
  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none"
      onAnimationEnd={onComplete}
    >
      {/* Screen flash */}
      <div className="absolute inset-0 bg-white animate-crt-flash" />
      {/* Horizontal collapse line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white animate-crt-line" />
      {/* Center dot afterglow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white animate-crt-dot" />
    </div>
  )
}
