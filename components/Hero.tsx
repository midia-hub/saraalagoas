'use client'

import React from 'react'
import { ChevronDown, Instagram, Youtube } from 'lucide-react'
import Button from './Button'
import { siteConfig } from '@/config/site'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export default function Hero() {
  const scrollToContent = () => {
    const element = document.getElementById('cultos')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
  
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Vídeo de fundo */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          aria-label="Vídeo de boas-vindas Sara Sede Alagoas"
          src="/hero-video.mp4"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Overlay */}
        <div className="absolute inset-0 bg-sara-gray-dark/60" />
      </div>
      
      {/* Conteúdo */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          SEJA BEM-VINDO(A)
        </h1>
        <p className="text-2xl md:text-3xl text-white/90 mb-12 font-light">
          Sara Sede Alagoas
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button
            variant="primary"
            size="lg"
            asLink
            href={getWhatsAppUrl(siteConfig.whatsappNumber, siteConfig.whatsappMessages.general)}
          >
            FALE CONOSCO
          </Button>
        </div>
        
        {/* Botões Sociais */}
        <div className="flex items-center justify-center gap-4">
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-sara-red transition-colors duration-300 flex items-center gap-2"
            aria-label="Instagram"
          >
            <Instagram size={24} />
            <span className="text-sm">Instagram</span>
          </a>
          <a
            href={siteConfig.social.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-sara-red transition-colors duration-300 flex items-center gap-2"
            aria-label="YouTube"
          >
            <Youtube size={24} />
            <span className="text-sm">YouTube</span>
          </a>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce-slow"
        aria-label="Rolar para conteúdo"
      >
        <ChevronDown size={40} />
      </button>
    </section>
  )
}
