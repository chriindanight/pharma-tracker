import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST - Adaugă URL pentru un produs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const body = await request.json()
  const { retailerId, url } = body

  const { data, error } = await supabaseAdmin
    .from('product_urls')
    .insert({
      product_id: productId,
      retailer_id: retailerId,
      url,
    })
    .select()
    .single()

  if (error) {
    // Dacă există deja, actualizăm
    if (error.code === '23505') {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('product_urls')
        .update({ url, is_active: true, error_count: 0, last_error: null })
        .eq('product_id', productId)
        .eq('retailer_id', retailerId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE - Dezactivează un URL
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const urlId = searchParams.get('urlId')

  if (!urlId) {
    return NextResponse.json({ error: 'URL ID is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_urls')
    .update({ is_active: false })
    .eq('id', urlId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
