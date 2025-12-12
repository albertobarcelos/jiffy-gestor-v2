# 📚 Documentação da API Jiffy - Parte 2: Produtos, Complementos e Impressoras

**📌 Este é um documento complementar à documentação principal.**  

**📖 [← Voltar para Documentação Principal](./API_DOCUMENTATION.md)**

Este documento contém a documentação completa dos endpoints relacionados a:
- 📦 Produtos e Grupos de Produtos
- 🎯 Complementos e Grupos de Complementos  
- 🖨️ Impressoras

Para documentação de outros módulos (Autenticação, Usuários, Clientes, Vendas, Caixa, etc.), consulte a [documentação principal](./API_DOCUMENTATION.md).

**Versão da API:** 1.0.0  
**Base URL:** `https://jiffy-backend-hom.nexsyn.com.br/api/v1`  
**Documentação Swagger:** `https://jiffy-backend-hom.nexsyn.com.br/docs/#/`

---

## 📋 Índice

- [Produtos](#produtos)
- [Grupos de Produtos](#grupos-de-produtos)
- [Complementos](#complementos)
- [Grupos de Complementos](#grupos-de-complementos)
- [Impressoras](#impressoras)
- [Exemplos de Uso](#exemplos-de-uso)

---

## 📦 Produtos

### GET `/api/produtos`

Lista produtos com paginação, busca e filtros.

**Query Parameters:**
- `name` (string, optional) - Termo de busca por nome do produto
- `limit` (number, optional, default: 10) - Número de itens por página
- `offset` (number, optional, default: 0) - Número de itens a pular
- `ativo` (boolean, optional) - Filtrar por status ativo/inativo
  - `true` - Apenas produtos ativos
  - `false` - Apenas produtos inativos
  - Omitido - Todos os produtos

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "success": true,
  "items": [
    {
      "id": "string",
      "nome": "string",
      "descricao": "string",
      "preco": 0,
      "precoPromocional": 0,
      "custoMedio": 0,
      "codigoBarras": "string",
      "sku": "string",
      "estoque": {
        "quantidade": 0,
        "estoqueMinimo": 0,
        "unidadeMedida": "string"
      },
      "grupoId": "string",
      "ativo": true,
      "destaque": false,
      "imagemUrl": "string",
      "criadoEm": "string",
      "atualizadoEm": "string"
    }
  ],
  "count": 100
}
```

**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### POST `/api/produtos`

Cria um novo produto no sistema.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "descricao": "string",
  "preco": 0,
  "precoPromocional": 0,
  "custoMedio": 0,
  "codigoBarras": "string",
  "sku": "string",
  "estoque": {
    "quantidade": 0,
    "estoqueMinimo": 0,
    "unidadeMedida": "string"
  },
  "grupoId": "string",
  "ativo": true,
  "destaque": false,
  "imagemUrl": "string"
}
```

**Campos Obrigatórios:**
- `nome` (string) - Nome do produto
- `preco` (number) - Preço do produto
- `grupoId` (string) - ID do grupo de produtos

**Campos Opcionais:**
- `ativo` (boolean, default: `true`) - Status do produto
- `descricao` (string) - Descrição do produto
- `precoPromocional` (number) - Preço promocional
- `custoMedio` (number) - Custo médio
- `codigoBarras` (string) - Código de barras
- `sku` (string) - SKU do produto
- `estoque` (object) - Informações de estoque
- `destaque` (boolean, default: `false`) - Se o produto está em destaque
- `imagemUrl` (string) - URL da imagem do produto

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "nome": "string",
    // ... demais campos do produto
  }
}
```

**Response 400:** Dados inválidos  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### GET `/api/produtos/{id}`

Busca um produto específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do produto

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
Retorna o objeto do produto completo.

**Response 401:** Token inválido ou expirado  
**Response 404:** Produto não encontrado  
**Response 500:** Erro interno do servidor

---

### PUT `/api/produtos/{id}`

Atualiza o status (ativo/inativo) de um produto.

**Path Parameters:**
- `id` (string, required) - ID do produto

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "ativo": true
}
```

**Validações:**
- `ativo` deve ser um boolean

**Response 200:**
```json
{
  "success": true,
  "message": "Status atualizado"
}
```

**Response 400:** Status ativo inválido  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

## 📁 Grupos de Produtos

### GET `/api/grupos-produtos`

Lista grupos de produtos com paginação, busca e filtros.

**Query Parameters:**
- `q` ou `name` (string, optional) - Termo de busca por nome do grupo
- `limit` (number, optional, default: 10) - Número de itens por página
- `offset` (number, optional, default: 0) - Número de itens a pular
- `ativo` (boolean, optional) - Filtrar por status ativo/inativo
  - `true` - Apenas grupos ativos
  - `false` - Apenas grupos inativos
  - Omitido - Todos os grupos

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "success": true,
  "items": [
    {
      "id": "string",
      "nome": "string",
      "ativo": true,
      "corHex": "#CCCCCC",
      "iconName": "string",
      "ativoDelivery": false,
      "ativoLocal": false,
      "posicao": 0,
      "criadoEm": "string",
      "atualizadoEm": "string"
    }
  ],
  "count": 10,
  "total": 50
}
```

**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### POST `/api/grupos-produtos`

Cria um novo grupo de produtos no sistema.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true,
  "corHex": "#CCCCCC",
  "iconName": "string",
  "ativoDelivery": false,
  "ativoLocal": false
}
```

**Campos Obrigatórios:**
- `nome` (string) - Nome do grupo

**Campos Opcionais:**
- `ativo` (boolean, default: `true`) - Status do grupo
- `corHex` (string, default: `"#CCCCCC"`) - Cor hexadecimal do grupo
- `iconName` (string, default: `""`) - Nome do ícone
- `ativoDelivery` (boolean, default: `false`) - Se está ativo para delivery
- `ativoLocal` (boolean, default: `false`) - Se está ativo para vendas locais

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "nome": "string",
    "ativo": true,
    "corHex": "#CCCCCC",
    "iconName": "string",
    "ativoDelivery": false,
    "ativoLocal": false,
    "posicao": 0,
    "criadoEm": "string",
    "atualizadoEm": "string"
  }
}
```

**Response 400:** Dados inválidos  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### GET `/api/grupos-produtos/{id}`

Busca um grupo de produtos específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do grupo

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
Retorna o objeto do grupo completo.

**Response 401:** Token inválido ou expirado  
**Response 404:** Grupo não encontrado  
**Response 500:** Erro interno do servidor

---

### PATCH `/api/grupos-produtos/{id}`

Atualiza um grupo de produtos existente.

**Path Parameters:**
- `id` (string, required) - ID do grupo

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true,
  "corHex": "#CCCCCC",
  "iconName": "string",
  "ativoDelivery": false,
  "ativoLocal": false
}
```

**Todos os campos são opcionais** - apenas os campos enviados serão atualizados.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "nome": "string",
    // ... demais campos atualizados
  }
}
```

**Response 400:** Dados inválidos  
**Response 401:** Token inválido ou expirado  
**Response 404:** Grupo não encontrado  
**Response 500:** Erro interno do servidor

---

### PATCH `/api/grupos-produtos/{id}/reordena-grupo`

Reordena a posição de um grupo de produtos na lista.

**Path Parameters:**
- `id` (string, required) - ID do grupo a ser reordenado

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "novaPosicao": 1
}
```

**Validações:**
- `novaPosicao` deve ser um número maior ou igual a 1

**Response 200:**
```json
{
  "success": true,
  "message": "Ordem atualizada com sucesso"
}
```

**Response 400:** Nova posição inválida  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

## 🎯 Complementos

### GET `/api/complementos`

Lista complementos com paginação, busca e filtros.

**Query Parameters:**
- `q` (string, optional) - Termo de busca
- `limit` (number, optional, default: 10) - Número de itens por página
- `offset` (number, optional, default: 0) - Número de itens a pular
- `ativo` (boolean, optional) - Filtrar por status ativo/inativo
  - `true` - Apenas complementos ativos
  - `false` - Apenas complementos inativos
  - Omitido - Todos os complementos

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "string",
      "nome": "string",
      "preco": 0,
      "ativo": true,
      "grupoComplementoId": "string",
      "criadoEm": "string",
      "atualizadoEm": "string"
    }
  ],
  "count": 50
}
```

**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### POST `/api/complementos`

Cria um novo complemento no sistema.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "preco": 0,
  "ativo": true,
  "grupoComplementoId": "string"
}
```

**Campos Obrigatórios:**
- `nome` (string) - Nome do complemento
- `preco` (number) - Preço do complemento
- `grupoComplementoId` (string) - ID do grupo de complementos

**Campos Opcionais:**
- `ativo` (boolean, default: `true`) - Status do complemento

**Validações:**
- Os dados são validados usando Zod schema (`CriarComplementoSchema`)

**Response 201:**
Retorna o objeto do complemento criado.

**Response 400:** Dados inválidos (ZodError)  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### GET `/api/complementos/{id}`

Busca um complemento específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do complemento

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
Retorna o objeto do complemento completo.

**Response 400:** ID do complemento é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Complemento não encontrado  
**Response 500:** Erro interno do servidor

---

### PATCH `/api/complementos/{id}`

Atualiza um complemento existente.

**Path Parameters:**
- `id` (string, required) - ID do complemento

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "preco": 0,
  "ativo": true,
  "grupoComplementoId": "string"
}
```

**Todos os campos são opcionais** - apenas os campos enviados serão atualizados.

**Validações:**
- Os dados são validados usando Zod schema (`AtualizarComplementoSchema`)

**Response 200:**
Retorna o objeto do complemento atualizado.

**Response 400:** Dados inválidos (ZodError) ou ID obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Complemento não encontrado  
**Response 500:** Erro interno do servidor

---

### DELETE `/api/complementos/{id}`

Remove um complemento do sistema.

**Path Parameters:**
- `id` (string, required) - ID do complemento

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 204:** Complemento deletado com sucesso (sem conteúdo)

**Response 400:** ID do complemento é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Complemento não encontrado  
**Response 500:** Erro interno do servidor

---

## 📂 Grupos de Complementos

### GET `/api/grupos-complementos`

Lista grupos de complementos com paginação, busca e filtros.

**Query Parameters:**
- `q` (string, optional) - Termo de busca
- `limit` (number, optional, default: 10) - Número de itens por página
- `offset` (number, optional, default: 0) - Número de itens a pular
- `ativo` (boolean, optional) - Filtrar por status ativo/inativo
  - `true` - Apenas grupos ativos
  - `false` - Apenas grupos inativos
  - Omitido - Todos os grupos

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "string",
      "nome": "string",
      "ativo": true,
      "criadoEm": "string",
      "atualizadoEm": "string"
    }
  ],
  "count": 20
}
```

**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### POST `/api/grupos-complementos`

Cria um novo grupo de complementos no sistema.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true
}
```

**Campos Obrigatórios:**
- `nome` (string) - Nome do grupo

**Campos Opcionais:**
- `ativo` (boolean, default: `true`) - Status do grupo

**Validações:**
- Os dados são validados usando Zod schema (`CriarGrupoComplementoSchema`)

**Response 201:**
Retorna o objeto do grupo criado.

**Response 400:** Dados inválidos (ZodError)  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### GET `/api/grupos-complementos/{id}`

Busca um grupo de complementos específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do grupo

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
Retorna o objeto do grupo completo.

**Response 400:** ID do grupo de complementos é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Grupo de complementos não encontrado  
**Response 500:** Erro interno do servidor

---

### PATCH `/api/grupos-complementos/{id}`

Atualiza um grupo de complementos existente.

**Path Parameters:**
- `id` (string, required) - ID do grupo

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true
}
```

**Todos os campos são opcionais** - apenas os campos enviados serão atualizados.

**Validações:**
- Os dados são validados usando Zod schema (`AtualizarGrupoComplementoSchema`)

**Response 200:**
Retorna o objeto do grupo atualizado.

**Response 400:** Dados inválidos (ZodError) ou ID obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Grupo de complementos não encontrado  
**Response 500:** Erro interno do servidor

---

### DELETE `/api/grupos-complementos/{id}`

Remove um grupo de complementos do sistema.

**Path Parameters:**
- `id` (string, required) - ID do grupo

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 204:** Grupo de complementos deletado com sucesso (sem conteúdo)

**Response 400:** ID do grupo de complementos é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Grupo de complementos não encontrado  
**Response 500:** Erro interno do servidor

---

## 🖨️ Impressoras

### GET `/api/impressoras`

Lista impressoras com paginação e busca.

**Query Parameters:**
- `q` (string, optional) - Termo de busca
- `limit` (number, optional, default: 10) - Número de itens por página
- `offset` (number, optional, default: 0) - Número de itens a pular

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "string",
      "nome": "string",
      "tipo": "string",
      "endereco": "string",
      "ativo": true,
      "criadoEm": "string",
      "atualizadoEm": "string"
    }
  ],
  "count": 15
}
```

**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### POST `/api/impressoras`

Cria uma nova impressora no sistema.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "tipo": "string",
  "endereco": "string",
  "ativo": true
}
```

**Campos Obrigatórios:**
- `nome` (string) - Nome da impressora
- `tipo` (string) - Tipo da impressora
- `endereco` (string) - Endereço/IP da impressora

**Campos Opcionais:**
- `ativo` (boolean, default: `true`) - Status da impressora

**Validações:**
- Os dados são validados usando Zod schema (`CriarImpressoraSchema`)

**Response 201:**
Retorna o objeto da impressora criada.

**Response 400:** Dados inválidos (ZodError)  
**Response 401:** Token inválido ou expirado  
**Response 500:** Erro interno do servidor

---

### GET `/api/impressoras/{id}`

Busca uma impressora específica pelo ID.

**Path Parameters:**
- `id` (string, required) - ID da impressora

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
Retorna o objeto da impressora completo.

**Response 400:** ID da impressora é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Impressora não encontrada  
**Response 500:** Erro interno do servidor

---

### PATCH `/api/impressoras/{id}`

Atualiza uma impressora existente.

**Path Parameters:**
- `id` (string, required) - ID da impressora

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "string",
  "tipo": "string",
  "endereco": "string",
  "ativo": true
}
```

**Todos os campos são opcionais** - apenas os campos enviados serão atualizados.

**Validações:**
- Os dados são validados usando Zod schema (`AtualizarImpressoraSchema`)

**Response 200:**
Retorna o objeto da impressora atualizada.

**Response 400:** Dados inválidos (ZodError) ou ID obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Impressora não encontrada  
**Response 500:** Erro interno do servidor

---

### DELETE `/api/impressoras/{id}`

Remove uma impressora do sistema.

**Path Parameters:**
- `id` (string, required) - ID da impressora

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 204:** Impressora deletada com sucesso (sem conteúdo)

**Response 400:** ID da impressora é obrigatório  
**Response 401:** Token inválido ou expirado  
**Response 404:** Impressora não encontrada  
**Response 500:** Erro interno do servidor

---

## 💡 Exemplos de Uso

### Exemplo 1: Criar um Produto com Grupo

```typescript
// 1. Primeiro, buscar grupos disponíveis
const gruposResponse = await fetch(
  'https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/grupos-produtos?ativo=true&limit=100',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { items: grupos } = await gruposResponse.json();

// 2. Criar produto associado a um grupo
const produtoResponse = await fetch(
  'https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/produtos',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      nome: 'Pizza Margherita',
      descricao: 'Pizza com molho de tomate, mussarela e manjericão',
      preco: 35.90,
      precoPromocional: 29.90,
      grupoId: grupos[0].id,
      ativo: true,
      destaque: true,
      estoque: {
        quantidade: 50,
        estoqueMinimo: 10,
        unidadeMedida: 'UN'
      }
    })
  }
);

const produto = await produtoResponse.json();
```

### Exemplo 2: Listar Produtos com Filtros

```typescript
const params = new URLSearchParams({
  name: 'pizza',
  ativo: 'true',
  limit: '50',
  offset: '0'
});

const produtosResponse = await fetch(
  `https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/produtos?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { items: produtos, count } = await produtosResponse.json();
```

### Exemplo 3: Reordenar Grupos de Produtos

```typescript
const reordenarResponse = await fetch(
  `https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/grupos-produtos/${grupoId}/reordena-grupo`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      novaPosicao: 1 // Move o grupo para a primeira posição
    })
  }
);

const resultado = await reordenarResponse.json();
```

### Exemplo 4: Criar Complemento com Grupo

```typescript
// 1. Buscar grupos de complementos
const gruposResponse = await fetch(
  'https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/grupos-complementos?ativo=true',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { items: grupos } = await gruposResponse.json();

// 2. Criar complemento
const complementoResponse = await fetch(
  'https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/complementos',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      nome: 'Bacon Extra',
      preco: 5.00,
      grupoComplementoId: grupos[0].id,
      ativo: true
    })
  }
);

const complemento = await complementoResponse.json();
```

### Exemplo 5: Atualizar Status de Produto

```typescript
const atualizarStatusResponse = await fetch(
  `https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/produtos/${produtoId}`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      ativo: false // Desativa o produto
    })
  }
);

const resultado = await atualizarStatusResponse.json();
```

---

## ⚠️ Observações Importantes

### Validação de Dados

- **Produtos, Complementos e Grupos:** Utilizam validação com **Zod schemas** para garantir integridade dos dados
- **Campos Obrigatórios:** Sempre verifique quais campos são obrigatórios antes de enviar requisições
- **Tipos de Dados:** Respeite os tipos de dados especificados (string, number, boolean)

### Cache

Alguns endpoints de listagem incluem headers de cache:
```
Cache-Control: private, max-age=60, stale-while-revalidate=120
```

Isso significa que:
- Os dados podem ser cacheados por até 60 segundos
- Após 60 segundos, dados antigos podem ser retornados enquanto novos dados são buscados em background

### Paginação

- Use `limit` e `offset` para paginar resultados grandes
- O padrão é `limit=10` e `offset=0`
- Para buscar todos os itens, use um `limit` alto (ex: 1000) ou implemente paginação no frontend

### Relacionamentos

- **Produtos** devem estar associados a um **Grupo de Produtos** (`grupoId`)
- **Complementos** devem estar associados a um **Grupo de Complementos** (`grupoComplementoId`)
- Sempre verifique se os grupos existem antes de criar produtos/complementos

### Reordenação de Grupos

- A reordenação de grupos de produtos altera a posição na lista
- Use `novaPosicao` começando em 1 (primeira posição)
- A reordenação afeta a ordem de exibição no cardápio

---

## 🔗 Links Relacionados

- **Documentação Principal:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Documentação Swagger:** `https://jiffy-backend-hom.nexsyn.com.br/docs/#/`
- **Base URL:** `https://jiffy-backend-hom.nexsyn.com.br/api/v1`

---

**Última atualização:** 2025  
**Versão da API:** 1.0.0

