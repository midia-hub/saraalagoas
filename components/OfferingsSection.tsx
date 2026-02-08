import React from 'react'
import { DollarSign } from 'lucide-react'
import Button from './Button'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'

export default function OfferingsSection() {
  return (
    <SectionWrapper id="dizimos" bgColor="gray">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
          <DollarSign className="text-sara-red" size={40} />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
          {siteConfig.offerings.title}
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          {siteConfig.offerings.description}
        </p>
        
        {siteConfig.offerings.url && (
          <Button
            variant="primary"
            size="lg"
            asLink
            href={siteConfig.offerings.url}
          >
            CONTRIBUIR
          </Button>
        )}
        
        {!siteConfig.offerings.url && (
          <p className="text-sm text-sara-gray-light italic">
            Em breve disponibilizaremos o link para contribuições online
          </p>
        )}
      </div>
    </SectionWrapper>
  )
}
