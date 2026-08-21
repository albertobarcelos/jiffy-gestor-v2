# Manutenção cBenef (Código de Benefício Fiscal)

NT 2019.001 — campo `cBenef` na NF-e/NFC-e para empresas em **Regime Normal (CRT=3)**.

Documentação nativa: [Swagger fiscal produção](https://fiscal.prod.jiffy.run/swagger-ui/index.html) (`/v3/api-docs`).

O microsserviço fiscal já valida e monta o XML. Este documento descreve o que o **Gestor** expõe ao contador.

## Quando o campo aparece

| Situação | Comportamento na UI |
| --- | --- |
| CRT 1 ou 2 (Simples Nacional) | Não exibe cBenef |
| CRT 3 + UF sem tabela ativa | Exibe o campo, não obriga |
| CRT 3 + SP + CST 20/40/41/50/51 sem cBenef | Alerta na emissão (não bloqueia) |
| Código informado inválido | Aviso amarelo no onBlur (não bloqueia o save) |
| CST 20 sem `% redução da base` | Bloqueia o save |
| CST 10, 30 ou 70 | Bloqueia com pedido para falar com o suporte |

SP **não aceita** o código genérico `SEM CBENEF` desde 01/07/2026 — exige código específico da tabela. Fora de SP a API aceita a literal `SEM CBENEF` (com espaço).

## UFs com cBenef ativo (ago/2026)

DF, ES, GO, MT, PR, RJ, RS, SC, SP.

## Onde configurar

Portal do Contador → **Cenário Fiscal (NCMs)** → duplo clique no NCM.

- Campo **cBenef**: 8 ou 10 caracteres, ou a literal `SEM CBENEF`. onBlur valida na tabela da UF.
- Lupa: lista códigos da UF (e CST, se selecionado).
- **% Redução da Base**: só aparece com CST ICMS = 20.

## Emissão

Se a empresa for CRT=3 + UF=SP e algum item da venda tiver CST de benefício **sem** `codigoBeneficioFiscal` no NCM, o Gestor avisa (erro SEFAZ 930) e oferece:

- Continuar mesmo assim
- Configurar agora (abre o modal do NCM / aba Cenário Fiscal)

## Importar tabela (admin)

Portal do Contador → **Tabela cBenef** (outras configurações).

Upload **multipart** do JSON publicado pela SEFAZ, campo `arquivo`. Resultado (`ImportResult`): `totalProcessados`, `inseridos`, `atualizados`, `ignorados`, `erros` (número).

JSON esperado: array com `codigo`, `uf`, `descricao`, `cst_icms` (opcional), `vigencia_inicio`, `vigencia_fim`, `ativo`.

## Mapeamento BFF ↔ fiscal

O browser nunca chama o microsserviço. Fluxo:

```
UI → hook → use case → FiscalPainelApiRepository
  → BFF app/api/v1/fiscal/configuracoes/cbenef...
  → se FISCAL_MICROSERVICE_BASE_URL: host fiscal + path nativo /v1/...
  → senão: PDV gateway /api/v1/fiscal/...
```

Paths **nativos** do fiscal (não existem `GET /v1/configuracoes/cbenef?uf=` nem `GET /v1/configuracoes/cbenef/{codigo}`):

| Ação | BFF Gestor | Fiscal (Swagger) |
| --- | --- | --- |
| Listar | `GET /api/v1/fiscal/configuracoes/cbenef?uf=&cst=` | `GET /v1/configuracoes/cbenef/por-uf/{uf}?cst=` |
| Validar | `GET /api/v1/fiscal/configuracoes/cbenef/{codigo}` | `GET /v1/configuracoes/cbenef/validar/{codigo}` |
| Importar | `POST /api/v1/fiscal/configuracoes/cbenef/importar` (multipart `arquivo`) | `POST /v1/configuracoes/cbenef/importar` |
| Salvar no NCM | `POST /api/v1/fiscal/configuracoes/ncms/{ncm}/impostos` | `PATCH /v1/configuracoes/ncms/{codigo}` com `{ impostos }` |

Lista (`CbenefPorUfResponse`): `codigo`, `uf`, `descricao`, `cstIcmsCompativel`, `vigenciaInicio`, `vigenciaFim`.

Validação (`ValidarCbenefResponse`): `valido`, `codigo`, `uf`, `descricao`, `cstIcmsCompativel`, `mensagem`. Não há campo `vigente`.

Payload no save de impostos (`CriarConfiguracaoImpostoRequest`):

```json
{
  "codigoBeneficioFiscal": "SP070060",
  "icms": {
    "origem": 0,
    "cst": "20",
    "aliquota": 18.00,
    "reducaoBase": 33.33
  }
}
```

`codigoBeneficioFiscal` fica na raiz de `impostos` (irmão de `icms`). Não enviar no Simples Nacional.

JWT: issuer `jiffy-gestor`, claim `empresaId`.

## Arquivos principais

- Regras: `src/domain/entities/painel-contador/cbenefRegras.ts`
- Upstream: `src/server/fiscal/cbenefUpstream.ts`
- Modal NCM: `src/presentation/components/features/painel-contador/ConfigurarNcmModal.tsx`
- Alerta emissão: `src/presentation/components/features/fiscal/AlertaCbenefEmissaoDialog.tsx`
- Importação: `src/presentation/components/features/painel-contador/ImportarCbenefView.tsx`
