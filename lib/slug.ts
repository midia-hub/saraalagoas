/**
 * Utilitário para criar slugs (URLs amigáveis)
 */

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .trim()
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
    .replace(/\-\-+/g, '-') // Remove hífens duplicados
    .replace(/^-+/, '') // Remove hífen do início
    .replace(/-+$/, '') // Remove hífen do final
}

/**
 * Formata uma data no formato YYYY-MM-DD
 */
export function formatDateForSlug(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Gera um caminho de galeria no formato: /{tipo}/{slug}/{YYYY-MM-DD}
 */
export function generateGalleryPath(type: 'culto' | 'evento', slug: string, date: Date | string): string {
  const dateStr = formatDateForSlug(date)
  return `/galeria/${type}/${slug}/${dateStr}`
}
