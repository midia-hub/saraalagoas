'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useIsStandalone } from '@/lib/use-is-standalone'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const IOS_HINT_DISMISSED_KEY = 'livraria-pdv-ios-install-hint-dismissed'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallPwaButton() {
  const isStandalone = useIsStandalone()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    if (isIos() && !window.localStorage.getItem(IOS_HINT_DISMISSED_KEY)) {
      setShowIosHint(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [isStandalone])

  if (isStandalone) return null

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function dismissIosHint() {
    window.localStorage.setItem(IOS_HINT_DISMISSED_KEY, '1')
    setShowIosHint(false)
  }

  if (deferredPrompt) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className="flex-shrink-0"
      >
        <Download size={16} />
        Instalar app
      </Button>
    )
  }

  if (showIosHint) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span>Toque em Compartilhar → Adicionar à Tela de Início para instalar</span>
        <button
          type="button"
          onClick={dismissIosHint}
          aria-label="Dispensar"
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return null
}
