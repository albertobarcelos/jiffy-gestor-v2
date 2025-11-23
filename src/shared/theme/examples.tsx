/**
 * Exemplos de uso do sistema de cores
 * Este arquivo serve como referência e pode ser removido em produção
 */

import { colors, getColor, getColorWithOpacity } from './colors'

/**
 * Exemplo 1: Usando cores diretamente
 */
export function ExampleDirectColors() {
  return (
    <div style={{ backgroundColor: colors.primary, color: colors.primaryText }}>
      Conteúdo com cores diretas
    </div>
  )
}

/**
 * Exemplo 2: Usando função helper
 */
export function ExampleHelperFunction() {
  const primaryColor = getColor('primary')
  const primaryWithOpacity = getColorWithOpacity('primary', 0.5)

  return (
    <div style={{ backgroundColor: primaryWithOpacity, color: primaryColor }}>
      Conteúdo com helper functions
    </div>
  )
}

/**
 * Exemplo 3: Usando Tailwind CSS (recomendado)
 */
export function ExampleTailwindClasses() {
  return (
    <div className="bg-primary text-primary-text p-4 rounded-lg">
      <h2 className="text-alternate font-exo text-xl">Título</h2>
      <p className="text-secondary-text font-nunito">
        Texto secundário usando Tailwind
      </p>
      <button className="bg-success text-white px-4 py-2 rounded hover:bg-success/90">
        Botão de Sucesso
      </button>
    </div>
  )
}

/**
 * Exemplo 4: Badges de status
 */
export function ExampleStatusBadges() {
  return (
    <div className="flex gap-2">
      <span className="bg-success/20 text-success px-3 py-1 rounded-full text-sm">
        Ativo
      </span>
      <span className="bg-warning/20 text-warning px-3 py-1 rounded-full text-sm">
        Pendente
      </span>
      <span className="bg-error/20 text-error px-3 py-1 rounded-full text-sm">
        Erro
      </span>
    </div>
  )
}

/**
 * Exemplo 5: Cards com cores do sistema
 */
export function ExampleCards() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-primary-bg border-2 border-alternate rounded-lg p-4">
        <h3 className="text-primary font-exo font-semibold">Card 1</h3>
        <p className="text-secondary-text font-nunito">Descrição</p>
      </div>
      <div className="bg-secondary-bg border-2 border-primary rounded-lg p-4">
        <h3 className="text-primary-text font-exo font-semibold">Card 2</h3>
        <p className="text-terciary-text font-nunito">Descrição</p>
      </div>
      <div className="bg-custom-2 border-2 border-accent3 rounded-lg p-4">
        <h3 className="text-primary font-exo font-semibold">Card 3</h3>
        <p className="text-secondary-text font-nunito">Descrição</p>
      </div>
    </div>
  )
}

