# Padrão: confirmação ao fechar modal com alterações não salvas

**Status:** implementado no fluxo **Produto** (`NovoProduto` + `ProdutosTabsModal`), **Grupo de produtos** (`NovoGrupo` + `GruposProdutosTabsModal`) e **Perfil PDV + usuário** (`NovoPerfilUsuario` / `NovoUsuario` + `PerfisUsuariosTabsModal`).  
**Próximos passos:** replicar **modal a modal**, quando solicitado — não aplicar em massa sem alinhar cada tela.

---

## Objetivo

Ao fechar o painel/modal (X, overlay, Escape, botão “Fechar” / “Cancelar”) com formulário **dirty**, exibir um aviso:

- **Continuar editando** — só fecha o aviso.
- **Sair sem salvar** — executa o fechamento real e descarta alterações.

Após **salvar com sucesso**, o baseline deve ser atualizado para que `isDirty` volte a `false`.

---

## Referência de implementação (Produto)

| Arquivo | O que foi feito |
|--------|------------------|
| `src/presentation/components/features/produtos/NovoProduto.tsx` | Snapshot JSON (`getFormSnapshot`), `baselineSerializedRef`, `commitBaseline()` após carga da API, após salvamento OK e baseline inicial em modo **criação**. `NovoProdutoHandle.isDirty()`. **Ref `commitBaselineLatestRef`** para chamar o commit mais recente em `setTimeout` / após `await` (evita baseline com snapshot **obsoleto** por closure do `useEffect`). **Snapshot sem passo do wizard** — trocar de etapa não marca dirty. **Re-baseline** após hidratar campos carregados em passo tardio (ex.: fiscal no passo 3). Cancelar em página avulsa (`/produtos/novo`, `/produtos/[id]/editar`) abre diálogo interno quando não há `onClose` do painel. |
| `src/presentation/components/features/produtos/ProdutosTabsModal.tsx` | `handleRequestClose`: se `state.tab === 'produto'` e `npRef.current?.isDirty()`, abre `confirmExitOpen`; senão chama `onClose()`. `JiffySidePanelModal` recebe `onClose={handleRequestClose}`. `NovoProduto` recebe `onClose={handleRequestClose}`; **`onSuccess` continua chamando `onClose()` direto** (sem confirmação). Rodapés “Fechar” das outras abas usam `handleRequestClose`. Overlay de confirmação com `z-[1400]`. **`produtoFormSession`**: contador incrementado só quando `state.open` passa de `false` → `true`; usado no **`key`** do `NovoProduto` (`\`${id}-${mode}-${session}\``) para **remontar** o formulário a cada abertura do painel e **não herdar** baseline/alterações da sessão anterior após “Sair sem salvar”. |
| `src/presentation/components/features/perfis-usuarios-pdv/NovoPerfilUsuario.tsx` | Snapshot JSON: `role`, IDs dos meios vinculados (ordenados), seis flags de permissão. `commitBaseline` após carga (timeout), após sincronizar meios com o perfil, após PATCH automático de meios/permissões, após POST/PATCH do formulário. `closeAfterEmbeddedSaveRef` + `savePerfilAndClose` (submit do form) para “Salvar e fechar” no diálogo; após sucesso embed, `commitBaseline` síncrono antes de `onCancel` para não reabrir o aviso. |
| `src/presentation/components/features/usuarios/NovoUsuario.tsx` | Snapshot: `nome`, `telefone`, `perfilPdvId`, `ativo`, `password`. Baseline após carga (edição) e modo criação; `saveUsuarioAndClose` via `requestSubmit` do form. |
| `src/presentation/components/features/perfis-usuarios-pdv/PerfisUsuariosTabsModal.tsx` | `perfilRef` / `usuarioRef`; `handleRequestClose` com duplo `requestAnimationFrame` consulta `isDirty` da aba ativa; rodapé “Fechar” → `handleRequestClose`. **`formSession`** + `key` em `NovoPerfilUsuario` e `NovoUsuario`. Portal de confirmação `z-[1400]`. |

---

## Regras de baseline e `isDirty` (replicar nos outros modais)

1. **Snapshot estável**  
   Incluir só o que representa **dados do registro** (campos do formulário). **Não** incluir navegação pura (passo do wizard, aba interna) se isso não for considerado “alteração” pelo negócio — senão só mudar de etapa marca dirty.

2. **Commit após estado aplicado**  
   Depois de `fetch` + vários `setState`, usar um pequeno atraso (`setTimeout` ~100 ms ou `requestAnimationFrame`) antes do primeiro `commitBaseline` pós-carga, para o React aplicar o estado vindo da API.

3. **Campos lazy / segundo passo**  
   Se parte dos dados só preenche ao entrar num passo ou aba (ex.: fiscal), após essa hidratação chamar de novo `commitBaseline` (com o mesmo atraso curto se necessário), para o baseline refletir o que o usuário vê naquele passo.

4. **Closure obsoleta — `commitBaselineLatestRef`**  
   Efeitos com deps mínimas (`[id]` etc.) não podem passar `commitBaseline` direto para `setTimeout`/`async`: a função capturada pode usar um `getFormSnapshot` antigo e gravar baseline errado → **falso dirty** ou **falso limpo**. Padrão:

   ```ts
   const commitBaseline = useCallback(() => {
     baselineSerializedRef.current = getFormSnapshot()
   }, [getFormSnapshot])

   const commitBaselineLatestRef = useRef(commitBaseline)
   commitBaselineLatestRef.current = commitBaseline

   // Em setTimeout / após await:
   commitBaselineLatestRef.current()
   ```

5. **`isLoading`**  
   Enquanto o registro principal estiver carregando, `isDirty()` pode retornar `false` para não bloquear fechamento com snapshot incompleto (ajustar conforme UX).

---

## Shell do painel: remontar formulário a cada abertura

O `JiffySidePanelModal` usa transição (`Slide`) e `internalOpen`; o conteúdo pode não desmontar no mesmo instante em que `open` vira `false`. Para não reaproveitar instância com **baseline/estado sujo** da sessão anterior (especialmente após “Sair sem salvar”):

- Manter um contador **`formSession`** (nome livre) incrementado **somente** na transição **`open`: false → true**.
- Passar no **`key`** do componente do formulário: ex. `` `${entidadeId ?? 'new'}-${mode}-${formSession}` ``.

Assim cada abertura do painel é uma **nova montagem** e novo carregamento/baseline, alinhado ao que está no servidor.

---

## Checklist para novo modal / tela

1. **Baseline**  
   - Definir quais campos entram no snapshot (excluir navegação que não conta como edição).  
   - `commitBaseline` após: dados da API aplicados; salvamento OK; estado inicial estável em criar; **hidratação tardia** de abas/passos.  
   - Usar **`commitBaselineLatestRef`** em qualquer commit agendado ou pós-`await`.

2. **Expor “está sujo?”**  
   - `useImperativeHandle` com `isDirty: () => boolean`, ou `onDirtyChange`, conforme o shell.

3. **Shell do painel** (`JiffySidePanelModal` ou equivalente)  
   - `handleRequestClose` que consulta `isDirty` só quando o conteúdo ativo for aquele formulário.  
   - **`key` + sessão de abertura** no filho do formulário (ver secção acima).

4. **Sucesso / persistência**  
   - Após PATCH/POST OK, atualizar baseline com **`commitBaselineLatestRef.current()`** se o commit estiver após `await`.

5. **Página full-page (sem `onClose` do painel)**  
   - No próprio formulário: se `!onClose`, interceptar “voltar/cancelar” e mostrar o mesmo tipo de diálogo (como em `NovoProduto` com `showDiscardDialog`).

6. **Z-index**  
   - Diálogo de confirmação acima do modal MUI (ex.: `z-[1400]`).

---

## Observações

- Trocar de **aba** dentro do mesmo painel (ex.: Produto → Complementos) **sem** fechar pode deixar alterações do produto não salvas sem aviso nesse fluxo — evoluir só se o produto pedir.
- Referência visual similar: `NovaImpressora.tsx` (diálogo “Alterações não salvas”, três ações em alguns fluxos).

---

*Última atualização: baseline com `commitBaselineLatestRef`, snapshot sem passo do wizard, re-baseline após fiscal lazy, e `produtoFormSession` + `key` no `ProdutosTabsModal` para remontar o formulário a cada abertura; fluxo **Perfil PDV + usuário** (`PerfisUsuariosTabsModal` + `NovoPerfilUsuario` / `NovoUsuario`).*
