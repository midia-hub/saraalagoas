import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#166534',
}

export const metadata: Metadata = {
  title: 'Bolão Arena da Copa | Arena Sede Maceió',
  description:
    'Dê seu palpite nos jogos do Brasil, escolha sua equipe e acompanhe o ranking do Arena Sede Maceió.',
  keywords: ['bolão', 'arena', 'copa', 'brasil', 'sara', 'maceió', 'palpite'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'Bolão Arena da Copa',
    description: 'Palpite no jogo do Brasil e ajude sua equipe no Arena Sede Maceió!',
    siteName: 'Bolão Arena da Copa',
  },
}

export default function BolaoLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-inter">{children}</div>
}
