import { PageLoading } from '@/components/ui/PageLoading'

export default function ContaLoading() {
  return <PageLoading message="Carregando conta..." fullScreen={false} className="min-h-[40vh]" />
}
