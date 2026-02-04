'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface PriceHistoryData {
  date: string
  [retailerName: string]: number | string | null
}

interface PriceChartProps {
  data: PriceHistoryData[]
  retailers: { id: string; name: string; color: string }[]
}

// Culori pentru linii
const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

export function PriceChart({ data, retailers }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Nu există date pentru grafic</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: ro })}
        />
        <YAxis
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickFormatter={(value) => `${value} Lei`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#F3F4F6' }}
          formatter={(value) => [`${(value as number)?.toFixed(2)} Lei`, '']}
          labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: ro })}
        />
        <Legend />
        {retailers.map((retailer, index) => (
          <Line
            key={retailer.id}
            type="monotone"
            dataKey={retailer.name}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
