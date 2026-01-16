import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { ListarPedidosUseCase } from '@/src/application/use-cases/delivery/ListarPedidosUseCase'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'

/**
 * GET /api/delivery/pedidos
 * Lista pedidos de delivery (pendentes por padrão)
 */
export async function GET(request: NextRequest) {
  try {
    // Busca tokens do header
    const bearerToken = request.headers.get('Bearer') || request.headers.get('bearer')
    const integradorToken = request.headers.get('integrador-token')

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const dataAtualizacao = searchParams.get('data_atualizacao') || undefined

    const params: {
      status?: StatusPedido
      dataAtualizacao?: string
    } = {}

    if (statusParam) {
      const status = parseInt(statusParam, 10)
      if (Object.values(StatusPedido).includes(status)) {
        params.status = status as StatusPedido
      }
    }

    if (dataAtualizacao) {
      params.dataAtualizacao = dataAtualizacao
    }

    const repository = new DeliveryRepository(
      undefined,
      bearerToken,
      integradorToken || undefined
    )
    const useCase = new ListarPedidosUseCase(repository)

    const pedidos = await useCase.execute(params)

    return NextResponse.json({
      pedidos: pedidos.map((p) => ({
        pedidoRef: p.pedidoRef,
        status: p.status,
        usuario: {
          id: p.usuario.id,
          nome: p.usuario.nome,
          telefone: p.usuario.telefone,
          email: p.usuario.email,
        },
        itens: p.itens.map((i) => ({
          id: i.id,
          nome: i.nome,
          quantidade: i.quantidade,
          preco: i.preco,
          observacoes: i.observacoes,
          complementos: i.complementos.map((c) => ({
            id: c.id,
            nome: c.nome,
            preco: c.preco,
          })),
        })),
        endereco: p.endereco
          ? {
              rua: p.endereco.rua,
              numero: p.endereco.numero,
              bairro: p.endereco.bairro,
              cidade: p.endereco.cidade,
              estado: p.endereco.estado,
              cep: p.endereco.cep,
              complemento: p.endereco.complemento,
              referencia: p.endereco.referencia,
            }
          : undefined,
        valorTotal: p.valorTotal,
        metodoPagamento: p.metodoPagamento,
        observacoes: p.observacoes,
        dataCriacao: p.dataCriacao?.toISOString(),
        dataAtualizacao: p.dataAtualizacao?.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Erro ao listar pedidos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}

