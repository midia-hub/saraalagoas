'use client'

type AlbumFile = {
  id: string
  name: string
}

type PhotoPickerGridProps = {
  files: AlbumFile[]
  selectedIds: string[]
  onToggle: (fileId: string) => void
}

function thumbUrl(fileId: string): string {
  return `/api/gallery/image?fileId=${encodeURIComponent(fileId)}&mode=thumb`
}

export function PhotoPickerGrid({ files, selectedIds, onToggle }: PhotoPickerGridProps) {
  const selected = new Set(selectedIds)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {files.map((file) => {
        const isSelected = selected.has(file.id)
        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onToggle(file.id)}
            className={`overflow-hidden rounded-xl border bg-white text-left transition ${
              isSelected ? 'border-[#c62737] ring-2 ring-[#c62737]/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <img
              src={thumbUrl(file.id)}
              alt={file.name}
              className="h-32 w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="p-2 text-xs text-slate-700 truncate">{file.name}</div>
          </button>
        )
      })}
    </div>
  )
}

