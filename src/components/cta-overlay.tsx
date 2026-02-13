'use client'

import { useState } from 'react'

interface CtaOverlayProps { isVisible: boolean }

export default function CtaOverlay({ isVisible }: CtaOverlayProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      console.log('Email signup:', email)
      setSubmitted(true)
    }
  }

  return (
    <div className={`fixed inset-0 z-10 flex flex-col items-center justify-end pb-[12vh] pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`text-center mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-spectral tracking-tight leading-none">GOOD LOOKIN<br />CORPSE</h1>
        <p className="mt-3 font-mono text-[10px] sm:text-xs text-white/40 tracking-[0.4em] uppercase">Veil of Dust &middot; Trail of Ash &middot; Heart of Ice</p>
      </div>
      <div className={`pointer-events-auto transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {!showForm && !submitted && (
          <button onClick={() => setShowForm(true)} className="group relative px-8 py-3 border border-white/20 text-spectral font-mono text-xs tracking-[0.3em] uppercase hover:border-neon-cyan/50 hover:text-neon-cyan transition-all duration-500 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30">
            <span className="relative z-10">Coming March 28</span>
            <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        )}
        {showForm && !submitted && (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="w-64 px-4 py-3 bg-transparent border border-white/20 text-spectral font-mono text-xs tracking-wider placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors duration-300" />
            <button type="submit" className="px-6 py-3 bg-white/5 border border-white/20 text-spectral font-mono text-xs tracking-[0.2em] uppercase hover:bg-neon-cyan/10 hover:border-neon-cyan/50 hover:text-neon-cyan transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30">Notify Me</button>
          </form>
        )}
        {submitted && <p className="font-mono text-xs text-neon-cyan/70 tracking-[0.3em] uppercase animate-fade-in">You&apos;re on the list</p>}
      </div>
    </div>
  )
}
