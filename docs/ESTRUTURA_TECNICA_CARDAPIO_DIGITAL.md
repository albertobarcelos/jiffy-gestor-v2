# 🔧 Estrutura Técnica: Cardápio Digital

## 📁 Estrutura de Arquivos Detalhada

### 1. Rotas Públicas

```typescript
// app/cardapio/layout.tsx
// Layout público sem TopNav (navegação administrativa)
export default function CardapioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header customizado do cardápio */}
      <CardapioHeader />
      <main>{children}</main>
      {/* Footer opcional */}
    </div>
  )
}
```

```typescript
// app/cardapio/page.tsx
// Server Component - Página principal
import { BuscarCardapioPublicoUseCase } from '@/src/application/use-cases/cardapio/BuscarCardapioPublicoUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import GruposProdutosGrid from '@/src/presentation/components/features/cardapio-digital/GruposProdutosGrid'
import BuscaCardapio from '@/src/presentation/components/features/cardapio-digital/BuscaCardapio'

export default async function CardapioPage() {
  // Buscar grupos ativos no servidor
  const apiClient = new ApiClient()
  const grupoRepository = new GrupoProdutoRepository(apiClient)
  
  const useCase = new BuscarCardapioPublicoUseCase(grupoRepository)
  const grupos = await useCase.execute({
    ativoDelivery: true, // ou ativoLocal, ou ambos
    ativoLocal: true,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cardápio</h1>
      <BuscaCardapio />
      <GruposProdutosGrid grupos={grupos} />
    </div>
  )
}
```

```typescript
// app/cardapio/[grupoId]/page.tsx
// Server Component - Produtos por grupo
import { BuscarProdutosPorGrupoUseCase } from '@/src/application/use-cases/cardapio/BuscarProdutosPorGrupoUseCase'
import ProdutosList from '@/src/presentation/components/features/cardapio-digital/ProdutosList'

export default async function GrupoPage({
  params,
}: {
  params: Promise<{ grupoId: string }>
}) {
  const { grupoId } = await params
  
  const useCase = new BuscarProdutosPorGrupoUseCase(/* ... */)
  const { produtos, grupo } = await useCase.execute(grupoId)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{grupo.getNome()}</h1>
      <ProdutosList produtos={produtos} />
    </div>
  )
}
```

---

## 🎯 Casos de Uso

### BuscarCardapioPublicoUseCase

```typescript
// src/application/use-cases/cardapio/BuscarCardapioPublicoUseCase.ts
import { IGrupoProdutoRepository } from '@/src/domain/repositories/IGrupoProdutoRepository'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

export interface BuscarCardapioPublicoParams {
  ativoDelivery?: boolean
  ativoLocal?: boolean
}

export class BuscarCardapioPublicoUseCase {
  constructor(
    private readonly grupoRepository: IGrupoProdutoRepository
  ) {}

  async execute(
    params: BuscarCardapioPublicoParams
  ): Promise<GrupoProduto[]> {
    const grupos = await this.grupoRepository.buscarGrupos({
      ativo: true,
      ativoDelivery: params.ativoDelivery,
      ativoLocal: params.ativoLocal,
      limit: 100,
      offset: 0,
    })

    // Filtrar apenas grupos que estão ativos para delivery OU local
    return grupos.grupos.filter(
      (grupo) =>
        (params.ativoDelivery && grupo.isAtivoDelivery()) ||
        (params.ativoLocal && grupo.isAtivoLocal())
    )
  }
}
```

### BuscarProdutosPorGrupoUseCase

```typescript
// src/application/use-cases/cardapio/BuscarProdutosPorGrupoUseCase.ts
import { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'
import { IGrupoProdutoRepository } from '@/src/domain/repositories/IGrupoProdutoRepository'
import { Produto } from '@/src/domain/entities/Produto'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

export class BuscarProdutosPorGrupoUseCase {
  constructor(
    private readonly produtoRepository: IProdutoRepository,
    private readonly grupoRepository: IGrupoProdutoRepository
  ) {}

  async execute(grupoId: string): Promise<{
    produtos: Produto[]
    grupo: GrupoProduto
  }> {
    // Buscar grupo
    const grupo = await this.grupoRepository.buscarGrupoPorId(grupoId)
    if (!grupo) {
      throw new Error('Grupo não encontrado')
    }

    // Buscar produtos do grupo
    const { produtos } = await this.produtoRepository.buscarProdutos({
      grupoProdutoId: grupoId,
      ativo: true,
      limit: 100,
      offset: 0,
    })

    // Filtrar produtos ativos para delivery ou local
    const produtosFiltrados = produtos.filter(
      (produto) =>
        (grupo.isAtivoDelivery() && produto.isAtivoDelivery?.()) ||
        (grupo.isAtivoLocal() && produto.isAtivoLocal?.())
    )

    return {
      produtos: produtosFiltrados,
      grupo,
    }
  }
}
```

---

## 🧩 Componentes

### GruposProdutosGrid

```typescript
// src/presentation/components/features/cardapio-digital/GruposProdutosGrid.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

interface GruposProdutosGridProps {
  grupos: GrupoProduto[]
}

export default function GruposProdutosGrid({
  grupos,
}: GruposProdutosGridProps) {
  // Ordenar grupos por ordem (se disponível)
  const gruposOrdenados = [...grupos].sort((a, b) => {
    const ordemA = a.getOrdem() ?? 999
    const ordemB = b.getOrdem() ?? 999
    return ordemA - ordemB
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {gruposOrdenados.map((grupo) => (
        <Link
          key={grupo.getId()}
          href={`/cardapio/${grupo.getId()}`}
          className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
        >
          <div
            className="h-48 flex items-center justify-center"
            style={{ backgroundColor: grupo.getCorHex() }}
          >
            {/* Ícone do grupo - pode usar react-icons baseado em iconName */}
            <div className="text-white text-6xl">
              {/* Renderizar ícone baseado em grupo.getIconName() */}
            </div>
          </div>
          <div className="p-4 bg-white">
            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors">
              {grupo.getNome()}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

### ProdutoCard

```typescript
// src/presentation/components/features/cardapio-digital/ProdutoCard.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Produto } from '@/src/domain/entities/Produto'
import ProdutoDetalhesModal from './ProdutoDetalhesModal'

interface ProdutoCardProps {
  produto: Produto
}

export default function ProdutoCard({ produto }: ProdutoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Imagem do produto */}
        <div className="relative w-full h-48 bg-gray-200">
          {/* Placeholder ou imagem real */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Informações do produto */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {produto.getNome()}
          </h3>
          {produto.getDescricao() && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {produto.getDescricao()}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">
              {formatarPreco(produto.getValor())}
            </span>
            {!produto.isAtivo() && (
              <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                Indisponível
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {isModalOpen && (
        <ProdutoDetalhesModal
          produto={produto}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
```

### BuscaCardapio

```typescript
// src/presentation/components/features/cardapio-digital/BuscaCardapio.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/src/presentation/hooks/useDebounce'
import { MdSearch } from 'react-icons/md'

export default function BuscaCardapio() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busca, setBusca] = useState(searchParams.get('q') || '')

  const debouncedBusca = useDebounce(busca, 300)

  const handleBusca = useCallback(
    (valor: string) => {
      setBusca(valor)
      const params = new URLSearchParams(searchParams.toString())
      if (valor) {
        params.set('q', valor)
      } else {
        params.delete('q')
      }
      router.push(`/cardapio?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MdSearch className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={busca}
        onChange={(e) => handleBusca(e.target.value)}
        placeholder="Buscar produtos..."
        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )
}
```

### ProdutoDetalhesModal

```typescript
// src/presentation/components/features/cardapio-digital/ProdutoDetalhesModal.tsx
'use client'

import { Fragment } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { MdClose } from 'react-icons/md'

interface ProdutoDetalhesModalProps {
  produto: Produto
  onClose: () => void
}

export default function ProdutoDetalhesModal({
  produto,
  onClose,
}: ProdutoDetalhesModalProps) {
  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{produto.getNome()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MdClose className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Imagem */}
          <div className="relative w-full h-64 bg-gray-200 rounded-lg mb-4">
            {/* Placeholder ou imagem real */}
          </div>

          {/* Descrição */}
          {produto.getDescricao() && (
            <p className="text-gray-700 mb-4">{produto.getDescricao()}</p>
          )}

          {/* Preço */}
          <div className="text-3xl font-bold text-primary mb-6">
            {formatarPreco(produto.getValor())}
          </div>

          {/* Complementos (se houver) */}
          {produto.getGruposComplementos() &&
            produto.getGruposComplementos()!.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Personalize seu pedido</h3>
                {/* Renderizar grupos de complementos */}
              </div>
            )}

          {/* Botão de ação */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                // Lógica de adicionar ao pedido
                onClose()
              }}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Fazer Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🔌 API Routes Públicas

### Endpoint: Grupos Públicos

```typescript
// app/api/cardapio-publico/grupos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { BuscarCardapioPublicoUseCase } from '@/src/application/use-cases/cardapio/BuscarCardapioPublicoUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ativoDelivery = searchParams.get('ativoDelivery') === 'true'
    const ativoLocal = searchParams.get('ativoLocal') === 'true'

    const apiClient = new ApiClient()
    const grupoRepository = new GrupoProdutoRepository(apiClient)
    const useCase = new BuscarCardapioPublicoUseCase(grupoRepository)

    const grupos = await useCase.execute({
      ativoDelivery,
      ativoLocal,
    })

    return NextResponse.json(
      {
        grupos: grupos.map((g) => g.toJSON()),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar grupos públicos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar grupos' },
      { status: 500 }
    )
  }
}
```

### Endpoint: Produtos por Grupo

```typescript
// app/api/cardapio-publico/grupos/[grupoId]/produtos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { BuscarProdutosPorGrupoUseCase } from '@/src/application/use-cases/cardapio/BuscarProdutosPorGrupoUseCase'
import { ProdutoRepository } from '@/src/infrastructure/database/repositories/ProdutoRepository'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  try {
    const { grupoId } = await params

    const apiClient = new ApiClient()
    const produtoRepository = new ProdutoRepository(apiClient)
    const grupoRepository = new GrupoProdutoRepository(apiClient)

    const useCase = new BuscarProdutosPorGrupoUseCase(
      produtoRepository,
      grupoRepository
    )

    const { produtos, grupo } = await useCase.execute(grupoId)

    return NextResponse.json(
      {
        produtos: produtos.map((p) => p.toJSON()),
        grupo: grupo.toJSON(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar produtos do grupo:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar produtos' },
      { status: 500 }
    )
  }
}
```

---

## 🎨 Hook Customizado: useDebounce

```typescript
// src/presentation/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

---

## 📱 Responsividade com Tailwind

### Classes Utilitárias:

```typescript
// Grid responsivo
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"

// Texto responsivo
className="text-2xl sm:text-3xl lg:text-4xl"

// Padding responsivo
className="p-4 sm:p-6 lg:p-8"

// Modal responsivo
className="w-full max-w-md sm:max-w-lg lg:max-w-2xl"
```

---

## 🚀 Próximos Passos de Implementação

1. **Criar estrutura de pastas**
2. **Implementar casos de uso**
3. **Criar API routes públicas**
4. **Implementar componentes base**
5. **Adicionar busca e filtros**
6. **Implementar modal de detalhes**
7. **Adicionar integração com pedidos**
8. **Testes e otimizações**

---

## 📝 Notas Importantes

- **Server Components:** Use Server Components sempre que possível para melhor performance
- **Cache:** Implemente cache adequado para dados públicos
- **Error Boundaries:** Adicione tratamento de erros
- **Loading States:** Mostre estados de carregamento
- **Acessibilidade:** Siga padrões WCAG
- **SEO:** Adicione meta tags e structured data
