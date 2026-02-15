import { GaleriaLoading } from '@/components/GaleriaLoading'

export default function GaleriaPublicLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <GaleriaLoading
        title="Carregando galeria"
        subtitle="Buscando álbuns..."
        showGrid
        gridCount={8}
      />
    </div>
  )
}
