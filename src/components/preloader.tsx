'use client'

interface PreloaderProps { isLoading: boolean }

export default function Preloader({ isLoading }: PreloaderProps) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative w-16 h-16 mb-8">
        <svg viewBox="0 0 64 64" className="w-full h-full animate-pulse" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 8C20 8 12 18 12 28V52C12 52 16 48 20 52C24 56 28 48 32 52C36 48 40 56 44 52C48 48 52 52 52 52V28C52 18 44 8 32 8Z" fill="none" stroke="rgba(255,69,0,0.6)" strokeWidth="1.5" />
          <circle cx="24" cy="26" r="3" fill="rgba(0,255,0,0.5)" />
          <circle cx="40" cy="26" r="3" fill="rgba(0,255,0,0.5)" />
        </svg>
        <div className="absolute inset-0 rounded-full bg-neon-orange/20 animate-glow-pulse" />
      </div>
      <div className="w-48 h-px bg-white/10 overflow-hidden">
        <div className="h-full bg-neon-orange/60 transition-all duration-500 ease-out" style={{ width: isLoading ? '80%' : '100%' }} />
      </div>
      <p className="mt-4 text-xs font-mono text-white/30 tracking-[0.3em] uppercase">Materializing</p>
    </div>
  )
}
