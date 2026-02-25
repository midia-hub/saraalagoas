/**
 * Singleton para controlar o overlay de carregamento global.
 * Desacoplado do React para que adminFetchJson possa usá-lo diretamente.
 */

type ShowFn = (message?: string) => void
type HideFn = () => void

let _show: ShowFn | null = null
let _hide: HideFn | null = null

/** Timestamp da última navegação iniciada */
let _lastNavTime = 0

/** Janela (ms) em que um fetch é considerado "carga de página" e mostra overlay imediatamente */
const PAGE_LOAD_WINDOW_MS = 6000

/** Registrado pelo componente GlobalLoadingOverlay ao montar */
export function registerLoadingOverlay(show: ShowFn, hide: HideFn) {
    _show = show
    _hide = hide
}

/** Chamado pelo GlobalLoadingOverlay quando o usuário clica em um link de navegação */
export function notifyNavigation() {
    _lastNavTime = Date.now()
}

/**
 * Retorna true se o momento atual ainda está dentro da janela de carga de página.
 * adminFetchJson usa isso para decidir se mostra o overlay imediatamente ou após 2s.
 */
export function isPageLoadWindow(): boolean {
    return Date.now() - _lastNavTime < PAGE_LOAD_WINDOW_MS
}

/** Mostra o overlay (sem-op se não registrado) */
export function showLoadingOverlay(message?: string) {
    _show?.(message)
}

/** Esconde o overlay (sem-op se não registrado) */
export function hideLoadingOverlay() {
    _hide?.()
}
