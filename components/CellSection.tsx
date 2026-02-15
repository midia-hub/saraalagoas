'use client'

import React from 'react'
import { Heart, TrendingUp, Users } from 'lucide-react'
import Button from './Button'
import SectionWrapper from './SectionWrapper'
import { useSiteConfig } from '@/lib/site-config-context'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export default function CellSection() {
  const { config } = useSiteConfig()
  const icons = [Heart, TrendingUp, Users]
  
  return (
    <SectionWrapper id="celula" bgColor="white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6 uppercase tracking-[2px]">
          {config.cell.title}
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          {config.cell.description}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {config.cell.benefits.map((benefit, index) => {
            const Icon = icons[index]
            return (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-sara-red/10 rounded-full mb-4">
                  <Icon className="text-sara-red" size={28} />
                </div>
                <h3 className="text-xl font-bold text-sara-gray-dark mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>
        
        <Button
          variant="primary"
          size="lg"
          asLink
          href={getWhatsAppUrl(config.whatsappNumber, config.whatsappMessages.cell)}
        >
          QUERO FAZER PARTE DE UMA CÉLULA
        </Button>
      </div>
    </SectionWrapper>
  )
}
