import React from 'react'
import { MapPin, Navigation } from 'lucide-react'
import Button from './Button'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'

export default function LocationSection() {
  return (
    <SectionWrapper id="localizacao" bgColor="gray">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
            <MapPin className="text-sara-red" size={40} />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
            Onde Estamos
          </h2>
          
          <p className="text-lg text-gray-600 mb-4">
            {siteConfig.address.full}
          </p>
        </div>
        
        {/* Mapa */}
        <div className="mb-8 rounded-lg overflow-hidden shadow-xl">
          <iframe
            src={siteConfig.address.embedUrl}
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização Sara Sede Alagoas"
          />
        </div>
        
        <div className="text-center">
          <Button
            variant="primary"
            size="lg"
            asLink
            href={siteConfig.address.mapUrl}
          >
            <Navigation size={20} />
            COMO CHEGAR
          </Button>
        </div>
      </div>
    </SectionWrapper>
  )
}
