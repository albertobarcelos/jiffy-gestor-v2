# Repositories na Arquitetura

## 1. O que é um repository

`Repository` é o componente responsável por acesso a dados persistidos.

No Jiffy, ele é a forma oficial de ler/escrever dados no banco dentro da arquitetura.

## 2. Para que serve

Repository serve para:

1. encapsular operações de persistência;
2. implementar contratos de dados definidos por camadas internas;
3. isolar aplicação/domínio dos detalhes do ORM e do banco;
4. manter a camada de dados centralizada e previsível.

## 3. Relação com portas do domínio

No padrão do Jiffy, o repository normalmente:

1. implementa uma `port`/contrato definido no domínio;
2. recebe entidade;
3. devolve entidade como resultado da operação.

Isso garante desacoplamento e facilita troca de tecnologia.

Regra geral: para operações de CRUD de entidade, o repositório deve receber/devolver entidade.

Exceção: casos específicos sem entidade própria (ex.: relatórios, consultas agregadas e projeções).

## 4. ORM oficial no Jiffy

O ORM oficial do Jiffy é o **Prisma**.

A regra prática é: acesso ao Prisma deve ficar concentrado em implementações de repository (camada de infraestrutura), e não espalhado em controller/use case/domain service.

## 5. Diretriz de modelagem dos métodos

### 5.1 Preferir métodos genéricos

Dar preferência para métodos mais genéricos com parâmetros claros.

Exemplo recomendado:

- `update(entity)`
- `findMany(filters, pagination, sorting)`

Evitar proliferação de métodos hiper específicos como:

- `updateNome`, `updateIdade`, `updateTelefone`;
- `findByEmpresa`, `findByIdade`, `findByStatus`, etc.

Quando necessário, usar filtros no parâmetro em um método mais abrangente.

### 5.2 Nomes comuns no repository

Padrões recomendados:

- `findMany`
- `getById` / `getByIdentifier`
- `create`
- `update`
- `delete`

Opcionalmente:

- `count`
- `exists`
- `upsert` (quando realmente fizer sentido)

## 6. O que o repository não deve fazer

Repository **não** deve:

- aplicar regra de negócio;
- realizar validações de domínio;
- alterar fluxo de negócio com condicionais (`if`) que decidem política do sistema;
- orquestrar caso de uso.

Ele deve ser focado em persistência e recuperação de dados.

## 7. Exemplo correto

```ts
export interface IClienteRepository {
  findMany(filters: ClienteFilters): Promise<Cliente[]>;
  getById(id: string): Promise<Cliente | null>;
  create(cliente: Cliente): Promise<Cliente>;
  update(cliente: Cliente): Promise<Cliente>;
  delete(id: string): Promise<void>;
}
```

## 8. Exemplo incorreto

```ts
export class ClienteRepository {
  async updateNome(id: string, nome: string) {}
  async updateIdade(id: string, idade: number) {}
  async findByEmpresa(empresaId: string) {}
  async findByIdade(idade: number) {}

  async create(cliente: Cliente) {
    if (cliente.idade < 18) {
      throw new Error("Cliente menor de idade não permitido");
    }
    // persistência
  }
}
```

Problemas:

- API de repositório fragmentada e difícil de evoluir;
- regras de negócio vazando para camada de dados;
- baixo reuso e manutenção mais cara.

## 9. Checklist rápido para repositories

1. o repository implementa uma port/contrato interno?
2. acesso ao Prisma está concentrado aqui?
3. métodos estão genéricos e orientados a parâmetros?
4. não há regra de negócio nem validação de domínio?
5. nomes de método seguem padrão consistente (`findMany`, `getById`, `create`, `update`, `delete`)?
