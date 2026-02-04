import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru HelpNet (helpnet.ro)
 */
export const helpnetParser: RetailerParser = {
  name: 'HelpNet',
  baseUrl: 'https://www.helpnet.ro',

  parse(html: string, url: string): ParseResult {
    try {
      const $ = cheerio.load(html)

      // Verificăm stocul
      const outOfStockSelectors = [
        '.out-of-stock',
        '.unavailable',
        '.stoc-epuizat',
        '.indisponibil',
        '.product-unavailable',
      ]

      let isInStock = true
      for (const selector of outOfStockSelectors) {
        if ($(selector).length > 0) {
          isInStock = false
          break
        }
      }

      // Verificăm textul
      const pageText = $('body').text().toLowerCase()
      if (
        pageText.includes('stoc epuizat') ||
        pageText.includes('indisponibil') ||
        pageText.includes('momentan indisponibil')
      ) {
        isInStock = false
      }

      // Verificăm și butonul de adăugare în coș
      const addToCartBtn = $('[data-action="add-to-cart"], .add-to-cart, .btn-cart').first()
      if (addToCartBtn.length > 0 && addToCartBtn.prop('disabled')) {
        isInStock = false
      }

      // Prețul curent
      const priceSelectors = [
        '.product-price',
        '.price-box .price',
        '.special-price',
        '.final-price',
        'span.price',
        '[itemprop="price"]',
        '.product-info-price .price',
      ]

      let priceText: string | null = null
      for (const selector of priceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          // Verificăm și content attribute pentru itemprop
          const content = element.attr('content')
          if (content) {
            priceText = content
          } else {
            priceText = element.text().trim()
          }
          break
        }
      }

      const price = parsePrice(priceText)

      // Prețul original
      const originalPriceSelectors = [
        '.old-price',
        '.regular-price',
        'del .price',
        '.was-price',
        '.price-old',
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
