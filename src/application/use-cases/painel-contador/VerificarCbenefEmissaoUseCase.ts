import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { FiscalPainelMapper } from '@/src/application/mappers/FiscalPainelMapper'
import { CarregarVendaDetalheUseCase } from '@/src/application/use-cases/vendas/CarregarVendaDetalheUseCase'
import {
  identificarItensSemCbenef,
  type ItemVendaCbenef,
} from '@/src/domain/entities/painel-contador/cbenefRegras'

export interface VerificarCbenefEmissaoInput {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoVenda?: string | null
  token: string
}

export class VerificarCbenefEmissaoUseCase {
  constructor(
    private readonly fiscalRepo: IFiscalPainelRepository,
    private readonly carregarVendaDetalhe = new CarregarVendaDetalheUseCase()
  ) {}

  async execute(input: VerificarCbenefEmissaoInput): Promise<ItemVendaCbenef[]> {
    const [empresa, configFiscal, pagina, detalhe] = await Promise.all([
      this.fiscalRepo.getEmpresaMe(),
      this.fiscalRepo.getConfiguracaoFiscal(),
      this.fiscalRepo.listarNcms(0, 1000),
      this.carregarVendaDetalhe.execute({
        vendaId: input.vendaId,
        tabelaOrigemVenda: input.tabelaOrigem,
        token: input.token,
        modoVisualizacao: true,
        tipoVendaGestor: input.tipoVenda,
      }),
    ])

    const resumo = FiscalPainelMapper.toResumoEmpresaDTO(empresa, configFiscal)
    const configsPorNcm = new Map(
      pagina.content.map((ncm) => [
        ncm.codigo,
        {
          codigo: ncm.codigo,
          cstIcms: ncm.impostos.icms?.cst,
          codigoBeneficioFiscal: ncm.impostos.codigoBeneficioFiscal,
        },
      ])
    )

    const itens: ItemVendaCbenef[] = detalhe.produtos
      .filter((produto) => !produto.removido)
      .map((produto) => ({
        nome: produto.nome,
        ncm: produto.ncm ?? '',
      }))

    return identificarItensSemCbenef({
      crt: resumo.codigoRegimeTributario,
      uf: resumo.uf,
      itens,
      configsPorNcm,
    })
  }
}
