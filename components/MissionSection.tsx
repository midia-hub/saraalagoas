'use client'

import React, { useState } from 'react'
import { Target, ChevronDown, ChevronUp } from 'lucide-react'
import SectionWrapper from './SectionWrapper'
import { siteConfig } from '@/config/site'

export default function MissionSection() {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <SectionWrapper id="missao" bgColor="white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
            <Target className="text-sara-red" size={40} />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
            Missão e Visão
          </h2>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-8">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            {siteConfig.mission.short}
          </p>
          
          {isExpanded && (
            <div className="text-lg text-gray-700 leading-relaxed whitespace-pre-line animate-fade-in">
              {siteConfig.mission.full}
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sara-red hover:text-red-700 font-semibold transition-colors duration-300 mx-auto mt-6"
          >
            {isExpanded ? (
              <>
                <span>Ler menos</span>
                <ChevronUp size={20} />
              </>
            ) : (
              <>
                <span>Ler mais</span>
                <ChevronDown size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </SectionWrapper>
  )
}
