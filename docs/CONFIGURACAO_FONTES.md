# Configuração de Fontes - Jiffy Gestor

**Data:** 25/11/2025  
**Status:** ✅ Implementado

## 🎨 Sistema de Fontes

### Fontes Configuradas

1. **Exo 2** - Textos normais (corpo do texto, parágrafos, textos gerais)
2. **Manrope** - Títulos (h1, h2, h3, h4, h5, h6)

---

## 📝 Uso Automático

### Textos Normais (Exo 2)
Aplicada automaticamente em todo o texto do corpo:

```tsx
// ✅ Exo 2 aplicada automaticamente
<p>Este texto usa Exo 2</p>
<span>Este também</span>
<div>E este também</div>
```

### Títulos (Manrope)
Aplicada automaticamente em todas as tags de título:

```tsx
// ✅ Manrope aplicada automaticamente
<h1>Título Principal</h1>
<h2>Subtítulo</h2>
<h3>Seção</h3>
```

---

## 🎯 Uso Manual com Classes Tailwind

### Forçar Exo 2 (textos normais)
```tsx
<p className="font-sans">Texto com Exo 2</p>
<p className="font-exo">Texto com Exo 2 (alias)</p>
```

### Forçar Manrope (títulos)
```tsx
<p className="font-heading">Texto com Manrope</p>
<p className="font-manrope">Texto com Manrope (alias)</p>
<h3 className="font-heading font-bold">Título em Manrope</h3>
```

### Pesos de Fonte Disponíveis

#### Exo 2 (textos normais)
- `font-light` (300)
- `font-normal` (400)
- `font-medium` (500)
- `font-semibold` (600)
- `font-bold` (700)

#### Manrope (títulos)
- `font-normal` (400)
- `font-medium` (500)
- `font-semibold` (600)
- `font-bold` (700)
- `font-extrabold` (800)

---

## 📋 Exemplos Práticos

### Card de Produto
```tsx
<div className="bg-white p-4 rounded-lg">
  {/* Título usa Manrope automaticamente */}
  <h3 className="text-xl font-bold text-primary">Nome do Produto</h3>
  
  {/* Descrição usa Exo 2 automaticamente */}
  <p className="text-sm text-secondary-text mt-2">
    Descrição detalhada do produto com texto normal
  </p>
  
  {/* Preço com Exo 2 em negrito */}
  <p className="text-lg font-bold text-primary mt-3">
    R$ 99,90
  </p>
</div>
```

### Formulário
```tsx
<form>
  {/* Label usa Manrope por ser título da seção */}
  <h2 className="text-2xl mb-6">Cadastro de Cliente</h2>
  
  <div>
    {/* Label do input - Exo 2 normal */}
    <label className="block text-sm font-medium mb-2">
      Nome Completo
    </label>
    
    {/* Input usa Exo 2 */}
    <input 
      type="text" 
      className="w-full px-4 py-2 border rounded-lg font-sans"
      placeholder="Digite o nome"
    />
  </div>
  
  {/* Texto de ajuda - Exo 2 light */}
  <p className="text-xs text-secondary-text font-light mt-1">
    Nome como aparece no documento
  </p>
</form>
```

### Dashboard Card
```tsx
<div className="bg-white p-6 rounded-xl shadow-sm">
  {/* Título do card - Manrope automático */}
  <h3 className="text-lg font-semibold mb-2">Total de Vendas</h3>
  
  {/* Valor - Exo 2 bold */}
  <p className="text-3xl font-bold text-primary">
    R$ 45.890,00
  </p>
  
  {/* Descrição - Exo 2 normal */}
  <p className="text-sm text-secondary-text mt-2">
    +12% em relação ao mês anterior
  </p>
</div>
```

### Tabela
```tsx
<table className="w-full">
  <thead>
    <tr>
      {/* Headers usam Manrope (tratados como títulos) */}
      <th className="font-heading font-semibold text-left p-3">
        Produto
      </th>
      <th className="font-heading font-semibold text-left p-3">
        Quantidade
      </th>
      <th className="font-heading font-semibold text-left p-3">
        Valor
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      {/* Células usam Exo 2 automaticamente */}
      <td className="p-3">Produto A</td>
      <td className="p-3">10 unidades</td>
      <td className="p-3 font-semibold">R$ 150,00</td>
    </tr>
  </tbody>
</table>
```

---

## 🔧 Configuração Técnica

### layout.tsx
```tsx
import { Exo_2, Manrope } from 'next/font/google'

const exo2 = Exo_2({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-exo2',
  display: 'swap',
})

const manrope = Manrope({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

// Aplicado no body
<body className={`${exo2.variable} ${manrope.variable} ${exo2.className}`}>
```

### tailwind.config.ts
```ts
fontFamily: {
  sans: ['var(--font-exo2)', 'sans-serif'],      // Padrão
  heading: ['var(--font-manrope)', 'sans-serif'], // Títulos
  exo: ['var(--font-exo2)', 'sans-serif'],        // Alias
  manrope: ['var(--font-manrope)', 'sans-serif'], // Alias
}
```

### globals.css
```css
/* Títulos usam Manrope automaticamente */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-manrope), sans-serif;
  font-weight: 600;
}
```

---

## 🎨 Hierarquia Visual Recomendada

### Títulos de Página (Manrope)
```tsx
<h1 className="text-3xl font-bold">Título Principal</h1>
<h2 className="text-2xl font-semibold">Subtítulo</h2>
<h3 className="text-xl font-semibold">Seção</h3>
```

### Textos de Corpo (Exo 2)
```tsx
<p className="text-base">Texto normal</p>
<p className="text-sm">Texto pequeno</p>
<p className="text-xs">Texto muito pequeno</p>
```

### Destaques (Exo 2 Bold)
```tsx
<p className="font-bold">Texto em destaque</p>
<p className="font-semibold">Texto semi-bold</p>
```

---

## 📊 Quando Usar Cada Fonte

### Use Exo 2 (font-sans) para:
- ✅ Parágrafos de texto
- ✅ Descrições de produtos
- ✅ Labels de formulário
- ✅ Textos de botões
- ✅ Valores numéricos
- ✅ Textos de tabela
- ✅ Tooltips e hints
- ✅ Textos em geral

### Use Manrope (font-heading) para:
- ✅ Títulos de páginas (h1, h2, h3...)
- ✅ Títulos de seções
- ✅ Títulos de cards
- ✅ Headers de tabelas
- ✅ Títulos de modais/dialogs
- ✅ Nomes de features destacadas
- ✅ Cabeçalhos importantes

---

## 🚀 Benefícios da Configuração

### Performance
- ✅ **Font Loading Otimizado** - Next.js otimiza automaticamente
- ✅ **Display Swap** - Evita FOIT (Flash of Invisible Text)
- ✅ **Self-Hosted** - Fontes servidas pelo próprio Next.js
- ✅ **CSS Variables** - Flexibilidade e performance

### UX/Design
- ✅ **Hierarquia Visual Clara** - Títulos vs textos
- ✅ **Legibilidade** - Exo 2 otimizada para leitura
- ✅ **Personalidade** - Manrope moderna para títulos
- ✅ **Consistência** - Sistema padronizado

### Developer Experience
- ✅ **Aplicação Automática** - Títulos e textos já configurados
- ✅ **Classes Tailwind** - Fácil customização
- ✅ **Aliases** - Múltiplas formas de usar
- ✅ **TypeScript** - Autocomplete funciona perfeitamente

---

## 🔄 Migração de Código Antigo

Se você tinha código usando `font-nunito` ou outras classes:

### Antes:
```tsx
<p className="font-nunito">Texto</p>
<h3 className="font-exo">Título</h3>
```

### Agora (Opção 1 - Automático):
```tsx
<p>Texto</p>  {/* Exo 2 automático */}
<h3>Título</h3>  {/* Manrope automático */}
```

### Agora (Opção 2 - Explícito):
```tsx
<p className="font-sans">Texto</p>  {/* Exo 2 */}
<h3 className="font-heading">Título</h3>  {/* Manrope */}
```

---

## 📚 Referências

- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Google Fonts - Exo 2](https://fonts.google.com/specimen/Exo+2)
- [Google Fonts - Manrope](https://fonts.google.com/specimen/Manrope)
- [Tailwind CSS - Font Family](https://tailwindcss.com/docs/font-family)

---

## ✅ Checklist de Implementação

- [x] Importar Exo 2 e Manrope do Google Fonts
- [x] Configurar variáveis CSS
- [x] Aplicar Exo 2 como fonte padrão
- [x] Configurar Manrope para títulos (h1-h6)
- [x] Atualizar tailwind.config.ts
- [x] Criar aliases para retrocompatibilidade
- [x] Documentar uso e exemplos
- [x] Definir pesos de fonte disponíveis

---

**Resultado:** Sistema de fontes consistente, performático e fácil de usar! 🎉

