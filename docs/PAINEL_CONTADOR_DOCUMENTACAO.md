# Painel do Contador — Documentação (Clean Architecture)

> Tag: `#PAINEL_CONTADOR`  
> Alinhado à arquitetura Jiffy: `docs/arquitetura-jiffy/`

## Visão geral

O **Portal do Contador** (`/portal-contador`) configura o onboarding fiscal da empresa em etapas:

1. Dados fiscais + certificado digital
2. Emissor fiscal (NF-e / NFC-e)
3. Cenário fiscal (NCMs)
4. Inutilização de numeração (opcional)
5. Chave IBPT (opcional)
6. Reforma tributária (opcional)

## Camadas (frontend)

```
app/portal-contador/                    → rotas finas (presentation)
src/presentation/components/features/painel-contador/  → UI
src/presentation/hooks/painel-contador/ → wiring (controllers)
src/application/use-cases/painel-contador/ → orquestração
src/application/dto/painel-contador/    → contratos de entrada/saída
src/application/mappers/FiscalPainelMapper.ts
src/domain/entities/painel-contador/    → entidades
src/domain/policies/painel-contador/    → regras de progresso
src/domain/repositories/IFiscalPainelRepository.ts → port
src/infrastructure/api/repositories/FiscalPainelApiRepository.ts
app/api/v1/fiscal/* + app/api/certificado → BFF (inalterado)
```

## Rotas

| Rota | Componente |
|------|------------|
| `/gestao/{empresaSlug}/portal-contador` | `PainelContadorView` |
| `/portal-contador/etapa/dados-fiscais` | Etapa 1 |
| `/portal-contador/etapa/emissor-fiscal` | Etapa 2 |
| `/portal-contador/etapa/cenario-fiscal` | Etapa 3 |
| `/portal-contador/etapa/inutilizar-notas` | Etapa 4 |
| `/portal-contador/etapa/chave-ibpt` | Etapa 5 |
| `/portal-contador/etapa/reforma-tributaria` | Reforma tributária |
| `/portal-contador/config/empresa-completa` | Configuração completa |
| `/portal-contador/config/ncm-cest` | Mapeamento NCM |
| `/portal-contador/impostos` | Protótipo MUI (sem API) |

## Navegação (SPA por abas)

- URL do módulo: `/gestao/{empresaSlug}/portal-contador` — empresaSlug no path; etapas internas **não mudam** a URL
- Cada quadrado/etapa abre uma **aba** via `tabsStore.addTab` + `activeTabId`
- `TabBar` troca abas só no estado (sem `router.push`)
- Conteúdo da etapa: `PainelContadorView` renderiza o componente conforme `activeTabId`
- Aba fixa: `painel-contador` (Portal do Contador)
- Guard: `PainelContadorAcessoGuard` (JWT `acessoFiscal === false`)

## Use cases principais

- `VerificarProgressoPainelContadorUseCase` — progresso das etapas 1–3 + IBPT
- `CarregarResumoEmpresaPainelUseCase` — header (nome, CNPJ, regime)
- `GerenciarCertificadoUseCase` — upload/remoção certificado
- `SalvarConfiguracaoEmissaoUseCase` — NF-e / NFC-e
- `ListarConfiguracoesNcmUseCase` — cenário fiscal
- `GerenciarChaveIbptUseCase` — token IBPT (`ibptToken` em `empresas-fiscais`)

## Policies de progresso

| Policy | Critério |
|--------|----------|
| `EtapaDadosFiscaisCompletaPolicy` | Dados empresa + fiscal + certificado válido |
| `EtapaEmissorFiscalCompletaPolicy` | NF-e ou NFC-e ativo e completo |
| `EtapaCenarioFiscalCompletoPolicy` | Todos NCMs com CSOSN (SN) ou CST (normal) |
| `EtapaIbptCompletaPolicy` | `ibptTokenStatus === CADASTRADO` |
| `EtapaHabilitadaPolicy` | Bloqueio sequencial etapas 1→2→3 |

## Testes

```bash
npm run test
```

Arquivos: `tests/unit/domain/painel-contador/policies.test.ts`

## Manutenção

Ao alterar regras de progresso, atualizar **policies** e testes — não duplicar lógica em componentes.
