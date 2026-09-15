# 🎨 Planejamento: Sistema de Temas para Cardápio Digital

## 📋 Objetivo

Implementar um sistema de temas com 3 paletas de cores distintas para o cardápio digital, permitindo que estabelecimentos escolham a identidade visual que melhor representa sua marca. O sistema de temas será isolado e não afetará o restante do sistema.

---

## 🎯 Temas Propostos

### 1. **Dark (Escuro)** 🌙
**Personalidade:** Elegante, sofisticado, premium, moderno
**Ideal para:** Restaurantes finos, bares noturnos, estabelecimentos premium

### 2. **Clean (Limpo)** ☀️
**Personalidade:** Minimalista, claro, profissional, clean
**Ideal para:** Cafeterias, restaurantes familiares, estabelecimentos diurnos

### 3. **Cores (Colorido)** 🌈
**Personalidade:** Vibrante, alegre, descontraído, jovem
**Ideal para:** Fast food, lanchonetes, estabelecimentos casuais

---

## 🎨 Paletas de Cores Detalhadas

### Tema 1: Dark (Escuro)

#### Cores Principais
```css
/* Fundos */
--cardapio-dark-bg-primary: #000000;           /* Preto puro */
--cardapio-dark-bg-secondary: #0A0A0A;         /* Preto suave */
--cardapio-dark-bg-tertiary: #1A1A1A;          /* Cinza muito escuro */
--cardapio-dark-bg-elevated: #1F1F1F;          /* Superfície elevada */
--cardapio-dark-bg-hover: #2A2A2A;             /* Hover states */

/* Textos */
--cardapio-dark-text-primary: #FFFFFF;          /* Branco puro */
--cardapio-dark-text-secondary: #E5E5E5;       /* Branco suave */
--cardapio-dark-text-tertiary: #B3B3B3;        /* Cinza claro */
--cardapio-dark-text-muted: #808080;            /* Cinza médio */

/* Bordas e Divisores */
--cardapio-dark-border: #2A2A2A;               /* Borda padrão */
--cardapio-dark-border-hover: #404040;          /* Borda hover */
--cardapio-dark-divider: #333333;               /* Divisor */

/* Acentos */
--cardapio-dark-accent-primary: #DC2626;       /* Vermelho (destaques) */
--cardapio-dark-accent-secondary: #6366F1;     /* Índigo (botões) */
--cardapio-dark-accent-success: #10B981;       /* Verde sucesso */
--cardapio-dark-accent-warning: #F59E0B;       /* Amarelo aviso */
--cardapio-dark-accent-error: #EF4444;          /* Vermelho erro */

/* Cards e Superfícies */
--cardapio-dark-card-bg: #1A1A1A;               /* Fundo do card */
--cardapio-dark-card-border: #2A2A2A;          /* Borda do card */
--cardapio-dark-card-hover: #252525;            /* Hover do card */
--cardapio-dark-card-shadow: rgba(0, 0, 0, 0.5); /* Sombra do card */

/* Menu Lateral */
--cardapio-dark-menu-bg: #000000;               /* Fundo do menu */
--cardapio-dark-menu-item: #1A1A1A;            /* Item do menu */
--cardapio-dark-menu-item-hover: #2A2A2A;       /* Item hover */
--cardapio-dark-menu-item-active: #DC2626;      /* Item ativo */

/* Botões */
--cardapio-dark-btn-primary: #FFFFFF;           /* Botão primário (fundo) */
--cardapio-dark-btn-primary-text: #000000;      /* Botão primário (texto) */
--cardapio-dark-btn-secondary: #1A1A1A;         /* Botão secundário */
--cardapio-dark-btn-secondary-text: #FFFFFF;     /* Botão secundário (texto) */
--cardapio-dark-btn-hover: #F5F5F5;             /* Hover botão primário */

/* Gradientes */
--cardapio-dark-gradient-primary: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
--cardapio-dark-gradient-secondary: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
--cardapio-dark-gradient-accent: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
```

#### Características Visuais
- **Contraste:** Alto contraste (branco sobre preto)
- **Sombras:** Sombras escuras e profundas
- **Brilho:** Efeitos de brilho sutis em elementos interativos
- **Glassmorphism:** Overlays com blur e transparência
- **Ícones:** Brancos ou coloridos com alta saturação

---

### Tema 2: Clean (Limpo)

#### Cores Principais
```css
/* Fundos */
--cardapio-clean-bg-primary: #FFFFFF;           /* Branco puro */
--cardapio-clean-bg-secondary: #F8F9FA;         /* Cinza muito claro */
--cardapio-clean-bg-tertiary: #F1F3F5;          /* Cinza claro */
--cardapio-clean-bg-elevated: #FFFFFF;          /* Superfície elevada */
--cardapio-clean-bg-hover: #E9ECEF;             /* Hover states */

/* Textos */
--cardapio-clean-text-primary: #212529;         /* Preto suave */
--cardapio-clean-text-secondary: #495057;       /* Cinza escuro */
--cardapio-clean-text-tertiary: #6C757D;        /* Cinza médio */
--cardapio-clean-text-muted: #ADB5BD;            /* Cinza claro */

/* Bordas e Divisores */
--cardapio-clean-border: #DEE2E6;               /* Borda padrão */
--cardapio-clean-border-hover: #CED4DA;         /* Borda hover */
--cardapio-clean-divider: #E9ECEF;               /* Divisor */

/* Acentos */
--cardapio-clean-accent-primary: #0D6EFD;        /* Azul primário */
--cardapio-clean-accent-secondary: #6C757D;     /* Cinza secundário */
--cardapio-clean-accent-success: #198754;        /* Verde sucesso */
--cardapio-clean-accent-warning: #FFC107;        /* Amarelo aviso */
--cardapio-clean-accent-error: #DC3545;          /* Vermelho erro */

/* Cards e Superfícies */
--cardapio-clean-card-bg: #FFFFFF;               /* Fundo do card */
--cardapio-clean-card-border: #DEE2E6;          /* Borda do card */
--cardapio-clean-card-hover: #F8F9FA;            /* Hover do card */
--cardapio-clean-card-shadow: rgba(0, 0, 0, 0.08); /* Sombra do card */

/* Menu Lateral */
--cardapio-clean-menu-bg: #F8F9FA;               /* Fundo do menu */
--cardapio-clean-menu-item: #FFFFFF;             /* Item do menu */
--cardapio-clean-menu-item-hover: #E9ECEF;       /* Item hover */
--cardapio-clean-menu-item-active: #0D6EFD;      /* Item ativo */

/* Botões */
--cardapio-clean-btn-primary: #0D6EFD;           /* Botão primário (fundo) */
--cardapio-clean-btn-primary-text: #FFFFFF;      /* Botão primário (texto) */
--cardapio-clean-btn-secondary: #6C757D;         /* Botão secundário */
--cardapio-clean-btn-secondary-text: #FFFFFF;     /* Botão secundário (texto) */
--cardapio-clean-btn-hover: #0B5ED7;             /* Hover botão primário */

/* Gradientes */
--cardapio-clean-gradient-primary: linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%);
--cardapio-clean-gradient-secondary: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%);
--cardapio-clean-gradient-accent: linear-gradient(135deg, #0D6EFD 0%, #0A58CA 100%);
```

#### Características Visuais
- **Contraste:** Contraste médio-alto (preto suave sobre branco)
- **Sombras:** Sombras suaves e sutis
- **Espaçamento:** Generoso, respiração visual
- **Bordas:** Bordas finas e discretas
- **Ícones:** Escuros ou coloridos com saturação média

---

### Tema 3: Cores (Colorido)

#### Cores Principais
```css
/* Fundos */
--cardapio-colors-bg-primary: #F0F4F8;          /* Azul muito claro */
--cardapio-colors-bg-secondary: #FFFFFF;         /* Branco */
--cardapio-colors-bg-tertiary: #E8F4F8;         /* Azul claro */
--cardapio-colors-bg-elevated: #FFFFFF;         /* Superfície elevada */
--cardapio-colors-bg-hover: #E0E8F0;            /* Hover states */

/* Textos */
--cardapio-colors-text-primary: #1A202C;         /* Preto azulado */
--cardapio-colors-text-secondary: #4A5568;      /* Cinza azulado */
--cardapio-colors-text-tertiary: #718096;        /* Cinza médio */
--cardapio-colors-text-muted: #A0AEC0;           /* Cinza claro */

/* Bordas e Divisores */
--cardapio-colors-border: #E2E8F0;               /* Borda padrão */
--cardapio-colors-border-hover: #CBD5E0;         /* Borda hover */
--cardapio-colors-divider: #E2E8F0;               /* Divisor */

/* Acentos (Paleta Vibrante) */
--cardapio-colors-accent-primary: #FF6B6B;      /* Vermelho coral */
--cardapio-colors-accent-secondary: #4ECDC4;    /* Turquesa */
--cardapio-colors-accent-tertiary: #45B7D1;     /* Azul claro */
--cardapio-colors-accent-quaternary: #FFA07A;   /* Salmão */
--cardapio-colors-accent-success: #51CF66;       /* Verde vibrante */
--cardapio-colors-accent-warning: #FFD93D;       /* Amarelo vibrante */
--cardapio-colors-accent-error: #FF6B6B;         /* Vermelho coral */

/* Cards e Superfícies */
--cardapio-colors-card-bg: #FFFFFF;               /* Fundo do card */
--cardapio-colors-card-border: #E2E8F0;         /* Borda do card */
--cardapio-colors-card-hover: #F7FAFC;           /* Hover do card */
--cardapio-colors-card-shadow: rgba(78, 205, 196, 0.15); /* Sombra colorida */

/* Menu Lateral */
--cardapio-colors-menu-bg: #FFFFFF;               /* Fundo do menu */
--cardapio-colors-menu-item: #F7FAFC;            /* Item do menu */
--cardapio-colors-menu-item-hover: #EDF2F7;      /* Item hover */
--cardapio-colors-menu-item-active: #4ECDC4;     /* Item ativo (turquesa) */

/* Botões */
--cardapio-colors-btn-primary: #FF6B6B;           /* Botão primário (coral) */
--cardapio-colors-btn-primary-text: #FFFFFF;     /* Botão primário (texto) */
--cardapio-colors-btn-secondary: #4ECDC4;         /* Botão secundário (turquesa) */
--cardapio-colors-btn-secondary-text: #FFFFFF;    /* Botão secundário (texto) */
--cardapio-colors-btn-hover: #FF5252;             /* Hover botão primário */

/* Gradientes Coloridos */
--cardapio-colors-gradient-primary: linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%);
--cardapio-colors-gradient-secondary: linear-gradient(135deg, #4ECDC4 0%, #26A69A 100%);
--cardapio-colors-gradient-tertiary: linear-gradient(135deg, #45B7D1 0%, #2E86AB 100%);
--cardapio-colors-gradient-rainbow: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%);
```

#### Características Visuais
- **Contraste:** Contraste médio (cores vibrantes sobre fundo claro)
- **Sombras:** Sombras coloridas (usando cores dos acentos)
- **Cores:** Paleta vibrante e alegre
- **Gradientes:** Gradientes coloridos e dinâmicos
- **Ícones:** Coloridos com alta saturação

---

## 📐 Estrutura de Variáveis CSS

### Organização por Categoria

Cada tema terá variáveis organizadas em categorias:

1. **Fundos (Backgrounds)**
   - `bg-primary`: Fundo principal
   - `bg-secondary`: Fundo secundário
   - `bg-tertiary`: Fundo terciário
   - `bg-elevated`: Superfícies elevadas (cards, modais)
   - `bg-hover`: Estados de hover

2. **Textos (Text)**
   - `text-primary`: Texto principal
   - `text-secondary`: Texto secundário
   - `text-tertiary`: Texto terciário
   - `text-muted`: Texto desabilitado/muted

3. **Bordas e Divisores (Borders)**
   - `border`: Borda padrão
   - `border-hover`: Borda em hover
   - `divider`: Divisor entre seções

4. **Acentos (Accents)**
   - `accent-primary`: Cor de destaque principal
   - `accent-secondary`: Cor de destaque secundária
   - `accent-success`: Sucesso
   - `accent-warning`: Aviso
   - `accent-error`: Erro

5. **Cards (Cards)**
   - `card-bg`: Fundo do card
   - `card-border`: Borda do card
   - `card-hover`: Estado hover do card
   - `card-shadow`: Sombra do card

6. **Menu Lateral (Menu)**
   - `menu-bg`: Fundo do menu
   - `menu-item`: Item do menu
   - `menu-item-hover`: Item em hover
   - `menu-item-active`: Item ativo/selecionado

7. **Botões (Buttons)**
   - `btn-primary`: Botão primário
   - `btn-primary-text`: Texto do botão primário
   - `btn-secondary`: Botão secundário
   - `btn-secondary-text`: Texto do botão secundário
   - `btn-hover`: Estado hover

8. **Gradientes (Gradients)**
   - `gradient-primary`: Gradiente principal
   - `gradient-secondary`: Gradiente secundário
   - `gradient-accent`: Gradiente de destaque

---

## 🏗️ Estrutura de Implementação

### 1. Arquivo de Variáveis CSS

```
src/
└── presentation/
    └── styles/
        └── cardapio-themes.css
```

**Conteúdo:**
- Definição de todas as variáveis CSS para os 3 temas
- Classes utilitárias para aplicar temas
- Variáveis CSS customizadas usando `:root` e classes de tema

### 2. Hook de Gerenciamento de Tema

```
src/
└── presentation/
    └── hooks/
        └── useCardapioTheme.ts
```

**Responsabilidades:**
- Gerenciar o tema atual (state)
- Persistir tema no `sessionStorage`
- Aplicar classe de tema no elemento raiz
- Fornecer função para trocar tema

### 3. Componente Seletor de Tema

```
src/
└── presentation/
    └── components/
        └── features/
            └── cardapio-digital/
                └── ThemeSelector.tsx
```

**Responsabilidades:**
- Exibir opções de tema
- Permitir seleção de tema
- Visual preview de cada tema

### 4. Context Provider (Opcional)

```
src/
└── presentation/
    └── contexts/
        └── CardapioThemeContext.tsx
```

**Responsabilidades:**
- Prover tema para toda a árvore de componentes do cardápio
- Evitar prop drilling

---

## 🎨 Aplicação de Temas nos Componentes

### Estratégia de Aplicação

1. **Substituir classes hardcoded por variáveis CSS**
   - Exemplo: `bg-black` → `var(--cardapio-bg-primary)`
   - Exemplo: `text-white` → `var(--cardapio-text-primary)`

2. **Usar classes utilitárias do Tailwind com variáveis CSS**
   - Criar classes customizadas no `tailwind.config.js`
   - Usar `@apply` quando necessário

3. **Manter compatibilidade com cores dinâmicas dos grupos**
   - As cores dos grupos (`corHex`) continuam funcionando
   - Aplicar tema apenas nos elementos de UI, não nas cores dos grupos

### Componentes que Precisam de Ajuste

1. **CardapioHomeScreen**
   - Fundo principal
   - Botões
   - Textos
   - Badge de mesa

2. **CardapioPage** (página principal)
   - Barra superior
   - Menu lateral
   - Área de produtos
   - Cards de produtos

3. **GruposProdutosGrid**
   - Fundo dos cards
   - Textos
   - Bordas
   - Sombras

4. **ProdutosList**
   - Cards de produtos
   - Textos
   - Botões

5. **ProdutoCard**
   - Fundo do card
   - Textos
   - Botões
   - Bordas

6. **BannerDestaques**
   - Fundo
   - Textos
   - Botões

7. **CarrinhoResumo**
   - Fundo
   - Textos
   - Botões
   - Badges

---

## 🔄 Fluxo de Troca de Tema

### 1. Usuário Seleciona Tema
```
Usuário clica no seletor de tema
  ↓
Hook useCardapioTheme atualiza state
  ↓
Aplica classe no elemento raiz: `data-theme="dark"` | `data-theme="clean"` | `data-theme="colors"`
  ↓
Salva preferência no sessionStorage
  ↓
CSS aplica variáveis do tema selecionado
  ↓
Componentes re-renderizam com novas cores
```

### 2. Persistência
- Salvar no `sessionStorage` como `cardapio_theme`
- Carregar tema salvo ao inicializar o cardápio
- Fallback para tema "dark" se não houver preferência

---

## 📱 Responsividade e Acessibilidade

### Responsividade
- Todos os temas devem funcionar em mobile, tablet e desktop
- Cores devem manter contraste adequado em todos os tamanhos
- Textos devem ser legíveis em todos os temas

### Acessibilidade
- **Contraste WCAG:**
  - Dark: AAA (alto contraste)
  - Clean: AA (médio-alto contraste)
  - Colors: AA (médio contraste)
- **Navegação por teclado:** Funcional em todos os temas
- **Screen readers:** Labels e textos descritivos mantidos

---

## 🧪 Testes e Validação

### Checklist de Testes

- [ ] Todos os 3 temas aplicam corretamente
- [ ] Troca de tema funciona sem recarregar página
- [ ] Tema persiste entre navegações
- [ ] Cores dos grupos continuam funcionando
- [ ] Contraste adequado em todos os temas
- [ ] Componentes responsivos em todos os temas
- [ ] Animações funcionam em todos os temas
- [ ] Modais e overlays funcionam em todos os temas

---

## 📝 Próximos Passos

1. ✅ **Planejamento** (Este documento)
2. ⏳ **Criar arquivo de variáveis CSS** (`cardapio-themes.css`)
3. ⏳ **Criar hook de gerenciamento** (`useCardapioTheme.ts`)
4. ⏳ **Criar componente seletor** (`ThemeSelector.tsx`)
5. ⏳ **Aplicar variáveis nos componentes existentes**
6. ⏳ **Testar todos os temas**
7. ⏳ **Ajustar contraste e acessibilidade**
8. ⏳ **Documentar uso**

---

## 🎯 Considerações Finais

### Vantagens da Abordagem
- ✅ Isolamento: Temas não afetam o resto do sistema
- ✅ Flexibilidade: Fácil adicionar novos temas
- ✅ Manutenibilidade: Variáveis centralizadas
- ✅ Performance: CSS puro, sem JavaScript pesado
- ✅ Acessibilidade: Contraste controlado

### Desafios
- ⚠️ Garantir que cores dos grupos funcionem em todos os temas
- ⚠️ Manter consistência visual entre temas
- ⚠️ Testar em diferentes dispositivos e navegadores

---

## 📚 Referências

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Tailwind CSS Custom Properties](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
