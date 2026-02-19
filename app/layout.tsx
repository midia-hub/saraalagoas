import { Outfit, Inter } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { siteConfig } from '@/config/site'
import { SiteConfigProvider } from '@/lib/site-config-context'

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const supabaseOrigin = (() => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) return ''
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
})()

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c62737',
}

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: ['igreja', 'sara', 'alagoas', 'maceió', 'culto', 'presencial', 'célula', 'transformação'],
  authors: [{ name: 'Sara Sede Alagoas' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/brand/logo.png`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}/brand/logo.png`],
  },
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
        ) : null}
      </head>
      <body className={`${outfit.variable} ${inter.variable} antialiased`}>
        <SiteConfigProvider>
          {children}
        </SiteConfigProvider>
      </body>
    </html>
  )
}
