# Comentários no Código

## 1. Objetivo desta diretriz

Comentários devem ser usados com cuidado para ajudar a leitura, não para esconder código confuso.

## 2. Princípio geral

No Jiffy, a regra é: **código claro primeiro, comentário depois**.

Se a intenção não estiver clara só pelo código, prefira:

1. renomear melhor classes/métodos/variáveis;
2. quebrar blocos grandes em funções menores;
3. refatorar estrutura e fluxo;
4. só então comentar, se ainda necessário.

## 3. Evitar comentários longos

- evitar textos extensos no meio da implementação;
- comentários longos atrapalham escaneabilidade;
- em geral aumentam carga cognitiva durante manutenção.

## 4. Quando comentar

Comente apenas em casos específicos, por exemplo:

1. decisão não óbvia de arquitetura;
2. regra excepcional difícil de inferir só lendo o código;
3. trade-off técnico importante;
4. limitação externa relevante (API de terceiro, bug conhecido, compatibilidade).

## 5. O que não comentar

- não explicar o óbvio;
- não repetir literalmente o que o código já mostra;
- não usar comentário para justificar código mal estruturado.

## 6. Comentários podem mentir

Comentários desatualizam com facilidade.

Quando isso acontece:

1. o comentário passa informação incorreta;
2. o leitor gasta tempo para descobrir o que é verdade;
3. aumenta risco de manutenção errada.

Por isso, menos comentários e mais código expressivo costuma ser mais seguro.

## 7. Impacto na leitura

Comentário em excesso:

1. quebra o fluxo de leitura;
2. aumenta ruído visual;
3. cria carga cognitiva desnecessária.

Use comentário como exceção, não como padrão.

## 8. Checklist rápido

1. este comentário explica algo realmente não óbvio?
2. eu poderia resolver isso com refatoração em vez de comentário?
3. o texto está curto e direto?
4. ele ainda estará verdadeiro daqui a alguns meses?
5. sem esse comentário, o código ficaria realmente difícil de entender?
