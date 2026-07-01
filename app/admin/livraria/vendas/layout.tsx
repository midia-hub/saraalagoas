import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/manifest-livraria.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PDV Livraria',
  },
}

export default function VendasLayout({ children }: { children: React.ReactNode }) {
  return children
}
