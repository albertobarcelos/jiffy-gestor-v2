import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type {
  CreateGrupoBordasPizzaInput,
  CreateGrupoMassasPizzaInput,
  UpdateGrupoBordasPizzaInput,
  UpdateGrupoMassasPizzaInput,
} from '@/src/domain/repositories/IPizzaRepository'
import {
  buildUpdateCategoriaPizzaInput,
  type PizzaCategoriaEditDraft,
  type PizzaLinhaComplementoEditDraft,
} from '@/src/application/mappers/pizza/pizzaEditMappers'

function mapComplementoInput(item: PizzaLinhaComplementoEditDraft) {
  return {
    nome: item.nome.trim(),
    valor: item.valor,
    tipoImpactoPreco: 'aumenta' as const,
    ativo: item.ativo,
  }
}

function buildComplementoDelta(
  atuais: PizzaLinhaComplementoEditDraft[],
  removidosIds: string[]
) {
  const add = atuais
    .filter(item => !item.id && item.nome.trim())
    .map(mapComplementoInput)

  const update = atuais
    .filter(item => item.id && item.nome.trim())
    .map(item => ({
      id: item.id!,
      ...mapComplementoInput(item),
    }))

  return {
    add,
    update,
    delete: removidosIds,
  }
}

export class SalvarEdicaoCategoriaPizzaUseCase {
  constructor(private readonly pizzaGateway: IPizzaCadastroGateway) {}

  async execute(input: { token: string; draft: PizzaCategoriaEditDraft }): Promise<void> {
    const { token, draft } = input

    if (!draft.nome.trim()) {
      throw new Error('Informe o nome da categoria')
    }

    const tamanhosAtivos = draft.tamanhos.filter(t => t.nome.trim() && t.ativo)
    if (tamanhosAtivos.length === 0) {
      throw new Error('Informe ao menos um tamanho ativo')
    }

    await this.pizzaGateway.atualizarCategoria(
      token,
      draft.categoriaId,
      buildUpdateCategoriaPizzaInput(draft)
    )

    for (const tamanhoId of draft.tamanhosRemovidosIds) {
      await this.pizzaGateway.excluirTamanho(token, tamanhoId)
    }

    let grupoPizzaConfigId = draft.grupoPizzaConfigId

    for (const tamanho of draft.tamanhos) {
      if (!tamanho.nome.trim()) continue

      const tamanhoInput = {
        nome: tamanho.nome.trim(),
        quantidadePedacos: tamanho.quantidadePedacos,
        quantidadeMaximaDivisoes: tamanho.quantidadeMaximaDivisoes,
        ativo: tamanho.ativo,
      }

      if (tamanho.id) {
        await this.pizzaGateway.atualizarTamanho(token, tamanho.id, tamanhoInput)
      } else if (grupoPizzaConfigId) {
        const created = await this.pizzaGateway.criarTamanho(token, {
          grupoPizzaConfigId,
          ...tamanhoInput,
        })
        grupoPizzaConfigId = created.grupoPizzaConfigId ?? grupoPizzaConfigId
      }
    }

    const massasValidas = draft.massas.filter(m => m.nome.trim())
    if (massasValidas.length > 0 || draft.massasRemovidasIds.length > 0) {
      if (draft.grupoMassasId) {
        await this.pizzaGateway.atualizarGrupoMassas(token, draft.grupoMassasId, {
          massas: buildComplementoDelta(massasValidas, draft.massasRemovidasIds),
        } satisfies UpdateGrupoMassasPizzaInput)
      } else {
        await this.pizzaGateway.criarGrupoMassas(token, {
          nome: 'Massas',
          categoriaPizzaId: draft.categoriaId,
          obrigatorio: true,
          qtdMinima: 1,
          qtdMaxima: 1,
          ordem: 1,
          ativo: true,
          massas: massasValidas.map(mapComplementoInput),
        } as CreateGrupoMassasPizzaInput)
      }
    }

    const bordasValidas = draft.bordas.filter(b => b.nome.trim())
    if (bordasValidas.length > 0 || draft.bordasRemovidasIds.length > 0) {
      if (draft.grupoBordasId) {
        await this.pizzaGateway.atualizarGrupoBordas(token, draft.grupoBordasId, {
          bordas: buildComplementoDelta(bordasValidas, draft.bordasRemovidasIds),
        } satisfies UpdateGrupoBordasPizzaInput)
      } else {
        await this.pizzaGateway.criarGrupoBordas(token, {
          nome: 'Bordas',
          categoriaPizzaId: draft.categoriaId,
          obrigatorio: true,
          qtdMinima: 1,
          qtdMaxima: 1,
          ordem: 1,
          ativo: true,
          bordas: bordasValidas.map(mapComplementoInput),
        } as CreateGrupoBordasPizzaInput)
      }
    }
  }
}
