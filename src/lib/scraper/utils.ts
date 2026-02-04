// Lista de User-Agents pentru rotație
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

/**
 * Returnează un User-Agent aleatoriu
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Delay random între min și max milisecunde
 */
export function randomDelay(minMs: number = 2000, maxMs: number = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Retry cu exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Parsează prețul din string în număr
 * Gestionează formaturi ca: "123,45 Lei", "123.45 RON", "123,45"
 */
export function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null

  // Eliminăm tot în afară de cifre, virgulă și punct
  const cleaned = priceStr.replace(/[^\d.,]/g, '')

  if (!cleaned) return null

  // În România, virgula e separator zecimal
  // Înlocuim virgula cu punct pentru parseFloat
  const normalized = cleaned.replace(',', '.')

  const price = parseFloat(normalized)
  return isNaN(price) ? null : price
}

/**
 * Calculează procentul de reducere
 */
export function calculatePromoPercentage(
  currentPrice: number | null,
  originalPrice: number | null
): number | null {
  if (!currentPrice || !originalPrice || originalPrice <= currentPrice) {
    return null
  }

  const discount = ((originalPrice - currentPrice) / originalPrice) * 100
  return Math.round(discount * 100) / 100 // 2 zecimale
}

/**
 * Verifică dacă URL-ul necesită proxy (site-uri care blochează request-uri automatizate)
 */
export function needsProxy(url: string): boolean {
  const proxyDomains = [
    'drmax.ro',
  ]

  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace(/^www\./, '')
    return proxyDomains.some(d => domain.includes(d))
  } catch {
    return false
  }
}

/**
 * Fetch cu ScraperAPI proxy
 * Necesită SCRAPER_API_KEY în environment variables
 */
export async function fetchWithProxy(
  url: string,
  timeoutMs: number = 60000
): Promise<string> {
  const apiKey = process.env.SCRAPER_API_KEY

  if (!apiKey) {
    throw new Error('SCRAPER_API_KEY nu este setat. Pentru Dr Max, ai nevoie de un cont ScraperAPI gratuit.')
  }

  const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&country_code=ro`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Proxy HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch cu headers și timeout
 */
export async function fetchWithHeaders(
  url: string,
  timeoutMs: number = 30000
): Promise<string> {
  // Verificăm dacă site-ul necesită proxy
  if (needsProxy(url)) {
    return fetchWithProxy(url, timeoutMs)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}
