'use client'

import { useState } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface DateRangePickerProps {
  onRangeChange: (startDate: Date, endDate: Date) => void
  defaultRange?: 'today' | '7days' | '30days' | 'custom'
}

export function DateRangePicker({ onRangeChange, defaultRange = 'today' }: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState(defaultRange)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range as typeof defaultRange)
    const now = new Date()

    switch (range) {
      case 'today':
        onRangeChange(startOfDay(now), endOfDay(now))
        break
      case '7days':
        onRangeChange(startOfDay(subDays(now, 7)), endOfDay(now))
        break
      case '30days':
        onRangeChange(startOfDay(subDays(now, 30)), endOfDay(now))
        break
    }
  }

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      onRangeChange(startOfDay(new Date(customStart)), endOfDay(new Date(customEnd)))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleRangeSelect('today')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedRange === 'today'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Azi
        </button>
        <button
          onClick={() => handleRangeSelect('7days')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedRange === '7days'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          7 zile
        </button>
        <button
          onClick={() => handleRangeSelect('30days')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedRange === '30days'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          30 zile
        </button>
        <button
          onClick={() => setSelectedRange('custom')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedRange === 'custom'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Custom
        </button>
      </div>

      {selectedRange === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
          />
          <button
            onClick={handleCustomDateChange}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Aplică
          </button>
        </div>
      )}
    </div>
  )
}
