import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Obține URL-urile cu erori
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('product_urls')
    .select(`
      id,
      url,
      last_error,
      error_count,
      is_active,
      last_scraped_at,
      products (
        id,
        name,
        ean
      ),
      retailers (
        id,
        name
      )
    `)
    .gt('error_count', 0)
    .order('error_count', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Reactivează un URL
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { urlId } = body

  if (!urlId) {
    return NextResponse.json({ error: 'URL ID is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_urls')
    .update({
      is_active: true,
      error_count: 0,
      last_error: null,
    })
    .eq('id', urlId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
