/** Fuso de Brasília (America/Sao_Paulo) */
const TZ_BRASILIA = 'America/Sao_Paulo'

/**
 * Retorna a data de hoje no horário de Brasília no formato YYYY-MM-DD.
 * Evita que o valor padrão do campo "Data da Conversão" mude por causa do UTC.
 * Em ambiente sem Intl/timeZone (ex.: alguns Edge), faz fallback para data UTC.
 */
export function getTodayBrasilia(): string {
  try {
    const s = new Date().toLocaleDateString('en-CA', { timeZone: TZ_BRASILIA })
    if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  } catch {
    // fallback se timeZone não for suportado
  }
  return new Date().toISOString().slice(0, 10)
}
