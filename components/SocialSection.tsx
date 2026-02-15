'use client'

import React from 'react'
import { Instagram, Youtube } from 'lucide-react'
import SectionWrapper from './SectionWrapper'
import { useSiteConfig } from '@/lib/site-config-context'

export default function SocialSection() {
  const { config } = useSiteConfig()
  const socialLinks = [
    {
      name: 'Instagram',
      icon: Instagram,
      url: config.social.instagram,
      color: 'hover:bg-pink-600',
    },
    {
      name: 'YouTube',
      icon: Youtube,
      url: config.social.youtube,
      color: 'hover:bg-red-600',
    },
  ]
  
  return (
    <SectionWrapper id="redes" bgColor="white">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6 uppercase tracking-[2px]">
          Nossas Redes Sociais
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          Fique por dentro de tudo que acontece na Sara Sede Alagoas
        </p>
        
        <div className="flex flex-wrap justify-center gap-6">
          {socialLinks.map((social) => {
            const Icon = social.icon
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 bg-sara-gray-dark text-white px-8 py-4 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-[3px] hover:shadow-sara-cta-hover uppercase tracking-[1px] font-bold ${social.color}`}
                aria-label={social.name}
              >
                <Icon size={28} />
                <span className="font-semibold text-lg">{social.name}</span>
              </a>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
