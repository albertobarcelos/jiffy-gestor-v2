import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { PizzaTamanho } from '@/src/shared/types/pizza'
import type {
  PizzaLinhaComplementoEditDraft,
  PizzaCategoriaEditDraft,
} from '@/src/presentation/utils/pizza/pizzaEditMappers'

async function parseError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

async function requestJson(
  token: string,
  url: string,
  method: string,
  body?: unknown
) {
  const response = await fetchGestorApi(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) await parseError(response, 'Erro ao salvar categoria pizza')
}

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

export async function salvarPizzaCategoriaEdicao(
  token: string,
  draft: PizzaCategoriaEditDraft
): Promise<void> {
  if (!draft.nome.trim()) {
    throw new Error('Informe o nome da categoria')
  }

  const tamanhosAtivos = draft.tamanhos.filter(t => t.nome.trim() && t.ativo)
  if (tamanhosAtivos.length === 0) {
    throw new Error('Informe ao menos um tamanho ativo')
  }

  await requestJson(token, `/api/cardapio/pizza/categorias/${draft.categoriaId}`, 'PATCH', {
    nome: draft.nome.trim(),
    corHex: draft.corHex,
    iconName: draft.iconName,
    ativo: draft.ativo,
  })

  for (const tamanhoId of draft.tamanhosRemovidosIds) {
    await requestJson(token, `/api/cardapio/pizza/tamanhos/${tamanhoId}`, 'DELETE')
  }

  let grupoPizzaConfigId = draft.grupoPizzaConfigId

  for (const tamanho of draft.tamanhos) {
    if (!tamanho.nome.trim()) continue

    if (tamanho.id) {
      await requestJson(token, `/api/cardapio/pizza/tamanhos/${tamanho.id}`, 'PATCH', {
        nome: tamanho.nome.trim(),
        quantidadePedacos: tamanho.quantidadePedacos,
        quantidadeMaximaDivisoes: tamanho.quantidadeMaximaDivisoes,
        ativo: tamanho.ativo,
      })
    } else if (grupoPizzaConfigId) {
      const response = await fetchGestorApi('/api/cardapio/pizza/tamanhos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grupoPizzaConfigId,
          nome: tamanho.nome.trim(),
          quantidadePedacos: tamanho.quantidadePedacos,
          quantidadeMaximaDivisoes: tamanho.quantidadeMaximaDivisoes,
          ativo: tamanho.ativo,
        }),
      })
      if (!response.ok) await parseError(response, 'Erro ao criar tamanho')
      const data = await response.json()
      const created = data.data as PizzaTamanho
      grupoPizzaConfigId = created.grupoPizzaConfigId ?? grupoPizzaConfigId
    }
  }

  const massasValidas = draft.massas.filter(m => m.nome.trim())
  if (massasValidas.length > 0 || draft.massasRemovidasIds.length > 0) {
    if (draft.grupoMassasId) {
      await requestJson(
        token,
        `/api/cardapio/pizza/grupo-massas/${draft.grupoMassasId}`,
        'PATCH',
        {
          massas: buildComplementoDelta(massasValidas, draft.massasRemovidasIds),
        }
      )
    } else {
      await requestJson(token, '/api/cardapio/pizza/grupo-massas', 'POST', {
        nome: 'Massas',
        categoriaPizzaId: draft.categoriaId,
        obrigatorio: true,
        qtdMinima: 1,
        qtdMaxima: 1,
        ordem: 1,
        ativo: true,
        massas: massasValidas.map(mapComplementoInput),
      })
    }
  }

  const bordasValidas = draft.bordas.filter(b => b.nome.trim())
  if (bordasValidas.length > 0 || draft.bordasRemovidasIds.length > 0) {
    if (draft.grupoBordasId) {
      await requestJson(
        token,
        `/api/cardapio/pizza/grupo-bordas/${draft.grupoBordasId}`,
        'PATCH',
        {
          bordas: buildComplementoDelta(bordasValidas, draft.bordasRemovidasIds),
        }
      )
    } else {
      await requestJson(token, '/api/cardapio/pizza/grupo-bordas', 'POST', {
        nome: 'Bordas',
        categoriaPizzaId: draft.categoriaId,
        obrigatorio: true,
        qtdMinima: 1,
        qtdMaxima: 1,
        ordem: 1,
        ativo: true,
        bordas: bordasValidas.map(mapComplementoInput),
      })
    }
  }
}
