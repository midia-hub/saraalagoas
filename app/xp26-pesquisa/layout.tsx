import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pesquisa pós-evento — XP26 Alagoas',
  description: 'Conte como foi sua experiência no XP26 Alagoas. Sua opinião é muito importante para nós.',
}

export default function Xp26PesquisaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
