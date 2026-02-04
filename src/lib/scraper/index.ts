import { supabaseAdmin } from '@/lib/supabase/server'
import { getParserForUrl } from './parsers'
import { fetchWithHeaders, randomDelay, withRetry } from './utils'

interface ScrapeResult {
  productUrlId: string
  success: boolean
  price: number | null
  originalPrice: number | null
  promoPercentage: number | null
  isInStock: boolean
  error?: string
}

interface ProductUrlToScrape {
  id: string
  url: string
  product_id: string
  retailer_id: string
  error_count: number
}

/**
 * Scrape un singur URL
 */
async function scrapeUrl(productUrl: ProductUrlToScrape): Promise<ScrapeResult> {
  try {
    // Fetch pagina cu retry
    const html = await withRetry(() => fetchWithHeaders(productUrl.url), 3, 2000)

    // Găsim parser-ul potrivit
    const parser = getParserForUrl(productUrl.url)

    // Parsăm pagina
    const result = parser.parse(html, productUrl.url)

    if (result.error) {
      return {
        productUrlId: productUrl.id,
        success: false,
        price: null,
        originalPrice: null,
        promoPercentage: null,
        isInStock: false,
        error: result.error,
      }
    }

    return {
      productUrlId: productUrl.id,
      success: true,
      price: result.price,
      originalPrice: result.originalPrice,
      promoPercentage: result.promoPercentage,
      isInStock: result.isInStock,
    }
  } catch (error) {
    return {
      productUrlId: productUrl.id,
      success: false,
      price: null,
      originalPrice: null,
      promoPercentage: null,
      isInStock: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Rulează scraping-ul pentru toate URL-urile active
 */
export async function runScraper(): Promise<{
  total: number
  successful: number
  failed: number
  errors: Array<{ url: string; error: string }>
}> {
  const errors: Array<{ url: string; error: string }> = []
  let successful = 0
  let failed = 0

  // Creăm log entry
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from('scrape_logs')
    .insert({
      started_at: new Date().toISOString(),
      total_products: 0,
      successful: 0,
      failed: 0,
      errors: [],
    })
    .select()
    .single()

  if (logError) {
    console.error('Failed to create scrape log:', logError)
  }

  // Obținem toate URL-urile active
  const { data: productUrls, error: urlsError } = await supabaseAdmin
    .from('product_urls')
    .select(`
      id,
      url,
      product_id,
      retailer_id,
      error_count
    `)
    .eq('is_active', true)

  if (urlsError || !productUrls) {
    console.error('Failed to fetch product URLs:', urlsError)
    return { total: 0, successful: 0, failed: 0, errors: [] }
  }

  const total = productUrls.length
  console.log(`Starting scrape for ${total} URLs...`)

  // Procesăm secvențial cu delay între request-uri
  for (const productUrl of productUrls) {
    console.log(`Scraping: ${productUrl.url}`)

    const result = await scrapeUrl(productUrl as ProductUrlToScrape)

    if (result.success) {
      successful++

      // Salvăm prețul în istoric
      await supabaseAdmin.from('price_history').insert({
        product_url_id: result.productUrlId,
        price: result.price,
        original_price: result.originalPrice,
        promo_percentage: result.promoPercentage,
        is_in_stock: result.isInStock,
        scraped_at: new Date().toISOString(),
      })

      // Resetăm error_count și actualizăm last_scraped_at
      await supabaseAdmin
        .from('product_urls')
        .update({
          error_count: 0,
          last_error: null,
          last_scraped_at: new Date().toISOString(),
        })
        .eq('id', result.productUrlId)
    } else {
      failed++
      const newErrorCount = (productUrl.error_count || 0) + 1

      errors.push({
        url: productUrl.url,
        error: result.error || 'Unknown error',
      })

      // Actualizăm error_count și last_error
      // Dacă are >= 3 erori consecutive, dezactivăm
      await supabaseAdmin
        .from('product_urls')
        .update({
          error_count: newErrorCount,
          last_error: result.error,
          is_active: newErrorCount < 3,
          last_scraped_at: new Date().toISOString(),
        })
        .eq('id', result.productUrlId)

      if (newErrorCount >= 3) {
        console.warn(`Deactivated URL due to repeated errors: ${productUrl.url}`)
      }
    }

    // Delay random între request-uri (2-5 secunde)
    await randomDelay(2000, 5000)
  }

  // Actualizăm log entry
  if (logEntry) {
    await supabaseAdmin
      .from('scrape_logs')
      .update({
        finished_at: new Date().toISOString(),
        total_products: total,
        successful,
        failed,
        errors,
      })
      .eq('id', logEntry.id)
  }

  console.log(`Scrape completed: ${successful}/${total} successful, ${failed} failed`)

  return { total, successful, failed, errors }
}

/**
 * Scrape manual pentru un singur URL (pentru testare)
 */
export async function scrapeOne(url: string): Promise<ScrapeResult> {
  const mockProductUrl: ProductUrlToScrape = {
    id: 'test',
    url,
    product_id: 'test',
    retailer_id: 'test',
    error_count: 0,
  }

  return scrapeUrl(mockProductUrl)
}
