import { ProdutosList } from '@/src/presentation/components/features/produtos/ProdutosList'

/**
 * Página de produtos
 * Replica exatamente o design do Flutter ProdutosScrollWidget
 */
export default function ProdutosPage() {
  return (
    <div className="h-full">
      <ProdutosList />
    </div>
  )
}

