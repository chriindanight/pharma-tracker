'use client'

import { RefreshCw, Download, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
  showExport?: boolean
  showRefresh?: boolean
  showScrape?: boolean
  onExport?: () => void
  onRefresh?: () => void
  onScrape?: () => Promise<void>
}

export function Header({
  title,
  subtitle,
  showExport = false,
  showRefresh = false,
  showScrape = false,
  onExport,
  onRefresh,
  onScrape,
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isScraping, setIsScraping] = useState(false)

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
  }

  const handleScrape = async () => {
    if (onScrape) {
      setIsScraping(true)
      try {
        await onScrape()
      } finally {
        setIsScraping(false)
      }
    }
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {showScrape && (
          <Button variant="success" onClick={handleScrape} disabled={isScraping}>
            <Play className={`w-4 h-4 mr-2 ${isScraping ? 'animate-pulse' : ''}`} />
            {isScraping ? 'Se colectează...' : 'Colectează prețuri'}
          </Button>
        )}

        {showRefresh && (
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Se actualizează...' : 'Actualizează'}
          </Button>
        )}

        {showExport && (
          <Button variant="primary" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        )}
      </div>
    </div>
  )
}
