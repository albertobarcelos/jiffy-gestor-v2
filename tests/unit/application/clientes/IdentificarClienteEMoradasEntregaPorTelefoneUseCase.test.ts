import { describe, expect, it, vi } from 'vitest'
import { IdentificarClienteEMoradasEntregaPorTelefoneUseCase } from '@/src/application/use-cases/clientes/IdentificarClienteEMoradasEntregaPorTelefoneUseCase'
import { Cliente } from '@/src/domain/entities/Cliente'
import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import type { IMoradaEntregaRepository } from '@/src/domain/repositories/IMoradaEntregaRepository'
import type { ClienteDeliveryIdentificacao, MoradaTelefone } from '@/src/domain/types/moradaEntrega'

const MORADA: MoradaTelefone = {
  id: 'casa-1',
  telefone: '65992934536',
  tipoEtiqueta: 'Casa',
  nomeMorada: 'Casa',
}

function clienteErp(id = 'erp-1', nome = 'Alberto Barcelos'): Cliente {
  return Cliente.create(id, nome)
}

function repos(overrides?: {
  delivery?: ClienteDeliveryIdentificacao | null
  erp?: Cliente | null
  moradasLegado?: MoradaTelefone[]
}) {
  const identificarClienteDeliveryPorTelefone = vi.fn(async () =>
    overrides && 'delivery' in overrides ? overrides.delivery! : null
  )
  const buscarPorTelefone = vi.fn(async () =>
    overrides && 'erp' in overrides ? overrides.erp! : null
  )
  const listarPorTelefone = vi.fn(async () => overrides?.moradasLegado ?? [])

  const clienteRepo = {
    buscarPorTelefone,
    criarRapido: vi.fn(),
    atualizarNome: vi.fn(),
  } as unknown as IClienteEntregaRepository

  const moradaRepo = {
    identificarClienteDeliveryPorTelefone,
    listarPorTelefone,
    criar: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    registrarUso: vi.fn(),
    buscarGeoEmpresa: vi.fn(),
  } as unknown as IMoradaEntregaRepository

  return {
    clienteRepo,
    moradaRepo,
    identificarClienteDeliveryPorTelefone,
    buscarPorTelefone,
    listarPorTelefone,
    useCase: new IdentificarClienteEMoradasEntregaPorTelefoneUseCase(clienteRepo, moradaRepo),
  }
}

describe('IdentificarClienteEMoradasEntregaPorTelefoneUseCase', () => {
  it('delivery com vínculo ERP: usa só o índice e não busca clientes?q=', async () => {
    const { useCase, buscarPorTelefone, listarPorTelefone } = repos({
      delivery: {
        nome: 'Alberto Barcelos',
        clienteIdVinculado: 'erp-1',
        moradas: [MORADA],
      },
    })

    const resultado = await useCase.execute('65992934536', 'token', true)

    expect(resultado).toEqual({
      cliente: { id: 'erp-1', nome: 'Alberto Barcelos' },
      moradas: [MORADA],
    })
    expect(buscarPorTelefone).not.toHaveBeenCalled()
    expect(listarPorTelefone).not.toHaveBeenCalled()
  })

  it('delivery sem vínculo: cai no ERP e reaproveita moradas do índice', async () => {
    const { useCase, buscarPorTelefone, listarPorTelefone } = repos({
      delivery: {
        nome: 'Alberto',
        clienteIdVinculado: null,
        moradas: [MORADA],
      },
      erp: clienteErp(),
    })

    const resultado = await useCase.execute('65992934536', 'token', true)

    expect(resultado.cliente).toEqual({ id: 'erp-1', nome: 'Alberto Barcelos' })
    expect(resultado.moradas).toEqual([MORADA])
    expect(buscarPorTelefone).toHaveBeenCalledOnce()
    expect(listarPorTelefone).not.toHaveBeenCalled()
  })

  it('delivery 404 e ERP vazio: cliente não encontrado, sem segunda ida a moradas', async () => {
    const { useCase, buscarPorTelefone } = repos({
      delivery: null,
      erp: null,
    })

    const resultado = await useCase.execute('65992934536', 'token', true)

    expect(resultado).toEqual({ cliente: null, moradas: [] })
    expect(buscarPorTelefone).toHaveBeenCalledOnce()
  })

  it('legado: ERP e moradas em paralelo; sem ERP descarta moradas', async () => {
    const { useCase, identificarClienteDeliveryPorTelefone, buscarPorTelefone, listarPorTelefone } =
      repos({
        erp: null,
        moradasLegado: [MORADA],
      })

    const resultado = await useCase.execute('65992934536', 'token', false)

    expect(resultado).toEqual({ cliente: null, moradas: [] })
    expect(identificarClienteDeliveryPorTelefone).not.toHaveBeenCalled()
    expect(buscarPorTelefone).toHaveBeenCalledOnce()
    expect(listarPorTelefone).toHaveBeenCalledOnce()
  })

  it('legado com ERP: devolve cliente e moradas', async () => {
    const { useCase } = repos({
      erp: clienteErp(),
      moradasLegado: [MORADA],
    })

    const resultado = await useCase.execute('65992934536', 'token', false)

    expect(resultado).toEqual({
      cliente: { id: 'erp-1', nome: 'Alberto Barcelos' },
      moradas: [MORADA],
    })
  })
})
