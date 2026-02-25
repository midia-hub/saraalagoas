'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { registerLoadingOverlay, notifyNavigation } from '@/lib/loading-overlay'
import { Loader2 } from 'lucide-react'

/**
 * Overlay global de carregamento.
 * - Cobre a tela imediatamente ao clicar em qualquer link de navegação
 * - Mantido até a página carregar E os dados terminarem de buscar
 * - Para requisições de ações do usuário (não-navegação), apenas após 2s
 */
export function GlobalLoadingOverlay() {
    const [visible, setVisible] = useState(false)
    const [message, setMessage] = useState<string | undefined>()

    // Contadores separados para não interferir entre fetch e nav
    const fetchCountRef = useRef(0)
    const navShownRef = useRef(false)

    const recompute = useCallback((fetchCount: number, navShown: boolean, msg?: string) => {
        const shouldShow = fetchCount > 0 || navShown
        if (shouldShow && msg) setMessage(msg)
        setVisible(shouldShow)
        if (!shouldShow) setMessage(undefined)
    }, [])

    const show = useCallback((msg?: string) => {
        fetchCountRef.current += 1
        recompute(fetchCountRef.current, navShownRef.current, msg)
    }, [recompute])

    const hide = useCallback(() => {
        fetchCountRef.current = Math.max(0, fetchCountRef.current - 1)
        recompute(fetchCountRef.current, navShownRef.current)
    }, [recompute])

    useEffect(() => {
        registerLoadingOverlay(show, hide)
    }, [show, hide])

    // --- Navegação: detecta clique em links e mostra overlay imediatamente ---
    const pathname = usePathname()
    const prevPathname = useRef(pathname)
    const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Quando o pathname muda: a navegação terminou
    useEffect(() => {
        if (pathname !== prevPathname.current) {
            prevPathname.current = pathname
            if (navTimerRef.current) {
                clearTimeout(navTimerRef.current)
                navTimerRef.current = null
            }
            if (navShownRef.current) {
                navShownRef.current = false
                recompute(fetchCountRef.current, false)
            }
        }
    }, [pathname, recompute])

    // Detecta clique em qualquer link interno e mostra overlay imediatamente
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest('a')
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto') || href === prevPathname.current) return

            // Cancela timer anterior
            if (navTimerRef.current) clearTimeout(navTimerRef.current)

            // Mostra overlay imediatamente
            notifyNavigation()
            navShownRef.current = true
            recompute(fetchCountRef.current, true, 'Carregando página...')

            // Timeout de segurança: esconde após 15s caso algo impeça a navegação
            navTimerRef.current = setTimeout(() => {
                if (navShownRef.current) {
                    navShownRef.current = false
                    recompute(fetchCountRef.current, false)
                }
            }, 15000)
        }

        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
    }, [recompute])

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-2xl border border-slate-100">
                <Loader2 className="w-10 h-10 text-[#c62737] animate-spin" />
                <p className="text-sm font-medium text-slate-600">
                    {message ?? 'Aguarde...'}
                </p>
            </div>
        </div>
    )
}


