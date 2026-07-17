import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoViewModel } from '../types/deliveryPublicoViewModel'

export function buildCatalogViewModel(
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  return {
    grupos: grupos.map(grupo => ({
      id: grupo.id,
      nome: grupo.nome,
      imagemUrl: grupo.imagemUrl,
      produtos: grupo.produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.valor,
        imagemUrl: produto.imagemUrl,
        grupoId: grupo.id,
      })),
    })),
    disponivel: true,
    horarioTexto: 'Horário não informado',
    horarioSemanalTexto: 'Horário não informado',
    tipoEntrega: 'entrega',
    termoBusca: '',
    carrinho: { total: 0, quantidadeItens: 0 },
    ...overrides,
  }
}
