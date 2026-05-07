# Fluxo de autenticação e cadastro (Gestor) — plano de implementação

Este arquivo acompanha a implementação por partes do fluxo descrito nos guias (cadastro + confirmação de e-mail, login multi-empresa, recuperação de senha, convite com registro). Atualize o checklist conforme as fases forem concluídas.

**Referências no repo**

- Fluxo atual de login e proxy Next → backend: `docs/FLUXO_LOGIN_ATUAL.md`
- Padrão de feature com views + utils + tipos: `src/presentation/components/features/meus-apps/`
- Login existente: `src/presentation/components/features/auth/LoginForm.tsx`, rotas `app/api/auth/login/`, `app/api/auth/escolher-empresa/`

---

## 1. Informações que precisamos antes (ou durante) a implementação

Marque o que já estiver definido com o backend/time.

### Contratos HTTP

| Item | Por que importa |
|------|-----------------|
| **Prefixo das rotas** | Alinhar `POST /auth/...` vs `POST /api/v1/auth/...` com o que o `apiClient` / rotas Next já encaminham (`FLUXO_LOGIN_ATUAL.md` usa `/api/v1/auth/...` no servidor). |
| **Corpo e status exatos** de `POST .../registro` | Resposta 201: há body ou só header? Campos de erro (409 vs 400 para e-mail duplicado / ConstraintError). |
| **Convite + registro** | Mesmo endpoint de registro com flag/query ou fluxo separado? Como o convite identifica o usuário novo (token na URL, `conviteId`, etc.)? |
| **`POST .../confirmar-email`** | Só 204/400 ou há body JSON com mensagem? |
| **`POST .../reenviar-confirmacao`** | Confirmar que é sempre 204 e campo `username` (e-mail). |
| **`POST .../login`** | Formato exato do **401** “e-mail não confirmado” (campo `message` vs `error` vs texto puro). |
| **`POST .../esqueci-senha` e `redefinir-senha`** | Headers necessários; formato de erro 400 na redefinição. |
| **`POST /convites/me/:id/aceitar`** | Já existe integração em `MeusAppsPage`; confirmar se o fluxo “registro por convite” usa o mesmo contrato e **qual `id`** (convite vs empresa). |

### Produto / UX

| Item | Por que importa |
|------|-----------------|
| **URLs públicas** | Confirmar paths no Next: `/confirmar-email`, `/redefinir-senha`, `/registro`, convite em `/convite/...` ou query em `/login?...`. |
| **FRONTEND_URL** | Já definido no backend para links de e-mail; validar ambiente local (ex.: `http://localhost:3000`). |
| **Onde guardar `identityToken`** entre login e escolher empresa | Hoje há Zustand + cookies em fluxos existentes; definir se o passo “só identidade” persiste só em memória/store ou cookie httpOnly via rota Next. |

### Segurança / limites

| Item | Nota |
|------|------|
| **429** | Tratar mensagem genérica ou header `Retry-After` se existir. |
| **Rate limits** | Documentação interna (10/15 min registro, 3/h esqueci senha) serve para mensagens de UX, não para lógica no front além de exibir erro. |

---

## 2. Princípios de código (alinhado ao que já existe)

- **Views finas**: páginas e formulários só orquestram estado local visível e chamam hooks/casos de uso.
- **Lógica reutilizável**: validação de senha forte, parse de erros da API, construção de `fetch` → hooks (`useRegistro`, `useConfirmarEmail`, …) ou funções em `src/application` / `src/shared` conforme o padrão do projeto.
- **Componentes**: inputs, botões, alertas de erro/sucesso, layouts de auth — em `components/features/auth/` ou subpastas (`components/RegistroForm.tsx`, etc.).
- **Tipos**: DTOs de request/response em `types.ts` ou ao lado da feature, espelhando o backend.
- **Proxy**: preferir rotas `app/api/...` que espelham o backend (como `login`) para cookies httpOnly e uma única base URL — **decidir por feature** se cada novo endpoint ganha `app/api/auth/.../route.ts`.

---

## 3. Ordem sugerida das fases (incremental)

Ordem pensada para **dependências mínimas** e entregas testáveis.

| Fase | Escopo | Entrega |
|------|--------|---------|
| **A — Fundação** | Tipos + cliente/rota Next para **um** endpoint novo (ex.: `reenviar-confirmacao` ou `confirmar-email`) + util `validarSenhaGestor` | Contrato validado ponta a ponta |
| **B — Confirmação de e-mail** | Página `/confirmar-email` + chamada automática ao montar + UI sucesso/erro + link para reenvio | Fluxo do guia 1.2 e 1.3 |
| **C — Cadastro público** | Página `/registro` + `POST registro` + tela pós-cadastro | Fluxo 1.1 |
| **D — Login endurecido** | Ajustar `LoginForm` + store: tratar 401 “não confirmado”, botão reenviar | Integra B/C |
| **E — Esqueci / Redefinir** | `/esqueci-senha`, `/redefinir-senha` + rotas API | Fluxo 3 |
| **F — Convite + registro** | Rota de entrada do link + registro com `ativo: true` + login silencioso + `aceitar` convite | Fluxo documentado à parte |

**Por onde começar na prática:** **Fase B (confirmar e-mail)** ou **Fase A + B**, porque não depende de nova tela de cadastro para testar (pode usar usuário criado manualmente/API). Se quiser entrega visível primeiro para stakeholders, começar por **Fase C (cadastro)** também é válido — nesse caso confirme antes o contrato de **registro** na linha da tabela da seção 1.

---

## 4. Checklist (editar ao longo do projeto)

- [x] Contratos da seção 1 revisados com backend (OpenAPI em `/docs/json`, paths `/api/v1/auth/usuario/*`)
- [x] Fase A — DTOs (`UsuarioAuthDTO`), `senhaGestorRules`, constantes `authUsuarioApiPaths`, proxy BFF `app/api/auth/usuario/*`
- [x] Fase B — `/confirmar-email` + reenvio embutido em erro de token
- [x] Fase C — `/registro` + `/registro/sucesso`
- [x] Fase D — `LoginForm`: detecção de “e-mail não confirmado” + reenvio; links para `/registro` e `/esqueci-senha`
- [x] Fase E — `/esqueci-senha`, `/redefinir-senha`, `/redefinir-senha/sucesso`
- [x] Fase F — Convite: link do e-mail → `/login?email=&novousuario=true` → redirect `/registro?fluxo=convite&email=` → registro → login silencioso → aceitar convite → `/meus-apps`
- [ ] `FLUXO_LOGIN_ATUAL.md` atualizado se URLs ou fluxos mudarem

### Rotas Next implementadas (BFF → backend)

| Next (browser) | Upstream |
|----------------|----------|
| `POST /api/auth/usuario/registro` | `POST /api/v1/auth/usuario/registro` |
| `POST /api/auth/usuario/confirmar-email` | `POST /api/v1/auth/usuario/confirmar-email` |
| `POST /api/auth/usuario/reenviar-confirmacao` | `POST /api/v1/auth/usuario/reenviar-confirmacao` |
| `POST /api/auth/usuario/esqueci-senha` | `POST /api/v1/auth/usuario/esqueci-senha` |
| `POST /api/auth/usuario/redefinir-senha` | `POST /api/v1/auth/usuario/redefinir-senha` |

### Páginas públicas

- `/confirmar-email?token=…`
- `/registro`, `/registro/sucesso`
- `/esqueci-senha`
- `/redefinir-senha?token=…`, `/redefinir-senha/sucesso`

---

## 5. Notas de sessão

_Use este bloco para registrar decisões e datas._

- **2026-05-06**: Implementação inicial cadastro/confirmação/recuperação conforme OpenAPI local; middleware liberou rotas públicas acima e `/api/auth/usuario/*`.
- **2026-05-06 (convite)**: `LoginInviteRedirect` + `executarPosRegistroConvite` (usa convites já existentes em `/api/convites/me`).
- **2026-05-06 (convite + backend)**: `POST /auth/usuario/registro` aceita `conviteId` opcional; sem ele, o backend busca convite **PENDENTE** válido pelo e-mail (mais recente). Usuário novo no e-mail do convite recebe link curto `login?email=&novousuario=true` (sem `conviteId`). Usuário já ativo recebe `login?email=&conviteId=` para login contextual.
