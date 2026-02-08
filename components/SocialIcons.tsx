import React from 'react'
import { Instagram, Youtube, Facebook } from 'lucide-react'

interface SocialIconsProps {
  instagram?: string
  youtube?: string
  facebook?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function SocialIcons({
  instagram,
  youtube,
  facebook,
  size = 'md',
  className = '',
}: SocialIconsProps) {
  const sizeStyles = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  
  const iconSize = sizeStyles[size]
  
  return (
    <div className={`flex gap-4 ${className}`}>
      {instagram && (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-sara-gray-dark hover:text-sara-red transition-colors duration-300 hover:scale-110 transform"
        >
          <Instagram className={iconSize} />
        </a>
      )}
      {youtube && (
        <a
          href={youtube}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="text-sara-gray-dark hover:text-sara-red transition-colors duration-300 hover:scale-110 transform"
        >
          <Youtube className={iconSize} />
        </a>
      )}
      {facebook && (
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-sara-gray-dark hover:text-sara-red transition-colors duration-300 hover:scale-110 transform"
        >
          <Facebook className={iconSize} />
        </a>
      )}
    </div>
  )
}
