export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          ean: string | null
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ean?: string | null
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ean?: string | null
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      retailers: {
        Row: {
          id: string
          name: string
          base_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          base_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          base_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      product_urls: {
        Row: {
          id: string
          product_id: string
          retailer_id: string
          url: string
          is_active: boolean
          last_error: string | null
          error_count: number
          last_scraped_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          retailer_id: string
          url: string
          is_active?: boolean
          last_error?: string | null
          error_count?: number
          last_scraped_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          retailer_id?: string
          url?: string
          is_active?: boolean
          last_error?: string | null
          error_count?: number
          last_scraped_at?: string | null
          created_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          product_url_id: string
          price: number | null
          original_price: number | null
          promo_percentage: number | null
          is_in_stock: boolean
          scraped_at: string
          created_at: string
        }
        Insert: {
          id?: string
          product_url_id: string
          price?: number | null
          original_price?: number | null
          promo_percentage?: number | null
          is_in_stock?: boolean
          scraped_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_url_id?: string
          price?: number | null
          original_price?: number | null
          promo_percentage?: number | null
          is_in_stock?: boolean
          scraped_at?: string
          created_at?: string
        }
      }
      scrape_logs: {
        Row: {
          id: string
          started_at: string
          finished_at: string | null
          total_products: number
          successful: number
          failed: number
          errors: unknown[]
          created_at: string
        }
        Insert: {
          id?: string
          started_at?: string
          finished_at?: string | null
          total_products?: number
          successful?: number
          failed?: number
          errors?: unknown[]
          created_at?: string
        }
        Update: {
          id?: string
          started_at?: string
          finished_at?: string | null
          total_products?: number
          successful?: number
          failed?: number
          errors?: unknown[]
          created_at?: string
        }
      }
    }
    Views: {
      latest_prices: {
        Row: {
          product_id: string
          ean: string | null
          product_name: string
          retailer_id: string
          retailer_name: string
          product_url_id: string
          url: string
          price: number | null
          original_price: number | null
          promo_percentage: number | null
          is_in_stock: boolean
          scraped_at: string | null
        }
      }
    }
  }
}

// Helper types
export type Product = Database['public']['Tables']['products']['Row']
export type Retailer = Database['public']['Tables']['retailers']['Row']
export type ProductUrl = Database['public']['Tables']['product_urls']['Row']
export type PriceHistory = Database['public']['Tables']['price_history']['Row']
export type ScrapeLog = Database['public']['Tables']['scrape_logs']['Row']
export type LatestPrice = Database['public']['Views']['latest_prices']['Row']
