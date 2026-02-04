'use client'

import { Card } from '@/components/ui/Card'
import { Package, Store, TrendingDown, AlertTriangle } from 'lucide-react'

interface StatsCardsProps {
  totalProducts: number
  totalRetailers: number
  lowestPricesCount: number
  outOfStockCount: number
}

export function StatsCards({
  totalProducts,
  totalRetailers,
  lowestPricesCount,
  outOfStockCount,
}: StatsCardsProps) {
  const stats = [
    {
      name: 'Produse monitorizate',
      value: totalProducts,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      name: 'Retaileri',
      value: totalRetailers,
      icon: Store,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      name: 'Prețuri cele mai mici',
      value: lowestPricesCount,
      icon: TrendingDown,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      name: 'Stoc epuizat',
      value: outOfStockCount,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.name} className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${stat.bgColor}`}>
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.name}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
