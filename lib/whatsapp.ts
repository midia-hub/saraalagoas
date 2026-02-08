/**
 * Gera URL do WhatsApp com mensagem pré-preenchida
 * @param number - Número no formato internacional (5582999999999)
 * @param message - Mensagem pré-preenchida
 * @returns URL completa do WhatsApp
 */
export function getWhatsAppUrl(number: string, message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${number}?text=${encodedMessage}`
}

/**
 * Abre o WhatsApp em uma nova aba
 * @param number - Número no formato internacional
 * @param message - Mensagem pré-preenchida
 */
export function openWhatsApp(number: string, message: string): void {
  const url = getWhatsAppUrl(number, message)
  window.open(url, '_blank', 'noopener,noreferrer')
}
