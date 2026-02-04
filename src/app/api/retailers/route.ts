import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Obține toți retailerii
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Creează un retailer nou
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, base_url } = body

  const { data, error } = await supabaseAdmin
    .from('retailers')
    .insert({ name, base_url })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PUT - Actualizează un retailer
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, name, base_url, is_active } = body

  const { data, error } = await supabaseAdmin
    .from('retailers')
    .update({ name, base_url, is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE - Dezactivează un retailer
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('retailers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
