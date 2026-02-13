import type { Metadata } from 'next'
import { Inter, Creepster, Bebas_Neue, Playfair_Display, Special_Elite } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Gothic display font — swap to Boldonse when font files are available
const creepster = Creepster({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

// Glitch-cycle fonts — contrasting typefaces for kinetic typography
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-elite',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://goodlookincorpse.com'),
  title: 'Good Lookin Corpse — Gothic Streetwear',
  description:
    "Can't Kill What's Already Dead. Gothic streetwear dropping March 28, 2026.",
  keywords: ['streetwear', 'gothic', 'fashion', 'good lookin corpse', 'clothing'],
  openGraph: {
    title: 'Good Lookin Corpse',
    description: 'Veil of Dust. Trail of Ash. Heart of Ice. Dropping March 28.',
    url: 'https://goodlookincorpse.com',
    siteName: 'Good Lookin Corpse',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Good Lookin Corpse — Spectral Ghost',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Good Lookin Corpse',
    description: 'Veil of Dust. Trail of Ash. Heart of Ice. Dropping March 28.',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${creepster.variable} ${bebasNeue.variable} ${playfair.variable} ${specialElite.variable}`}>
      <body className="bg-black text-spectral font-casket antialiased grain-overlay">
        {children}
      </body>
    </html>
  )
}