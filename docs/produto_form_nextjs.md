## Fluxo de Cadastro/Edição de Produto (Flutter) e mapa para Next.js

### Visão geral
- `NovoProdutoWidget` orquestra o formulário em **duas etapas** dentro de um `PageView`:
  1. `InformacoesProdutoStepWidget`: dados básicos (nome, unidade, grupo, preço, descrição).
  2. `ConfiguracoesGeraisStepWidget`: flags, seleção de grupos de complementos e impressoras.
- O fluxo serve tanto para **criar** quanto para **editar/copiar** produtos:
  - Quando recebe `produtoRef`, chama `ProdutosGroup.buscarProdutosCall` e pré-preenche os campos.
  - Em modo cópia (`isCopyMode`), limpa nome/descrição mas mantém restante para reaproveitar.

### Etapa 1 – Informações do Produto
- Campos obrigatórios controlados por `TextEditingController` e `Dropdown`:
  - `nome`: texto simples (`TextFormField`).
  - `unidade`: opções fixas `UN | KG | LT` (`FlutterFlowDropDown`).
  - `grupo`: carregado via `GrupoProdutosGroup.buscarGrupoProdutoCall` (offset/limit). Exibido em `DropdownMenu`.
  - `precoVenda`: campo numérico com formatter monetário; validação garante valor > 0 antes de salvar.
  - `descricao`: texto multilinha.
- Botão “Próximo” chama `onNextPressed`, atualiza `selectedPage = 2` e vai para a segunda etapa (sem enviar dados ainda).

### Etapa 2 – Configurações Gerais
- Switches booleanos ligados ao modelo principal:
  - `favorito`, `permiteDesconto`, `permiteAcrescimo`, `abreComplementos`.
- **Grupos de complementos**:
  - Botão abre `MultiSelectDialog`.
  - Antes do modal, faz paginação completa em `GrupoComplementosGroup.buscarGrupoComplementoNomeCall` (`offset`, `limit`, `hasNext`).
  - Seleções renderizam `Chip` removível; IDs ficam em `grupoComplementosIdsList`.
- **Impressoras**:
  - `MultiSelectDialog` reutilizado, abastecido via `ImpressorasGroup.listarImpressorasCall`.
  - Resultado enviado ao pai via `onImpressorasChanged`.
- Rodapé traz botões de “Voltar” (retorna para a etapa 1) e “Salvar” (executa efetivamente o POST/PUT).

### Persistência e chamadas à API
- Antes de salvar, o fluxo converte o preço para float (`functions.brToEUA`).
- **Criação (`ProdutosGroup.criarProdutoCall`)** envia:
  ```json
  {
    "nome": "...",
    "descricao": "...",
    "valor": 0,
    "grupoid": "...",
    "favorito": false,
    "unidade": "UN|KG|LT",
    "complemento": false,
    "acrescimo": false,
    "desconto": false,
    "grupoComplementosIds": ["..."],
    "impressorasIds": ["..."]
  }
  ```
- **Atualização (`ProdutosGroup.updateProdutoCall`)** inclui também `id` e `ativo`, trocando o campo para `gruposComplementosList`.
- Mensagens de sucesso/erro usam `TemporaryMessageService` + `NotifyComponentPuro`.
- Após sucesso navega de volta (`context.pop()` ou rota de produtos no cancelamento).

### Check-list de comportamento equivalente no Next.js
1. **Arquitetura geral**
   - Criar page/client component `ProdutoForm`.
   - Usar `useState` para os campos citados e `useReducer`/`Zod` para validação se preferir.
   - Reproduzir `PageView` com duas etapas (ex.: `Tabs`, `Stepper`, `Carousel`) ou usar `FormWizard`.

2. **Carregamento inicial**
   - Ao montar, se houver `produtoId`:
     - `GET /api/produtos/:id` → preencher estados e listas (`grupoComplementosIds`, `impressorasIds`).
   - Sempre carregar a lista de grupos (`/api/grupos-produtos`) para o dropdown.
   - Buscar complementos/impressoras paginando até `hasNext=false`, reutilizando o pattern usado no Flutter (offset + limit).

3. **Etapa 1 (Next.js)**
   - Inputs controlados (`<input>`, `<textarea>`, `<select>`), todos com validação e comentários em português.
   - Mostrar erro se `precoVenda` <= 0 ao clicar “Próximo”.
   - Guardar estado em um objeto `produtoInfo`.

4. **Etapa 2 (Next.js)**
   - Switches equivalentes: usar `Radix Switch` ou componentes próprios.
   - Multi-seleção:
     - Modal (Radix Dialog ou Headless UI) + listagem com `Checkbox`.
     - Chips removíveis para mostrar selecionados.
   - Impressoras: mesma abordagem, reaproveitando componente `MultiSelect`.

5. **Salvar**
   - `handleSave` escolhe `POST /api/produtos` ou `PUT /api/produtos/:id`.
   - Corpo deve refletir exatamente a estrutura das chamadas Flutter (mesmos nomes de payload).
   - Validar novamente preço, grupo e listas antes de enviar. Exibir toast em PT-BR.
   - Após sucesso, redirecionar para lista de produtos.

6. **Testes sugeridos (React Testing Library)**
   - Renderização das duas etapas e navegação entre elas.
   - Validação do preço (não deixa salvar com zero).
   - Mock de busca de complementos com múltiplas páginas.
   - Seleção e remoção de chips funcionando.
   - Payload correto enviado no `fetch`.

### Estrutura de arquivos recomendada
```
src/
  app/
    produtos/
      novo/
        page.tsx              # Wrapper decide se é criação ou edição
        ProdutoForm.tsx       # Componente principal (wizard em 2 passos)
        InformacoesStep.tsx   # Etapa 1
        ConfiguracoesStep.tsx # Etapa 2 (inclui MultiSelects)
        useProdutoForm.ts     # Hook para estado + efeitos (opcional)
  components/
    MultiSelectDialog.tsx
    ChipsList.tsx
```

Com este documento em mãos, basta instruir a IA/assistente do projeto Next.js a seguir o mesmo contrato de dados, dividir em duas etapas e replicar as validações/APIs aqui descritas.

