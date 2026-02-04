import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser generic care încearcă să găsească prețuri pe orice site
 * Folosit ca fallback când nu există un parser specific
 */
export const genericParser: RetailerParser = {
  name: 'Generic',
  baseUrl: '',

  parse(html: string, url: string): ParseResult {
    try {
      const $ = cheerio.load(html)

      // Verificăm stocul - selectori comuni
      const outOfStockSelectors = [
        '.out-of-stock',
        '.unavailable',
        '.stoc-epuizat',
        '.indisponibil',
        '.product-unavailable',
        '.no-stock',
        '[data-availability="out-of-stock"]',
        '.sold-out',
      ]

      let isInStock = true
      for (const selector of outOfStockSelectors) {
        if ($(selector).length > 0) {
          isInStock = false
          break
        }
      }

      // Verificăm și textul paginii
      const pageText = $('body').text().toLowerCase()
      const outOfStockPhrases = [
        'stoc epuizat',
        'indisponibil',
        'out of stock',
        'sold out',
        'momentan indisponibil',
        'produs indisponibil',
        'nu este in stoc',
      ]

      for (const phrase of outOfStockPhrases) {
        if (pageText.includes(phrase)) {
          isInStock = false
          break
        }
      }

      // Selectori comuni pentru preț - în ordinea probabilității
      const priceSelectors = [
        // Schema.org / Microdata
        '[itemprop="price"]',
        '[data-price]',
        '[data-price-amount]',

        // Clase comune
        '.product-price',
        '.price-box .price',
        '.special-price .price',
        '.final-price .price',
        '.current-price',
        '.sale-price',
        '.pret',
        '.pret-produs',

        // Elemente generice
        'span.price',
        'div.price',
        '.price',
      ]

      let priceText: string | null = null
      let price: number | null = null

      for (const selector of priceSelectors) {
        const elements = $(selector)
        for (let i = 0; i < elements.length; i++) {
          const element = elements.eq(i)

          // Verificăm diferite atribute
          let text =
            element.attr('content') ||
            element.attr('data-price') ||
            element.attr('data-price-amount') ||
            element.text().trim()

          const parsedPrice = parsePrice(text)
          if (parsedPrice && parsedPrice > 0) {
            priceText = text
            price = parsedPrice
            break
          }
        }
        if (price) break
      }

      // Selectori pentru prețul original (vechi)
      const originalPriceSelectors = [
        '.old-price',
        '.regular-price',
        '.original-price',
        'del .price',
        'del.price',
        '.was-price',
        '.price-old',
        '.pret-vechi',
        '.crossed-price',
        's.price',
        'strike',
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
