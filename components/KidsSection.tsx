import React from 'react'
import Image from 'next/image'
import { Baby, Shield, BookOpen, Smile } from 'lucide-react'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'

export default function KidsSection() {
  const icons = [Shield, BookOpen, Smile]
  
  return (
    <SectionWrapper id="kids" bgColor="white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
              <Baby className="text-sara-red" size={40} />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
              {siteConfig.kids.title}
            </h2>
            
            <p className="text-lg text-gray-600 mb-8">
              {siteConfig.kids.description}
            </p>
            
            <div className="space-y-4">
              {siteConfig.kids.features.map((feature, index) => {
                const Icon = icons[index] || Shield
                return (
                  <div key={index} className="flex items-start gap-3">
                    <Icon className="text-sara-red flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Imagens */}
          <div className="grid grid-cols-2 gap-4">
            {siteConfig.kids.images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden"
              >
                <Image
                  src={image}
                  alt={`Sara Kids foto ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
