# 🔐 Sistema de Permissões - Documentação

## 📋 Visão Geral

O sistema de permissões controla o acesso de usuários a diferentes módulos e funcionalidades da aplicação. As permissões são gerenciadas através de **Perfis Gestor** e associadas aos **Usuários Gestor**.

## 🎯 Tipos de Permissões

O sistema possui 4 tipos de permissões principais:

- **`FINANCEIRO`**: Acesso a módulos financeiros, relatórios e painel do contador
- **`ESTOQUE`**: Acesso a gestão de estoque, produtos e complementos
- **`FISCAL`**: Acesso a módulos fiscais (NF-e, etc.)
- **`DASHBOARD`**: Acesso ao dashboard principal

## 📁 Estrutura de Arquivos

```
src/
├── shared/
│   └── types/
│       └── permissions.ts          # Tipos e constantes de permissões
├── presentation/
│   ├── hooks/
│   │   ├── usePermissions.ts        # Hook para verificar permissões
│   │   └── useRequirePermission.ts # Hook para proteger páginas
│   ├── components/
│   │   └── auth/
│   │       └── PermissionGuard.tsx # Componente guard para proteger conteúdo
│   └── stores/
│       └── authStore.ts            # Store com permissões do usuário
└── shared/
    └── utils/
        └── validatePermission.ts   # Utilitário para validação em APIs
```

## 🚀 Como Usar

### 1. Proteger Páginas

Use o hook `useRequirePermission` no início do componente da página:

```tsx
import { useRequirePermission } from '@/src/presentation/hooks/useRequirePermission'

export default function FinanceiroPage() {
  // Redireciona automaticamente se não tiver permissão
  useRequirePermission({ permission: 'FINANCEIRO' })

  return <div>Conteúdo financeiro</div>
}
```

**Opções disponíveis:**
- `permission`: Permissão necessária (obrigatório)
- `redirectTo`: Rota para redirecionar se não tiver permissão (padrão: `/dashboard`)
- `requireAll`: Se `true`, requer todas as permissões (padrão: `false`)
- `additionalPermissions`: Lista de permissões adicionais

### 2. Proteger Componentes

Use o componente `PermissionGuard` para mostrar/ocultar conteúdo:

```tsx
import { PermissionGuard } from '@/src/presentation/components/auth/PermissionGuard'

export function MeuComponente() {
  return (
    <div>
      <PermissionGuard permission="FINANCEIRO">
        <FinanceiroPanel />
      </PermissionGuard>

      <PermissionGuard 
        permission="ESTOQUE" 
        fallback={<div>Acesso negado</div>}
      >
        <EstoquePanel />
      </PermissionGuard>
    </div>
  )
}
```

**Props disponíveis:**
- `permission`: Permissão necessária (obrigatório)
- `children`: Conteúdo a ser renderizado se tiver permissão
- `fallback`: Conteúdo alternativo se não tiver permissão (opcional)
- `requireAll`: Se `true`, requer todas as permissões (padrão: `false`)
- `additionalPermissions`: Lista de permissões adicionais

### 3. Verificar Permissões em Componentes

Use o hook `usePermissions` para verificar permissões programaticamente:

```tsx
import { usePermissions } from '@/src/presentation/hooks/usePermissions'

export function MeuComponente() {
  const { hasAccess, hasAnyAccess, hasAllAccess, permissions } = usePermissions()

  if (hasAccess('FINANCEIRO')) {
    // Usuário tem acesso financeiro
  }

  if (hasAnyAccess('FINANCEIRO', 'ESTOQUE')) {
    // Usuário tem pelo menos uma das permissões
  }

  if (hasAllAccess('FINANCEIRO', 'ESTOQUE')) {
    // Usuário tem todas as permissões
  }

  return <div>Conteúdo</div>
}
```

### 4. Filtrar Itens do Menu

No `TopNav.tsx`, adicione a propriedade `requiredPermission` aos itens do menu:

```tsx
const menuItems: MenuItem[] = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: MdDashboard,
    requiredPermission: 'DASHBOARD', // ← Adicione aqui
  },
  {
    name: 'Cadastros',
    path: '#',
    icon: MdInventory2,
    children: [
      { 
        name: 'Produtos', 
        path: '/produtos', 
        icon: MdShoppingBag,
        requiredPermission: 'ESTOQUE', // ← Ou aqui para children
      },
    ],
  },
]
```

O menu será automaticamente filtrado baseado nas permissões do usuário.

### 5. Proteger Rotas API

Use `validatePermission` nas rotas API:

```tsx
import { validatePermission } from '@/src/shared/utils/validatePermission'

export async function GET(request: NextRequest) {
  // Valida permissão antes de processar
  const validation = await validatePermission(request, 'FINANCEIRO')
  if (!validation.valid) {
    return validation.error!
  }

  // Continua com a lógica da API
  return NextResponse.json({ data: '...' })
}
```

**Funções disponíveis:**
- `validatePermission(request, permission)`: Valida uma permissão específica
- `validateAnyPermission(request, ...permissions)`: Valida se tem pelo menos uma das permissões

## 🔧 Adicionar Novas Permissões

Para adicionar uma nova permissão ao sistema:

1. **Adicione o tipo em `src/shared/types/permissions.ts`:**

```tsx
export type PermissionType = 
  | 'FINANCEIRO'
  | 'ESTOQUE'
  | 'FISCAL'
  | 'DASHBOARD'
  | 'NOVA_PERMISSAO' // ← Adicione aqui
```

2. **Adicione o label:**

```tsx
export const PERMISSION_LABELS: Record<PermissionType, string> = {
  // ...
  NOVA_PERMISSAO: 'Nova Permissão', // ← Adicione aqui
}
```

3. **Adicione as rotas relacionadas (opcional):**

```tsx
export const PERMISSION_ROUTES: Record<PermissionType, string[]> = {
  // ...
  NOVA_PERMISSAO: ['/nova-rota'], // ← Adicione aqui
}
```

4. **Atualize a interface `UserPermissions`:**

```tsx
export interface UserPermissions {
  acessoFinanceiro: boolean
  acessoEstoque: boolean
  acessoFiscal: boolean
  acessoDashboard: boolean
  acessoNovaPermissao: boolean // ← Adicione aqui
}
```

5. **Atualize a função `hasPermission`:**

```tsx
export function hasPermission(
  permissions: UserPermissions | null | undefined,
  permission: PermissionType
): boolean {
  if (!permissions) return false

  switch (permission) {
    // ...
    case 'NOVA_PERMISSAO':
      return permissions.acessoNovaPermissao
    default:
      return false
  }
}
```

6. **Atualize a entidade `PerfilGestor`** para incluir o novo campo.

## 📝 Fluxo de Carregamento de Permissões

1. **Login**: Quando o usuário faz login, o `authStore` automaticamente chama `loadPermissions()`
2. **Carregamento**: O sistema busca:
   - Dados do usuário autenticado (`/api/auth/me`)
   - Dados completos do usuário gestor (`/api/pessoas/usuarios-gestor/{id}`)
   - Permissões do perfil gestor associado
3. **Armazenamento**: As permissões são armazenadas no `authStore` e persistidas no localStorage
4. **Uso**: Componentes e hooks usam as permissões do store para verificar acesso

## ⚠️ Observações Importantes

- **Permissões são carregadas automaticamente após login**
- **Permissões são persistidas no localStorage** (atualizadas quando necessário)
- **Se o usuário não tiver permissões, será redirecionado para `/dashboard`**
- **O menu é filtrado automaticamente** baseado nas permissões
- **Rotas API devem validar permissões** para segurança adicional

## 🐛 Troubleshooting

### Permissões não estão sendo carregadas

1. Verifique se o usuário tem um `perfilGestor` associado
2. Verifique se o `perfilGestor` tem as permissões configuradas
3. Verifique o console do navegador para erros
4. Verifique se a API `/api/pessoas/usuarios-gestor/{id}` está retornando os dados corretos

### Menu não está sendo filtrado

1. Verifique se os itens do menu têm `requiredPermission` definido
2. Verifique se `filteredMenuItems` está sendo usado (não `menuItems`)
3. Verifique se as permissões foram carregadas corretamente no store

### Página não está redirecionando

1. Verifique se `useRequirePermission` está sendo chamado no componente
2. Verifique se a permissão está correta
3. Verifique se as permissões foram carregadas no store

## 📚 Exemplos Completos

Veja os arquivos de exemplo:
- `app/dashboard/page.tsx` - Proteção de página
- `app/estoque/page.tsx` - Proteção de página
- `src/presentation/components/layouts/TopNav.tsx` - Filtragem de menu
- `src/presentation/components/auth/PermissionGuard.tsx` - Proteção de componente
