import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  )
}

export function TableHeader({ children, className = '' }: TableProps) {
  return <thead className={`text-xs text-gray-400 uppercase bg-gray-800/50 ${className}`}>{children}</thead>
}

export function TableBody({ children, className = '' }: TableProps) {
  return <tbody className={className}>{children}</tbody>
}

export function TableRow({ children, className = '' }: TableProps) {
  return <tr className={`border-b border-gray-700 hover:bg-gray-800/30 ${className}`}>{children}</tr>
}

export function TableHead({ children, className = '' }: TableProps) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function TableCell({ children, className = '' }: TableProps) {
  return <td className={`px-4 py-3 text-gray-300 ${className}`}>{children}</td>
}
