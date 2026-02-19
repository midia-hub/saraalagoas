/**
 * Normaliza texto para busca ignorando acentos e case.
 * Ex.: "José" → "jose", "MARIA" → "maria"
 */
export function normalizeForSearch(text: string): string {
  if (typeof text !== 'string') return ''
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
