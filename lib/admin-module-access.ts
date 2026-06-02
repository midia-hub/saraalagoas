/**
 * Mapeamento central: cada módulo do painel → permissões legadas (access_profile_permissions).
 * Deve estar alinhado com app/admin/menu-config.ts.
 */

export type AdminModuleAccessConfig = {
  resourceKey: string
  label: string
  /** page_keys gravados no nível "usuario" */
  usuarioPageKeys: string[]
  /** page_keys antigas/erradas — usadas no GET e removidas no POST */
  legacyAliases?: string[]
}

const LIVRARIA_PAGE_KEYS = [
  'livraria_produtos',
  'livraria_dashboard',
  'livraria_pdv',
  'livraria_vendas',
  'livraria_estoque',
  'livraria_movimentacoes',
  'livraria_importacao',
  'livraria_clientes',
  'livraria_fiado',
  'livraria_reservas',
  'livraria_cupons',
] as const

export const ADMIN_MODULE_ACCESS: Record<string, AdminModuleAccessConfig> = {
  celulas: {
    resourceKey: 'celulas',
    label: 'Células',
    usuarioPageKeys: ['celulas'],
  },
  consolidacao: {
    resourceKey: 'consolidacao',
    label: 'Consolidação',
    usuarioPageKeys: ['consolidacao'],
  },
  livraria: {
    resourceKey: 'livraria_produtos',
    label: 'Livraria',
    usuarioPageKeys: [...LIVRARIA_PAGE_KEYS],
    legacyAliases: ['livraria_pdv'],
  },
  reservas: {
    resourceKey: 'reservas',
    label: 'Reservas',
    usuarioPageKeys: ['reservas'],
  },
  escalas: {
    resourceKey: 'escalas',
    label: 'Escalas',
    usuarioPageKeys: ['escalas'],
  },
  galeria: {
    resourceKey: 'galeria',
    label: 'Mídia e Social',
    usuarioPageKeys: ['galeria', 'instagram'],
  },
  pessoas: {
    resourceKey: 'pessoas',
    label: 'Pessoas',
    usuarioPageKeys: ['pessoas'],
  },
  lideranca: {
    resourceKey: 'lideranca',
    label: 'Liderança',
    usuarioPageKeys: ['lideranca', 'cultos'],
    legacyAliases: ['pessoas'],
  },
  'sara-kids': {
    resourceKey: 'sara_kids',
    label: 'Sara Kids',
    usuarioPageKeys: ['sara_kids'],
    legacyAliases: ['pessoas'],
  },
  'revisao-vidas': {
    resourceKey: 'revisao_vidas',
    label: 'Revisão de Vidas',
    usuarioPageKeys: ['revisao_vidas'],
    legacyAliases: ['consolidacao'],
  },
}

export function getModuleAccessConfig(key: string): AdminModuleAccessConfig | undefined {
  return ADMIN_MODULE_ACCESS[key]
}

/** Todas as page_keys usadas para detectar acesso legado (GET). */
export function getModuleLegacyQueryKeys(config: AdminModuleAccessConfig): string[] {
  return [...new Set([...config.usuarioPageKeys, ...(config.legacyAliases ?? [])])]
}

export function getModuleProfileName(moduleKey: string): string {
  return `Acesso:${moduleKey}`
}
