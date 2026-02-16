import { PageLoading } from '@/components/ui/PageLoading'

export default function PostsLoading() {
  return <PageLoading message="Carregando publicações..." fullScreen={false} className="min-h-[320px]" />
}
