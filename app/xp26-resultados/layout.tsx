import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resultados da pesquisa — XP26 Alagoas',
  description: 'Resultados consolidados da pesquisa pós-evento XP26 Alagoas.',
}

export default function Xp26ResultadosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
