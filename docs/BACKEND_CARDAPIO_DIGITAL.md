# 🔧 Documentação Backend: Cardápio Digital

## 📋 Visão Geral

Este documento descreve **tudo que o backend precisa implementar** para que o cardápio digital funcione completamente. O frontend foi desenvolvido com **mocks/simulações** e está pronto para integração assim que estas APIs estiverem disponíveis.

---

## 🎯 Objetivo

Implementar um sistema completo de autenticação e gerenciamento de cardápio digital que permite:
- Clientes acessarem o cardápio via QR Code (sem login)
- Fazerem pedidos diretamente à cozinha (KDS)
- Gerenciarem carrinho de compras
- Solicitarem atendimento (chamar garçom)
- Fecharem conta (solicitar cobrança)

---

## 📊 Arquitetura Geral

### Fluxo de Autenticação

```
1. Cliente escaneia QR Code
   ↓
2. Frontend: POST /api/cardapio/qr/[token]/validar
   ↓
3. Backend: Valida token JWT, cria sessão
   ↓
4. Backend: Retorna sessionToken
   ↓
5. Frontend: Usa sessionToken em todas as requisições
```

### Isolamento de Segurança

- **QR Code Token:** JWT assinado, válido por 24h
- **Session Token:** JWT assinado, válido por 4h (renovado a cada atividade)
- **Rotas isoladas:** Apenas `/api/cardapio/*` acessíveis com sessionToken
- **Validação multi-camada:** Token + Mesa + Empresa

---

## 🔐 Sistema de Autenticação

### 1. Geração de QR Code (Já deve existir ou precisa criar)

#### Endpoint: Gerar QR Code para Mesa

```http
POST /api/mesas/{mesaId}/gerar-qr-code
Authorization: Bearer {adminToken}
```

**Request:**
```json
{
  "mesaId": "uuid-da-mesa",
  "numeroMesa": 1,
  "terminalId": "uuid-do-terminal",
  "empresaId": "uuid-da-empresa"
}
```

**Response:**
```json
{
  "qrCodeUrl": "https://app.exemplo.com/cardapio/qr/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Token JWT Payload:**
```json
{
  "mesaId": "uuid-da-mesa",
  "numeroMesa": 1,
  "terminalId": "uuid-do-terminal",
  "empresaId": "uuid-da-empresa",
  "iat": 1704067200,
  "exp": 1704153600,
  "tipo": "MESA_CARDAPIO"
}
```

**Notas:**
- Token deve ser assinado com `JWT_SECRET`
- Expiração: 24 horas após geração
- Token é fixo (não muda) para cada mesa
- QR Code pode ser impresso e fixado na mesa

---

### 2. Validação de QR Code

#### Endpoint: Validar Token do QR Code

```http
POST /api/cardapio/qr/{token}/validar
```

**Request:**
- Token vem na URL (path parameter)

**Response (Sucesso):**
```json
{
  "valid": true,
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mesaId": "uuid-da-mesa",
  "numeroMesa": 1,
  "empresaId": "uuid-da-empresa",
  "terminalId": "uuid-do-terminal",
  "mesa": {
    "id": "uuid-da-mesa",
    "numero": 1,
    "status": "DISPONIVEL",
    "ativa": true
  }
}
```

**Response (Erro):**
```json
{
  "valid": false,
  "error": "Token inválido ou expirado",
  "code": "INVALID_TOKEN"
}
```

**Códigos de Erro:**
- `INVALID_TOKEN`: Token inválido ou malformado
- `EXPIRED_TOKEN`: Token expirado
- `MESA_INATIVA`: Mesa não está ativa
- `EMPRESA_INATIVA`: Empresa não está ativa
- `MESA_NAO_ENCONTRADA`: Mesa não existe

**Lógica de Validação:**
1. Validar assinatura JWT do token
2. Verificar expiração (`exp`)
3. Verificar se mesa existe e está ativa
4. Verificar se empresa existe e está ativa
5. Criar sessão de cardápio
6. Gerar `sessionToken` (JWT)
7. Retornar dados da sessão

**Session Token Payload:**
```json
{
  "sessionId": "uuid-unico-da-sessao",
  "mesaId": "uuid-da-mesa",
  "empresaId": "uuid-da-empresa",
  "terminalId": "uuid-do-terminal",
  "numeroMesa": 1,
  "iat": 1704067200,
  "exp": 1704081600,
  "tipo": "CARDAPIO_SESSION"
}
```

**Armazenamento de Sessão:**
- Criar registro na tabela `cardapio_sessoes` ou Redis
- Campos: `sessionId`, `mesaId`, `empresaId`, `clienteId` (opcional), `createdAt`, `lastActivity`, `expiresAt`
- `expiresAt`: 4 horas após última atividade

---

### 3. Identificação do Cliente (Opcional)

#### Endpoint: Identificar Cliente na Sessão

```http
POST /api/cardapio/sessao/{sessionId}/identificar
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{
  "nome": "João Silva",
  "telefone": "11999999999"
}
```

**Response:**
```json
{
  "success": true,
  "cliente": {
    "id": "uuid-do-cliente-ou-sessao",
    "nome": "João Silva",
    "telefone": "11999999999"
  }
}
```

**Notas:**
- Campos são opcionais (pode enviar apenas nome ou apenas telefone)
- Se cliente já existe no sistema, pode vincular
- Se não existe, cria registro temporário ou vincula à sessão
- Atualiza sessão com informações do cliente

---

## 🍽️ Gerenciamento de Cardápio

### 4. Buscar Cardápio da Mesa

#### Endpoint: Obter Grupos e Produtos Disponíveis

```http
GET /api/cardapio/sessao/{sessionId}/cardapio
Authorization: Bearer {sessionToken}
```

**Query Parameters:**
- `ativoLocal`: boolean (opcional, padrão: true)
- `grupoId`: string (opcional, filtrar por grupo)

**Response:**
```json
{
  "grupos": [
    {
      "id": "uuid-do-grupo",
      "nome": "Bebidas",
      "corHex": "#FF5733",
      "iconName": "local_drink",
      "ordem": 1,
      "ativo": true,
      "ativoLocal": true,
      "produtosCount": 15
    }
  ],
  "produtos": [
    {
      "id": "uuid-do-produto",
      "nome": "Coca-Cola 350ml",
      "descricao": "Refrigerante gelado",
      "valor": 5.50,
      "imagemUrl": "https://cdn.exemplo.com/produtos/coca-cola.jpg",
      "grupoId": "uuid-do-grupo",
      "grupoNome": "Bebidas",
      "ativo": true,
      "ativoLocal": true,
      "favorito": false,
      "abreComplementos": false,
      "permiteAcrescimo": false,
      "permiteDesconto": false,
      "gruposComplementos": [],
      "estoque": null
    }
  ]
}
```

**Notas:**
- Retorna apenas grupos e produtos `ativoLocal = true`
- Ordena grupos por campo `ordem`
- Ordena produtos por nome
- Se `grupoId` fornecido, retorna apenas produtos daquele grupo

---

## 🛒 Gerenciamento de Carrinho

### 5. Obter Carrinho

#### Endpoint: Buscar Itens do Carrinho

```http
GET /api/cardapio/sessao/{sessionId}/carrinho
Authorization: Bearer {sessionToken}
```

**Response:**
```json
{
  "itens": [
    {
      "id": "uuid-do-item",
      "produtoId": "uuid-do-produto",
      "produtoNome": "Coca-Cola 350ml",
      "produtoImagemUrl": "https://cdn.exemplo.com/produtos/coca-cola.jpg",
      "quantidade": 2,
      "valorUnitario": 5.50,
      "valorTotal": 11.00,
      "complementos": [
        {
          "grupoComplementoId": "uuid-do-grupo",
          "grupoComplementoNome": "Tamanho",
          "complementoId": "uuid-do-complemento",
          "complementoNome": "Grande",
          "valorAdicional": 2.00
        }
      ],
      "observacoes": "Sem gelo",
      "adicionadoEm": "2024-01-01T12:00:00Z"
    }
  ],
  "subtotal": 13.00,
  "total": 13.00,
  "totalItens": 2
}
```

**Notas:**
- Carrinho é vinculado à sessão (mesa)
- Persiste até enviar pedido ou fechar mesa
- Pode ser armazenado em Redis ou banco de dados

---

### 6. Adicionar Item ao Carrinho

#### Endpoint: Adicionar Produto ao Carrinho

```http
POST /api/cardapio/sessao/{sessionId}/carrinho
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{
  "produtoId": "uuid-do-produto",
  "quantidade": 2,
  "complementos": [
    {
      "grupoComplementoId": "uuid-do-grupo-complemento",
      "complementoId": "uuid-do-complemento"
    }
  ],
  "observacoes": "Sem gelo, por favor"
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "id": "uuid-do-item",
    "produtoId": "uuid-do-produto",
    "produtoNome": "Coca-Cola 350ml",
    "quantidade": 2,
    "valorUnitario": 5.50,
    "valorTotal": 11.00,
    "complementos": [...],
    "observacoes": "Sem gelo, por favor"
  },
  "carrinho": {
    "totalItens": 3,
    "subtotal": 13.00,
    "total": 13.00
  }
}
```

**Validações:**
- Verificar se produto existe e está ativo
- Verificar se produto está disponível para local (`ativoLocal`)
- Verificar se complementos são válidos
- Verificar estoque (se aplicável)
- Calcular valor total (produto + complementos)

---

### 7. Modificar Item do Carrinho

#### Endpoint: Atualizar Item do Carrinho

```http
PUT /api/cardapio/sessao/{sessionId}/carrinho/{itemId}
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{
  "quantidade": 3,
  "complementos": [
    {
      "grupoComplementoId": "uuid-do-grupo-complemento",
      "complementoId": "uuid-do-complemento"
    }
  ],
  "observacoes": "Com gelo agora"
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "id": "uuid-do-item",
    "quantidade": 3,
    "valorTotal": 16.50,
    ...
  },
  "carrinho": {
    "totalItens": 4,
    "subtotal": 16.50,
    "total": 16.50
  }
}
```

**Notas:**
- Todos os campos são opcionais (pode atualizar apenas quantidade, apenas complementos, etc.)
- Recalcula valor total automaticamente

---

### 8. Remover Item do Carrinho

#### Endpoint: Remover Item do Carrinho

```http
DELETE /api/cardapio/sessao/{sessionId}/carrinho/{itemId}
Authorization: Bearer {sessionToken}
```

**Response:**
```json
{
  "success": true,
  "carrinho": {
    "totalItens": 2,
    "subtotal": 11.00,
    "total": 11.00
  }
}
```

---

## 📤 Envio de Pedidos

### 9. Enviar Pedido para KDS

#### Endpoint: Enviar Pedido para Cozinha

```http
POST /api/cardapio/sessao/{sessionId}/enviar-pedido
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{
  "itens": [
    {
      "itemId": "uuid-do-item-carrinho",
      "produtoId": "uuid-do-produto",
      "produtoNome": "Coca-Cola 350ml",
      "quantidade": 2,
      "complementos": [...],
      "observacoes": "Sem gelo"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "pedidoId": "uuid-do-pedido",
  "numeroPedido": 123,
  "mensagem": "Pedido enviado para cozinha com sucesso!",
  "tempoEstimado": 15,
  "enviadoEm": "2024-01-01T12:00:00Z"
}
```

**Lógica:**
1. Validar que carrinho não está vazio
2. Validar que mesa está aberta
3. Criar pedido no sistema
4. Enviar para KDS (WebSocket ou REST)
5. Atualizar mesa no compartilhador
6. Limpar carrinho (ou manter para novos itens)
7. Retornar confirmação

**Integração com KDS:**
- Enviar via WebSocket para `/kds/pedidos` ou
- POST para `/api/kds/pedidos`
- Formato: Ver seção "Integração com KDS"

**Integração com Compartilhador:**
- Atualizar mesa no compartilhador
- Mesa deve aparecer como "Com pedido" ou similar
- Garçom pode ver pedidos via PDV/POS

---

## 🛎️ Atendimento

### 10. Chamar Garçom

#### Endpoint: Solicitar Atendimento

```http
POST /api/cardapio/sessao/{sessionId}/chamar-garcom
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{
  "motivo": "PRECISO_AJUDA",
  "mensagem": "Preciso de uma garrafa de água"
}
```

**Motivos Possíveis:**
- `PRECISO_AJUDA`: Preciso de ajuda
- `PEDIDO_ESPECIAL`: Quero fazer um pedido especial
- `PROBLEMA_PEDIDO`: Problema com o pedido
- `OUTRO`: Outro motivo

**Response:**
```json
{
  "success": true,
  "solicitacaoId": "uuid-da-solicitacao",
  "mensagem": "Garçom foi chamado! Aguarde alguns instantes.",
  "enviadoEm": "2024-01-01T12:00:00Z"
}
```

**Lógica:**
1. Criar solicitação de atendimento
2. Enviar notificação push para garçom
3. Atualizar status da mesa (se necessário)
4. Registrar no log de atendimentos

**Notificação Push:**
- Enviar para garçom via WebSocket ou serviço de push
- Formato: `{ tipo: 'CHAMAR_GARCOM', mesaId, numeroMesa, motivo, mensagem }`

---

### 11. Fechar Conta

#### Endpoint: Solicitar Fechamento da Mesa

```http
POST /api/cardapio/sessao/{sessionId}/fechar-conta
Authorization: Bearer {sessionToken}
```

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "mensagem": "Solicitação enviada! Um garçom virá para finalizar o pagamento.",
  "resumo": {
    "totalItens": 5,
    "subtotal": 45.50,
    "total": 45.50
  },
  "solicitadoEm": "2024-01-01T12:00:00Z"
}
```

**Lógica:**
1. Validar que há pedidos na mesa
2. Calcular total da conta
3. Atualizar status da mesa para "AGUARDANDO_FECHAMENTO"
4. Enviar notificação push para garçom
5. Mesa fica disponível no compartilhador para fechamento via PDV/POS

**Nota Importante:**
- Cliente **NÃO** pode pagar pelo cardápio
- Apenas garçom pode fechar conta via PDV/POS
- Cardápio apenas **solicita** o fechamento

---

## 🔗 Integrações

### Integração com KDS (Kitchen Display System)

#### Formato de Dados para KDS

Quando um pedido é enviado, os dados devem ser enviados para o KDS:

**WebSocket:**
```json
{
  "tipo": "NOVO_PEDIDO",
  "pedidoId": "uuid-do-pedido",
  "mesaId": "uuid-da-mesa",
  "numeroMesa": 1,
  "itens": [
    {
      "produtoId": "uuid-do-produto",
      "produtoNome": "Coca-Cola 350ml",
      "quantidade": 2,
      "complementos": [
        {
          "grupoNome": "Tamanho",
          "complementoNome": "Grande"
        }
      ],
      "observacoes": "Sem gelo"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**REST (alternativa):**
```http
POST /api/kds/pedidos
Content-Type: application/json

{
  "pedidoId": "uuid-do-pedido",
  "mesaId": "uuid-da-mesa",
  "numeroMesa": 1,
  "itens": [...]
}
```

**Atualização de Status (KDS → Backend):**
```http
PUT /api/kds/pedidos/{pedidoId}/status
Content-Type: application/json

{
  "status": "PREPARANDO" | "PRONTO" | "ENTREGUE"
}
```

**Notificação para Cliente (quando pedido pronto):**
- Backend recebe atualização do KDS
- Envia notificação em tempo real para cliente via WebSocket
- Cliente recebe: `{ tipo: 'PEDIDO_PRONTO', pedidoId, mesaId }`

---

### Integração com Compartilhador de Mesas

O compartilhador já existe. O cardápio precisa:

1. **Abrir Mesa:**
   - Quando QR Code é validado, mesa deve aparecer no compartilhador
   - Status: "ABERTA" ou "EM_USO"

2. **Atualizar Mesa:**
   - Quando pedido é enviado, atualizar mesa
   - Status: "COM_PEDIDO" ou similar

3. **Fechar Mesa:**
   - Quando garçom fecha via PDV/POS, mesa é fechada
   - Cardápio deve ser notificado (WebSocket)

---

## 📊 Estrutura de Dados

### Tabela: `cardapio_sessoes`

```sql
CREATE TABLE cardapio_sessoes (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  mesa_id UUID NOT NULL REFERENCES mesas(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  terminal_id UUID NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nome VARCHAR(255),
  cliente_telefone VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ATIVA',
  INDEX idx_mesa_id (mesa_id),
  INDEX idx_session_id (session_id),
  INDEX idx_expires_at (expires_at)
);
```

### Tabela: `cardapio_carrinho`

```sql
CREATE TABLE cardapio_carrinho (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_session_id (session_id),
  INDEX idx_produto_id (produto_id)
);
```

### Tabela: `cardapio_carrinho_complementos`

```sql
CREATE TABLE cardapio_carrinho_complementos (
  id UUID PRIMARY KEY,
  carrinho_item_id UUID NOT NULL REFERENCES cardapio_carrinho(id),
  grupo_complemento_id UUID NOT NULL,
  complemento_id UUID NOT NULL,
  valor_adicional DECIMAL(10,2) DEFAULT 0,
  INDEX idx_carrinho_item_id (carrinho_item_id)
);
```

### Tabela: `cardapio_pedidos`

```sql
CREATE TABLE cardapio_pedidos (
  id UUID PRIMARY KEY,
  pedido_id UUID NOT NULL, -- ID do pedido no sistema principal
  session_id VARCHAR(255) NOT NULL,
  mesa_id UUID NOT NULL,
  numero_pedido INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  total DECIMAL(10,2) NOT NULL,
  enviado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  preparado_em TIMESTAMP,
  pronto_em TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_mesa_id (mesa_id),
  INDEX idx_status (status)
);
```

### Tabela: `cardapio_solicitacoes`

```sql
CREATE TABLE cardapio_solicitacoes (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  mesa_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'CHAMAR_GARCOM' | 'FECHAR_CONTA'
  motivo VARCHAR(50),
  mensagem TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  atendido_em TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_session_id (session_id),
  INDEX idx_mesa_id (mesa_id),
  INDEX idx_status (status)
);
```

---

## 🔒 Segurança

### Validações Obrigatórias

1. **Validação de Token:**
   - Sempre validar assinatura JWT
   - Verificar expiração
   - Verificar tipo de token (`MESA_CARDAPIO` ou `CARDAPIO_SESSION`)

2. **Validação de Sessão:**
   - Verificar se sessão existe e está ativa
   - Verificar se sessão não expirou
   - Verificar se sessão pertence à mesa correta

3. **Validação de Mesa:**
   - Verificar se mesa existe
   - Verificar se mesa está ativa
   - Verificar se mesa pertence à empresa

4. **Validação de Produtos:**
   - Verificar se produto existe
   - Verificar se produto está ativo
   - Verificar se produto está disponível para local
   - Verificar estoque (se aplicável)

5. **Rate Limiting:**
   - Limitar validação de QR Code: 5 tentativas por minuto por IP
   - Limitar requisições por sessão: 100 por minuto

### Headers de Segurança

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 📝 Logs e Auditoria

### Eventos que Devem Ser Logados

1. **Validação de QR Code:**
   - Sucesso/Falha
   - Token usado
   - IP do cliente
   - Timestamp

2. **Ações do Carrinho:**
   - Adicionar item
   - Modificar item
   - Remover item
   - Enviar pedido

3. **Solicitações:**
   - Chamar garçom
   - Fechar conta

4. **Erros:**
   - Tentativas de acesso inválidas
   - Tokens expirados
   - Validações falhadas

---

## 🧪 Testes

### Endpoints que Devem Ser Testados

1. ✅ Validação de QR Code (sucesso e erros)
2. ✅ Identificação de cliente
3. ✅ Buscar cardápio
4. ✅ Adicionar item ao carrinho
5. ✅ Modificar item do carrinho
6. ✅ Remover item do carrinho
7. ✅ Enviar pedido
8. ✅ Chamar garçom
9. ✅ Fechar conta

### Cenários de Teste

- Token expirado
- Token inválido
- Mesa inativa
- Produto inativo
- Carrinho vazio ao enviar pedido
- Sessão expirada
- Rate limiting

---

## 📋 Checklist de Implementação

### Fase 1: Autenticação
- [ ] Gerar QR Code com token JWT
- [ ] Validar token do QR Code
- [ ] Criar sistema de sessões
- [ ] Gerar session token
- [ ] Renovar sessão a cada atividade

### Fase 2: Cardápio
- [ ] Endpoint para buscar grupos e produtos
- [ ] Filtrar por ativoLocal
- [ ] Ordenar grupos e produtos

### Fase 3: Carrinho
- [ ] Criar tabela de carrinho
- [ ] Adicionar item ao carrinho
- [ ] Modificar item do carrinho
- [ ] Remover item do carrinho
- [ ] Calcular totais

### Fase 4: Pedidos
- [ ] Enviar pedido para KDS
- [ ] Integrar com compartilhador
- [ ] Atualizar status da mesa

### Fase 5: Atendimento
- [ ] Chamar garçom
- [ ] Fechar conta
- [ ] Notificações push

### Fase 6: Integrações
- [ ] Integração com KDS (WebSocket/REST)
- [ ] Integração com compartilhador
- [ ] Notificações em tempo real

---

## 📞 Contato

Para dúvidas sobre esta documentação ou sobre o frontend desenvolvido, consulte:
- Documento de planejamento: `docs/PLANEJAMENTO_CARDAPIO_DIGITAL.md`
- Estrutura técnica: `docs/ESTRUTURA_TECNICA_CARDAPIO_DIGITAL.md`

---

## 🎯 Resumo Executivo

**O que o frontend já tem:**
- ✅ Interface completa do cardápio
- ✅ Sistema de carrinho (localStorage)
- ✅ Mocks de todas as APIs
- ✅ Fluxo completo de navegação

**O que o backend precisa implementar:**
- 🔨 Sistema de autenticação (QR Code + Sessões)
- 🔨 Endpoints de cardápio
- 🔨 Endpoints de carrinho
- 🔨 Endpoints de pedidos
- 🔨 Integração com KDS
- 🔨 Notificações push

**Quando backend estiver pronto:**
- Trocar mocks por chamadas reais
- Testar fluxo completo
- Deploy em produção

---

**Documento criado em:** 2024  
**Versão:** 1.0  
**Status:** Pronto para implementação
