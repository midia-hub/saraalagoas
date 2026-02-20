
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Utilitário centralizado para calcular o total de cultos realizados em uma igreja
 * no período especificado, baseando-se no calendário de cultos configurado.
 */
export async function getRealizedWorshipCount(
  supabase: SupabaseClient,
  churchId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data: services } = await supabase
    .from('worship_services')
    .select('id, day_of_week')
    .eq('church_id', churchId)
    .eq('active', true)

  if (!services || services.length === 0) return 0

  // Converter datas sem problemas de fuso horário
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number)
  const startObj = new Date(sYear, sMonth - 1, sDay)
  startObj.setHours(0, 0, 0, 0)

  const [eYear, eMonth, eDay] = endDate.split('-').map(Number)
  const endObj = new Date(eYear, eMonth - 1, eDay)
  endObj.setHours(23, 59, 59, 999)

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const effectiveEnd = endObj > today ? today : endObj

  if (effectiveEnd < startObj) return 0

  let totalCount = 0
  const activeWeekdays = services.map((s: any) => Number(s.day_of_week))

  // Loop dia a dia para ser 100% preciso com o calendário
  const current = new Date(startObj)
  while (current <= effectiveEnd) {
    const currentDay = current.getDay() // 0=Sun, 1=Mon, ...
    
    // Conta quantas definições de culto existem para este dia da semana
    const servicesThisDay = activeWeekdays.filter(wd => wd === currentDay).length
    totalCount += servicesThisDay
    
    current.setDate(current.getDate() + 1)
  }

  return totalCount
}
