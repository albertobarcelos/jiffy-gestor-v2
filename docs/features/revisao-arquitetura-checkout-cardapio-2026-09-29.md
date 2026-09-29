# Revisão arquitetural — checkout cardápio público (set/2026)

Registro da revisão dos commits recentes da branch `fix/ajustes-promocoes` frente a `docs/arquitetura-jiffy` e às Rules de Clean Architecture.

## Commits analisados

| Commit | Escopo |
|--------|--------|
| `162ad599` | Promo no form/lista + preço no carrinho público |
| `4b9544dc` | Empty state de categoria (Novo produto) |
| `aa6dbbc0` | % promocional 0,1% + reposicionar categoria no menu |
| `9899e245` | Nota fiscal opcional (`exigeCpfVenda`) + nome no toast de produto |
| `9d126e99` | Modal produto indisponível + remoção do carrinho |

## O que estava alinhado

### Domínio / policies
- `precoVigenteSnapshot` (gestor + cardápio) em `domain/policies` — correto para regra de preço/promo.
- Validação de CPF obrigatório no envio permanece em `MontarPedidoPublicoMapper` / use case (application), com flag da empresa.
- Padrão de cobertura (`CoberturaEntregaPublica` no domain + reexport em `application/errors`) como referência.

### Apresentação
- Toggle de nota fiscal / CPF na revisão: estado de UI, adequado à presentation.
- Autofill de CPF só com `exigeCpfVenda`: orquestração de formulário no hook de checkout (presentation), sem regra de negócio inventada no backend.
- Modal `DeliveryProdutoIndisponivelDialog`: só UI; decisão de “o que é indisponível” deve ficar fora da tela.

### UI gestor (menus/categorias)
- `ProdutosPorGrupoList`, `AddCategoriasToMenuPanel`, locks de preço no form: mudanças de UX/comportamento de tela, sem contaminação de domínio.

## Desvios encontrados e corrigidos

### 1. Regra de produto indisponível em `application/errors`
**Problema:** `isErroProdutoIndisponivelCheckout` e `resolverProdutoIndisponivelDoErro` viviam em `publicDeliveryErrors.ts` (application), misturando classificação de regra de negócio com erros de transporte/API.

**Correção:** movidos para `apps/jiffy-cardapio/src/domain/policies/ProdutoIndisponivelCheckoutPublico.ts`, no mesmo espírito de `CoberturaEntregaPublica`.  
`publicDeliveryErrors` apenas **reexporta** (facade para consumidores que já importavam de lá).

### 2. Reconciliação carrinho × catálogo em `presentation/utils`
**Problema:** `resolverProdutosAusentesDoCatalogo` dependia de DTO de application (`CatalogoPublicoGrupoProdutoDTO`) e ficava em presentation — regra “item do carrinho sem id no catálogo” é de domínio.

**Correção:** mesma policy de domínio, recebendo `ReadonlySet<string>` de IDs disponíveis (sem depender de DTO). A screen monta o `Set` a partir do catálogo (adaptação de apresentação).

### 3. Testes
- Unificados em `tests/unit/domain/policies/ProdutoIndisponivelCheckoutPublico.test.ts`.
- Removidos testes antigos em application/presentation que apontavam para o local errado.

## O que permanece de propósito em application/presentation

| Artefato | Camada | Motivo |
|----------|--------|--------|
| `enriquecerMensagemErroComNomesProdutos` | application/errors | Adaptação de mensagem de API para UX (não é invariante de domínio). |
| `formatarMensagemErroCotacaoPublica` | application/errors | Mensagens amigáveis de transporte/HTTP. |
| Hooks de checkout + modal | presentation | Orquestração de UI e estado local. |
| `menuProdutoPromocaoCalc` (gestor) | presentation | Cálculo de formulário; snapshot canônico já está no domain. |

## Dependências (regra de setas)

```
presentation → application / domain
application  → domain
domain       → (nada externo de negócio)
```

Após o ajuste, a detecção de produto indisponível e a ausência no catálogo **não** dependem de presentation nem de DTO de catálogo.

## Checklist rápido (pós-ajuste)

- [x] Regra de negócio na camada correta (domain policy)
- [x] Sem acoplamento presentation → regra de indisponibilidade
- [x] Domain sem import de DTO de application
- [x] Reexport em application para não quebrar imports existentes
- [x] Testes unitários na pasta de domain

## Como validar

```bash
cd apps/jiffy-cardapio
npx vitest run tests/unit/domain/policies/ProdutoIndisponivelCheckoutPublico.test.ts tests/unit/application/errors/enriquecerMensagemErroComNomesProdutos.test.ts
```
