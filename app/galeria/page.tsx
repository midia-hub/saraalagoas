import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GaleriaLoading } from '@/components/GaleriaLoading'
import { Camera, Calendar as CalendarIcon } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase-server'
import { listFolderImages } from '@/lib/drive'
import { DateFilters } from './_components/DateFilters'

type GalleryItem = {
  id: string
  type: 'culto' | 'evento'
  title: string
  slug: string
  date: string
  drive_folder_id?: string
  gallery_files: { drive_file_id: string }[]
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

function formatDatePtBr(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const THUMB_SIZE = 160

function AlbumThumbnails({ fileIds }: { fileIds: string[] }) {
  if (!fileIds || fileIds.length === 0) {
    return (
      <div className="h-[120px] bg-gray-100 flex items-center justify-center">
        <Camera className="text-gray-300" size={40} />
      </div>
    )
  }
  
  // Garantir pelo menos 8 itens para o loop de scroll ser contínuo
  let displayList = [...fileIds]
  while (displayList.length > 0 && displayList.length < 8) {
    displayList = [...displayList, ...fileIds]
  }
  const finalItems = [...displayList, ...displayList]
  
  const duration = Math.max(displayList.length * 4, 15)
  
  return (
    <div className="h-[120px] overflow-hidden bg-gray-100 relative group/thumb">
      <div
        className="flex gap-1 h-full animate-gallery-scroll group-hover/thumb:[animation-play-state:paused]"
        style={{ 
          animationDuration: `${duration}s`
        }}
      >
        {finalItems.map((id, i) => (
          <div key={`${id}-${i}`} className="relative flex-shrink-0 w-32 h-full overflow-hidden">
            <Image
              src={`/api/gallery/image?fileId=${encodeURIComponent(id)}&mode=thumb&size=${THUMB_SIZE}`}
              alt=""
              fill
              className="object-cover"
              sizes="128px"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  )
}

async function GaleriaContent({ typeFilter, monthFilter, yearFilter }: { typeFilter: string, monthFilter: string, yearFilter: string }) {
  let items: GalleryItem[] = []
  try {
    let query = supabaseServer
      .from('galleries')
      .select('id, type, title, slug, date, drive_folder_id, gallery_files(drive_file_id)')
      .eq('hidden_from_public', false)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (typeFilter) {
      query = query.eq('type', typeFilter)
    }

    if (yearFilter) {
      if (monthFilter) {
        // Filtrar por mês específico
        const startDate = `${yearFilter}-${monthFilter}-01`
        const lastDay = new Date(parseInt(yearFilter), parseInt(monthFilter), 0).getDate()
        const endDate = `${yearFilter}-${monthFilter}-${lastDay}`
        query = query.gte('date', startDate).lte('date', endDate)
      } else {
        // Filtrar por todo o ano
        query = query.gte('date', `${yearFilter}-01-01`).lte('date', `${yearFilter}-12-31`)
      }
    }

    const { data, error: selectError } = await query.limit(100)
    if (selectError) {
      console.error('[Galeria] Erro Supabase:', selectError)
    }
    items = (data || []) as unknown as GalleryItem[]

    // Sincronização em tempo real para álbuns sem fotos no banco
    const syncPromises = items
      .filter(item => (!item.gallery_files || item.gallery_files.length === 0) && item.drive_folder_id)
      .map(async (item) => {
        try {
          const files = await listFolderImages(item.drive_folder_id!)
          if (files.length > 0) {
            const upsertPayload = files.slice(0, 10).map((file) => ({
              gallery_id: item.id,
              drive_file_id: file.id,
              name: file.name,
              web_view_link: file.webViewLink,
              thumbnail_link: file.thumbnailLink,
              mime_type: file.mimeType,
              created_time: file.createdTime,
            }))
            await supabaseServer.from('gallery_files').upsert(upsertPayload, { onConflict: 'drive_file_id' })
            item.gallery_files = files.slice(0, 10).map(f => ({ drive_file_id: f.id }))
          }
        } catch (e) {
          console.error(`[Galeria] Falha ao sincronizar album ${item.id}:`, e)
        }
      })
    
    if (syncPromises.length > 0) {
      await Promise.all(syncPromises)
    }

  } catch (err) {
    console.error('[Galeria] Erro ao carregar galerias:', err)
  }

  const title =
    typeFilter === 'culto'
      ? 'Galeria de Cultos'
      : typeFilter === 'evento'
        ? 'Galeria de Eventos'
        : 'Galeria de Fotos'

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-sara-gray-dark">
            {title}
          </h1>
          <p className="text-sara-gray-light mt-2">
            Acesse os álbuns de fotos dos nossos cultos e eventos.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-center">
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/galeria"
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${!typeFilter && !yearFilter && !monthFilter
                ? 'bg-sara-red text-white shadow-lg shadow-sara-red/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-sara-red/40 hover:shadow-md'
                }`}
            >
              Todos
            </Link>
            <Link
              href={`/galeria?type=culto${yearFilter ? `&year=${yearFilter}` : ''}${monthFilter ? `&month=${monthFilter}` : ''}`}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${typeFilter === 'culto'
                ? 'bg-sara-red text-white shadow-lg shadow-sara-red/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-sara-red/40 hover:shadow-md'
                }`}
            >
              Cultos
            </Link>
            <Link
              href={`/galeria?type=evento${yearFilter ? `&year=${yearFilter}` : ''}${monthFilter ? `&month=${monthFilter}` : ''}`}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${typeFilter === 'evento'
                ? 'bg-sara-red text-white shadow-lg shadow-sara-red/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-sara-red/40 hover:shadow-md'
                }`}
            >
              Eventos
            </Link>
          </div>

          <div className="h-px w-12 bg-slate-200 hidden md:block" />

          <DateFilters
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            years={years}
            months={MONTHS}
          />
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sara-gray-light">
            Nenhum álbum disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const isXp26 = item.slug === 'xp26-alagoas'
              const fileIds = (item.gallery_files || []).map(f => f.drive_file_id).slice(0, 10)
              
              return (
                <Link
                  key={item.id}
                  href={`/galeria/${item.type}/${item.slug}/${item.date}`}
                  className={`block rounded-xl border overflow-hidden transition-all duration-300 ${isXp26
                    ? 'bg-slate-900 border-[#B6FF3B] shadow-[0_0_15px_rgba(182,255,59,0.2)] hover:shadow-[0_0_25px_rgba(182,255,59,0.4)]'
                    : 'bg-white border-gray-200 hover:border-sara-red/40 hover:shadow-md'
                    }`}
                >
                  <AlbumThumbnails fileIds={fileIds} />
                  <div className="p-4">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${isXp26 ? 'bg-[#B6FF3B]/10 text-[#B6FF3B]' : 'bg-sara-red/10 text-sara-red'
                      }`}>
                      {item.type === 'culto' ? 'Culto' : 'Evento'}
                    </span>
                    <h2 className={`font-semibold line-clamp-2 ${isXp26 ? 'text-white' : 'text-sara-gray-dark'}`}>
                      {item.title}
                    </h2>
                    <p className={`text-sm mt-1 ${isXp26 ? 'text-gray-400' : 'text-sara-gray-light'}`}>
                      {formatDatePtBr(item.date)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sara-red hover:underline font-medium"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function GaleriaPublicaPage(props: { searchParams: Promise<{ type?: string, month?: string, year?: string }> | { type?: string, month?: string, year?: string } }) {
  const searchParams = await Promise.resolve(props.searchParams)
  const currentYear = new Date().getFullYear().toString()
  
  const typeFilter = searchParams?.type || ''
  const monthFilter = searchParams?.month || ''
  const yearFilter = searchParams?.year || currentYear
  
  return (
    <Suspense
      key={`${typeFilter}-${monthFilter}-${yearFilter}`}
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
            <GaleriaLoading
              title="Carregando galeria"
              subtitle="Buscando álbuns..."
              showGrid
              gridCount={8}
            />
          </div>
        </div>
      }
    >
      <GaleriaContent typeFilter={typeFilter} monthFilter={monthFilter} yearFilter={yearFilter} />
    </Suspense>
  )
}
