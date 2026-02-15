import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export default function Card({ children, className = '', hoverable = true }: CardProps) {
  const hoverStyles = hoverable
    ? 'hover:shadow-sara-cta-hover hover:-translate-y-1 hover:border-sara-red transition-all duration-300'
    : ''
  
  return (
    <div className={`sara-card p-6 border border-sara-gray-light/30 ${hoverStyles} ${className}`}>
      {children}
    </div>
  )
}
