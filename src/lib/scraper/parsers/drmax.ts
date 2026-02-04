import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru Dr Max (drmax.ro)
 * Notă: Acest site blochează request-urile automatizate.
 * Trebuie folosit cu proxy sau browserless pentru scraping.
 */
export const drmaxParser: RetailerParser = {
  name: 'Dr Max',
  baseUrl: 'https://www.drmax.ro',

  parse(html: string, url: string): ParseResult {
    try {
      const $ = cheerio.load(html)

      // Verificăm stocul
      let isInStock = true
      const pageText = $('body').text().toLowerCase()

      if (
        pageText.includes('stoc epuizat') ||
        pageText.includes('indisponibil') ||
        pageText.includes('out of stock') ||
        pageText.includes('nu este disponibil')
      ) {
        isInStock = false
      }

      // Verificăm și selectori specifici pentru out of stock
      if ($('.out-of-stock, .unavailable, .product-unavailable').length > 0) {
        isInStock = false
      }

      // Prețul - Dr Max folosește structură Magento/custom
      const priceSelectors = [
        '[data-price-amount]',
        '[data-price-type="finalPrice"] .price',
        '.product-info-price .price',
        '.price-box .price',
        '.special-price .price',
        '[itemprop="price"]',
        'meta[property="product:price:amount"]',
        '.product-price',
        '.price',
      ]

      let price: number | null = null

      // Încercăm JSON-LD mai întâi
      $('script[type="application/ld+json"]').each((i, el) => {
        if (price) return
        try {
          const json = JSON.parse($(el).html() || '{}')
          if (json.offers?.price) {
            price = parseFloat(json.offers.price)
            if (json.offers.availability?.includes('OutOfStock')) {
              isInStock = false
            }
          }
          if (json['@graph']) {
            for (const item of json['@graph']) {
              if (item.offers?.price) {
                price = parseFloat(item.offers.price)
                if (item.offers.availability?.includes('OutOfStock')) {
                  isInStock = false
                }
                break
              }
            }
          }
        } catch (e) {
          // JSON parse error - skip
        }
      })

      // Dacă nu am găsit în JSON-LD, încercăm selectori
      if (!price) {
        for (const selector of priceSelectors) {
          const element = $(selector).first()
          if (element.length > 0) {
            // Verificăm data-price-amount
            const dataPrice = element.attr('data-price-amount')
            if (dataPrice) {
              price = parseFloat(dataPrice)
              if (price && price > 0) break
            }

            // Verificăm content attribute
            const content = element.attr('content')
            if (content) {
              price = parsePrice(content)
              if (price && price > 0) break
            }

            // Text content
            const text = element.text().trim()
            price = parsePrice(text)
            if (price && price > 0) break
          }
        }
      }

      // Prețul original
      const originalPriceSelectors = [
        '.old-price .price',
        '.regular-price .price',
        'del .price',
        '.was-price',
        '[data-price-type="oldPrice"] .price',
      ]

      let originalPrice: number | null = null
      for (const selector of originalPriceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          const text = element.text().trim()
          const parsed = parsePrice(text)
          if (parsed && parsed > 0 && (!price || parsed > price)) {
            originalPrice = parsed
            break
          }
        }
      }

      const promoPercentage = calculatePromoPercentage(price, originalPrice)

      return {
        price,
        originalPrice,
        promoPercentage,
        isInStock,
      }
    } catch (error) {
      return {
        price: null,
        originalPrice: null,
        promoPercentage: null,
        isInStock: false,
        error: `Parse error: ${(error as Error).message}`,
      }
    }
  },
}
