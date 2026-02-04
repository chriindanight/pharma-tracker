import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru Farmacia Tei (farmaciatei.ro)
 */
export const farmaciaTeiParser: RetailerParser = {
  name: 'Farmacia Tei',
  baseUrl: 'https://www.farmaciatei.ro',

  parse(html: string, url: string): ParseResult {
    try {
      const $ = cheerio.load(html)

      // Verificăm stocul - multiple variante posibile
      const outOfStockSelectors = [
        '.out-of-stock',
        '.unavailable',
        '[data-stock="0"]',
        '.stoc-epuizat',
        '.indisponibil',
      ]

      let isInStock = true
      for (const selector of outOfStockSelectors) {
        if ($(selector).length > 0) {
          isInStock = false
          break
        }
      }

      // Verificăm și textul paginii pentru indicii de stoc
      const pageText = $('body').text().toLowerCase()
      if (
        pageText.includes('stoc epuizat') ||
        pageText.includes('indisponibil') ||
        pageText.includes('out of stock')
      ) {
        isInStock = false
      }

      // Prețul curent - selectori multipli pentru robustețe
      const priceSelectors = [
        '.product-price .price',
        '.price-box .price',
        '[data-price-amount]',
        '.special-price .price',
        '.final-price .price',
        'span.price',
        '.product-info-price .price',
      ]

      let priceText: string | null = null
      for (const selector of priceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          priceText = element.text().trim()
          // Verificăm și atributul data-price-amount
          const dataPrice = element.attr('data-price-amount')
          if (dataPrice) {
            priceText = dataPrice
          }
          break
        }
      }

      const price = parsePrice(priceText)

      // Prețul original (înainte de reducere)
      const originalPriceSelectors = [
        '.old-price .price',
        '.regular-price .price',
        '.price-box .old-price',
        'del .price',
        '.was-price',
      ]

      let originalPriceText: string | null = null
      for (const selector of originalPriceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          originalPriceText = element.text().trim()
          break
        }
      }

      const originalPrice = parsePrice(originalPriceText)
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
