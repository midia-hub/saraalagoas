'use client'

type AlbumFile = {
  id: string
  name: string
}

type PhotoPickerGridProps = {
  files: AlbumFile[]
  selectedIds: string[]
  onToggle: (fileId: string) => void
  onView?: (file: AlbumFile) => void
}

function thumbUrl(fileId: string): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=thumb`
}

export function PhotoPickerGrid({ files, selectedIds, onToggle, onView }: PhotoPickerGridProps) {
  const selected = new Set(selectedIds)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {files.map((file) => {
        const isSelected = selected.has(file.id)
        return (
          <div
            key={file.id}
            className={`relative overflow-hidden rounded-xl border bg-white text-left transition ${
              isSelected ? 'border-[#c62737] ring-2 ring-[#c62737]/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Checkbox para selecionar — clique aqui não abre a imagem */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(file.id)
              }}
              className="absolute left-2 top-2 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 bg-white shadow-md transition hover:bg-slate-50"
              title={isSelected ? 'Desmarcar foto' : 'Selecionar foto'}
              aria-label={isSelected ? 'Desmarcar foto' : 'Selecionar foto'}
            >
              {isSelected ? (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#c62737] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
              ) : (
                <span className="h-5 w-5 rounded border-2 border-slate-400" />
              )}
            </button>

            <div className="relative aspect-square w-full overflow-hidden">
              {onView ? (
                <button
                  type="button"
                  onClick={() => onView(file)}
                  className="flex h-full w-full cursor-zoom-in items-center justify-center border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-[#c62737]/50 focus:ring-inset"
                  title="Clique para visualizar em tela cheia"
                  aria-label={`Visualizar ${file.name}`}
                >
                  <img
                    src={thumbUrl(file.id)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-90 shadow-md" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </span>
                </button>
              ) : (
                <img
                  src={thumbUrl(file.id)}
                  alt={file.name}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggle(file.id)}
              className="w-full p-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
              title={isSelected ? 'Desmarcar foto' : 'Selecionar foto'}
            >
              <span className="block truncate">{file.name}</span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {isSelected ? '✓ Selecionada' : 'Clique para selecionar'}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

