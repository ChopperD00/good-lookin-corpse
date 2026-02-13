/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        crypt: '#0a0a0a',
        ash: '#1a1a1a',
        bone: '#e5e5e5',
        spectral: '#f5f5f5',
        'neon-cyan': '#00ffff',
        'neon-orange': '#ff4500',
        decay: '#0f2027',
      },
      fontFamily: {
        display: ['var(--font-boldonse)', 'serif'],
        mono: ['var(--font-supply)', 'monospace'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        bebas: ['var(--font-bebas)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        elite: ['var(--font-elite)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'grain': 'grain 0.5s steps(1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', filter: 'blur(20px)' },
          '50%': { opacity: '0.8', filter: 'blur(30px)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
      },
    },
  },
  plugins: [],
}
