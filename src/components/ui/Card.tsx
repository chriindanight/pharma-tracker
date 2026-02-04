import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={`text-lg font-semibold text-gray-100 ${className}`}>{children}</h3>
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={className}>{children}</div>
}
