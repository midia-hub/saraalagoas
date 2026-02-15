import { PageLoading } from '@/components/ui/PageLoading'

export default function ConfiguracoesLoading() {
  return <PageLoading message="Carregando configurações..." fullScreen={false} className="min-h-[50vh]" />
}
