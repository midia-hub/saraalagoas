import React from 'react'
import { Calendar, Clock } from 'lucide-react'
import Card from './Card'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'

export default function ServicesSection() {
  return (
    <SectionWrapper id="cultos" bgColor="gray">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-4">
          Cultos Presenciais
        </h2>
        <p className="text-lg text-sara-gray-light max-w-2xl mx-auto">
          Venha experimentar a presença de Deus conosco
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {siteConfig.services.map((service) => (
          <Card key={service.id}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-sara-red/10 rounded-full mb-4">
                <Calendar className="text-sara-red" size={28} />
              </div>
              
              <h3 className="text-xl font-bold text-sara-gray-dark mb-2">
                {service.name}
              </h3>
              
              <div className="flex items-center justify-center gap-2 text-sara-gray-light mb-3">
                <Clock size={16} />
                <span className="text-sm">{service.day} - {service.time}</span>
              </div>
              
              <span className="inline-block bg-sara-red/10 text-sara-red text-xs font-semibold px-3 py-1 rounded-full mb-3">
                {service.type.toUpperCase()}
              </span>
              
              <p className="text-sm text-gray-600">
                {service.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  )
}
