# Convites: `/api/convites/me` vs gestão na empresa (`/api/convites`)

Dois fluxos distintos coexistem no BFF e na API externa.

## 1) Convites **para o utilizador** (destinatário)

- **BFF:** `GET /api/convites/me` → proxy `GET /api/v1/convites/me`
- **Token:** típico **identity token** ou access de gestor **sem** obrigatoriamente estar a operar “dentro” de uma empresa no mesmo sentido do ERP completo (conforme contrato do backend).
- **Uso na UI:** hub **Meus aplicativos** — lista de convites **pendentes para o e-mail do utilizador**, com aceitar/recusar (`/api/convites/me/:id/aceitar|recusar`).

## 2) Convites **emitidos pela empresa** (gestão)

- **BFF:**
  - `GET|POST /api/convites` → `GET|POST /api/v1/convites`
  - `DELETE /api/convites/:id` → cancelar
  - `POST /api/convites/:id/reenviar` → reenviar / renovar prazo
- **Token:** **access token no contexto da empresa** (JWT com `empresaId` / sessão de tenant), o mesmo tipo exigido por `validateRequest` nas rotas internas do ERP (ex.: cadastros).
- **Uso na UI:** **`/convites-gestor`** — criar convite, listar, cancelar e reenviar convites **da empresa autenticada**.

## Resumo

| Aspeto | `convites/me` | `convites` (raiz) |
|--------|----------------|-------------------|
| Perspectiva | Quem **recebe** o convite | A **empresa** que **envia** / gere convites |
| Página | Hub Meus Apps | Cadastros → Convites gestor |
| Sessão | Identidade / fluxo hub | Sessão **com empresa** (dashboard ERP) |
