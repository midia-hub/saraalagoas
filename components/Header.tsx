'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Shield } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteConfig } from '@/lib/site-config-context'
import { getStorageUrl } from '@/lib/storage-url'

const LOGO_PATH = 'brand/logo.png'

export default function Header() {
  const { config } = useSiteConfig()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const headerHeight = 90
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - headerHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })

      setIsMenuOpen(false)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled
        ? 'bg-white/80 backdrop-blur-md shadow-lg py-2'
        : 'bg-white py-4 shadow-sm'
        }`}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sara-red to-transparent opacity-30" aria-hidden />

      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 transition-transform hover:scale-105 duration-300">
            <Image
              src={getStorageUrl(LOGO_PATH)}
              alt="Sara Sede Alagoas"
              width={200}
              height={80}
              priority={true}
              className="h-14 md:h-16 w-auto object-contain"
            />
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-2">
            {config.menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="relative px-4 py-2 text-sara-gray-dark hover:text-sara-red font-semibold transition-all duration-300 uppercase tracking-wider text-sm group"
              >
                {item.label}
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-sara-red transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}
            
            <Link
              href="/admin"
              className="flex items-center gap-2 px-5 py-2.5 bg-sara-gray-dark text-white rounded-full font-bold hover:bg-sara-red transition-all duration-300 uppercase tracking-wider text-xs shadow-md hover:shadow-lg"
            >
              <Shield size={14} />
              Painel
            </Link>
          </nav>

          {/* Botão Menu Mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden flex items-center justify-center w-11 h-11 text-sara-gray-dark hover:text-sara-red bg-gray-100 rounded-full transition-all"
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu Mobile - "Modal" da página inicial */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden fixed inset-0 top-0 z-[90] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed right-0 top-0 bottom-0 w-[80%] max-w-sm z-[100] bg-white shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b">
                  <span className="font-bold text-sara-red uppercase tracking-widest text-lg">Menu</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-8 px-6">
                  <div className="flex flex-col gap-2">
                    {config.menuItems.map((item, index) => (
                      <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className="text-sara-gray-dark hover:text-sara-red font-bold text-xl py-4 border-b border-gray-100 text-left transition-all flex items-center justify-between group"
                      >
                        {item.label}
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-sara-red group-hover:text-white transition-colors">
                          <Shield size={16} className="opacity-0 group-hover:opacity-100" />
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: config.menuItems.length * 0.1 }}
                    className="mt-12 space-y-3"
                  >
                    
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-3 w-full bg-sara-gray-dark text-white font-bold py-5 rounded-2xl hover:bg-sara-red transition-all shadow-xl"
                    >
                      <Shield size={20} />
                      PAINEL DE GESTÃO
                    </Link>
                  </motion.div>
                </nav>

                <div className="p-8 border-t bg-gray-50/50">
                  <p className="text-center text-xs text-gray-400 font-medium uppercase tracking-widest">
                    Sara Sede Alagoas
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
