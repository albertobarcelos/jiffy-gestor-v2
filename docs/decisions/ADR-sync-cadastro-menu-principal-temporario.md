# ADR: ponte temporária cadastro base ↔ menu principal

## Contexto

Máquinas em produção ainda leem o **produto base** (versão sem menu). O Gestor
já trabalha com cardápios (menu principal + outros). Sem espelhamento, o
operador altera o menu e o PDV continua com o cadastro antigo.

## Decisão

Enquanto `SYNC_CADASTRO_COM_MENU_PRINCIPAL` estiver `true`:

- criar produto sempre vincula (e trava) o menu principal;
- editar o cadastro atualiza **só** o menu principal, sem pergunta e sem outros menus;
- editar o menu principal atualiza o cadastro e pergunta se replica aos outros;
- outros menus só mudam se o usuário confirmar a replicação;
- não dá para desvincular do principal.

A regra vive em `src/domain/policies/produto/syncCadastroComMenuPrincipal.ts`.

## Como remover

1. `SYNC_CADASTRO_COM_MENU_PRINCIPAL = false` (volta o comportamento antigo).
2. Grep `TEMP_SYNC_CADASTRO_MENU_PRINCIPAL` / `syncCadastroComMenuPrincipal` e
   apagar o módulo, este ADR e os imports.
