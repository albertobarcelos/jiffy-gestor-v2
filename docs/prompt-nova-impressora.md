## Prompt para recriar a tela **Nova Impressora** em Next.js

Você é o GPT-5.1 Codex e deve reconstruir em Next.js (React) a tela de cadastro/edição de impressoras vista em Flutter. Siga exatamente os comportamentos e padrões abaixo.

### Objetivo geral
- Permitir criar ou editar uma impressora.
- Na criação, inicialmente só o **nome da impressora** é definido; a tabela “Config. por Terminal” deve listar todos os terminais disponíveis com valores padrão para Modelo/IP/Porta.
- Cada linha de terminal tem um botão (ícone de lápis) que alterna entre visualizar e editar os campos daquela linha.

### Estrutura de página
- Layout dividido em sidebar (menu) + conteúdo principal.
- Cabeçalho mostra o título: se o campo nome estiver vazio, exibir “Nova Impressora”; caso contrário, exibir o texto digitado.
- Botão **Cancelar**:
  - Se houver histórico de navegação, usar `router.back()`.
  - Caso contrário, navegar para a rota de listagem de impressoras (`/listar-impressoras` ou equivalente).

### Campo principal
- **Nome da Impressora**: `TextField` obrigatório, fundo com cor de destaque (equivalente ao `info` theme).

### Tabela “Config. por Terminal”
- Cabeçalho com colunas: Terminal | Modelo | IP | Porta | Editar.
- Lista deve suportar rolagem com paginação infinita:
  - Page size: 10.
  - Carregar página 0 na montagem.
  - Buscar próxima página quando o scroll chega ao final, enquanto `hasMore` for true.
- Para **nova impressora**:
  - Carregar todos os terminais disponíveis (paginação) via API de lista de terminais.
  - Cada terminal vem com:
    - `nome` do terminal.
    - `modelo` inicialmente vazio; dropdown deve exibir o display correspondente ao valor vindo do backend (fallback “Genérico”).
    - `ip` padrão `192.168.1.100`.
    - `porta` padrão `9100`.
    - `isEditing` inicial `false`.
- Para **edição de impressora existente**:
  - Buscar impressora por ID, depois buscar cada terminal pelo `terminalId` para obter `nome`.
  - Ordenar terminais por nome (case-insensitive).
  - Preencher tabela com `modelo` vindo do backend, `ip`, `porta`, `isEditing=false`.

### Dropdown de Modelo
- Mapas display ↔ DB:
  - Display → DB: `Genérico`→`generico`, `Sunmi Integrada`→`sunmiIntegrada`, `Stone`→`stone`.
  - DB → Display: inverso acima.
- Opções exibidas: `Genérico`, `Sunmi Integrada`, `Stone`.
- Quando o terminal está em modo de visualização, dropdown fica desabilitado; habilita apenas em modo edição daquela linha.

### Campos de IP e Porta
- IP:
  - Input com máscara `###.###.#.###` (apenas dígitos).
  - Habilita somente quando `isEditing=true` na linha.
- Porta:
  - Input numérico, máx. 5 dígitos, sem contador visível.
  - Habilita somente quando `isEditing=true`.

### Botão de edição por linha
- Ícone:
  - Quando `isEditing=false`, exibir lápis (editar).
  - Quando `isEditing=true`, exibir check (confirmar/salvar inline).
- Ao clicar, alterna `isEditing` da linha (não abre modal).
- Hover da linha: aplica cor de fundo levemente diferente e sombra.

### Regras de ordenação
- Sempre manter a lista de terminais ordenada por `nome` (case-insensitive) após carregamentos ou edições.

### Estados e controles
- Variáveis necessárias (por terminal): `id`, `nome`, `modeloController` (valor display), `modelo` (valor DB), `ip`, `porta`, `isEditing`, `isHovering`.
- Controle de scroll: `scrollController` com listener para paginação.
- Flags: `currentPage`, `pageSize=10`, `isLoadingMore`, `hasMoreTerminals`.

### Fluxo de carregamento
1. Na montagem:
   - Se `impressoraId` existir: carregar dados da impressora e seus terminais.
   - Caso contrário: carregar terminais disponíveis (página 0) com defaults.
2. Paginação:
   - Enquanto `hasMoreTerminals` for true, carregar próxima página ao fim do scroll.

### Fluxo de salvamento
1. Obter token de autenticação do `localStorage` (chave `flutter._auth_authentication_token_`), removendo aspas.
2. Montar `formattedDate` em ISO com milissegundos e timezone (`yyyy-MM-ddTHH:mm:ss.SSSZ`).
3. Se **criando** (sem `impressoraId`):
   - Chamar API `criarImpressora` com: `nome`, `modelo`, `conexao`, `ip`, `porta`, `ativo=true`, `dataAtualizacao`, `dataCriacao`, `token`.
   - Recuperar `impressoraId` do retorno; se ausente, notificar erro e abortar.
4. Montar payload de terminais para **atualizar** (usado tanto na criação quanto na edição):
   - Para cada terminal:
     - `terminalId`: id do terminal.
     - `config`:
       - `modelo`: usar mapeamento display→DB do dropdown; fallback `generico`.
       - `ativo`: true.
       - `tipoConexao`: `"ethernet"`.
       - `ip`, `porta`: valores da linha.
5. Chamar API `atualizarImpressora` com `idimpressora`, `nome`, `dataAtualizacao`, `terminais`, `token`.
6. Em caso de sucesso: mostrar notificação de sucesso e navegar de volta (pop ou rota de listagem). Em erro: notificar com código HTTP.

### Notificações
- Usar componente de notificação para sucesso/erro (substituir por toaster compatível no Next.js).

### Estilo e temas
- Seguir cores do tema: fundo principal, `info` para campos, `primary` para botões.
- Borda arredondada em inputs (8px) e containers (10px).
- Títulos com fonte destaque (equivalente a `GoogleFonts.exo` bold).

### Considerações de UX
- Desfocar campos ao tocar fora.
- Loading ao paginar deve exibir indicador enquanto `isLoadingMore` for true.
- Quando não houver mais terminais, não renderizar loader extra.

### APIs esperadas (adaptar para Next.js)
- `ListarTerminaisCall`: parâmetros `token`, `limit`, `offset`; retorna lista + flag `hasNext`.
- `BuscarImpressoraIdCall`: `idimpressora`, `token`; retorna impressora com `terminaisConfig`.
- `BuscarTerminalIdCall`: `idterminal`, `token`; retorna dados do terminal (inclui `nome`).
- `CriarImpressoraCall`: cria e retorna `id`.
- `AtualizarImpressoraCall`: recebe `idimpressora`, `nome`, `dataAtualizacao`, `terminais` (payload acima).

### Responsividade e acessibilidade
- Lista deve ser scrollável dentro do painel; manter cabeçalho fixo no container.
- Inputs com labels/hints claros.
- Ícones com `aria-label` (ex.: “Editar terminal”, “Confirmar edição”).

### O que entregar (Next.js)
- Página React (Next 13/14, app router) que reproduz o comportamento descrito.
- Hooks para estado, efeitos de carregamento e paginação.
- Componentes:
  - Sidebar (mockável).
  - Header com título dinâmico e botão Cancelar.
  - Campo Nome da Impressora.
  - Tabela de terminais com paginação infinita, edição inline e validações simples.
  - Botão “Salvar Todos os Dados” que executa fluxo de criação/atualização.
- Usar fetch/axios (sem libs desnecessárias) e masks básicas para IP/porta.

