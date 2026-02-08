import React from 'react'
import Link from 'next/link'
import SocialIcons from './SocialIcons'
import { siteConfig } from '@/config/site'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-sara-gray-dark text-white py-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Sobre */}
          <div>
            <h3 className="text-xl font-bold mb-4">Sara Sede Alagoas</h3>
            <p className="text-gray-400 leading-relaxed">
              Um lugar de transformação, crescimento e restauração através do amor de Cristo.
            </p>
          </div>
          
          {/* Endereço */}
          <div>
            <h3 className="text-xl font-bold mb-4">Onde Estamos</h3>
            <p className="text-gray-400 leading-relaxed">
              {siteConfig.address.full}
            </p>
          </div>
          
          {/* Redes Sociais */}
          <div>
            <h3 className="text-xl font-bold mb-4">Redes Sociais</h3>
            <SocialIcons
              instagram={siteConfig.social.instagram}
              youtube={siteConfig.social.youtube}
              size="lg"
              className="justify-start"
            />
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Sara Sede Alagoas. Todos os direitos reservados.
            </p>
            
            <Link
              href="/privacidade"
              className="text-gray-400 hover:text-white text-sm transition-colors duration-300"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
