import { NovoProduto } from '@/src/presentation/components/features/produtos/NovoProduto'

/**
 * Página de edição de produto
 * Next.js 15+ requer que params seja aguardado
 */
export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <NovoProduto produtoId={id} />
}
