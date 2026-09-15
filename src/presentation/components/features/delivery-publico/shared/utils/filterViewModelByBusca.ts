import type { DeliveryPublicoViewModel } from '../types/deliveryPublicoViewModel'

export function filterViewModelByBusca(viewModel: DeliveryPublicoViewModel): DeliveryPublicoViewModel {
  const termo = viewModel.termoBusca.trim().toLowerCase()
  if (!termo) return viewModel

  const grupos = viewModel.grupos
    .map(grupo => ({
      ...grupo,
      produtos: grupo.produtos.filter(
        p => p.nome.toLowerCase().includes(termo) || grupo.nome.toLowerCase().includes(termo)
      ),
    }))
    .filter(grupo => grupo.produtos.length > 0)

  return { ...viewModel, grupos }
}
