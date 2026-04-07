# 📋 Documentação Completa - Painel do Contador

> **Tag de Referência:** `#PAINEL_CONTADOR`  
> **Última Atualização:** 2024  
> **Arquivos Relacionados:** `src/presentation/components/features/painel-contador/*`

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura e Estrutura](#arquitetura-e-estrutura)
3. [Fluxos Principais](#fluxos-principais)
4. [Endpoints da API](#endpoints-da-api)
5. [Componentes e Responsabilidades](#componentes-e-responsabilidades)
6. [Estados e Gerenciamento](#estados-e-gerenciamento)
7. [Fluxos Detalhados por Etapa](#fluxos-detalhados-por-etapa)
8. [Dados Enviados e Recebidos](#dados-enviados-e-recebidos)

---

## 🎯 Visão Geral

O **Painel do Contador** é uma interface completa para configuração fiscal e contábil de empresas. Ele permite:

- Configuração de dados fiscais da empresa
- Gerenciamento de certificado digital
- Configuração de emissor fiscal (NF-e e NFC-e)
- Mapeamento de impostos por NCM
- Configuração de numerações fiscais
- Importação de Tabela IBPT
- Configuração de Reforma Tributária

### Estrutura de Etapas

O painel é dividido em **5 etapas principais**:

1. **Etapa 1:** Dados Fiscais e Certificado Digital
2. **Etapa 2:** Emissor Fiscal (NF-e e NFC-e)
3. **Etapa 3:** Cenário Fiscal (Mapeamento NCM)
4. **Etapa 4:** Numerações Fiscais
5. **Etapa 5:** Tabela IBPT

---

## 🏗️ Arquitetura e Estrutura

### Componente Principal

**`PainelContadorView.tsx`** - Componente raiz que:
- Gerencia a navegação entre diferentes views (abas)
- Exibe informações da empresa (nome, CNPJ, regime)
- Renderiza o painel esquerdo (progresso) e direito (etapas)
- Controla a renderização condicional de views específicas

### Views Específicas

O painel pode renderizar diferentes views baseado na aba ativa:

- **`activeTabId === 'impostos'`** → `ConfiguracaoImpostosView`
- **`activeTabId === 'config-ncm-cest'`** → `MapearProdutosView`
- **`activeTabId === 'config-empresa-completa'`** → `ConfiguracaoEmpresaCompleta`

### Componentes de Etapa

Cada etapa é um componente independente:

1. **`Etapa1DadosFiscaisEmpresa`** - Dados fiscais e certificado
2. **`Etapa2EmissorFiscal`** (importado como `Etapa3EmissorFiscal`) - Configuração NF-e/NFC-e
3. **`Etapa3CenarioFiscal`** (importado como `Etapa4CenarioFiscal`) - Link para mapeamento NCM
4. **`Etapa5NumeracoesFiscais`** - Gerenciamento de numerações e inutilizações
5. **`Etapa4TabelaIbpt`** (importado como `Etapa5TabelaIbpt`) - Importação Tabela IBPT

---

## 🔄 Fluxos Principais

### 1. Fluxo de Inicialização

```
1. PainelContadorView monta
2. useEffect adiciona aba 'painel-contador' ao store
3. useEffect verifica isRehydrated (Zustand)
4. Se reidratado, busca dados da empresa (/api/empresas/me)
5. Renderiza painel com informações da empresa
6. Cada etapa carrega seus dados específicos quando necessário
```

### 2. Fluxo de Navegação por Abas

```
1. Usuário clica em botão de configuração
2. addTab() adiciona nova aba ao store
3. activeTabId muda
4. PainelContadorView verifica activeTabId
5. Renderiza view correspondente (MapearProdutosView, ConfiguracaoEmpresaCompleta, etc.)
```

### 3. Fluxo de Autenticação

```
1. Todos os componentes verificam isRehydrated antes de fazer requisições
2. auth?.getAccessToken() obtém token JWT
3. Token é enviado no header Authorization: Bearer {token}
4. Backend valida token e extrai empresaId do JWT
```

---

## 🌐 Endpoints da API

### Backend Principal (`/api/*`)

#### Empresas

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/empresas/me` | Busca dados da empresa logada | - | - |
| `PATCH` | `/api/empresas/{id}` | Atualiza dados da empresa | `Content-Type: application/json` | `{ cnpj, razaoSocial, nomeFantasia, email, telefone, endereco }` |

**Resposta GET `/api/empresas/me`:**
```json
{
  "id": "string",
  "cnpj": "string",
  "nome": "string",
  "razaoSocial": "string",
  "nomeFantasia": "string",
  "email": "string",
  "telefone": "string",
  "endereco": {
    "cep": "string",
    "rua": "string",
    "numero": "string",
    "complemento": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string"
  }
}
```

#### Certificado Digital

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/certificado` | Busca certificado da empresa | - | - |
| `POST` | `/api/certificado` | Cadastra/atualiza certificado | `Content-Type: application/json` | `{ cnpj, certificadoPfx (base64), senhaCertificado, aliasCertificado }` |
| `DELETE` | `/api/certificado` | Remove certificado | - | - |

**Resposta GET `/api/certificado`:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "ambiente": "HOMOLOGACAO" | "PRODUCAO",
    "validadeCertificado": "2024-12-31T00:00:00Z"
  } | null
}
```

**Body POST `/api/certificado`:**
```json
{
  "cnpj": "12345678000190",
  "certificadoPfx": "base64_string",
  "senhaCertificado": "senha123",
  "aliasCertificado": "nome_arquivo"
}
```

### Microserviço Fiscal (`/api/v1/fiscal/*`)

#### Empresas Fiscais

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/empresas-fiscais/me` | Busca configuração fiscal da empresa | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/empresas-fiscais` | Cria/atualiza configuração fiscal | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ empresaId, inscricaoEstadual, inscricaoMunicipal, codigoRegimeTributario, simplesNacional, contribuinteIcms }` |

**Resposta GET `/api/v1/fiscal/empresas-fiscais/me`:**
```json
{
  "id": "string",
  "empresaId": "string",
  "uf": "SP",
  "ambiente": "HOMOLOGACAO" | "PRODUCAO",
  "inscricaoEstadual": "string" | "ISENTO",
  "inscricaoMunicipal": "string",
  "codigoRegimeTributario": 1 | 2 | 3,
  "simplesNacional": boolean,
  "contribuinteIcms": boolean
}
```

**Body POST `/api/v1/fiscal/empresas-fiscais`:**
```json
{
  "empresaId": "string",
  "inscricaoEstadual": "string" | "ISENTO" | null,
  "inscricaoMunicipal": "string" | null,
  "codigoRegimeTributario": 1 | 2 | 3,
  "simplesNacional": boolean,
  "contribuinteIcms": boolean
}
```

#### Configurações de Emissão (NF-e/NFC-e)

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/configuracoes/emissao` | Lista todas configurações de numeração | `Authorization: Bearer {token}` | - |
| `PUT` | `/api/v1/fiscal/configuracoes/emissao/55` | Cria/atualiza configuração NF-e (modelo 55) | `Authorization: Bearer {token}`, `Content-Type: application/json` | Body do gestor: `{ modelo, serie, numeroInicial, terminalId: null, nfeAtivo, ambiente }`. O BFF repassa ao microserviço JSON alinhado ao OpenAPI (`serie`, `numeroInicial`, `ativo` ← `nfeAtivo`, **`ambiente`**, etc.) e mantém `?ambiente=` na URL. |
| `PUT` | `/api/v1/fiscal/configuracoes/emissao/65` | Cria/atualiza configuração NFC-e (modelo 65) | `Authorization: Bearer {token}`, `Content-Type: application/json` | Idem, com `nfceAtivo` → `ativo` e CSC quando aplicável; **`ambiente`** vai no JSON enviado ao fiscal. |

**Resposta GET `/api/v1/fiscal/configuracoes/emissao`:**
```json
[
  {
    "id": "string",
    "modelo": 55 | 65,
    "serie": number,
    "proximoNumero": number,
    "numeroInicial": number,
    "numeroFinal": number | null,
    "ativo": boolean,
    "terminalId": string | null,
    "nfeAtivo": boolean,
    "nfceAtivo": boolean,
    "nfceCscId": string | null,
    "nfceCscCodigo": string | null,
    "ambiente": "HOMOLOGACAO" | "PRODUCAO"
  }
]
```

**Body PUT `/api/v1/fiscal/configuracoes/emissao/55`:**
```json
{
  "modelo": 55,
  "serie": 1,
  "numeroInicial": 1,
  "terminalId": null,
  "nfeAtivo": true,
  "ambiente": "PRODUCAO"
}
```

**Body PUT `/api/v1/fiscal/configuracoes/emissao/65`:**
```json
{
  "modelo": 65,
  "serie": 1,
  "numeroInicial": 1,
  "terminalId": null,
  "nfceAtivo": true,
  "nfceCscId": "CODIGO-CSC-ID-CONTRIBUINTE",
  "nfceCscCodigo": "12345678",
  "ambiente": "PRODUCAO"
}
```

#### Configurações de Impostos por NCM

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/configuracoes/ncms?page=0&size=1000` | Lista configurações de impostos por NCM | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/configuracoes/ncms/{ncm}/impostos` | Cria/atualiza configuração de impostos para um NCM | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ cfop, csosn, icms: { origem, cst, aliquota }, pis: { cst, aliquota }, cofins: { cst, aliquota } }` |
| `GET` | `/api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/historico` | Busca histórico de alterações de um NCM | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/copiar` | Copia configuração de um NCM para outros | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ ncmsDestino: string[], observacao?: string }` |

**Resposta GET `/api/v1/fiscal/configuracoes/ncms`:**
```json
{
  "content": [
    {
      "codigo": "12345678",
      "descricao": "Descrição do NCM",
      "impostos": {
        "cfop": "5102",
        "csosn": "102",
        "icms": {
          "origem": 0,
          "cst": "00",
          "aliquota": 18.0
        },
        "pis": {
          "cst": "01",
          "aliquota": 1.65
        },
        "cofins": {
          "cst": "01",
          "aliquota": 7.60
        }
      }
    }
  ],
  "totalElements": number,
  "totalPages": number
}
```

**Body POST `/api/v1/fiscal/configuracoes/ncms/{ncm}/impostos`:**
```json
{
  "cfop": "5102",
  "csosn": "102",
  "icms": {
    "origem": 0,
    "cst": "00",
    "aliquota": 18.0
  },
  "pis": {
    "cst": "01",
    "aliquota": 1.65
  },
  "cofins": {
    "cst": "01",
    "aliquota": 7.60
  }
}
```

**Resposta GET `/api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/historico`:**
```json
[
  {
    "id": "string",
    "configuracaoId": "string",
    "ncm": {
      "codigo": "12345678",
      "descricao": "string"
    },
    "empresaId": "string",
    "usuarioId": "string",
    "acao": "CRIADO" | "ATUALIZADO" | "REMOVIDO",
    "dataAlteracao": "2024-01-01T00:00:00Z",
    "cfop": "5102",
    "csosn": "102",
    "icms": { ... },
    "pis": { ... },
    "cofins": { ... },
    "observacoes": "string"
  }
]
```

#### Reforma Tributária

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/configuracoes/ncms/reforma-tributaria` | Lista configurações de Reforma Tributária | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/configuracoes/ncms/{ncm}/reforma-tributaria` | Cria/atualiza configuração de Reforma Tributária para um NCM | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ cst, codigoClassificacaoFiscal }` |

**Resposta GET `/api/v1/fiscal/configuracoes/ncms/reforma-tributaria`:**
```json
[
  {
    "id": "string",
    "ncm": {
      "codigo": "12345678",
      "descricao": "string"
    },
    "cst": "00",
    "codigoClassificacaoFiscal": "123456"
  }
]
```

#### Numerações Fiscais

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/numeracao/gaps?modelo={modelo}&serie={serie}&numeroInicial={inicial}&numeroFinal={final}` | Detecta lacunas (gaps) na numeração | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/inutilizar` | Inutiliza faixa de numeração | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ uf, ambiente, modelo, serie, numeroInicial, numeroFinal, justificativa }` |
| `GET` | `/api/v1/fiscal/inutilizacoes?modelo={modelo}&serie={serie}` | Lista histórico de inutilizações | `Authorization: Bearer {token}` | - |

**Resposta GET `/api/v1/fiscal/numeracao/gaps`:**
```json
{
  "modelo": 55 | 65,
  "serie": number,
  "numeroInicialAnalisado": number,
  "numeroFinalAnalisado": number,
  "proximoNumeroConfigurado": number,
  "totalNumerosEmitidosNaFaixa": number,
  "totalFaixasInutilizadasNaFaixa": number,
  "totalGaps": number,
  "gaps": [
    {
      "numeroInicial": number,
      "numeroFinal": number
    }
  ]
}
```

**Body POST `/api/v1/fiscal/inutilizar`:**
```json
{
  "uf": "SP",
  "ambiente": "PRODUCAO",
  "modelo": 55,
  "serie": 1,
  "numeroInicial": 10,
  "numeroFinal": 20,
  "justificativa": "Inutilização de numeração por lacuna detectada no painel."
}
```

#### Tabela IBPT

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/fiscal/tabela-ibpt/status` | Busca status da Tabela IBPT | `Authorization: Bearer {token}` | - |
| `POST` | `/api/v1/fiscal/tabela-ibpt/importar` | Importa Tabela IBPT (JSON) | `Authorization: Bearer {token}`, `Content-Type: application/json` | `{ dadosJson: string }` |

**Resposta GET `/api/v1/fiscal/tabela-ibpt/status`:**
```json
{
  "ultimaImportacao": "2024-01-01T00:00:00Z",
  "totalRegistros": 10000,
  "registrosVigentes": 9500
}
```

**Body POST `/api/v1/fiscal/tabela-ibpt/importar`:**
```json
{
  "dadosJson": "[{...}, {...}]" // Array JSON como string
}
```

#### Validação IBGE

| Método | Endpoint | Descrição | Headers | Body |
|--------|----------|-----------|---------|------|
| `GET` | `/api/v1/ibge/validar-cidade?cidade={nome}&uf={sigla}` | Valida se cidade existe no estado | - | - |

**Resposta GET `/api/v1/ibge/validar-cidade`:**
```json
{
  "valido": true | false
}
```

---

## 🧩 Componentes e Responsabilidades

### PainelContadorView.tsx

**Responsabilidades:**
- Gerenciar aba principal do painel
- Buscar e exibir dados da empresa (nome, CNPJ)
- Renderizar painel esquerdo (progresso) e direito (etapas)
- Controlar navegação para views específicas

**Estados:**
- `empresaNome`: string
- `empresaCnpj`: string

**Hooks Utilizados:**
- `useTabsStore()` - Gerenciamento de abas
- `useAuthStore()` - Autenticação e reidratação

**Endpoints Chamados:**
- `GET /api/empresas/me`

---

### Etapa1DadosFiscaisEmpresa.tsx

**Responsabilidades:**
- Exibir status do certificado digital
- Permitir upload/remoção de certificado
- Abrir modal de configuração completa da empresa

**Estados:**
- `certificado`: objeto certificado ou null
- `isLoadingCertificado`: boolean
- `showUploadModal`: boolean
- `showConfirmModal`: boolean
- `isRemoving`: boolean

**Endpoints Chamados:**
- `GET /api/certificado`
- `DELETE /api/certificado`

**Componentes Relacionados:**
- `CertificadoUploadModal` - Upload de certificado
- `ConfiguracaoEmpresaCompleta` - Configuração completa

---

### Etapa2EmissorFiscal.tsx

**Responsabilidades:**
- Configurar NF-e (modelo 55)
- Configurar NFC-e (modelo 65)
- Gerenciar toggles de ativação
- Configurar CSC para NFC-e

**Estados:**
- `nfeNumeracao`: ConfiguracaoNumeracao | null
- `nfceNumeracao`: ConfiguracaoNumeracao | null
- `emissorFiscal`: ConfiguracaoEmissorFiscal
- `nfeForm`: { serie, proximoNumero, ambiente }
- `nfceForm`: { serie, proximoNumero, cscId, cscCodigo, ambiente }
- `isLoading`: boolean
- `isSaving`: boolean

**Endpoints Chamados:**
- `GET /api/v1/fiscal/configuracoes/emissao`
- `PUT /api/v1/fiscal/configuracoes/emissao/55`
- `PUT /api/v1/fiscal/configuracoes/emissao/65`

**Lógica Especial:**
- Seleciona configuração principal baseado em: ativo + PRODUCAO > ativo + HOMOLOGACAO > PRODUCAO > HOMOLOGACAO
- Sempre usa `terminalId: null` para NF-e e NFC-e (controle único)

---

### Etapa3CenarioFiscal.tsx

**Responsabilidades:**
- Exibir link para configuração de NCM/CEST
- Abrir aba de mapeamento de produtos

**Ações:**
- Ao clicar em "Configurar", abre aba `config-ncm-cest` com `MapearProdutosView`

---

### Etapa4TabelaIbpt.tsx

**Responsabilidades:**
- Exibir status da Tabela IBPT
- Permitir importação de arquivo JSON

**Estados:**
- `status`: StatusTabelaIbpt | null
- `file`: File | null
- `isLoading`: boolean
- `isImporting`: boolean

**Endpoints Chamados:**
- `GET /api/v1/fiscal/tabela-ibpt/status`
- `POST /api/v1/fiscal/tabela-ibpt/importar`

**Validações:**
- Arquivo deve ser JSON
- JSON deve ser um array

---

### Etapa5NumeracoesFiscais.tsx

**Responsabilidades:**
- Consultar lacunas (gaps) na numeração
- Inutilizar faixas de numeração
- Exibir histórico de inutilizações (quando disponível)

**Estados:**
- `modelo`: '55' | '65'
- `serie`: string
- `numeroInicial`: string
- `numeroFinal`: string
- `justificativa`: string
- `gapsData`: GapsResponse | null
- `historico`: InutilizacaoItem[]
- `seriesDisponiveis`: Record<'55' | '65', string[]>
- `contextoFiscal`: ContextoFiscal | null
- `gapsSelecionados`: string[]

**Endpoints Chamados:**
- `GET /api/v1/fiscal/configuracoes/emissao`
- `GET /api/v1/fiscal/empresas-fiscais/me`
- `GET /api/v1/fiscal/numeracao/gaps`
- `GET /api/v1/fiscal/inutilizacoes`
- `POST /api/v1/fiscal/inutilizar`

**Lógica Especial:**
- Filtra apenas gaps históricos (antes do próximo número configurado)
- Permite seleção múltipla de gaps para inutilização em lote
- Justificativa deve ter mínimo de 15 caracteres

---

### MapearProdutosView.tsx

**Responsabilidades:**
- Listar todas configurações de impostos por NCM
- Permitir edição via duplo clique
- Exibir histórico e copiar configurações

**Estados:**
- `configuracoesImpostos`: ConfiguracaoImpostoNcm[]
- `isLoading`: boolean
- `selectedConfig`: ConfiguracaoImpostoNcm | null
- `showModal`: boolean
- `showHistoricoModal`: boolean
- `showCopiarModal`: boolean
- `ncmSelecionado`: string | null
- `regimeTributario`: number | null

**Endpoints Chamados:**
- `GET /api/v1/fiscal/empresas-fiscais/me`
- `GET /api/v1/fiscal/configuracoes/ncms?page=0&size=1000`

**Componentes Relacionados:**
- `ConfigurarNcmModal` - Edição de configuração
- `HistoricoConfiguracaoNcmModal` - Histórico de alterações
- `CopiarConfiguracaoNcmModal` - Copiar para outros NCMs

**Lógica Especial:**
- Determina se é Simples Nacional (1 ou 2) ou Regime Normal (3)
- Exibe CSOSN para Simples Nacional, CST para Regime Normal

---

### ConfiguracaoEmpresaCompleta.tsx

**Responsabilidades:**
- Editar dados completos da empresa
- Editar configuração fiscal
- Validar cidade via IBGE

**Estados:**
- `empresa`: EmpresaData | null
- `configFiscal`: ConfiguracaoFiscal | null
- `formDataEmpresa`: dados do formulário empresa
- `formDataFiscal`: dados do formulário fiscal
- `cidadeValida`: boolean | null
- `isLoading`: boolean
- `isSaving`: boolean

**Endpoints Chamados:**
- `GET /api/empresas/me`
- `GET /api/v1/fiscal/empresas-fiscais/me`
- `GET /api/v1/ibge/validar-cidade`
- `PATCH /api/empresas/{id}`
- `POST /api/v1/fiscal/empresas-fiscais`

**Validações:**
- CNPJ obrigatório
- Razão Social obrigatória
- Inscrição Estadual obrigatória (ou marcar "Isento")
- Validação de cidade via IBGE antes de salvar

---

### CertificadoUploadModal.tsx

**Responsabilidades:**
- Upload de certificado digital (.pfx ou .p12)
- Validação de arquivo e senha

**Estados:**
- `file`: File | null
- `senha`: string
- `isUploading`: boolean
- `cnpj`: string

**Endpoints Chamados:**
- `GET /api/empresas/me` (para obter CNPJ)
- `POST /api/certificado`

**Validações:**
- Arquivo deve ser .pfx ou .p12
- Senha obrigatória
- Arquivo convertido para base64 antes de enviar

---

### ConfigurarNcmModal.tsx

**Responsabilidades:**
- Criar/editar configuração de impostos por NCM
- Adaptar campos baseado no regime tributário

**Estados:**
- `isLoading`: boolean
- `isLoadingRegime`: boolean
- `regimeTributario`: number | null
- `formData`: dados do formulário

**Endpoints Chamados:**
- `GET /api/v1/fiscal/empresas-fiscais/me`
- `POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos`

**Lógica Especial:**
- Se regime 1 ou 2: mostra CSOSN (Simples Nacional)
- Se regime 3: mostra CST (Regime Normal)
- NCM não pode ser editado após criação

---

### ReformaTributariaView.tsx

**Responsabilidades:**
- Listar configurações de Reforma Tributária por NCM
- Permitir edição via duplo clique

**Estados:**
- `configuracoes`: ConfiguracaoReformaTributaria[]
- `isLoading`: boolean
- `selectedConfig`: ConfiguracaoReformaTributaria | null
- `showModal`: boolean

**Endpoints Chamados:**
- `GET /api/v1/fiscal/configuracoes/ncms/reforma-tributaria`

**Componentes Relacionados:**
- `ConfigurarReformaTributariaModal` - Edição de configuração

---

### CopiarConfiguracaoNcmModal.tsx

**Responsabilidades:**
- Copiar configuração de impostos de um NCM para outros

**Estados:**
- `isLoading`: boolean
- `ncmsDestino`: string
- `observacao`: string

**Endpoints Chamados:**
- `POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/copiar`

**Validações:**
- NCMs destino devem ter 8 dígitos
- NCM origem não pode estar na lista de destino

---

### HistoricoConfiguracaoNcmModal.tsx

**Responsabilidades:**
- Exibir histórico de alterações de um NCM

**Estados:**
- `isLoading`: boolean
- `historico`: ConfiguracaoImpostoNcmHistorico[]

**Endpoints Chamados:**
- `GET /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/historico`

---

## 🔄 Estados e Gerenciamento

### Stores Utilizados

#### useTabsStore
- Gerencia abas abertas
- Controla aba ativa
- Permite adicionar/remover abas

#### useAuthStore
- Gerencia autenticação
- Fornece token JWT
- Controla reidratação do Zustand (`isRehydrated`)

### Padrão de Carregamento

Todos os componentes seguem o padrão:

```typescript
useEffect(() => {
  if (!isRehydrated) return // Aguarda reidratação
  loadData()
}, [isRehydrated])
```

### Tratamento de Erros

- Erros são capturados e exibidos via `showToast.error()`
- Logs de erro no console para debug
- Estados de loading são sempre resetados no `finally`

---

## 📊 Fluxos Detalhados por Etapa

### Etapa 1: Dados Fiscais e Certificado

```
1. Componente monta
2. Verifica isRehydrated
3. Busca certificado: GET /api/certificado
4. Se certificado existe:
   - Exibe informações (tipo, validade, ambiente)
   - Mostra botão "Remover Certificado"
   - Calcula dias até expiração
5. Se certificado não existe:
   - Mostra botão "Cadastrar Certificado"
6. Ao clicar em "Cadastrar":
   - Abre CertificadoUploadModal
   - Usuário seleciona arquivo .pfx/.p12
   - Usuário informa senha
   - Modal busca CNPJ: GET /api/empresas/me
   - Converte arquivo para base64
   - Envia: POST /api/certificado
   - Recarrega certificado após sucesso
7. Ao clicar em "Remover":
   - Abre modal de confirmação
   - Envia: DELETE /api/certificado
   - Recarrega certificado após sucesso
```

### Etapa 2: Emissor Fiscal

```
1. Componente monta
2. Verifica isRehydrated e token
3. Busca configurações: GET /api/v1/fiscal/configuracoes/emissao
4. Seleciona uma linha inicial por modelo (55/65) a partir do GET: se **apenas uma** configuração vier com `ativo === true`, usa essa; senão, produção antes de homologação. Série, próxima emissão (e CSC na NFC-e) vêm dessa linha ao abrir/recarregar. **Trocar só o select de ambiente não dispara novo fetch** — mantém os valores atuais do formulário; persistência no banco ocorre ao clicar em Salvar para o ambiente selecionado.
5. Preenche formulários com dados encontrados
6. Usuário pode:
   - Ativar/desativar NF-e via toggle
   - Ativar/desativar NFC-e via toggle
   - Configurar série e próxima emissão
   - Configurar ambiente (HOMOLOGACAO/PRODUCAO)
   - Configurar CSC (apenas NFC-e)
7. Ao salvar NF-e:
   - Valida campos obrigatórios
   - Envia: PUT /api/v1/fiscal/configuracoes/emissao/55
   - Atualiza estado local com resposta
8. Ao salvar NFC-e:
   - Valida campos obrigatórios (incluindo CSC se ativo)
   - Envia: PUT /api/v1/fiscal/configuracoes/emissao/65
   - Atualiza estado local com resposta
9. Ao alternar toggle:
   - Atualiza estado local imediatamente
   - Se configuração existe, salva no backend
   - Se não existe, salva quando usuário salvar numeração
```

### Etapa 3: Cenário Fiscal

```
1. Componente monta
2. Exibe descrição e botão "Configurar"
3. Ao clicar em "Configurar":
   - Adiciona aba: addTab({ id: 'config-ncm-cest', ... })
   - PainelContadorView detecta activeTabId === 'config-ncm-cest'
   - Renderiza MapearProdutosView
```

### Etapa 4: Numerações Fiscais

```
1. Componente monta
2. Verifica isRehydrated e token
3. Busca configurações disponíveis: GET /api/v1/fiscal/configuracoes/emissao
4. Busca contexto fiscal: GET /api/v1/fiscal/empresas-fiscais/me
5. Seleciona primeira configuração disponível (preferência NFC-e > NF-e)
6. Preenche modelo e série
7. Busca gaps e histórico: Promise.all([carregarGaps, carregarHistorico])
8. Usuário pode:
   - Alterar modelo (55 ou 65)
   - Alterar série (baseado nas disponíveis)
   - Definir faixa opcional (número inicial/final)
   - Editar justificativa
   - Consultar gaps: carregarTudo()
9. Ao consultar:
   - Envia: GET /api/v1/fiscal/numeracao/gaps?modelo={modelo}&serie={serie}...
   - Exibe gaps históricos (antes do próximo número)
   - Permite seleção múltipla
10. Ao inutilizar:
    - Valida seleção e justificativa (mínimo 15 caracteres)
    - Para cada gap selecionado:
      - Envia: POST /api/v1/fiscal/inutilizar
    - Recarrega gaps após sucesso
```

### Etapa 5: Tabela IBPT

```
1. Componente monta
2. Verifica isRehydrated e token
3. Busca status: GET /api/v1/fiscal/tabela-ibpt/status
4. Exibe status (importada ou não)
5. Se importada, exibe:
   - Total de registros
   - Registros vigentes
   - Última importação
6. Usuário pode:
   - Selecionar arquivo JSON
   - Clicar em "Importar"
7. Ao importar:
   - Valida que arquivo é JSON
   - Valida que JSON é array
   - Lê arquivo como texto
   - Envia: POST /api/v1/fiscal/tabela-ibpt/importar
   - Recarrega status após sucesso
```

### MapearProdutosView

```
1. Componente monta
2. Verifica isRehydrated e token
3. Busca regime tributário: GET /api/v1/fiscal/empresas-fiscais/me
4. Busca configurações: GET /api/v1/fiscal/configuracoes/ncms?page=0&size=1000
5. Mapeia dados para ConfiguracaoImpostoNcm[]
6. Exibe tabela com configurações
7. Usuário pode:
   - Dar duplo clique em NCM para editar
   - Clicar em "Histórico" para ver histórico
   - Clicar em "Copiar" para copiar configuração
8. Ao editar (duplo clique):
   - Abre ConfigurarNcmModal
   - Modal busca regime tributário novamente
   - Preenche formulário com dados existentes (se edição)
   - Ao salvar: POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos
   - Recarrega lista após sucesso
9. Ao ver histórico:
   - Abre HistoricoConfiguracaoNcmModal
   - Modal busca: GET /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/historico
10. Ao copiar:
    - Abre CopiarConfiguracaoNcmModal
    - Usuário informa NCMs destino (separados por vírgula)
    - Modal valida NCMs (8 dígitos)
    - Envia: POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/copiar
    - Recarrega lista após sucesso
```

### ConfiguracaoEmpresaCompleta

```
1. Componente monta
2. Verifica isRehydrated
3. Busca dados empresa: GET /api/empresas/me
4. Busca configuração fiscal: GET /api/v1/fiscal/empresas-fiscais/me
5. Preenche formulários
6. Usuário edita dados
7. Ao salvar:
   - Valida campos obrigatórios
   - Valida cidade via IBGE (se informada)
   - Atualiza empresa: PATCH /api/empresas/{id}
   - Cria/atualiza fiscal: POST /api/v1/fiscal/empresas-fiscais
   - Aguarda 1s para garantir commit no banco
   - Recarrega dados
```

---

## 📤 Dados Enviados e Recebidos

### Resumo de Payloads

#### POST /api/certificado
```json
{
  "cnpj": "12345678000190",
  "certificadoPfx": "base64_string_do_arquivo",
  "senhaCertificado": "senha123",
  "aliasCertificado": "nome_do_arquivo_sem_extensao"
}
```

#### PUT /api/v1/fiscal/configuracoes/emissao/55
```json
{
  "modelo": 55,
  "serie": 1,
  "numeroInicial": 1,
  "terminalId": null,
  "nfeAtivo": true,
  "ambiente": "PRODUCAO"
}
```

#### PUT /api/v1/fiscal/configuracoes/emissao/65
```json
{
  "modelo": 65,
  "serie": 1,
  "numeroInicial": 1,
  "terminalId": null,
  "nfceAtivo": true,
  "nfceCscId": "CODIGO-CSC-ID-CONTRIBUINTE",
  "nfceCscCodigo": "12345678",
  "ambiente": "PRODUCAO"
}
```

#### POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos
```json
{
  "cfop": "5102",
  "csosn": "102",
  "icms": {
    "origem": 0,
    "cst": "00",
    "aliquota": 18.0
  },
  "pis": {
    "cst": "01",
    "aliquota": 1.65
  },
  "cofins": {
    "cst": "01",
    "aliquota": 7.60
  }
}
```

#### POST /api/v1/fiscal/configuracoes/ncms/{ncm}/reforma-tributaria
```json
{
  "cst": "00",
  "codigoClassificacaoFiscal": "123456"
}
```

#### POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos/copiar
```json
{
  "ncmsDestino": ["87654321", "11223344"],
  "observacao": "Configuração copiada do NCM 12345678"
}
```

#### POST /api/v1/fiscal/inutilizar
```json
{
  "uf": "SP",
  "ambiente": "PRODUCAO",
  "modelo": 55,
  "serie": 1,
  "numeroInicial": 10,
  "numeroFinal": 20,
  "justificativa": "Inutilização de numeração por lacuna detectada no painel."
}
```

#### POST /api/v1/fiscal/tabela-ibpt/importar
```json
{
  "dadosJson": "[{\"codigo\":\"12345678\",\"descricao\":\"...\",\"aliquota\":18.0},...]"
}
```

#### PATCH /api/empresas/{id}
```json
{
  "cnpj": "12345678000190",
  "razaoSocial": "Empresa LTDA",
  "nomeFantasia": "Empresa",
  "email": "contato@empresa.com",
  "telefone": "11999999999",
  "endereco": {
    "cep": "01234567",
    "rua": "Rua Exemplo",
    "numero": "123",
    "complemento": "Sala 1",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

#### POST /api/v1/fiscal/empresas-fiscais
```json
{
  "empresaId": "uuid",
  "inscricaoEstadual": "123456789012" | "ISENTO" | null,
  "inscricaoMunicipal": "987654" | null,
  "codigoRegimeTributario": 1,
  "simplesNacional": true,
  "contribuinteIcms": true
}
```

---

## 🔍 Observações Importantes

### Autenticação

- Todos os endpoints do microserviço fiscal requerem `Authorization: Bearer {token}`
- Token é obtido via `auth?.getAccessToken()` do `useAuthStore`
- Backend extrai `empresaId` do JWT automaticamente

### Regime Tributário

- **Código 1 ou 2:** Simples Nacional → Usa **CSOSN**
- **Código 3:** Regime Normal (Presumido/Real) → Usa **CST**

### Configurações de Emissão

- NF-e e NFC-e são independentes
- Cada uma tem seu próprio toggle de ativação
- NFC-e requer CSC (Código de Segurança do Contribuinte)
- Sempre usa `terminalId: null` (controle único por empresa)

### Numerações

- Gaps são detectados comparando números emitidos com faixa configurada
- Apenas gaps históricos (antes do próximo número) podem ser inutilizados
- Inutilização requer justificativa mínima de 15 caracteres

### Validações

- NCM sempre 8 dígitos
- CFOP sempre 4 dígitos
- CNPJ sempre 14 dígitos (sem formatação no payload)
- Cidade validada via IBGE antes de salvar

---

## 🏷️ Tag de Referência

**`#PAINEL_CONTADOR`**

Use esta tag para referenciar esta documentação em:
- Issues do GitHub
- Pull Requests
- Comentários no código
- Documentação de features relacionadas

---

## 📝 Notas de Manutenção

### Ao Modificar Este Fluxo

1. **Atualizar esta documentação** com as mudanças
2. **Verificar endpoints** - garantir que estão documentados
3. **Atualizar tipos TypeScript** se necessário
4. **Testar fluxos completos** após mudanças
5. **Verificar validações** do backend

### Pontos de Atenção

- ⚠️ Sempre aguardar `isRehydrated` antes de fazer requisições
- ⚠️ Validar token antes de chamar endpoints do microserviço fiscal
- ⚠️ Tratar erros 404 como "não encontrado" (não erro fatal)
- ⚠️ Resetar estados de loading no `finally`
- ⚠️ Recarregar dados após operações de sucesso

---

**Fim da Documentação**
