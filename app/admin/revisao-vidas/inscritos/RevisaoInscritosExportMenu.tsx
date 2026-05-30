'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react'

type ExportAction = 'csv' | 'pdf' | 'labels'

interface RevisaoInscritosExportMenuProps {
  filteredCount: number
  selectedCount: number
  exporting: 'csv' | 'pdf' | null
  onExport: (action: ExportAction) => void
  className?: string
  buttonClassName?: string
  fullWidth?: boolean
}

export function RevisaoInscritosExportMenu({
  filteredCount,
  selectedCount,
  exporting,
  onExport,
  className = '',
  buttonClassName = '',
  fullWidth = false,
}: RevisaoInscritosExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  function runExport(action: ExportAction) {
    setOpen(false)
    onExport(action)
  }

  const menuItems = (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => runExport('csv')}
        disabled={filteredCount === 0 || exporting !== null}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 md:py-2.5"
      >
        <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          <span className="block font-medium">Lista em CSV</span>
          <span className="block text-xs text-slate-500">
            Exporta {filteredCount} inscrição(ões) visíveis
          </span>
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => runExport('pdf')}
        disabled={filteredCount === 0 || exporting !== null}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 md:py-2.5"
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <span>
          <span className="block font-medium">Lista em PDF</span>
          <span className="block text-xs text-slate-500">Relatório da lista visível</span>
        </span>
      </button>
      <div className="my-1 border-t border-slate-100" />
      <button
        type="button"
        role="menuitem"
        onClick={() => runExport('labels')}
        disabled={selectedCount === 0}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 md:py-2.5"
      >
        <Printer className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
        <span>
          <span className="block font-medium">Etiquetas PDF</span>
          <span className="block text-xs text-slate-500">
            {selectedCount > 0
              ? `${selectedCount} selecionado(s) — formato A4`
              : 'Selecione inscritos na lista'}
          </span>
        </span>
      </button>
    </>
  )

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={exporting !== null}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? 'w-full' : ''} ${buttonClassName}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Exportar
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {mounted &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[70] bg-black/40 md:hidden"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="fixed inset-x-0 bottom-0 z-[71] max-h-[min(80vh,28rem)] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white py-2 shadow-2xl md:hidden pb-safe"
                >
                  <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-slate-200" />
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Exportar inscrições
                  </p>
                  {menuItems}
                </div>
              </>,
              document.body,
            )}

          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 hidden w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 md:block"
          >
            {menuItems}
          </div>
        </>
      )}
    </div>
  )
}
