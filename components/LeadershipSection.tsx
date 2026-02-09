'use client'

import React from 'react'
import Image from 'next/image'
import { Instagram } from 'lucide-react'
import Card from './Card'
import SectionWrapper from './SectionWrapper'
import { useSiteConfig } from '@/lib/site-config-context'
import { getStorageUrl } from '@/lib/storage-url'

export default function LeadershipSection() {
  const { config } = useSiteConfig()
  return (
    <SectionWrapper id="lideranca" bgColor="gray">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-4">
          Nossa Liderança
        </h2>
        <p className="text-lg text-sara-gray-light max-w-2xl mx-auto">
          Conheça nossos líderes
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {config.leadership.map((leader) => (
          <Card key={leader.name}>
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden">
                <Image
                  src={getStorageUrl(leader.image)}
                  alt={leader.name}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              </div>
              
              <h3 className="text-2xl font-bold text-sara-gray-dark mb-2">
                {leader.name}
              </h3>
              <p className="text-sara-gray-light mb-4">
                {leader.role}
              </p>
              
              <a
                href={leader.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sara-red hover:text-red-700 transition-colors duration-300"
              >
                <Instagram size={20} />
                <span className="text-sm font-medium">Ver no Instagram</span>
              </a>
            </div>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  )
}
