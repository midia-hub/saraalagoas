export type TipoCampo =
  | 'texto_curto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'numero'
  | 'data'
  | 'multipla_escolha'
  | 'checkbox_multiplo'
  | 'dropdown'
  | 'arquivo'
  | 'secao'

export type OperadorCondicional = 'igual' | 'diferente' | 'preenchido' | 'vazio'

export interface CondicionalCampo {
  campo_id: string
  operador: OperadorCondicional
  valor?: string
}

export interface CampoFormulario {
  id: string
  tipo: TipoCampo
  label: string
  obrigatorio: boolean
  placeholder?: string
  descricao?: string
  opcoes?: string[]
  condicional?: CondicionalCampo | null
}

export interface SchemaFormulario {
  campos: CampoFormulario[]
}

export interface ConfigFormulario {
  limite_respostas: number | null
  data_encerramento: string | null
  mensagem_sucesso: string
}

export interface Formulario {
  id: string
  titulo: string
  descricao: string | null
  slug: string
  schema: SchemaFormulario
  config: ConfigFormulario
  ativo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FormularioResposta {
  id: string
  formulario_id: string
  dados: Record<string, unknown>
  created_at: string
}

export const TIPO_CAMPO_META: Record<TipoCampo, { label: string; icone: string; grupo: string }> = {
  texto_curto:      { label: 'Texto curto',      icone: 'Type',         grupo: 'Básico'      },
  texto_longo:      { label: 'Texto longo',       icone: 'AlignLeft',    grupo: 'Básico'      },
  email:            { label: 'E-mail',            icone: 'Mail',         grupo: 'Básico'      },
  telefone:         { label: 'Telefone',          icone: 'Phone',        grupo: 'Básico'      },
  numero:           { label: 'Número',            icone: 'Hash',         grupo: 'Básico'      },
  data:             { label: 'Data',              icone: 'Calendar',     grupo: 'Básico'      },
  multipla_escolha: { label: 'Múltipla escolha',  icone: 'CircleDot',    grupo: 'Seleção'     },
  checkbox_multiplo:{ label: 'Caixas de seleção', icone: 'CheckSquare',  grupo: 'Seleção'     },
  dropdown:         { label: 'Lista dropdown',    icone: 'ChevronDown',  grupo: 'Seleção'     },
  arquivo:          { label: 'Upload de arquivo', icone: 'Paperclip',    grupo: 'Avançado'    },
  secao:            { label: 'Seção',             icone: 'Minus',        grupo: 'Layout'      },
}

export function defaultConfig(): ConfigFormulario {
  return {
    limite_respostas: null,
    data_encerramento: null,
    mensagem_sucesso: 'Obrigado pela sua resposta!',
  }
}

export function defaultSchema(): SchemaFormulario {
  return { campos: [] }
}

export function newCampo(tipo: TipoCampo): CampoFormulario {
  const base: CampoFormulario = {
    id: crypto.randomUUID(),
    tipo,
    label: TIPO_CAMPO_META[tipo].label,
    obrigatorio: false,
    condicional: null,
  }
  if (['multipla_escolha', 'checkbox_multiplo', 'dropdown'].includes(tipo)) {
    base.opcoes = ['Opção 1', 'Opção 2']
  }
  return base
}

export function generateSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function isCampoVisible(
  campo: CampoFormulario,
  respostas: Record<string, unknown>
): boolean {
  if (!campo.condicional) return true
  const { campo_id, operador, valor } = campo.condicional
  const respostaAlvo = respostas[campo_id]

  switch (operador) {
    case 'preenchido':
      return respostaAlvo != null && respostaAlvo !== '' && !(Array.isArray(respostaAlvo) && respostaAlvo.length === 0)
    case 'vazio':
      return respostaAlvo == null || respostaAlvo === '' || (Array.isArray(respostaAlvo) && respostaAlvo.length === 0)
    case 'igual':
      return String(respostaAlvo ?? '') === (valor ?? '')
    case 'diferente':
      return String(respostaAlvo ?? '') !== (valor ?? '')
    default:
      return true
  }
}
