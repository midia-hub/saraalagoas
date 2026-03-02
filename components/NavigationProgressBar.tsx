'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Configura o NProgress
    NProgress.configure({ 
      showSpinner: false,
      speed: 400,
      minimum: 0.2,
      template: '<div class="bar" role="bar" style="background: #c62737; height: 3px;"></div>'
    })
  }, [])

  useEffect(() => {
    // Quando o pathname ou searchParams mudam, terminamos o progresso
    NProgress.done()
    
    // Pequeno truque para detectar início de navegação via cliques em <a>
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest('a')

      if (
        anchor &&
        anchor.href &&
        anchor.target !== '_blank' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        const href = anchor.getAttribute('href')
        const currentUrl = window.location.pathname + window.location.search
        
        // Se for um link interno e diferente da página atual
        if (href && !href.startsWith('http') && !href.startsWith('#') && href !== currentUrl) {
          NProgress.start()
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    document.addEventListener('touchstart', handleAnchorClick, { passive: true })
    
    return () => {
      document.removeEventListener('click', handleAnchorClick)
      document.removeEventListener('touchstart', handleAnchorClick)
      NProgress.done()
    }
  }, [pathname, searchParams])

  return null
}
