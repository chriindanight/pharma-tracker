/**
 * Rezultatul parsării unei pagini de produs
 */
export interface ParseResult {
  price: number | null
  originalPrice: number | null
  promoPercentage: number | null
  isInStock: boolean
  error?: string
}

/**
 * Interfața pentru un parser de retailer
 */
export interface RetailerParser {
  name: string
  baseUrl: string
  parse: (html: string, url: string) => ParseResult
}
