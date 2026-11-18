import type {
  ListarMesasAbertasParams,
  ListarMesasAbertasResultDTO,
} from '@/src/application/dto/MesasAbertasDTO'
import { METRICAS_MESAS_VAZIAS } from '@/src/application/mappers/MesasAbertasMapper'
import type { IMesasAbertasReadRepository } from '@/src/domain/repositories/IMesasAbertasReadRepository'
import {
  filtrarMesasAbertasValidas,
  sortMesasByParadaAsc,
} from '@/src/shared/helpers/mesasAbertas'

export class ListarMesasAbertasUseCase {
  constructor(private readonly repo: IMesasAbertasReadRepository) {}

  async execute(params: ListarMesasAbertasParams): Promise<ListarMesasAbertasResultDTO> {
    const page = Math.max(0, params.page)
    const pageSize = Math.max(1, params.pageSize)

    const apiPage = await this.repo.listarMesasAbertas(
      {
        limit: pageSize,
        offset: page * pageSize,
        status: 'ABERTA',
        tipoVenda: 'mesa',
      },
      params.token
    )

    const filtradas = filtrarMesasAbertasValidas(
      apiPage.items,
      params.apenasSemMovimentacao
    )
    const items = sortMesasByParadaAsc(filtradas)

    return {
      items,
      metricas: apiPage.metricas ?? METRICAS_MESAS_VAZIAS,
      hasNext: apiPage.hasNext,
      page,
    }
  }
}
