## Prompt para recriar a tela **Novo/Editar Cliente** em Next.js

Você é o GPT-5.1 Codex e deve reconstruir em Next.js (React) a tela de cadastro/edição de clientes atualmente feita em Flutter (`novo_cliente_widget.dart`). Preserve os comportamentos de máscaras, buscas externas (CNPJ/CEP), preenchimento automático e notificações.

### Objetivo geral
- Formulário único que opera em **modo criação** ou **edição** (quando `clienteId` está presente).
- Preencher campos automaticamente ao buscar CNPJ e CEP em APIs públicas já existentes.
- Manter máscaras e validações equivalentes.

### Estrutura e estado
- Dois modelos na versão Flutter: `NovoClienteModel` (estado do formulário) e `EditarClienteModel` (lógica de edição). Em Next.js, use um hook para estado base e outro para carregar/popular quando `clienteId` existir.
- Campos principais (controllers no Flutter → estados controlados no React):
  - `nome`, `cpf`, `cnpj`, `razaoSocial`, `nomeFantasia`, `telefone`, `email`.
  - Endereço: `cep`, `logradouro`, `numero`, `bairro`, `complemento`, `cidade`, `uf`.
  - Toggle `checkboxListTileValue`: se true, mostra bloco de endereço; se false, esconde.
  - Máscaras: CPF `###.###.###-##`, CNPJ `##.###.###/####-##`, CEP `#####-###`, telefone `(##) # ####-####`.

### Fluxo de edição (quando `clienteId` existe)
- Na montagem, buscar dados do cliente via API (`ClientesGroup.buscarClienteCall` equivalente).
- Preencher estados dos campos com o retorno (inclusive endereço).
- Exibir título “Editar Cliente”; caso contrário, “Cadastrar Novo Cliente”.

### Busca de CNPJ (campo CNPJ + ícone de lupa)
- Botão de lupa ao lado do input executa chamada `ConsultaCNPJCall` (API pública já configurada).
- Antes de chamar:
  - Remover máscara do CNPJ.
  - Validar comprimento (na Flutter não bloqueia além da máscara, mas Next.js pode validar 14 dígitos).
- Em sucesso:
  - Preencher: `razaoSocial`, `nomeFantasia`, `email`, `cep`, `numero`.
  - Atualizar campos controlados com esses valores.
- Em falha:
  - Se status 400/404: mensagem “CNPJ inválido ou não encontrado. Verifique o número digitado.” (notificação tipo warn).
  - Outros erros: “Ocorreu um erro ao buscar o CNPJ. Tente novamente mais tarde.” (notificação tipo error).
- Ícone de limpar no input deve aparecer quando houver texto (clear o campo e o estado).

### Busca de CEP (campo CEP + ícone de lupa)
- Lupa ao lado do input chama `ConsultaCEPCall` (API pública).
- Pré-condição: CEP mascarado deve ter 9 caracteres (`#####-###`). Se não atender, mostrar notify warn “CEP inválido. Deve conter 8 dígitos.” e abortar.
- Antes de chamar:
  - Limpar campos de endereço: `logradouro`, `numero`, `bairro`, `complemento`, `cidade`, `uf`.
  - Remover máscara do CEP para envio.
- Em sucesso (e se resposta não tiver `erro=true`):
  - Preencher: `logradouro`, `bairro`, `complemento`, `cidade`, `uf`.
  - Marcar flag de resultado CEP (para exibir valores).
- Em falha:
  - Se `erro=true`: “CEP não encontrado. Verifique o número digitado e tente novamente.” (warn).
  - Se status 400/404: “Formato de CEP inválido. O CEP deve conter 8 dígitos.” (warn).
  - Demais erros: “Ocorreu um erro ao buscar o CEP. Verifique o número digitado.” (error).
- Input CEP também tem ícone de limpar quando houver texto.

### Máscaras e validações
- Replicar máscaras no React (ex.: `react-input-mask` ou lógica própria). Inputs devem aceitar apenas dígitos onde aplicável.
- Campos com `maxLength` no Flutter: CPF 14, CNPJ 18, CEP 9, telefone conforme máscara.
- Botões de ação exibem notificações de sucesso/erro via componente de toast (substituir `NotifyComponentPuro`).

### Salvamento
- Botão “Salvar”:
  - Se editar: chama `updateClient` (equivalente à API de update) com todos os campos.
  - Se criar: chama `ClientesGroup.criarClienteCall` com os campos e `incluirEndereco` (estado do toggle).
  - Em sucesso: notificar sucesso e navegar para listagem de clientes.
  - Em erro: mostrar mensagem vinda da API (`message`) ou fallback “Ocorreu um erro inesperado. Por favor, tente novamente.”
- Navegação: usar router do Next.js; na Flutter há `context.pushNamed(ClientesWidget.routeName)`.

### UX a preservar
- Sidebar + header fixos; conteúdo em scroll.
- Título dinâmico no header mostra “Editar Cliente” ou “Cadastrar Novo Cliente”.
- Campo nome reflete no cabeçalho secundário animado (em Next.js basta manter o título reativo).
- Toggle “Adicionar Endereço” mostra/oculta bloco de endereço com animação (opcional no Next.js, mas manter a lógica).
- Inputs preenchidos pelo CNPJ/CEP devem atualizar imediatamente o estado visível.

### Componentes a entregar em Next.js
- Página React (Next 13/14, app router) com:
  - Layout (sidebar, header).
  - Form controlado com máscaras.
  - Botões de lupa para CNPJ e CEP com chamadas às APIs públicas existentes.
  - Toasts para sucesso/erro (substituir `NotifyComponentPuro`).
  - Salvamento (create/update) chamando as respectivas rotas de backend já disponíveis.

### Pseudocódigo CNPJ (Next.js)
```js
const onBuscarCnpj = async () => {
  const raw = cnpjState.replace(/\D/g, '');
  if (raw.length !== 14) {
    notifyWarn('CNPJ inválido ou incompleto.');
    return;
  }
  const res = await consultaCnpj(raw);
  if (res.ok) {
    setRazaoSocial(res.razaoSocial);
    setNomeFantasia(res.nomeFantasia);
    setEmail(res.email);
    setCep(maskCep(res.cep));
    setNumero(res.numero ?? '');
  } else if (res.status === 400 || res.status === 404) {
    notifyWarn('CNPJ inválido ou não encontrado. Verifique o número digitado.');
  } else {
    notifyError('Ocorreu um erro ao buscar o CNPJ. Tente novamente mais tarde.');
  }
};
```

### Pseudocódigo CEP (Next.js)
```js
const onBuscarCep = async () => {
  const raw = cepState.replace(/\D/g, '');
  if (raw.length !== 8) {
    notifyWarn('CEP inválido. Deve conter 8 dígitos.');
    return;
  }
  clearEndereco(); // logradouro, numero, bairro, complemento, cidade, uf
  const res = await consultaCep(raw);
  if (res.ok && !res.erro) {
    setLogradouro(res.logradouro ?? '');
    setBairro(res.bairro ?? '');
    setComplemento(res.complemento ?? '');
    setCidade(res.cidade ?? '');
    setUf(res.uf ?? '');
  } else if (res.erro) {
    notifyWarn('CEP não encontrado. Verifique o número digitado e tente novamente.');
  } else if (res.status === 400 || res.status === 404) {
    notifyWarn('Formato de CEP inválido. O CEP deve conter 8 dígitos.');
  } else {
    notifyError('Ocorreu um erro ao buscar o CEP. Verifique o número digitado.');
  }
};
```

