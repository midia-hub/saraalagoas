import { ROOT_DOMAIN, isLocalHost } from '@/lib/admin-module-routes'

export function getSharedCookieDomainFromHost(hostname: string): string | undefined {
  const host = hostname.split(':')[0].toLowerCase()
  if (!host || isLocalHost(host)) return undefined

  const rootDomain = ROOT_DOMAIN.toLowerCase()
  if (host === rootDomain || host.endsWith(`.${rootDomain}`)) {
    return `.${rootDomain}`
  }

  return undefined
}
