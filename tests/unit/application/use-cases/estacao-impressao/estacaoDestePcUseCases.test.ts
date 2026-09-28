import { describe, expect, it, vi } from 'vitest'
import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import { CriarEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/CriarEstacaoDestePcUseCase'
import { DefinirEstacaoReceptoraDeliveryUseCase } from '@/src/application/use-cases/estacao-impressao/DefinirEstacaoReceptoraDeliveryUseCase'
import { RenomearEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/RenomearEstacaoDestePcUseCase'
import { ResolverEstacaoImpressaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/ResolverEstacaoImpressaoDestePcUseCase'
import { SalvarMapeamentosEstacaoUseCase } from '@/src/application/use-cases/estacao-impressao/SalvarMapeamentosEstacaoUseCase'
import { VincularEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/VincularEstacaoDestePcUseCase'
import {
  ESTACAO_IMPRESSAO_CONFIG_VAZIA,
  EstacaoImpressaoNaoEncontradaError,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'

function storeFake(id: string | null = null): IEstacaoDestePcStore {
  return {
    obterId: vi.fn().mockReturnValue(id),
    salvar: vi.fn(),
    limpar: vi.fn(),
  }
}

function gatewayFake(overrides: Partial<IEstacaoImpressaoGateway> = {}): IEstacaoImpressaoGateway {
  return {
    criar: vi.fn(),
    atualizar: vi.fn(),
    listar: vi.fn().mockResolvedValue([]),
    listarImpressorasLogicas: vi.fn().mockResolvedValue([]),
    buscarMapeamentos: vi.fn().mockResolvedValue([]),
    salvarMapeamentos: vi.fn().mockResolvedValue([]),
    invalidarCacheMapeamentos: vi.fn(),
    ...overrides,
  }
}

describe('CriarEstacaoDestePcUseCase', () => {
  it('cria na API e vincula neste PC', async () => {
    const criada = { id: 'est-1', nome: 'Caixa', ativo: true, gestorDelivery: false }
    const gateway = gatewayFake({ criar: vi.fn().mockResolvedValue(criada) })
    const store = storeFake()
    const useCase = new CriarEstacaoDestePcUseCase(gateway, store)

    await expect(useCase.execute('  Caixa  ')).resolves.toEqual(criada)
    expect(gateway.criar).toHaveBeenCalledWith('Caixa')
    expect(store.salvar).toHaveBeenCalledWith('est-1', 'Caixa')
  })

  it('recusa nome vazio', async () => {
    const gateway = gatewayFake()
    const store = storeFake()
    const useCase = new CriarEstacaoDestePcUseCase(gateway, store)

    await expect(useCase.execute('   ')).rejects.toThrow('Informe o nome da estação.')
    expect(gateway.criar).not.toHaveBeenCalled()
    expect(store.salvar).not.toHaveBeenCalled()
  })
})

describe('RenomearEstacaoDestePcUseCase', () => {
  it('atualiza na API e grava o nome neste PC', async () => {
    const atualizada = { id: 'est-1', nome: 'Balcão', ativo: true, gestorDelivery: false }
    const gateway = gatewayFake({ atualizar: vi.fn().mockResolvedValue(atualizada) })
    const store = storeFake()
    const useCase = new RenomearEstacaoDestePcUseCase(gateway, store)

    await expect(useCase.execute('est-1', '  Balcão  ')).resolves.toEqual(atualizada)
    expect(gateway.atualizar).toHaveBeenCalledWith('est-1', { nome: 'Balcão' })
    expect(store.salvar).toHaveBeenCalledWith('est-1', 'Balcão')
  })

  it('recusa sem estação selecionada', async () => {
    const gateway = gatewayFake()
    const useCase = new RenomearEstacaoDestePcUseCase(gateway, storeFake())

    await expect(useCase.execute('  ', 'Balcão')).rejects.toThrow(
      'Selecione uma estação para renomear.'
    )
    expect(gateway.atualizar).not.toHaveBeenCalled()
  })
})

describe('VincularEstacaoDestePcUseCase', () => {
  it('salva o id quando informado', () => {
    const store = storeFake()
    new VincularEstacaoDestePcUseCase(store).execute('est-2', 'Cozinha')
    expect(store.salvar).toHaveBeenCalledWith('est-2', 'Cozinha')
    expect(store.limpar).not.toHaveBeenCalled()
  })

  it('limpa o vínculo quando o id vem vazio', () => {
    const store = storeFake()
    new VincularEstacaoDestePcUseCase(store).execute('   ')
    expect(store.limpar).toHaveBeenCalled()
    expect(store.salvar).not.toHaveBeenCalled()
  })
})

describe('DefinirEstacaoReceptoraDeliveryUseCase', () => {
  it('desliga a anterior e liga a nova', async () => {
    const gateway = gatewayFake()
    await new DefinirEstacaoReceptoraDeliveryUseCase(gateway).execute('est-a', 'est-b')
    expect(gateway.atualizar).toHaveBeenNthCalledWith(1, 'est-a', { gestorDelivery: false })
    expect(gateway.atualizar).toHaveBeenNthCalledWith(2, 'est-b', { gestorDelivery: true })
  })

  it('nao chama a API quando nao mudou', async () => {
    const gateway = gatewayFake()
    await new DefinirEstacaoReceptoraDeliveryUseCase(gateway).execute('est-a', 'est-a')
    expect(gateway.atualizar).not.toHaveBeenCalled()
  })
})

describe('ResolverEstacaoImpressaoDestePcUseCase', () => {
  it('devolve vazio sem estação neste PC', async () => {
    const gateway = gatewayFake()
    const result = await new ResolverEstacaoImpressaoDestePcUseCase(gateway, storeFake()).execute()
    expect(result).toEqual(ESTACAO_IMPRESSAO_CONFIG_VAZIA)
    expect(gateway.buscarMapeamentos).not.toHaveBeenCalled()
  })

  it('limpa o store quando a estação sumiu na API', async () => {
    const store = storeFake('est-sumiu')
    const gateway = gatewayFake({
      buscarMapeamentos: vi.fn().mockRejectedValue(new EstacaoImpressaoNaoEncontradaError()),
    })
    const result = await new ResolverEstacaoImpressaoDestePcUseCase(gateway, store).execute()
    expect(result).toEqual(ESTACAO_IMPRESSAO_CONFIG_VAZIA)
    expect(store.limpar).toHaveBeenCalled()
  })
})

describe('SalvarMapeamentosEstacaoUseCase', () => {
  it('recusa sem estação', async () => {
    const gateway = gatewayFake()
    await expect(new SalvarMapeamentosEstacaoUseCase(gateway).execute('  ', [])).rejects.toThrow(
      'Selecione uma estação para salvar os vínculos.'
    )
    expect(gateway.salvarMapeamentos).not.toHaveBeenCalled()
  })
})
