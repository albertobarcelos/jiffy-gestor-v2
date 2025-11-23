# Melhores Práticas de Clean Code com Next.js para ERP
## Foco em Alta Manutenibilidade e Escalabilidade

---

## 📋 Índice

1. [Arquitetura e Estrutura de Pastas](#arquitetura-e-estrutura-de-pastas)
2. [Princípios SOLID](#princípios-solid)
3. [TypeScript e Tipagem](#typescript-e-tipagem)
4. [Componentização e Reutilização](#componentização-e-reutilização)
5. [Gerenciamento de Estado](#gerenciamento-de-estado)
6. [Server Components vs Client Components](#server-components-vs-client-components)
7. [Padrões de Código e Linters](#padrões-de-código-e-linters)
8. [Testes Automatizados](#testes-automatizados)
9. [Performance e Otimização](#performance-e-otimização)
10. [Segurança](#segurança)
11. [Documentação](#documentação)
12. [CI/CD e DevOps](#cicd-e-devops)

---

## 🏗️ Arquitetura e Estrutura de Pastas

### Estrutura Recomendada para ERP

```
jiffy-gestor-v2/
├── app/                          # App Router (Next.js 13+)
│   ├── (auth)/                   # Grupo de rotas (não afeta URL)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/              # Dashboard principal
│   │   ├── layout.tsx            # Layout específico do dashboard
│   │   ├── vendas/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── estoque/
│   │   │   └── page.tsx
│   │   └── financeiro/
│   │       └── page.tsx
│   ├── api/                      # API Routes
│   │   ├── vendas/
│   │   │   └── route.ts
│   │   └── produtos/
│   │       └── route.ts
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Home page
│
├── src/                          # Código fonte principal
│   ├── domain/                   # Camada de Domínio (Clean Architecture)
│   │   ├── entities/             # Entidades de negócio
│   │   │   ├── Venda.ts
│   │   │   ├── Produto.ts
│   │   │   └── Cliente.ts
│   │   ├── value-objects/        # Value Objects
│   │   │   ├── Money.ts
│   │   │   └── Email.ts
│   │   ├── repositories/         # Interfaces de repositórios
│   │   │   ├── IVendaRepository.ts
│   │   │   └── IProdutoRepository.ts
│   │   └── services/             # Serviços de domínio
│   │       ├── CalculadoraImposto.ts
│   │       └── ValidadorVenda.ts
│   │
│   ├── application/              # Camada de Aplicação
│   │   ├── use-cases/            # Casos de uso
│   │   │   ├── vendas/
│   │   │   │   ├── CriarVendaUseCase.ts
│   │   │   │   └── ListarVendasUseCase.ts
│   │   │   └── produtos/
│   │   │       └── CriarProdutoUseCase.ts
│   │   ├── dto/                  # Data Transfer Objects
│   │   │   └── VendaDTO.ts
│   │   └── mappers/              # Mappers entre camadas
│   │       └── VendaMapper.ts
│   │
│   ├── infrastructure/           # Camada de Infraestrutura
│   │   ├── database/
│   │   │   ├── repositories/     # Implementações de repositórios
│   │   │   │   └── VendaRepository.ts
│   │   │   └── migrations/
│   │   ├── external-services/    # Integrações externas
│   │   │   ├── payment-gateway/
│   │   │   └── email-service/
│   │   └── cache/
│   │       └── RedisCache.ts
│   │
│   ├── presentation/             # Camada de Apresentação
│   │   ├── components/           # Componentes React
│   │   │   ├── ui/               # Componentes de UI genéricos
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── features/         # Componentes por feature
│   │   │   │   ├── vendas/
│   │   │   │   │   ├── VendaForm.tsx
│   │   │   │   │   └── VendaList.tsx
│   │   │   │   └── produtos/
│   │   │   │       └── ProdutoCard.tsx
│   │   │   └── layouts/          # Layouts reutilizáveis
│   │   │       ├── DashboardLayout.tsx
│   │   │       └── AuthLayout.tsx
│   │   │
│   │   ├── hooks/                 # Custom Hooks
│   │   │   ├── useVendas.ts
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── stores/               # Estado global (Zustand/Redux)
│   │   │   ├── vendasStore.ts
│   │   │   └── authStore.ts
│   │   │
│   │   └── utils/                # Utilitários
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   └── shared/                   # Código compartilhado
│       ├── types/                # Tipos TypeScript compartilhados
│       ├── constants/            # Constantes
│       ├── errors/               # Classes de erro customizadas
│       └── helpers/              # Funções auxiliares
│
├── public/                       # Arquivos estáticos
│   ├── images/
│   └── icons/
│
├── tests/                        # Testes
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # Documentação
│   ├── api/
│   └── architecture/
│
├── .env.local                    # Variáveis de ambiente locais
├── .env.example                  # Exemplo de variáveis de ambiente
├── next.config.js                # Configuração do Next.js
├── tsconfig.json                 # Configuração do TypeScript
├── eslint.config.js              # Configuração do ESLint
├── prettier.config.js            # Configuração do Prettier
└── package.json
```

### Princípios da Estrutura

1. **Separação por Camadas (Clean Architecture)**
   - Domain: Regras de negócio puras
   - Application: Casos de uso e orquestração
   - Infrastructure: Implementações técnicas
   - Presentation: UI e interação com usuário

2. **Feature-Based Organization**
   - Agrupar código por funcionalidade (vendas, produtos, etc.)
   - Facilita localização e manutenção
   - Reduz acoplamento entre features

3. **Colocation**
   - Manter arquivos relacionados próximos
   - Componentes, hooks e tipos da mesma feature juntos

---

## 🎯 Princípios SOLID

### 1. Single Responsibility Principle (SRP)

**❌ Ruim:**
```typescript
// Componente fazendo muitas coisas
export default function VendaPage() {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Busca dados
  useEffect(() => {
    fetch('/api/vendas').then(res => res.json()).then(setVendas)
  }, [])
  
  // Calcula totais
  const total = vendas.reduce((acc, v) => acc + v.valor, 0)
  
  // Formata valores
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }
  
  // Renderiza UI
  return <div>...</div>
}
```

**✅ Bom:**
```typescript
// Separar responsabilidades
// hooks/useVendas.ts
export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    setLoading(true)
    fetchVendas().then(setVendas).finally(() => setLoading(false))
  }, [])
  
  return { vendas, loading }
}

// utils/formatters.ts
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

// components/features/vendas/VendaPage.tsx
export default function VendaPage() {
  const { vendas, loading } = useVendas()
  const total = calcularTotal(vendas)
  
  if (loading) return <Loading />
  
  return <VendaList vendas={vendas} total={total} />
}
```

### 2. Open/Closed Principle (OCP)

**✅ Bom:**
```typescript
// Abstração que permite extensão sem modificação
interface ICalculadoraImposto {
  calcular(valor: number): number
}

class CalculadoraICMS implements ICalculadoraImposto {
  calcular(valor: number): number {
    return valor * 0.18
  }
}

class CalculadoraIPI implements ICalculadoraImposto {
  calcular(valor: number): number {
    return valor * 0.10
  }
}

// Fácil adicionar novos tipos sem modificar código existente
class CalculadoraISS implements ICalculadoraImposto {
  calcular(valor: number): number {
    return valor * 0.05
  }
}
```

### 3. Liskov Substitution Principle (LSP)

**✅ Bom:**
```typescript
// Interfaces que garantem substituição correta
interface IRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  save(entity: T): Promise<T>
}

class VendaRepository implements IRepository<Venda> {
  async findById(id: string): Promise<Venda | null> {
    // Implementação específica
  }
  
  async findAll(): Promise<Venda[]> {
    // Implementação específica
  }
  
  async save(venda: Venda): Promise<Venda> {
    // Implementação específica
  }
}

// Qualquer implementação pode ser usada no lugar da interface
function useCase(repository: IRepository<Venda>) {
  return repository.findAll()
}
```

### 4. Interface Segregation Principle (ISP)

**❌ Ruim:**
```typescript
// Interface muito genérica
interface IRepositorio {
  findById(id: string): Promise<any>
  findAll(): Promise<any[]>
  save(entity: any): Promise<any>
  delete(id: string): Promise<void>
  sendEmail(to: string, subject: string): Promise<void>
  generateReport(): Promise<Blob>
}
```

**✅ Bom:**
```typescript
// Interfaces específicas
interface IReadRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
}

interface IWriteRepository<T> {
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>
}

interface IReportGenerator {
  generate(data: any[]): Promise<Blob>
}

// Classes implementam apenas o que precisam
class VendaRepository implements IReadRepository<Venda>, IWriteRepository<Venda> {
  // Implementação
}
```

### 5. Dependency Inversion Principle (DIP)

**❌ Ruim:**
```typescript
// Dependência direta de implementação concreta
import { VendaRepository } from '@/infrastructure/database/repositories/VendaRepository'

class CriarVendaUseCase {
  private repository = new VendaRepository() // Acoplamento forte
  
  async execute(dto: CriarVendaDTO) {
    return this.repository.save(dto)
  }
}
```

**✅ Bom:**
```typescript
// Dependência de abstração
interface IVendaRepository {
  save(venda: Venda): Promise<Venda>
}

class CriarVendaUseCase {
  constructor(private repository: IVendaRepository) {} // Injeção de dependência
  
  async execute(dto: CriarVendaDTO): Promise<Venda> {
    const venda = VendaMapper.toDomain(dto)
    return this.repository.save(venda)
  }
}

// Inversão de controle (IoC)
// Em um arquivo de configuração/di
const vendaRepository = new VendaRepository()
const criarVendaUseCase = new CriarVendaUseCase(vendaRepository)
```

---

## 📘 TypeScript e Tipagem

### Tipos Fortes e Explícitos

**❌ Ruim:**
```typescript
function processarVenda(venda) {
  return venda.valor * 1.1
}
```

**✅ Bom:**
```typescript
interface Venda {
  id: string
  valor: number
  cliente: Cliente
  produtos: Produto[]
  data: Date
  status: 'pendente' | 'paga' | 'cancelada'
}

function processarVenda(venda: Venda): number {
  return venda.valor * 1.1
}
```

### Value Objects

```typescript
// domain/value-objects/Money.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = 'BRL'
  ) {
    if (amount < 0) {
      throw new Error('Valor não pode ser negativo')
    }
  }
  
  static create(amount: number, currency: string = 'BRL'): Money {
    return new Money(amount, currency)
  }
  
  
  getAmount(): number {
    return this.amount
  }
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Moedas diferentes não podem ser somadas')
    }
    return new Money(this.amount + other.getAmount(), this.currency)
  }
  
  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this.currency
    }).format(this.amount)
  }
}
```

### Tipos Utilitários

```typescript
// shared/types/utils.ts

// Partial para updates
type UpdateVendaDTO = Partial<Omit<Venda, 'id' | 'createdAt'>>

// Pick para selecionar campos específicos
type VendaSummary = Pick<Venda, 'id' | 'valor' | 'status'>

// Record para objetos indexados
type StatusConfig = Record<Venda['status'], { color: string; label: string }>

// Utility types para API responses
type ApiResponse<T> = {
  data: T
  message?: string
  errors?: string[]
}

type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

## 🧩 Componentização e Reutilização

### Componentes Pequenos e Focados

**❌ Ruim:**
```typescript
// Componente gigante fazendo tudo
export default function VendaForm() {
  // 500 linhas de código...
}
```

**✅ Bom:**
```typescript
// components/features/vendas/VendaForm.tsx
export function VendaForm() {
  return (
    <Form>
      <ClienteSelector />
      <ProdutoList />
      <ResumoVenda />
      <AcoesVenda />
    </Form>
  )
}

// components/features/vendas/ClienteSelector.tsx
export function ClienteSelector() {
  // Lógica específica de seleção de cliente
}

// components/features/vendas/ProdutoList.tsx
export function ProdutoList() {
  // Lógica específica de lista de produtos
}
```

### Composição sobre Herança

```typescript
// Base component
interface BaseInputProps {
  label: string
  error?: string
  required?: boolean
}

// Componentes específicos
export function TextInput({ label, error, ...props }: BaseInputProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} />
      {error && <span>{error}</span>}
    </div>
  )
}

export function NumberInput({ label, error, ...props }: BaseInputProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" {...props} />
      {error && <span>{error}</span>}
    </div>
  )
}
```

### Custom Hooks para Lógica Reutilizável

```typescript
// hooks/useVendas.ts
export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchVendas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/vendas')
      if (!response.ok) throw new Error('Erro ao buscar vendas')
      const data = await response.json()
      setVendas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchVendas()
  }, [fetchVendas])
  
  return { vendas, loading, error, refetch: fetchVendas }
}

// Uso no componente
export default function VendasPage() {
  const { vendas, loading, error } = useVendas()
  
  if (loading) return <Loading />
  if (error) return <Error message={error} />
  
  return <VendaList vendas={vendas} />
}
```

---

## 🔄 Gerenciamento de Estado

### Estado Local vs Global

**Regra de Ouro:** Use estado local sempre que possível. Estado global apenas quando necessário.

```typescript
// Estado local (preferido)
function ProdutoForm() {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState(0)
  // Estado não precisa ser compartilhado
}

// Estado global (quando necessário)
// stores/authStore.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    const { user, token } = await response.json()
    set({ user, token })
  },
  logout: () => set({ user: null, token: null })
}))
```

### Server State vs Client State

```typescript
// Server State - Use React Query ou SWR
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useVendas() {
  return useQuery({
    queryKey: ['vendas'],
    queryFn: async () => {
      const res = await fetch('/api/vendas')
      return res.json()
    }
  })
}

export function useCriarVenda() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (venda: CriarVendaDTO) => {
      const res = await fetch('/api/vendas', {
        method: 'POST',
        body: JSON.stringify(venda)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
    }
  })
}

// Client State - Use useState ou Zustand
function FiltroVendas() {
  const [filtro, setFiltro] = useState('') // Estado local de UI
  // ...
}
```

---

## 🖥️ Server Components vs Client Components

### Quando Usar Server Components (Padrão)

```typescript
// app/vendas/page.tsx
// Server Component por padrão - não precisa de 'use client'
import { getVendas } from '@/application/use-cases/vendas/ListarVendasUseCase'
import VendaList from '@/presentation/components/features/vendas/VendaList'

export default async function VendasPage() {
  // Busca dados no servidor
  const vendas = await getVendas()
  
  return (
    <div>
      <h1>Vendas</h1>
      {/* VendaList pode ser Server ou Client Component */}
      <VendaList vendas={vendas} />
    </div>
  )
}
```

### Quando Usar Client Components

```typescript
// components/features/vendas/VendaForm.tsx
'use client' // Necessário para interatividade

import { useState } from 'react'

export default function VendaForm() {
  const [produtos, setProdutos] = useState([])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Lógica de submissão
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Formulário interativo */}
    </form>
  )
}
```

### Padrão: Server Component + Client Component

```typescript
// app/vendas/page.tsx (Server Component)
import { getVendas } from '@/application/use-cases/vendas/ListarVendasUseCase'
import VendaListClient from './VendaListClient'

export default async function VendasPage() {
  const vendas = await getVendas() // Busca no servidor
  
  return <VendaListClient initialVendas={vendas} />
}

// app/vendas/VendaListClient.tsx (Client Component)
'use client'
import { useState } from 'react'

export default function VendaListClient({ initialVendas }: { initialVendas: Venda[] }) {
  const [vendas, setVendas] = useState(initialVendas)
  // Interatividade no cliente
  return <div>{/* Renderiza lista */}</div>
}
```

---

## 🔍 Padrões de Código e Linters

### ESLint Configuration

```javascript
// eslint.config.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
}
```

### Prettier Configuration

```javascript
// prettier.config.js
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'avoid'
}
```

### Naming Conventions

```typescript
// Componentes: PascalCase
export function VendaForm() {}

// Hooks: camelCase com prefixo 'use'
export function useVendas() {}

// Funções/Constantes: camelCase
export function calcularTotal() {}
export const MAX_ITENS = 100

// Tipos/Interfaces: PascalCase
interface Venda {}
type VendaStatus = 'pendente' | 'paga'

// Arquivos: PascalCase para componentes, camelCase para utilitários
// VendaForm.tsx
// formatarMoeda.ts
```

---

## 🧪 Testes Automatizados

### Estrutura de Testes

```
tests/
├── unit/
│   ├── domain/
│   │   └── entities/
│   │       └── Venda.test.ts
│   └── utils/
│       └── formatters.test.ts
├── integration/
│   └── api/
│       └── vendas.test.ts
└── e2e/
    └── vendas.spec.ts
```

### Exemplo de Teste Unitário

```typescript
// tests/unit/domain/entities/Venda.test.ts
import { describe, it, expect } from 'vitest'
import { Venda } from '@/domain/entities/Venda'
import { Money } from '@/domain/value-objects/Money'

describe('Venda', () => {
  it('deve criar uma venda válida', () => {
    const venda = new Venda({
      id: '1',
      valor: Money.create(100),
      cliente: mockCliente,
      produtos: [mockProduto]
    })
    
    expect(venda.getId()).toBe('1')
    expect(venda.getValor().getAmount()).toBe(100)
  })
  
  it('não deve criar venda com valor negativo', () => {
    expect(() => {
      new Venda({
        id: '1',
        valor: Money.create(-100), // Deve lançar erro
        cliente: mockCliente,
        produtos: []
      })
    }).toThrow('Valor não pode ser negativo')
  })
})
```

### Exemplo de Teste de Componente

```typescript
// tests/unit/presentation/components/VendaForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import VendaForm from '@/presentation/components/features/vendas/VendaForm'

describe('VendaForm', () => {
  it('deve renderizar campos do formulário', () => {
    render(<VendaForm />)
    
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('Produtos')).toBeInTheDocument()
  })
  
  it('deve chamar onSubmit ao submeter formulário', () => {
    const onSubmit = vi.fn()
    render(<VendaForm onSubmit={onSubmit} />)
    
    fireEvent.submit(screen.getByRole('form'))
    
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
```

---

## ⚡ Performance e Otimização

### 1. Code Splitting Automático

```typescript
// Next.js faz code splitting automaticamente por rota
// app/vendas/page.tsx - bundle separado
// app/produtos/page.tsx - bundle separado
```

### 2. Dynamic Imports

```typescript
// Carregar componentes pesados apenas quando necessário
import dynamic from 'next/dynamic'

const GraficoVendas = dynamic(() => import('@/components/GraficoVendas'), {
  loading: () => <Loading />,
  ssr: false // Se não precisa de SSR
})
```

### 3. Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/produto.jpg"
  alt="Produto"
  width={500}
  height={300}
  priority // Para imagens acima da dobra
  placeholder="blur" // Para melhor UX
/>
```

### 4. Caching Strategies

```typescript
// app/api/vendas/route.ts
export async function GET() {
  const vendas = await getVendas()
  
  return Response.json(vendas, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  })
}

// Server Components com revalidação
export const revalidate = 60 // Revalida a cada 60 segundos
```

### 5. Memoization

```typescript
import { useMemo, useCallback } from 'react'

function VendaList({ vendas }: { vendas: Venda[] }) {
  // Memoizar cálculos pesados
  const total = useMemo(() => {
    return vendas.reduce((acc, v) => acc + v.valor, 0)
  }, [vendas])
  
  // Memoizar callbacks
  const handleClick = useCallback((id: string) => {
    // Lógica
  }, [])
  
  return <div>{/* Renderiza lista */}</div>
}
```

---

## 🔒 Segurança

### 1. Validação de Entrada

```typescript
// Use Zod ou Yup para validação
import { z } from 'zod'

const CriarVendaSchema = z.object({
  clienteId: z.string().uuid(),
  produtos: z.array(z.object({
    produtoId: z.string().uuid(),
    quantidade: z.number().positive(),
    preco: z.number().positive()
  })).min(1)
})

// app/api/vendas/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  
  try {
    const data = CriarVendaSchema.parse(body)
    // Processar venda
  } catch (error) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 })
  }
}
```

### 2. Autenticação e Autorização

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### 3. Sanitização

```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderizarConteudo(html: string) {
  const sanitizado = DOMPurify.sanitize(html)
  return <div dangerouslySetInnerHTML={{ __html: sanitizado }} />
}
```

---

## 📚 Documentação

### JSDoc para Funções

```typescript
/**
 * Calcula o total de uma venda incluindo impostos
 * 
 * @param valor - Valor base da venda
 * @param taxaImposto - Taxa de imposto (0.18 para 18%)
 * @returns Valor total com impostos incluídos
 * 
 * @example
 * ```ts
 * const total = calcularTotalComImposto(100, 0.18)
 * // Retorna 118
 * ```
 */
export function calcularTotalComImposto(valor: number, taxaImposto: number): number {
  return valor * (1 + taxaImposto)
}
```

### README por Feature

```markdown
# Feature: Vendas

## Descrição
Gerencia o ciclo de vida completo de vendas no sistema.

## Estrutura
- `domain/entities/Venda.ts` - Entidade de domínio
- `application/use-cases/vendas/` - Casos de uso
- `presentation/components/features/vendas/` - Componentes UI

## Como Usar
\`\`\`typescript
import { CriarVendaUseCase } from '@/application/use-cases/vendas/CriarVendaUseCase'

const useCase = new CriarVendaUseCase(repository)
await useCase.execute(dto)
\`\`\`
```

---

## 🚀 CI/CD e DevOps

### GitHub Actions Example

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Comandos de deploy
```

---

## 📊 Checklist de Implementação

### Arquitetura
- [ ] Estrutura de pastas seguindo Clean Architecture
- [ ] Separação clara entre camadas (Domain, Application, Infrastructure, Presentation)
- [ ] Organização por features

### Código
- [ ] Princípios SOLID aplicados
- [ ] TypeScript com tipagem forte
- [ ] Componentes pequenos e focados
- [ ] DRY (Don't Repeat Yourself)
- [ ] Naming conventions consistentes

### Performance
- [ ] Code splitting implementado
- [ ] Imagens otimizadas
- [ ] Caching estratégico
- [ ] Memoization onde necessário

### Qualidade
- [ ] ESLint configurado
- [ ] Prettier configurado
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação atualizada

### Segurança
- [ ] Validação de entrada
- [ ] Autenticação implementada
- [ ] Autorização por rotas
- [ ] Sanitização de dados

---

## 🎓 Recursos Adicionais

- [Next.js Documentation](https://nextjs.org/docs)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Última atualização:** Dezembro 2024

