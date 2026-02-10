'use client'

type PhotoPickerToolbarProps = {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
}

export function PhotoPickerToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onConfirm,
  confirmDisabled,
}: PhotoPickerToolbarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          Selecionadas: <strong>{selectedCount}</strong> de {totalCount}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Selecionar todas
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-lg bg-[#c62737] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Confirmar fotos
          </button>
        </div>
      </div>
    </div>
  )
}

