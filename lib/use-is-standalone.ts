import { useEffect, useState } from 'react'

/** Detecta se o app está rodando instalado (PWA), fora do navegador. */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    const update = () => setIsStandalone(mediaQuery.matches || iosStandalone)
    update()

    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isStandalone
}
