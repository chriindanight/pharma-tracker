import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// GET - Export Excel
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Obținem retailerii
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (!retailers) {
    return NextResponse.json({ error: 'No retailers found' }, { status: 404 })
  }

  // Obținem prețurile
  let pricesQuery = supabaseAdmin
    .from('price_history')
    .select(`
      price,
      original_price,
      promo_percentage,
      is_in_stock,
      scraped_at,
      product_urls!inner (
        product_id,
        retailer_id,
        products!inner (
          id,
          name,
          ean,
          is_active
        ),
        retailers!inner (
          id,
          name,
          is_active
        )
      )
    `)
    .eq('product_urls.products.is_active', true)
    .eq('product_urls.retailers.is_active', true)

  if (startDate && endDate) {
    pricesQuery = pricesQuery.gte('scraped_at', startDate).lte('scraped_at', endDate)
  }

  const { data: prices } = await pricesQuery

  if (!prices || prices.length === 0) {
    return NextResponse.json({ error: 'No data to export' }, { status: 404 })
  }

  // Agregăm datele
  const aggregated = new Map<string, {
    ean: string | null
    productName: string
    prices: Map<string, { price: number | null; promo: number | null; inStock: boolean }>
  }>()

  prices.forEach((item: Record<string, unknown>) => {
    const productUrls = item.product_urls as {
      products: { id: string; name: string; ean: string | null }
      retailers: { id: string; name: string }
    }

    const productId = productUrls.products.id

    if (!aggregated.has(productId)) {
      aggregated.set(productId, {
        ean: productUrls.products.ean,
        productName: productUrls.products.name,
        prices: new Map(),
      })
    }

    const entry = aggregated.get(productId)!
    const retailerName = productUrls.retailers.name

    // Păstrăm ultimul preț (sau media dacă este perioadă)
    if (!entry.prices.has(retailerName)) {
      entry.prices.set(retailerName, {
        price: item.price as number | null,
        promo: item.promo_percentage as number | null,
        inStock: item.is_in_stock as boolean,
      })
    }
  })

  // Creăm Excel
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Prețuri
  const pricesData: Record<string, string | number | null>[] = []
  aggregated.forEach((product) => {
    const row: Record<string, string | number | null> = {
      EAN: product.ean,
      Produs: product.productName,
    }

    retailers.forEach((retailer) => {
      const priceData = product.prices.get(retailer.name)
      if (priceData) {
        if (!priceData.inStock) {
          row[retailer.name] = 'Stoc epuizat'
        } else {
          row[retailer.name] = priceData.price
        }
      } else {
        row[retailer.name] = '-'
      }
    })

    pricesData.push(row)
  })

  const pricesSheet = XLSX.utils.json_to_sheet(pricesData)
  XLSX.utils.book_append_sheet(workbook, pricesSheet, 'Preturi')

  // Sheet 2: Promoții
  const promoData: Record<string, string | number | null>[] = []
  aggregated.forEach((product) => {
    const row: Record<string, string | number | null> = {
      EAN: product.ean,
      Produs: product.productName,
    }

    retailers.forEach((retailer) => {
      const priceData = product.prices.get(retailer.name)
      if (priceData && priceData.promo) {
        row[retailer.name] = `-${priceData.promo}%`
      } else {
        row[retailer.name] = '-'
      }
    })

    promoData.push(row)
  })

  const promoSheet = XLSX.utils.json_to_sheet(promoData)
  XLSX.utils.book_append_sheet(workbook, promoSheet, 'Promotii')

  // Generăm buffer-ul Excel
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Returnăm fișierul
  const fileName = `pharmacy-prices-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
