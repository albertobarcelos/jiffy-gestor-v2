# Matriz de regressão — sessão multi-aba

Checklist manual após as mudanças de isolamento (URL canônica + refresh map).

## Pré-condições

- Usuário com **≥ 3 empresas** no Meu Jiffy
- Browser limpo ou logout completo antes do teste
- Dev server rodando

## Cenários

| # | Cenário | Passo a passo | Esperado |
|---|---|---|---|
| 1 | Abrir 3 empresas | Hub → abrir A, B e C em abas distintas | Cada aba: URL slug, header e dados da própria empresa |
| 2 | Reload aba A com B e C abertas | Focar A → F5 | A continua A (sem loading infinito; sem virar B/C) |
| 3 | Duplicar aba A | Clique direito → duplicar | URL e UI de A; se token herdado divergisse da URL, rebind silencioso via `escolher-empresa` |
| 4 | Refresh cruzado | Trabalhar em B até access expirar (ou forçar refresh); A ainda aberta | A renova com refresh de A (mapa); UI de A não muda para B |
| 5 | Trocar empresa na mesma aba | Em A, trocar para D pelo seletor | URL e dados passam a D; mapa guarda refresh de D |
| 6 | Meu Jiffy | Em qualquer aba ERP → Meu Jiffy | Hub abre; identity ou access/refresh last; **não** mistura cards |
| 7 | Logout conta | Logout no hub | Limpa identity, tenant, `refresh-token` e `refresh-token-map` |

## Sinais de falha (bug crítico)

- URL de empresa X com nome/dados de empresa Y
- Loading infinito após reload com várias abas
- Refresh de Y aplicado na aba de X (nome troca sem mudar URL)

## Referências

- [6.INVARIANTES_SESSAO_MULTI_ABA.md](../arquitetura-jiffy/5.presentation/6.INVARIANTES_SESSAO_MULTI_ABA.md)
