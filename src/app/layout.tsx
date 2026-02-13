import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Casket — gothic display typeface
const casket = localFont({
  src: [
    { path: '../../public/fonts/CasketRegular.woff', weight: '400', style: 'normal' },
  ],
  variable: '--font-casket',
  display: 'swap',
})

// Casket Drip — dripping variant for accent text
const casketDrip = localFont({
  src: [
    { path: '../../public/fonts/CasketDrip.woff', weight: '400', style: 'normal' },
  ],
  variable: '--font-casket-drip',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://goodlookincorpse.com'),
  title: 'Good Lookin Corpse \u2014 Gothic Streetwear',
  description:
    'Veil of Dust. Trail of Ash. Heart of Ice. Gothic streetwear dropping March 28, 2026.',
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
        alt: 'Good Lookin Corpse \u2014 Spectral Ghost',
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
    <html lang="en" className={`${inter.variable} ${casket.variable} ${casketDrip.variable}`}>
      <body className="bg-black text-spectral font-sans antialiased grain-overlay">
        {children}
      </body>
    </html>
  )
}
