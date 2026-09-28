import { describe, expect, it } from 'vitest'
import {
  extrairDocumentoClienteEntregaDeVendaData,
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
} from '@/src/application/mappers/VendaDetalheMapper'

describe('documento cliente entrega (delivery)', () => {
  it('prioriza documentoCpfCnpj da venda sobre destinatarioCpf e cliente delivery', () => {
    const doc = extrairDocumentoClienteEntregaDeVendaData({
      documentoCpfCnpj: '12345678909',
      contextoEntrega: { destinatarioTelefone: '11999999999', destinatarioCpf: '11144477735' },
      clienteDelivery: { telefone: '11999999999', cpf: '39053344705' },
    })
    expect(doc).toBe('12345678909')
  })

  it('usa destinatarioCpf quando a venda não tem documentoCpfCnpj', () => {
    const doc = extrairDocumentoClienteEntregaDeVendaData({
      contextoEntrega: { destinatarioTelefone: '11999999999', destinatarioCpf: '11144477735' },
    })
    expect(doc).toBe('11144477735')
  })

  it('usa CPF do cliente delivery embutido como fallback', () => {
    const doc = extrairDocumentoClienteEntregaDeVendaData({
      clienteDelivery: { telefone: '11999999999', cpf: '39053344705' },
    })
    expect(doc).toBe('39053344705')
  })

  it('mapDetalhesEntregaFromVendaApi não usa cpfCnpj do cliente gestor aninhado', () => {
    const detalhes = mapDetalhesEntregaFromVendaApi({
      documentoCpfCnpj: '12345678909',
      cliente: { nome: 'Empresa LTDA', cpfCnpj: '11222333000181' },
      contextoEntrega: {
        destinatarioTelefone: '11999999999',
        destinatarioNome: 'Cliente Delivery',
      },
    })
    expect(detalhes.clienteCpfCnpj).toBe('12345678909')
    expect(detalhes.clienteNome).toBe('Cliente Delivery')
  })

  it('mergeClienteDetalhesEntrega não sobrescreve CPF do pedido com CNPJ do gestor', () => {
    const merged = mergeClienteDetalhesEntrega(
      {
        clienteNome: 'Cliente Delivery',
        clienteCpfCnpj: '12345678909',
        clienteCelular: '11999999999',
      },
      {
        nome: 'Empresa LTDA',
        cnpj: '11222333000181',
        cpfCnpj: '11222333000181',
        telefone: '1133334444',
      }
    )
    expect(merged?.clienteCpfCnpj).toBe('12345678909')
    expect(merged?.clienteNome).toBe('Empresa LTDA')
    expect(merged?.clienteCelular).toBe('1133334444')
  })

  it('mergeClienteDetalhesEntrega não preenche documento a partir do cliente gestor', () => {
    const merged = mergeClienteDetalhesEntrega(
      {
        clienteNome: 'Cliente Delivery',
        clienteCpfCnpj: null,
        clienteCelular: '11999999999',
      },
      {
        nome: 'Empresa LTDA',
        cnpj: '11222333000181',
      }
    )
    expect(merged?.clienteCpfCnpj).toBeNull()
  })
})
