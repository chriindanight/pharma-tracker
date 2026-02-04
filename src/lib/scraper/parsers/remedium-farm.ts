import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru Remedium Farm (remediumfarm.ro)
 */
export const remediumFarmParser: RetailerParser = {
  name: 'Remedium Farm',
  baseUrl: 'https://www.remediumfarm.ro',

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

      // Prețul - Remedium Farm folosește clasa specifică
      const priceSelectors = [
        '.product-summary__info--price-gross',
        '.product-summary__info--price-box',
        '.product-price',
        '[itemprop="price"]',
        '.price',
      ]

      let priceText: string | null = null
      let price: number | null = null

      for (const selector of priceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          // Verificăm content attribute
          const content = element.attr('content')
          if (content) {
            price = parsePrice(content)
            if (price) {
              priceText = content
              break
            }
          }

          // Text content
          const text = element.text().trim()
          price = parsePrice(text)
          if (price) {
            priceText = text
            break
          }
        }
      }

      // Prețul original (pentru promoții)
      const originalPriceSelectors = [
        '.product-summary__info--price-old',
        '.old-price',
        '.regular-price',
        'del .price',
        '.was-price',
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
