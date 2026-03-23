import OpenAI from 'openai'
import { supabaseServer } from '@/lib/supabase-server'

/** Bucket Storage das artes / repositório da equipe IA */
export const REPO_BUCKET = 'equipe_ia_arts'

export const REPO_CATEGORIAS = [
  { id: 'identidade_visual', label: 'Identidade visual' },
  { id: 'paleta_tipografia', label: 'Paleta e tipografia' },
  { id: 'composicao_feed', label: 'Composição (feed)' },
  { id: 'composicao_story', label: 'Composição (story/reels)' },
  { id: 'evento_campanha', label: 'Evento / campanha' },
  { id: 'logo_marca', label: 'Logo / marca' },
  { id: 'referencia_ia', label: 'Referência para IA' },
  { id: 'geral', label: 'Geral' },
] as const

export type RepoCategoriaId = (typeof REPO_CATEGORIAS)[number]['id']

export type RepoPublico = 'diretor_arte' | 'designer'

export interface RepoMeta {
  descricao: string
  categoria: RepoCategoriaId | string
  publico: RepoPublico[]
  palavras_chave: string[]
  /** Linha racional / diretriz visual em uma frase */
  linha_criativa: string
  gerado_em: string
  arquivo_imagem: string
  /** O que transportar para as próximas demandas (tom, hierarquia, intenção) */
  contexto_proximas_criacoes?: string
  /** Lista do que manter consistente nas próximas peças */
  elementos_manter?: string[]
  /** Armadilhas ou o que não repetir */
  evitar?: string[]
  /** Parágrafo pronto para orientar Diretor de Arte / Designer / IA */
  briefing_para_ia?: string
  /** Trecho em inglês para modelos de geração de imagem (sem texto na arte) */
  prompt_sugerido_en?: string
}

export function metaPathFromImagePath(imagePath: string): string {
  return imagePath.replace(/\.(png|jpe?g|webp)$/i, '.json')
}

export function isImageRepoFile(name: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(name) && !name.startsWith('.')
}

export function mimeTypeFromRepoPath(path: string): string {
  if (/\.png$/i.test(path)) return 'image/png'
  if (/\.webp$/i.test(path)) return 'image/webp'
  return 'image/jpeg'
}

/** Extrai path `repositorio/...` a partir da URL pública do Supabase Storage */
export function imagePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const u = new URL(publicUrl)
    const marker = `/object/public/${bucket}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}

function normalizePublico(raw: unknown): RepoPublico[] {
  const allowed: RepoPublico[] = ['diretor_arte', 'designer']
  if (!Array.isArray(raw)) return ['diretor_arte', 'designer']
  const out = raw.filter((x): x is RepoPublico => allowed.includes(x as RepoPublico))
  return out.length > 0 ? out : ['diretor_arte', 'designer']
}

export function parseRepoMetaJson(raw: string): Partial<RepoMeta> | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    return {
      descricao:                   typeof o.descricao === 'string' ? o.descricao : '',
      categoria:                   typeof o.categoria === 'string' ? o.categoria : 'geral',
      publico:                     normalizePublico(o.publico),
      palavras_chave:              Array.isArray(o.palavras_chave) ? o.palavras_chave.map(String) : [],
      linha_criativa:              typeof o.linha_criativa === 'string' ? o.linha_criativa : '',
      gerado_em:                   typeof o.gerado_em === 'string' ? o.gerado_em : '',
      arquivo_imagem:              typeof o.arquivo_imagem === 'string' ? o.arquivo_imagem : '',
      contexto_proximas_criacoes:    typeof o.contexto_proximas_criacoes === 'string' ? o.contexto_proximas_criacoes : undefined,
      elementos_manter:            Array.isArray(o.elementos_manter) ? o.elementos_manter.map(String) : undefined,
      evitar:                      Array.isArray(o.evitar) ? o.evitar.map(String) : undefined,
      briefing_para_ia:            typeof o.briefing_para_ia === 'string' ? o.briefing_para_ia : undefined,
      prompt_sugerido_en:          typeof o.prompt_sugerido_en === 'string' ? o.prompt_sugerido_en : undefined,
    }
  } catch {
    return null
  }
}

const CATEGORIA_IDS = REPO_CATEGORIAS.map((c) => c.id).join('|')

/** Modelo com visão para análise de referências (pode sobrescrever via env) */
const VISION_ANALYSIS_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o'

export async function gerarMetaComVisao(
  client: OpenAI,
  imageBase64: string,
  mimeType: string,
  arquivoImagem: string,
): Promise<Omit<RepoMeta, 'gerado_em' | 'arquivo_imagem'> & { categoria: RepoCategoriaId }> {
  const schemaHint = `{
  "descricao": "string — pt-BR, 4 a 8 frases: o que a imagem comunica, composição, luz, textura, hierarquia visual, paleta, tipografia, clima emocional, adequação a comunicação de igreja evangélica brasileira",
  "categoria": "uma destas: ${CATEGORIA_IDS}",
  "publico": ["diretor_arte" e/ou "designer"] — diretor_arte: ajuda conceito, paleta, mensagem; designer: pode ser usada como referência visual para gerar novas artes",
  "palavras_chave": ["8 a 14 termos em pt-BR para busca e consistência"],
  "linha_criativa": "string — uma frase que resume a linha racional visual",
  "contexto_proximas_criacoes": "string — parágrafo (6 a 12 frases) explicando o que as PRÓXIMAS peças devem REUTILIZAR desta referência (tom, ritmo, proporções, tratamento de foto/ilustração, sensação de marca). Foco em replicar consistência, não em descrever de novo a imagem atual.",
  "elementos_manter": ["3 a 10 itens objetivos: ex. 'fundo escuro com ruído', 'título em caixa alta branca', 'margens amplas', ...]",
  "evitar": ["2 a 8 itens: o que NÃO repetir ou armadilhas (ex. poluição visual, contraste excessivo, estilo datado) se forem indesejados para a rede"],
  "briefing_para_ia": "string — parágrafo em pt-BR pronto para orientar geração futura (Diretor de Arte + Designer), com diretrizes claras",
  "prompt_sugerido_en": "string — 80 a 220 palavras em INGLÊS para modelos de imagem: estilo, iluminação, composição, materiais, mood. Sem texto sobre imagem (no overlaid text). Tom profissional para igreja no Brasil."
}`

  const completion = await client.chat.completions.create({
    model:   VISION_ANALYSIS_MODEL,
    max_tokens: 2800,
    temperature: 0.25,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Você é diretor de arte sênior e especialista em brand systems para igrejas evangélicas no Brasil. ' +
          'Analise a imagem e preencha o JSON com riqueza de detalhe. O objetivo é que outra equipe e outra IA usem este JSON ' +
          'meses depois para manter a mesma linha visual e raciocínio criativo. ' +
          'Responda APENAS com JSON válido (sem markdown) conforme o schema.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `Tarefa: análise completa para repositório de referências visuais.\n\n` +
              `Preencha o JSON:\n${schemaHint}\n\nArquivo: ${arquivoImagem}`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
          },
        ],
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ''
  const parsed = safeParseJSON(raw)
  const cat = String(parsed.categoria ?? 'geral')
  const categoria = (REPO_CATEGORIAS.some((c) => c.id === cat) ? cat : 'geral') as RepoCategoriaId

  const elementos_manter = Array.isArray(parsed.elementos_manter)
    ? parsed.elementos_manter.map((x) => String(x).slice(0, 200)).slice(0, 14)
    : []
  const evitar = Array.isArray(parsed.evitar)
    ? parsed.evitar.map((x) => String(x).slice(0, 200)).slice(0, 12)
    : []

  return {
    descricao: String(parsed.descricao ?? '').slice(0, 6000),
    categoria,
    publico: normalizePublico(parsed.publico),
    palavras_chave: Array.isArray(parsed.palavras_chave)
      ? parsed.palavras_chave.map((x) => String(x).slice(0, 80)).slice(0, 16)
      : [],
    linha_criativa: String(parsed.linha_criativa ?? '').slice(0, 500),
    contexto_proximas_criacoes: String(parsed.contexto_proximas_criacoes ?? '').slice(0, 8000),
    elementos_manter: elementos_manter.length > 0 ? elementos_manter : undefined,
    evitar:           evitar.length > 0 ? evitar : undefined,
    briefing_para_ia: String(parsed.briefing_para_ia ?? '').slice(0, 6000),
    prompt_sugerido_en: String(parsed.prompt_sugerido_en ?? '').slice(0, 12000),
  }
}

function safeParseJSON(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function loadReferenciasPorUrls(
  publicUrls: string[],
): Promise<Array<{ url: string; path: string; meta: Partial<RepoMeta> | null }>> {
  const out: Array<{ url: string; path: string; meta: Partial<RepoMeta> | null }> = []
  for (const url of publicUrls) {
    const path = imagePathFromPublicUrl(url, REPO_BUCKET)
    if (!path) continue
    const metaPath = metaPathFromImagePath(path)
    const { data, error } = await supabaseServer.storage.from(REPO_BUCKET).download(metaPath)
    let meta: Partial<RepoMeta> | null = null
    if (!error && data) {
      try {
        meta = parseRepoMetaJson(await data.text())
      } catch { /* ignore */ }
    }
    out.push({ url, path, meta })
  }
  return out
}

export function narrativaReferenciasParaAgentes(
  items: Array<{ url: string; meta: Partial<RepoMeta> | null; path: string }>,
  agente: RepoPublico,
): string {
  const lines: string[] = []
  for (const it of items) {
    const pub = it.meta?.publico ?? ['diretor_arte', 'designer']
    if (!pub.includes(agente)) continue
    const m = it.meta
    const hasCore =
      (m?.descricao && m.descricao.length > 0) ||
      (m?.linha_criativa && m.linha_criativa.length > 0) ||
      (m?.briefing_para_ia && m.briefing_para_ia.length > 0) ||
      (m?.contexto_proximas_criacoes && m.contexto_proximas_criacoes.length > 0)
    if (!hasCore) continue
    const cat = REPO_CATEGORIAS.find((c) => c.id === m.categoria)?.label ?? m.categoria ?? ''
    const kw = (m.palavras_chave ?? []).slice(0, 10).join(', ')
    const bloco: string[] = [
      `— Ref. (${cat}): ${m.linha_criativa || m.descricao?.slice(0, 220) || m.briefing_para_ia?.slice(0, 220)}`,
    ]
    if (m.descricao && m.linha_criativa) bloco.push(`Detalhes: ${m.descricao}`)
    if (m.contexto_proximas_criacoes) bloco.push(`Contexto para próximas criações: ${m.contexto_proximas_criacoes}`)
    if (m.briefing_para_ia) bloco.push(`Briefing criativo: ${m.briefing_para_ia}`)
    if (m.elementos_manter?.length) bloco.push(`Manter: ${m.elementos_manter.join('; ')}`)
    if (m.evitar?.length) bloco.push(`Evitar: ${m.evitar.join('; ')}`)
    if (m.prompt_sugerido_en && agente === 'designer') {
      bloco.push(`(EN) Sugestão de prompt: ${m.prompt_sugerido_en.slice(0, 1200)}${m.prompt_sugerido_en.length > 1200 ? '…' : ''}`)
    }
    if (kw) bloco.push(`Palavras-chave: ${kw}`)
    bloco.push(`URL: ${it.url}`)
    lines.push(bloco.filter(Boolean).join('\n'))
  }
  if (lines.length === 0) return ''
  return agente === 'diretor_arte'
    ? `\n\n--- REFERÊNCIAS DO REPOSITÓRIO DE DESIGN (alinhar conceito e paleta) ---\n${lines.join('\n\n')}`
    : `\n\n--- ESTILO DAS REFERÊNCIAS SELECIONADAS (manter linha visual) ---\n${lines.join('\n\n')}`
}
