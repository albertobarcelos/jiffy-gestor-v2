# Fluxo de Login (ATUAL) — para ser substituído

Este documento descreve **como o login funciona hoje** (UI → API interna → API externa → sessão/cookie → navegação), incluindo **endpoints utilizados** e **o fluxo após autenticação**.

> Objetivo: servir como “baseline” para o refactor do novo fluxo de login.

## 1) Tela / Componente responsável

- **UI principal**: `src/presentation/components/features/auth/LoginForm.tsx`
- **Página**: `app/(auth)/login/page.tsx` (renderiza o `LoginForm`)

### 1.1) Payload enviado pelo formulário

Ao submeter, a tela faz:

- `POST /api/auth/login`
- `Content-Type: application/json`
- Body:
  - `username`: string (usa `email.trim()` do input)
  - `password`: string

> Observação: o campo de UI é “E-mail”, mas o payload se chama `username`.

## 2) Endpoints usados (internos do Next)

### 2.1) `POST /api/auth/login`

- **Arquivo**: `app/api/auth/login/route.ts`
- **Validação**: `LoginSchema` em `src/application/dto/LoginDTO.ts`
  - `username`: aceita email **ou** username (regra atual do Zod: `.email().or(min(3))`)
  - `password`: obrigatório
- **Use case**: `src/application/use-cases/auth/LoginUseCase.ts`
- **Repository**: `src/infrastructure/database/repositories/AuthRepository.ts`
- **Resposta (sucesso)**:
  - JSON: `{ success: true, data: auth.toJSON() }`
  - `data` (shape do `Auth.toJSON()`):
    - `accessToken`: string
    - `user`: `{ id, email, name? }`
    - `expiresAt`: string ISO
- **Efeito colateral**: seta cookie:
  - nome: `auth-token`
  - `httpOnly: true`
  - `sameSite: 'strict'`
  - `secure: true` apenas em produção
  - `path: '/'`
  - `maxAge: 86400` (24h)

### 2.2) `POST /api/auth/logout`

- **Arquivo**: `app/api/auth/logout/route.ts`
- **Quem chama**:
  - `useAuthStore.logout()` em `src/presentation/stores/authStore.ts`
  - também chamado indiretamente pelo `AuthGuard` quando sessão é inválida/expirada
- **Efeito colateral**:
  - remove cookie `auth-token` (`delete`)
  - reforça removendo cookie com valor vazio e `maxAge: 0`

### 2.3) `GET /api/auth/me`

- **Arquivo**: `app/api/auth/me/route.ts`
- **Validação**:
  - `validateRequest()` → `getTokenInfo()` (lê token e valida exp/assinatura quando disponível)
  - exige `empresaId` no token (`validateRequest` falha se não existir)
- **Chamada para API externa**:
  - `GET /api/v1/auth/me` com header `Authorization: Bearer <token>`

## 3) Endpoints usados (API EXTERNA)

> Essas rotas são chamadas pelo `AuthRepository` via `ApiClient` (base URL = `NEXT_PUBLIC_EXTERNAL_API_BASE_URL`).

### 3.1) Login (varia por “flow”)

Arquivo: `src/infrastructure/database/repositories/AuthRepository.ts`

O repositório decide o fluxo por env:

- `AUTH_FLOW` ou `NEXT_PUBLIC_AUTH_FLOW`
  - se estiver em uma destas opções: `multi_empresa`, `multi-empresa`, `multiempresa`, `multi_company`, `new`
  - então usa **multi_empresa**
  - caso contrário, usa **legacy**

#### a) Flow `legacy`

- `POST /api/v1/auth/login/usuario-gestor`
- body: `{ username, password }`
- Extrai token e monta `Auth` (ver seção 4)

#### b) Flow `multi_empresa`

1) `POST /api/v1/auth/login`
   - body: `{ username, password }`
   - extrai `identityToken` (ou `accessToken` dependendo do payload)
   - tenta resolver `empresaId` da resposta (ou usa `AUTH_EMPRESA_ID`/`NEXT_PUBLIC_AUTH_EMPRESA_ID` se definido)

2) Se tiver `empresaId`, chama:
   - `POST /api/v1/auth/escolher-empresa`
   - body: `{ empresaId }`
   - header opcional: `Authorization: Bearer <identityToken>`
   - pega token final e monta `Auth`

> Se vierem várias empresas e nenhuma marcada como padrão, o código usa a primeira e loga um `console.warn`.

### 3.2) “Me” (identidade)

Via `GET /api/auth/me` (interno), que chama:

- `GET /api/v1/auth/me` (externo)

## 4) Como a sessão é materializada no cliente (Zustand + Domain)

### 4.1) O que a UI faz após receber sucesso do login

No `LoginForm.tsx`:

1) Recebe `data.data` da resposta do `POST /api/auth/login`
2) Reconstrói entidades:
   - `User.create(authData.user.id, authData.user.email, authData.user.name)`
   - `Auth.createWithExpiration(authData.accessToken, user, new Date(authData.expiresAt))`
3) Atualiza o store:
   - `useAuthStore.login(auth)`
4) Navega:
   - `window.location.href = '/dashboard'`

### 4.2) Persistência

`useAuthStore` usa `zustand/persist`:

- key no localStorage: `auth-storage`
- persiste parcialmente:
  - `auth` (via `auth.toJSON()`)
  - `isAuthenticated`
- reidratação:
  - reconstrói `User` e `Auth`
  - marca `isRehydrated = true`

### 4.3) Expiração no cliente

- `Auth.isExpired()` compara `new Date() >= expiresAt`
- `useAuthStore.login()` **recusa** logar se `auth.isExpired()`
- `AuthGuard` faz logout e redireciona ao login se:
  - `!isAuthenticated` **ou**
  - `auth == null` **ou**
  - `auth.isExpired()`

## 5) O que acontece ao abrir páginas após login (proteções)

### 5.1) Middleware (Edge)

Arquivo: `middleware.ts`

- Rotas públicas (bypass):
  - `/login`
  - `/api/auth/login*`
  - `/api/consulta-cnpj*`
  - `/api/consulta-cep*`
  - `/notas-fiscais*`
  - `/api/public/notas-fiscais-consumidor*`
- `/` redireciona para `/meus-apps`
- validação mínima:
  - se **não** houver token em cookie `auth-token` **ou** header `Authorization: Bearer ...`
    - páginas: redirect `/login`
    - API: `401 { error: 'Token não encontrado' }`

> Importante: o middleware **não valida JWT**, só exige “existência” do token.

### 5.2) AuthGuard (Client)

Arquivo: `src/presentation/components/auth/AuthGuard.tsx`

- Aguarda `isRehydrated` do store
- Se rota não é pública e sessão é inválida:
  - chama `useAuthStore.logout()` (que chama `POST /api/auth/logout`)
  - `window.location.href = '/login'`

### 5.3) Primeira rota após login

Hoje, após login, a UI sempre manda para:

- **`/meus-apps`**

E essa rota está protegida por `app/dashboard/layout.tsx`:

- `<TopNav />`
- `<AuthGuard>{children}</AuthGuard>`

## 6) Resumo rápido (checklist)

- **UI chama**: `POST /api/auth/login`
- **API interna chama API externa**: login `legacy` ou `multi_empresa`
- **API interna seta cookie httpOnly**: `auth-token`
- **UI salva sessão no Zustand (localStorage)**: `auth-storage`
- **UI navega para**: `/meus-apps`
- **Proteções**:
  - middleware exige token presente
  - `AuthGuard` exige store reidratado + `auth` válido e não expirado
- **Logout**:
  - `POST /api/auth/logout` + limpa store/localStorage + redirect `/login`

---

## 7) Novo fluxo (em análise) — baseado nas imagens (Swagger)

> Fonte: imagens compartilhadas no chat (Swagger UI). Esta seção é **apenas anotação** para guiar a substituição do fluxo atual.

### 7.1) Endpoint de login de identidade (multi-empresa)

- **Endpoint**: `POST /auth/login`
  - o Swagger indica “URL completa típica”: `POST /api/v1/auth/login`
- **Request body**:

```json
{
  "username": "string",
  "password": "string"
}
```

- **Resposta 200 (descrição)**: “Identidade confirmada; retorno com token de identidade e empresas disponíveis.”
- **Resposta 200 (exemplo do Swagger)**:

```json
{
  "identityToken": "string",
  "empresas": [
    {
      "id": "string",
      "nomeFantasia": "string",
      "cnpj": "string",
      "bloqueado": true
    }
  ]
}
```

- **Resposta 401 (descrição)**: “Credenciais inválidas, usuário sem vínculo gestor ou sem empresas ativas”.

### 7.2) Rota descontinuada / removida

- O Swagger deixa explícito que a rota antiga foi removida:
  - `POST /auth/login/usuario-gestor` (**descontinuada/removida**)
  - deve usar **somente** `POST /auth/login`

### 7.3) Passo de “abrir sessão” em uma empresa (troca de tenant)

O Swagger descreve um fluxo em 2 etapas:

1) **Login de identidade** retorna `identityToken` + lista de `empresas`.
2) Para abrir uma sessão em uma empresa específica, o client chama:
   - **Endpoint**: `POST /auth/escolher-empresa`
     - URL completa típica (por analogia do Swagger): `POST /api/v1/auth/escolher-empresa`
   - **Headers**:
     - `Authorization: Bearer <token>` (onde `<token>` é o `identityToken` do login)
   - **Body**:
     - `empresaId` no body
   - **Resposta esperada** (descrita no texto do Swagger):
     - `accessToken` e `refreshToken` **daquela empresa**

> Observação do Swagger: usar o `identityToken` “logo após o login”, ou usar o `accessToken` quando já houver sessão (troca de empresa).

### 7.4) Convites pendentes (mencionado no Swagger)

O Swagger menciona que, para convites pendentes, deve-se chamar:

- `GET /convites/me` com `Authorization: Bearer <token>`
- Também cita ações:
  - `POST /convites/me/{id}/aceitar`
  - ou `POST /convites/me/{id}/recusar`

> A anotação também menciona o `user.id` “de cada item” em convites; precisa confirmar o shape real desses endpoints quando você enviar os contratos.

**Gestão de convites pela empresa (outro contrato):** listar/criar/cancelar/reenviar convites **emitidos** pela empresa usa `GET|POST /convites`, `DELETE /convites/{id}`, etc., com sessão no **contexto da empresa** — ver [CONVITES_ME_VS_EMPRESA.md](./CONVITES_ME_VS_EMPRESA.md) e a UI `/cadastros/convites-gestor`.

---

## 8) Novo fluxo (definido) — hub único `/meus-apps` + convites + estratégia de tokens por aba

### 8.1) Rotas (frontend) definidas

- **Após login** (sempre): **`/meus-apps`** (`LoginForm` faz `router.replace('/meus-apps')`; sem modal de escolha).
- **Hub pós-login**: **`/meus-apps`** — na mesma tela:
  - **Convites pendentes** no topo: UI chama `GET /api/convites/me` (BFF) e exibe cards com aceitar/recusar.
  - **Empresas já vinculadas** abaixo: lista vem do array `empresas` retornado no `POST /api/auth/login`, persistido em `hubEmpresas` no Zustand (não há segundo GET de empresas na página).
- **Rota dedicada `/convites`**: removida; convites não têm página própria.

### 8.2) Endpoints de convites (API externa) — contrato (Swagger)

#### a) Listar convites pendentes do usuário

- `GET /convites/me`
- Requer `Authorization: Bearer <token>` (descrição: “token de identidade ou access de gestor”)
- Respostas:
  - `200`: lista de convites pendentes
  - `401`: não autenticado
  - `404`: utilizador não encontrado

Exemplo (Swagger):

```json
[
  {
    "id": "string",
    "email": "user@example.com",
    "empresaId": "string",
    "nomeEmpresa": "string",
    "perfilGestorId": "string",
    "expiraEm": "string"
  }
]
```

> Observação: `expiraEm` parece string (provavelmente ISO). Confirmar se vem sempre em ISO.

#### b) Aceitar convite pendente

- `POST /convites/me/{id}/aceitar`
- Usa o `id` retornado em `GET /convites/me`
- Requer `Authorization: Bearer <token>` (descrição: “token de identidade ou access de gestor”)
- Respostas:
  - `201`: “Convite aceito e vínculo gestor criado”
  - `400`: convite inválido ou email não coincide
  - `401`: não autenticado

#### c) Recusar convite pendente

- `POST /convites/me/{id}/recusar`
- Usa o `id` retornado em `GET /convites/me`
- Requer `Authorization: Bearer <token>` (descrição: “token de identidade ou access de gestor”)
- Respostas:
  - `204`: convite recusado
  - `400`: convite inválido ou email não coincide
  - `401`: não autenticado

### 8.3) Endpoint “escolher empresa” (API externa) — contrato (Swagger)

- `POST /auth/escolher-empresa` (URL completa típica: `POST /api/v1/auth/escolher-empresa`)
- Header obrigatório: `Authorization: Bearer <token>`
  - aceita **identity token** (pós-login) ou **access token** (troca durante sessão)
- Body:

```json
{
  "empresaId": "string"
}
```

- `200`: “Sessão na empresa selecionada; tokens JWT de acesso e refresh”

Exemplo (Swagger):

```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### 8.4) O que precisa ser feito no frontend para suportar o novo fluxo

#### 8.4.1) Página hub (App Router)

- Rota `app/meus-apps/`:
  - `app/meus-apps/layout.tsx` + `app/meus-apps/page.tsx`
  - feature: `src/presentation/components/features/meus-apps/MeusAppsPage.tsx` — convites (`ConviteCard`) + grid/lista de empresas.
- Feature compartilhada de convites (somente componentes reutilizados):
  - `src/presentation/components/features/convites/components/ConviteCard.tsx`
  - `src/presentation/components/features/convites/types.ts`

#### 8.4.2) Login (identidade) e redirecionamento

- Após login bem-sucedido: **`router.replace('/meus-apps')`**.
- A listagem de convites ocorre **na página Meus Apps** (`GET /api/convites/me` no mount), não no momento do login.
- `meus-apps` é o hub pós-login; o ERP interno continua em `/dashboard` após escolher empresa (ex.: fluxo “Acessar”).

#### 8.4.3) API interna (BFF) para não acoplar a UI na base URL externa

Criar rotas internas no Next para proxy (mantém padrão do projeto):

- `GET /api/convites/me` → chama externo `GET /api/v1/convites/me`
- `POST /api/convites/me/[id]/aceitar` → externo `POST /api/v1/convites/me/{id}/aceitar`
- `POST /api/convites/me/[id]/recusar` → externo `POST /api/v1/convites/me/{id}/recusar`
- `POST /api/auth/escolher-empresa` → externo `POST /api/v1/auth/escolher-empresa`

> Esses endpoints internos devem receber/encaminhar o `Authorization: Bearer ...` vindo do client.

### 8.5) Estratégia de armazenamento de tokens por ABA (multi-empresa) sem quebrar o fluxo antigo

Requisito: **cada empresa em uma aba** (tokens diferentes ao mesmo tempo), e poder **duplicar a aba** mantendo o token da empresa.

#### 8.5.1) Limitação importante

- Cookies (mesmo httpOnly) são **compartilhados** entre abas no mesmo domínio.
- Portanto, **não é possível** manter tokens diferentes “por aba” usando apenas cookies.

#### 8.5.2) Proposta compatível (não quebra o legado)

- **Identity token**:
  - armazenar em **cookie httpOnly** separado (ex.: `auth-identity-token`)
  - uso: **`/meus-apps`** (hub: convites + empresas) e chamadas “pré-empresa” (ex.: escolher empresa)
  - vantagem: mais seguro (não acessível via JS), e é global do usuário (ok ser compartilhado)

- **Access/Refresh token (por empresa / por aba)**:
  - armazenar no **`sessionStorage`** da aba atual, por exemplo:
    - `tab-access-token`
    - `tab-refresh-token`
    - `tab-empresa-id`
  - motivação:
    - `sessionStorage` é isolado por aba
    - ao **duplicar** a aba, a maioria dos browsers copia o `sessionStorage` (mantém token da empresa)
  - observação de segurança:
    - tokens no `sessionStorage` ficam acessíveis via JS → exige cuidado redobrado com XSS.

#### 8.5.3) Como não interferir nas páginas antigas

- Manter o cookie atual `auth-token` e o `useAuthStore` como **legado** para as rotas já existentes.
- A rota **`/meus-apps`** deve usar o token de identidade/sessão gestor para listar convites/empresas; tokens por aba (`sessionStorage`) quando “abrir empresa” e navegar para rotas internas da empresa (evolução futura documentada acima).

> Resultado: o resto do sistema continua funcionando com o `auth-token` atual, enquanto o novo fluxo convive em paralelo.

### 8.6) Etapas sugeridas de desenvolvimento (para implementar com segurança)

#### Etapa 1 — Estrutura de rotas + features

- Manter `app/meus-apps/page.tsx` e `app/meus-apps/layout.tsx`
- Integrar convites na mesma feature Meus Apps (sem rota `app/convites/`)

#### Etapa 2 — BFF (API interna Next) para convites e escolher empresa

- Implementar `/api/convites/me`, `/api/convites/me/[id]/aceitar`, `/api/convites/me/[id]/recusar`
- Implementar `/api/auth/escolher-empresa`
- Implementar DTOs strict (request/response) e mappers (conforme regras de DTO do projeto)

#### Etapa 3 — Auth v2 (identity) + roteamento pós-login

- `LoginForm`: receber `identityToken` + `empresas[]`, persistir no cookie/store, **`router.replace('/meus-apps')`**
- Em `/meus-apps`: carregar convites via BFF e exibir junto com empresas vinculadas

#### Etapa 4 — Tokens por aba (empresa)

- Implementar utilitário/serviço “TabSession” (sessionStorage) para:
  - set/get/clear tokens e empresaId da aba
  - usar em hooks/clients de API das páginas internas da empresa
- Integrar “abrir empresa” na tela `/meus-apps`:
  - ao clicar “Acessar”, chamar `/api/auth/escolher-empresa`
  - salvar tokens no sessionStorage
  - abrir nova aba (se necessário) ou navegar para rota da empresa

#### Etapa 5 — Guard/Middleware segmentado

- Criar guard específico para rotas do novo fluxo (identity/sessionStorage)
- Ajustar `middleware.ts` para não bloquear `/meus-apps` usando apenas o cookie `auth-token` legado.


