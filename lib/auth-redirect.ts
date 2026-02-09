/**
 * URL base para redirecionamento após confirmação de e-mail (magic link / convite).
 * No browser usa a origem atual (localhost em dev, domínio em produção).
 * No server/build use NEXT_PUBLIC_APP_URL (ex.: https://saraalagoas.com).
 */
export function getAuthRedirectBase(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? ''
}

/** Caminho da página "Completar cadastro" (callback do Supabase após clicar no link do e-mail). */
export const AUTH_CONFIRMAR_PATH = '/auth/confirmar'

export function getAuthConfirmarUrl(): string {
  const base = getAuthRedirectBase()
  return base ? `${base}${AUTH_CONFIRMAR_PATH}` : ''
}
