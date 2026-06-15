# Documentação Swagger no Jiffy

## 1. Objetivo

Este guia define como documentar endpoints no Swagger/OpenAPI no Jiffy com reaproveitamento de schemas existentes.

## 2. Stack adotada

No Jiffy, a documentação Swagger usa:

1. `zod` para schemas;
2. `@asteasolutions/zod-to-openapi` para registrar schemas e rotas;
3. `OpenAPIRegistry` + `OpenApiGeneratorV3` no arquivo central `docs/swagger/openapi.ts`.

## 3. Princípio principal de reaproveitamento

### 3.1 Input

Para request/body/query/params, reaproveitar validators da camada de aplicação:

- `application/validators`

### 3.2 Output

Para respostas, reaproveitar DTOs/schemas de output:

- DTO validators de saída (`application/dtos/validators`)

Regra prática:

- **input = validator de aplicação**
- **output = DTO (validator de saída)**

Assim, se o schema mudar no código, a documentação acompanha automaticamente.

## 4. Organização por escopo (módulo)

No Jiffy, Swagger é separado por escopo:

1. `docs/swagger/schemas/<escopo>Schemas.ts` para componentes/schemas;
2. `docs/swagger/routes/<escopo>RoutesDocs.ts` para endpoints;
3. registro central em `docs/swagger/openapi.ts`.

Exemplo de escopos: `authentication`, `pessoa`, `cardapio`, `empresa`, `pagamento`.

## 5. Passo a passo para documentar um endpoint

1. identificar validators de input na aplicação;
2. identificar DTO/schema de output;
3. registrar schemas no arquivo `...Schemas.ts` do escopo;
4. registrar rota no arquivo `...RoutesDocs.ts` do escopo;
5. incluir os registradores no `docs/swagger/openapi.ts` se for escopo novo;
6. validar `/docs` localmente.

## 6. Exemplo de registro de schema

```ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  createApiTokenInputValidator,
} from "modules/authentication/application/validators/validators.ts";
import { loginDTOValidator } from "modules/authentication/application/dtos/validators.ts";

export const registerAuthenticationSchemas = (registry: OpenAPIRegistry) => {
  registry.register("CreateApiTokenRequest", createApiTokenInputValidator);
  registry.register("LoginResponse", loginDTOValidator);
};
```

## 7. Exemplo de registro de rota

```ts
registry.registerPath({
  method: "post",
  path: "/auth/api-keys",
  tags: ["Autenticação"],
  summary: "Criar API key",
  request: {
    body: {
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/CreateApiTokenRequest" },
        },
      },
    },
  },
  responses: {
    201: {
      description: "API key criada com sucesso",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/LoginResponse" },
        },
      },
    },
  },
});
```

## 8. Boas práticas

1. evitar duplicar schema manual já existente na aplicação;
2. manter descrição objetiva (`summary`, `description`, `responses`);
3. documentar status de erro relevantes (`400`, `401`, `403`, `404`, `409`);
4. manter tags por contexto para facilitar navegação;
5. separar sempre por escopo/módulo.

## 9. O que evitar

- criar tipo Swagger desconectado do validator real;
- documentar input diferente do que o controller/use case realmente aceita;
- misturar múltiplos escopos no mesmo arquivo de docs;
- usar schemas soltos sem registro no `openapi.ts`.

## 10. Checklist rápido

1. input está vindo de `application/validators`?
2. output está vindo de DTO validator?
3. schemas e rotas foram registrados no escopo correto?
4. `openapi.ts` inclui os registradores necessários?
5. endpoint aparece corretamente em `/docs`?
