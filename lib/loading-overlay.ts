/**
 * Singleton para controlar estado de carregamento global.
 * Desacoplado do React para que adminFetchJson e o menu possam observá-lo.
 */

type ShowFn = (message?: string) => void
type HideFn = () => void
type LoadingStateListener = (state: LoadingOverlayState) => void

export interface LoadingOverlayState {
  activeRequests: number
  navigationPending: boolean
  busy: boolean
}

let _show: ShowFn | null = null
let _hide: HideFn | null = null
let _activeRequests = 0
let _navigationPending = false
const _listeners = new Set<LoadingStateListener>()

/** Timestamp da última navegação iniciada */
let _lastNavTime = 0

/** Janela (ms) em que um fetch é considerado "carga de página" e mostra estado imediato */
const PAGE_LOAD_WINDOW_MS = 6000

function getState(): LoadingOverlayState {
  return {
    activeRequests: _activeRequests,
    navigationPending: _navigationPending,
    busy: _activeRequests > 0 || _navigationPending,
  }
}

function emitState() {
  const state = getState()
  _listeners.forEach((listener) => listener(state))
}

/** Registrado pelo componente GlobalLoadingOverlay ao montar */
export function registerLoadingOverlay(show: ShowFn, hide: HideFn) {
  _show = show
  _hide = hide
}

/** Chamado quando o usuário inicia uma navegação (ex.: clique no menu) */
export function notifyNavigation() {
  _lastNavTime = Date.now()
  _navigationPending = true
  emitState()
}

/** Marca o fim da navegação de rota. */
export function completeNavigation() {
  _navigationPending = false
  emitState()
}

/**
 * Retorna true se o momento atual ainda está dentro da janela de carga de página.
 * adminFetchJson usa isso para decidir se considera o fetch parte da navegação.
 */
export function isPageLoadWindow(): boolean {
  return Date.now() - _lastNavTime < PAGE_LOAD_WINDOW_MS
}

/** Mostra o overlay (sem-op se não registrado) e incrementa contador global */
export function showLoadingOverlay(message?: string) {
  _activeRequests += 1
  _show?.(message)
  emitState()
}

/** Esconde o overlay (sem-op se não registrado) e decrementa contador global */
export function hideLoadingOverlay() {
  _activeRequests = Math.max(0, _activeRequests - 1)
  _hide?.()
  emitState()
}

/** Permite observar o estado de carregamento global. */
export function subscribeLoadingOverlayState(listener: LoadingStateListener) {
  _listeners.add(listener)
  listener(getState())
  return () => {
    _listeners.delete(listener)
  }
}
