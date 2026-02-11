'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Shield } from 'lucide-react'
import Image from 'next/image'
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
      const headerHeight = 80
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Image
              src={getStorageUrl(LOGO_PATH)}
              alt="Sara Sede Alagoas"
              width={220}
              height={88}
              priority
              className="h-16 w-auto"
            />
          </div>
          
          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-6">
            {config.menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sara-gray-dark hover:text-sara-red font-medium transition-colors duration-300"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sara-gray-dark hover:text-sara-red font-medium transition-colors duration-300"
            >
              <Shield size={18} aria-hidden />
              Admin
            </Link>
          </nav>
          
          {/* Botão Menu Mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-sara-gray-dark hover:text-sara-red transition-colors"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      
      {/* Menu Mobile */}
      <div
        className={`lg:hidden fixed inset-0 top-20 bg-white z-40 transition-transform duration-300 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col p-6 gap-4">
          {config.menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="text-sara-gray-dark hover:text-sara-red font-medium text-lg py-3 text-left transition-colors duration-300"
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/admin"
            onClick={() => setIsMenuOpen(false)}
            className="inline-flex items-center gap-2 text-sara-gray-dark hover:text-sara-red font-medium text-lg py-3 text-left transition-colors duration-300"
          >
            <Shield size={20} aria-hidden />
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}
