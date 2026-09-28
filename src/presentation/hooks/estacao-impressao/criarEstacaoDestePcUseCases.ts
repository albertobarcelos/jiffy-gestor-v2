import { CriarEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/CriarEstacaoDestePcUseCase'
import { DefinirEstacaoReceptoraDeliveryUseCase } from '@/src/application/use-cases/estacao-impressao/DefinirEstacaoReceptoraDeliveryUseCase'
import { ListarEstacoesImpressaoUseCase } from '@/src/application/use-cases/estacao-impressao/ListarEstacoesImpressaoUseCase'
import { ListarImpressorasLogicasEstacaoUseCase } from '@/src/application/use-cases/estacao-impressao/ListarImpressorasLogicasEstacaoUseCase'
import { RenomearEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/RenomearEstacaoDestePcUseCase'
import { ResolverEstacaoImpressaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/ResolverEstacaoImpressaoDestePcUseCase'
import { SalvarMapeamentosEstacaoUseCase } from '@/src/application/use-cases/estacao-impressao/SalvarMapeamentosEstacaoUseCase'
import { VincularEstacaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/VincularEstacaoDestePcUseCase'
import { EstacaoImpressaoApiRepository } from '@/src/infrastructure/api/repositories/EstacaoImpressaoApiRepository'
import { EstacaoDestePcLocalStore } from '@/src/infrastructure/printing/EstacaoDestePcLocalStore'

const store = new EstacaoDestePcLocalStore()

export function criarEstacaoImpressaoUseCases(token: string) {
  const gateway = new EstacaoImpressaoApiRepository(token)
  return {
    criar: new CriarEstacaoDestePcUseCase(gateway, store),
    renomear: new RenomearEstacaoDestePcUseCase(gateway, store),
    listar: new ListarEstacoesImpressaoUseCase(gateway),
    impressorasLogicas: new ListarImpressorasLogicasEstacaoUseCase(gateway),
    resolverDestePc: new ResolverEstacaoImpressaoDestePcUseCase(gateway, store),
    salvarMapeamentos: new SalvarMapeamentosEstacaoUseCase(gateway),
    definirReceptora: new DefinirEstacaoReceptoraDeliveryUseCase(gateway),
    invalidarCacheMapeamentos: (estacaoId?: string) => gateway.invalidarCacheMapeamentos(estacaoId),
  }
}

export function criarEstacaoDestePcUseCases(token: string) {
  const casos = criarEstacaoImpressaoUseCases(token)
  return {
    criar: casos.criar,
    renomear: casos.renomear,
  }
}

export function vincularEstacaoDestePcUseCase() {
  return new VincularEstacaoDestePcUseCase(store)
}
