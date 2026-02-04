import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Obține istoricul prețurilor pentru un produs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('price_history')
    .select(`
      id,
      price,
      original_price,
      promo_percentage,
      is_in_stock,
      scraped_at,
      product_urls!inner (
        id,
        url,
        product_id,
        retailers!inner (
          id,
          name
        )
      )
    `)
    .eq('product_urls.product_id', productId)
    .order('scraped_at', { ascending: true })

  if (startDate) {
    query = query.gte('scraped_at', startDate)
  }

  if (endDate) {
    query = query.lte('scraped_at', endDate)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Formatăm datele pentru grafic
  const chartData = new Map<string, Record<string, number | string | null>>()

  data?.forEach((item: Record<string, unknown>) => {
    const scrapedAt = item.scraped_at as string
    const date = scrapedAt.split('T')[0] // Doar data, fără timp
    const productUrls = item.product_urls as {
      retailers: { name: string }
    }
    const retailerName = productUrls.retailers.name

    if (!chartData.has(date)) {
      chartData.set(date, { date })
    }

    const entry = chartData.get(date)!
    // Dacă avem mai multe valori în aceeași zi, păstrăm ultima
    entry[retailerName] = item.price as number | null
  })

  // Sortăm după dată
  const sortedData = Array.from(chartData.values()).sort(
    (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
  )

  return NextResponse.json(sortedData)
}
