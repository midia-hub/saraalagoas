import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: `Instância ${params.id} não editável por esta rota. Use Configurações do Instagram/Facebook.` },
    { status: 410 }
  )
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: `Instância ${params.id} não editável por esta rota. Use Configurações do Instagram/Facebook.` },
    { status: 410 }
  )
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: `Instância ${params.id} não removível por esta rota. Use Configurações do Instagram/Facebook.` },
    { status: 410 }
  )
}
