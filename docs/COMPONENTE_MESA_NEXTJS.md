# Componente de Mesa/Balcão para Next.js/React

## Análise do Componente Flutter

O componente de mesa no Flutter não é um simples ícone, mas sim uma composição de elementos sobrepostos usando `Stack`:

### Estrutura do Componente de Mesa

1. **Ícone de fundo**: Um ícone de mesa (`ktableIconLalicamargo`) com:
   - Tamanho: 50px
   - Cor: `tertiary` (cor terciária do tema)

2. **Container circular central**: Um círculo sobreposto com:
   - Tamanho: 40x40px
   - Cor de fundo: `primaryBackground`
   - Borda: 1px sólida com cor `alternate`
   - Forma: circular (`BoxShape.circle`)

3. **Texto do número**: O número da mesa centralizado sobre o círculo com:
   - Fonte: `headlineSmall`
   - Tamanho: 18px
   - Cor: `secondary`
   - Peso: `bold`

### Estrutura do Componente de Balcão

1. **Ícone**: Ícone `sports_bar_rounded` com tamanho 35px
2. **Texto**: "Balcão" abaixo do ícone com fonte de 12px

---

## Implementação em Next.js/React

### 1. Instalação de Dependências

```bash
npm install lucide-react
# ou
yarn add lucide-react
```

**Nota**: Você precisará substituir o ícone de mesa customizado (`ktableIconLalicamargo`) por um ícone similar. Algumas opções:
- Usar um ícone de mesa do `lucide-react` (se disponível)
- Usar um SVG customizado
- Usar um ícone de outra biblioteca como `react-icons`

### 2. Componente TypeScript/React

Crie o arquivo `components/TipoVendaIcon.tsx`:

```typescript
import React from 'react';
import { SportsBar } from 'lucide-react'; // ou outro ícone de mesa

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao';
  numeroMesa?: number | string | null;
  // Cores do tema (ajuste conforme seu sistema de temas)
  colors?: {
    tertiary?: string;
    primaryBackground?: string;
    alternate?: string;
    secondary?: string;
  };
  // Tamanhos customizáveis
  iconSize?: number;
  circleSize?: number;
  fontSize?: number;
}

export const TipoVendaIcon: React.FC<TipoVendaIconProps> = ({
  tipoVenda,
  numeroMesa,
  colors = {
    tertiary: '#9CA3AF',
    primaryBackground: '#FFFFFF',
    alternate: '#E5E7EB',
    secondary: '#374151',
  },
  iconSize = 50,
  circleSize = 40,
  fontSize = 18,
}) => {
  // Componente de Mesa
  if (tipoVenda === 'mesa') {
    return (
      <div className="relative flex items-center justify-center" style={{ height: '55px' }}>
        {/* Stack container - equivalente ao Stack do Flutter */}
        <div className="relative flex items-center justify-center">
          {/* Ícone de fundo */}
          <div className="absolute flex items-center justify-center">
            {/* Substitua por seu ícone de mesa customizado ou use um SVG */}
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.tertiary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Exemplo de ícone de mesa - substitua pelo seu ícone real */}
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
            {/* OU use um ícone de uma biblioteca:
            <TableIcon size={iconSize} color={colors.tertiary} />
            */}
          </div>

          {/* Container circular central */}
          <div
            className="absolute flex items-center justify-center rounded-full border"
            style={{
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              backgroundColor: colors.primaryBackground,
              borderColor: colors.alternate,
              borderWidth: '1px',
            }}
          />

          {/* Texto do número da mesa */}
          <div className="absolute flex items-center justify-center">
            <span
              className="font-bold"
              style={{
                fontSize: `${fontSize}px`,
                color: colors.secondary,
                lineHeight: '1',
              }}
            >
              {numeroMesa?.toString() || ''}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Componente de Balcão
  if (tipoVenda === 'balcao') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: '55px' }}>
        <SportsBar size={35} color={colors.secondary} />
        <span
          className="mt-1 font-medium"
          style={{
            fontSize: '12px',
            color: colors.secondary,
          }}
        >
          Balcão
        </span>
      </div>
    );
  }

  return null;
};
```

### 3. Versão com Tailwind CSS (Recomendado)

Se você estiver usando Tailwind CSS, aqui está uma versão mais limpa:

```typescript
import React from 'react';
import { SportsBar } from 'lucide-react';

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao';
  numeroMesa?: number | string | null;
  className?: string;
}

export const TipoVendaIcon: React.FC<TipoVendaIconProps> = ({
  tipoVenda,
  numeroMesa,
  className = '',
}) => {
  if (tipoVenda === 'mesa') {
    return (
      <div className={`relative flex h-[55px] items-center justify-center ${className}`}>
        {/* Container Stack */}
        <div className="relative flex items-center justify-center">
          {/* Ícone de fundo - substitua pelo seu ícone de mesa */}
          <div className="absolute flex items-center justify-center">
            {/* Exemplo com SVG - substitua pelo seu ícone real */}
            <svg
              width={50}
              height={50}
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-400"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          </div>

          {/* Círculo central */}
          <div className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white" />

          {/* Número da mesa */}
          <div className="absolute flex items-center justify-center">
            <span className="text-lg font-bold text-gray-700">
              {numeroMesa?.toString() || ''}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (tipoVenda === 'balcao') {
    return (
      <div className={`flex h-[55px] flex-col items-center justify-center ${className}`}>
        <SportsBar size={35} className="text-gray-700" />
        <span className="mt-1 text-xs font-medium text-gray-700">Balcão</span>
      </div>
    );
  }

  return null;
};
```

### 4. Versão com Styled Components (Alternativa)

Se preferir usar styled-components:

```typescript
import React from 'react';
import styled from 'styled-components';
import { SportsBar } from 'lucide-react';

const StackContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const IconWrapper = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CircleContainer = styled.div<{ size: number; bgColor: string; borderColor: string }>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  background-color: ${props => props.bgColor};
  border: 1px solid ${props => props.borderColor};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MesaNumber = styled.span<{ fontSize: number; color: string }>`
  position: absolute;
  font-size: ${props => props.fontSize}px;
  font-weight: bold;
  color: ${props => props.color};
  line-height: 1;
`;

const Container = styled.div`
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao';
  numeroMesa?: number | string | null;
  colors?: {
    tertiary?: string;
    primaryBackground?: string;
    alternate?: string;
    secondary?: string;
  };
}

export const TipoVendaIcon: React.FC<TipoVendaIconProps> = ({
  tipoVenda,
  numeroMesa,
  colors = {
    tertiary: '#9CA3AF',
    primaryBackground: '#FFFFFF',
    alternate: '#E5E7EB',
    secondary: '#374151',
  },
}) => {
  if (tipoVenda === 'mesa') {
    return (
      <Container>
        <StackContainer>
          <IconWrapper>
            {/* Substitua pelo seu ícone de mesa */}
            <svg
              width={50}
              height={50}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.tertiary}
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </IconWrapper>
          <CircleContainer
            size={40}
            bgColor={colors.primaryBackground}
            borderColor={colors.alternate}
          />
          <MesaNumber fontSize={18} color={colors.secondary}>
            {numeroMesa?.toString() || ''}
          </MesaNumber>
        </StackContainer>
      </Container>
    );
  }

  if (tipoVenda === 'balcao') {
    return (
      <Container>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SportsBar size={35} color={colors.secondary} />
          <span
            style={{
              marginTop: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: colors.secondary,
            }}
          >
            Balcão
          </span>
        </div>
      </Container>
    );
  }

  return null;
};
```

---

## Como Usar

### Exemplo de Uso Básico

```typescript
import { TipoVendaIcon } from '@/components/TipoVendaIcon';

// Em um componente de lista de vendas
const VendaItem = ({ venda }) => {
  return (
    <div className="flex items-center">
      <TipoVendaIcon
        tipoVenda={venda.tipoVenda}
        numeroMesa={venda.numeroMesa}
      />
      <span>#{venda.codigoTerminal}</span>
    </div>
  );
};
```

### Exemplo com Tema Customizado

```typescript
<TipoVendaIcon
  tipoVenda="mesa"
  numeroMesa={5}
  colors={{
    tertiary: '#6366F1',      // Índigo
    primaryBackground: '#F9FAFB', // Cinza claro
    alternate: '#D1D5DB',      // Cinza médio
    secondary: '#1F2937',      // Cinza escuro
  }}
/>
```

---

## Pontos Importantes

### 1. Ícone de Mesa Customizado

O Flutter usa um ícone de fonte customizado (`LalisTable`). Você precisará:

- **Opção A**: Encontrar um ícone similar em bibliotecas como:
  - `lucide-react`
  - `react-icons`
  - `heroicons`

- **Opção B**: Usar o SVG original do ícone de mesa (se disponível)

- **Opção C**: Criar um componente SVG customizado baseado no design

### 2. Posicionamento Absoluto

O componente usa posicionamento absoluto para sobrepor os elementos:
- Ícone de fundo: `position: absolute`
- Círculo: `position: absolute` (centralizado)
- Texto: `position: absolute` (centralizado)

### 3. Centralização

Todos os elementos são centralizados usando:
- `display: flex`
- `align-items: center`
- `justify-content: center`

### 4. Tamanhos

- Altura do container: `55px` (fixo no Flutter)
- Ícone de mesa: `50px`
- Círculo: `40px`
- Fonte do número: `18px`

---

## Adaptações Necessárias

1. **Sistema de Cores**: Adapte as cores para seu sistema de temas (Tailwind, CSS Variables, Theme Provider, etc.)

2. **Ícone de Mesa**: Substitua o SVG de exemplo pelo ícone real que você precisa

3. **Tipos TypeScript**: Ajuste os tipos conforme sua estrutura de dados

4. **Estilização**: Escolha entre Tailwind, styled-components, CSS Modules, ou CSS-in-JS conforme seu projeto

---

## Exemplo Completo com Next.js App Router

```typescript
// app/components/TipoVendaIcon.tsx
'use client';

import React from 'react';
import { SportsBar } from 'lucide-react';

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao';
  numeroMesa?: number | string | null;
}

export function TipoVendaIcon({ tipoVenda, numeroMesa }: TipoVendaIconProps) {
  if (tipoVenda === 'mesa') {
    return (
      <div className="relative flex h-[55px] items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Ícone de mesa - substitua pelo seu */}
          <div className="absolute">
            <svg
              width={50}
              height={50}
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-400"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* Seu SVG de mesa aqui */}
            </svg>
          </div>
          
          {/* Círculo */}
          <div className="absolute h-10 w-10 rounded-full border border-gray-200 bg-white" />
          
          {/* Número */}
          <div className="absolute">
            <span className="text-lg font-bold text-gray-700">
              {numeroMesa?.toString() || ''}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[55px] flex-col items-center justify-center">
      <SportsBar size={35} className="text-gray-700" />
      <span className="mt-1 text-xs font-medium text-gray-700">Balcão</span>
    </div>
  );
}
```

---

## Conclusão

O componente de mesa é uma composição visual elegante que combina:
- Um ícone de fundo (mesa)
- Um círculo centralizado (para destacar o número)
- Um texto com o número da mesa

Essa estrutura pode ser facilmente replicada em React usando posicionamento absoluto e flexbox, mantendo a mesma aparência visual do componente Flutter original.

