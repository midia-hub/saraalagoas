import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export default function Card({ children, className = '', hoverable = true }: CardProps) {
  const hoverStyles = hoverable
    ? 'hover:shadow-xl hover:-translate-y-1 hover:border-sara-red transition-all duration-300'
    : ''
  
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${hoverStyles} ${className}`}>
      {children}
    </div>
  )
}
