import { isEvolutionConfigured, normalizeBrazilPhone, sendEvolutionText } from './evolution-api'

/**
 * Nome reduzido para exibicao (mesma logica da pagina de sucesso da consolidacao).
 * Primeiro nome; para nomes comuns (Maria, Joao, etc.) usa primeiro + segundo.
 */
const PRIMEIRO_NOME_COM_SEGUNDO = new Set([
  'maria', 'ana', 'sofia', 'laura', 'isabel',
  'joão', 'joao', 'josé', 'jose', 'antônio', 'antonio', 'miguel', 'luiz', 'carlos',
])

export function getNomeExibicao(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return nome
  const primeiro = parts[0] ?? nome
  const primeiroNorm = primeiro.toLowerCase().normalize('NFD').replace(/\u0300/g, '')
  const precisaSegundo = PRIMEIRO_NOME_COM_SEGUNDO.has(primeiroNorm)
  if (precisaSegundo && parts.length >= 2) return `${parts[0]} ${parts[1]}`
  return primeiro
}

const MESSAGE_ID_ACEITOU = 'd3d770e5-6c68-4c91-b985-ceb920768a61'
const MESSAGE_ID_RECONCILIOU = '8f32bd0d-ae13-4261-af91-4845284ab1fe'

// Mensagens de Reservas de Sala (usando os IDs fornecidos)
const MESSAGE_ID_RESERVA_RECEBIDA = '589eb419-039e-479b-8def-13c99b63055d'
const MESSAGE_ID_RESERVA_PENDENTE_APROVACAO = 'ec0fba84-6657-405f-ad19-1c978e254c9c'
const MESSAGE_ID_RESERVA_APROVADA = '6532739c-c972-481f-bdf3-c707dfabe3e5'
const MESSAGE_ID_RESERVA_REPROVADA = '0d9a3be9-a8d4-4eb1-b6f0-c6aa7b37ca93'
const MESSAGE_ID_RESERVA_CANCELADA = 'd03afd1c-ccd7-4907-a2a3-97353dea71a4'

export type ConversionTypeDisparos = 'accepted' | 'reconciled' | 'reserva_recebida' | 'reserva_pendente_aprovacao' | 'reserva_aprovada' | 'reserva_reprovada' | 'reserva_cancelada'

export type DisparosWebhookResult = { success: boolean; statusCode?: number; phone: string; nome: string }

// ── Message IDs do módulo de Escalas ─────────────────────────────────────
export const MESSAGE_ID_ESCALA_MES        = '4519f7f2-f890-42be-a660-69baec1b1dc5'
export const MESSAGE_ID_ESCALA_LEMBRETE_3 = '91915ca1-0419-43b5-a70c-df0c0b92379f'
export const MESSAGE_ID_ESCALA_LEMBRETE_1 = '96a161e3-087c-4755-b31e-0c127c36d6b9'
export const MESSAGE_ID_ESCALA_DIA        = '27eb5277-f8d8-45b3-98cc-15f9e0b55d0c'

// ── Message IDs do módulo de Demandas de Mídia ───────────────────────────
export const MESSAGE_ID_DEMANDA_ARTE       = 'demanda_arte'
export const MESSAGE_ID_DEMANDA_VIDEO      = 'demanda_video'

// ── Message IDs do módulo Sara Kids ──────────────────────────────────────
export const MESSAGE_ID_KIDS_CHECKIN      = '7f9fb081-bb8f-4db7-9b9c-25df8c3b110a'
export const MESSAGE_ID_KIDS_CHECKOUT     = '02b7e040-2655-4547-942e-a9814ad96bf5'
export const MESSAGE_ID_KIDS_ALERTA       = '0db51837-8f01-4b69-a6c6-d369bd4801b4'
export const MESSAGE_ID_KIDS_ENCERRAMENTO = '851978a9-e0d2-4202-b332-4b144476a247'
// ── Message IDs do módulo de Disparo Individual (Cadastro Pessoa) ────────────
export const MESSAGE_ID_CULTO        = '16155aa7-ce8f-4bba-a37a-b4d60c04782f' // Hoje é dia de culto!
export const MESSAGE_ID_ARENA        = 'bfaa202b-e385-4c2f-9fe5-ce0b026b80c5' // Hoje é dia de ARENA!
export const MESSAGE_ID_MOMENTO_DEUS = 'fc1e2ddf-dea2-4422-abf8-f36df567e678' // Momento com Deus

function value(variables: Record<string, string>, key: string, fallback = '') {
  const raw = variables[key]
  return raw == null || raw === '' ? fallback : raw
}

function renderDisparoText(messageId: string, variables: Record<string, string>) {
  const nome = value(variables, 'nome', 'irmao(a)')

  switch (messageId) {
    case MESSAGE_ID_ACEITOU:
      return `Ola ${nome}, que alegria pela sua decisao por Jesus!\n\nA Sara Nossa Terra Alagoas quer caminhar com voce nessa nova etapa. Em breve nossa equipe de consolidacao vai falar com voce.`
    case MESSAGE_ID_RECONCILIOU:
      return `Ola ${nome}, ficamos muito felizes com sua reconciliacao!\n\nA Sara Nossa Terra Alagoas quer estar perto de voce e ajudar nos proximos passos. Em breve nossa equipe de consolidacao vai falar com voce.`
    case MESSAGE_ID_RESERVA_RECEBIDA:
      return [
        `Olá, ${nome}! 👋`,
        '',
        'Recebemos sua solicitação de reserva de sala. Ela agora está aguardando confirmação da liderança. ⏳',
        '',
        `🏛️ Sala: ${value(variables, 'sala', '-')}`,
        `📅 Data: ${value(variables, 'data', '-')}`,
        `🕒 Horário: ${value(variables, 'hora_inicio', '-')} às ${value(variables, 'hora_fim', '-')}`,
        `👥 Pessoas: ${value(variables, 'quantidade_pessoas', '-')}`,
        value(variables, 'motivo') ? `📝 Motivo: ${value(variables, 'motivo')}` : '',
        '',
        'Assim que houver uma resposta, você será avisado por aqui.',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_RESERVA_PENDENTE_APROVACAO:
      return [
        `Olá, ${value(variables, 'aprovador_nome', nome)}! 👋`,
        '',
        'Há uma nova solicitação de reserva aguardando sua confirmação. ✅',
        '',
        `👤 Solicitante: ${value(variables, 'solicitante', '-')}`,
        `🏛️ Sala: ${value(variables, 'sala', '-')}`,
        `📅 Data: ${value(variables, 'data', '-')}`,
        `🕒 Horário: ${value(variables, 'hora_inicio', '-')} às ${value(variables, 'hora_fim', '-')}`,
        `👥 Pessoas: ${value(variables, 'quantidade_pessoas', '-')}`,
        value(variables, 'motivo') ? `📝 Motivo: ${value(variables, 'motivo')}` : '',
        '',
        'Acesse o painel de reservas para aprovar ou recusar essa solicitação.',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_RESERVA_APROVADA:
      return [
        `Olá, ${nome}! ✅`,
        '',
        'Sua reserva de sala foi aprovada.',
        '',
        `🏛️ Sala: ${value(variables, 'sala', '-')}`,
        `📅 Data: ${value(variables, 'data', '-')}`,
        `🕒 Horário: ${value(variables, 'hora_inicio', '-')} às ${value(variables, 'hora_fim', '-')}`,
        value(variables, 'aprovador_nome') ? `👤 Aprovado por: ${value(variables, 'aprovador_nome')}` : '',
        '',
        'A sala estará reservada para você nesse horário. Obrigado por organizar com antecedência.',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_RESERVA_REPROVADA:
      return [
        `Olá, ${nome}.`,
        '',
        'Sua solicitação de reserva não pôde ser aprovada neste momento. ❌',
        '',
        `🏛️ Sala: ${value(variables, 'sala', '-')}`,
        `📅 Data: ${value(variables, 'data', '-')}`,
        `🕒 Horário: ${value(variables, 'hora_inicio', '-')} às ${value(variables, 'hora_fim', '-')}`,
        value(variables, 'motivo_reprovacao') ? `📝 Motivo: ${value(variables, 'motivo_reprovacao')}` : '',
        '',
        'Se necessário, envie uma nova solicitação com outro horário ou procure a liderança.',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_RESERVA_CANCELADA:
      return [
        `Olá, ${nome}.`,
        '',
        'Sua reserva de sala foi cancelada. 🚫',
        '',
        `🏛️ Sala: ${value(variables, 'sala', '-')}`,
        `📅 Data: ${value(variables, 'data', '-')}`,
        `🕒 Horário: ${value(variables, 'hora_inicio', '-')} às ${value(variables, 'hora_fim', '-')}`,
        value(variables, 'motivo_cancelamento') ? `📝 Motivo: ${value(variables, 'motivo_cancelamento')}` : '',
        '',
        'Se ainda precisar da sala, faça uma nova solicitação pelo link de reservas.',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_ESCALA_MES:
      return [
        `Ola ${nome}, saiu sua escala de ${value(variables, 'ministerio', 'ministerio')} para ${value(variables, 'mes', '-')}/${value(variables, 'ano', '-')}.`,
        '',
        value(variables, 'escala_lista', ''),
        '',
        value(variables, 'link_escala') ? `Confira a escala completa: ${value(variables, 'link_escala')}` : '',
      ].filter((line) => line !== '').join('\n')
    case MESSAGE_ID_ESCALA_LEMBRETE_3:
    case MESSAGE_ID_ESCALA_LEMBRETE_1:
      return [
        `Ola ${nome}, passando para lembrar que voce esta escalado(a).`,
        `Dia: ${value(variables, 'dia_semana', '')} ${value(variables, 'data', '')}`.trim(),
        `Funcao: ${value(variables, 'funcao', '-')}`,
        `Horario: ${value(variables, 'hora', '-')}`,
        `Local: ${value(variables, 'local', '-')}`,
      ].join('\n')
    case MESSAGE_ID_ESCALA_DIA:
      return [
        `Ola ${nome}, hoje e dia da sua escala.`,
        `Funcao: ${value(variables, 'funcao', '-')}`,
        `Horario: ${value(variables, 'hora', '-')}`,
        `Local: ${value(variables, 'local', '-')}`,
        value(variables, 'whats_lider') ? `Em caso de imprevisto, fale com a lideranca: ${value(variables, 'whats_lider')}` : '',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_DEMANDA_ARTE:
    case MESSAGE_ID_DEMANDA_VIDEO:
      return [
        `Ola ${nome}, voce recebeu uma nova demanda de midia.`,
        `Demanda: ${value(variables, 'demanda_titulo', '-')}`,
        `Tipo: ${value(variables, 'tipo_tarefa', '-')}`,
        value(variables, 'descricao') ? `Descricao: ${value(variables, 'descricao')}` : '',
        value(variables, 'prazo') || '',
      ].filter(Boolean).join('\n')
    case MESSAGE_ID_KIDS_CHECKIN:
      return [
        `Ola ${value(variables, 'responsavel_nome', nome)}, ${value(variables, 'crianca_nome', 'sua crianca')} fez check-in no Sara Kids.`,
        `Culto: ${value(variables, 'culto_nome', '-')}`,
        `Data: ${value(variables, 'data', '-')}`,
        `Horario: ${value(variables, 'hora_checkin', '-')}`,
      ].join('\n')
    case MESSAGE_ID_KIDS_CHECKOUT:
      return [
        `Ola ${value(variables, 'responsavel_nome', nome)}, ${value(variables, 'crianca_nome', 'sua crianca')} fez check-out no Sara Kids.`,
        `Culto: ${value(variables, 'culto_nome', '-')}`,
        `Data: ${value(variables, 'data', '-')}`,
        `Horario: ${value(variables, 'hora_checkout', '-')}`,
      ].join('\n')
    case MESSAGE_ID_KIDS_ALERTA:
      return `Ola ${value(variables, 'responsavel_nome', nome)}, precisamos da sua presenca no Sara Kids para ${value(variables, 'crianca_nome', 'sua crianca')}.`
    case MESSAGE_ID_KIDS_ENCERRAMENTO:
      return `Ola ${value(variables, 'responsavel_nome', nome)}, o Sara Kids esta encerrando. Por favor, busque ${value(variables, 'crianca_nome', 'sua crianca')}.`
    case MESSAGE_ID_CULTO:
      return `Ola ${nome}, hoje e dia de culto! Esperamos voce na Sara Nossa Terra Alagoas.`
    case MESSAGE_ID_ARENA:
      return `Ola ${nome}, hoje e dia de ARENA! Esperamos voce para esse tempo de comunhao.`
    case MESSAGE_ID_MOMENTO_DEUS:
      return `Ola ${nome}, passando para lembrar do seu Momento com Deus. Separe esse tempo e esteja conosco.`
    default:
      return Object.entries(variables)
        .map(([key, val]) => `${key}: ${val}`)
        .join('\n')
  }
}

/**
 * Envia disparo diretamente via Evolution API com message_id legado e variaveis.
 */
export async function sendDisparoRaw(params: {
  phone: string
  messageId: string
  variables: Record<string, string>
}): Promise<{ success: boolean; statusCode?: number }> {
  if (!isEvolutionConfigured()) return { success: false, statusCode: 400 }

  const text = renderDisparoText(params.messageId, params.variables)
  const result = await sendEvolutionText({ phone: params.phone, text })
  return { success: result.success, statusCode: result.statusCode }
}

/**
 * Envia mensagem apos conversao ou reserva.
 * Retorna resultado para registro em disparos_log; nao propaga erro.
 */
export async function callDisparosWebhook(params: {
  phone: string
  nome: string
  conversionType: ConversionTypeDisparos
  variables?: Record<string, string>  // Variáveis adicionais para templates de reserva
}): Promise<DisparosWebhookResult | null> {
  if (!isEvolutionConfigured()) {
    console.warn('Evolution API nao configurada para disparos de WhatsApp.')
    return null
  }

  let messageId: string
  switch (params.conversionType) {
    case 'accepted':
      messageId = MESSAGE_ID_ACEITOU
      break
    case 'reconciled':
      messageId = MESSAGE_ID_RECONCILIOU
      break
    case 'reserva_recebida':
      messageId = MESSAGE_ID_RESERVA_RECEBIDA
      break
    case 'reserva_pendente_aprovacao':
      messageId = MESSAGE_ID_RESERVA_PENDENTE_APROVACAO
      break
    case 'reserva_aprovada':
      messageId = MESSAGE_ID_RESERVA_APROVADA
      break
    case 'reserva_reprovada':
      messageId = MESSAGE_ID_RESERVA_REPROVADA
      break
    case 'reserva_cancelada':
      messageId = MESSAGE_ID_RESERVA_CANCELADA
      break
    default:
      messageId = MESSAGE_ID_ACEITOU
  }
  
  const nomeReduzido = getNomeExibicao(params.nome)
  const variables = params.variables ? { ...params.variables, nome: nomeReduzido } : { nome: nomeReduzido }
  const phoneE164 = normalizeBrazilPhone(params.phone)

  try {
    const result = await sendDisparoRaw({ phone: params.phone, messageId, variables })
    return { success: result.success, statusCode: result.statusCode, phone: phoneE164, nome: nomeReduzido }
  } catch (err) {
    console.error('Evolution API disparo erro:', err)
    return { success: false, phone: phoneE164, nome: nomeReduzido }
  }
}
