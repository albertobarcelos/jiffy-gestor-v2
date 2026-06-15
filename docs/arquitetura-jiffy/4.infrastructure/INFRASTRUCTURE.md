# Camada de Infraestrutura

## 1. O que é a camada de infraestrutura

A camada de infraestrutura é onde ficam as implementações técnicas do sistema.

Ela traduz necessidades da aplicação/domínio para tecnologias concretas, como:

- banco de dados;
- APIs externas;
- filas e mensageria;
- cache;
- arquivos/storage;
- bibliotecas e SDKs de terceiros.

## 2. Para que serve

A infraestrutura serve para:

1. executar operações técnicas fora da regra de negócio;
2. implementar integrações com dependências externas;
3. materializar contratos definidos em camadas internas (`domain` e `application`);
4. manter domínio e aplicação desacoplados de tecnologia específica.

## 3. Repositórios pertencem à infraestrutura

`Repository` é um componente típico dessa camada.

Ele normalmente:

- implementa uma `port`/contrato definido no domínio ou na aplicação;
- faz leitura/escrita em banco;
- converte dados de persistência para entidades/DTOs quando necessário;
- encapsula detalhes de ORM/query/transação.

Exemplo conceitual:

- `IVendaRepository` (contrato interno, pertence ao domínio) -> `VendaPrismaRepository` (implementação na infraestrutura).

## 4. Tipos de serviços que pertencem à infraestrutura

Além de repositórios, é comum ter:

### 4.1 Gateways de integração externa

- envio de e-mail;
- notificações push;
- consumo de API de terceiros;
- webhooks.

### 4.2 Providers técnicos

- cache provider;
- storage provider;
- fila/mensageria provider;
- cliente HTTP padronizado.

### 4.3 Adaptadores de tecnologia

- adaptadores de ORM;
- adaptadores de autenticação/criptografia;
- adaptadores de observabilidade (logs, métricas, tracing).

## 5. Por que implementar ports do domínio ou aplicação nessa camada

A implementação por `ports`/contratos é essencial para:

1. trocar tecnologia com menor impacto (ex.: Prisma -> outro ORM);
2. evitar acoplamento das camadas internas com detalhes técnicos;
3. facilitar testes (mock/fake do contrato sem subir integração real);
4. preservar fronteiras arquiteturais e responsabilidades claras.

## 6. O que não colocar na infraestrutura

- regra central de negócio;
- decisões de domínio (invariantes, políticas de negócio);
- orquestração principal de caso de uso.

Infraestrutura deve focar em **como executar tecnicamente**, não em **o que o negócio decide**.

## 7. Checklist rápido para infraestrutura

1. esta implementação depende de contrato interno (port/interface)?
2. existe vazamento de regra de negócio para dentro do adapter?
3. detalhes de tecnologia estão encapsulados?
4. troca de provider/tecnologia exigiria pouca mudança nas camadas internas?
5. componente está fácil de testar isoladamente?
