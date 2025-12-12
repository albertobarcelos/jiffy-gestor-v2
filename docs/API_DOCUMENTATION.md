# 📚 Documentação da API Jiffy - Backend Homologação

**Versão da API:** 1.0.0  
**Base URL:** `https://jiffy-backend-hom.nexsyn.com.br/api/v1`  
**Documentação Swagger:** `https://jiffy-backend-hom.nexsyn.com.br/docs/#/`  
**Contato:** Wilcker Neckel (wilckerwrsn@gmail.com)  
**Data de Documentação:** 2025

---

## 📋 Índice

- [Informações Gerais](#informações-gerais)
- [Autenticação](#autenticação)
- [Usuários Gestor](#usuários-gestor)
- [Usuários PDV](#usuários-pdv)
- [Perfis Gestor](#perfis-gestor)
- [Perfis PDV](#perfis-pdv)
- [Clientes](#clientes)
- [Empresas](#empresas)
- [Vendas](#vendas)
- [Operações de Caixa](#operações-de-caixa)
- [Movimentações de Caixa](#movimentações-de-caixa)
- [Terminais](#terminais)
- [Preferências de Terminal](#preferências-de-terminal)
- [Meios de Pagamento](#meios-de-pagamento)
- [Schemas e Modelos](#schemas-e-modelos)
- [Documentação Complementar](#documentação-complementar)

---

## 🔐 Informações Gerais

### Autenticação

A API utiliza autenticação via **Bearer Token (JWT)**. Após realizar login, você receberá um `accessToken` e um `refreshToken`.

**Como usar:**
```http
Authorization: Bearer {accessToken}
```

### Base URL

Todas as requisições devem ser feitas para:
```
https://jiffy-backend-hom.nexsyn.com.br/api/v1
```

### Paginação

A maioria dos endpoints de listagem suporta paginação via query parameters:
- `limit`: Número de itens por página (default: 10, máximo: 100)
- `offset`: Número de itens a pular (default: 0)
- `q`: Termo de busca (opcional)

### Respostas de Paginação

Todos os endpoints de listagem retornam no formato:
```json
{
  "count": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "hasNext": true,
  "hasPrevious": false,
  "items": [...]
}
```

---

## 🔐 Autenticação

### POST `/auth/login/usuario-gestor`

Autentica um usuário gestor e retorna tokens de acesso. Utilizado para autenticar usuários no gestor ou em outras fontes que consomem a API. O Token tem validade de 24 horas após a emissão.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response 200:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Response 401:** Credenciais inválidas

---

### POST `/auth/login/pdv`

Rota utilizada para realizar a autenticação no JIFFY PDV.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "terminalId": "string",
  "versaoApk": "string",
  "modeloDispositivo": "string"
}
```

**Response 200:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Response 401:** Credenciais inválidas

---

### GET `/auth/jwks`

Retorna as chaves públicas para validação de tokens JWT. Utilizado para autenticação de serviços externos.

**Response 200:**
```json
{
  "keys": [...]
}
```

---

### GET `/auth/me`

Retorna as informações do usuário autenticado com base no seu token.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response 200:**
```json
{
  "sub": "string",
  "empresaId": "string",
  "aud": "string",
  "userId": "string",
  "generatedFor": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Response 401:** Token não fornecido ou inválido

---

## 👥 Usuários Gestor

### POST `/pessoas/usuarios-gestor`

Cria um novo usuário gestor no sistema.

**⚠️ ATENÇÃO:** É necessário ter pelo menos um perfil gestor cadastrado no sistema antes de criar um usuário, pois não é possível cadastrar um usuário sem perfil. Por padrão 2 perfis são criados de forma automática ao criar uma empresa.

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true,
  "modulosAcesso": ["FISCAL", "PDV", "JIFFY", "ADMIN"],
  "username": "string",
  "password": "string",
  "perfilGestorId": "string"
}
```

**Campos Obrigatórios:**
- `nome` (string, minLength: 1)
- `username` (string, minLength: 1)
- `password` (string, minLength: 1)
- `perfilGestorId` (string, minLength: 1)

**Response 201:**
```json
{
  "id": "string",
  "username": "string",
  "nome": "string",
  "ativo": true,
  "empresaId": "string",
  "perfilGestor": {
    "id": "string",
    "role": "string",
    "acessoFinanceiro": true,
    "acessoEstoque": true,
    "acessoFiscal": true,
    "acessoDashboard": true
  }
}
```

---

### GET `/pessoas/usuarios-gestor`

Lista todos os usuários gestores com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca

**Response 200:**
Retorna `PaginationUsuarioGestorResponse` com lista de usuários gestores.

---

### GET `/pessoas/usuarios-gestor/{id}`

Busca um usuário gestor específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do funcionário

**Response 200:**
Retorna `UsuarioGestorResponse`.

---

### PATCH `/pessoas/usuarios-gestor/{id}`

Atualiza as informações de um usuário gestor existente.

**Path Parameters:**
- `id` (string, required) - ID do funcionário

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true,
  "modulosAcesso": ["FISCAL", "PDV", "JIFFY", "ADMIN"],
  "username": "string",
  "password": "string",
  "perfilGestorId": "string"
}
```

**Response 200:**
Retorna `UsuarioGestorResponse`.

---

## 📱 Usuários PDV

### POST `/pessoas/usuarios-pdv`

Cria um novo usuário PDV no sistema.

**⚠️ ATENÇÃO:** É necessário ter pelo menos um perfil PDV cadastrado no sistema antes de criar um usuário, pois não é possível cadastrar um usuário sem perfil. Por padrão 2 perfis são criados de forma automática ao criar uma empresa.

**Request Body:**
```json
{
  "id": "string",
  "nome": "string",
  "telefone": "string",
  "ativo": true,
  "password": "string",
  "perfilPdvId": "string"
}
```

**Campos Obrigatórios:**
- `nome` (string, minLength: 1)
- `password` (string, minLength: 1)
- `perfilPdvId` (string)

**Response 201:**
```json
{
  "id": "string",
  "nome": "string",
  "senha": "string",
  "ativo": true,
  "telefone": "string",
  "perfilPdv": {
    "id": "string",
    "role": "string",
    "acessoMeiosPagamento": ["string"],
    "cancelarVenda": true,
    "cancelarProduto": true,
    "aplicarDescontoProduto": true,
    "aplicarDescontoVenda": true,
    "aplicarAcrescimoProduto": true,
    "aplicarAcrescimoVenda": true
  },
  "empresaId": "string",
  "dataCriacao": "string",
  "dataAtualizacao": "string"
}
```

---

### GET `/pessoas/usuarios-pdv`

Lista todos os usuários PDV com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca
- `perfilPdvId` (string, optional) - Filtrar por perfil ID
- `ativo` (boolean, optional) - Filtrar por status ativo

**Response 200:**
Retorna `PaginationUsuarioPdvResponse`.

---

### GET `/pessoas/usuarios-pdv/{id}`

Busca um usuário PDV específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do usuário PDV

**Response 200:**
Retorna `UsuarioPdvResponse`.

---

### PATCH `/pessoas/usuarios-pdv/{id}`

Atualiza as informações de um usuário PDV existente.

**Path Parameters:**
- `id` (string, required) - ID do usuário PDV

**Request Body:**
```json
{
  "nome": "string",
  "telefone": "string",
  "ativo": true,
  "password": "string",
  "perfilPdvId": "string"
}
```

**Response 200:**
Retorna `UsuarioPdvResponse`.

---

### DELETE `/pessoas/usuarios-pdv/{id}`

Remove um usuário PDV do sistema.

**Path Parameters:**
- `id` (string, required) - ID do usuário PDV

**Response 204:** Usuário PDV deletado com sucesso

---

## 🎭 Perfis Gestor

### POST `/pessoas/perfis-gestor`

Cria um novo perfil de gestor no sistema.

**Request Body:**
```json
{
  "role": "string",
  "acessoFinanceiro": true,
  "acessoEstoque": true,
  "acessoFiscal": true,
  "acessoDashboard": true
}
```

**Campos Obrigatórios:**
- `role` (string, minLength: 1)
- `acessoFinanceiro` (boolean)
- `acessoEstoque` (boolean)
- `acessoFiscal` (boolean)
- `acessoDashboard` (boolean)

**Response 201:**
```json
{
  "id": "string",
  "role": "string",
  "acessoFinanceiro": true,
  "acessoEstoque": true,
  "acessoFiscal": true,
  "acessoDashboard": true
}
```

---

### GET `/pessoas/perfis-gestor`

Lista todos os perfis de gestor com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10)
- `offset` (number, optional, default: 0)
- `q` (string, optional) - Termo de busca

**Response 200:**
Retorna `PaginationPerfilGestorResponse`.

---

### GET `/pessoas/perfis-gestor/{id}`

Busca um perfil de gestor específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do perfil gestor

**Response 200:**
Retorna `PerfilGestorResponse`.

---

### PATCH `/pessoas/perfis-gestor/{id}`

Atualiza as informações de um perfil de gestor existente.

**Path Parameters:**
- `id` (string, required) - ID do perfil gestor

**Request Body:**
```json
{
  "role": "string",
  "acessoFinanceiro": true,
  "acessoEstoque": true,
  "acessoFiscal": true,
  "acessoDashboard": true
}
```

**Response 200:**
Retorna `PerfilGestorResponse`.

---

## 🎭 Perfis PDV

### POST `/pessoas/perfis-pdv`

Cria um novo perfil de PDV no sistema.

**Request Body:**
```json
{
  "role": "string",
  "acessoMeiosPagamento": ["string"],
  "cancelarVenda": true,
  "cancelarProduto": true,
  "aplicarDescontoProduto": true,
  "aplicarDescontoVenda": true,
  "aplicarAcrescimoProduto": true,
  "aplicarAcrescimoVenda": true
}
```

**Campos Obrigatórios:**
- `role` (string, minLength: 1)
- `cancelarVenda` (boolean)
- `cancelarProduto` (boolean)
- `aplicarDescontoProduto` (boolean)
- `aplicarDescontoVenda` (boolean)
- `aplicarAcrescimoProduto` (boolean)
- `aplicarAcrescimoVenda` (boolean)

**Response 201:**
Retorna `PerfilPdvResponse`.

---

### GET `/pessoas/perfis-pdv`

Lista todos os perfis de PDV com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10)
- `offset` (number, optional, default: 0)
- `q` (string, optional) - Termo de busca

**Response 200:**
Retorna `PaginationPerfilPdvResponse`.

---

### GET `/pessoas/perfis-pdv/{id}`

Busca um perfil de PDV específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do perfil PDV

**Response 200:**
Retorna `PerfilPdvResponse`.

---

### PATCH `/pessoas/perfis-pdv/{id}`

Atualiza as informações de um perfil de PDV existente.

**Path Parameters:**
- `id` (string, required) - ID do perfil PDV

**Request Body:**
```json
{
  "role": "string",
  "acessoMeiosPagamento": ["string"],
  "cancelarVenda": true,
  "cancelarProduto": true,
  "aplicarDescontoProduto": true,
  "aplicarDescontoVenda": true,
  "aplicarAcrescimoProduto": true,
  "aplicarAcrescimoVenda": true
}
```

**Response 200:**
Retorna `PerfilPdvResponse`.

---

## 👤 Clientes

### POST `/pessoas/clientes`

Cria um novo cliente no sistema.

**Request Body:**
```json
{
  "nome": "string",
  "razaoSocial": "string",
  "nomeFantasia": "string",
  "cpf": "string",
  "cnpj": "string",
  "telefone": "string",
  "email": "string",
  "endereco": {
    "rua": "string",
    "numero": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string",
    "complemento": "string"
  },
  "ativo": true
}
```

**Campos Obrigatórios:**
- `nome` (string, minLength: 1)
- `endereco.rua` (string, minLength: 2)
- `endereco.numero` (string, minLength: 1)
- `endereco.cep` (string, pattern: `^\d{5}-?\d{3}$`)

**Validações:**
- `endereco.estado`: Deve seguir o padrão `^[A-Z]{2}$` (ex: "SP", "RJ")
- `endereco.cep`: Deve seguir o padrão `^\d{5}-?\d{3}$` (ex: "12345-678" ou "12345678")

**Response 201:**
```json
{
  "id": "string",
  "nome": "string",
  "razaoSocial": "string",
  "nomeFantasia": "string",
  "cpf": "string",
  "cnpj": "string",
  "ativo": true,
  "empresaId": "string",
  "endereco": {
    "rua": "string",
    "numero": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string",
    "complemento": "string"
  },
  "email": "string",
  "telefone": "string"
}
```

---

### GET `/pessoas/clientes`

Lista todos os clientes com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca
- `ativo` (boolean, optional) - Filtrar por status ativo

**Response 200:**
Retorna `PaginationClienteResponse`.

---

### GET `/pessoas/clientes/{id}`

Busca um cliente específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do cliente

**Response 200:**
Retorna `ClienteResponse`.

---

### PATCH `/pessoas/clientes/{id}`

Atualiza as informações de um cliente existente.

**Path Parameters:**
- `id` (string, required) - ID do cliente

**Request Body:**
```json
{
  "nome": "string",
  "razaoSocial": "string",
  "nomeFantasia": "string",
  "cpf": "string",
  "cnpj": "string",
  "telefone": "string",
  "email": "string",
  "endereco": {
    "rua": "string",
    "numero": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string",
    "complemento": "string"
  },
  "ativo": true
}
```

**Response 200:**
Retorna `ClienteResponse`.

---

## 🏢 Empresas

### GET `/empresas`

Lista todas as empresas do sistema com opções de filtro e paginação.

**Query Parameters:**
- `offset` (number, optional, default: 0, minimum: 0) - Número de registros a pular
- `limit` (number, optional, default: 10, minimum: 1, maximum: 100) - Número máximo de registros a retornar
- `q` (string, optional, default: "") - Termo de busca para filtrar empresas

**Response 200:**
Retorna `PaginationEmpresaResponse`.

---

### POST `/empresas`

Cria uma nova empresa no sistema.

**Request Body:**
```json
{
  "id": "string",
  "nomeFantasia": "string",
  "razaoSocial": "string",
  "cnpj": "string",
  "telefone": "string",
  "ativo": true,
  "bloqueado": false,
  "email": "string",
  "segmento": "string",
  "parametroEmpresa": {
    "tipoImpressao": "string",
    "tipoCobrancaPizza": "maiorPreco" | "mediaPreco"
  },
  "parametroFiscal": {
    "inscricaoEstadual": "string",
    "codigoCrt": "string",
    "regimeTributario": "string"
  },
  "endereco": {
    "rua": "string",
    "numero": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string",
    "complemento": "string"
  },
  "usuarioPdv": "string",
  "senhaPdv": "string",
  "emailUsuarioGestor": "string",
  "senhaUsuarioGestor": "string"
}
```

**Campos Obrigatórios:**
- `nomeFantasia` (string, maxLength: 255)
- `razaoSocial` (string, maxLength: 255)
- `cnpj` (string, maxLength: 18)
- `endereco.rua` (string, minLength: 2)
- `endereco.numero` (string, minLength: 1)
- `endereco.cep` (string, pattern: `^\d{5}-?\d{3}$`)
- `parametroFiscal.inscricaoEstadual` (string, maxLength: 30)
- `parametroFiscal.regimeTributario` (string, maxLength: 255)
- `usuarioPdv` (string, minLength: 1)
- `senhaPdv` (string, minLength: 1)
- `emailUsuarioGestor` (string, minLength: 1)
- `senhaUsuarioGestor` (string, minLength: 1)

**Response 201:**
Retorna `EmpresaCreatedResponse`.

---

### GET `/empresas/me`

Retorna informações da empresa do usuário autenticado.

**Response 200:**
Retorna informações da empresa.

---

## 💰 Vendas

### GET `/operacao-pdv/vendas`

Lista vendas com opções de filtro e paginação.

**Query Parameters:**
- `status` (string, optional, enum: `ABERTA`, `FINALIZADA`, `CANCELADA`) - Filtrar por status da venda
- `offset` (number, optional, default: 0, minimum: 0) - Número de registros a pular
- `limit` (number, optional, default: 10, minimum: 1, maximum: 100) - Número máximo de registros a retornar
- `q` (string, optional, default: "") - Termo de busca para filtrar vendas, atualmente pelo código da venda ou identificação
- `numeroVenda` (string, optional) - Filtrar por número da venda
- `tipoVenda` (string, optional) - Filtrar por tipo de venda
- `terminalId` (string, optional) - Filtrar por ID do terminal
- `clienteId` (string, optional) - Filtrar por ID do cliente
- `abertoPorId` (string, optional) - Filtrar por quem abriu a venda
- `canceladoPorId` (string, optional) - Filtrar por quem cancelou a venda
- `cancelado` (boolean, optional) - Filtrar vendas canceladas ou não canceladas
- `periodoInicial` (string, optional, format: date) - Data inicial para filtro de período
- `periodoFinal` (string, optional, format: date) - Data final para filtro de período
- `valorFinalMinimo` (number, optional) - Valor final mínimo da venda
- `valorFinalMaximo` (number, optional) - Valor final máximo da venda
- `meioPagamentoId` (string, optional) - Filtrar por meio de pagamento utilizado

**Response 200:**
Retorna `PaginationVendaResponse`.

---

### GET `/operacao-pdv/vendas/{id}`

Retorna uma venda específica pelo seu ID.

**Path Parameters:**
- `id` (string, required) - ID da venda

**Response 200:**
Retorna `VendaResponse`.

---

## 💵 Operações de Caixa

### GET `/caixa/operacao-caixa-terminal`

Lista todas as operações de caixa com opções de filtro e paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca
- `dataAberturaInicio` (string, optional, format: date-time, ISO 8601) - Data de abertura inicial
- `dataAberturaFim` (string, optional, format: date-time, ISO 8601) - Data de abertura final
- `terminalId` (string, optional) - ID do terminal
- `status` (string, optional) - Status do caixa (enum: `ABERTO`, `FECHADO`)

**Response 200:**
Retorna `PaginationOperacaoCaixaTerminalResponse`.

---

### GET `/caixa/operacao-caixa-terminal/{id}`

Retorna uma operação de caixa pelo ID.

**Path Parameters:**
- `id` (string, required) - ID da operação de caixa

**Query Parameters:**
- `tipoRetorno` (string, optional, default: "resumido", enum: `simplificado`, `resumido`, `detalhado`) - Tipo de retorno da operação de caixa. No retorno detalhado são listados todos os produtos vendidos na operação. O retorno padrão é o resumido.

**Response 200:**
Retorna `OperacaoCaixaResumidaResponse` ou `OperacaoCaixaDetalhadaResponse` dependendo do `tipoRetorno`.

---

### GET `/caixa/operacao-caixa-terminal/current/{terminalId}`

Retorna a operação de caixa atual do terminal.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal da operação de caixa

**Query Parameters:**
- `tipoRetorno` (string, optional, default: "resumido", enum: `simplificado`, `resumido`, `detalhado`) - Tipo de retorno da operação de caixa. No retorno detalhado são listados todos os produtos vendidos na operação. O retorno padrão é o resumido.

**Response 200:**
Retorna `OperacaoCaixaResumidaResponse` ou `OperacaoCaixaDetalhadaResponse` dependendo do `tipoRetorno`.

---

### POST `/caixa/operacao-caixa-terminal/current/{terminalId}/fechamento`

Realiza o fechamento da operação atual do terminal, registrando o usuário responsável e o valor fornecido em dinheiro no fechamento.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal da operação de caixa a ser fechada

**Request Body:**
```json
{
  "valorDinheiro": 0,
  "usuarioId": "string"
}
```

**Response 200:**
```json
{
  "operacaoCaixaTerminalId": "string"
}
```

---

## 💸 Movimentações de Caixa

### POST `/caixa/operacao-caixa-terminal/current/{terminalId}/suprimentos`

Registra um suprimento na operação de caixa atual do terminal especificado.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal

**Request Body:**
```json
{
  "valor": 0,
  "observacao": "string",
  "usuarioId": "string"
}
```

**Response 201:**
Retorna `SuprimentoResponse`.

---

### GET `/caixa/operacao-caixa-terminal/current/{terminalId}/suprimentos`

Lista todos os suprimentos registrados na operação de caixa atual do terminal especificado.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal

**Response 200:**
Retorna `PaginationSuprimentoResponse`.

---

### POST `/caixa/operacao-caixa-terminal/current/{terminalId}/sangrias`

Registra uma sangria na operação de caixa atual do terminal especificado.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal

**Request Body:**
```json
{
  "valor": 0,
  "observacao": "string",
  "usuarioId": "string"
}
```

**Response 201:**
Retorna `SangriaResponse`.

---

### GET `/caixa/operacao-caixa-terminal/current/{terminalId}/sangrias`

Lista todas as sangrias registradas na operação de caixa atual do terminal especificado.

**Path Parameters:**
- `terminalId` (string, required) - ID do terminal

**Response 200:**
Retorna `PaginationSangriaResponse`.

---

## 🖥️ Terminais

### POST `preferencias/terminais`

**⚠️ IMPORTANTE:** Esta rota é usada somente pelo aplicativo Android para criar terminais onde é gerado um UUID único. Não deve ser usada diretamente pela API.

Cria um novo terminal no sistema.

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true
}
```

**Response 201:**
Retorna `TerminalResponse`.

---

### GET `preferencias/terminais`

Lista todos os terminais configurados no sistema.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca

**Response 200:**
Retorna `PaginationTerminalResponse`.

---

### GET `preferencias/terminais/{id}`

Busca um terminal específico pelo ID.

**Path Parameters:**
- `id` (string, required) - ID do terminal

**Response 200:**
Retorna `TerminalResponse`.

---

### PATCH `preferencias/terminais/{id}`

Atualiza as configurações de um terminal existente.

**Path Parameters:**
- `id` (string, required) - ID do terminal

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true
}
```

**Response 200:**
Retorna `TerminalResponse`.

---

## ⚙️ Preferências de Terminal

### GET `preferencias/preferencias-terminal/`

Lista as preferências de todos os terminais de uma empresa.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca

**Response 200:**
Retorna `PaginationPreferenciasTerminalResponse`.

---

### PUT `preferencias/preferencias-terminal/`

Upsert nas preferências de um ou mais terminais.

**⚠️ ATENÇÃO:** Este endpoint cria ou atualiza as preferências de um ou mais terminais cadastrados de uma empresa. Para atualizar vários terminais de uma vez, é só passar uma lista que contém os ids dos terminais e no campo 'fields' as preferências que serão atualizadas em todos os terminais. Para atualizar apenas um terminal é só passar o id desse terminal no campo 'terminaisId' (não precisa ser em formato de lista), e os campos a serem atualizados ou criados.

**⚠️ IMPORTANTE:** Se for passado um valor nulo em algum dos campos que aceita valores nulos, a preferência será REMOVIDA.

**Request Body:**
```json
{
  "terminaisId": ["string"] | "string",
  "fields": {
    // Campos de preferências a serem atualizados
  }
}
```

**Response 201:**
Retorna `GetPreferenciasTerminal`.

---

### GET `preferencias/preferencias-terminal/{id}`

Busca preferências de um terminal específico.

**Path Parameters:**
- `id` (string, required) - ID do terminal

**Response 200:**
Retorna `GetPreferenciasTerminal`.

---

## 💳 Meios de Pagamento

### GET `/pagamento/meios-pagamento`

Lista todos os meios de pagamento com paginação.

**Query Parameters:**
- `limit` (number, optional, default: 10) - Limite de resultados por página
- `offset` (number, optional, default: 0) - Número de resultados a pular
- `q` (string, optional) - Termo de busca
- `ativo` (boolean, optional) - Filtra meios de pagamento pelo status ativo (true/false)

**Response 200:**
Retorna `PaginationMeioPagamentoResponse`.

---

### GET `/pagamento/meios-pagamento/{id}`

Retorna um meio de pagamento específico pelo seu ID.

**Path Parameters:**
- `id` (string, required) - ID do meio de pagamento

**Response 200:**
Retorna `MeioPagamentoResponse`.

---

### PATCH `/pagamento/meios-pagamento/{id}`

Atualiza um meio de pagamento existente.

**Path Parameters:**
- `id` (string, required) - ID do meio de pagamento

**Request Body:**
```json
{
  "nome": "string",
  "ativo": true,
  "tipo": "string"
}
```

**Response 200:**
Retorna `MeioPagamentoResponse`.

---

### DELETE `/pagamento/meios-pagamento/{id}`

Remove um meio de pagamento do sistema.

**Path Parameters:**
- `id` (string, required) - ID do meio de pagamento

**Response 204:** Meio de pagamento deletado com sucesso

---

## 📄 Notas Importantes

### Documentação Complementar

**📌 Documentação Completa de Produtos, Complementos e Impressoras:**

Os endpoints relacionados a **Produtos**, **Grupos de Produtos**, **Complementos**, **Grupos de Complementos** e **Impressoras** estão completamente documentados em um arquivo separado:

**👉 [API_DOCUMENTATION_PART2.md](./API_DOCUMENTATION_PART2.md)** - Documentação completa de:
- ✅ Produtos (CRUD completo)
- ✅ Grupos de Produtos (CRUD + Reordenação)
- ✅ Complementos (CRUD completo)
- ✅ Grupos de Complementos (CRUD completo)
- ✅ Impressoras (CRUD completo)

Para informações detalhadas sobre esses endpoints, incluindo exemplos de código, validações e casos de uso, consulte a documentação complementar.

---

## 🔍 Schemas e Modelos

Todos os schemas e modelos de dados estão definidos no JSON OpenAPI original. Para referência completa dos tipos de dados, propriedades e validações, consulte a documentação Swagger interativa.

### Principais Schemas:

- `LoginRequest` / `LoginResponse`
- `UsuarioGestorResponse` / `PaginationUsuarioGestorResponse`
- `UsuarioPdvResponse` / `PaginationUsuarioPdvResponse`
- `PerfilGestorResponse` / `PaginationPerfilGestorResponse`
- `PerfilPdvResponse` / `PaginationPerfilPdvResponse`
- `ClienteResponse` / `PaginationClienteResponse`
- `EmpresaResponse` / `PaginationEmpresaResponse`
- `VendaResponse` / `PaginationVendaResponse`
- `OperacaoCaixaTerminalResponse` / `PaginationOperacaoCaixaTerminalResponse`
- `TerminalResponse` / `PaginationTerminalResponse`
- `MeioPagamentoResponse` / `PaginationMeioPagamentoResponse`

---

## 📝 Exemplos de Uso

### Exemplo 1: Login e Obter Token

```typescript
// 1. Realizar login
const loginResponse = await fetch('https://jiffy-backend-hom.nexsyn.com.br/api/v1/auth/login/usuario-gestor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'usuario@exemplo.com',
    password: 'senha123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 2. Usar token em requisições subsequentes
const vendasResponse = await fetch('https://jiffy-backend-hom.nexsyn.com.br/api/v1/operacao-pdv/vendas?limit=10&offset=0', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const vendas = await vendasResponse.json();
```

### Exemplo 2: Criar Cliente

```typescript
const clienteResponse = await fetch('https://jiffy-backend-hom.nexsyn.com.br/api/v1/pessoas/clientes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    nome: 'João Silva',
    cpf: '123.456.789-00',
    telefone: '(11) 98765-4321',
    email: 'joao@exemplo.com',
    endereco: {
      rua: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      complemento: 'Apto 45'
    },
    ativo: true
  })
});

const cliente = await clienteResponse.json();
```

### Exemplo 3: Listar Vendas com Filtros

```typescript
const params = new URLSearchParams({
  status: 'FINALIZADA',
  periodoInicial: '2025-01-01',
  periodoFinal: '2025-01-31',
  terminalId: 'terminal-id-123',
  limit: '50',
  offset: '0'
});

const vendasResponse = await fetch(
  `https://jiffy-backend-hom.nexsyn.com.br/api/v1/operacao-pdv/vendas?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { items: vendas, count, totalPages } = await vendasResponse.json();
```

---

## ⚠️ Observações Importantes

1. **Autenticação:** Todos os endpoints (exceto login e jwks) requerem autenticação via Bearer Token.

2. **Validação de Dados:** Sempre valide os dados antes de enviar requisições. Campos obrigatórios devem ser preenchidos.

3. **Paginação:** Use `limit` e `offset` para paginar resultados grandes. O máximo de `limit` é 100.

4. **Datas:** Use formato ISO 8601 para datas (ex: `2025-01-15` ou `2025-01-15T10:30:00Z`).

5. **CEP:** O formato de CEP aceita tanto com quanto sem hífen (ex: `12345-678` ou `12345678`).

6. **Estados:** Use sigla em maiúsculas (ex: `SP`, `RJ`, `MG`).

7. **Terminais:** A criação de terminais é feita automaticamente pelo app Android. Não use o endpoint POST de terminais diretamente.

---

## 📚 Documentação Complementar

### Produtos, Complementos e Impressoras

Para documentação completa dos seguintes módulos, consulte:

**👉 [API_DOCUMENTATION_PART2.md](./API_DOCUMENTATION_PART2.md)**

Este documento complementar inclui:
- 📦 **Produtos** - CRUD completo com validações
- 📁 **Grupos de Produtos** - CRUD + Reordenação
- 🎯 **Complementos** - CRUD completo
- 📂 **Grupos de Complementos** - CRUD completo
- 🖨️ **Impressoras** - CRUD completo
- 💡 **Exemplos de código** práticos
- ⚠️ **Observações importantes** sobre validações e relacionamentos

---

**Última atualização:** 2025  
**Versão da API:** 1.0.0
