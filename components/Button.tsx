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
  const baseStyles = 'font-bold rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 uppercase tracking-[1px]'
  
  const variantStyles = {
    primary: 'bg-sara-cta text-white hover:-translate-y-[3px] shadow-lg hover:shadow-sara-cta-hover active:-translate-y-[1px]',
    secondary: 'bg-sara-gray-dark text-white hover:-translate-y-[3px] shadow-lg hover:shadow-sara-cta-hover active:-translate-y-[1px]',
    outline: 'border-2 border-sara-red text-sara-red hover:bg-sara-red hover:text-white hover:-translate-y-[3px]',
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
