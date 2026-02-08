import React from 'react'

interface SectionWrapperProps {
  id?: string
  bgColor?: 'white' | 'gray' | 'dark'
  children: React.ReactNode
  className?: string
}

export default function SectionWrapper({
  id,
  bgColor = 'white',
  children,
  className = '',
}: SectionWrapperProps) {
  const bgStyles = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    dark: 'bg-sara-gray-dark text-white',
  }
  
  return (
    <section
      id={id}
      className={`py-16 md:py-24 ${bgStyles[bgColor]} ${className}`}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {children}
      </div>
    </section>
  )
}
