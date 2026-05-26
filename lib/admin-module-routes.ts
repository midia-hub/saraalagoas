export interface AdminModuleRoute {
  id: string
  subdomain: string
  mainHref: string
  basePaths: string[]
}

export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'saraalagoas.com'

export const adminModuleRoutes = [
  {
    id: 'reservas',
    subdomain: 'reservas',
    mainHref: '/admin/reservas/dashboard',
    basePaths: ['/admin/reservas'],
  },
  {
    id: 'lideranca',
    subdomain: 'lideranca',
    mainHref: '/admin/lideranca',
    basePaths: ['/admin/lideranca'],
  },
  {
    id: 'escalas',
    subdomain: 'escalas',
    mainHref: '/admin/escalas/dashboard',
    basePaths: ['/admin/escalas'],
  },
  {
    id: 'celulas',
    subdomain: 'celulas',
    mainHref: '/admin/celulas/dashboard',
    basePaths: ['/admin/celulas'],
  },
  {
    id: 'consolidacao',
    subdomain: 'consolidacao',
    mainHref: '/admin/consolidacao',
    basePaths: ['/admin/consolidacao'],
  },
  {
    id: 'revisao-vidas',
    subdomain: 'revisao-vidas',
    mainHref: '/admin/revisao-vidas',
    basePaths: ['/admin/revisao-vidas'],
  },
  {
    id: 'livraria',
    subdomain: 'livraria',
    mainHref: '/admin/livraria/dashboard',
    basePaths: ['/admin/livraria'],
  },
  {
    id: 'midia',
    subdomain: 'midia',
    mainHref: '/admin/midia',
    basePaths: [
      '/admin/galeria',
      '/admin/midia',
      '/admin/instagram',
      '/admin/instancias',
      '/admin/rekognition',
      '/admin/upload',
    ],
  },
  {
    id: 'pessoas',
    subdomain: 'pessoas',
    mainHref: '/admin/pessoas/dashboard',
    basePaths: ['/admin/pessoas'],
  },
  {
    id: 'sara-kids',
    subdomain: 'kids',
    mainHref: '/admin/sara-kids',
    basePaths: ['/admin/sara-kids'],
  },
  {
    id: 'configuracoes',
    subdomain: 'config',
    mainHref: '/admin/configuracoes',
    basePaths: [
      '/admin/configuracoes',
      '/admin/roles',
      '/admin/settings',
      '/admin/usuarios',
      '/admin/conta',
      '/admin/criar-acesso',
      '/admin/midia/ia-config',
      '/admin/consolidacao/cadastros/api-disparos',
    ],
  },
] as const satisfies readonly AdminModuleRoute[]

export type AdminModuleRouteId = (typeof adminModuleRoutes)[number]['id']

export function getAdminModuleRoute(id: string): AdminModuleRoute | undefined {
  return adminModuleRoutes.find((route) => route.id === id)
}

export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  )
}

export function getModuleRootHref(module: {
  id: string
  mainHref?: string
  subdomain?: string
}): string {
  const mainHref = module.mainHref ?? '/admin'
  if (typeof window === 'undefined') return mainHref

  const hostname = window.location.hostname
  if (isLocalHost(hostname) || !module.subdomain) return mainHref

  return `https://${module.subdomain}.${ROOT_DOMAIN}`
}
