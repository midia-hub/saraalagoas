import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
}

export function Spinner({ size = 'md', className = '', text }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#c62737]`} />
      {text && <p className="text-sm text-slate-600">{text}</p>}
    </div>
  )
}

export function PageSpinner({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="xl" text={text} />
    </div>
  )
}
