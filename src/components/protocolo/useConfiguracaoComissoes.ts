/**
 * HOOK — CONFIGURAÇÃO DINÂMICA DE COMISSÕES PARA O ROSTO DO CARD (Build F2-B)
 * ===========================================================================
 * Carrega, para o card de Comissões (aba Protocolo), o cadastro do F2-A:
 *   - comissoes_colaboradores (colaboradores, ativos e inativos);
 *   - comissoes_regras (regras por vigência);
 *   - comissoes_metas (meta da competência selecionada — null = não definida).
 *
 * ESTADOS DISTINTOS — falha NUNCA vira lista vazia:
 *   - 'carregando': o card NÃO apresenta valores antigos como confirmados;
 *   - 'erro': mensagem clara com "Tentar novamente" — sem valores;
 *   - 'pronto': dados carregados (meta = null é estado válido e significa
 *     "Meta não definida", não erro).
 */
import { useCallback, useEffect, useState } from 'react'
import {
  getColaboradoresComissionados,
  getRegrasComissao,
  type ColaboradorComissionadoRecord,
  type RegraComissaoRecord,
} from '@/services/comissoesColaboradores'
import { getMetaPorCompetencia, type ComissoesMeta } from '@/services/comissoesMetas'

export type EstadoCargaConfig = 'carregando' | 'pronto' | 'erro'

export interface ConfiguracaoComissoes {
  /** Estado do cadastro de colaboradores/regras (o que alimenta o modo). */
  estado: EstadoCargaConfig
  erro: string | null
  /** null enquanto carrega ou quando a consulta falhou. */
  colaboradores: ColaboradorComissionadoRecord[] | null
  regras: RegraComissaoRecord[] | null
  /** Meta da competência; null carregado = "Meta não definida". */
  meta: ComissoesMeta | null
  metaEstado: EstadoCargaConfig
  metaErro: string | null
  /** Recarrega cadastro + meta (após gravação do gestor ou novo tentativa). */
  recarregar: () => void
}

export function useConfiguracaoComissoes(mes: number, ano: number): ConfiguracaoComissoes {
  const [estado, setEstado] = useState<EstadoCargaConfig>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const [colaboradores, setColaboradores] = useState<ColaboradorComissionadoRecord[] | null>(null)
  const [regras, setRegras] = useState<RegraComissaoRecord[] | null>(null)
  const [meta, setMeta] = useState<ComissoesMeta | null>(null)
  const [metaEstado, setMetaEstado] = useState<EstadoCargaConfig>('carregando')
  const [metaErro, setMetaErro] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const recarregar = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelado = false

    setEstado((atual) => (atual === 'pronto' ? 'carregando' : atual))
    setMetaEstado('carregando')
    setErro(null)
    setMetaErro(null)

    const cadastro = (async () => {
      const [cols, rgs] = await Promise.all([getColaboradoresComissionados(), getRegrasComissao()])
      return { cols, rgs }
    })()

    const consultaMeta = getMetaPorCompetencia(mes, ano)

    cadastro
      .then(({ cols, rgs }) => {
        if (cancelado) return
        setColaboradores(cols)
        setRegras(rgs)
        setEstado('pronto')
      })
      .catch((e) => {
        if (cancelado) return
        setErro(e instanceof Error ? e.message : 'Falha ao consultar a configuração de comissões.')
        setEstado('erro')
      })

    consultaMeta
      .then((m) => {
        if (cancelado) return
        setMeta(m)
        setMetaEstado('pronto')
      })
      .catch((e) => {
        if (cancelado) return
        setMetaErro(e instanceof Error ? e.message : 'Falha ao consultar a meta da competência.')
        setMetaEstado('erro')
      })

    return () => {
      cancelado = true
    }
  }, [mes, ano, tick])

  return {
    estado,
    erro,
    colaboradores,
    regras,
    meta,
    metaEstado,
    metaErro,
    recarregar,
  }
}
