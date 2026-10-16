import { aplicarAlteracaoProdutoNosDestinos } from '@/src/application/use-cases/produtos/PropagarAlteracaoProdutoUseCase'
import {
  ehMenuPrincipal,
  idMenuPrincipalDeLista,
  syncCadastroComMenuPrincipalAtivo,
} from '@/src/domain/policies/produto/syncCadastroComMenuPrincipal'
import type { SnapshotProdutoPropagavel } from '@/src/shared/types/propagarAlteracaoProduto'
import { buscarMenusDaEmpresa } from '@/src/presentation/utils/uploadImagemProdutoMenus'

/**
 * Se o menu editado é o principal, grava o mesmo snapshot no cadastro base.
 * Cardápio secundário não espelha sozinho.
 */
export async function espelharSnapshotNoCadastroSeMenuPrincipal(params: {
  token: string
  menuId: string
  produtoId: string
  snapshot: SnapshotProdutoPropagavel
}): Promise<boolean> {
  if (!syncCadastroComMenuPrincipalAtivo()) return false
  const principalId = idMenuPrincipalDeLista(await buscarMenusDaEmpresa({ token: params.token }))
  if (!ehMenuPrincipal(params.menuId, principalId)) return false

  await aplicarAlteracaoProdutoNosDestinos({
    produtoId: params.produtoId,
    token: params.token,
    snapshot: params.snapshot,
    aplicarNoCadastroBase: true,
    menuIds: [],
  })
  return true
}
