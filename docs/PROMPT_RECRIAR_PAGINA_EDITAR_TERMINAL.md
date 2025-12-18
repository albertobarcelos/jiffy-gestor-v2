# Prompt para Recriar Página de Edição de Terminal em NextJS

## 📋 Contexto e Análise da Página Original

### Observação Importante
**Apesar do nome do arquivo ser `adicionar_terminal_widget.dart`, esta página é utilizada APENAS para EDIÇÃO de terminais existentes.** A lógica de criação de novos terminais não está implementada (apenas comentários indicando que seria necessário implementar).

### Estrutura da Página
A página é um modal/dialog que exibe um formulário para editar informações de um terminal PDV. Ela possui duas seções principais:
1. **Informações Gerais** - Dados básicos do terminal
2. **Preferências do Terminal** - Configurações de compartilhamento e impressora

---

## 🎨 Estrutura Visual e Layout

### Container Principal
- **Largura**: 60% da largura da tela (`width: 0.6`)
- **Background**: Cor `info` do tema
- **Border Radius**: 20px
- **Padding**: 30px em todos os lados
- **Padding externo**: 80px top e bottom
- **Box Shadow**: Sombra suave (blur: 4px, offset: 0,2)
- **Scroll**: SingleChildScrollView para permitir scroll quando necessário

### Cabeçalho
- **Título**: "Editar Terminal" (sempre, pois é apenas edição)
- **Subtítulo**: "Atualize os dados do Terminal PDV"
- **Botão Fechar**: Ícone de fechar (X) no canto superior direito
- **Fonte do título**: Google Fonts "Exo", cor primária, peso bold
- **Fonte do subtítulo**: Google Fonts "Nunito", cor cinza (#57636C com opacidade)

### Divisores
- Linha divisória entre seções (height: 1px, thickness: 0.6px, cor: #B9CCD8)

---

## 📝 Seção 1: Informações Gerais

### Cabeçalho da Seção
- **Texto**: "Informações Gerais"
- **Fonte**: Google Fonts "Nunito", bold, 16px, cor primária

### Exibição do Nome do Terminal (Header Visual)
- **Ícone**: Ícone de celular (`FFIcons.kmobilePhone`) em círculo
- **Cor do círculo**: `customColor2` do tema
- **Tamanho do círculo**: 40x40px
- **Texto**: Exibe o nome do terminal ou "Nome do Terminal" se vazio
- **Fonte**: Google Fonts "Nunito", semibold (w600), 16px

### Campos do Formulário

#### 1. Nome do Terminal
- **Tipo**: TextFormField editável
- **Label**: "Nome do Terminal"
- **Placeholder**: "Digite o nome do Terminal"
- **Validação**: Obrigatório (não pode estar vazio)
- **Capitalização**: TextCapitalization.sentences (primeira letra maiúscula)
- **Estilo**: 
  - Fonte: Google Fonts "Nunito", semibold (w600)
  - Background: Cor `info` do tema
  - Border: Cinza (#CCCCCC), 1px, radius 8px
  - Padding interno: 16px

#### 2. Modelo do Dispositivo
- **Tipo**: TextFormField **READONLY** (somente leitura)
- **Label**: "Modelo do Dispositivo"
- **Placeholder**: "Digite o modelo do dispositivo"
- **Comportamento**: Campo não editável pelo usuário
- **Layout**: Lado a lado com "Versão APK" (usando Row com Expanded)

#### 3. Versão APK
- **Tipo**: TextFormField **READONLY** (somente leitura)
- **Label**: "Versão APK"
- **Placeholder**: "Digite a versão do APK"
- **Comportamento**: Campo não editável pelo usuário
- **Layout**: Lado a lado com "Modelo do Dispositivo" (usando Row com Expanded)
- **Espaçamento**: 16px entre os dois campos

**Nota**: Os campos "Modelo do Dispositivo" e "Versão APK" são preenchidos automaticamente pela API e não podem ser editados pelo usuário.

---

## ⚙️ Seção 2: Preferências do Terminal

### Cabeçalho da Seção
- **Texto**: "Preferências do Terminal"
- **Fonte**: Google Fonts "Nunito", bold, 14px, cor secundária

### Layout da Seção
- **Estrutura**: Row com dois Expanded (flex: 1)
- **Espaçamento**: 24px entre os dois elementos

#### 1. Switch de Compartilhamento (Lado Esquerdo)
- **Componente**: SwitchListTile.adaptive
- **Título**: "Compartilhamento"
- **Subtítulo**: "Habilita o compartilhamento de mesas"
- **Fonte do título**: Google Fonts "Exo", semibold (w600), 14px
- **Fonte do subtítulo**: Google Fonts "Nunito", labelMedium
- **Cor de fundo do tile**: #EEEEF5 (com opacidade)
- **Cor ativa**: Cor `info` do tema
- **Cor da trilha ativa**: Cor `accent1` do tema
- **Posição do switch**: Trailing (direita)
- **Border radius**: 8px
- **Estado**: Controlado por `compartilhaValue`

##### Mensagem de Aviso (Condicional)
**IMPORTANTE**: Quando `compartilhaValue === true`, exibir um Container abaixo do switch com:
- **Background**: #FFF9C4 (amarelo claro)
- **Border**: #FFD54F (amarelo), 1px, radius 8px
- **Padding**: 12px horizontal, 8px vertical
- **Texto**: "Ao marcar o compartilhamento, este terminal só funcionará com internet."
- **Fonte**: Google Fonts "Nunito", semibold (w500), 18px
- **Cor**: Cor `warning` do tema
- **Comportamento**: Aparece/desaparece dinamicamente baseado no estado do switch

#### 2. Dropdown de Impressora de Finalização (Lado Direito)
- **Componente**: DropdownMenu (ou Select no NextJS)
- **Label**: "Impressora de Finalização"
- **Altura do menu**: 250px
- **Filtro**: Desabilitado (enableFilter: false)
- **Estado de loading**: Exibir CircularProgressIndicator enquanto carrega
- **Dados**: Lista todas as impressoras disponíveis
- **Formato dos itens**:
  - **Ícone**: Ícone de impressora (Icons.print) na cor primária
  - **Value**: ID da impressora (string)
  - **Label**: Nome da impressora
  - **Fallback**: Se não houver nome, exibir "Sem nome"

---

## 🔌 Integrações de API

### Base URL
Todas as APIs usam a base: `${BASE_API_URL}/preferencias`

### Headers Padrão
```json
{
  "Content-Type": "application/json",
  "accept": "application/json",
  "Authorization": "Bearer {token}"
}
```

### 1. Buscar Lista de Impressoras
**Endpoint**: `GET /preferencias/impressoras`

**Parâmetros de Query**:
- `limit`: 50 (máximo por página)
- `offset`: número da página * 50

**Comportamento**:
- Fazer paginação automática para buscar TODAS as impressoras
- Loop enquanto `recebidas.length >= porPagina`
- Acumular todas as impressoras em uma lista
- Parar quando receber menos itens que o limite

**Resposta**:
```json
{
  "items": [
    {
      "id": "string",
      "nome": "string",
      ...
    }
  ],
  "count": number,
  "hasNext": boolean,
  "totalPages": number
}
```

**Extrair**: `response.items` (array de impressoras)

**Estado de Loading**: 
- Iniciar com `loadingImpressoras = true`
- Definir como `false` após carregar todas as impressoras

### 2. Buscar Detalhes do Terminal
**Endpoint**: `GET /preferencias/terminais/{terminalId}`

**Parâmetros**:
- `idterminal`: ID do terminal (vem do prop/query param)

**Resposta**:
```json
{
  "id": "string",
  "nome": "string",
  "modeloDispositivo": "string",
  "versaoApk": "string",
  "bloqueado": boolean,
  "serieFiscal": "string",
  "numeroNFCe": "string",
  "ipServidor": "string",
  "impressoraId": "string"
}
```

**Mapeamento para o formulário**:
- `nome` → campo Nome do Terminal
- `modeloDispositivo` → campo Modelo do Dispositivo (readonly)
- `versaoApk` → campo Versão APK (readonly)
- `bloqueado` → `statusTerminalValue = !bloqueado` (invertido: false = ativo)
- `serieFiscal` → campo Série Fiscal (se existir no formulário)
- `numeroNFCe` → campo Número NFCe (se existir no formulário)
- `ipServidor` → campo IP Servidor (se existir no formulário)
- `impressoraId` → selecionar no dropdown de impressora

### 3. Buscar Preferências do Terminal
**Endpoint**: `GET /preferencias/preferencias-terminal/{terminalId}`

**Parâmetros**:
- `idterminal`: ID do terminal

**Resposta**:
```json
{
  "terminalId": "string",
  "empresaId": "string",
  "impressoraFinalizacao": {
    "id": "string",
    "name": "string"
  },
  "compartilharMesas": boolean
}
```

**Mapeamento**:
- `compartilharMesas` → `compartilhaValue`
- `impressoraFinalizacao.id` → `impressoraSelecionadaId`
- `impressoraFinalizacao.name` → texto do campo de busca (se houver)

**Ordem de Execução**:
1. Primeiro buscar detalhes do terminal
2. Depois buscar preferências do terminal
3. Atualizar estado do formulário com ambos os dados

### 4. Atualizar Terminal
**Endpoint**: `PATCH /preferencias/terminais/{id}`

**Método**: PATCH

**Body**:
```json
{
  "nome": "string",
  "modeloDispositivo": "string",
  "versaoApk": "string",
  "bloqueado": boolean
}
```

**Observações**:
- `bloqueado` deve ser o inverso de `statusTerminalValue`
- Se `statusTerminalValue === true` (ativo), então `bloqueado = false`
- Campos opcionais podem ser omitidos se vazios

### 5. Atualizar Preferências do Terminal
**Endpoint**: `PUT /preferencias/preferencias-terminal`

**Método**: PUT

**Body**:
```json
{
  "terminaisId": "string",
  "fields": {
    "impressoraFinalizacaoId": "string",
    "compartilharMesas": boolean
  }
}
```

**Observações**:
- `fields` só deve ser incluído se houver valores para atualizar
- `impressoraFinalizacaoId` pode ser null/undefined
- `compartilharMesas` pode ser null/undefined

**Ordem de Execução no Submit**:
1. Primeiro chamar "Atualizar Terminal"
2. Se sucesso, chamar "Atualizar Preferências do Terminal"
3. Se ambas sucederem, fechar o modal e retornar `true`
4. Se qualquer uma falhar, fechar o modal e retornar `false`

---

## 🔄 Fluxo de Dados e Estados

### Estados Necessários
```typescript
interface TerminalFormState {
  // Campos do formulário
  nomeTerminal: string;
  modeloDispositivo: string; // readonly
  versaoApk: string; // readonly
  statusTerminal: boolean; // true = ativo, false = bloqueado
  compartilhaValue: boolean;
  impressoraSelecionadaId: string | null;
  
  // Estados de UI
  loadingImpressoras: boolean;
  impressoras: Array<{id: string, nome: string}>;
  isSubmitting: boolean;
}
```

### Inicialização
1. Ao montar o componente:
   - Verificar se há `terminalId` na URL/query params
   - Se houver, definir modo de edição
   - Iniciar carregamento de impressoras (paginação completa)
   - Se modo edição, carregar detalhes do terminal e preferências

### Carregamento de Dados
**Sequência**:
1. `loadingImpressoras = true`
2. Buscar todas as impressoras (loop de paginação)
3. `loadingImpressoras = false`
4. Se modo edição:
   - Buscar detalhes do terminal
   - Buscar preferências do terminal
   - Preencher formulário

### Validação
- **Nome do Terminal**: Obrigatório (não pode estar vazio)
- Outros campos readonly não precisam validação

### Submit
1. Validar formulário
2. Se válido:
   - `isSubmitting = true`
   - Chamar API de atualizar terminal
   - Se sucesso, chamar API de atualizar preferências
   - Se ambas sucederem: fechar modal e retornar sucesso
   - Se falhar: fechar modal e retornar erro
   - `isSubmitting = false`

---

## 🎯 Componentes NextJS Necessários

### 1. Modal/Dialog Component
- Usar componente de modal do seu design system (ex: Radix UI Dialog, Headless UI, ou custom)
- Deve ter overlay escuro
- Deve ter botão de fechar
- Deve ser fechável ao clicar fora ou pressionar ESC

### 2. Form Component
- Usar biblioteca de formulários (React Hook Form recomendado)
- Validação com Zod ou Yup
- Gerenciamento de estado de erro

### 3. Input Components
- Input de texto estilizado
- Input readonly (desabilitado visualmente)
- Switch/Toggle component
- Select/Dropdown component

### 4. Loading States
- Spinner/CircularProgressIndicator para carregamento de impressoras
- Loading state no botão de submit

### 5. Alert/Message Component
- Container de aviso amarelo para mensagem de compartilhamento

---

## 📐 Estrutura de Arquivos Sugerida

```
app/
  (ou pages/)
    terminais/
      editar/
        [id]/
          page.tsx          # Página principal
          components/
            TerminalForm.tsx        # Formulário principal
            ImpressoraSelect.tsx    # Dropdown de impressoras
            CompartilhamentoSwitch.tsx # Switch com mensagem
          hooks/
            useTerminal.ts          # Hook para buscar terminal
            useImpressoras.ts       # Hook para buscar impressoras
            useUpdateTerminal.ts    # Hook para atualizar terminal
          types/
            terminal.types.ts       # Tipos TypeScript
          api/
            terminal.api.ts         # Funções de API
            impressora.api.ts       # Funções de API de impressoras
```

---

## 🎨 Estilos e Temas

### Cores (adaptar ao seu design system)
- **Primary**: Cor primária do tema
- **Info**: Cor de fundo dos inputs
- **Warning**: Cor do texto de aviso (amarelo)
- **Secondary Text**: Cor do texto secundário (#57636C)
- **Border**: Cinza claro (#CCCCCC)
- **Divider**: #B9CCD8

### Fontes
- **Títulos**: Google Fonts "Exo" (ou fonte similar)
- **Corpo**: Google Fonts "Nunito" (ou fonte similar)
- **Tamanhos**: Seguir hierarquia do design original

### Espaçamentos
- Padding do container: 30px
- Padding externo: 80px top/bottom
- Espaçamento entre campos: 20px vertical
- Espaçamento entre seções: 22px
- Espaçamento horizontal entre campos lado a lado: 16px

---

## ✅ Checklist de Implementação

### Funcionalidades Core
- [ ] Modal/dialog que abre ao acessar a rota
- [ ] Carregamento de todas as impressoras (paginação completa)
- [ ] Carregamento de dados do terminal (se modo edição)
- [ ] Carregamento de preferências do terminal (se modo edição)
- [ ] Formulário com validação
- [ ] Campos readonly para Modelo e Versão APK
- [ ] Switch de compartilhamento funcional
- [ ] Mensagem de aviso condicional do compartilhamento
- [ ] Dropdown de impressora com todas as opções
- [ ] Submit que atualiza terminal e preferências em sequência
- [ ] Feedback de sucesso/erro
- [ ] Fechamento do modal após submit

### UI/UX
- [ ] Layout responsivo (60% width em desktop)
- [ ] Scroll quando necessário
- [ ] Loading states apropriados
- [ ] Estados de erro tratados
- [ ] Animações suaves (opcional mas recomendado)
- [ ] Acessibilidade (ARIA labels, keyboard navigation)

### Integrações
- [ ] Autenticação (token Bearer)
- [ ] Tratamento de erros de API
- [ ] Retry logic (opcional)
- [ ] Cache de impressoras (opcional, para performance)

---

## 🚨 Pontos de Atenção

1. **Paginação de Impressoras**: É crítico implementar o loop de paginação para buscar TODAS as impressoras, não apenas a primeira página.

2. **Ordem das Chamadas de API**: No submit, deve atualizar o terminal PRIMEIRO, depois as preferências. Se a primeira falhar, não chamar a segunda.

3. **Inversão do Status**: O campo `bloqueado` na API é o inverso de `statusTerminalValue` no formulário. Cuidado com essa lógica.

4. **Mensagem de Compartilhamento**: A mensagem amarela deve aparecer/desaparecer dinamicamente baseado no estado do switch, não apenas no carregamento inicial.

5. **Modo Apenas Edição**: Esta página é APENAS para edição. Não implementar lógica de criação, apenas edição.

6. **Campos Readonly**: Modelo do Dispositivo e Versão APK devem estar visualmente desabilitados e não editáveis.

7. **Token de Autenticação**: Garantir que o token seja obtido do contexto de autenticação e incluído em todas as requisições.

---

## 📝 Exemplo de Código TypeScript (Estrutura)

```typescript
// types/terminal.types.ts
export interface Terminal {
  id: string;
  nome: string;
  modeloDispositivo: string;
  versaoApk: string;
  bloqueado: boolean;
  serieFiscal?: string;
  numeroNFCe?: string;
  ipServidor?: string;
  impressoraId?: string;
}

export interface TerminalPreferences {
  terminalId: string;
  empresaId: string;
  impressoraFinalizacao?: {
    id: string;
    name: string;
  };
  compartilharMesas: boolean;
}

export interface Impressora {
  id: string;
  nome: string;
}

// hooks/useImpressoras.ts
export function useImpressoras() {
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchAllImpressoras() {
      // Implementar loop de paginação
      // Acumular todas as impressoras
    }
    fetchAllImpressoras();
  }, []);
  
  return { impressoras, loading };
}
```

---

## 🎯 Prompt Final para o Agente IA

Use este prompt completo no Cursor para recriar a página:

---

**PROMPT:**

Crie uma página de edição de terminal em NextJS seguindo estas especificações:

1. **Estrutura**: Modal/Dialog que ocupa 60% da largura da tela, com padding de 30px interno e 80px externo top/bottom. Background claro, border radius 20px, sombra suave.

2. **Cabeçalho**: Título "Editar Terminal" com subtítulo "Atualize os dados do Terminal PDV", botão de fechar no canto superior direito.

3. **Seção Informações Gerais**:
   - Header visual com ícone de celular e nome do terminal
   - Campo "Nome do Terminal" (editável, obrigatório, validação)
   - Campo "Modelo do Dispositivo" (READONLY, lado a lado com Versão APK)
   - Campo "Versão APK" (READONLY, lado a lado com Modelo)

4. **Seção Preferências do Terminal**:
   - Switch "Compartilhamento" com subtítulo "Habilita o compartilhamento de mesas"
   - Quando switch ativado, exibir mensagem de aviso amarela: "Ao marcar o compartilhamento, este terminal só funcionará com internet."
   - Dropdown "Impressora de Finalização" que lista TODAS as impressoras (implementar paginação completa)

5. **APIs**:
   - GET `/preferencias/impressoras?limit=50&offset=X` - Loop para buscar todas (paginação)
   - GET `/preferencias/terminais/{id}` - Buscar detalhes do terminal
   - GET `/preferencias/preferencias-terminal/{id}` - Buscar preferências
   - PATCH `/preferencias/terminais/{id}` - Atualizar terminal (body: nome, modeloDispositivo, versaoApk, bloqueado)
   - PUT `/preferencias/preferencias-terminal` - Atualizar preferências (body: {terminaisId, fields: {impressoraFinalizacaoId, compartilharMesas}})

6. **Fluxo**:
   - Ao abrir: carregar todas as impressoras (paginação completa)
   - Se terminalId presente: carregar detalhes e preferências, preencher formulário
   - No submit: atualizar terminal primeiro, depois preferências
   - Se ambas sucederem: fechar modal e retornar sucesso
   - Se falhar: fechar modal e retornar erro

7. **Validações**: Nome do terminal obrigatório

8. **Estados**: Loading de impressoras, loading de submit, estados de erro

9. **Observações**:
   - `bloqueado` na API é inverso de `statusTerminal` no form (se statusTerminal=true, bloqueado=false)
   - Campos readonly devem estar visualmente desabilitados
   - Mensagem de compartilhamento aparece/desaparece dinamicamente
   - Usar React Hook Form para gerenciamento de formulário
   - Implementar tratamento de erros adequado

Use TypeScript, componentes reutilizáveis, hooks customizados para APIs, e siga as melhores práticas do NextJS 13+ (App Router se aplicável).

---

## 📚 Recursos Adicionais

- Considere usar `react-query` ou `SWR` para gerenciamento de estado de servidor
- Use `zod` para validação de schemas
- Implemente debounce se necessário para inputs
- Adicione testes unitários para lógica crítica
- Documente os tipos TypeScript adequadamente

---

**Fim do Documento**

