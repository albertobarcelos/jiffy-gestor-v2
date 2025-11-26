# Guia de Implementação: Seletor de Cores em NextJS

## 📋 Análise do Funcionamento Atual (Flutter/Dart)

### 1. Propósito do Componente

O `EscolherCoresWidget` é um modal/diálogo que permite ao usuário selecionar uma cor de uma lista de cores disponíveis. É usado em formulários onde é necessário escolher uma cor (por exemplo, ao criar/editar grupos de produtos).

### 2. Estrutura do Componente

#### 2.1. Características Principais
- **Tipo**: Modal/Dialog (aberto sobre o conteúdo principal)
- **Dimensões**: 600x600 pixels
- **Layout**: Grid responsivo usando `Wrap` widget
- **Comportamento**: Retorna o valor da cor selecionada ao fechar

#### 2.2. Fluxo de Funcionamento

1. **Carregamento Inicial**:
   - Ao abrir o modal, faz uma chamada à API para buscar cores disponíveis
   - Armazena as cores em uma lista de strings

2. **Exibição**:
   - Renderiza as cores em um grid (Wrap layout)
   - Cada cor é exibida como um quadrado clicável de 100x100 pixels
   - Espaçamento de 5px entre os itens

3. **Seleção**:
   - Ao clicar em uma cor, armazena temporariamente em `FFAppState().getColorGroup`
   - Fecha o modal e retorna o valor da cor selecionada via `Navigator.pop`

### 3. API de Cores

#### 3.1. Endpoint
```
GET /preferencias/cores-disponiveis
```

#### 3.2. Base URL
```
https://jiffy-backend-hom.nexsyn.com.br/api/v1/preferencias/cores-disponiveis
```

#### 3.3. Headers
```json
{
  "accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

#### 3.4. Resposta da API
A API retorna um array de strings, onde cada string é um código de cor em formato hexadecimal (ex: `"#FF5733"` ou `"FF5733"`).

**Exemplo de resposta:**
```json
[
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F5",
  ...
]
```

#### 3.5. Processamento da Resposta
O código Flutter processa a resposta assim:
```dart
_model.listaCoress = (getJsonField(
  (_model.rsCores?.jsonBody ?? ''),
  r'''$''',
  true,
) as List?)!
    .map<String>((e) => e.toString())
    .toList()
    .cast<String>()
    .toList()
    .cast<String>();
```

Isso significa que a resposta é um array direto (não um objeto com propriedades), e cada item é convertido para string.

### 4. Função de Conversão de Cor

A função `retornaColor` converte uma string hexadecimal em um objeto `Color` do Flutter:

```dart
Color retornaColor(String stCor) {
  stCor = stCor.replaceAll("#", ""); // Remove o #
  if (stCor.length == 6) {
    stCor = "FF$stCor"; // Adiciona opacidade (FF = 100% opaco) se não tiver
  }
  return Color(int.parse("0x$stCor")); // Converte para Color
}
```

**Lógica:**
- Remove o caractere `#` se presente
- Se a cor tem 6 caracteres (sem alpha), adiciona `FF` no início (opacidade total)
- Converte para inteiro hexadecimal e cria o objeto Color

### 5. Layout e Estilização

#### 5.1. Container Principal
- Largura: 600px
- Altura: 600px
- Background: `primaryBackground` (cor de fundo do tema)
- Border radius: 15px
- Padding: 12px (topo: 24px)

#### 5.2. Grid de Cores
- Usa `Wrap` widget para layout responsivo
- Espaçamento horizontal: 5px
- Espaçamento vertical: 0px (mas cada item tem padding de 5px)
- Alinhamento: início (esquerda)

#### 5.3. Item de Cor
- Dimensões: 100x100 pixels
- Border radius: 12px
- Background: A cor em si (convertida de hex para Color)
- Interação: `InkWell` com efeitos de toque desabilitados (transparentes)

### 6. Retorno de Valor

Quando uma cor é selecionada:
```dart
onTap: () async {
  FFAppState().getColorGroup = getJsonField(
    listaCoresItem,
    r'''$''',
  ).toString();
  safeSetState(() {});
  Navigator.pop(
    context,
    getJsonField(
      listaCoresItem,
      r'''$''',
    ).toString()
  );
}
```

O valor retornado é a string da cor (ex: `"#FF5733"`).

---

## 🚀 Implementação em NextJS

### 1. Estrutura do Componente

#### 1.1. Componente Modal

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface EscolherCoresProps {
  isOpen: boolean;
  onClose: (selectedColor?: string) => void;
}

export default function EscolherCores({ isOpen, onClose }: EscolherCoresProps) {
  const [cores, setCores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar cores ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadCores();
    }
  }, [isOpen]);

  const loadCores = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken(); // Sua função para obter o token
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preferencias/cores-disponiveis`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar cores');
      }

      const data = await response.json();
      // A API retorna um array direto de strings
      setCores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar cores:', error);
      setCores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorSelect = (cor: string) => {
    onClose(cor); // Retorna a cor selecionada
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose()}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-[600px] h-[600px] p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            Escolha uma cor
          </h2>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : cores.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nenhuma cor disponível
            </div>
          ) : (
            <div className="flex flex-wrap gap-[5px]">
              {cores.map((cor, index) => (
                <ColorItem
                  key={index}
                  cor={cor}
                  onClick={() => handleColorSelect(cor)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Componente para cada item de cor
function ColorItem({ cor, onClick }: { cor: string; onClick: () => void }) {
  // Função para converter hex para CSS
  const hexToColor = (hex: string): string => {
    let hexColor = hex.replace('#', '');
    // Se não tiver alpha, adiciona FF (opacidade total)
    if (hexColor.length === 6) {
      hexColor = `FF${hexColor}`;
    }
    return `#${hexColor.slice(-6)}`; // Retorna apenas os 6 últimos caracteres (RGB)
  };

  const backgroundColor = hexToColor(cor);

  return (
    <button
      onClick={onClick}
      className="w-[100px] h-[100px] rounded-xl transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor }}
      aria-label={`Selecionar cor ${cor}`}
    />
  );
}
```

### 2. Função de Conversão de Cor

Em JavaScript/TypeScript, a conversão é mais simples:

```typescript
/**
 * Converte uma string hexadecimal para cor CSS válida
 * @param hex - String hexadecimal (ex: "#FF5733" ou "FF5733")
 * @returns String hexadecimal válida para CSS (ex: "#FF5733")
 */
function hexToColor(hex: string): string {
  // Remove o # se presente
  let hexColor = hex.replace('#', '');
  
  // Se tiver 6 caracteres, está correto (RGB)
  // Se tiver 8 caracteres, tem alpha (RGBA) - pegamos apenas os últimos 6
  if (hexColor.length === 8) {
    hexColor = hexColor.slice(-6);
  }
  
  // Garante que sempre retorna com #
  return `#${hexColor.toUpperCase()}`;
}
```

### 3. Uso do Componente

#### 3.1. Exemplo de Uso Básico

```typescript
'use client';

import { useState } from 'react';
import EscolherCores from '@/components/EscolherCores';

export default function NovoGrupoPage() {
  const [corSelecionada, setCorSelecionada] = useState<string>('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const handleColorSelected = (cor?: string) => {
    if (cor) {
      setCorSelecionada(cor);
    }
    setIsColorPickerOpen(false);
  };

  return (
    <div>
      {/* Botão para abrir o seletor */}
      <button
        onClick={() => setIsColorPickerOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Escolher Cor
      </button>

      {/* Exibir cor selecionada */}
      {corSelecionada && (
        <div className="mt-4">
          <div
            className="w-12 h-12 rounded"
            style={{ backgroundColor: corSelecionada }}
          />
          <p className="text-sm text-gray-600 mt-2">{corSelecionada}</p>
        </div>
      )}

      {/* Modal de seleção de cores */}
      <EscolherCores
        isOpen={isColorPickerOpen}
        onClose={handleColorSelected}
      />
    </div>
  );
}
```

#### 3.2. Exemplo com Dialog/Modal Library (Recomendado)

Para uma experiência mais polida, use uma biblioteca de modais:

```bash
npm install @headlessui/react
# ou
npm install @radix-ui/react-dialog
```

**Com @headlessui/react:**
```typescript
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';

interface EscolherCoresProps {
  isOpen: boolean;
  onClose: (selectedColor?: string) => void;
}

export default function EscolherCores({ isOpen, onClose }: EscolherCoresProps) {
  const [cores, setCores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCores();
    }
  }, [isOpen]);

  const loadCores = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preferencias/cores-disponiveis`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar cores');
      const data = await response.json();
      setCores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar cores:', error);
      setCores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorSelect = (cor: string) => {
    onClose(cor);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-[600px] h-[600px] bg-white rounded-2xl shadow-xl p-6 flex flex-col">
                <Dialog.Title className="text-lg font-bold text-gray-800 mb-5">
                  Escolha uma cor
                </Dialog.Title>

                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                    </div>
                  ) : cores.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Nenhuma cor disponível
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-[5px]">
                      {cores.map((cor, index) => (
                        <button
                          key={index}
                          onClick={() => handleColorSelect(cor)}
                          className="w-[100px] h-[100px] rounded-xl transition-transform hover:scale-105 active:scale-95"
                          style={{ backgroundColor: hexToColor(cor) }}
                          aria-label={`Selecionar cor ${cor}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function hexToColor(hex: string): string {
  let hexColor = hex.replace('#', '');
  if (hexColor.length === 8) {
    hexColor = hexColor.slice(-6);
  }
  return `#${hexColor.toUpperCase()}`;
}
```

### 4. Estilização com Tailwind CSS

```css
/* Se estiver usando CSS puro, adicione ao seu arquivo global */
.color-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.color-item {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-item:hover {
  transform: scale(1.05);
}

.color-item:active {
  transform: scale(0.95);
}
```

### 5. Hook Customizado (Opcional)

Para reutilizar a lógica de carregamento de cores:

```typescript
// hooks/useCores.ts
import { useState, useEffect } from 'react';

export function useCores() {
  const [cores, setCores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCores = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preferencias/cores-disponiveis`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar cores');
      }

      const data = await response.json();
      setCores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCores([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCores();
  }, []);

  return { cores, isLoading, error, reload: loadCores };
}
```

**Uso do hook:**
```typescript
const { cores, isLoading, error } = useCores();
```

### 6. Tratamento de Erros e Estados

```typescript
const [cores, setCores] = useState<string[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadCores = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    // ... chamada à API ...
  } catch (err) {
    setError('Não foi possível carregar as cores. Tente novamente.');
    console.error('Erro ao carregar cores:', err);
  } finally {
    setIsLoading(false);
  }
};

// No JSX:
{error && (
  <div className="text-red-500 text-sm mt-2">{error}</div>
)}
```

### 7. Validação de Cores

Adicione validação para garantir que as cores são válidas:

```typescript
function isValidHexColor(hex: string): boolean {
  const hexPattern = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  return hexPattern.test(hex);
}

function hexToColor(hex: string): string {
  if (!isValidHexColor(hex)) {
    return '#CCCCCC'; // Cor padrão (cinza) se inválida
  }
  
  let hexColor = hex.replace('#', '');
  if (hexColor.length === 8) {
    hexColor = hexColor.slice(-6);
  }
  return `#${hexColor.toUpperCase()}`;
}
```

### 8. Acessibilidade

Melhore a acessibilidade:

```typescript
<button
  onClick={() => handleColorSelect(cor)}
  className="w-[100px] h-[100px] rounded-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  style={{ backgroundColor: hexToColor(cor) }}
  aria-label={`Selecionar cor ${cor}`}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleColorSelect(cor);
    }
  }}
/>
```

---

## 📝 Resumo das Diferenças e Considerações

### Diferenças entre Flutter e NextJS

1. **Modal/Dialog**
   - Flutter: `showAlignedDialog` ou `showDialog`
   - NextJS: Portal do React ou biblioteca de modais (`@headlessui/react`, `@radix-ui/react-dialog`)

2. **Layout Grid**
   - Flutter: `Wrap` widget com `spacing` e `runSpacing`
   - NextJS: CSS Flexbox com `flex-wrap` e `gap`

3. **Conversão de Cor**
   - Flutter: `Color(int.parse("0x$stCor"))`
   - NextJS: String hexadecimal direta para CSS (`backgroundColor: "#FF5733"`)

4. **Retorno de Valor**
   - Flutter: `Navigator.pop(context, valor)`
   - NextJS: Callback `onClose(valor)`

5. **Estado Global Temporário**
   - Flutter: `FFAppState().getColorGroup`
   - NextJS: Não necessário, passar valor diretamente via callback

### Pontos Críticos a Observar

1. ✅ **Formato da Resposta**: A API retorna um array direto de strings, não um objeto
2. ✅ **Formato das Cores**: Podem vir com ou sem `#` no início
3. ✅ **Carregamento**: Carregar cores apenas quando o modal é aberto
4. ✅ **Tratamento de Erros**: Exibir mensagem se falhar ao carregar
5. ✅ **Loading State**: Mostrar indicador de carregamento
6. ✅ **Acessibilidade**: Adicionar labels e suporte a teclado
7. ✅ **Responsividade**: O grid se adapta automaticamente com flex-wrap

---

## ✅ Checklist de Implementação

- [ ] Criar componente de modal/dialog
- [ ] Implementar função de carregamento de cores da API
- [ ] Criar grid responsivo para exibir cores
- [ ] Implementar função de conversão hex para CSS
- [ ] Adicionar tratamento de erros
- [ ] Adicionar estado de loading
- [ ] Implementar callback para retornar cor selecionada
- [ ] Adicionar estilos (hover, active states)
- [ ] Testar com diferentes formatos de cor (com/sem #)
- [ ] Adicionar acessibilidade (aria-labels, keyboard navigation)
- [ ] Testar responsividade
- [ ] Integrar com formulário que usa o seletor

---

## 🔍 Exemplo Completo Simplificado

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';

interface EscolherCoresProps {
  isOpen: boolean;
  onClose: (cor?: string) => void;
}

export default function EscolherCores({ isOpen, onClose }: EscolherCoresProps) {
  const [cores, setCores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/preferencias/cores-disponiveis`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setCores(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={() => onClose()} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl w-[600px] h-[600px] p-6">
          <Dialog.Title className="text-lg font-bold mb-5">
            Escolha uma cor
          </Dialog.Title>
          <div className="flex flex-wrap gap-[5px] overflow-y-auto h-[calc(100%-60px)]">
            {cores.map((cor, i) => (
              <button
                key={i}
                onClick={() => onClose(cor)}
                className="w-[100px] h-[100px] rounded-xl"
                style={{ backgroundColor: cor.startsWith('#') ? cor : `#${cor}` }}
              />
            ))}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

---

**Nota Final**: Este guia foi baseado na análise do código Flutter/Dart existente. A lógica principal é a mesma: abrir um modal, carregar cores da API, exibir em grid e retornar a cor selecionada. A principal diferença está na sintaxe e nas bibliotecas específicas de cada framework.

