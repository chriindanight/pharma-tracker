import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Obține toate produsele
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      product_urls (
        id,
        url,
        is_active,
        last_error,
        error_count,
        retailer:retailers (
          id,
          name
        )
      )
    `)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Creează un produs nou
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, ean, urls } = body

  // Creăm produsul
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .insert({ name, ean })
    .select()
    .single()

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 })
  }

  // Dacă avem URL-uri, le adăugăm
  if (urls && Array.isArray(urls) && urls.length > 0) {
    const productUrls = urls.map((u: { retailerId: string; url: string }) => ({
      product_id: product.id,
      retailer_id: u.retailerId,
      url: u.url,
    }))

    const { error: urlsError } = await supabaseAdmin.from('product_urls').insert(productUrls)

    if (urlsError) {
      console.error('Error adding product URLs:', urlsError)
    }
  }

  return NextResponse.json(product, { status: 201 })
}

// PUT - Actualizează un produs
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, name, ean, is_active } = body

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({ name, ean, is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE - Dezactivează un produs (nu șterge)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
