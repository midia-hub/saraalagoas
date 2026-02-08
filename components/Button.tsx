import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  asLink?: boolean
  href?: string
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  asLink = false,
  href,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-300 inline-flex items-center justify-center gap-2'
  
  const variantStyles = {
    primary: 'bg-sara-red text-white hover:bg-red-700 hover:scale-105 shadow-lg hover:shadow-xl',
    secondary: 'bg-sara-gray-dark text-white hover:bg-gray-800 hover:scale-105 shadow-lg hover:shadow-xl',
    outline: 'border-2 border-sara-red text-sara-red hover:bg-sara-red hover:text-white hover:scale-105',
  }
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`
  
  if (asLink && href) {
    return (
      <a
        href={href}
        className={combinedClassName}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  }
  
  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  )
}
