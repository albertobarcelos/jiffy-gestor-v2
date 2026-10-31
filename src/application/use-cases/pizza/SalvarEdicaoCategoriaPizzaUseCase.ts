import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type {
  CreateGrupoBordasPizzaInput,
  CreateGrupoMassasPizzaInput,
  UpdateGrupoBordasPizzaInput,
  UpdateGrupoMassasPizzaInput,
} from '@/src/domain/repositories/IPizzaRepository'
import {
  buildUpdateCategoriaPizzaInput,
  type PizzaAdicionalEditDraft,
  type PizzaCategoriaEditDraft,
  type PizzaLinhaComplementoEditDraft,
  type PizzaSaborEditDraft,
} from '@/src/application/mappers/pizza/pizzaEditMappers'
import type { PrecoComplementoPizza, PrecoSaborTamanhoInput } from '@/src/shared/types/pizza'

function mapComplementoInput(item: PizzaLinhaComplementoEditDraft) {
  const valor = Number.isFinite(item.valor) ? Math.max(0, item.valor) : 0
  return {
    nome: item.nome.trim(),
    valor,
    // Massa/borda: impacto só quando há valor; senão nenhum (não força "aumenta").
    tipoImpactoPreco: (valor > 0 ? 'aumenta' : 'nenhum') as 'aumenta' | 'nenhum',
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

function precosSaborParaApi(
  sabor: PizzaSaborEditDraft,
  tamanhoIdByLocalId: Map<string, string>
): PrecoSaborTamanhoInput[] {
  return Object.entries(sabor.precosPorTamanhoLocalId)
    .filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
    .map(([localId, cfg]) => {
      const pizzaTamanhoId = tamanhoIdByLocalId.get(localId)
      if (!pizzaTamanhoId) return null
      return { pizzaTamanhoId, precoCheio: cfg.valor }
    })
    .filter((item): item is PrecoSaborTamanhoInput => item != null)
}

function precosAdicionalParaApi(
  adicional: PizzaAdicionalEditDraft,
  tamanhoIdByLocalId: Map<string, string>
): PrecoComplementoPizza[] {
  return Object.entries(adicional.precosPorTamanhoLocalId)
    .filter(([, cfg]) => cfg.enabled)
    .map(([localId, cfg]) => {
      const pizzaTamanhoId = tamanhoIdByLocalId.get(localId)
      if (!pizzaTamanhoId) return null
      return { pizzaTamanhoId, valor: Math.max(0, cfg.valor || 0) }
    })
    .filter((item): item is PrecoComplementoPizza => item != null)
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
    const tamanhoIdByLocalId = new Map<string, string>()

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
        tamanhoIdByLocalId.set(tamanho.localId, tamanho.id)
      } else if (grupoPizzaConfigId) {
        const created = await this.pizzaGateway.criarTamanho(token, {
          grupoPizzaConfigId,
          ...tamanhoInput,
        })
        tamanhoIdByLocalId.set(tamanho.localId, created.id)
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

    for (const saborId of draft.saboresRemovidosIds) {
      await this.pizzaGateway.excluirSabor(token, saborId)
    }

    for (const sabor of draft.sabores) {
      if (!sabor.nome.trim()) continue
      const precosTamanho = precosSaborParaApi(sabor, tamanhoIdByLocalId)
      if (precosTamanho.length === 0) {
        throw new Error(`Informe preço em ao menos um tamanho para o sabor "${sabor.nome.trim()}"`)
      }

      if (sabor.id) {
        await this.pizzaGateway.atualizarSabor(token, sabor.id, {
          nome: sabor.nome.trim(),
          descricao: sabor.descricao.trim() || null,
          ativo: sabor.ativo,
          precosTamanho,
        })
      } else {
        await this.pizzaGateway.criarSabor(token, {
          nome: sabor.nome.trim(),
          descricao: sabor.descricao.trim() || null,
          ativo: sabor.ativo,
          categoriaPizzaId: draft.categoriaId,
          precosTamanho,
        })
      }
    }

    for (const vinculoId of draft.adicionaisRemovidosVinculoIds) {
      await this.pizzaGateway.desvincularComplemento(token, vinculoId)
    }

    for (const adicional of draft.adicionais) {
      if (!adicional.complementoId.trim()) continue
      const precos = precosAdicionalParaApi(adicional, tamanhoIdByLocalId)
      if (precos.length === 0) {
        throw new Error('Configure preço em ao menos um tamanho para cada adicional vinculado')
      }

      if (adicional.vinculoId) {
        await this.pizzaGateway.substituirPrecosComplemento(token, adicional.vinculoId, { precos })
      } else {
        await this.pizzaGateway.criarComplemento(token, {
          categoriaPizzaId: draft.categoriaId,
          complementoId: adicional.complementoId,
          ativo: adicional.ativo,
          precos,
        })
      }
    }
  }
}
