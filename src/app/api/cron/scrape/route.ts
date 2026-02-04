import { NextRequest, NextResponse } from 'next/server'
import { runScraper } from '@/lib/scraper'

// Verificăm că request-ul vine de la Vercel Cron
function isValidCronRequest(request: NextRequest): boolean {
  // În development, permitem toate request-urile
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // Verificăm header-ul de autorizare de la Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Verificăm și header-ul specific Vercel
  const vercelCronHeader = request.headers.get('x-vercel-cron')
  if (vercelCronHeader) {
    return true
  }

  return false
}

// POST - Rulează scraper-ul manual
export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting manual scrape...')
    const result = await runScraper()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET - Pentru Vercel Cron (cron jobs folosesc GET)
export async function GET(request: NextRequest) {
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting scheduled scrape...')
    const result = await runScraper()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
