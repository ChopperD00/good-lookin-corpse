'use client'

export default function MobileFallback() {
  return (
    <div className="fixed inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
      <div className="relative">
        <div className="absolute -inset-32 rounded-full bg-neon-orange/5 animate-glow-pulse blur-3xl" />
        <div className="absolute -inset-20 rounded-full bg-neon-orange/10 animate-glow-pulse blur-2xl" style={{ animationDelay: '0.5s' }} />
        <svg viewBox="0 0 200 280" className="w-48 h-auto opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 20C55 20 25 60 25 100V240C25 240 40 220 55 240C70 260 85 220 100 240C115 220 130 260 145 240C160 220 175 240 175 240V100C175 60 145 20 100 20Z" fill="rgba(15,32,39,0.9)" stroke="rgba(255,69,0,0.3)" strokeWidth="1" />
          <ellipse cx="75" cy="90" rx="18" ry="16" fill="black" />
          <circle cx="75" cy="90" r="10" fill="rgba(0,255,0,0.3)" className="animate-pulse" />
          <ellipse cx="125" cy="90" rx="18" ry="16" fill="black" />
          <circle cx="125" cy="90" r="10" fill="rgba(0,255,0,0.3)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
        </svg>
      </div>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }} />
    </div>
  )
}
