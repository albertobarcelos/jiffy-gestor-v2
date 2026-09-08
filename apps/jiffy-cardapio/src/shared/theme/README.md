# Sistema de Cores - Jiffy Gestor

Este sistema de cores replica **exatamente** as cores do projeto Flutter, garantindo consistência visual entre as plataformas.

## 📋 Origem das Cores

As cores foram extraídas do arquivo:
- `jiffy-admin/lib/flutter_flow/flutter_flow_theme.dart`
- Classe: `LightModeTheme extends FlutterFlowTheme`

## 🎨 Paleta de Cores

### Cores Principais
- **primary**: `#003366` - Azul escuro (usado em botões, links principais)
- **secondary**: `#530CA3` - Roxo
- **tertiary**: `#006699` - Azul médio
- **alternate**: `#8338EC` - Roxo claro (usado em divisores, destaques)

### Textos
- **primaryText**: `#171A1C` - Quase preto (texto principal)
- **secondaryText**: `#57636C` - Cinza (texto secundário)
- **terciaryText**: `#97A1A9` - Cinza médio (texto terciário)

### Backgrounds
- **primaryBackground**: `#EEEEF5` - Cinza claro (fundo principal)
- **secondaryBackground**: `#91B4C6` - Azul claro (fundo secundário)

### Accents
- **accent1**: `#B4DD2B` - Verde limão
- **accent2**: `#C34848` - Vermelho
- **accent3**: `#61BBE8` - Azul claro
- **accent4**: `#057CB8` - Azul

### Estados
- **success**: `#14AE5C` - Verde (sucesso)
- **warning**: `#DBA02F` - Amarelo/Laranja (aviso)
- **error**: `#C34848` - Vermelho (erro)
- **info**: `#FFFFFF` - Branco (informação)

### Cores Customizadas
- **customColor1**: `#91B4C6` - Azul claro
- **customColor1Alpha**: `rgba(145, 180, 198, 0.34)` - Azul claro com transparência
- **customColor2**: `#DAE5EE` - Azul muito claro
- **customColor3**: `#8AFAC9` - Verde claro

## 📖 Como Usar

### 1. Em Componentes React (TypeScript)

```typescript
import { colors, getColor, getColorWithOpacity } from '@/src/shared/theme'

// Usar cor diretamente
const primaryColor = colors.primary

// Usar função helper
const secondaryColor = getColor('secondary')

// Usar com opacidade
const primaryWithOpacity = getColorWithOpacity('primary', 0.5)
```

### 2. Em Tailwind CSS (Classes)

```tsx
// Usar as cores diretamente nas classes Tailwind
<div className="bg-primary text-primary-text">
  Conteúdo
</div>

<button className="bg-alternate hover:bg-alternate/80">
  Botão
</button>

<span className="text-success">Sucesso</span>
```

### 3. Em CSS/SCSS (Variáveis CSS)

```css
.minha-classe {
  background-color: var(--color-primary);
  color: var(--color-primary-text);
  border-color: var(--color-alternate);
}
```

### 4. Em Style Inline (React)

```tsx
<div style={{ 
  backgroundColor: colors.primary,
  color: colors.primaryText 
}}>
  Conteúdo
</div>
```

## 🔄 Mapeamento Flutter → Next.js

| Flutter | Next.js (Tailwind) | CSS Variable |
|---------|-------------------|--------------|
| `primary` | `bg-primary`, `text-primary` | `--color-primary` |
| `secondary` | `bg-secondary`, `text-secondary` | `--color-secondary` |
| `alternate` | `bg-alternate`, `text-alternate` | `--color-alternate` |
| `primaryText` | `text-primary-text` | `--color-primary-text` |
| `secondaryText` | `text-secondary-text` | `--color-secondary-text` |
| `primaryBackground` | `bg-primary-bg` | `--color-primary-background` |
| `info` | `bg-info`, `text-info` | `--color-info` |
| `success` | `bg-success`, `text-success` | `--color-success` |
| `warning` | `bg-warning`, `text-warning` | `--color-warning` |
| `error` | `bg-error`, `text-error` | `--color-error` |

## 📝 Exemplos de Uso

### Botão Primário
```tsx
<button className="bg-primary text-white hover:bg-primary/90">
  Clique aqui
</button>
```

### Card com Background
```tsx
<div className="bg-primary-bg border border-alternate rounded-lg p-4">
  <h2 className="text-primary-text">Título</h2>
  <p className="text-secondary-text">Descrição</p>
</div>
```

### Status Badge
```tsx
<span className="bg-success/20 text-success px-3 py-1 rounded-full">
  Ativo
</span>
```

## ⚠️ Importante

- **NÃO** use cores hardcoded (ex: `#003366`) diretamente no código
- **SEMPRE** use o sistema de cores centralizado
- Isso garante consistência e facilita manutenção futura
- Se precisar adicionar novas cores, adicione em `colors.ts` e atualize este README

## 🔧 Manutenção

Para atualizar as cores:
1. Edite `src/shared/theme/colors.ts`
2. As variáveis CSS em `app/globals.css` são geradas automaticamente
3. O Tailwind será atualizado via `tailwind.config.ts`

