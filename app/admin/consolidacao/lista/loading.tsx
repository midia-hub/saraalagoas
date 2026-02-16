import { PageLoading } from '@/components/ui/PageLoading'

export default function ListaConvertidosLoading() {
  return <PageLoading message="Carregando convertidos..." fullScreen={false} className="min-h-[320px]" />
}
