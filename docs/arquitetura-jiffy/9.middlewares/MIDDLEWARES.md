# Middlewares na Camada de Apresentação

## 1. O que é um middleware

`Middleware` é um componente que intercepta a requisição antes de chegar ao controller.

No Jiffy, ele é usado para tratar responsabilidades do **meio de transporte** (HTTP), preparando dados para a camada de aplicação.

## 2. Para que serve

Middlewares servem para:

1. traduzir dados do protocolo HTTP para formato interno útil;
2. enriquecer o `request` com contexto já processado;
3. bloquear requisições não autorizadas cedo;
4. aplicar políticas transversais (segurança, rate limit, contexto).

## 3. Tradução HTTP -> aplicação (papel principal)

Exemplos comuns no Jiffy:

### 3.1 Token para contexto de usuário

- ler token do header `Authorization`;
- validar/decodificar token;
- extrair `userId`, `empresaId`, `terminalId`, escopos etc.;
- anexar no `request` para o use case receber contexto pronto.

### 3.2 Arquivo de requisição para formato processável

- receber upload HTTP (`multipart/form-data`);
- transformar para buffer/binário/metadados;
- encaminhar para aplicação em formato entendível.

### 3.3 Permissão de acesso por rota

- verificar se o token permite acesso ao recurso;
- bloquear com `401/403` quando necessário;
- evitar que controller/use case executem sem autorização.

## 4. Regra importante sobre autenticação/token

No Jiffy, **sempre que houver lógica relacionada a token**, o padrão é criar middleware específico para:

1. validar token;
2. decodificar claims;
3. preencher contexto no `request`;
4. interromper requisição inválida antes do controller.

Isso evita duplicação de código de auth nos controllers e padroniza segurança.

## 5. Middlewares existentes no Jiffy (visão geral)

Alguns tipos já usados no projeto:

1. auth/token: `jwt-auth-middleware`, `api-token-middleware`, `combined-auth-middleware`;
2. autorização por papel/perfil: `role-middleware` (quando aplicável);
3. upload: `upload-logo-impressao-middleware`, `upload-xlsx-middleware`;
4. contexto: `correlation-id-middleware`, `set-subdomain`;
5. proteção de rotas: rate limit (`login-rate-limiter`, `convite-rate-limiter`);
6. integração: `webhookSecretMiddleware`;
7. tratamento de erro: `error-middleware`.

## 6. Exemplo correto (token middleware)

```ts
export const makeConfirmEmailMiddleware = () => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await tokenService.verifyConfirmationEmailToken(token);

    req.userId = decoded.userId;
    return next();
  };
};
```

Pontos positivos:

- autenticação resolvida antes do controller;
- `userId` já chega pronto para camada de aplicação;
- regra de transporte/token centralizada em middleware.

## 7. Exemplo incorreto

```ts
export class ConfirmEmailController {
  async confirm(req, res) {
    // controller fazendo parse e decode de token
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = await tokenService.verifyConfirmationEmailToken(token!);

    // regra de permissão também no controller
    if (!decoded.userId) throw new Error("Sem permissão");

    return this.useCase.execute({ userId: decoded.userId });
  }
}
```

Problemas:

- lógica de token espalhada em controllers;
- maior chance de inconsistência de segurança;
- duplicação de código entre rotas.

## 8. O que middleware não deve fazer

- regra central de negócio;
- orquestração completa de caso de uso;
- persistência direta em banco (salvo casos técnicos muito específicos e justificados).

## 9. Checklist rápido para middlewares

1. o middleware está tratando uma preocupação transversal de transporte?
2. em caso de token, valida/decodifica antes do controller?
3. ele apenas prepara contexto e controla acesso, sem regra de negócio?
4. dados úteis para aplicação foram anexados no `request`?
5. o comportamento de erro (`401`, `403`, `400`) está consistente?
