import { StatusPedido } from '@/src/domain/entities/StatusPedido'

/**
 * DTO para resposta de avançar status
 */
export interface AvancarStatusResponseDTO {
  status: 'success' | 'error'
  code: string
  status_pedido: StatusPedido
}

/**
 * DTO para resposta de cancelar pedido
 */
export interface CancelarPedidoResponseDTO {
  status: 'success' | 'error'
  code: string
  status_pedido: StatusPedido
}

/**
 * DTO para resposta de listar métodos de pagamento
 */
export interface ListarMetodosPagamentoResponseDTO {
  status: 'success' | 'error'
  code: string
  formas: Array<{
    id: number
    nome: string
    categoria: string
    tag: string | null
  }>
}

/**
 * DTO para resposta de listar pedidos
 */
export interface ListarPedidosResponseDTO {
  pedidos: Array<{
    pedido_ref: string
    status: StatusPedido
    usuario: {
      id: string
      nome: string
      telefone?: string
      email?: string
    }
    itens: Array<{
      id: string
      nome: string
      quantidade: number
      preco: number
      observacoes?: string
      complementos?: Array<{
        id: string
        nome: string
        preco: number
      }>
    }>
    endereco?: {
      rua: string
      numero: string
      bairro: string
      cidade: string
      estado: string
      cep?: string
      complemento?: string
      referencia?: string
    }
    valor_total: number
    metodo_pagamento?: string
    observacoes?: string
    data_criacao?: string
    data_atualizacao?: string
  }>
}

