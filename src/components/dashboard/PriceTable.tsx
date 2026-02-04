'use client'

import { Badge } from '@/components/ui/Badge'
import { PackageX, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface PriceData {
  productId: string
  ean: string | null
  productName: string
  prices: {
    retailerId: string
    retailerName: string
    price: number | null
    originalPrice: number | null
    promoPercentage: number | null
    isInStock: boolean
    isLowest?: boolean
    isHighest?: boolean
  }[]
}

interface PriceTableProps {
  data: PriceData[]
  retailers: { id: string; name: string }[]
  isLoading?: boolean
}

export function PriceTable({ data, retailers, isLoading }: PriceTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <PackageX className="w-12 h-12 mb-4" />
        <p>Nu există date de afișat</p>
        <p className="text-sm">Adaugă produse și retaileri pentru a începe monitorizarea</p>
      </div>
    )
  }

  // Găsim cel mai mic și cel mai mare preț pentru fiecare produs
  const dataWithMinMax = data.map((product) => {
    const validPrices = product.prices
      .filter((p) => p.price !== null && p.isInStock)
      .map((p) => p.price as number)

    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null

    return {
      ...product,
      prices: product.prices.map((p) => ({
        ...p,
        isLowest: p.price !== null && p.price === minPrice && validPrices.length > 1,
        isHighest: p.price !== null && p.price === maxPrice && validPrices.length > 1,
      })),
    }
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10">
              EAN
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-[100px] bg-gray-900 z-10">
              Produs
            </th>
            {retailers.map((retailer) => (
              <th
                key={retailer.id}
                className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[140px]"
              >
                {retailer.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {dataWithMinMax.map((product) => (
            <tr key={product.productId} className="hover:bg-gray-800/30">
              <td className="px-4 py-3 text-gray-500 text-xs font-mono sticky left-0 bg-gray-900 z-10">
                {product.ean || '-'}
              </td>
              <td className="px-4 py-3 text-gray-200 font-medium sticky left-[100px] bg-gray-900 z-10 max-w-[200px] truncate">
                {product.productName}
              </td>
              {retailers.map((retailer) => {
                const priceData = product.prices.find((p) => p.retailerId === retailer.id)

                if (!priceData) {
                  return (
                    <td key={retailer.id} className="px-4 py-3 text-center text-gray-600">
                      <Minus className="w-4 h-4 mx-auto" />
                    </td>
                  )
                }

                if (!priceData.isInStock) {
                  return (
                    <td key={retailer.id} className="px-4 py-3 text-center">
                      <span className="text-gray-500 text-xs">Stoc epuizat</span>
                    </td>
                  )
                }

                if (priceData.price === null) {
                  return (
                    <td key={retailer.id} className="px-4 py-3 text-center text-gray-600">
                      <span className="text-xs">N/A</span>
                    </td>
                  )
                }

                return (
                  <td key={retailer.id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-semibold ${
                          priceData.isLowest
                            ? 'text-green-400'
                            : priceData.isHighest
                            ? 'text-red-400'
                            : 'text-gray-200'
                        }`}
                      >
                        {priceData.price.toFixed(2)} Lei
                        {priceData.isLowest && (
                          <TrendingDown className="w-3 h-3 inline ml-1" />
                        )}
                        {priceData.isHighest && (
                          <TrendingUp className="w-3 h-3 inline ml-1" />
                        )}
                      </span>

                      {priceData.promoPercentage && (
                        <Badge variant="promo">-{priceData.promoPercentage}%</Badge>
                      )}

                      {priceData.originalPrice && (
                        <span className="text-xs text-gray-500 line-through">
                          {priceData.originalPrice.toFixed(2)} Lei
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
