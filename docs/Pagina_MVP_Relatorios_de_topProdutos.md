Você é um desenvolvedor frontend senior especializado em dashboards SaaS modernos para sistemas de PDV e gestão de restaurantes/food service.

Quero que você desenvolva uma página completa chamada:

# Relatório de Produtos Vendidos

Essa página faz parte do sistema Jiffy, um PDV com módulo gestor.

Objetivo da página:
Permitir que o dono do estabelecimento visualize desempenho de produtos vendidos e consiga tomar decisões estratégicas rapidamente.

IMPORTANTE:
Essa primeira versão deve ser um MVP extremamente bem estruturado, moderno, escalável e com ótima UX.

---

# Stack obrigatória

* Next.js
* React
* TypeScript
* TailwindCSS
* shadcn/ui
* Recharts
* TanStack Table

---

# Requisitos visuais

Quero uma interface:

* moderna
* clean
* profissional
* estilo dashboard SaaS premium
* responsiva
* dark mode ready
* excelente hierarquia visual
* foco em leitura rápida

Utilize:

* cards elegantes
* sombras suaves
* bordas arredondadas
* espaçamentos consistentes
* animações sutis
* loading skeleton
* hover states
* tabelas modernas

---

# Estrutura da página

## 1. Header

Criar:

* título da página
* subtítulo estratégico

Exemplo:
"Relatório de Produtos Vendidos"
"Acompanhe performance, tendências e faturamento dos produtos"

---

## 2. Filtros superiores

Criar filtros funcionais:

* período
* categoria
* canal de venda
* busca de produto

Períodos rápidos:

* hoje
* ontem
* últimos 7 dias
* últimos 30 dias
* personalizado

---

# 3. Cards KPI

Criar cards modernos contendo:

## Faturamento total

* valor
* variação percentual

## Quantidade vendida

* total de itens

## Ticket médio

* média por item

## Produto líder

* nome
* quantidade

## Produto em crescimento

* percentual de crescimento

Os cards devem:

* possuir ícones
* possuir destaque visual
* possuir animação leve
* possuir indicador positivo/negativo

---

# 4. Gráfico principal

Criar um gráfico de evolução de vendas.

Objetivo:
Comparar vendas dos produtos ao longo do período.

Usar:

* Recharts
* gráfico de linhas ou área

Permitir:

* selecionar produtos
* mostrar tooltip moderna
* legenda
* responsividade

---

# 5. Gráfico de participação

Criar gráfico:

* pizza/donut

Objetivo:
Mostrar participação das categorias nas vendas.

Exemplo:

* hambúrgueres
* bebidas
* sobremesas
* combos

---

# 6. Tabela principal (parte mais importante)

Criar tabela moderna usando TanStack Table.

Colunas:

* Produto
* Categoria
* Quantidade vendida
* Faturamento
* Ticket médio
* Tendência
* Participação %

Funcionalidades:

* ordenação
* pesquisa
* paginação
* sticky header
* hover
* loading
* empty state
* exportação futura preparada

---

# 7. Tendência visual

Criar indicadores:

* crescimento
* queda
* estabilidade

Utilizar:

* ícones
* cores sutis
* badges

---

# 8. Insights automáticos

Criar uma seção chamada:

"Insights do Gestor"

Exibir insights simulados como:

* produto em crescimento
* produto em queda
* produto com maior faturamento
* categoria dominante

A seção deve parecer preparada para futura integração com IA.

---

# 9. Dados mockados

Criar mocks realistas para restaurante/lanchonete:

* hambúrgueres
* pizzas
* bebidas
* sobremesas
* combos

Os dados devem parecer reais.

---

# 10. Arquitetura

Quero:

* componentes reutilizáveis
* separação clara
* tipagem forte
* código limpo
* boa organização de pastas
* preparado para backend real

Separar:

* components
* hooks
* services
* mocks
* types
* utils

---

# 11. Experiência premium

Adicionar:

* animações suaves
* loading skeleton
* transições
* microinterações
* estados vazios elegantes

---

# 12. Resultado esperado

Quero uma página visualmente impressionante, profissional e com aparência de produto SaaS premium de gestão para food service.

O código deve estar próximo de produção.
