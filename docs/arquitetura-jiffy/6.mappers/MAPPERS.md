# Mappers na Arquitetura

## 1. O que é um mapper

`Mapper` é um componente responsável por **traduzir dados entre formatos diferentes**.

Ele existe para evitar que cada camada conheça detalhes de formato das outras.

## 2. Para que serve

Mapper serve para:

1. transformar dados sem misturar regra de negócio com estrutura técnica;
2. centralizar conversões repetidas em um único lugar;
3. manter contratos claros entre camadas;
4. reduzir acoplamento entre domínio, aplicação e infraestrutura.

## 3. Mapper é multi-camada

Mapper não pertence exclusivamente a uma única camada.  
Ele pode ser usado em diferentes pontos da arquitetura, sempre com responsabilidade de conversão.

No Jiffy, o uso mais comum está entre infraestrutura -> domínio e domínio -> aplicação.

## 4. Principais usos no Jiffy

### 4.1 Traduzir dado bruto do banco para entidade de domínio

Esse é o cenário típico de leitura em repositório:

1. infraestrutura busca o registro (ex.: Prisma row);
2. mapper converte para o formato esperado;
3. entidade é instanciada (normalmente com `fromDatabase`).

Objetivo: manter o domínio sem depender do formato do banco/ORM.

### 4.2 Traduzir entidade de domínio para DTO da aplicação

Esse é o cenário típico de saída:

1. use case recebe/produz entidade;
2. mapper converte entidade para DTO;
3. camada de apresentação responde com contrato estável.

Objetivo: não vazar entidade de domínio como resposta externa.

## 5. Exemplo correto

```ts
export class ProdutoMapper {
  static toEntity(row: ProdutoRow): Produto {
    return Produto.fromDatabase({
      id: row.id,
      nome: row.nome,
      valor: Money.fromDatabase(row.valor),
      // ...
    });
  }

  static toDTO(entity: Produto): ProdutoDTO {
    return {
      id: entity.id!,
      nome: entity.nome,
      valor: entity.valor.toNumber(),
    };
  }
}
```

## 6. Exemplo incorreto

```ts
// controller convertendo formato de banco + regra de domínio + saída
const row = await prisma.produto.findUnique({ where: { id } });
const entity = Produto.fromDatabase(row as any);
return res.json(entity);
```

Problemas:

- conversão espalhada fora do mapper;
- entidade vazando para fora da aplicação;
- controller assumindo responsabilidades de outras camadas.

## 7. Checklist rápido para mappers

1. conversão está centralizada em mapper?
2. domínio está protegido de formato de banco/ORM?
3. DTO de saída está vindo de mapper (e não da entidade direto)?
4. há duplicação de transformação em vários pontos?
5. mapper está convertendo formato sem carregar regra de negócio indevida?
