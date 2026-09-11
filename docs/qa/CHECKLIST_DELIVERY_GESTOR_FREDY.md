# Checklist QA — Delivery (Gestor + Fredy)

**Branch:** `developer`  
**Superfícies:** Gestor (Chrome/web) e Fredy (app Windows / Jiffy Flow)  
**Objetivo:** validar o fluxo operacional de delivery de ponta a ponta, incluindo o que mudou nesta entrega.

Marque cada item com **OK**, **Falha** ou **N/A**. Anote empresa, ambiente, número do pedido e print/vídeo em caso de falha.

---

## 0. Pré-requisitos

- [ ] Loja com **delivery ativo** (hub / configurações do delivery).
- [ ] Pelo menos **um menu** com produtos e fotos do cardápio.
- [ ] **Área de cobertura** e taxas automáticas configuradas (raio / zonas).
- [ ] **Taxas de entrega** cadastradas no Gestor (além da automática).
- [ ] **Entregadores** cadastrados.
- [ ] **Impressoras** vinculadas no PC de teste (expedição + produção, se houver).
- [ ] Agente **Jiffy Print** instalado e aberto no PC (quando for testar cupom).
- [ ] Cliente de teste com telefone real (11 dígitos, DDD + número).
- [ ] Endereço de teste **dentro** da cobertura e outro **fora**.
- [ ] Contato WhatsApp com número visível **e** um contato só com nome (sem número no cabeçalho).

**Ambientes a executar (repetir os fluxos críticos nos dois):**

| Superfície | Como entrar | Quadro |
|---|---|---|
| **Gestor** | Browser → módulo Pedidos | `/pedidos` com TopNav |
| **Fredy** | App Windows (Tauri) | kiosk, sem TopNav do ERP |

---

## 1. Matriz Gestor × Fredy (o que tem de ser diferente)

Use isto como oráculo. Se o comportamento for igual nos dois, é bug.

| Comportamento | Gestor | Fredy | Resultado |
|---|---|---|---|
| Chrome (menu ERP / TopNav) | Visível | Oculto | [ ] |
| Modo do quadro | Toggle **Vendas / Delivery** | Sempre **Delivery** | [ ] |
| Visualização | Só **Quadro** | **Quadro / Operação / Lista** | [ ] |
| Colunas delivery | Todas visíveis | Padrão: esconde **Novos pedidos** e **Com NF** (dá para ligar no ícone Colunas) | [ ] |
| Menu Colunas | Botão com texto “Colunas” | Ícone discreto **ao lado da busca** | [ ] |
| Busca | “Buscar pedido” | “Código, cliente ou telefone” | [ ] |
| Filtro de data “hoje” | Dia civil | **Dia operacional** da loja | [ ] |
| WhatsApp + F2 | Não existe | Painel lateral + atalho F2 | [ ] |
| Minimizar o app | N/A | Bolha + bandeja **e** botão na barra de tarefas | [ ] |

---

## 2. Quadro — smoke (os dois)

### 2.1 Gestor

- [ ] Abrir Pedidos no modo **Delivery**.
- [ ] Quadro mostra as etapas: Novos, Em preparo, Pronto, Em rota, Finalizadas, Pendente emissão, Com NF, Rejeitadas (conforme dados).
- [ ] Toggle para modo **Vendas** (fiscal) e voltar para Delivery **sem perder** a loja.
- [ ] Busca por código, nome e telefone encontra o pedido.
- [ ] Atualizar (ícone refresh) recarrega a lista.
- [ ] Novo pedido (botão +) abre o lançamento.

### 2.2 Fredy

- [ ] Abrir o app logado na mesma loja.
- [ ] Não aparece TopNav do Gestor.
- [ ] Modos **Quadro / Operação / Lista** funcionam e a preferência sobrevive a reabrir o app.
- [ ] Ícone **Colunas** (ao lado da busca) liga/desliga etapas; o quadro nunca fica vazio.
- [ ] Reexibir **Novos pedidos** e confirmar que pedidos novos aparecem.
- [ ] Minimizar: bolha na tela, ícone na bandeja **e** o Fredy continua na barra de tarefas.
- [ ] Restaurar pelo ícone da barra, pela bolha e pela bandeja.

---

## 3. Novo pedido — Entrega (Gestor)

Passos: **1 Produtos → 2 Informações → 3 Pagamento**.

### 3.1 Catálogo (passo 1)

- [ ] Grupos vazios não aparecem.
- [ ] Foto do produto é a do **menu** (não uma foto antiga/desatualizada do cadastro, se forem diferentes).
- [ ] Busca por nome encontra o item.
- [ ] Quantidade, complemento e observação de linha funcionam.
- [ ] Não dá para avançar com carrinho vazio.
- [ ] Voltar do passo 2 **mantém** o carrinho.

### 3.2 Cliente e endereço (passo 2)

- [ ] Tipo de atendimento: **Entrega** / **Retirada**.
- [ ] Entrega: **não** avança só com telefone avulso — o cliente precisa estar **cadastrado nesta empresa**.
- [ ] Busca por telefone (11 dígitos) encontra cliente existente (“Cliente encontrado”).
- [ ] Telefone com menos de 11 dígitos no delivery **não** dispara busca completa.
- [ ] Cadastro rápido (quando não existe): nome + confirmar; telefone preenchido; depois o cliente fica vinculado.
- [ ] Sem cadastro nesta empresa: **não** lista endereços.
- [ ] Com cliente cadastrado: lista moradas; dá para selecionar, editar, excluir e **adicionar novo endereço**.
- [ ] Novo endereço exige geolocalização (mapa / pin). Sem geo, não cotar taxa automática.
- [ ] Endereço **dentro** da cobertura: tempo previsto visível no cartão (ex.: ~45 min) **não é a taxa**.
- [ ] Endereço **fora** da cobertura: taxa automática indica **fora da cobertura**; dá para escolher outra taxa ou não avançar conforme regra.
- [ ] Tempo previsto (select 30/45/…) é independente da taxa.

### 3.3 Taxa automática (passo 2) — regressão crítica

Com endereço selecionado e taxa = **Automática**:

- [ ] Enquanto calcula: select mostra **Automática (calculando…)**.
- [ ] Sucesso: **Automática (R$ X,XX)** e o valor entra no total do pagamento.
- [ ] Falha / timeout: **Automática (não calculou)** + texto “A cotação demorou ou falhou…”.
- [ ] Botão **Buscar de novo** aparece ao lado de “Taxa de entrega”, gira durante o recálculo e tenta de novo.
- [ ] Após “Buscar de novo”, ou vem o R$ ou permanece “não calculou”.
- [ ] Com “não calculou”, **não** avança para Pagamento até escolher **outra taxa** ou **Sem taxa**, ou até a automática funcionar.
- [ ] Trocar para taxa de catálogo ou Sem taxa **libera** o passo 3.
- [ ] Voltar de Pagamento para Informações **não** recalcula a taxa sozinho (reusa o valor).
- [ ] Se o endereço não tem localização: toast ao recotar (“não tem localização”).

### 3.4 Pagamento (passo 3)

- [ ] Total = produtos + taxa (quando automática/catálogo).
- [ ] Opção **Cobrar no entregador** (pedido fica em aberto).
- [ ] Opção **Já pago** (registrar PIX / dinheiro / cartão).
- [ ] Cores das formas: PIX, cartão e stepper consistentes (não “tudo roxo/cinza igual”).
- [ ] Troco só em dinheiro; valor recebido insuficiente bloqueia finalizar.
- [ ] Confirmar gera pedido no quadro (Novos ou Em preparo, conforme config).
- [ ] Cupom(s) saem se impressora estiver vinculada; se não houver vínculo no PC, aviso claro (não silêncio).

### 3.5 Retirada (Gestor)

- [ ] Tipo **Retirada**: some endereço, taxa e entregador.
- [ ] Cliente ainda pode ser informado.
- [ ] Pedido entra no quadro sem exigir despacho com motoboy.

---

## 4. Novo pedido — Fredy / WhatsApp (F2)

### 4.1 Telefone da conversa

- [ ] Conversa com número no JID/`+55`: o painel mostra o telefone mascarado `(DD) 9XXXX-XXXX` (DDI 55 **não** vai para o campo).
- [ ] Contato **só com nome** (WhatsApp LID): **não** copiar telefone de outra conversa da lista. Sem número até abrir **Dados do contato**.
- [ ] Abrir Dados do contato uma vez: captura o número da **conversa atual** (nome bate) e o F2 preenche mesmo depois de fechar o drawer.
- [ ] Trocar de conversa: o painel troca cliente/telefone; não mistura com a conversa anterior.

### 4.2 Cadastro rápido no painel

- [ ] Cliente não cadastrado: Buscar cliente → cadastro rápido (nome + Confirmar), telefone da conversa **somente leitura**.
- [ ] Nome do chat pode vir pré-preenchido.
- [ ] Depois do cadastro, o cliente aparece como vinculado.

### 4.3 F2 — lançamento

- [ ] `+ Novo pedido (F2)` abre o mesmo fluxo de 3 passos, já em **Entrega**, com telefone preenchido se existir.
- [ ] Catálogo, endereço, taxa e pagamento iguais ao Gestor (reexecutar 3.1–3.4 no Fredy).
- [ ] Fechar no meio (voltar ao WhatsApp): o botão vira **Continuar pedido (F2)** e o rascunho volta (produtos, cliente, endereço, taxa).
- [ ] Confirmar o pedido **apaga** o rascunho daquela conversa.
- [ ] Descartar na confirmação de saída **apaga** o rascunho.
- [ ] F2 numa **outra** conversa não reabre o rascunho da primeira.

### 4.4 Painel — pedidos de hoje

- [ ] Com telefone da conversa, lista os **pedidos de delivery de hoje** daquele cliente (cards iguais ao kanban).
- [ ] No card do painel: avançar etapa, reimprimir, entregador, observação, endereço, ver, editar produtos, detalhes.
- [ ] Cards do painel **não** arrastam (não há DnD).
- [ ] Abrir diálogo do card (entregador / endereço / detalhes) **não** quebra o WhatsApp Web (webview não some / não congela).
- [ ] Pedido criado pelo F2 aparece no painel **sem** precisar recarregar o app.

---

## 5. Operação do pedido no quadro (os dois)

Colunas operacionais: **Novos → Em preparo → Pronto → Em rota → Finalizadas**.

### 5.1 Avançar

- [ ] Botão avançar em cada etapa, com rótulo coerente (Iniciar preparo / Marcar pronto / Despachar / Finalizar).
- [ ] Arrastar o card entre as 4 colunas operacionais (no quadro, não no painel WhatsApp).
- [ ] **Entrega** para Em rota: **exige entregador**. Sem entregador, abre o painel para atribuir — não despacha no vazio.
- [ ] **Retirada** até Em rota / retirada: **não** exige entregador.
- [ ] Em rota → Finalizadas: se a cobrança está em aberto, pede confirmação de pagamento **antes** de finalizar.
- [ ] Pedido já pago (F2/Gestor “Já pago”) finaliza sem essa trava.
- [ ] Card não some / não duplica ao avançar. Atualizar a lista mantém a etapa certa.

### 5.2 Ações do card

- [ ] **Entregador:** atribuir, trocar, ver nome no card.
- [ ] **Observação:** gravar e reabrir mostra o texto.
- [ ] **Endereço:** ver / alterar (enquanto a etapa permitir).
- [ ] **Editar produtos:** só em Novos, Em preparo e Pronto. Em rota **bloqueia**.
- [ ] **Detalhes / quick view:** cliente, itens, taxa, pagamento, endereço.
- [ ] **Reimprimir:** dispara o mesmo layout da impressão automática.
- [ ] Abrir detalhes e voltar ao quadro **não** zera entregador nem etapa.

### 5.3 Detalhe do pedido

- [ ] Aba/visão única mostra itens, totais, taxa, forma de pagamento e entrega.
- [ ] Entregador do card aparece mesmo se o GET do detalhe atrasar/falhar.
- [ ] Etapa no detalhe bate com o quadro (não voltar para “Novos” à toa).
- [ ] Pagamento em aberto: dá para registrar depois (Gestor).
- [ ] Cancelar pedido (quando permitido) some do operacional / vai para o destino certo.

---

## 6. Impressão

Executar no PC com Jiffy Print + impressora vinculada.

- [ ] Ao **criar** o pedido: cupom(s) conforme preferências (expedição / produção).
- [ ] Ao **avançar** etapa (se a loja imprime na transição): cupom sai; não imprime duas vezes o mesmo job.
- [ ] **Reimprimir** no card (Gestor, Fredy quadro e painel WhatsApp).
- [ ] Várias estações: cupons em paralelo (não travar um até o outro acabar).
- [ ] Sem impressora física vinculada: mensagem de vínculo, não “sucesso falso”.
- [ ] Modo gráfico vs texto (se a loja tiver os dois): cupom legível, sem cortar logo/itens.

---

## 7. Pedido que nasce no cardápio (mesmo quadro)

- [ ] Pedido pelo cardápio público cai em **Novos** (ou etapa configurada) no Gestor **e** no Fredy.
- [ ] Cliente/endereço/taxa do cardápio batem com o detalhe.
- [ ] Operação (avançar, entregador, imprimir, finalizar) igual a pedido lançado no Gestor.
- [ ] WhatsApp do cliente: se o telefone for o mesmo, o painel do Fredy lista esse pedido em “hoje”.

---

## 8. Taxas cadastradas (Gestor → lançamento)

- [ ] Criar taxa nova em Cadastros → Taxas: toast de sucesso; a lista atualiza na hora.
- [ ] Erro ao salvar: toast de erro, **não** tela em branco / exception.
- [ ] Ativar / desativar / excluir atualiza a lista.
- [ ] Abrir Novo Pedido **em seguida**: a taxa nova aparece no select (não fica cache de 5 min escondendo).

---

## 9. Fiscal (amostra no delivery)

Não é o foco, mas quebra operação se falhar.

- [ ] Emitir NFC-e / NF a partir do card (quando a loja emite).
- [ ] Coluna Pendente emissão / Com NF / Rejeitadas se comportam.
- [ ] Fredy: colunas fiscais só aparecem se o operador **ligar** em Colunas.
- [ ] Reimprimir cupom **não** reemite nota.

---

## 10. Casos negativos (obrigatórios)

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| N1 | Entrega sem cliente cadastrado na empresa | Bloqueia avançar; pede cadastro | [ ] |
| N2 | Entrega sem endereço | Bloqueia | [ ] |
| N3 | Endereço sem geo + taxa automática | Não calcula; recotar avisa | [ ] |
| N4 | Taxa automática em timeout | “não calculou” + Buscar de novo | [ ] |
| N5 | Fora da cobertura | “fora da cobertura”; não afirma taxa | [ ] |
| N6 | Despachar entrega sem motoboy | Painel de entregador, não avança | [ ] |
| N7 | Finalizar com cobrança em aberto | Pede confirmar pagamento | [ ] |
| N8 | Editar produtos em Em rota | Bloqueado | [ ] |
| N9 | Contato WhatsApp só com nome, sem Dados do contato | Sem telefone (não pega o da lista) | [ ] |
| N10 | F2, voltar, F2 de novo na mesma conversa | Continua o rascunho | [ ] |
| N11 | Crash / fechar Fredy no meio do F2 | Rascunho da conversa ainda existe ao reabrir | [ ] |
| N12 | Trocar de conversa no WhatsApp com rascunho na anterior | Rascunhos isolados por conversa | [ ] |

---

## 11. Consistência Gestor × Fredy (mesmo pedido)

Criar **um** pedido no Gestor e operar no Fredy (e o inverso).

- [ ] Aparece nos dois quadros (respeitando colunas ocultas no Fredy).
- [ ] Avançar no Gestor reflete no Fredy (após refresh/poll).
- [ ] Avançar no Fredy reflete no Gestor.
- [ ] Entregador atribuído num lado aparece no outro.
- [ ] Reimpressão e detalhe mostram os mesmos itens e a mesma taxa.
- [ ] Pedido F2 do Fredy abre no Gestor com cliente, endereço e pagamento corretos.

---

## 12. Critérios para reprovar a build

Qualquer um destes é **bloqueante**:

1. Pedido delivery **sem cliente cadastrado** na empresa consegue ser concluído.
2. Taxa automática fica em “Automática” sem valor, **sem** “não calculou” e **sem** Buscar de novo.
3. F2 / painel WhatsApp preenche telefone de **outra** conversa.
4. Despacho de entrega **sem** entregador.
5. Finalizar com cobrança em aberto **sem** confirmação.
6. Pedido some, duplica ou volta de etapa sozinho no quadro.
7. Impressão afirma sucesso sem evidência / sem aviso de impressora.
8. Fredy some da barra de tarefas ao minimizar (regressão da bolha).

---

## 13. Evidências pedidas ao QA

Por falha: superfície (Gestor/Fredy), loja, nº do pedido, etapa, print da tela, e se possível o horário.  
No caso de taxa: se mostrou calculando / não calculou / R$.  
No caso de WhatsApp: se o contato tinha número no cabeçalho ou só nome.
