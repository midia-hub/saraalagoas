import { GaleriaLoading } from '@/components/GaleriaLoading'

export default function GaleriaLoadingPage() {
  return (
    <div className="p-6 md:p-8">
      <GaleriaLoading
        title="Carregando galeria"
        subtitle="Buscando álbuns..."
        showGrid
        gridCount={8}
      />
    </div>
  )
}
