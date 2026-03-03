# 📱 Planejamento: Cardápio Digital Premium

## 🎯 Objetivo

Criar uma interface premium de cardápio digital integrada ao sistema de mesas e KDS (Kitchen Display System), permitindo que clientes façam pedidos diretamente à cozinha através de uma experiência visual de alta qualidade. O sistema será acessado via QR Code nas mesas, oferecendo uma identidade visual luxuosa e recursos visuais chamativos para estabelecimentos de primeira linha.

---

## 📋 Análise do Contexto Atual

### ✅ O que já existe no sistema:

1. **Entidades de Domínio:**
   - `Produto` - com campos: nome, valor, descrição, grupo, ativo, ativoDelivery, ativoLocal
   - `GrupoProduto` - com campos: nome, corHex, iconName, ordem, ativo, ativoDelivery, ativoLocal
   - `Complemento` e `GrupoComplemento` - para personalização de produtos
   - Sistema de mesas e vendas (comandas)
   - Backend "compartilhador" de mesas abertas

2. **Infraestrutura:**
   - API endpoints para produtos e grupos
   - Repositórios implementados
   - Hooks React Query (`useProdutos`, `useGruposProdutos`)
   - Sistema de mesas compartilhadas entre PDV/POS

3. **Funcionalidades Relacionadas:**
   - Sistema de pedidos/delivery
   - Gestão de produtos e grupos
   - Sistema de vendas e mesas abertas
   - Compartilhamento de mesas entre terminais

### ❌ O que precisa ser criado:

1. **Interface Premium do Cardápio:**
   - Tela inicial com navegação principal (Cardápio, Chamar Garçom, Carrinho, Fechar Conta)
   - Visualização de produtos por grupos com design luxuoso
   - Detalhes de produtos com recursos visuais premium
   - Sistema de carrinho integrado
   - Integração com QR Code de mesas

2. **Funcionalidades Específicas:**
   - Design tablet-first (otimizado para tablets)
   - Identidade visual premium usando cores e ícones dos grupos
   - Sistema de carrinho com modificações em tempo real
   - Integração com KDS (Kitchen Display System)
   - Chamar garçom via sistema
   - Fechar conta (chama garçom para cobrança)
   - Integração com compartilhador de mesas

---

## 🏗️ Arquitetura Proposta

### Estrutura de Pastas

```
app/
├── cardapio/                    # Rota do cardápio digital
│   ├── layout.tsx              # Layout premium (sem TopNav administrativo)
│   ├── page.tsx                # Tela inicial com botões principais
│   ├── mesa/[mesaId]/          # Cardápio vinculado a uma mesa específica
│   │   ├── page.tsx            # Página principal do cardápio da mesa
│   │   ├── grupos/              # Visualização por grupos
│   │   │   └── [grupoId]/
│   │   │       └── page.tsx
│   │   └── carrinho/            # Página do carrinho
│   │       └── page.tsx
│   └── qr/[token]/             # Acesso via QR Code (redireciona para mesa)
│       └── page.tsx
│
src/
├── domain/
│   └── entities/
│       ├── MesaCardapio.ts     # Entidade de mesa vinculada ao cardápio
│       ├── CarrinhoItem.ts      # Item do carrinho
│       └── PedidoCardapio.ts    # Pedido enviado para KDS
│
├── application/
│   └── use-cases/
│       └── cardapio/
│           ├── AbrirMesaPorQRUseCase.ts      # Abre mesa via QR Code
│           ├── BuscarCardapioMesaUseCase.ts  # Busca cardápio da mesa
│           ├── AdicionarItemCarrinhoUseCase.ts
│           ├── ModificarItemCarrinhoUseCase.ts
│           ├── RemoverItemCarrinhoUseCase.ts
│           ├── EnviarPedidoKDSUseCase.ts     # Envia pedido para KDS
│           ├── ChamarGarcomUseCase.ts         # Solicita garçom
│           └── SolicitarFecharContaUseCase.ts # Solicita fechamento
│
├── infrastructure/
│   └── api/
│       ├── CardapioMesaApi.ts   # API para operações do cardápio
│       └── KDSApi.ts            # API para integração com KDS
│
└── presentation/
    └── components/
        └── features/
            └── cardapio-digital/
                ├── CardapioHomeScreen.tsx     # Tela inicial com botões
                ├── CardapioHeader.tsx         # Header premium
                ├── GruposProdutosGrid.tsx     # Grid de grupos (design luxuoso)
                ├── ProdutosList.tsx           # Lista de produtos
                ├── ProdutoCard.tsx            # Card premium de produto
                ├── ProdutoDetalhesModal.tsx   # Modal de detalhes
                ├── CarrinhoCompleto.tsx       # Tela completa do carrinho
                ├── CarrinhoItem.tsx           # Item do carrinho
                ├── CarrinhoResumo.tsx         # Resumo flutuante do carrinho
                ├── BuscaCardapio.tsx          # Busca premium
                ├── ChamarGarcomModal.tsx      # Modal para chamar garçom
                ├── FecharContaModal.tsx       # Modal para fechar conta
                └── QRCodeScanner.tsx          # Scanner de QR Code (opcional)
```

---

## 🎨 Funcionalidades Detalhadas

### 1. Fluxo Principal: QR Code → Mesa → Cardápio

#### Fluxo Completo:
1. **Cliente escaneia QR Code na mesa**
   - QR Code contém token único da mesa
   - Sistema identifica mesa e abre comanda automaticamente
   - Mesa aparece no KDS (Kitchen Display System) imediatamente
   - Redireciona para tela inicial do cardápio

2. **Tela Inicial do Cardápio** (`/cardapio/mesa/[mesaId]`)
   - **Design Premium:** Fundo elegante, animações suaves
   - **Botões Principais:**
     - 🍽️ **Cardápio** - Acessa visualização de grupos
     - 🛎️ **Chamar Garçom** - Solicita atendimento
     - 🛒 **Carrinho** - Visualiza e gerencia pedidos
     - 💳 **Fechar Conta** - Solicita fechamento da mesa
   - **Informações da Mesa:** Número da mesa, status, tempo aberto
   - **Badge de Carrinho:** Contador de itens flutuante

### 2. Visualização de Grupos (`/cardapio/mesa/[mesaId]/grupos`)

#### Características Premium:
- **Grid Responsivo:** 2-3 colunas em tablet, adaptável
- **Cards de Grupos:**
  - Fundo com cor do grupo (`corHex`) com gradiente elegante
  - Ícone do grupo (`iconName`) em destaque
  - Nome do grupo com tipografia premium
  - Contador de produtos disponíveis
  - Efeito hover com elevação e animação suave
  - Sombras e profundidade para efeito 3D
- **Animações:** Transições suaves, micro-interações
- **Busca Global:** Campo de busca premium no topo

### 3. Visualização de Produtos por Grupo (`/cardapio/mesa/[mesaId]/grupos/[grupoId]`)

#### Características:
- **Header do Grupo:**
  - Cor de fundo do grupo
  - Ícone e nome em destaque
  - Botão voltar elegante
- **Grid de Produtos:**
  - Cards premium com:
    - Imagem do produto (placeholder elegante se não houver)
    - Nome com tipografia destacada
    - Descrição truncada (2 linhas)
    - Preço em destaque com formatação BRL
    - Badge de disponibilidade (se indisponível)
    - Botão "Adicionar" com ícone e animação
  - Efeitos hover com zoom sutil e elevação
  - Lazy loading de imagens

### 4. Detalhes do Produto (Modal Premium)

#### Informações Exibidas:
- **Header Elegante:**
  - Imagem em destaque (full-width)
  - Overlay com gradiente
  - Botão fechar premium
- **Conteúdo:**
  - Nome do produto (tipografia grande)
  - Descrição completa formatada
  - Preço destacado em grande
  - **Complementos Disponíveis:**
    - Lista de grupos de complementos
    - Seleção múltipla elegante
    - Visualização de preços adicionais
  - **Observações:** Campo de texto para observações especiais
- **Ações:**
  - Botão "Adicionar ao Carrinho" premium
  - Contador de quantidade (+/-)
  - Preview do valor total

### 5. Sistema de Carrinho (`/cardapio/mesa/[mesaId]/carrinho`)

#### Funcionalidades:
- **Lista de Itens:**
  - Card para cada item com:
    - Imagem do produto
    - Nome e descrição
    - Complementos selecionados
    - Observações (se houver)
    - Quantidade com controles +/- elegantes
    - Preço unitário e total
    - Botão remover
  - Agrupamento por produto (se mesmo produto com complementos diferentes)
- **Resumo:**
  - Subtotal
  - Total geral destacado
  - Botão "Enviar para Cozinha" premium
- **Modificações:**
  - Editar item (abre modal de detalhes)
  - Remover item (com confirmação elegante)
  - Limpar carrinho (com confirmação)
- **Status:**
  - Indicador se pedido já foi enviado
  - Lista de pedidos enviados (histórico da sessão)

### 6. Envio para KDS (Kitchen Display System)

#### Fluxo:
1. Cliente finaliza carrinho
2. Confirmação visual elegante
3. Pedido é enviado para KDS via API
4. Mesa atualizada no compartilhador
5. Feedback visual de sucesso
6. Carrinho limpo (ou mantido para novos itens)

### 7. Chamar Garçom

#### Funcionalidade:
- Modal elegante com opções:
  - "Preciso de ajuda"
  - "Quero fazer um pedido especial"
  - "Problema com o pedido"
  - Campo de texto livre
- Envio de notificação para sistema
- Confirmação visual
- Status de atendimento (se implementado)

### 8. Fechar Conta

#### Funcionalidade:
- Modal de confirmação elegante
- Exibe resumo do pedido
- Informa que garçom será chamado para cobrança
- Envia solicitação para sistema
- Mesa fica em status "Aguardando Fechamento"
- Garçom pode acessar via PDV/POS para finalizar

---

## 🔌 Integrações

### 1. Integração com QR Code e Mesas

#### Fluxo de Abertura de Mesa:
- QR Code na mesa contém token único
- Token identifica mesa pré-cadastrada
- Sistema abre comanda automaticamente
- Mesa aparece no compartilhador (disponível para PDV/POS)
- Mesa aparece no KDS (se KDS estiver ativo)

#### Estrutura do Token:
```typescript
{
  mesaId: string
  terminalId: string
  empresaId: string
  timestamp: number
  signature: string // Para validação
}
```

### 2. Integração com KDS (Kitchen Display System)

#### Funcionalidades:
- **Envio de Pedidos:**
  - Quando cliente envia pedido do carrinho
  - API envia para KDS via WebSocket ou REST
  - KDS exibe pedidos em tempo real
  - Atualização de status (preparando, pronto, etc.)

#### Estrutura de Dados:
```typescript
{
  mesaId: string
  numeroMesa: number
  itens: Array<{
    produtoId: string
    nome: string
    quantidade: number
    complementos: Array<{...}>
    observacoes?: string
  }>
  timestamp: string
  status: 'PENDENTE' | 'PREPARANDO' | 'PRONTO'
}
```

### 3. Integração com Compartilhador de Mesas

#### Funcionalidades:
- **Sincronização:**
  - Mesas abertas via cardápio aparecem no compartilhador
  - PDV/POS podem acessar mesas abertas pelo cardápio
  - Garçom pode adicionar itens via PDV
  - Garçom pode fechar conta via PDV

#### Fluxo de Fechamento:
1. Cliente solicita fechar conta no cardápio
2. Mesa fica em status "Aguardando Fechamento"
3. Garçom acessa mesa via PDV/POS
4. Garçom efetua cobrança e finaliza mesa
5. Mesa é fechada no sistema

### 4. Persistência de Dados

#### Armazenamento:
- **SessionStorage:** Carrinho e estado da sessão
- **Backend:** Pedidos enviados, histórico
- **Real-time:** WebSocket para atualizações do KDS

---

## 🎨 Design e UX Premium

### Princípios de Design de Luxo:

1. **Tablet-First Design:**
   - Layout otimizado para tablets (768px - 1024px)
   - Touch-friendly com áreas de toque generosas (min 44x44px)
   - Navegação intuitiva com gestos suaves
   - Orientação landscape e portrait

2. **Identidade Visual Premium:**
   - **Cores dos Grupos:** Usar `corHex` como base, criar gradientes elegantes
   - **Tipografia:** Fontes premium (Inter, Poppins, ou similar)
   - **Espaçamento:** Generoso, respiração visual
   - **Sombras:** Múltiplas camadas para profundidade
   - **Animações:** Suaves, elegantes, não intrusivas
   - **Ícones:** Usar `iconName` dos grupos, renderizar com qualidade

3. **Recursos Visuais Chamativos:**
   - **Gradientes:** Aplicar gradientes sutis nos cards
   - **Glassmorphism:** Efeitos de vidro em modais e overlays
   - **Micro-interações:** Feedback visual em todas as ações
   - **Imagens:** Destaque para imagens de produtos (se disponíveis)
   - **Ilustrações:** Placeholders elegantes quando não houver imagem

4. **Performance Premium:**
   - Lazy loading de imagens com blur placeholder
   - Code splitting por rota
   - Cache estratégico (React Query)
   - Server Components quando possível
   - Otimização de animações (GPU-accelerated)

5. **Acessibilidade de Luxo:**
   - Contraste WCAG AAA
   - Navegação por teclado completa
   - Screen reader friendly
   - Alt text descritivo em imagens
   - Feedback háptico (se suportado)

### Paleta de Cores Premium:

```typescript
// Cores base
const cores = {
  // Fundo principal
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    dark: '#1A1A1A', // Para modais
  },
  
  // Cores dos grupos (dinâmicas via corHex)
  grupo: {
    base: 'corHex do grupo',
    gradient: 'gradiente baseado em corHex',
    hover: 'corHex com 10% mais escura',
  },
  
  // Acentos
  accent: {
    primary: '#E6AA37', // Dourado premium
    secondary: '#2C3E50', // Azul escuro elegante
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
  },
  
  // Texto
  text: {
    primary: '#1A1A1A',
    secondary: '#6C757D',
    light: '#FFFFFF',
    muted: '#ADB5BD',
  }
}
```

### Componentes de UI Premium:

#### 1. **CardapioHomeScreen:**
- Fundo com gradiente sutil ou imagem de fundo
- Botões grandes e elegantes com:
  - Ícones premium (React Icons ou customizados)
  - Tipografia destacada
  - Efeito hover com elevação
  - Animações de entrada (fade-in, slide-up)
- Badge de carrinho flutuante com contador animado

#### 2. **GruposProdutosGrid:**
- Grid responsivo (2-3 colunas em tablet)
- Cards com:
  - Fundo usando `corHex` com gradiente radial
  - Ícone do grupo centralizado (tamanho grande)
  - Nome do grupo com sombra de texto sutil
  - Contador de produtos em badge
  - Efeito hover: escala 1.05, elevação aumentada, sombra expandida
  - Animação de entrada: stagger (um após o outro)

#### 3. **ProdutoCard:**
- Card com bordas arredondadas generosas
- Imagem com:
  - Aspect ratio 16:9 ou 4:3
  - Overlay gradiente sutil no hover
  - Placeholder elegante se não houver imagem
- Informações:
  - Nome com tipografia destacada
  - Descrição truncada com "..." elegante
  - Preço em destaque (tamanho grande, cor do grupo)
- Botão "Adicionar" com:
  - Ícone de + animado
  - Efeito ripple ao clicar
  - Feedback visual imediato

#### 4. **ProdutoDetalhesModal:**
- Modal fullscreen em mobile, centralizado em tablet
- Header com imagem em destaque
- Conteúdo com scroll suave
- Complementos com seleção elegante (checkboxes estilizados)
- Botão de ação fixo no rodapé
- Animação de entrada: slide-up + fade

#### 5. **CarrinhoCompleto:**
- Layout limpo e organizado
- Cards de itens com:
  - Imagem pequena à esquerda
  - Informações centralizadas
  - Controles de quantidade elegantes
  - Botão remover discreto
- Resumo fixo no rodapé (sticky)
- Botão de envio destacado e grande

### Animações e Transições:

```typescript
// Animações suaves
const animations = {
  fadeIn: 'opacity 0.3s ease-in',
  slideUp: 'transform 0.3s ease-out, opacity 0.3s ease-out',
  scale: 'transform 0.2s ease-out',
  ripple: 'ripple effect on click',
  stagger: 'delay entre elementos (0.1s por item)',
}
```

### Micro-interações:

- **Hover:** Elevação, escala, mudança de cor
- **Click:** Ripple effect, feedback tátil
- **Loading:** Skeleton screens elegantes
- **Success:** Confetti ou animação de check
- **Error:** Shake suave no elemento

---

## 📊 Casos de Uso

### UC1: Abrir Mesa e Acessar Cardápio
**Ator:** Cliente  
**Fluxo:**
1. Cliente escaneia QR Code na mesa
2. Sistema identifica mesa e abre comanda automaticamente
3. Mesa aparece no KDS e no compartilhador
4. Cliente é redirecionado para tela inicial do cardápio
5. Visualiza botões principais (Cardápio, Chamar Garçom, Carrinho, Fechar Conta)

### UC2: Navegar pelo Cardápio
**Ator:** Cliente  
**Fluxo:**
1. Cliente clica em "Cardápio" na tela inicial
2. Visualiza grupos de produtos com design premium
3. Clica em um grupo
4. Visualiza produtos do grupo
5. Clica em um produto
6. Visualiza detalhes completos em modal elegante
7. Seleciona complementos (se houver)
8. Adiciona observações (opcional)
9. Adiciona ao carrinho

### UC3: Gerenciar Carrinho
**Ator:** Cliente  
**Fluxo:**
1. Cliente acessa carrinho (via botão ou badge)
2. Visualiza todos os itens adicionados
3. Modifica quantidade de um item
4. Remove um item (com confirmação)
5. Edita um item (abre modal de detalhes)
6. Visualiza total do pedido
7. Clica em "Enviar para Cozinha"
8. Pedido é enviado para KDS
9. Confirmação visual de sucesso
10. Carrinho é limpo (ou mantido para novos itens)

### UC4: Chamar Garçom
**Ator:** Cliente  
**Fluxo:**
1. Cliente clica em "Chamar Garçom"
2. Modal elegante abre com opções
3. Cliente seleciona motivo ou escreve mensagem
4. Confirma solicitação
5. Notificação é enviada para sistema
6. Confirmação visual de sucesso

### UC5: Fechar Conta
**Ator:** Cliente  
**Fluxo:**
1. Cliente clica em "Fechar Conta"
2. Modal de confirmação exibe resumo
3. Cliente confirma solicitação
4. Sistema envia solicitação para fechamento
5. Mesa fica em status "Aguardando Fechamento"
6. Garçom é notificado
7. Garçom acessa mesa via PDV/POS
8. Garçom efetua cobrança e finaliza mesa

### UC6: Buscar Produto
**Ator:** Cliente  
**Fluxo:**
1. Cliente acessa cardápio
2. Digita nome do produto na busca
3. Sistema filtra produtos em tempo real
4. Cliente visualiza resultados
5. Clica no produto desejado
6. Adiciona ao carrinho

---

## 🔐 Segurança e Autenticação do Cardápio

### Arquitetura de Segurança

O cardápio digital precisa de um sistema de autenticação seguro que:
1. **Não requer login do cliente** (experiência sem fricção)
2. **Isola completamente** as rotas do cardápio do resto do sistema
3. **Valida acesso** via QR Code assinado
4. **Identifica a sessão** do cliente na mesa
5. **Previne acesso não autorizado** a outras áreas do sistema

### Sistema de Token JWT para QR Code

#### 1. Geração do QR Code (Backend)

O backend gera um QR Code único para cada mesa com um token JWT assinado:

```typescript
// Estrutura do Token JWT no QR Code
interface QRCodeTokenPayload {
  // Identificação
  mesaId: string           // ID único da mesa
  numeroMesa: number        // Número da mesa (exibido)
  terminalId: string       // Terminal/PDV que gerou o QR
  empresaId: string        // Empresa dona da mesa
  
  // Validação
  iat: number              // Issued at (timestamp)
  exp: number              // Expiration (24h após geração)
  
  // Segurança
  tipo: 'MESA_CARDAPIO'    // Tipo de token
  assinatura: string        // Hash de validação adicional
}

// URL do QR Code
const qrCodeUrl = `https://app.exemplo.com/cardapio/qr/${tokenJWT}`
```

#### 2. Validação do Token (Frontend + Backend)

**Fluxo de Validação:**

1. **Cliente escaneia QR Code**
   - URL: `/cardapio/qr/[token]`
   - Frontend extrai token da URL

2. **Frontend valida token básico**
   - Verifica estrutura JWT
   - Verifica expiração (client-side check)
   - Redireciona se inválido

3. **Backend valida token completo**
   - Valida assinatura JWT
   - Verifica se mesa existe e está ativa
   - Verifica se empresa está ativa
   - Cria sessão de cardápio

4. **Criação de Sessão**
   - Gera `sessionToken` para a sessão do cardápio
   - Armazena em `sessionStorage` (frontend)
   - Armazena no backend (Redis ou DB)
   - Expira após 4 horas de inatividade

#### 3. Session Token (Token de Sessão)

Após validar o QR Code, o sistema cria um token de sessão:

```typescript
interface SessionTokenPayload {
  // Identificação da sessão
  sessionId: string        // UUID único da sessão
  mesaId: string           // Mesa vinculada
  empresaId: string        // Empresa
  
  // Cliente (opcional)
  clienteId?: string        // Se cliente se identificou
  clienteNome?: string     // Nome do cliente (opcional)
  clienteTelefone?: string // Telefone (opcional)
  
  // Validação
  iat: number
  exp: number              // 4 horas após última atividade
  
  // Segurança
  tipo: 'CARDAPIO_SESSION'
  ipAddress?: string       // IP do cliente (opcional, para segurança)
}
```

**Armazenamento:**
- **Frontend:** `sessionStorage` (não persiste entre abas)
- **Backend:** Redis ou tabela de sessões (para validação)

#### 4. Identificação do Cliente

**Opções de Identificação:**

**Opção A: Anônimo (Padrão)**
- Cliente não precisa se identificar
- Pedido vinculado apenas à mesa
- Identificação: "Cliente da Mesa X"

**Opção B: Opcional (Recomendado)**
- Cliente pode opcionalmente informar nome
- Útil para personalização e histórico
- Não obrigatório para fazer pedido

**Opção C: Obrigatório (Futuro)**
- Cliente deve informar dados
- Útil para programas de fidelidade
- Pode ser ativado por empresa

**Implementação Recomendada (Opção B):**

```typescript
// Modal opcional após escanear QR Code
interface ClienteInfo {
  nome?: string           // Opcional
  telefone?: string      // Opcional
  email?: string         // Opcional (futuro)
}

// Se cliente informar dados, atualiza sessão
POST /api/cardapio/sessao/[sessionId]/identificar
Body: { nome?: string, telefone?: string }
```

### Isolamento de Rotas

#### 1. Middleware de Proteção

Criar middleware específico para rotas do cardápio:

```typescript
// middleware.ts (atualização)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rotas do cardápio - validação específica
  if (pathname.startsWith('/cardapio/')) {
    return validateCardapioAccess(request)
  }
  
  // Rotas públicas existentes
  if (pathname === '/login' || ...) {
    return NextResponse.next()
  }
  
  // Rotas protegidas do sistema administrativo
  // ... validação existente
}

function validateCardapioAccess(request: NextRequest) {
  // Para rota /cardapio/qr/[token] - valida token do QR
  if (pathname.startsWith('/cardapio/qr/')) {
    const token = extractTokenFromPath(pathname)
    if (!token || !isValidQRToken(token)) {
      return NextResponse.redirect(new URL('/cardapio/erro', request.url))
    }
    return NextResponse.next()
  }
  
  // Para outras rotas do cardápio - valida session token
  const sessionToken = getSessionToken(request)
  if (!sessionToken || !isValidSessionToken(sessionToken)) {
    return NextResponse.redirect(new URL('/cardapio/erro', request.url))
  }
  
  return NextResponse.next()
}
```

#### 2. Layout Isolado

Criar layout específico que bloqueia acesso a outras áreas:

```typescript
// app/cardapio/layout.tsx
export default function CardapioLayout({ children }) {
  // Não renderiza TopNav administrativo
  // Bloqueia navegação para outras rotas
  // Aplica estilos específicos do cardápio
  
  return (
    <div className="cardapio-container">
      {/* Header específico do cardápio */}
      <CardapioHeader />
      <main className="cardapio-main">
        {children}
      </main>
      {/* Footer específico do cardápio */}
    </div>
  )
}
```

#### 3. Proteção de Navegação

```typescript
// Hook para proteger navegação
export function useCardapioNavigation() {
  const router = useRouter()
  
  // Intercepta tentativas de navegação para fora do cardápio
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!url.startsWith('/cardapio/')) {
        // Bloqueia navegação
        router.push('/cardapio')
        showToast.error('Acesso não permitido')
      }
    }
    
    router.events?.on('routeChangeStart', handleRouteChange)
    return () => router.events?.off('routeChangeStart', handleRouteChange)
  }, [router])
}
```

### Endpoints do Cardápio com Segurança

```typescript
// 1. Validação do QR Code
// app/api/cardapio/qr/[token]/validar/route.ts
POST /api/cardapio/qr/[token]/validar
- Valida token JWT do QR Code
- Verifica mesa e empresa
- Cria sessão de cardápio
- Retorna sessionToken
- Autenticação: Token do QR Code (na URL)

// 2. Abrir Mesa
// app/api/cardapio/sessao/[sessionId]/abrir-mesa/route.ts
POST /api/cardapio/sessao/[sessionId]/abrir-mesa
- Abre comanda da mesa
- Mesa aparece no KDS e compartilhador
- Autenticação: Session Token

// 3. Identificar Cliente (Opcional)
// app/api/cardapio/sessao/[sessionId]/identificar/route.ts
POST /api/cardapio/sessao/[sessionId]/identificar
Body: { nome?: string, telefone?: string }
- Atualiza informações do cliente na sessão
- Autenticação: Session Token

// 4. Buscar Cardápio
// app/api/cardapio/sessao/[sessionId]/cardapio/route.ts
GET /api/cardapio/sessao/[sessionId]/cardapio
- Retorna grupos e produtos ativos
- Filtra por ativoLocal
- Autenticação: Session Token

// 5. Gerenciar Carrinho
// app/api/cardapio/sessao/[sessionId]/carrinho/route.ts
GET /api/cardapio/sessao/[sessionId]/carrinho
POST /api/cardapio/sessao/[sessionId]/carrinho
PUT /api/cardapio/sessao/[sessionId]/carrinho/[itemId]
DELETE /api/cardapio/sessao/[sessionId]/carrinho/[itemId]
- Gerencia carrinho da mesa
- Autenticação: Session Token

// 6. Enviar Pedido
// app/api/cardapio/sessao/[sessionId]/enviar-pedido/route.ts
POST /api/cardapio/sessao/[sessionId]/enviar-pedido
- Envia pedido para KDS
- Atualiza mesa no compartilhador
- Autenticação: Session Token

// 7. Chamar Garçom
// app/api/cardapio/sessao/[sessionId]/chamar-garcom/route.ts
POST /api/cardapio/sessao/[sessionId]/chamar-garcom
Body: { motivo?: string, mensagem?: string }
- Envia solicitação de garçom
- Notificação push para garçom
- Autenticação: Session Token

// 8. Fechar Conta
// app/api/cardapio/sessao/[sessionId]/fechar-conta/route.ts
POST /api/cardapio/sessao/[sessionId]/fechar-conta
- Solicita fechamento da mesa
- Mesa fica em status "Aguardando Fechamento"
- Notificação para garçom
- Autenticação: Session Token
```

### Fluxo Completo de Autenticação

```
1. Cliente escaneia QR Code
   ↓
2. Frontend: /cardapio/qr/[token]
   - Extrai token da URL
   - Valida estrutura básica
   ↓
3. Frontend: POST /api/cardapio/qr/[token]/validar
   - Envia token para backend
   ↓
4. Backend: Valida token JWT
   - Verifica assinatura
   - Verifica expiração
   - Verifica mesa e empresa
   ↓
5. Backend: Cria sessão
   - Gera sessionToken
   - Armazena no Redis/DB
   - Retorna sessionToken
   ↓
6. Frontend: Armazena sessionToken
   - Salva em sessionStorage
   - Redireciona para /cardapio/mesa/[mesaId]
   ↓
7. Todas as requisições subsequentes
   - Incluem sessionToken no header
   - Backend valida sessionToken
   - Acesso permitido apenas ao cardápio
```

### Medidas de Segurança Adicionais

1. **Rate Limiting:**
   - Limitar tentativas de validação de QR Code (5 por minuto)
   - Limitar requisições por sessão (100 por minuto)

2. **Validação de IP (Opcional):**
   - Registrar IP na sessão
   - Alertar se IP mudar drasticamente

3. **Expiração de Sessão:**
   - Sessão expira após 4 horas de inatividade
   - Token de QR Code expira após 24 horas

4. **Logs de Auditoria:**
   - Registrar todas as ações do cardápio
   - Logs de tentativas de acesso inválidas

5. **CORS e Headers:**
   - Configurar CORS apenas para domínios permitidos
   - Headers de segurança (X-Frame-Options, etc.)

---

## 📱 Responsividade (Tablet-First)

### Breakpoints Otimizados:

- **Tablet Portrait:** 768px - 1024px (PRINCIPAL)
  - 2 colunas de grupos
  - Grid 2 colunas de produtos
  - Modal centralizado (80% da largura)
  - Botões grandes e touch-friendly

- **Tablet Landscape:** 1024px - 1366px
  - 3 colunas de grupos
  - Grid 3 colunas de produtos
  - Modal centralizado (70% da largura)
  - Layout mais espaçado

- **Mobile:** < 768px (SECUNDÁRIO)
  - 1 coluna de grupos
  - Lista vertical de produtos
  - Modal fullscreen para detalhes
  - Botões ainda maiores para touch

- **Desktop:** > 1366px (OPCIONAL)
  - 4 colunas de grupos
  - Grid 4 colunas de produtos
  - Modal centralizado (60% da largura, max 800px)
  - Layout mais compacto mas elegante

---

## 🚀 Fases de Implementação

### Fase 1: MVP Premium (Mínimo Viável com Design de Luxo)
- [ ] Sistema de QR Code e abertura de mesa
- [ ] Tela inicial com botões principais (design premium)
- [ ] Visualização de grupos (com cores e ícones)
- [ ] Visualização de produtos por grupo
- [ ] Detalhes do produto (modal premium)
- [ ] Sistema de carrinho básico
- [ ] Envio de pedido para KDS
- [ ] Integração com compartilhador de mesas
- [ ] Layout tablet-first responsivo

### Fase 2: Funcionalidades Completas
- [ ] Chamar garçom (modal e integração)
- [ ] Fechar conta (solicitação e integração)
- [ ] Modificações no carrinho (editar, remover)
- [ ] Complementos de produtos (seleção elegante)
- [ ] Observações nos itens
- [ ] Busca de produtos
- [ ] Histórico de pedidos da sessão
- [ ] Feedback visual de todas as ações

### Fase 3: Refinamentos Premium
- [ ] Animações e micro-interações avançadas
- [ ] Imagens de produtos (upload e exibição)
- [ ] Placeholders elegantes quando sem imagem
- [ ] Notificações em tempo real (WebSocket)
- [ ] Status do pedido no KDS (preparando, pronto)
- [ ] Modo escuro (opcional)
- [ ] Personalização por empresa (cores, logo)
- [ ] Analytics e métricas de uso

---

## 📝 Checklist Técnico

### Backend/API:
- [ ] Criar endpoints públicos para cardápio
- [ ] Implementar cache para dados públicos
- [ ] Validar filtros e parâmetros
- [ ] Otimizar queries (pagination, indexing)

### Frontend:
- [ ] Criar estrutura de pastas
- [ ] Implementar Server Components
- [ ] Criar componentes de UI
- [ ] Implementar busca com debounce
- [ ] Adicionar loading states
- [ ] Tratamento de erros
- [ ] Testes unitários
- [ ] Testes de integração

### Design:
- [ ] Criar mockups/wireframes
- [ ] Definir paleta de cores
- [ ] Selecionar fontes
- [ ] Criar componentes de UI base
- [ ] Testar em diferentes dispositivos

### Performance:
- [ ] Otimizar imagens (Next.js Image)
- [ ] Implementar lazy loading
- [ ] Code splitting
- [ ] Cache estratégico
- [ ] Monitorar Core Web Vitals

---

## 🧪 Testes

### Testes Unitários:
- Componentes isolados
- Hooks customizados
- Utilitários

### Testes de Integração:
- Fluxo completo de visualização
- Busca e filtros
- Navegação entre páginas

### Testes E2E:
- Cenários principais de uso
- Responsividade
- Performance

---

## 📚 Documentação

### Documentação Técnica:
- Arquitetura do cardápio
- APIs públicas
- Componentes e props
- Guias de uso

### Documentação de Usuário:
- Como acessar o cardápio
- Como fazer pedidos
- FAQ

---

## ❓ Decisões Já Definidas ✅

1. **Autenticação:**
   - ✅ Cardápio acessado via QR Code (token de mesa)
   - ✅ Não requer login do cliente
   - ✅ Validação via token assinado (JWT)
   - ✅ QR Code gerado pelo backend, fixo nas mesas

2. **Integração com Pedidos:**
   - ✅ Carrinho integrado no próprio cardápio
   - ✅ Envio direto para KDS
   - ✅ Integração com compartilhador de mesas

3. **Design:**
   - ✅ Design premium/luxuoso
   - ✅ Uso de cores e ícones dos grupos
   - ✅ Tablet-first
   - ✅ Identidade visual de primeira qualidade

4. **Fluxo:**
   - ✅ QR Code → Abre mesa → Cardápio
   - ✅ Tela inicial com 4 botões principais
   - ✅ Carrinho com modificações
   - ✅ Fechar conta chama garçom (sem pagamento direto)

5. **Imagens de Produtos:**
   - ✅ Campo de URL já existe no endpoint
   - ✅ Trabalhar com URLs de imagens
   - ✅ Placeholders elegantes quando não houver imagem
   - ✅ Especificações de resolução definidas (ver seção específica)

6. **KDS:**
   - ✅ Será desenvolvido com tecnologias Web
   - ✅ Preparar integração para WebSocket/REST

7. **Personalização:**
   - ✅ Inicialmente apenas logo e banner
   - ✅ Sem personalização completa por empresa (futuro)

8. **Notificações:**
   - ✅ Notificações push para garçom
   - ✅ Notificações em tempo real para cliente

9. **QR Code:**
   - ✅ Gerado pelo backend
   - ✅ Fixo nas mesas (card impresso)

---

## 🎯 Próximos Passos

1. **✅ Planejamento Completo** - Documento atualizado com todas as informações
2. **✅ Respostas às Perguntas** - Todas as decisões documentadas
3. **✅ Segurança e Autenticação** - Sistema completo de tokens e isolamento
4. **✅ Especificações de Imagens** - Resoluções e otimizações definidas
5. **Criar mockups/wireframes premium** - Design visual de alta qualidade
6. **Definir detalhes técnicos do KDS** - Protocolo de comunicação (WebSocket/REST)
7. **Implementar sistema de tokens** - Backend para geração e validação
8. **Criar middleware de isolamento** - Proteção de rotas do cardápio
9. **Iniciar implementação da Fase 1** - MVP Premium
10. **Desenvolvimento iterativo** - Testes em tablet real durante desenvolvimento

## 📋 Resumo das Decisões Técnicas

### Autenticação e Segurança:
- ✅ Token JWT no QR Code (gerado pelo backend, fixo nas mesas)
- ✅ Session Token após validação (4h de expiração)
- ✅ Isolamento completo de rotas via middleware
- ✅ Identificação opcional do cliente (nome, telefone)
- ✅ Validação em múltiplas camadas (frontend + backend)

### Imagens:
- ✅ Campo URL já existe no endpoint
- ✅ Resoluções definidas: Mobile (400-600px), Tablet (600-800px), Desktop (800-1200px)
- ✅ Aspect ratio 4:3 (padrão)
- ✅ Formato WebP com fallback JPG
- ✅ Placeholders elegantes com cor do grupo

### Integrações:
- ✅ KDS será Web (preparar WebSocket/REST)
- ✅ Notificações push para garçom
- ✅ Notificações em tempo real para cliente
- ✅ Compartilhador de mesas (já existe)

### Personalização:
- ✅ Logo da empresa no header
- ✅ Banner para divulgações
- ✅ Sem personalização completa inicialmente

---

## 🚧 Estratégia de Desenvolvimento: Frontend First

### Contexto Atual do Backend

**✅ O que já existe:**
- Endpoints de produtos e grupos (já funcionais)
- Sistema de compartilhador de mesas abertas
- Estrutura de dados de produtos completa

**❌ O que ainda não existe:**
- Sistema de validação de QR Code com tokenização
- Endpoints específicos do cardápio digital
- Sistema de sessões do cardápio
- Geração de tokens JWT para QR Code

### Estratégia: Desenvolvimento em Fases

#### Fase 1: Frontend Completo (Atual)
**Objetivo:** Desenvolver toda a interface do cardápio digital com dados mockados/simulados, preparando a estrutura para integração futura.

**O que será desenvolvido:**
- ✅ Toda a UI/UX do cardápio premium
- ✅ Componentes React completos
- ✅ Fluxo completo de navegação
- ✅ Sistema de carrinho (localStorage/sessionStorage)
- ✅ Integração com dados existentes (produtos e grupos)
- ✅ Mock de autenticação via QR Code
- ✅ Preparação para APIs futuras

**O que será mockado/simulado:**
- 🔄 Validação de QR Code (mock local)
- 🔄 Session Token (gerado localmente)
- 🔄 Envio de pedidos para KDS (simulado)
- 🔄 Chamar garçom (simulado)
- 🔄 Fechar conta (simulado)

#### Fase 2: Integração com Backend (Futuro)
**Objetivo:** Substituir mocks por chamadas reais ao backend quando APIs estiverem prontas.

**O que será implementado:**
- Integração com endpoints de validação de QR Code
- Integração com sistema de sessões
- Integração real com KDS
- Integração com notificações push
- Validação completa de segurança

### Preparação para Backend Futuro

#### 1. Contratos de API Definidos

Todos os endpoints foram documentados no planejamento. O frontend será desenvolvido seguindo esses contratos:

```typescript
// Exemplo: Contrato de API para validação de QR Code
interface QRCodeValidationRequest {
  token: string // Token JWT do QR Code
}

interface QRCodeValidationResponse {
  valid: boolean
  sessionToken?: string
  mesaId?: string
  numeroMesa?: number
  empresaId?: string
  error?: string
}

// Endpoint: POST /api/cardapio/qr/[token]/validar
```

#### 2. Camada de Abstração

Criar uma camada de serviços que pode ser facilmente substituída:

```typescript
// src/infrastructure/api/cardapio/CardapioApiService.ts
export interface ICardapioApiService {
  validarQRCode(token: string): Promise<QRCodeValidationResponse>
  buscarCardapio(sessionId: string): Promise<CardapioData>
  gerenciarCarrinho(sessionId: string, action: CarrinhoAction): Promise<CarrinhoResponse>
  enviarPedido(sessionId: string, pedido: Pedido): Promise<PedidoResponse>
  chamarGarcom(sessionId: string, motivo: string): Promise<void>
  fecharConta(sessionId: string): Promise<void>
}

// Implementação Mock (Fase 1)
export class CardapioApiServiceMock implements ICardapioApiService {
  // Implementação com dados mockados
}

// Implementação Real (Fase 2)
export class CardapioApiService implements ICardapioApiService {
  // Implementação com chamadas reais ao backend
}
```

#### 3. Variáveis de Ambiente

Preparar variáveis de ambiente para controlar o modo:

```typescript
// .env.local
NEXT_PUBLIC_CARDAPIO_MODE=mock // ou 'production'
NEXT_PUBLIC_CARDAPIO_API_URL=http://localhost:3000/api/cardapio
```

#### 4. Hooks Customizados Preparados

Hooks que funcionam tanto com mock quanto com API real:

```typescript
// src/presentation/hooks/useCardapioSession.ts
export function useCardapioSession() {
  const mode = process.env.NEXT_PUBLIC_CARDAPIO_MODE || 'mock'
  const apiService = mode === 'mock' 
    ? new CardapioApiServiceMock() 
    : new CardapioApiService()
  
  // Lógica que funciona para ambos
}
```

### Estrutura de Dados Mock

#### 1. Mock de Validação de QR Code

```typescript
// src/infrastructure/api/cardapio/mocks/qrCodeMock.ts
export const mockQRCodeValidation = {
  valid: true,
  sessionToken: 'mock-session-token-' + Date.now(),
  mesaId: 'mock-mesa-id',
  numeroMesa: 1,
  empresaId: 'mock-empresa-id',
}
```

#### 2. Mock de Dados da Mesa

```typescript
// src/infrastructure/api/cardapio/mocks/mesaMock.ts
export const mockMesaData = {
  id: 'mock-mesa-id',
  numero: 1,
  status: 'ABERTA',
  abertaEm: new Date().toISOString(),
  cliente: null, // Opcional
}
```

#### 3. Mock de Envio de Pedido

```typescript
// src/infrastructure/api/cardapio/mocks/pedidoMock.ts
export const mockEnviarPedido = async (pedido: Pedido) => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    success: true,
    pedidoId: 'mock-pedido-id',
    mensagem: 'Pedido enviado para cozinha com sucesso!',
  }
}
```

### Checklist de Desenvolvimento Frontend

#### Preparação:
- [ ] Criar estrutura de pastas do cardápio
- [ ] Configurar variáveis de ambiente
- [ ] Criar camada de abstração de API
- [ ] Implementar serviços mock
- [ ] Configurar rotas isoladas

#### Componentes:
- [ ] Tela inicial (CardapioHomeScreen)
- [ ] Visualização de grupos
- [ ] Visualização de produtos
- [ ] Modal de detalhes do produto
- [ ] Sistema de carrinho completo
- [ ] Modal chamar garçom
- [ ] Modal fechar conta
- [ ] Header do cardápio
- [ ] Busca de produtos

#### Integrações:
- [ ] Integração com endpoints existentes (produtos/grupos)
- [ ] Sistema de carrinho (localStorage)
- [ ] Mock de validação QR Code
- [ ] Mock de sessão
- [ ] Mock de envio de pedido

#### Design:
- [ ] Aplicar design premium
- [ ] Animações e micro-interações
- [ ] Responsividade tablet-first
- [ ] Placeholders elegantes
- [ ] Estados de loading/error

### Notas Importantes para Desenvolvimento

1. **Dados Reais vs Mock:**
   - Usar dados reais de produtos e grupos (já existem)
   - Mockar apenas autenticação e ações do cardápio

2. **Preparação para Backend:**
   - Todos os contratos de API já estão documentados
- Criar interfaces TypeScript para todos os contratos
- Implementar validação de dados no frontend
- Preparar tratamento de erros

3. **Testes:**
   - Testar fluxo completo com dados mockados
   - Validar que substituição por API real será simples
   - Testar em tablet real durante desenvolvimento

4. **Documentação:**
   - Documentar todos os mocks criados
   - Documentar como substituir por API real
   - Manter contratos de API atualizados

### Migração Futura (Fase 2)

Quando o backend estiver pronto:

1. **Substituir Serviços Mock:**
   ```typescript
   // Trocar apenas a implementação
   const apiService = new CardapioApiService() // ao invés de Mock
   ```

2. **Atualizar Variáveis de Ambiente:**
   ```env
   NEXT_PUBLIC_CARDAPIO_MODE=production
   ```

3. **Testar Integração:**
   - Validar todos os endpoints
   - Testar fluxo completo
   - Validar segurança

4. **Remover Código Mock:**
   - Manter apenas implementação real
   - Limpar código não utilizado

---

## ✅ Pronto para Desenvolvimento

Com essas anotações, o desenvolvimento do frontend pode começar com:
- ✅ Estrutura clara do que será mockado
- ✅ Preparação para integração futura
- ✅ Contratos de API definidos
- ✅ Estratégia de migração documentada

**Aguardando sinal para iniciar desenvolvimento do cardápio digital! 🚀**

## 📐 Considerações de Design Premium

### Inspirações Visuais:
- **Restaurantes de alta gastronomia:** Design elegante e sofisticado
- **Apps premium de delivery:** Interface limpa e intuitiva
- **Sistemas POS modernos:** Funcionalidade com estilo
- **Design Systems modernos:** Material Design 3, Apple HIG, Ant Design

### Elementos de Luxo:

#### 1. Tipografia Premium:
- **Fonte Principal:** Inter, Poppins, ou Montserrat (pesos: 400, 500, 600, 700)
- **Hierarquia Clara:**
  - Títulos: 32px-48px (bold)
  - Subtítulos: 24px-32px (semibold)
  - Corpo: 16px-18px (regular)
  - Pequeno: 12px-14px (regular)
- **Line Height:** Generoso (1.5-1.8)
- **Letter Spacing:** Ajustado para legibilidade

#### 2. Espaçamento Generoso:
- **Padding:** Mínimo 16px, ideal 24px-32px
- **Margens:** Espaçamento entre elementos (24px-48px)
- **Grid:** Sistema de 8px (8, 16, 24, 32, 48, 64)
- **Respiro Visual:** Não sobrecarregar com informações

#### 3. Paleta de Cores Sofisticada:
- **Cores dos Grupos:** Base dinâmica via `corHex`
- **Gradientes Elegantes:**
  - Linear: De corHex para corHex mais escura/clara
  - Radial: Do centro para as bordas
  - Overlay: Gradiente sutil sobre imagens
- **Neutros Premium:**
  - Cinzas suaves (não puros #000 ou #FFF)
  - Tons quentes ou frios conforme identidade
- **Acentos:**
  - Dourado (#E6AA37) para ações importantes
  - Verde suave para sucesso
  - Vermelho elegante para erros

#### 4. Sombras e Profundidade:
- **Múltiplas Camadas:**
  - Elevação 1: `0 1px 3px rgba(0,0,0,0.12)`
  - Elevação 2: `0 4px 6px rgba(0,0,0,0.1)`
  - Elevação 3: `0 10px 20px rgba(0,0,0,0.15)`
  - Elevação 4: `0 20px 40px rgba(0,0,0,0.2)`
- **Hover:** Aumentar elevação + escala sutil (1.02-1.05)

#### 5. Animações Elegantes:
- **Duração:** 200ms-400ms (nunca mais que 500ms)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design)
- **Tipos:**
  - Fade: `opacity 0.3s ease`
  - Slide: `transform 0.3s ease, opacity 0.3s ease`
  - Scale: `transform 0.2s ease`
  - Stagger: Delay progressivo entre elementos (0.1s)
- **Micro-interações:**
  - Ripple effect em botões
  - Loading skeleton elegante
  - Confetti ou check animado em sucesso
  - Shake suave em erros

#### 6. Glassmorphism (Opcional):
- **Modais e Overlays:**
  - Background: `rgba(255, 255, 255, 0.8)` ou `rgba(0, 0, 0, 0.5)`
  - Backdrop blur: `backdrop-filter: blur(10px)`
  - Borda sutil: `border: 1px solid rgba(255, 255, 255, 0.2)`

#### 7. Imagens de Alta Qualidade:

**Especificações Técnicas:**

**Resoluções Recomendadas:**
- **Mobile (< 768px):**
  - Largura: 400px - 600px
  - Altura: 300px - 450px (mantendo aspect ratio)
  - Formato: WebP (fallback JPG)
  - Qualidade: 85%
  - Tamanho máximo: 150KB

- **Tablet (768px - 1024px):**
  - Largura: 600px - 800px
  - Altura: 450px - 600px (mantendo aspect ratio)
  - Formato: WebP (fallback JPG)
  - Qualidade: 90%
  - Tamanho máximo: 250KB

- **Desktop (> 1024px):**
  - Largura: 800px - 1200px
  - Altura: 600px - 900px (mantendo aspect ratio)
  - Formato: WebP (fallback JPG)
  - Qualidade: 90%
  - Tamanho máximo: 400KB

**Aspect Ratio:**
- **Padrão:** 4:3 (mais quadrado, melhor para produtos)
- **Alternativa:** 16:9 (mais cinematográfico)
- **Consistência:** Todas as imagens devem usar o mesmo aspect ratio

**Implementação:**

```typescript
// Next.js Image Component com otimização
<Image
  src={produto.imagemUrl || '/placeholder-produto.jpg'}
  alt={produto.nome}
  width={800}
  height={600}
  quality={90}
  format="webp"
  placeholder="blur"
  blurDataURL={generateBlurPlaceholder(produto.corHex)}
  className="rounded-lg object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**Placeholders Elegantes:**
- **Quando não houver imagem:**
  - Gradiente sutil usando `corHex` do grupo
  - Ícone do grupo centralizado (tamanho grande)
  - Texto "Sem imagem" discreto na parte inferior
  - Efeito de blur sutil

**Lazy Loading:**
- **Blur-up effect:** Mostra placeholder borrado enquanto carrega
- **Intersection Observer:** Carrega apenas quando visível
- **Prioridade:** Imagens acima da dobra com `priority={true}`

**Otimização:**
- **Formato WebP:** Melhor compressão, suporte moderno
- **Fallback JPG:** Para navegadores antigos
- **CDN:** Servir imagens via CDN para performance
- **Responsive Images:** `srcset` para diferentes tamanhos

#### 8. Componentes Premium:

**Botões:**
- Tamanho mínimo: 44x44px (touch-friendly)
- Bordas arredondadas: 12px-16px
- Padding: 16px-24px horizontal, 12px-16px vertical
- Efeito hover: Elevação + escala
- Efeito active: Escala para baixo (0.98)

**Cards:**
- Bordas arredondadas: 16px-24px
- Padding: 20px-24px
- Sombra: Elevação 2-3
- Hover: Elevação 4 + escala 1.02

**Inputs:**
- Altura: 48px-56px
- Bordas arredondadas: 12px
- Padding: 16px
- Focus: Borda colorida + sombra sutil
- Placeholder: Cor suave

**Modais:**
- Largura máxima: 90% (mobile), 600px-800px (tablet)
- Bordas arredondadas: 24px
- Padding: 32px
- Animação de entrada: Slide-up + fade

### Experiência do Usuário Premium:

#### 1. Simplicidade:
- **Fluxo Intuitivo:** Máximo 3 cliques para qualquer ação
- **Navegação Clara:** Sempre saber onde está
- **Ações Óbvias:** Botões grandes e claros
- **Sem Fricção:** Reduzir passos desnecessários

#### 2. Clareza:
- **Hierarquia Visual:** O que é mais importante se destaca
- **Informações Organizadas:** Agrupamento lógico
- **Feedback Imediato:** Confirmação de todas as ações
- **Estados Visuais:** Loading, sucesso, erro claros

#### 3. Delight (Encantamento):
- **Micro-animações:** Pequenos detalhes que surpreendem
- **Transições Suaves:** Navegação fluida
- **Easter Eggs:** Detalhes sutis (se apropriado)
- **Personalização:** Cores dos grupos criam identidade única

#### 4. Performance:
- **Carregamento Rápido:** < 2s para primeira renderização
- **Animações Fluidas:** 60fps constante
- **Lazy Loading:** Carregar sob demanda
- **Cache Inteligente:** Dados frequentes em cache

#### 5. Confiabilidade:
- **Feedback de Todas as Ações:** Nada acontece "silenciosamente"
- **Estados de Erro Claros:** Mensagens amigáveis
- **Retry em Falhas:** Opção de tentar novamente
- **Persistência:** Dados não se perdem (sessionStorage)

### Checklist de Design Premium:

- [ ] Tipografia premium escolhida e aplicada
- [ ] Sistema de espaçamento consistente (8px grid)
- [ ] Paleta de cores definida (base + grupos dinâmicos)
- [ ] Gradientes elegantes implementados
- [ ] Sombras em múltiplas camadas
- [ ] Animações suaves (200-400ms)
- [ ] Micro-interações em todos os elementos interativos
- [ ] Placeholders elegantes para imagens
- [ ] Botões touch-friendly (min 44x44px)
- [ ] Cards com bordas arredondadas generosas
- [ ] Modais com animação de entrada elegante
- [ ] Feedback visual em todas as ações
- [ ] Loading states elegantes (skeleton screens)
- [ ] Estados de erro amigáveis
- [ ] Responsividade testada em tablet real

---

## 📞 Contato

Para dúvidas ou sugestões sobre este planejamento, consulte a equipe de desenvolvimento.
