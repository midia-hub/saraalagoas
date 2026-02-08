import React from 'react'
import { Heart } from 'lucide-react'
import Button from './Button'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export default function PrayerSection() {
  return (
    <SectionWrapper id="oracao" bgColor="gray">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
          <Heart className="text-sara-red" size={40} />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
          Podemos orar por você?
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          Acreditamos no poder da oração. Se você está passando por um momento difícil ou tem um pedido especial, 
          queremos orar por você. Compartilhe seu pedido conosco e vamos juntos buscar a Deus.
        </p>
        
        <Button
          variant="primary"
          size="lg"
          asLink
          href={getWhatsAppUrl(siteConfig.whatsappNumber, siteConfig.whatsappMessages.prayer)}
        >
          QUERO FAZER MEU PEDIDO DE ORAÇÃO
        </Button>
      </div>
    </SectionWrapper>
  )
}
