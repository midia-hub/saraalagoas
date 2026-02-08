'use client'

import React, { useState } from 'react'
import { MessageCircle, X, Phone, Heart, Users } from 'lucide-react'
import { useSiteConfig } from '@/lib/site-config-context'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export default function FloatingWhatsApp() {
  const { config } = useSiteConfig()
  const [isOpen, setIsOpen] = useState(false)
  
  const options = [
    {
      icon: Phone,
      label: 'Falar Conosco',
      message: config.whatsappMessages.general,
    },
    {
      icon: Heart,
      label: 'Pedido de Oração',
      message: config.whatsappMessages.prayer,
    },
    {
      icon: Users,
      label: 'Participar de uma Célula',
      message: config.whatsappMessages.cell,
    },
  ]
  
  const handleOptionClick = (message: string) => {
    const url = getWhatsAppUrl(config.whatsappNumber, message)
    window.open(url, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Opções */}
      {isOpen && (
        <div className="mb-4 space-y-2 animate-slide-up">
          {options.map((option, index) => {
            const Icon = option.icon
            return (
              <button
                key={index}
                onClick={() => handleOptionClick(option.message)}
                className="flex items-center gap-3 bg-white text-sara-gray-dark px-4 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Icon size={20} className="text-[#25D366]" />
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
      
      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="WhatsApp"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  )
}
